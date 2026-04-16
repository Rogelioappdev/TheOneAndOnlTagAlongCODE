import { useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../supabase";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface UseAuthReturn extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setState({
          session,
          user: session?.user ?? null,
          isLoading: false,
          isAuthenticated: !!session,
        });
      } catch (error) {
        console.error("Auth initialization error:", error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log("Auth state changed:", event);

        setState({
          session,
          user: session?.user ?? null,
          isLoading: false,
          isAuthenticated: !!session,
        });

        if (event === "SIGNED_IN" && session?.user) {
          await ensureUserProfile(session.user);
          queryClient.invalidateQueries({ queryKey: ["user"] });
        }

        if (event === "SIGNED_OUT") {
          queryClient.clear();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // Ensure user profile exists in our users table
  const ensureUserProfile = async (user: User) => {
    try {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!existingUser) {
        // Create user profile
        const newUser = {
          id: user.id,
          email: user.email ?? "",
          name:
            (user.user_metadata?.full_name as string) ??
            (user.user_metadata?.name as string) ??
            "Traveler",
          profile_photo:
            (user.user_metadata?.avatar_url as string | null) ??
            (user.user_metadata?.picture as string | null) ??
            null,
        };

        const { error } = await supabase.from("users").insert(newUser);

        if (error) {
          console.error("Error creating user profile:", error);
        }
      }
    } catch (error) {
      console.error("Error ensuring user profile:", error);
    }
  };

  const getRedirectUri = () => {
    return "com.vibecode.tagalong://callback";
  };

  const signInWithGoogle = useCallback(async () => {
    try {
      const redirectUri = getRedirectUri();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === "success" && result.url) {
          // Extract tokens from URL and sign in
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      const redirectUri = getRedirectUri();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === "success" && result.url) {
          // Extract tokens from URL and sign in
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    } catch (error) {
      console.error("Apple sign-in error:", error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  }, [queryClient]);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        session: data.session,
        user: data.user,
        isAuthenticated: !!data.session,
      }));
    } catch (error) {
      console.error("Session refresh error:", error);
    }
  }, []);

  return {
    ...state,
    signInWithGoogle,
    signInWithApple,
    signOut,
    refreshSession,
  };
}
