import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { Trip, TripMember, UserProfile } from "../database.types";
import { tripChatKeys } from "./useTripChat";

// Query keys
export const tripKeys = {
  all: ["trips"] as const,
  detail: (id: string) => ["trips", id] as const,
  myTrips: () => ["trips", "my"] as const,
  saved: () => ["trips", "saved"] as const,
  feed: () => ["trips", "feed"] as const,
};

export interface TripWithDetails extends Trip {
  creator: UserProfile;
  members: Array<TripMember & { user: UserProfile }>;
  member_count: number;
}

// Get all trips for feed
export function useTrips() {
  return useQuery({
    queryKey: tripKeys.feed(),
    staleTime: 1000 * 60 * 2, // 2 minutes — trip feed is fine slightly stale
    queryFn: async (): Promise<TripWithDetails[]> => {
      const { data, error } = await supabase
        .from("trips")
        .select(
          `
          *,
          creator:users!creator_id(*),
          members:trip_members(
            *,
            user:users(*)
          )
        `
        )
        .eq("status", "planning")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data ?? []).map((trip) => ({
        ...trip,
        member_count: trip.members?.length ?? 0,
      })) as TripWithDetails[];
    },
  });
}

// Get single trip
export function useTrip(tripId: string | undefined) {
  return useQuery({
    queryKey: tripKeys.detail(tripId ?? ""),
    staleTime: 1000 * 60 * 2,
    queryFn: async (): Promise<TripWithDetails | null> => {
      if (!tripId) return null;

      const { data, error } = await supabase
        .from("trips")
        .select(
          `
          *,
          creator:users!creator_id(*),
          members:trip_members(
            *,
            user:users(*)
          )
        `
        )
        .eq("id", tripId)
        .single();

      if (error) throw error;

      return {
        ...data,
        member_count: data.members?.length ?? 0,
      } as TripWithDetails;
    },
    enabled: !!tripId,
  });
}

