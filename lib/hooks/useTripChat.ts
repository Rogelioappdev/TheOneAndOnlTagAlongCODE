import { useEffect } from "react";
  import { useQuery, useMutation, useQueryClient, useInfiniteQuery, InfiniteData } from "@tanstack/react-query";
  import { supabase } from "../supabase";
  import type {
    TripChat,
    TripChatMember,
    TripChatWithDetails,
    TripMessage,
    TripMessageWithSender,
    UserProfile,
  } from "../database.types";

  export type { TripChatWithDetails, TripMessageWithSender } from "../database.types";

  const MESSAGE_SELECT = `
    *,
    sender:users(id, name, age, profile_photo, photos, country, city, bio, travel_styles, places_visited, languages, travel_pace, social_energy, planning_style, experience_level, is_verified, email, gender, travel_with, group_type, bucket_list, availability, zodiac, mbti, travel_quote, created_at, updated_at),
    reply_to:trip_messages!reply_to_id(id, content, sender_id, sender:users(name)),
    reactions:message_reactions(id, user_id, emoji)
  `;

  export const tripChatKeys = {
    all: ["tripChats"] as const,
    chat: (tripId: string) => ["tripChats", "chat", tripId] as const,
    messages: (chatId: string) => ["tripChats", "messages", chatId] as const,
  };

  // Get the trip chat for a given trip (with members)
  export function useTripChat(tripId: string | undefined) {
    return useQuery({
      queryKey: tripChatKeys.chat(tripId ?? ""),
      staleTime: 1000 * 60 * 2,
      queryFn: async (): Promise<TripChatWithDetails | null> => {
        if (!tripId) return null;

        let { data, error } = await supabase
          .from("trip_chats")
          .select(
            `
            *,
            trip:trips(*),
            members:trip_chat_members(
              *,
              user:users(*)
            )
          `
          )
          .eq("trip_id", tripId)
          .single();

        if (error || !data) {
          const { data: rpcResult } = await supabase.rpc(
            "ensure_trip_chat_member",
            { p_trip_id: tripId }
          );

          if (rpcResult?.success) {
            const retry = await supabase
              .from("trip_chats")
              .select(
                `
                *,
                trip:trips(*),
                members:trip_chat_members(
                  *,
                  user:users(*)
                )
              `
              )
              .eq("trip_id", tripId)
              .single();
            data = retry.data;
            error = retry.error;
          }
        }

        if (error || !data) return null;

        const { data: lastMsgArr } = await supabase
          .from("trip_messages")
          .select("*")
          .eq("trip_chat_id", data.id)
          .order("created_at", { ascending: false })
          .limit(1);

        return {
          ...data,
          last_message: lastMsgArr?.[0] ?? null,
          unread_count: 0,
        } as TripChatWithDetails;
      },
      enabled: !!tripId,
    });
  }

  // Get messages for a trip chat — paginated (50 per page, scroll up to load older)
  export function useTripMessages(chatId: string | undefined) {
    return useInfiniteQuery({
      queryKey: tripChatKeys.messages(chatId ?? ""),
      staleTime: 1000 * 30,
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }): Promise<TripMessageWithSender[]> => {
        if (!chatId) return [];

        let query = supabase
          .from("trip_messages")
          .select(MESSAGE_SELECT)
          .eq("trip_chat_id", chatId)
          .order("created_at", { ascending: false })
          .limit(50);

        // pageParam = created_at of oldest message in view; load messages older than it
        if (pageParam) {
          query = query.lt("created_at", pageParam);
        }

        const { data, error } = await query;
        if (error) throw error;
        // Return in chronological order (oldest → newest) within each page
        return ((data ?? []) as TripMessageWithSender[]).reverse();
      },
      // lastPage[0] is the oldest message in that page (chronological order)
      // If the page is full (50), there are older messages to load
      getNextPageParam: (lastPage) => {
        if (lastPage.length < 50) return undefined;
        return lastPage[0]?.created_at;
      },
      enabled: !!chatId,
    });
  }

  // Send a message to a trip chat
  export function useSendTripMessage() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        chatId,
        content,
        type = "text",
        replyToId,
      }: {
        chatId: string;
        content: string;
        type?: "text" | "image" | "system";
        replyToId?: string | null;
        replyToMessage?: TripMessageWithSender | null;
      }) => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from("trip_messages")
          .insert({
            trip_chat_id: chatId,
            sender_id: user.id,
            content,
            type,
            ...(replyToId ? { reply_to_id: replyToId } : {}),
          })
          .select(MESSAGE_SELECT)
          .single();

        if (error) throw error;
        return data as TripMessageWithSender;
      },
      onSuccess: (data, variables) => {
        // PostgREST self-referencing FK joins can return null on a fresh INSERT+SELECT.
        // If reply_to is missing but we have the source message, inject it directly.
        const reply = data.reply_to;
        const replyMissing = !reply || (Array.isArray(reply) && reply.length === 0);
        const enriched: TripMessageWithSender =
          replyMissing && variables.replyToId && variables.replyToMessage
            ? {
                ...data,
                reply_to: {
                  id: variables.replyToMessage.id,
                  content: variables.replyToMessage.content,
                  sender_id: variables.replyToMessage.sender_id,
                  sender: variables.replyToMessage.sender
                    ? { name: (variables.replyToMessage.sender as any).name ?? null }
                    : null,
                },
              }
            : data;

        queryClient.setQueryData<InfiniteData<TripMessageWithSender[]>>(
          tripChatKeys.messages(variables.chatId),
          (old) => {
            if (!old) return old;
            const firstPage = old.pages[0] ?? [];
            if (firstPage.some((m) => m.id === enriched.id)) return old;
            return {
              ...old,
              pages: [[...firstPage, enriched], ...old.pages.slice(1)],
            };
          }
        );
      },
    });
  }

  // Edit an existing trip message
  export function useEditTripMessage() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        chatId,
        messageId,
        content,
      }: {
        chatId: string;
        messageId: string;
        content: string;
      }) => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from("trip_messages")
          .update({ content })
          .eq("id", messageId)
          .eq("sender_id", user.id)
          .select(MESSAGE_SELECT)
          .single();

        if (error) throw error;
        return data as TripMessageWithSender;
      },
      onSuccess: (data, variables) => {
        queryClient.setQueryData<InfiniteData<TripMessageWithSender[]>>(
          tripChatKeys.messages(variables.chatId),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) =>
                page.map((msg) => (msg.id === variables.messageId ? data : msg))
              ),
            };
          }
        );
      },
    });
  }

  // Mark trip chat as read
  export function useMarkTripChatRead() {
    return useMutation({
      mutationFn: async (chatId: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) throw new Error("Not authenticated");

        await supabase
          .from("trip_chat_members")
          .update({ last_read_at: new Date().toISOString() })
          .eq("trip_chat_id", chatId)
          .eq("user_id", user.id);
      },
    });
  }

  // Realtime subscription for trip messages (INSERT)
  export function useRealtimeTripMessages(chatId: string | undefined) {
    const queryClient = useQueryClient();

    useEffect(() => {
      if (!chatId) return;

      const channel = supabase
        .channel(`trip_messages:${chatId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "trip_messages",
            filter: `trip_chat_id=eq.${chatId}`,
          },
          async (payload) => {
            const { data: message } = await supabase
              .from("trip_messages")
              .select(MESSAGE_SELECT)
              .eq("id", payload.new.id)
              .single();

            if (!message) return;

            // Self-referencing FK joins can return null on realtime payloads.
            // If reply_to_id is set but reply_to is missing, fetch it separately.
            let enriched = message as TripMessageWithSender;
            const replyId = payload.new.reply_to_id;
            const replyMissing = replyId && (!enriched.reply_to || (Array.isArray(enriched.reply_to) && enriched.reply_to.length === 0));
            if (replyMissing) {
              const { data: replyMsg } = await supabase
                .from("trip_messages")
                .select("id, content, sender_id, sender:users(name)")
                .eq("id", replyId)
                .single();
              if (replyMsg) {
                enriched = { ...enriched, reply_to: replyMsg as any };
              }
            }

            queryClient.setQueryData<InfiniteData<TripMessageWithSender[]>>(
              tripChatKeys.messages(chatId),
              (old) => {
                if (!old) return old;
                const firstPage = old.pages[0] ?? [];
                if (firstPage.some((m) => m.id === enriched.id)) return old;
                return {
                  ...old,
                  pages: [[...firstPage, enriched], ...old.pages.slice(1)],
                };
              }
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [chatId, queryClient]);
  }

  // Toggle a reaction — add if not present, remove if same emoji already set
  export function useToggleReaction() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        messageId,
        emoji,
        chatId,
        existingReactionId,
      }: {
        messageId: string;
        emoji: string;
        chatId: string;
        existingReactionId?: string | null;
      }) => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) throw new Error("Not authenticated");

        if (existingReactionId) {
          await supabase.from('message_reactions').delete().eq('id', existingReactionId);
          return { removed: true, messageId, emoji, userId: user.id };
        }
        // Remove any previous reaction from this user on this message first
        await supabase.from('message_reactions').delete()
          .eq('message_id', messageId).eq('user_id', user.id);
        await supabase.from('message_reactions').insert({
          message_id: messageId, user_id: user.id, emoji,
        });
        return { removed: false, messageId, emoji, userId: user.id };
      },
      onSuccess: (result, variables) => {
        queryClient.setQueryData<InfiniteData<TripMessageWithSender[]>>(
          tripChatKeys.messages(variables.chatId),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map(page =>
                page.map(msg => {
                  if (msg.id !== variables.messageId) return msg;
                  const prev = msg.reactions ?? [];
                  const next = result.removed
                    ? prev.filter(r => r.id !== variables.existingReactionId)
                    : [...prev.filter(r => r.user_id !== result.userId), { id: 'optimistic', user_id: result.userId, emoji: result.emoji }];
                  return { ...msg, reactions: next };
                })
              ),
            };
          }
        );
      },
    });
  }

  // Realtime subscription for reactions in a chat
  export function useRealtimeReactions(chatId: string | undefined) {
    const queryClient = useQueryClient();

    useEffect(() => {
      if (!chatId) return;
      const channel = supabase
        .channel(`reactions:${chatId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
          queryClient.invalidateQueries({ queryKey: tripChatKeys.messages(chatId) });
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }, [chatId, queryClient]);
  }

