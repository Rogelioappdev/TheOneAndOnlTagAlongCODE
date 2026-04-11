import { useEffect, useCallback, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type {
  TripChat,
  TripChatMember,
  TripMessage,
  UserProfile,
  Trip,
} from "../database.types";

// Query keys
export const chatKeys = {
  all: ["chats"] as const,
  conversations: () => ["chats", "conversations"] as const,
  conversation: (id: string) => ["chats", "conversation", id] as const,
  messages: (conversationId: string) =>
    ["chats", "messages", conversationId] as const,
  unreadTotal: () => ["chats", "unreadTotal"] as const,
};

// Simple row returned by the flat trip_chat_members query
export interface ChatMemberRow {
  trip_chat_id: string;
  last_read_at: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_content?: string | null;
  last_message_sender_id?: string | null;
  is_pinned: boolean;
  is_muted: boolean;
  // For DM chats: the other user's profile
  dm_user?: {
    id: string;
    name: string | null;
    profile_photo: string | null;
    photos: string[] | null;
    country: string | null;
    age: number | null;
  } | null;
  trip_chats: {
    id: string;
    trip_id: string | null;
    name: string;
    created_at: string;
    trips: {
      id: string;
      title: string;
      destination: string;
      cover_image: string | null;
      country: string | null;
      description: string | null;
      start_date: string | null;
      end_date: string | null;
      budget_level: string | null;
      max_group_size: number | null;
      pace: string | null;
      vibes: string[] | null;
      trip_members: Array<{ user_id: string }> | null;
    } | null;
    members: Array<{
      user_id: string;
      user: {
        id: string;
        name: string | null;
        profile_photo: string | null;
        photos: string[] | null;
        country: string | null;
        age: number | null;
      };
    }>;
  } | null;
}

// Legacy types kept for other hooks in this file
export interface ConversationWithDetails extends TripChat {
  members: Array<TripChatMember & { user: UserProfile }>;
  last_message?: TripMessage | null;
  unread_count: number;
  trip?: Trip | null;
}

export interface MessageWithSender extends TripMessage {
  sender: UserProfile;
}

const PAGE_SIZE = 30;

// Get all trip chats the current user is a member of
// FIXED: was N+1 (2 DB queries per chat). Now uses exactly 2 queries total regardless
// of how many conversations the user has.
export function useConversations() {
  const [data, setData] = useState<ChatMemberRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    // Use getSession() (reads from local storage — no network round-trip) instead of
    // getUser() (always hits the network). Fine here since we only need the user ID.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setIsLoading(false);
      return;
    }
    const user = session.user;

    // QUERY 1: fetch all membership rows + nested chat/trip/member data (unchanged)
    const { data: rows, error } = await supabase
      .from("trip_chat_members")
      .select(`
        trip_chat_id,
        last_read_at,
        is_pinned,
        is_muted,
        trip_chats (
          id,
          trip_id,
          name,
          created_at,
          trips (
            id,
            title,
            destination,
            cover_image,
            country,
            description,
            start_date,
            end_date,
            budget_level,
            max_group_size,
            pace,
            vibes,
            trip_members ( user_id )
          ),
          members:trip_chat_members (
            user_id,
            user:users (
              id,
              name,
              profile_photo,
              photos,
              country,
              age
            )
          )
        )
      `)
      .eq("user_id", user.id);

    if (error) {
      console.error("[useConversations] error:", error.message, error.code);
      setIsLoading(false);
      return;
    }

    const typedRows = (rows as any[]) ?? [];
    if (typedRows.length === 0) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const chatIds = typedRows.map((r) => r.trip_chat_id as string);

    // Build a map of chatId → last_read_at for fast lookup
    const lastReadMap: Record<string, string | null> = {};
    typedRows.forEach((r) => { lastReadMap[r.trip_chat_id] = r.last_read_at ?? null; });

    // QUERY 2 (replaces 2×N queries): fetch the most recent messages across ALL chats
    // in a single round-trip. We cap at chatIds.length * 15 rows which is more than
    // enough to compute both "latest timestamp" and "unread count" per chat.
    const { data: recentMsgs } = await supabase
      .from("trip_messages")
      .select("trip_chat_id, created_at, sender_id, content")
      .in("trip_chat_id", chatIds)
      .order("created_at", { ascending: false })
      .limit(Math.min(chatIds.length * 15, 500));

    // Compute latestMessageAt, unreadCount, and last message preview per chat
    const latestMsgMap: Record<string, string> = {};
    const latestContentMap: Record<string, string | null> = {};
    const latestSenderMap: Record<string, string | null> = {};
    const unreadMap: Record<string, number> = {};

    (recentMsgs ?? []).forEach((msg) => {
      const cid = msg.trip_chat_id as string;
      // First occurrence is the latest (rows are DESC ordered)
      if (!latestMsgMap[cid]) {
        latestMsgMap[cid] = msg.created_at;
        latestContentMap[cid] = (msg as any).content ?? null;
        latestSenderMap[cid] = msg.sender_id ?? null;
      }
      // Count messages from others that are newer than last_read_at
      if (msg.sender_id !== user.id) {
        const lastRead = lastReadMap[cid];
        if (!lastRead || msg.created_at > lastRead) {
          unreadMap[cid] = (unreadMap[cid] ?? 0) + 1;
        }
      }
    });

    // Assemble final enriched rows
    const enriched: ChatMemberRow[] = typedRows.map((row) => {
      const chatId = row.trip_chat_id as string;
      const chatData = row.trip_chats;

      // Resolve DM partner from already-loaded members (no extra query needed)
      let dm_user: ChatMemberRow["dm_user"] = null;
      const isDM = chatData && !chatData.trip_id && chatData.name?.startsWith("dm:");
      if (isDM && chatData?.members) {
        const otherMember = chatData.members.find((m: any) => m.user_id !== user.id);
        dm_user = otherMember?.user ?? null;
      }

      return {
        trip_chat_id: chatId,
        last_read_at: row.last_read_at ?? null,
        unread_count: unreadMap[chatId] ?? 0,
        last_message_at: latestMsgMap[chatId] ?? null,
        last_message_content: latestContentMap[chatId] ?? null,
        last_message_sender_id: latestSenderMap[chatId] ?? null,
        is_pinned: row.is_pinned ?? false,
        is_muted: row.is_muted ?? false,
        dm_user,
        trip_chats: chatData ?? null,
      } as ChatMemberRow;
    });

    // Sort: pinned first, then by last message time descending
    enriched.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      const aTime = a.last_message_at ?? a.trip_chats?.created_at ?? "";
      const bTime = b.last_message_at ?? b.trip_chats?.created_at ?? "";
      return bTime.localeCompare(aTime);
    });

    setData(enriched);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { data, isLoading, refetch: fetchConversations };
}

