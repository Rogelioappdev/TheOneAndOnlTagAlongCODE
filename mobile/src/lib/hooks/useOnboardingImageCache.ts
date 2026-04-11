import { useEffect, useState } from 'react';
import { Image, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const ONBOARDING_IMAGES = [
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/onboarding/Image%20ON%201.jpg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/onboarding/Image%20OB%202.jpg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/onboarding/Image%20OB%203.jpg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/onboarding/Image%20OB%204.jpg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/onboarding/Image%20OB%205.jpg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/onboarding/Image%20OB%206.jpg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P1.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P2.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P3.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P6.jpg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P8.jpg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P9.jpg',
  // Question slides 8-18 backgrounds (preloaded so they appear instantly)
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p11.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p12.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p13.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p14.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p15.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p16.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p17.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p18.jpeg',
];

const CACHE_KEY = 'onboarding_images_cached_v2';
const isWeb = Platform.OS === 'web';
const CACHE_DIR = isWeb ? '' : `${FileSystem.documentDirectory}onboarding-cache/`;

interface CachedImage {
  url: string;
  localPath: string;
}

export const useOnboardingImageCache = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [cachedImages, setCachedImages] = useState<CachedImage[]>([]);

  useEffect(() => {
    const initializeCache = async () => {
      try {
        setIsLoading(true);

        // On web, skip file system caching and use remote URLs with prefetch
        if (isWeb) {
          const images = ONBOARDING_IMAGES.map((url) => ({ url, localPath: url }));
          setCachedImages(images);
          // Prefetch images for browser caching
          await Promise.allSettled(images.map((img) => Image.prefetch(img.url)));
          setIsLoading(false);
          return;
        }

        // Check if images are already cached
        const isCached = await AsyncStorage.getItem(CACHE_KEY);

        if (isCached === 'true') {
          // Images already cached, just validate they exist
          const cached = await validateCache();
          if (cached.length === ONBOARDING_IMAGES.length) {
            setCachedImages(cached);
            // Prefetch for memory caching
            cached.forEach((img) => Image.prefetch(img.localPath));
            setIsLoading(false);
            return;
          }
        }

        // Cache directory doesn't exist or cache is invalid, recreate it
        try {
          await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
        } catch {
          // Ignore deletion errors
        }

        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });

        // Download and cache all images
        const cached: CachedImage[] = [];

        for (let i = 0; i < ONBOARDING_IMAGES.length; i++) {
          const url = ONBOARDING_IMAGES[i];
          const filename = `image-${i}.jpg`;
          const localPath = `${CACHE_DIR}${filename}`;

          try {
            // Download image
            await FileSystem.downloadAsync(url, localPath);

            cached.push({ url, localPath });

            // Prefetch to memory cache
            Image.prefetch(localPath);
          } catch (error) {
            console.warn(`Failed to cache image ${i}:`, error);
            // Fall back to remote URL if caching fails
            cached.push({ url, localPath: url });
          }
        }

        setCachedImages(cached);

        // Mark as cached
        await AsyncStorage.setItem(CACHE_KEY, 'true');
      } catch (error) {
        console.error('Error initializing onboarding image cache:', error);
        // Fallback: use remote URLs
        setCachedImages(
          ONBOARDING_IMAGES.map((url) => ({ url, localPath: url }))
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeCache();
  }, []);

  return {
    isLoading,
    cachedImages,
    getCachedImageUrl: (originalUrl: string) => {
      const cached = cachedImages.find((img) => img.url === originalUrl);
      return cached?.localPath || originalUrl;
    },
  };
};

async function validateCache(): Promise<CachedImage[]> {
  // Skip validation on web - no file system caching
  if (isWeb) {
    return [];
  }

  const cached: CachedImage[] = [];

  for (let i = 0; i < ONBOARDING_IMAGES.length; i++) {
    const filename = `image-${i}.jpg`;
    const localPath = `${CACHE_DIR}${filename}`;
    const url = ONBOARDING_IMAGES[i];

    try {
      const info = await FileSystem.getInfoAsync(localPath);
      if (info.exists && info.size && info.size > 0) {
        cached.push({ url, localPath });
      } else {
        // File is invalid, will be recreated
        return [];
      }
    } catch {
      // File doesn't exist, will be recreated
      return [];
    }
  }

  return cached;
}

// Preload images at app startup (non-blocking)
export const preloadOnboardingImages = async () => {
  try {
    // On web, just prefetch remote images
    if (isWeb) {
      await Promise.allSettled(
        ONBOARDING_IMAGES.map((url) => Image.prefetch(url))
      );
      return;
    }

    const isCached = await AsyncStorage.getItem(CACHE_KEY);

    if (isCached === 'true') {
      // Validate and prefetch cached images
      const cached = await validateCache();
      cached.forEach((img) => Image.prefetch(img.localPath));
    } else {
      // Prefetch remote images in parallel
      await Promise.allSettled(
        ONBOARDING_IMAGES.map((url) => Image.prefetch(url))
      );
    }
  } catch (error) {
    console.warn('Error preloading onboarding images:', error);
  }
};
