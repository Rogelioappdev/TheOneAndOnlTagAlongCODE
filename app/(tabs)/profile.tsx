  import { useState, useEffect, useCallback, useRef } from 'react';
  import { Text, View, Pressable, ScrollView, Image, Modal, TextInput, Dimensions, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
  import { Image as ExpoImage } from 'expo-image';
  import { useQuery } from '@tanstack/react-query';
  import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
  import { LinearGradient } from 'expo-linear-gradient';
  import {
    LogOut,
    MapPin,
    Edit3,
    Camera,
    ChevronRight,
    Globe,
    Languages,
    Zap,
    Users,
    Clock,
    Map,
    Award,
    Settings,
    X,
    Check,
    Plus,
    Minus,
    BadgeCheck,
    Sparkles,
    ChevronDown,
    Heart,
    Compass,
    Bookmark,
    UserCheck,
  } from 'lucide-react-native';
  import { useRouter } from 'expo-router';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import * as Haptics from 'expo-haptics';
  import * as ImagePicker from 'expo-image-picker';
  import Animated, {
    FadeIn, FadeInDown, FadeInUp, FadeOut, SlideInRight, Layout,
    useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence,
    withDelay, interpolate, Easing, withSpring,
  } from 'react-native-reanimated';
  import useUserProfileStore, { UserProfile } from '@/lib/state/user-profile-store';
  import useMatchesStore from '@/lib/state/matches-store';
  import useMessagesStore from '@/lib/state/messages-store';
  import useTripsStore from '@/lib/state/trips-store';
  import usePremiumStore from '@/lib/state/premium-store';
  import { getCurrentUserId, savePhotoUrlsToDatabase, supabase, signOut } from '@/lib/supabase';
  import { uploadFile, getImageMeta } from '@/lib/upload';
  import PremiumPaywall from '@/components/PremiumPaywall';
  import TripDetailSheet from '@/components/tripDetailSheet';

  const { width, height } = Dimensions.get('window');

  // Travel style options
  const TRAVEL_STYLES = [
    { id: 'luxury', label: 'Luxury', icon: '✨' },
    { id: 'backpacking', label: 'Backpacking', icon: '🎒' },
    { id: 'relaxed', label: 'Relaxed', icon: '🏖️ ' },
    { id: 'cultural', label: 'Cultural', icon: '🏛️ ' },
    { id: 'budget', label: 'Budget', icon: '💰' },
    { id: 'adventure', label: 'Adventure', icon: '🏔️ ' },
    { id: 'party', label: 'Party', icon: '🎉' },
    { id: 'foodie', label: 'Foodie', icon: '🍜' },
  ];

  const PACE_OPTIONS = [
    { id: 'slow', label: 'Slow & Steady', emoji: '🐢', desc: 'Take it easy, no rush' },
    { id: 'balanced', label: 'Balanced', emoji: '⚖️ ', desc: 'Mix of active and chill' },
    { id: 'fast', label: 'Go Go Go!', emoji: '🚀', desc: 'See everything possible' },
  ];

  const GROUP_OPTIONS = [
    { id: 'close-knit', label: 'Close-Knit', emoji: '👯', desc: 'Small intimate groups' },
    { id: 'open', label: 'Open Groups', emoji: '🌍', desc: 'The more the merrier' },
  ];

  const PLANNING_OPTIONS = [
    { id: 'planner', label: 'Planner', emoji: '📋', desc: 'Every detail mapped out' },
    { id: 'spontaneous', label: 'Spontaneous', emoji: '🎲', desc: 'Go with the flow' },
    { id: 'flexible', label: 'Flexible', emoji: '🤸', desc: 'Basic plan, open to changes' },
  ];

  const PERSONALITY_OPTIONS = [
    { id: 'introvert', label: 'Introvert', emoji: '🌙', desc: 'Quiet time recharges me' },
    { id: 'extrovert', label: 'Extrovert', emoji: '☀️ ', desc: 'People energize me' },
    { id: 'ambivert', label: 'Ambivert', emoji: '🌗', desc: 'Best of both worlds' },
  ];

  const EXPERIENCE_OPTIONS = [
    { id: 'beginner', label: 'Beginner', emoji: '🌱', countries: '0-5 countries' },
    { id: 'intermediate', label: 'Intermediate', emoji: '🌿', countries: '5-15 countries' },
    { id: 'experienced', label: 'Experienced', emoji: '🌳', countries: '15-30 countries' },
    { id: 'expert', label: 'Expert', emoji: '🌍', countries: '30+ countries' },
  ];

  const TRAVEL_WITH_OPTIONS = [
    { id: 'everyone', label: 'Everyone', emoji: '🌍', desc: 'Open to all travelers' },
    { id: 'female', label: 'Women Only', emoji: '👩', desc: 'Female travelers only' },
    { id: 'male', label: 'Men Only', emoji: '👨', desc: 'Male travelers only' },
  ];

  type EditSection = 'styles' | 'pace' | 'group' | 'planning' | 'personality' | 'experience' | 'bio' | 'photos' | 'places' | 'languages' | 'basics' | 'travelwith' | 'bucketlist' | null;

  export default function ProfileScreen() {
    const router = useRouter();
    const profile = useUserProfileStore(s => s.profile);
    const setProfile = useUserProfileStore(s => s.setProfile);
    const updateProfile = useUserProfileStore(s => s.updateProfile);
    const clearUserProfile = useUserProfileStore(s => s.clearProfile);
    const isLoaded = useUserProfileStore(s => s.isLoaded);

    // Get clear functions from all stores
    const clearMatches = useMatchesStore(s => s.clearAll);
    const clearMessages = useMessagesStore(s => s.clearAll);
    const clearTrips = useTripsStore(s => s.clearAll);

    // Paywall on first profile tab visit
    const isPremium = usePremiumStore(s => s.isPremium);
    const hasSeenProfilePaywall = usePremiumStore(s => s.hasSeenProfilePaywall);
    const markProfilePaywallSeen = usePremiumStore(s => s.markProfilePaywallSeen);
    const [showProfilePaywall, setShowProfilePaywall] = useState(false);
    const [showFullProfile,    setShowFullProfile]    = useState(false);
    const [currentUserId,      setCurrentUserId]      = useState<string | null>(null);
    const [photoIndex,         setPhotoIndex]         = useState(0);
    const paywallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (!isPremium && !hasSeenProfilePaywall) {
        // Small delay so the profile screen renders first
        paywallTimerRef.current = setTimeout(() => {
          setShowProfilePaywall(true);
          markProfilePaywallSeen();
        }, 400);
      }
      return () => {
        if (paywallTimerRef.current) clearTimeout(paywallTimerRef.current);
      };
    }, []); // Only on mount

    useEffect(() => {
      // onAuthStateChange fires INITIAL_SESSION immediately from cached state (no network needed)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.id) setCurrentUserId(session.user.id);
      });
      return () => subscription.unsubscribe();
    }, []);

    const { data: tripsCount = 0 } = useQuery({
      queryKey: ['profile-trips-count', currentUserId],
      enabled: !!currentUserId,
      staleTime: 60_000,
      queryFn: async () => {
        const { count } = await supabase.from('trip_members').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId!);
        return count ?? 0;
      },
    });

    const { data: matchesCount = 0 } = useQuery({
      queryKey: ['profile-matches-count', currentUserId],
      enabled: !!currentUserId,
      staleTime: 60_000,
      queryFn: async () => {
        const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'accepted').or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);
        return count ?? 0;
      },
    });

    const { data: userTrips = [] } = useQuery({
      queryKey: ['profile-user-trips', currentUserId],
      enabled: !!currentUserId,
      staleTime: 60_000,
      queryFn: async () => {
        const { data } = await supabase.from('trip_members').select(`
          trip:trips!trip_id(
            id, destination, country, cover_image, start_date, end_date,
            is_flexible_dates, vibes, budget_level, max_group_size, description, creator_id,
            members:trip_members(id, user_id, user:users(id, name, profile_photo, age))
          )
        `).eq('user_id', currentUserId!).limit(12);
        return (data ?? []).map((r: any) => r.trip).filter(Boolean);
      },
    });

    const [editSection, setEditSection] = useState<EditSection>(null);
    const [tempBio, setTempBio] = useState('');
    const [tempStyles, setTempStyles] = useState<string[]>([]);
    const [tempPlaces, setTempPlaces] = useState<string[]>([]);
    const [tempLanguages, setTempLanguages] = useState<string[]>([]);
    const [newPlaceInput, setNewPlaceInput] = useState('');
    const [newLanguageInput, setNewLanguageInput] = useState('');
    const [tempName, setTempName] = useState('');
    const [tempAge, setTempAge] = useState('');
    const [tempCity, setTempCity] = useState('');
    const [tempCountry, setTempCountry] = useState('');
    const [tempBucketList, setTempBucketList] = useState<string[]>([]);
    const [newBucketInput, setNewBucketInput] = useState('');

    // Photo preview state — local URI shown as preview before uploading
    const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isAddingTravelPhoto, setIsAddingTravelPhoto] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const insets = useSafeAreaInsets();
    const [showPhotoPreview, setShowPhotoPreview] = useState(false);
    const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

    // Load user profile from AsyncStorage if not in store
    useEffect(() => {
      const loadProfile = async () => {
        if (profile) return;

        try {
          // Try AsyncStorage first (fastest, works offline)
          const savedProfile = await AsyncStorage.getItem('userProfile');
          if (savedProfile) {
            const parsed = JSON.parse(savedProfile);
            // Convert old onboarding data to new profile format
            const userProfile: UserProfile = {
              name: parsed.name || 'Traveler',
              age: parsed.birthday ? calculateAge(new Date(parsed.birthday)) : 25,
              profilePhotos: parsed.profilePhotos || [],
              country: parsed.country || '',
              city: parsed.city || '',
              gender: parsed.gender || null,
              bio: parsed.bio || '',
              travelWith: parsed.travelWith || null,
              socialEnergy: parsed.socialEnergy || null,
              travelStyles: parsed.travelStyles || [],
              travelPace: parsed.travelPace || null,
              groupType: parsed.groupType || null,
              planningStyle: parsed.planningStyle || null,
              experience: parsed.experience || null,
              placesVisited: parsed.placesVisited || [],
              bucketList: parsed.bucketList || [],
              languages: parsed.languages || [],
              verified: parsed.verified || false,
              zodiac: parsed.zodiac || null,
              mbti: parsed.mbti || null,
              travelQuote: parsed.travelQuote || null,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            setProfile(userProfile);
            return;
          }

          // Fallback: load from Supabase for returning users who logged in fresh
          // (no AsyncStorage data yet on this device/session)
          const userId = await getCurrentUserId();
          if (userId) {
            const { data: dbUser, error } = await supabase
              .from('users')
              .select('name, age, bio, country, city, gender, travel_with, social_energy, travel_styles, travel_pace, group_type, planning_style, experience_level, places_visited, languages, profile_photo, photos, is_verified')
              .eq('id', userId)
              .single();

            if (!error && dbUser) {
              const userProfile: UserProfile = {
                name: dbUser.name || 'Traveler',
                age: dbUser.age ?? 25,
                profilePhotos: Array.isArray(dbUser.photos) && dbUser.photos.length > 0
                  ? dbUser.photos
                  : dbUser.profile_photo ? [dbUser.profile_photo] : [],
                country: dbUser.country || '',
                city: dbUser.city || '',
                gender: (dbUser.gender as UserProfile['gender']) || null,
                bio: dbUser.bio || '',
                travelWith: (dbUser.travel_with as UserProfile['travelWith']) || null,
                socialEnergy: (dbUser.social_energy as UserProfile['socialEnergy']) || null,
                travelStyles: Array.isArray(dbUser.travel_styles) ? dbUser.travel_styles : [],
                travelPace: (dbUser.travel_pace as UserProfile['travelPace']) || null,
                groupType: (dbUser.group_type as UserProfile['groupType']) || null,
                planningStyle: (dbUser.planning_style as UserProfile['planningStyle']) || null,
                experience: (dbUser.experience_level as UserProfile['experience']) || null,
                placesVisited: Array.isArray(dbUser.places_visited) ? dbUser.places_visited : [],
                bucketList: [],
                languages: Array.isArray(dbUser.languages) ? dbUser.languages : [],
                verified: dbUser.is_verified || false,
                zodiac: null,
                mbti: null,
                travelQuote: null,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              setProfile(userProfile);
              // Cache to AsyncStorage so next load is instant
              await AsyncStorage.setItem('userProfile', JSON.stringify({
                ...userProfile,
                birthday: null,
              }));
            }
          }
        } catch (error) {
          console.log('Error loading profile:', error);
        }
      };

      loadProfile();
    }, [profile, setProfile]);

    const calculateAge = (birthday: Date): number => {
      const today = new Date();
      let age = today.getFullYear() - birthday.getFullYear();
      const monthDiff = today.getMonth() - birthday.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
        age--;
      }
      return age;
    };

    const handleLogout = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowLogoutConfirm(true);
    };

    const confirmLogout = async () => {
      setShowLogoutConfirm(false);
      try {
        await AsyncStorage.removeItem('hasSeenOnboarding');
        await AsyncStorage.removeItem('userProfile');
        clearUserProfile();
        clearMatches();
        clearMessages();
        clearTrips();
        await signOut();
      } catch (error) {
        console.log('Logout error:', error);
      }
    };

    const saveToSupabase = async (updates: Record<string, unknown>) => {
      if (!currentUserId) return;
      try { await supabase.from('users').update(updates).eq('id', currentUserId); } catch (e) { console.log('Supabase save error:', e); }
    };

    const openEditSection = (section: EditSection) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (section === 'bio') setTempBio(profile?.bio || '');
      if (section === 'styles') setTempStyles(profile?.travelStyles || []);
      if (section === 'places') { setTempPlaces(profile?.placesVisited || []); setNewPlaceInput(''); }
      if (section === 'languages') { setTempLanguages(profile?.languages || []); setNewLanguageInput(''); }
      if (section === 'basics') {
        setTempName(profile?.name || '');
        setTempAge(String(profile?.age ?? ''));
        setTempCity(profile?.city || '');
        setTempCountry(profile?.country || '');
      }
      if (section === 'bucketlist') { setTempBucketList(profile?.bucketList || []); setNewBucketInput(''); }
      setEditSection(section);
    };

    const selectTravelWith = (value: UserProfile['travelWith']) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateProfile({ travelWith: value });
      saveToSupabase({ travel_with: value });
      setEditSection(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const saveBucketList = () => {
      updateProfile({ bucketList: tempBucketList });
      saveToSupabase({ bucket_list: tempBucketList });
      setEditSection(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const getTravelWithLabel = (value: UserProfile['travelWith']) => {
      const opt = TRAVEL_WITH_OPTIONS.find(o => o.id === value);
      return opt ? `${opt.emoji} ${opt.label}` : 'Not set';
    };

    const saveBasics = () => {
      const updates = {
        name: tempName.trim() || profile?.name || 'Traveler',
        age: parseInt(tempAge) || profile?.age || 25,
        city: tempCity.trim(),
        country: tempCountry.trim(),
      };
      updateProfile(updates);
      saveToSupabase({ name: updates.name, age: updates.age, city: updates.city, country: updates.country });
      setEditSection(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const saveBio = () => {
      updateProfile({ bio: tempBio });
      saveToSupabase({ bio: tempBio });
      setEditSection(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const saveStyles = () => {
      updateProfile({ travelStyles: tempStyles });
      saveToSupabase({ travel_styles: tempStyles });
      setEditSection(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const toggleStyle = (styleId: string) => {
      Haptics.selectionAsync();
      setTempStyles(prev =>
        prev.includes(styleId)
          ? prev.filter(s => s !== styleId)
          : [...prev, styleId]
      );
    };

    const savePlaces = () => {
      updateProfile({ placesVisited: tempPlaces });
      saveToSupabase({ places_visited: tempPlaces });
      setEditSection(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const saveLanguages = () => {
      updateProfile({ languages: tempLanguages });
      saveToSupabase({ languages: tempLanguages });
      setEditSection(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const addPlace = () => {
      const trimmed = newPlaceInput.trim();
      if (trimmed && !tempPlaces.includes(trimmed)) {
        setTempPlaces(prev => [...prev, trimmed]);
      }
      setNewPlaceInput('');
    };

    const removePlace = (place: string) => {
      Haptics.selectionAsync();
      setTempPlaces(prev => prev.filter(p => p !== place));
    };

    const addLanguage = () => {
      const trimmed = newLanguageInput.trim();
      if (trimmed && !tempLanguages.includes(trimmed)) {
        setTempLanguages(prev => [...prev, trimmed]);
      }
      setNewLanguageInput('');
    };

    const removeLanguage = (lang: string) => {
      Haptics.selectionAsync();
      setTempLanguages(prev => prev.filter(l => l !== lang));
    };

    const selectPace = (pace: UserProfile['travelPace']) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateProfile({ travelPace: pace });
      saveToSupabase({ travel_pace: pace });
      setEditSection(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const selectGroup = (group: UserProfile['groupType']) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateProfile({ groupType: group });
      saveToSupabase({ group_type: group });
      setEditSection(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const selectPlanning = (planning: UserProfile['planningStyle']) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateProfile({ planningStyle: planning });
      saveToSupabase({ planning_style: planning });
      setEditSection(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const selectPersonality = (personality: UserProfile['socialEnergy']) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateProfile({ socialEnergy: personality });
      saveToSupabase({ social_energy: personality });
      setEditSection(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const selectExperience = (exp: UserProfile['experience']) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateProfile({ experience: exp });
      saveToSupabase({ experience_level: exp });
      setEditSection(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // Step 1: Pick photo from library — shows preview only, does NOT upload yet
    const pickProfilePhoto = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPendingPhoto(result.assets[0].uri);
      }
    };

    // Step 2: User taps Save — upload the pending photo and persist to DB
    const confirmPhotoUpload = async () => {
      if (!pendingPhoto) return;

      const userId = await getCurrentUserId();
      if (!userId) {
        Alert.alert('Not signed in', 'Please sign in to update your photo.');
        return;
      }

      setIsUploadingPhoto(true);
      try {
        const { mimeType, ext } = getImageMeta(pendingPhoto);
        // Always use userId + timestamp for filename — prevents duplicate filename
        // crash on iOS where asset.fileName is often the same across picks
        const filename = `avatar-${userId}-${Date.now()}.${ext}`;
        const uploaded = await uploadFile(pendingPhoto, filename, mimeType);
        const url = uploaded.url;

        const currentPhotos = profile?.profilePhotos || [];
        const updatedPhotos = [url, ...currentPhotos.slice(1)];
        updateProfile({ profilePhotos: updatedPhotos });
        await savePhotoUrlsToDatabase(userId, updatedPhotos);

        setPendingPhoto(null);
        setEditSection(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: any) {
        console.error('Failed to upload photo:', err);
        Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
      } finally {
        setIsUploadingPhoto(false);
      }
    };

    // Cancel pending photo — discard preview, go back to current photo
    const cancelPendingPhoto = () => {
      setPendingPhoto(null);
    };

    // Add a new travel photo (appended after the main photo)
    const addTravelPhoto = async () => {
      if ((profile?.profilePhotos.length ?? 0) >= 6) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      const userId = await getCurrentUserId();
      if (!userId) return;
      setIsAddingTravelPhoto(true);
      try {
        const { mimeType, ext } = getImageMeta(result.assets[0].uri);
        const filename = `travel-${userId}-${Date.now()}.${ext}`;
        const uploaded = await uploadFile(result.assets[0].uri, filename, mimeType);
        const updatedPhotos = [...(profile?.profilePhotos ?? []), uploaded.url];
        updateProfile({ profilePhotos: updatedPhotos });
        await savePhotoUrlsToDatabase(userId, updatedPhotos);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        console.error('Failed to upload travel photo:', err);
      } finally {
        setIsAddingTravelPhoto(false);
      }
    };

    // Remove a travel photo by URL
    const removeTravelPhoto = async (uri: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updatedPhotos = (profile?.profilePhotos ?? []).filter(p => p !== uri);
      updateProfile({ profilePhotos: updatedPhotos });
      const userId = await getCurrentUserId();
      if (userId) await savePhotoUrlsToDatabase(userId, updatedPhotos);
    };

    const getStyleLabel = (id: string) => {
      const style = TRAVEL_STYLES.find(s => s.id === id);
      return style ? `${style.icon} ${style.label}` : id;
    };

    const getPaceLabel = (pace: string | null) => {
      const option = PACE_OPTIONS.find(o => o.id === pace);
      return option ? `${option.emoji} ${option.label}` : 'Not set';
    };

    const getGroupLabel = (group: string | null) => {
      const option = GROUP_OPTIONS.find(o => o.id === group);
      return option ? `${option.emoji} ${option.label}` : 'Not set';
    };

    const getPlanningLabel = (planning: string | null) => {
      const option = PLANNING_OPTIONS.find(o => o.id === planning);
      return option ? `${option.emoji} ${option.label}` : 'Not set';
    };

    const getPersonalityLabel = (personality: string | null) => {
      const option = PERSONALITY_OPTIONS.find(o => o.id === personality);
      return option ? `${option.emoji} ${option.label}` : 'Not set';
    };

    const getExperienceLabel = (exp: string | null) => {
      const option = EXPERIENCE_OPTIONS.find(o => o.id === exp);
      return option ? `${option.emoji} ${option.label}` : 'Not set';
    };

    if (!profile) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18 }}>Loading profile...</Text>
        </View>
      );
    }

    const photos = pendingPhoto
      ? [pendingPhoto, ...profile.profilePhotos.slice(1)]
      : profile.profilePhotos.length > 0 ? profile.profilePhotos : [];

    const dnaChips = [
      profile.travelPace ? getPaceLabel(profile.travelPace) : null,
      profile.socialEnergy ? getPersonalityLabel(profile.socialEnergy) : null,
      profile.planningStyle ? getPlanningLabel(profile.planningStyle) : null,
    ].filter((v): v is string => !!v && v !== 'Not set');

    const allDnaEmpty = profile.travelStyles.length === 0 && dnaChips.length === 0;

    // Profile completeness
    const dnaFilledCount = [
      !!profile.travelWith,
      !!profile.socialEnergy,
      profile.travelStyles.length > 0,
      !!profile.travelPace,
      !!profile.planningStyle,
      !!profile.groupType,
      !!profile.experience,
      profile.bucketList.length > 0,
    ].filter(Boolean).length;
    const dnaTotal = 8;
    const dnaPct = dnaFilledCount / dnaTotal;

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>

        {/* Paywall */}
        <Modal visible={showProfilePaywall} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowProfilePaywall(false)}>
          <PremiumPaywall onClose={() => setShowProfilePaywall(false)} onSubscribe={() => setShowProfilePaywall(false)} />
        </Modal>

        {/* ── Hero ── */}
        <View style={{ height: 400 }}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            scrollEnabled={photos.length > 1}
            onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
            style={{ width, height: 400 }}
          >
            {photos.length > 0 ? photos.map((photo, i) => (
              <ExpoImage key={i} source={{ uri: photo }} style={{ width, height: 400 }} contentFit="cover" />
            )) : (
              <View style={{ width, height: 400, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={48} color="#444" strokeWidth={1.5} />
              </View>
            )}
          </ScrollView>

          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,1)']}
            locations={[0, 0.25, 0.65, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}
          />

          {/* Camera + Settings — top right */}
          <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} edges={['top']}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
              <Pressable onPress={() => openEditSection('photos')} style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 10 }}>
                <Camera size={20} color="#fff" strokeWidth={2} />
              </Pressable>
              <Pressable onPress={() => router.push('/settings')} style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 10 }}>
                <Settings size={20} color="#fff" strokeWidth={2} />
              </Pressable>
            </View>
          </SafeAreaView>

          {/* Photo dots */}
          {photos.length > 1 && (
            <View style={{ position: 'absolute', top: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5, pointerEvents: 'none' }}>
              {photos.map((_, i) => (
                <View key={i} style={{ width: i === photoIndex ? 22 : 6, height: 6, borderRadius: 3, backgroundColor: i === photoIndex ? '#F0EBE3' : 'rgba(255,255,255,0.35)' }} />
              ))}
            </View>
          )}

          {/* Name / location overlay — tap to edit */}
          <Pressable onPress={() => openEditSection('basics')} style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#fff', fontSize: 30, fontFamily: 'Outfit-Bold', letterSpacing: -0.5 }}>{profile.name}</Text>
              {!!profile.age && <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 24, fontFamily: 'Outfit-Light' }}>{profile.age}</Text>}
              {profile.verified && <BadgeCheck size={18} color="#F0EBE3" fill="rgba(240,235,227,0.15)" />}
              <Edit3 size={14} color="rgba(255,255,255,0.4)" strokeWidth={2} />
            </View>
            {(profile.city || profile.country) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                <MapPin size={12} color="rgba(255,255,255,0.45)" strokeWidth={2} />
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontFamily: 'Outfit-Regular' }}>
                  {[profile.city, profile.country].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Body ── */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* Stats row — matches public profile exactly */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
            {[
              { value: tripsCount, label: 'Trips' },
              { value: matchesCount, label: 'Matches' },
              { value: profile.placesVisited.length, label: 'Places' },
            ].map((stat, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 16, borderRightWidth: i < 2 ? 0.5 : 0, borderRightColor: 'rgba(255,255,255,0.08)' }}>
                <Text style={{ color: '#F0EBE3', fontSize: 22, fontFamily: 'Outfit-Bold' }}>{stat.value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, fontFamily: 'Outfit-Regular', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8 }}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={{ padding: 20, gap: 22 }}>

            {/* ── Complete Your Travel DNA — mini-onboarding ──────────── */}
            {(() => {
              const PROFILE_FIELDS = [
                { key: 'bio', label: 'Bio', section: 'bio' as const, icon: '✏️', desc: 'Tell your travel story' },
                { key: 'travelStyles', label: 'Travel Style', section: 'styles' as const, isArray: true, icon: '🎒', desc: 'How do you travel?' },
                { key: 'travelPace', label: 'Travel Pace', section: 'pace' as const, icon: '⚡', desc: 'Slow & steady or go go go?' },
                { key: 'socialEnergy', label: 'Social Energy', section: 'personality' as const, icon: '🌗', desc: 'Introvert, extrovert, or ambivert?' },
                { key: 'planningStyle', label: 'Planning Style', section: 'planning' as const, icon: '📋', desc: 'Planner or spontaneous?' },
                { key: 'experience', label: 'Experience', section: 'experience' as const, icon: '🌍', desc: 'How many countries?' },
                { key: 'languages', label: 'Languages', section: 'languages' as const, isArray: true, icon: '🗣️', desc: 'What do you speak?' },
                { key: 'placesVisited', label: 'Places Visited', section: 'places' as const, isArray: true, icon: '📍', desc: 'Where have you been?' },
                { key: 'gender', label: 'Gender', section: 'basics' as const, icon: '👤', desc: 'How do you identify?' },
                { key: 'travelWith', label: 'Travel Partner', section: 'basics' as const, icon: '🤝', desc: 'Who do you travel with?' },
              ] as const;
              const filled = PROFILE_FIELDS.filter(f => {
                const val = (profile as any)[f.key];
                if (!val) return false;
                if ('isArray' in f && f.isArray) return Array.isArray(val) && val.length > 0;
                return true;
              });
              const pct = Math.round((filled.length / PROFILE_FIELDS.length) * 100);
              if (pct >= 100) return null;
              const missing = PROFILE_FIELDS.filter(f => {
                const val = (profile as any)[f.key];
                if (!val) return true;
                if ('isArray' in f && f.isArray) return !Array.isArray(val) || val.length === 0;
                return false;
              });
              const nextField = missing[0];
              return (
                <View style={{
                  backgroundColor: '#000',
                  borderRadius: 24,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(240,235,227,0.1)',
                }}>
                  {/* Header with progress */}
                  <View style={{ padding: 20, paddingBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <View style={{
                        width: 44, height: 44, borderRadius: 22,
                        backgroundColor: 'rgba(240,235,227,0.09)',
                        borderWidth: 1.5,
                        borderColor: 'rgba(240,235,227,0.22)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 20 }}>✈️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', fontFamily: 'Outfit-ExtraBold', letterSpacing: -0.3 }}>
                          Complete your Travel DNA
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, fontFamily: 'Outfit-Regular', marginTop: 2 }}>
                          Better matches with a complete profile
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: 'rgba(240,235,227,0.1)',
                        borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
                        borderWidth: 1, borderColor: 'rgba(240,235,227,0.18)',
                      }}>
                        <Text style={{ color: '#F0EBE3', fontSize: 12, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>
                          {pct}%
                        </Text>
                      </View>
                    </View>
                    {/* Progress bar */}
                    <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                      <View style={{ height: 4, backgroundColor: '#F0EBE3', borderRadius: 999, width: `${pct}%` as any }} />
                    </View>
                  </View>

                  {/* Next step highlight — feels like onboarding */}
                  {nextField && (
                    <Pressable
                      onPress={() => openEditSection(nextField.section as any)}
                      style={{
                        marginHorizontal: 14,
                        marginBottom: 10,
                        backgroundColor: 'rgba(240,235,227,0.06)',
                        borderRadius: 18,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: 'rgba(240,235,227,0.15)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 14,
                      }}
                    >
                      <View style={{
                        width: 46, height: 46, borderRadius: 23,
                        backgroundColor: 'rgba(240,235,227,0.1)',
                        borderWidth: 1,
                        borderColor: 'rgba(240,235,227,0.2)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 20 }}>{nextField.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold', marginBottom: 2 }}>
                          Add {nextField.label}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>
                          {nextField.desc}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: '#F0EBE3',
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                      }}>
                        <Text style={{ color: '#000', fontSize: 12, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Add</Text>
                      </View>
                    </Pressable>
                  )}

                  {/* Remaining fields as small tappable rows */}
                  {missing.length > 1 && (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 16 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {missing.slice(1, 5).map(f => (
                          <Pressable
                            key={f.key}
                            onPress={() => openEditSection(f.section as any)}
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.04)',
                              borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
                              borderWidth: 1, borderColor: 'rgba(240,235,227,0.1)',
                              flexDirection: 'row', alignItems: 'center', gap: 6,
                            }}
                          >
                            <Text style={{ fontSize: 13 }}>{f.icon}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Outfit-SemiBold' }}>
                              {f.label}
                            </Text>
                          </Pressable>
                        ))}
                        {missing.length > 5 && (
                          <View style={{
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
                            borderWidth: 1, borderColor: 'rgba(240,235,227,0.08)',
                          }}>
                            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>
                              +{missing.length - 5} more
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Bio — tap to edit */}
            <Pressable onPress={() => openEditSection('bio')}>
              {profile.bio ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Text style={{ flex: 1, color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 23, fontFamily: 'Outfit-Regular' }}>{profile.bio}</Text>
                  <Edit3 size={14} color="rgba(255,255,255,0.25)" strokeWidth={2} style={{ marginTop: 3 }} />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                  <Edit3 size={14} color="rgba(255,255,255,0.2)" strokeWidth={1.5} />
                  <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 14, fontFamily: 'Outfit-Regular', fontStyle: 'italic' }}>Add a bio — tell your story...</Text>
                </View>
              )}
            </Pressable>

            {/* Travel Photos */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Outfit-SemiBold', letterSpacing: 1.4, textTransform: 'uppercase' }}>Travel Photos</Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'Outfit-SemiBold' }}>{profile.profilePhotos.length}/10</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                {profile.profilePhotos.map((photo, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Pressable onPress={() => { setPreviewPhotoIndex(i); setShowPhotoPreview(true); }}>
                      <ExpoImage
                        source={{ uri: photo }}
                        style={{ width: 108, height: 144, borderRadius: 14, borderWidth: i === 0 ? 1.5 : 0, borderColor: 'rgba(240,235,227,0.25)' }}
                        contentFit="cover"
                      />
                      {i === 0 && (
                        <View style={{ position: 'absolute', bottom: 7, left: 7, backgroundColor: 'rgba(240,235,227,0.15)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 0.5, borderColor: 'rgba(240,235,227,0.3)' }}>
                          <Text style={{ color: '#F0EBE3', fontSize: 9, fontFamily: 'Outfit-SemiBold', letterSpacing: 0.5 }}>MAIN</Text>
                        </View>
                      )}
                    </Pressable>
                    {(i > 0 || profile.profilePhotos.length > 1) && (
                      <Pressable
                        onPress={() => removeTravelPhoto(photo)}
                        style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 14, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' }}
                      >
                        <X size={11} color="#fff" strokeWidth={2.5} />
                      </Pressable>
                    )}
                  </View>
                ))}
                {profile.profilePhotos.length < 10 && (
                  <Pressable
                    onPress={addTravelPhoto}
                    disabled={isAddingTravelPhoto}
                    style={{ width: 108, height: 144, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(240,235,227,0.1)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(240,235,227,0.02)' }}
                  >
                    {isAddingTravelPhoto ? (
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>Uploading...</Text>
                    ) : (
                      <>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(240,235,227,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={18} color="rgba(240,235,227,0.4)" strokeWidth={2} />
                        </View>
                        <Text style={{ color: 'rgba(240,235,227,0.3)', fontSize: 11, fontFamily: 'Outfit-SemiBold', letterSpacing: 0.3 }}>Add photo</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </ScrollView>
            </View>

            {/* Travel DNA — chip display, each chip tappable */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Outfit-SemiBold', letterSpacing: 1.4, textTransform: 'uppercase' }}>Travel DNA</Text>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>{dnaFilledCount}/{dnaTotal}</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {profile.travelStyles.map((s) => (
                  <Pressable key={s} onPress={() => openEditSection('styles')} style={{ backgroundColor: 'rgba(240,235,227,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: '#F0EBE3', fontSize: 13, fontFamily: 'Outfit-SemiBold' }}>{getStyleLabel(s)}</Text>
                  </Pressable>
                ))}
                {profile.travelPace && (
                  <Pressable onPress={() => openEditSection('pace')} style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Outfit-SemiBold' }}>{getPaceLabel(profile.travelPace)}</Text>
                  </Pressable>
                )}
                {profile.socialEnergy && (
                  <Pressable onPress={() => openEditSection('personality')} style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Outfit-SemiBold' }}>{getPersonalityLabel(profile.socialEnergy)}</Text>
                  </Pressable>
                )}
                {profile.planningStyle && (
                  <Pressable onPress={() => openEditSection('planning')} style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Outfit-SemiBold' }}>{getPlanningLabel(profile.planningStyle)}</Text>
                  </Pressable>
                )}
                {profile.groupType && (
                  <Pressable onPress={() => openEditSection('group')} style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Outfit-SemiBold' }}>{getGroupLabel(profile.groupType)}</Text>
                  </Pressable>
                )}
                {profile.experience && (
                  <Pressable onPress={() => openEditSection('experience')} style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Outfit-SemiBold' }}>{getExperienceLabel(profile.experience)}</Text>
                  </Pressable>
                )}
                {profile.travelWith && (
                  <Pressable onPress={() => openEditSection('travelwith')} style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Outfit-SemiBold' }}>{getTravelWithLabel(profile.travelWith)}</Text>
                  </Pressable>
                )}
                {profile.travelStyles.length === 0 && !profile.travelPace && !profile.socialEnergy && !profile.planningStyle && !profile.groupType && !profile.experience && !profile.travelWith && (
                  <Pressable onPress={() => openEditSection('styles')} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 13, fontFamily: 'Outfit-Regular', fontStyle: 'italic' }}>Add your travel DNA...</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Been To — tap to edit */}
            <Pressable onPress={() => openEditSection('places')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Globe size={12} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Outfit-SemiBold', letterSpacing: 1.4, textTransform: 'uppercase' }}>Been To</Text>
              </View>
              {profile.placesVisited.length === 0 ? (
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, fontFamily: 'Outfit-Regular', fontStyle: 'italic' }}>Tap to add places you've visited</Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                  {profile.placesVisited.slice(0, 14).map((place, i) => (
                    <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.48)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>🌍 {place}</Text>
                    </View>
                  ))}
                  {profile.placesVisited.length > 14 && (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>+{profile.placesVisited.length - 14} more</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>

            {/* Bucket List — tap to edit */}
            <Pressable onPress={() => openEditSection('bucketlist')}>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Outfit-SemiBold', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>Bucket List</Text>
              {profile.bucketList.length === 0 ? (
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, fontFamily: 'Outfit-Regular', fontStyle: 'italic' }}>Add destinations you dream of visiting...</Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                  {profile.bucketList.slice(0, 8).map((place, i) => (
                    <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.48)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>✈️ {place}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>

            {/* Languages — tap to edit */}
            <Pressable onPress={() => openEditSection('languages')}>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Outfit-SemiBold', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>Languages</Text>
              {profile.languages.length === 0 ? (
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, fontFamily: 'Outfit-Regular', fontStyle: 'italic' }}>Tap to add languages you speak</Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                  {profile.languages.map((lang, i) => (
                    <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.52)', fontSize: 13, fontFamily: 'Outfit-Regular' }}>{lang}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>

            {/* Adventures — read only */}
            {userTrips.length > 0 && (
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Outfit-SemiBold', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>Adventures</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                  {userTrips.map((trip: any, i: number) => (
                    <Pressable key={i} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedTripId(trip.id); }} style={{ width: 110, height: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: '#111', justifyContent: 'flex-end' }}>
                      {trip.cover_image && <ExpoImage source={{ uri: trip.cover_image }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />}
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} locations={[0.4, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                      <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Outfit-Bold', padding: 10, letterSpacing: -0.2 }} numberOfLines={2}>{trip.destination}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Log Out */}
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' }}>
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 15,
                  borderRadius: 16,
                  backgroundColor: pressed ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)',
                  borderWidth: 0.5,
                  borderColor: 'rgba(239,68,68,0.2)',
                  gap: 8,
                })}
              >
                <LogOut size={16} color="rgba(239,68,68,0.75)" strokeWidth={2} />
                <Text style={{ color: 'rgba(239,68,68,0.75)', fontSize: 14, fontFamily: 'Outfit-SemiBold', letterSpacing: 0.2 }}>Log Out</Text>
              </Pressable>
            </View>

          </View>
        </ScrollView>

        {/* Full-Screen Photo Preview Modal */}
        <Modal visible={showPhotoPreview} animationType="fade" onRequestClose={() => setShowPhotoPreview(false)}>
          <View style={{ flex: 1, backgroundColor: '#000', paddingTop: 54 }}>
            {/* X button row */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 8 }}>
              <Pressable
                onPress={() => setShowPhotoPreview(false)}
                style={{ backgroundColor: '#ffffff', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} color="#000" strokeWidth={2.5} />
              </Pressable>
            </View>
            {/* Photos */}
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: previewPhotoIndex * width, y: 0 }}
              onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                setPreviewPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width));
              }}
              style={{ flex: 1 }}
            >
              {photos.map((photo, i) => (
                <ExpoImage key={i} source={{ uri: photo }} style={{ width, flex: 1 }} contentFit="contain" />
              ))}
            </ScrollView>
            {/* Dots */}
            {photos.length > 1 && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 20 }}>
                {photos.map((_, i) => (
                  <View key={i} style={{ width: i === previewPhotoIndex ? 22 : 6, height: 6, borderRadius: 3, backgroundColor: i === previewPhotoIndex ? '#F0EBE3' : 'rgba(255,255,255,0.35)' }} />
                ))}
              </View>
            )}
          </View>
        </Modal>

        {/* Trip Detail Sheet */}
        {(() => {
          const selectedTrip = userTrips.find((t: any) => t.id === selectedTripId) ?? null;
          return (
            <TripDetailSheet
              trip={selectedTrip ? {
                destination: selectedTrip.destination,
                country: selectedTrip.country,
                cover_image: selectedTrip.cover_image,
                start_date: selectedTrip.start_date,
                end_date: selectedTrip.end_date,
                is_flexible_dates: selectedTrip.is_flexible_dates,
                vibes: selectedTrip.vibes ?? [],
                budget_level: selectedTrip.budget_level,
                max_group_size: selectedTrip.max_group_size,
                description: selectedTrip.description,
                members: (selectedTrip.members ?? []).map((m: any) => ({
                  id: m.id,
                  name: m.user?.name ?? 'Traveler',
                  photo: m.user?.profile_photo ?? null,
                  age: m.user?.age ?? null,
                  isCreator: m.user_id === selectedTrip.creator_id,
                })),
              } : null}
              visible={!!selectedTripId}
              onClose={() => setSelectedTripId(null)}
            />
          );
        })()}

        {/* Logout Confirmation Modal */}
        <Modal visible={showLogoutConfirm} transparent animationType="fade" onRequestClose={() => setShowLogoutConfirm(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', paddingHorizontal: 32 }}>
            <View style={{ backgroundColor: '#111', borderRadius: 24, paddingHorizontal: 28, paddingTop: 40, paddingBottom: 32, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }}>

              {/* Icon */}
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(239,68,68,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <LogOut size={34} color="#ef4444" strokeWidth={1.8} />
              </View>

              {/* Title */}
              <Text style={{ color: '#fff', fontSize: 22, fontFamily: 'Outfit-Bold', marginBottom: 10 }}>
                Log Out
              </Text>

              {/* Subtitle */}
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, fontFamily: 'Outfit-Regular', textAlign: 'center', lineHeight: 23, marginBottom: 32 }}>
                Are you sure you want to log out of your account?
              </Text>

              {/* Yes, Log Out — full width red */}
              <Pressable
                onPress={confirmLogout}
                style={({ pressed }) => ({
                  width: '100%',
                  backgroundColor: pressed ? '#c0392b' : '#e53935',
                  borderRadius: 14,
                  paddingVertical: 18,
                  alignItems: 'center',
                  marginBottom: 24,
                })}
              >
                <Text style={{ color: '#fff', fontSize: 17, fontFamily: 'Outfit-Bold', letterSpacing: 0.2 }}>Yes, Log Out</Text>
              </Pressable>

              {/* Divider */}
              <View style={{ width: '100%', height: 0.5, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 24 }} />

              {/* Cancel — plain text, clearly distinct */}
              <Pressable onPress={() => setShowLogoutConfirm(false)} hitSlop={16}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, fontFamily: 'Outfit-SemiBold' }}>Cancel</Text>
              </Pressable>

            </View>
          </View>
        </Modal>

        {/* Edit Modals */}
        {/* Bio Edit Modal */}
        <Modal
          visible={editSection === 'bio'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => setEditSection(null)} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Edit Bio</Text>
                <Pressable onPress={saveBio} style={{ width: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Check size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
              </View>
              <View style={{ flex: 1, padding: 20 }}>
                <TextInput
                  value={tempBio}
                  onChangeText={setTempBio}
                  placeholder="Tell others about yourself, your travel experiences, and what you're looking for..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  style={{ color: '#fff', fontSize: 16, lineHeight: 24, minHeight: 200, fontFamily: 'Outfit-Regular' }}
                  autoFocus
                />
              </View>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Travel Styles Edit Modal */}
        <Modal
          visible={editSection === 'styles'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => setEditSection(null)} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Travel Styles</Text>
                <Pressable onPress={saveStyles} style={{ width: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Check size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 20, fontFamily: 'Outfit-Regular' }}>Select all that apply to your travel style</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {TRAVEL_STYLES.map((style) => {
                    const selected = tempStyles.includes(style.id);
                    return (
                      <Pressable
                        key={style.id}
                        onPress={() => toggleStyle(style.id)}
                        style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, marginRight: 10, marginBottom: 10, backgroundColor: selected ? '#fff' : '#1C1C1E' }}
                      >
                        <Text style={{ fontSize: 16, color: selected ? '#000' : 'rgba(255,255,255,0.8)', fontFamily: 'Outfit-SemiBold' }}>
                          {style.icon} {style.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Pace Edit Modal */}
        <Modal
          visible={editSection === 'pace'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => setEditSection(null)} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Daily Pace</Text>
                <View style={{ width: 44 }} />
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 20, fontFamily: 'Outfit-Regular' }}>How do you like to pace your travels?</Text>
                {PACE_OPTIONS.map((option) => {
                  const selected = profile.travelPace === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => selectPace(option.id as UserProfile['travelPace'])}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: selected ? '#fff' : '#1C1C1E', borderRadius: 16, padding: 16, marginBottom: 10 }}
                    >
                      <Text style={{ fontSize: 26, marginRight: 14 }}>{option.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: selected ? '#000' : '#fff', fontSize: 17, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>{option.label}</Text>
                        <Text style={{ color: selected ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 2, fontFamily: 'Outfit-Regular' }}>{option.desc}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Group Edit Modal */}
        <Modal
          visible={editSection === 'group'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => setEditSection(null)} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Group Preference</Text>
                <View style={{ width: 44 }} />
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 20, fontFamily: 'Outfit-Regular' }}>What size groups do you prefer?</Text>
                {GROUP_OPTIONS.map((option) => {
                  const selected = profile.groupType === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => selectGroup(option.id as UserProfile['groupType'])}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: selected ? '#fff' : '#1C1C1E', borderRadius: 16, padding: 16, marginBottom: 10 }}
                    >
                      <Text style={{ fontSize: 26, marginRight: 14 }}>{option.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: selected ? '#000' : '#fff', fontSize: 17, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>{option.label}</Text>
                        <Text style={{ color: selected ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 2, fontFamily: 'Outfit-Regular' }}>{option.desc}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Planning Edit Modal */}
        <Modal
          visible={editSection === 'planning'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => setEditSection(null)} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Planning Style</Text>
                <View style={{ width: 44 }} />
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 20, fontFamily: 'Outfit-Regular' }}>How do you approach trip planning?</Text>
                {PLANNING_OPTIONS.map((option) => {
                  const selected = profile.planningStyle === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => selectPlanning(option.id as UserProfile['planningStyle'])}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: selected ? '#fff' : '#1C1C1E', borderRadius: 16, padding: 16, marginBottom: 10 }}
                    >
                      <Text style={{ fontSize: 26, marginRight: 14 }}>{option.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: selected ? '#000' : '#fff', fontSize: 17, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>{option.label}</Text>
                        <Text style={{ color: selected ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 2, fontFamily: 'Outfit-Regular' }}>{option.desc}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Personality Edit Modal */}
        <Modal
          visible={editSection === 'personality'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => setEditSection(null)} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Personality</Text>
                <View style={{ width: 44 }} />
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 20, fontFamily: 'Outfit-Regular' }}>What's your social energy like?</Text>
                {PERSONALITY_OPTIONS.map((option) => {
                  const selected = profile.socialEnergy === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => selectPersonality(option.id as UserProfile['socialEnergy'])}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: selected ? '#fff' : '#1C1C1E', borderRadius: 16, padding: 16, marginBottom: 10 }}
                    >
                      <Text style={{ fontSize: 26, marginRight: 14 }}>{option.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: selected ? '#000' : '#fff', fontSize: 17, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>{option.label}</Text>
                        <Text style={{ color: selected ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 2, fontFamily: 'Outfit-Regular' }}>{option.desc}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Experience Edit Modal */}
        <Modal
          visible={editSection === 'experience'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => setEditSection(null)} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Experience Level</Text>
                <View style={{ width: 44 }} />
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 20, fontFamily: 'Outfit-Regular' }}>How experienced are you as a traveler?</Text>
                {EXPERIENCE_OPTIONS.map((option) => {
                  const selected = profile.experience === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => selectExperience(option.id as UserProfile['experience'])}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: selected ? '#fff' : '#1C1C1E', borderRadius: 16, padding: 16, marginBottom: 10 }}
                    >
                      <Text style={{ fontSize: 26, marginRight: 14 }}>{option.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: selected ? '#000' : '#fff', fontSize: 17, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>{option.label}</Text>
                        <Text style={{ color: selected ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 2, fontFamily: 'Outfit-Regular' }}>{option.countries}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Places Visited Edit Modal */}
        <Modal
          visible={editSection === 'places'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => setEditSection(null)} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Been To</Text>
                <Pressable onPress={savePlaces} style={{ width: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Check size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 20, fontFamily: 'Outfit-Regular' }}>Add countries and cities you've visited</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 16 }}>
                  <TextInput
                    value={newPlaceInput}
                    onChangeText={setNewPlaceInput}
                    placeholder="e.g. Japan, Bali, Paris..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{ flex: 1, color: '#fff', fontSize: 16, paddingVertical: 12, fontFamily: 'Outfit-Regular' }}
                    onSubmitEditing={addPlace}
                    returnKeyType="done"
                    autoFocus
                  />
                  <Pressable onPress={addPlace} style={{ backgroundColor: '#fff', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
                    <Plus size={18} color="#000" strokeWidth={2.5} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {tempPlaces.map((place, i) => (
                    <Pressable
                      key={i}
                      onPress={() => removePlace(place)}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.8)', marginRight: 6, fontSize: 14, fontFamily: 'Outfit-Regular' }}>{place}</Text>
                      <X size={12} color="rgba(255,255,255,0.45)" strokeWidth={2} />
                    </Pressable>
                  ))}
                </View>
                {tempPlaces.length === 0 && (
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, textAlign: 'center', marginTop: 24, fontFamily: 'Outfit-Regular' }}>No places added yet</Text>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Languages Edit Modal */}
        <Modal
          visible={editSection === 'languages'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => setEditSection(null)} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Languages</Text>
                <Pressable onPress={saveLanguages} style={{ width: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Check size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 20, fontFamily: 'Outfit-Regular' }}>Add languages you speak</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 16 }}>
                  <TextInput
                    value={newLanguageInput}
                    onChangeText={setNewLanguageInput}
                    placeholder="e.g. English, Spanish, French..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{ flex: 1, color: '#fff', fontSize: 16, paddingVertical: 12, fontFamily: 'Outfit-Regular' }}
                    onSubmitEditing={addLanguage}
                    returnKeyType="done"
                    autoFocus
                  />
                  <Pressable onPress={addLanguage} style={{ backgroundColor: '#fff', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
                    <Plus size={18} color="#000" strokeWidth={2.5} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {tempLanguages.map((lang, i) => (
                    <Pressable
                      key={i}
                      onPress={() => removeLanguage(lang)}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.8)', marginRight: 6, fontSize: 14, fontFamily: 'Outfit-Regular' }}>{lang}</Text>
                      <X size={12} color="rgba(255,255,255,0.45)" strokeWidth={2} />
                    </Pressable>
                  ))}
                </View>
                {tempLanguages.length === 0 && (
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, textAlign: 'center', marginTop: 24, fontFamily: 'Outfit-Regular' }}>No languages added yet</Text>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Travel With Modal */}
        <Modal
          visible={editSection === 'travelwith'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => setEditSection(null)} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Travel With</Text>
                <View style={{ width: 44 }} />
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 6, fontFamily: 'Outfit-Regular' }}>This is a hard filter — it directly affects who you match with.</Text>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: 24, fontFamily: 'Outfit-Regular' }}>Choose carefully. Selecting "Everyone" gives you the widest pool of matches.</Text>
                {TRAVEL_WITH_OPTIONS.map((option) => {
                  const selected = profile.travelWith === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => selectTravelWith(option.id as UserProfile['travelWith'])}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: selected ? '#fff' : '#1C1C1E', borderRadius: 16, padding: 16, marginBottom: 10 }}
                    >
                      <Text style={{ fontSize: 26, marginRight: 14 }}>{option.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: selected ? '#000' : '#fff', fontSize: 17, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>{option.label}</Text>
                        <Text style={{ color: selected ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 2, fontFamily: 'Outfit-Regular' }}>{option.desc}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Bucket List Modal */}
        <Modal
          visible={editSection === 'bucketlist'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => setEditSection(null)} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Bucket List</Text>
                <Pressable onPress={saveBucketList} style={{ width: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Check size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 4, fontFamily: 'Outfit-Regular' }}>Destinations you dream of visiting</Text>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: 20, fontFamily: 'Outfit-Regular' }}>This drives 30% of your match score — the most important field!</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 16 }}>
                  <TextInput
                    value={newBucketInput}
                    onChangeText={setNewBucketInput}
                    placeholder="e.g. Japan, Patagonia, Morocco..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{ flex: 1, color: '#fff', fontSize: 16, paddingVertical: 12, fontFamily: 'Outfit-Regular' }}
                    onSubmitEditing={() => {
                      const val = newBucketInput.trim();
                      if (val && !tempBucketList.includes(val)) setTempBucketList(prev => [...prev, val]);
                      setNewBucketInput('');
                    }}
                    returnKeyType="done"
                    autoFocus
                  />
                  <Pressable
                    onPress={() => {
                      const val = newBucketInput.trim();
                      if (val && !tempBucketList.includes(val)) { Haptics.selectionAsync(); setTempBucketList(prev => [...prev, val]); }
                      setNewBucketInput('');
                    }}
                    style={{ backgroundColor: '#fff', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
                  >
                    <Plus size={18} color="#000" strokeWidth={2.5} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {tempBucketList.map((place, i) => (
                    <Pressable
                      key={i}
                      onPress={() => { Haptics.selectionAsync(); setTempBucketList(prev => prev.filter(p => p !== place)); }}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.8)', marginRight: 6, fontSize: 14, fontFamily: 'Outfit-Regular' }}>🗺️ {place}</Text>
                      <X size={12} color="rgba(255,255,255,0.45)" strokeWidth={2} />
                    </Pressable>
                  ))}
                </View>
                {tempBucketList.length === 0 && (
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, textAlign: 'center', marginTop: 24, fontFamily: 'Outfit-Regular' }}>No destinations added yet</Text>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Basic Info Edit Modal */}
        <Modal
          visible={editSection === 'basics'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditSection(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => setEditSection(null)} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Basic Info</Text>
                <Pressable onPress={saveBasics} style={{ width: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Check size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, marginLeft: 4, fontFamily: 'Outfit-SemiBold' }}>NAME</Text>
                <TextInput
                  value={tempName}
                  onChangeText={setTempName}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{ backgroundColor: '#1C1C1E', color: '#fff', fontSize: 16, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20, fontFamily: 'Outfit-Regular' }}
                  autoCorrect={false}
                />

                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, marginLeft: 4, fontFamily: 'Outfit-SemiBold' }}>AGE</Text>
                <TextInput
                  value={tempAge}
                  onChangeText={setTempAge}
                  placeholder="Your age"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="number-pad"
                  style={{ backgroundColor: '#1C1C1E', color: '#fff', fontSize: 16, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20, fontFamily: 'Outfit-Regular' }}
                />

                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, marginLeft: 4, fontFamily: 'Outfit-SemiBold' }}>CITY</Text>
                <TextInput
                  value={tempCity}
                  onChangeText={setTempCity}
                  placeholder="Your city"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{ backgroundColor: '#1C1C1E', color: '#fff', fontSize: 16, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20, fontFamily: 'Outfit-Regular' }}
                  autoCorrect={false}
                />

                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, marginLeft: 4, fontFamily: 'Outfit-SemiBold' }}>COUNTRY</Text>
                <TextInput
                  value={tempCountry}
                  onChangeText={setTempCountry}
                  placeholder="Your country"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{ backgroundColor: '#1C1C1E', color: '#fff', fontSize: 16, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 28, fontFamily: 'Outfit-Regular' }}
                  autoCorrect={false}
                />

                <Pressable
                  onPress={saveBasics}
                  style={{ backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                >
                  <Text style={{ color: '#000', fontSize: 16, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Save Changes</Text>
                </Pressable>
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Photos Edit Modal */}
        <Modal
          visible={editSection === 'photos'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => { setEditSection(null); setPendingPhoto(null); }}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <Pressable onPress={() => { setEditSection(null); setPendingPhoto(null); }} style={{ width: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <X size={22} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>
                  {pendingPhoto ? 'Preview' : 'Edit Photo'}
                </Text>
                <View style={{ width: 44 }} />
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', marginBottom: 24, fontFamily: 'Outfit-Regular' }}>
                  {pendingPhoto
                    ? 'Looking good? Save to update your profile.'
                    : 'Tap your photo or the button below to replace it.'}
                </Text>
                <View style={{ alignItems: 'center', marginBottom: 32 }}>
                  <Pressable onPress={pendingPhoto ? undefined : pickProfilePhoto}>
                    {(pendingPhoto || profile.profilePhotos[0]) ? (
                      <Image
                        source={{ uri: pendingPhoto ?? profile.profilePhotos[0] }}
                        style={{ width: 200, height: 267, borderRadius: 16 }}
                      />
                    ) : (
                      <View style={{ width: 200, height: 267, borderRadius: 16, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' }}>
                        <Camera size={48} color="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                      </View>
                    )}
                    {!pendingPhoto && (
                      <View style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: '#fff', padding: 8, borderRadius: 20 }}>
                        <Camera size={18} color="#000" strokeWidth={2} />
                      </View>
                    )}
                  </Pressable>
                </View>

                {pendingPhoto ? (
                  // Save / Cancel buttons shown after picking a photo
                  <View style={{ gap: 12 }}>
                    <Pressable
                      onPress={confirmPhotoUpload}
                      disabled={isUploadingPhoto}
                      style={{ backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#000', fontSize: 16, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>
                        {isUploadingPhoto ? 'Saving...' : 'Save Photo'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={cancelPendingPhoto}
                      disabled={isUploadingPhoto}
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  // Default: button to pick a new photo
                  <Pressable
                    onPress={pickProfilePhoto}
                    style={{ backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#000', fontSize: 16, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Replace Photo</Text>
                  </Pressable>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
      </View>
    );
  }