// Toggle pin on a conversation (per current user)
export function usePinConversation() {
  return useMutation({
    mutationFn: async ({ chatId, pinned }: { chatId: string; pinned: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");
      await supabase.from("trip_chat_members")
        .update({ is_pinned: pinned })
        .eq("trip_chat_id", chatId)
        .eq("user_id", user.id);
    },
  });
}

// Toggle mute on a conversation (per current user)
export function useMuteConversation() {
  return useMutation({
    mutationFn: async ({ chatId, muted }: { chatId: string; muted: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");
      await supabase.from("trip_chat_members")
        .update({ is_muted: muted })
        .eq("trip_chat_id", chatId)
        .eq("user_id", user.id);
    },
  });
}

// Get total unread count across all trip chats
// FIXED: was N+1 (one query per chat). Now uses exactly 2 queries total.
export function useTotalUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      // getSession() reads from AsyncStorage — no network hit
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const user = session.user;

      // QUERY 1: membership rows (unchanged — small, indexed query)
      const { data: members } = await supabase
        .from("trip_chat_members")
        .select("trip_chat_id, last_read_at")
        .eq("user_id", user.id);

      if (!members || cancelled || members.length === 0) {
        if (!cancelled) setCount(0);
        return;
      }

      const chatIds = members.map((m) => m.trip_chat_id);
      const lastReadMap: Record<string, string | null> = {};
      members.forEach((m) => { lastReadMap[m.trip_chat_id] = m.last_read_at ?? null; });

      // Find the oldest last_read_at so we can use it as a lower bound filter,
      // keeping the result set small.
      const oldestRead = members.reduce((oldest, m) => {
        if (!m.last_read_at) return oldest;
        if (!oldest) return m.last_read_at;
        return m.last_read_at < oldest ? m.last_read_at : oldest;
      }, null as string | null);

      // QUERY 2 (replaces N queries): fetch unread messages across all chats at once
      let q = supabase
        .from("trip_messages")
        .select("trip_chat_id, created_at, sender_id")
        .in("trip_chat_id", chatIds)
        .neq("sender_id", user.id)
        .limit(1000); // safety cap; 1000 unread messages is more than sufficient

      if (oldestRead) q = q.gt("created_at", oldestRead);

      const { data: msgs } = await q;
      if (cancelled) return;

      // Count per-chat in JS respecting each chat's individual last_read_at
      let total = 0;
      (msgs ?? []).forEach((msg) => {
        const lastRead = lastReadMap[msg.trip_chat_id];
        if (!lastRead || msg.created_at > lastRead) total++;
      });

      setCount(total);
    };

    fetchCount();

    // Poll every 30s (unchanged cadence)
    const interval = setInterval(fetchCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return count;
}

// Get messages for a trip chat with pagination
export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId ?? ""),
    staleTime: 1000 * 30, // 30 seconds — messages are near-realtime via subscription
    queryFn: async (): Promise<MessageWithSender[]> => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("trip_messages")
        .select(
          `
          *,
          sender:users(*)
        `
        )
        .eq("trip_chat_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;
      // Reverse to show oldest first
      return ((data ?? []) as MessageWithSender[]).reverse();
    },
    enabled: !!conversationId,
  });
}

