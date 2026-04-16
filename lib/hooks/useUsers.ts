import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { UserProfile } from "../database.types";

// Query keys
export const userKeys = {
  all: ["users"] as const,
  detail: (id: string) => ["users", id] as const,
  current: () => ["users", "current"] as const,
  swipeable: () => ["users", "swipeable"] as const,
};

// Get current user profile
export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.current(),
    staleTime: 1000 * 60 * 5, // 5 minutes — profile data changes rarely
    queryFn: async (): Promise<UserProfile | null> => {
      // getSession() reads from AsyncStorage — no network round-trip
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return null;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
  });
}

// Get user by ID
export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(userId ?? ""),
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async (): Promise<UserProfile | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!userId,
  });
}

// Get swipeable users — returns a simple array (20 at a time, cursor-paginated internally).
// FIXED from original:
//   1. Caps swipedIds at 500 most-recent to prevent URL overflow at scale
//   2. Fetches 20 instead of 100 profiles per load
//   3. staleTime: 2min prevents refetch on every tab switch
//   4. Swapped getUser() → getSession() (no network round-trip)
export function useSwipeableUsers(cursor?: string) {
  return useQuery({
    queryKey: [...userKeys.swipeable(), cursor ?? "start"],
    staleTime: 1000 * 60 * 2, // 2 minutes
    queryFn: async (): Promise<UserProfile[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return [];

      // Cap at 500 most-recent swipes to avoid URL overflow with large NOT IN lists
      const { data: swipedUsers } = await supabase
        .from("swipes")
        .select("swiped_id")
        .eq("swiper_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);

      const swipedIds = swipedUsers?.map((s) => s.swiped_id) ?? [];

      let query = supabase
        .from("users")
        .select("*")
        .neq("id", user.id)
        .not("name", "is", null)
        .neq("name", "")
        .order("created_at", { ascending: false })
        .limit(20); // was 100 — 20 is plenty for one swipe session

      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      if (swipedIds.length > 0) {
        query = query.not("id", "in", `(${swipedIds.join(",")})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as UserProfile[]) ?? [];
    },
  });
}

// Update user profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(userKeys.current(), data);
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) });
    },
  });
}

// Upload profile photo
export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uri: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split(".").pop() ?? "jpg";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-photos").getPublicUrl(fileName);

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.current() });
    },
  });
}