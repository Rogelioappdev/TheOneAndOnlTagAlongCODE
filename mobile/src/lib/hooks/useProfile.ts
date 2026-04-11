import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { UserProfile } from "../database.types";

export const profileKeys = {
  detail: (userId: string) => ["profile", userId] as const,
  current: () => ["profile", "current"] as const,
};

/**
 * Fetch a user's profile from Supabase and return their avatar_url.
 * Prioritizes the uploaded profile_photo over any OAuth avatar.
 */
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? ""),
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get the best available avatar URL for a user profile.
 * Returns the uploaded profile_photo if available, otherwise falls back to
 * the first photo in the photos array, then to the provided fallback.
 */
export function getAvatarUrl(
  profile: UserProfile | null | undefined,
  fallback?: string | null
): string {
  if (profile?.profile_photo) return profile.profile_photo;
  if (profile?.photos && profile.photos.length > 0) return profile.photos[0];
  return fallback ?? "";
}

/**
 * Fetch current user's profile.
 */
export function useCurrentProfile() {
  return useQuery({
    queryKey: profileKeys.current(),
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<UserProfile | null> => {
      // getSession reads from AsyncStorage — no network round-trip
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