// Get user's trips (created or joined)
// Returns { trips, userId } so the UI never has a null-userId race condition
// (myTrips data and userId come from the same session call → always in sync).
export function useMyTrips() {
  return useQuery({
    queryKey: tripKeys.myTrips(),
    staleTime: 1000 * 60 * 2,
    queryFn: async (): Promise<{ trips: TripWithDetails[]; userId: string }> => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) return { trips: [], userId: '' };

      // Single JOIN query — scales to any number of trips.
      // Query from trip_members side so Postgres uses the (user_id) index
      // and never builds a long IN(...) URL that breaks at scale.
      const { data: memberRows, error } = await supabase
        .from("trip_members")
        .select(
          `
          status,
          trip:trips(
            *,
            creator:users!creator_id(*),
            members:trip_members(
              *,
              user:users(*)
            )
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { referencedTable: "trips", ascending: true });

      if (error) throw error;

      // Unwrap the nested trip object and deduplicate (creator is also a member)
      const seen = new Set<string>();
      const trips: TripWithDetails[] = [];
      for (const row of memberRows ?? []) {
        const trip = row.trip as any;
        if (!trip || seen.has(trip.id)) continue;
        seen.add(trip.id);
        trips.push({
          ...trip,
          member_count: trip.members?.length ?? 0,
        } as TripWithDetails);
      }

      return { trips, userId: user.id };
    },
  });
}

// Create trip — calls create_trip_with_chat RPC which runs entirely inside
// Postgres as SECURITY DEFINER. Creates the trip, groupchat, and adds the
// creator to both trip_members and trip_chat_members in one atomic transaction.
// No RLS, no client-side race conditions, scales to millions of users.
export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      tripData: Omit<Trip, "id" | "created_at" | "updated_at" | "creator_id">
    ) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("create_trip_with_chat", {
        p_creator_id:      user.id,
        p_title:           tripData.title,
        p_destination:     tripData.destination,
        p_country:         tripData.country,
        p_cover_image:     tripData.cover_image     ?? null,
        p_description:     tripData.description     ?? null,
        p_images:          tripData.images          ?? [],
        p_start_date:      tripData.start_date      ?? null,
        p_end_date:        tripData.end_date        ?? null,
        p_is_flexible:     tripData.is_flexible_dates ?? false,
        p_vibes:           tripData.vibes           ?? [],
        p_pace:            tripData.pace            ?? null,
        p_group_preference: tripData.group_preference ?? null,
        p_max_group_size:  tripData.max_group_size  ?? 6,
        p_budget_level:    tripData.budget_level    ?? null,
        p_status:          tripData.status          ?? "planning",
      });

      if (error) throw error;

      // RPC returns { trip_id, chat_id } — fetch the full trip for cache update
      const tripId = (data as any).trip_id as string;

      const { data: trip, error: fetchError } = await supabase
        .from("trips")
        .select(`
          *,
          creator:users!creator_id(*),
          members:trip_members(*, user:users(*))
        `)
        .eq("id", tripId)
        .single();

      if (fetchError) throw fetchError;

      return trip as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
      queryClient.invalidateQueries({ queryKey: tripKeys.myTrips() });
      queryClient.invalidateQueries({ queryKey: tripChatKeys.all });
    },
  });
}

// Join trip
export function useJoinTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      status,
    }: {
      tripId: string;
      status: "in" | "maybe";
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("Not authenticated");

      // Try inserting; if the row already exists, update it instead
      const { data: existing } = await supabase
        .from("trip_members")
        .select("id")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from("trip_members")
          .update({ status })
          .eq("trip_id", tripId)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from("trip_members")
          .insert({ trip_id: tripId, user_id: user.id, status })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      // If joining as 'in', ensure user is in the trip group chat
      if (status === "in") {
        const { data: chat } = await supabase
          .from("trip_chats")
          .select("id")
          .eq("trip_id", tripId)
          .maybeSingle();

        if (chat) {
          const { error: cmError } = await supabase
            .from("trip_chat_members")
            .insert({ trip_chat_id: chat.id, user_id: user.id, last_read_at: new Date().toISOString() });
          // Ignore duplicate (23505 = unique_violation)
          if (cmError && cmError.code !== "23505") throw cmError;

          // Fetch the user's display name for the system message
          const { data: userRow } = await supabase
            .from("users")
            .select("name")
            .eq("id", user.id)
            .single();
          const displayName = userRow?.name ?? "Someone";

          // Insert system message — sender_id is the joining user (passes RLS),
          // type 'system' tells the chat UI to render it as a pill not a bubble
          await supabase.from("trip_messages").insert({
            trip_chat_id: chat.id,
            sender_id: user.id,
            content: `👋 ${displayName} joined the trip`,
            type: "system",
          });
        }
      }

      return result as TripMember;
    },
    onSuccess: (result, variables) => {
      const { tripId, status } = variables;

      // Optimistic update — patch the cached myTrips data immediately so the
      // status label (In / Maybe) updates before the network refetch completes.
      queryClient.setQueryData<{ trips: TripWithDetails[]; userId: string }>(
        tripKeys.myTrips(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            trips: old.trips.map((trip) => {
              if (trip.id !== tripId) return trip;
              const userId = result.user_id;
              // Only patch status on existing member rows.
              // useMyTrips only shows trips the user is already part of,
              // so existingMember will always be found here.
              const updatedMembers = trip.members.map((m) =>
                m.user_id === userId ? { ...m, status } : m
              );
              return { ...trip, members: updatedMembers };
            }),
          };
        }
      );

      // Then do the full invalidation to sync with server
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
      queryClient.invalidateQueries({ queryKey: tripKeys.myTrips() });
      queryClient.invalidateQueries({ queryKey: tripChatKeys.all });
    },
  });
}

// Leave trip
export function useLeaveTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("Not authenticated");

      // Fetch name and chat BEFORE deleting — user is still a member so RLS passes
      const { data: userRow } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();
      const displayName = userRow?.name ?? "Someone";

      const { data: chat } = await supabase
        .from("trip_chats")
        .select("id")
        .eq("trip_id", tripId)
        .maybeSingle();

      // Insert system message first — user is still in trip_chat_members here,
      // so RLS allows the insert. After this we remove them.
      if (chat) {
        await supabase.from("trip_messages").insert({
          trip_chat_id: chat.id,
          sender_id: user.id,
          content: `${displayName} left the trip`,
          type: "system",
        });
      }

      // Now remove from trip_members and trip_chat_members
      const { error } = await supabase
        .from("trip_members")
        .delete()
        .eq("trip_id", tripId)
        .eq("user_id", user.id);

      if (error) throw error;

      if (chat) {
        await supabase
          .from("trip_chat_members")
          .delete()
          .eq("trip_chat_id", chat.id)
          .eq("user_id", user.id);
      }
    },
    onSuccess: (_, tripId) => {
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
      queryClient.invalidateQueries({ queryKey: tripKeys.myTrips() });
      queryClient.invalidateQueries({ queryKey: tripChatKeys.all });
    },
  });
}

// Save trip to bucket list
export function useSaveTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("saved_trips").insert({
        trip_id: tripId,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.saved() });
    },
  });
}

// Unsave trip
export function useUnsaveTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("saved_trips")
        .delete()
        .eq("trip_id", tripId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.saved() });
    },
  });
}

// Get saved trips (bucket list from Supabase)
export function useSavedTrips() {
  return useQuery({
    queryKey: tripKeys.saved(),
    queryFn: async (): Promise<TripWithDetails[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) return [];

      const { data, error } = await supabase
        .from("saved_trips")
        .select(
          `
          trip:trips(
            *,
            creator:users!creator_id(*),
            members:trip_members(
              *,
              user:users(*)
            )
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? [])
        .map((row) => row.trip)
        .filter(Boolean)
        .map((trip: any) => ({
          ...trip,
          member_count: trip.members?.length ?? 0,
        })) as TripWithDetails[];
    },
  });
}