// Load older messages (for pull-to-load-more)
export function useLoadOlderMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (oldestMessageDate: string): Promise<MessageWithSender[]> => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("trip_messages")
        .select(
          `
          *,
          sender:users(*)
        `
        )
        .eq("trip_chat_id", conversationId)
        .lt("created_at", oldestMessageDate)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;
      return ((data ?? []) as MessageWithSender[]).reverse();
    },
    onSuccess: (olderMessages) => {
      if (olderMessages.length > 0 && conversationId) {
        queryClient.setQueryData<MessageWithSender[]>(
          chatKeys.messages(conversationId),
          (old) => [...olderMessages, ...(old ?? [])]
        );
      }
    },
  });
}

// Real-time message subscription
export function useRealtimeMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`trip_messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_messages",
          filter: `trip_chat_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the full message with sender
          const { data: message } = await supabase
            .from("trip_messages")
            .select(
              `
              *,
              sender:users(*)
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (message) {
            // Add to cache (avoid duplicates)
            queryClient.setQueryData<MessageWithSender[]>(
              chatKeys.messages(conversationId),
              (old) => {
                const existing = old ?? [];
                if (existing.some((m) => m.id === message.id)) return existing;
                return [...existing, message as MessageWithSender];
              }
            );

            // Also refresh conversations list to update last_message and unread
            queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
}

// Real-time subscription for conversation list updates
export function useRealtimeConversations() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("trip-chats-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_chats",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
        }
      )
      // Also watch when the user is added to a new trip chat
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_chat_members",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// Send message to a trip chat
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      type = "text",
    }: {
      conversationId: string;
      content: string;
      type?: "text" | "image" | "system";
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("trip_messages")
        .insert({
          trip_chat_id: conversationId,
          sender_id: user.id,
          content,
          type,
        })
        .select(
          `
          *,
          sender:users(*)
        `
        )
        .single();

      if (error) throw error;

      return data as MessageWithSender;
    },
    onSuccess: (data, variables) => {
      // Add message to cache immediately (optimistic)
      queryClient.setQueryData<MessageWithSender[]>(
        chatKeys.messages(variables.conversationId),
        (old) => {
          const existing = old ?? [];
          if (existing.some((m) => m.id === data.id)) return existing;
          return [...existing, data];
        }
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// Create direct conversation - not supported in new schema (trip_chats are trip-based only)
// This is kept for backwards compatibility but redirects to finding an existing trip chat
export function useCreateDirectConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_otherUserId: string): Promise<string> => {
      // Direct conversations are not supported in the new trip_chats schema
      // Return empty string as a no-op
      console.log("[useCreateDirectConversation] Direct conversations not supported in new schema");
      return "";
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// Get or ensure access to the trip chat (trip_chat is created by DB trigger on trip insert)
export function useCreateTripConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      name,
    }: {
      tripId: string;
      name: string;
    }): Promise<string> => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("Not authenticated");

      // Check if trip chat already exists
      const { data: existingChat } = await supabase
        .from("trip_chats")
        .select("*")
        .eq("trip_id", tripId)
        .maybeSingle();

      if (!existingChat) {
        throw new Error("Trip chat not found. The trip may still be initializing.");
      }

      // Ensure current user is a member
      const { data: existingMember } = await supabase
        .from("trip_chat_members")
        .select("id")
        .eq("trip_chat_id", existingChat.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingMember) {
        await supabase
          .from("trip_chat_members")
          .insert({ trip_chat_id: existingChat.id, user_id: user.id, last_read_at: new Date().toISOString() });
      }

      return existingChat.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// Mark trip chat as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("trip_chat_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("trip_chat_id", conversationId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// Typing indicator using Supabase Realtime Presence
export function useTypingIndicator(conversationId: string | undefined) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: "typing" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typingUserIds: string[] = [];
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((p) => {
            if (p.is_typing) {
              typingUserIds.push(p.user_id);
            }
          });
        });
        setTypingUsers(typingUserIds);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId]);

  const sendTyping = useCallback(
    async (userId: string) => {
      if (!channelRef.current) return;

      await channelRef.current.track({
        user_id: userId,
        is_typing: true,
      });

      // Auto-clear after 3 seconds
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        if (channelRef.current) {
          await channelRef.current.untrack();
        }
      }, 3000);
    },
    []
  );

  const stopTyping = useCallback(async () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (channelRef.current) {
      await channelRef.current.untrack();
    }
  }, []);

  return { typingUsers, sendTyping, stopTyping };
}

// Delete a message (only the sender can delete their own)
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId,
    }: {
      messageId: string;
      conversationId: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      // Verify ownership before deleting
      const { data: msg } = await supabase
        .from("trip_messages")
        .select("sender_id")
        .eq("id", messageId)
        .single();

      if (msg?.sender_id !== user.id) throw new Error("Not your message");

      const { error } = await supabase
        .from("trip_messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", user.id);

      if (error) throw error;

      return { messageId, conversationId };
    },
    onSuccess: ({ messageId, conversationId }) => {
      queryClient.setQueryData<MessageWithSender[]>(
        chatKeys.messages(conversationId),
        (old) => (old ?? []).filter((m) => m.id !== messageId)
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// Find or create a DM (direct message) trip_chat between current user and another user
// Uses the get_or_create_dm_chat RPC which creates in trip_chats with trip_id=NULL
export function useGetOrCreateDMChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');

      // Call the SECURITY DEFINER RPC to get or create DM
      const { data, error } = await supabase.rpc('get_or_create_dm_chat', {
        p_user1_id: user.id,
        p_user2_id: otherUserId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// Leave a trip chat (removes only the current user, posts a system message first)
export function useLeaveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      // Get the user's display name
      const { data: profile } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();

      const displayName = profile?.name?.split(" ")[0] ?? "Someone";

      // Check it's a group chat (not a DM) before posting the system message
      const { data: chat } = await supabase
        .from("trip_chats")
        .select("trip_id, name")
        .eq("id", conversationId)
        .single();

      const isGroupChat = !!chat?.trip_id;

      // Post system message while still a member (RLS allows it)
      if (isGroupChat) {
        await supabase.from("trip_messages").insert({
          trip_chat_id: conversationId,
          sender_id: user.id,
          content: `${displayName} left the trip`,
          type: "system",
        });
      }

      // Now remove from chat
      const { error } = await supabase
        .from("trip_chat_members")
        .delete()
        .eq("trip_chat_id", conversationId)
        .eq("user_id", user.id);

      if (error) throw error;
      return conversationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// Block/hide a trip chat — removes the user from trip_chat_members
export function useBlockConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("trip_chat_members")
        .delete()
        .eq("trip_chat_id", conversationId)
        .eq("user_id", user.id);

      if (error) throw error;
      return conversationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// Subscribe to DELETE events on trip_messages (for real-time delete sync)
export function useRealtimeMessageDeletes(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`trip-message-deletes:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "trip_messages",
          filter: `trip_chat_id=eq.${conversationId}`,
        },
        (payload) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          queryClient.setQueryData<MessageWithSender[]>(
            chatKeys.messages(conversationId),
            (old) => (old ?? []).filter((m) => m.id !== deletedId)
          );
          queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
}

// Join the TagAlong global groupchat — no-op in new schema since there's no global chat
// Trip chats are tied to specific trips; kept for backwards compatibility
export function useJoinTagAlongChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<string | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        console.log("[useJoinTagAlongChat] No authenticated user");
        return null;
      }

      console.log("[useJoinTagAlongChat] TagAlong global chat not supported in new schema");
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// Get a single trip chat by ID
export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.conversation(conversationId ?? ""),
    queryFn: async (): Promise<ConversationWithDetails | null> => {
      if (!conversationId) return null;
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return null;

      const { data, error } = await supabase
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
        .eq("id", conversationId)
        .single();

      if (error) return null;

      const memberInfo = await supabase
        .from("trip_chat_members")
        .select("last_read_at")
        .eq("trip_chat_id", conversationId)
        .eq("user_id", user.id)
        .single();

      const { data: lastMsgArr } = await supabase
        .from("trip_messages")
        .select("*")
        .eq("trip_chat_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(1);

      return {
        ...data,
        last_message: lastMsgArr?.[0] ?? null,
        unread_count: 0,
      } as ConversationWithDetails;
    },
    enabled: !!conversationId,
  });
}