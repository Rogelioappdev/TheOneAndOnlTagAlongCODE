import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../supabase";
import type { Match, UserProfile, Trip } from "../database.types";
import { userKeys } from "./useUsers";
import { chatKeys } from "./useChat";

// Query keys
export const matchKeys = {
  all: ["matches"] as const,
  mutual: () => ["matches", "mutual"] as const,
  pending: () => ["matches", "pending"] as const,
  requests: () => ["matches", "requests"] as const,
  myLikes: () => ["matches", "myLikes"] as const,
};

export interface MatchWithDetails extends Match {
  other_user: UserProfile;
  trip?: Trip | null;
}

// Get mutual matches
export function useMutualMatches() {
  return useQuery({
    queryKey: matchKeys.mutual(),
    staleTime: 0, // ✅ FIX: always refetch when focus returns — prevents disappearing matches
    queryFn: async (): Promise<MatchWithDetails[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) return [];

      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          user1:users!user1_id(*),
          user2:users!user2_id(*),
          trip:trips(*)
        `
        )
        .eq("status", "accepted")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Map to get the "other" user
      return (data ?? []).map((match) => ({
        ...match,
        other_user:
          match.user1_id === user.id
            ? (match.user2 as UserProfile)
            : (match.user1 as UserProfile),
      })) as MatchWithDetails[];
    },
  });
}

// Get pending requests (people you liked but haven't matched yet)
export function usePendingRequests() {
  return useQuery({
    queryKey: matchKeys.requests(),
    staleTime: 0, // ✅ FIX: always refetch when focus returns — prevents disappearing matches
    queryFn: async (): Promise<MatchWithDetails[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) return [];

      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          user1:users!user1_id(*),
          user2:users!user2_id(*),
          trip:trips(*)
        `
        )
        .eq("status", "pending")
        .or(
          `and(user1_id.eq.${user.id},user1_liked.eq.true),and(user2_id.eq.${user.id},user2_liked.eq.true)`
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((match) => ({
        ...match,
        other_user:
          match.user1_id === user.id
            ? (match.user2 as UserProfile)
            : (match.user1 as UserProfile),
      })) as MatchWithDetails[];
    },
  });
}

