import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Create untyped client - we handle types at the query level
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper to get current user ID
export const getCurrentUserId = async (): Promise<string | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
};

// Helper to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return !!session;
};

// Helper to sign in with Google OAuth
export const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    WebBrowser.maybeCompleteAuthSession();

    // Use Supabase callback URL for redirect
    const redirectUrl = "https://tnstvbxngubfuxatggem.supabase.co/auth/v1/callback";

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === "success") {
        const url = result.url;
        // Parse tokens from URL hash (OAuth callback format)
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          return { success: true };
        } else {
          console.warn("No tokens found in callback URL");
          return { success: false, error: "No tokens received from authentication" };
        }
      }
    }

    return { success: false, error: "Authentication cancelled" };
  } catch (error: any) {
    console.error("Google sign-in error:", error);
    return { success: false, error: error.message || "Failed to sign in" };
  }
};

// Helper to sign in with Apple OAuth (uses web-based OAuth flow)
export const signInWithApple = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // Try native Apple Auth on iOS
    if (Platform.OS === 'ios') {
      try {
        const AppleAuthentication = require('expo-apple-authentication');
        const isNativeAvailable = await AppleAuthentication.isAvailableAsync();
        if (isNativeAvailable) {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          const identityToken = credential.identityToken;
          if (!identityToken) {
            return { success: false, error: "Apple did not return an identity token." };
          }
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "apple",
            token: String(identityToken).trim(),
          });
          if (error) throw error;
          return { success: true };
        }
      } catch (nativeError: any) {
        if (nativeError.code === "ERR_REQUEST_CANCELED" || nativeError.code === "ERR_CANCELED") {
          return { success: false, error: "Sign in cancelled" };
        }
        console.error("Native Apple Auth error:", nativeError);
      }
    }

    // Fallback: web-based OAuth flow
    WebBrowser.maybeCompleteAuthSession();
    const redirectUrl = "https://tnstvbxngubfuxatggem.supabase.co/auth/v1/callback";
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === "success") {
        const urlObj = new URL(result.url);
        const params = new URLSearchParams(urlObj.hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          return { success: true };
        }
        return { success: false, error: "No tokens received" };
      }
      if (result.type === "cancel" || result.type === "dismiss") {
        return { success: false, error: "Sign in cancelled" };
      }
    }
    return { success: false, error: "Authentication failed" };
  } catch (error: any) {
    if (error.code === "ERR_REQUEST_CANCELED" || error.code === "ERR_CANCELED") {
      return { success: false, error: "Sign in cancelled" };
    }
    console.error("Apple sign-in error:", error);
    return { success: false, error: error.message || "Failed to sign in with Apple" };
  }
};

// Helper to create or update user profile in database
// Returns isExistingUser = true when the account already has a completed profile (age is set)
export const ensureUserProfile = async (): Promise<{ success: boolean; isExistingUser?: boolean; userName?: string; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No authenticated user" };
    }

    // Check if user already exists in users table
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("id, age, name")
      .eq("id", user.id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    // If user doesn't exist, create profile
    if (!existingUser) {
      const { error: insertError } = await supabase.from("users").insert({
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.full_name || user.user_metadata?.name || "User",
        profile_photo: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;
      return { success: true, isExistingUser: false };
    }

    // User exists — check if they have a completed profile (age is the indicator)
    const isExistingUser = existingUser.age != null;
    const userName = existingUser.name || user.user_metadata?.full_name || user.user_metadata?.name || undefined;
    return { success: true, isExistingUser, userName };
  } catch (error: any) {
    console.error("Profile creation error:", error);
    return { success: false, error: error.message || "Failed to create profile" };
  }
};

// Helper to sign out
export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};

