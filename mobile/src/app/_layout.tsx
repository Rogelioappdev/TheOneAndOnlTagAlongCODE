 import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
  import { Stack } from 'expo-router';
  import * as SplashScreen from 'expo-splash-screen';
  import { StatusBar } from 'expo-status-bar';
  import { useColorScheme } from '@/lib/useColorScheme';
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  import { GestureHandlerRootView } from 'react-native-gesture-handler';
  import { KeyboardProvider } from 'react-native-keyboard-controller';
  import { useEffect, useState, useCallback, useRef } from 'react';
  import { useRouter, useSegments } from 'expo-router';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { isAuthenticated, supabase } from '@/lib/supabase';
  import { preloadOnboardingImages } from '@/lib/hooks/useOnboardingImageCache';
  import { initializeRevenueCat, setRevenueCatUserId, hasPremiumAccess } from '@/lib/revenuecatConfig';
  import usePremiumStore from '@/lib/state/premium-store';
  import { CustomSplashScreen } from '@/components/CustomSplashScreen';
  import TripMemberJoinedAnimation from '@/components/TripMemberJoinedAnimation';
  import { useRealtimeTripJoin, TripJoinEvent } from '@/lib/hooks/useRealtimeTripJoin';
  import * as Notifications from 'expo-notifications';
  import Constants from 'expo-constants';
  import { Platform } from 'react-native';

  // Show notifications as banners even when the app is in the foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Registers for push notifications and saves the token to Supabase
  async function registerForPushNotifications(userId: string) {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0A84FF',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Push] Permission not granted');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId
        ?? Constants.easConfig?.projectId;

      const tokenData = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();

      const token = tokenData.data;
      if (!token) return;

      // Save to Supabase
      await supabase.from('users').update({ push_token: token }).eq('id', userId);
      console.log('[Push] Token registered:', token);
    } catch (err) {
      console.warn('[Push] Registration failed:', err);
    }
  }

  export const unstable_settings = {
    initialRouteName: '(tabs)',
  };

  SplashScreen.preventAutoHideAsync();

  const queryClient = new QueryClient();

  function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
    const [isReady, setIsReady] = useState(false);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
    const [isUserAuthenticated, setIsUserAuthenticated] = useState<boolean | null>(null);
    const router = useRouter();
    const segments = useSegments();

    const [tripJoinEvent, setTripJoinEvent] = useState<TripJoinEvent | null>(null);
    const [showTripJoinAnimation, setShowTripJoinAnimation] = useState(false);

    const handleNewTripMember = useCallback((event: TripJoinEvent) => {
      setTripJoinEvent(event);
      setShowTripJoinAnimation(true);
    }, []);

    useRealtimeTripJoin(handleNewTripMember);

    // Notification listeners
    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    useEffect(() => {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('[Push] Notification received:', notification.request.content.title);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data as { trip_chat_id?: string; type?: string } | undefined;
        if (data?.trip_chat_id) {
          // Navigate to the messages tab — the conversation will be at the top (unread)
          router.push('/(tabs)/messages');
        }
      });

      return () => {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      };
    }, []);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          await initializeRevenueCat();

          const authenticated = await isAuthenticated();
          let value = await AsyncStorage.getItem('hasSeenOnboarding');

          if (authenticated) {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (user?.id) {
              await setRevenueCatUserId(user.id);
              // Register push token (non-blocking — runs in background)
              registerForPushNotifications(user.id).catch(() => {});

              if (value !== 'true') {
                const { data: dbUser } = await supabase
                  .from('users')
                  .select('age')
                  .eq('id', user.id)
                  .single();
                if (dbUser?.age != null) {
                  await AsyncStorage.setItem('hasSeenOnboarding', 'true');
                  value = 'true';
                  console.log('[Auth] Existing profile detected — skipping onboarding');
                }
              }
            }
            try {
              const isPremium = await hasPremiumAccess();
              const store = usePremiumStore.getState();
              if (isPremium && !store.isPremium) {
                store.setPremium('yearly');
              } else if (!isPremium && store.isPremium) {
                store.removePremium();
              }
            } catch {
              // Non-fatal
            }
          }

          setIsUserAuthenticated(authenticated);
          setHasSeenOnboarding(value === 'true');
          setIsReady(true);
          SplashScreen.hideAsync();

          preloadOnboardingImages().catch((error) => {
            console.warn('Error preloading onboarding images:', error);
          });
        } catch (error) {
          console.error('Error checking auth status:', error);
          setIsReady(true);
          SplashScreen.hideAsync();
        }
      };

      checkAuth();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const value = await AsyncStorage.getItem('hasSeenOnboarding');
          setIsUserAuthenticated(true);
          if (value === 'true') {
            setHasSeenOnboarding(true);
          }
          if (session.user?.id) {
            registerForPushNotifications(session.user.id).catch(() => {});
          }
        } else if (event === 'SIGNED_OUT') {
          setIsUserAuthenticated(false);
        }
      });

      return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
      if (!isReady) return;

      const recheckStatus = async () => {
        const authenticated = await isAuthenticated();
        const value = await AsyncStorage.getItem('hasSeenOnboarding');
        const currentOnboardingStatus = value === 'true';

        if (authenticated !== isUserAuthenticated) {
          setIsUserAuthenticated(authenticated);
        }
        if (currentOnboardingStatus !== hasSeenOnboarding) {
          setHasSeenOnboarding(currentOnboardingStatus);
        }
      };

      recheckStatus();
    }, [segments, isReady]);

    useEffect(() => {
      if (!isReady || hasSeenOnboarding === null) return;

      const currentSegment = segments[0];

      // Don't redirect screens that manage their own navigation
      if (currentSegment === 'welcome-back') return;
      if (currentSegment === 'settings') return;
      if (currentSegment === 'chat') return;
      if (currentSegment === 'modal') return;

      if (hasSeenOnboarding && currentSegment !== '(tabs)') {
        router.replace('/(tabs)');
      } else if (!hasSeenOnboarding && currentSegment !== 'onboarding') {
        router.replace('/onboarding');
      }
    }, [isReady, hasSeenOnboarding, segments]);

    if (!isReady) {
      return null;
    }

    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="welcome-back" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>

        <TripMemberJoinedAnimation
          visible={showTripJoinAnimation}
          onClose={() => setShowTripJoinAnimation(false)}
          newMemberName={tripJoinEvent?.newMember?.name ?? ''}
          newMemberPhoto={tripJoinEvent?.newMember?.profile_photo ?? ''}
          tripDestination={tripJoinEvent?.tripDestination ?? ''}
          tripCountry={tripJoinEvent?.tripCountry ?? ''}
          existingMembersCount={tripJoinEvent?.memberCount ?? 0}
        />
      </ThemeProvider>
    );
  }

  export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [showSplash, setShowSplash] = useState(true);

    return (
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <StatusBar style="light" />
            <RootLayoutNav colorScheme={colorScheme} />
            {showSplash && (
              <CustomSplashScreen onFinish={() => setShowSplash(false)} />
            )}
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    );
  }