// Get all people I have liked (both pending and accepted) — used for the Likes tab
export function useAllMyLikes() {
  return useQuery({
    queryKey: matchKeys.myLikes(),
    staleTime: 1000 * 60 * 2,
    queryFn: async (): Promise<MatchWithDetails[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) return [];

      // Fetch all matches where the current user has liked the other person
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          user1:users!user1_id(*),
          user2:users!user2_id(*),
          trip:trips(*)
        `
        )
        .or(
          `and(user1_id.eq.${user.id},user1_liked.eq.true),and(user2_id.eq.${user.id},user2_liked.eq.true)`
        )
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((match) => ({
        ...match,
        other_user:
          match.user1_id === user.id
            ? (match.user2 as UserProfile)
            : (match.user1 as UserProfile),
      })) as MatchWithDetails[];
    },
  });
}

// Swipe on a user
export function useSwipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      swipedId,
      direction,
      tripId,
    }: {
      swipedId: string;
      direction: "left" | "right";
      tripId?: string;
    }): Promise<{ isMatch: boolean; matchId?: string }> => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("Not authenticated");

      // Call the handle_swipe function
      const { data, error } = await supabase.rpc("handle_swipe", {
        p_swiper_id: user.id,
        p_swiped_id: swipedId,
        p_direction: direction,
        p_trip_id: tripId ?? null,
      });

      if (error) throw error;

      return {
        isMatch: data?.is_match ?? false,
        matchId: data?.match_id,
      };
    },
    onSuccess: (result, variables) => {
      // Optimistically remove the swiped user from the cached list rather than
      // invalidating (which triggers a full re-fetch and causes blank/laggy cards).
      // The user is gone from the deck immediately without any loading flash.
      queryClient.setQueryData<UserProfile[]>(
        [...userKeys.swipeable(), "start"],
        (old) => (old ?? []).filter((u) => u.id !== variables.swipedId)
      );

      // Only invalidate match queries for right swipes
      if (variables.direction === "right") {
        queryClient.invalidateQueries({ queryKey: matchKeys.requests() });
        queryClient.invalidateQueries({ queryKey: matchKeys.myLikes() });

        if (result.isMatch) {
          queryClient.invalidateQueries({ queryKey: matchKeys.mutual() });
        }
      }
    },
  });
}

// Manual swipe (if RPC isn't set up yet)
export function useSwipeManual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      swipedId,
      direction,
      tripId,
    }: {
      swipedId: string;
      direction: "left" | "right";
      tripId?: string;
    }): Promise<{ isMatch: boolean }> => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("Not authenticated");

      // Record the swipe
      await supabase.from("swipes").upsert(
        {
          swiper_id: user.id,
          swiped_id: swipedId,
          trip_id: tripId ?? null,
          direction,
        },
        { onConflict: "swiper_id,swiped_id" }
      );

      if (direction === "left") {
        return { isMatch: false };
      }

      // Check if the other person already swiped right on us
      const { data: otherSwipe } = await supabase
        .from("swipes")
        .select("*")
        .eq("swiper_id", swipedId)
        .eq("swiped_id", user.id)
        .eq("direction", "right")
        .single();

      const isMatch = !!otherSwipe;

      // Normalize user IDs for consistent ordering
      const user1Id = user.id < swipedId ? user.id : swipedId;
      const user2Id = user.id < swipedId ? swipedId : user.id;
      const isUser1 = user.id < swipedId;

      // Create or update match record
      await supabase.from("matches").upsert(
        {
          user1_id: user1Id,
          user2_id: user2Id,
          trip_id: tripId ?? null,
          status: isMatch ? "accepted" : "pending",
          user1_liked: isUser1 ? true : isMatch,
          user2_liked: isUser1 ? isMatch : true,
        },
        { onConflict: "user1_id,user2_id" }
      );

      // Auto-create direct conversation on mutual match
      if (isMatch) {
        try {
          // Use get_or_create_dm_chat RPC to create in trip_chats (which messages tab reads)
          await supabase.rpc('get_or_create_dm_chat', {
            p_user1_id: user.id,
            p_user2_id: swipedId,
          });
        } catch {
          // Best-effort
        }
      }

      return { isMatch };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: userKeys.swipeable() });
      if (result.isMatch) {
        queryClient.invalidateQueries({ queryKey: matchKeys.mutual() });
        queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      } else {
        queryClient.invalidateQueries({ queryKey: matchKeys.requests() });
      }
    },
  });
}

// Real-time subscription for match updates
// FIXED: was 2 separate channels for the same table ("matches:realtime" +
// "matches:new-mutual"). Merged into one channel to halve connection count.
export function useRealtimeMatches() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("matches:all-events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          queryClient.invalidateQueries({ queryKey: matchKeys.mutual() });
          queryClient.invalidateQueries({ queryKey: matchKeys.requests() });
          queryClient.invalidateQueries({ queryKey: matchKeys.myLikes() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// Hook to detect when a pending match becomes accepted (match animation).
// Uses a user-scoped channel name to avoid global broadcast to all users.
export function useRealtimeNewMutualMatch(onNewMatch: (matchedUser: UserProfile, matchId: string) => void) {
  useEffect(() => {
    let userId: string | null = null;

    const setupChannel = async () => {
      // getSession reads from AsyncStorage — no network call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      userId = session.user.id;

      const channel = supabase
        .channel(`matches:mutual-${userId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "matches" },
          async (payload) => {
            const match = payload.new as Match;
            if (!userId) return;
            if (match.status !== "accepted") return;
            if (match.user1_id !== userId && match.user2_id !== userId) return;

            const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

            const { data: otherUser } = await supabase
              .from("users")
              .select("*")
              .eq("id", otherUserId)
              .single();

            if (otherUser) onNewMatch(otherUser as UserProfile, match.id);
          }
        )
        .subscribe();

      return channel;
    };

    let channelRef: ReturnType<typeof supabase.channel> | null = null;
    setupChannel().then((ch) => { if (ch) channelRef = ch; });

    return () => {
      if (channelRef) supabase.removeChannel(channelRef);
    };
  }, [onNewMatch]);
}