// Helper to upload profile photo to Supabase Storage
export const uploadProfilePhoto = async (
  uri: string,
  userId: string,
  photoIndex: number
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Derive mime type and extension from the URI filename
    const uriLower = uri.toLowerCase();
    let mimeType = 'image/jpeg';
    let fileExt = 'jpg';
    if (uriLower.includes('.png')) { mimeType = 'image/png'; fileExt = 'png'; }
    else if (uriLower.includes('.webp')) { mimeType = 'image/webp'; fileExt = 'webp'; }
    else if (uriLower.includes('.heic')) { mimeType = 'image/heic'; fileExt = 'heic'; }
    else if (uriLower.includes('.heif')) { mimeType = 'image/heif'; fileExt = 'heif'; }
    else if (uriLower.includes('.gif')) { mimeType = 'image/gif'; fileExt = 'gif'; }

    const fileName = `photo_${photoIndex}_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Use expo-file-system to read the local file as base64 — this is reliable on
    // native iOS (TestFlight/production) where fetch() on file:// URIs can fail.
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 string to Uint8Array for Supabase upload
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Upload to Supabase Storage in 'profile-photos' bucket
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

    return { success: true, url: data.publicUrl };
  } catch (error: any) {
    console.error('Photo upload error:', error);
    return { success: false, error: error.message || 'Failed to upload photo' };
  }
};

// Helper to upload multiple profile photos
export const uploadProfilePhotos = async (
  uris: string[],
  userId: string
): Promise<{ success: boolean; urls?: string[]; error?: string }> => {
  try {
    const uploadPromises = uris.map((uri, index) =>
      uploadProfilePhoto(uri, userId, index)
    );
    const results = await Promise.all(uploadPromises);

    const failedUploads = results.filter(r => !r.success);
    if (failedUploads.length > 0) {
      throw new Error(`Failed to upload ${failedUploads.length} photo(s)`);
    }

    const urls = results.map(r => r.url!);
    return { success: true, urls };
  } catch (error: any) {
    console.error('Bulk photo upload error:', error);
    return { success: false, error: error.message || 'Failed to upload photos' };
  }
};


// Helper to save full onboarding profile data to the users table
export const saveFullProfileToDatabase = async (
  userId: string,
  profile: {
    name?: string;
    age?: number | null;
    bio?: string | null;
    country?: string | null;
    city?: string | null;
    gender?: string | null;
    travel_with?: string | null;
    social_energy?: string | null;
    travel_styles?: string[];
    travel_pace?: string | null;
    group_type?: string | null;
    planning_style?: string | null;
    experience_level?: string | null;
    places_visited?: string[];
    bucket_list?: string[];
    languages?: string[];
    is_verified?: boolean;
    availability?: string | null;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Remove undefined keys so we don't overwrite with null unintentionally
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (profile.name !== undefined) updates.name = profile.name;
    if (profile.age !== undefined) updates.age = profile.age;
    if (profile.bio !== undefined) updates.bio = profile.bio;
    if (profile.country !== undefined) updates.country = profile.country;
    if (profile.city !== undefined) updates.city = profile.city;
    if (profile.gender !== undefined) updates.gender = profile.gender;
    if (profile.travel_with !== undefined) updates.travel_with = profile.travel_with;
    if (profile.social_energy !== undefined) updates.social_energy = profile.social_energy;
    if (profile.travel_styles !== undefined) updates.travel_styles = profile.travel_styles;
    if (profile.travel_pace !== undefined) updates.travel_pace = profile.travel_pace;
    if (profile.group_type !== undefined) updates.group_type = profile.group_type;
    if (profile.planning_style !== undefined) updates.planning_style = profile.planning_style;
    if (profile.experience_level !== undefined) updates.experience_level = profile.experience_level;
    if (profile.places_visited !== undefined) updates.places_visited = profile.places_visited;
    if (profile.bucket_list !== undefined) updates.bucket_list = profile.bucket_list;
    if (profile.languages !== undefined) updates.languages = profile.languages;
    if (profile.is_verified !== undefined) updates.is_verified = profile.is_verified;
    if (profile.availability !== undefined) updates.availability = profile.availability;

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Save full profile to DB error:', error);
    return { success: false, error: error.message || 'Failed to save profile' };
  }
};

// Helper to save photo URLs to the users table in the database
export const savePhotoUrlsToDatabase = async (
  userId: string,
  photoUrls: string[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    const primaryPhoto = photoUrls[0] || null;
    const { error } = await supabase
      .from('users')
      .update({
        profile_photo: primaryPhoto,
        photos: photoUrls,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Save photo URLs to DB error:', error);
    return { success: false, error: error.message || 'Failed to save photo URLs' };
  }
};

// Save push notification token to users table
export const savePushTokenToDatabase = async (
  userId: string,
  pushToken: string
): Promise<void> => {
  try {
    await supabase
      .from('users')
      .update({ push_token: pushToken, updated_at: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    console.error('[Push] Failed to save push token to DB:', error);
  }
};

// Upload a single avatar photo to the 'avatars' bucket and save to users table
export const uploadAvatarPhoto = async (
  uri: string,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const uriLower = uri.toLowerCase();
    let mimeType = 'image/jpeg';
    let fileExt = 'jpg';
    if (uriLower.includes('.png')) { mimeType = 'image/png'; fileExt = 'png'; }
    else if (uriLower.includes('.webp')) { mimeType = 'image/webp'; fileExt = 'webp'; }
    else if (uriLower.includes('.heic')) { mimeType = 'image/heic'; fileExt = 'heic'; }

    const filePath = `${userId}/avatar.${fileExt}`;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    // Save directly to users table, overriding any Google OAuth avatar
    const { error: dbError } = await supabase
      .from('users')
      .update({
        profile_photo: publicUrl,
        photos: [publicUrl],
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (dbError) throw dbError;

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    return { success: false, error: error.message || 'Failed to upload avatar' };
  }
};