// Check if a trip is saved by current user
export function useIsTripSaved(tripId: string | undefined) {
  return useQuery({
    queryKey: [...tripKeys.saved(), "check", tripId],
    queryFn: async (): Promise<boolean> => {
      if (!tripId) return false;

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) return false;

      const { data } = await supabase
        .from("saved_trips")
        .select("id")
        .eq("user_id", user.id)
        .eq("trip_id", tripId)
        .single();

      return !!data;
    },
    enabled: !!tripId,
  });
}

// Delete trip (creator only) — removes trip, all members, group conversation, and messages
export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("Not authenticated");

      // Verify this user is the creator
      const { data: trip, error: fetchError } = await supabase
        .from("trips")
        .select("creator_id")
        .eq("id", tripId)
        .single();

      if (fetchError) throw fetchError;
      if (trip.creator_id !== user.id) throw new Error("Only the trip creator can delete this trip");

      // Delete trip chat members and messages first (FK constraint)
      const { data: chat } = await supabase
        .from("trip_chats")
        .select("id")
        .eq("trip_id", tripId)
        .maybeSingle();

      if (chat) {
        await supabase.from("trip_messages").delete().eq("trip_chat_id", chat.id);
        await supabase.from("trip_chat_members").delete().eq("trip_chat_id", chat.id);
        await supabase.from("trip_chats").delete().eq("id", chat.id);
      }

      // Delete trip members
      await supabase.from("trip_members").delete().eq("trip_id", tripId);

      // Delete saved trips referencing this trip
      await supabase.from("saved_trips").delete().eq("trip_id", tripId);

      // Finally delete the trip itself
      const { error } = await supabase.from("trips").delete().eq("id", tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
      queryClient.invalidateQueries({ queryKey: tripKeys.myTrips() });
      queryClient.invalidateQueries({ queryKey: tripKeys.feed() });
      queryClient.invalidateQueries({ queryKey: tripKeys.saved() });
      queryClient.invalidateQueries({ queryKey: tripChatKeys.all });
    },
  });
}

// Upload trip image
export function useUploadTripImage() {
  return useMutation({
    mutationFn: async ({ tripId, uri }: { tripId: string; uri: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) throw new Error("Not authenticated");

      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split(".").pop() ?? "jpg";
      const fileName = `${tripId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("trip-images")
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("trip-images").getPublicUrl(fileName);

      return publicUrl;
    },
  });
}