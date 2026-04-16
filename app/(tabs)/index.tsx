import { useState, useCallback, useEffect, useMemo, memo, useRef } from 'react';
import { Colors } from '../../lib/theme';
import { View, Text, Pressable, Dimensions, Image, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform, FlatList, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plane, Users, MapPin, Calendar, Languages, X, Heart, ChevronLeft, ChevronDown, Briefcase, MessageCircle, Check, HelpCircle, XCircle, Plus, Minus, Search, Clock, DollarSign, ChevronRight, RotateCcw, Send } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Easing,
  FadeInDown,
  Layout,
  FadeIn,
  FadeOut,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useMatchesStore, { MatchedTraveler } from '@/lib/state/matches-store';
import useTripsStore, { JoinedTrip } from '@/lib/state/trips-store';
import useMessagesStore from '@/lib/state/messages-store';
import useUserProfileStore from '@/lib/state/user-profile-store';
import usePremiumStore from '@/lib/state/premium-store';
import useSwipeLimitStore from '@/lib/state/swipe-limit-store';
import { PublicProfileData } from '@/components/PublicProfileView';
import UserProfileModal from '@/components/userprofilemodal';
import { calculateTripMatch, calculateTravelerMatch, getMatchColor } from '@/lib/matching';
import MatchAnimation from '@/components/MatchAnimation';
import TripJoinAnimation from '@/components/TripJoinAnimation';
import SwipeLimitGate from '@/components/SwipeLimitGate';
import PremiumPaywall from '@/components/PremiumPaywall';
import { useTrips as useSupabaseTrips, useCreateTrip, useJoinTrip } from '@/lib/hooks/useTrips';
import { useSwipeableUsers } from '@/lib/hooks/useUsers';
import { useSwipe as useSwipeRPC, useRealtimeNewMutualMatch } from '@/lib/hooks/useMatches';
import { useCreateDirectConversation } from '@/lib/hooks/useChat';
import { getCurrentUserId } from '@/lib/supabase';
import WhoIsGoing from '@/components/WhoIsGoing';
import TripMembersSection from '@/components/TripMembersSection';
import type { UserProfile } from '@/lib/database.types';
import CreateTripOnboarding from '@/components/CreateTripOnboarding';
import MyTripsModal from '@/components/MyTripsModal';
import MatchesModal from '@/components/MatchesModal';
import TripCreatedCelebration from '@/components/TripCreatedCelebration';


const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.35;

// ─── Layout constants ─────────────────────────────────────────────────────────
const CARD_HEIGHT = height * 0.62;       // Tinder-style — tall, dominant card
const CARD_RADIUS = 20;
const H_PAD      = 16;                   // Horizontal page padding

interface TripPersonMock {
  userId: string;
  name: string;
  age: number;
  image: string;
  photos: string[];
  country: string;
  city?: string;
  bio?: string;
  isHost: boolean;
  gender: 'male' | 'female' | 'other';
  travelStyles?: string[];
  placesVisited?: string[];
  bucketList?: string[];
  languages?: string[];
  availability?: string;
  travelPace?: string | null;
  socialEnergy?: string | null;
  planningStyle?: string | null;
  experience?: string | null;
}

interface TripMock {
  id: string;
  destination: string;
  country: string;
  image: string;
  dates: string;
  vibes: string[];
  peopleCount: number;
  people: TripPersonMock[];
  description: string;
  fullDescription: string;
  host: string;
  budget: string;
  accommodation: string;
  groupSize: string;
  dailyPace?: string;
  groupPreference?: string;
  maxPeople?: number;
  isUserCreated?: boolean;
  isAlreadyJoined?: boolean;
}

const COLORS = {
  deepCharcoal:      '#000000',
  charcoalLight:     '#0F0F0F',
  charcoalMid:       '#1A1A1A',
  forestGreen:       Colors.accent,
  forestGreenLight:  Colors.accent,
  forestGreenBright: Colors.accent,
  softWhite:         '#FFFFFF',
  stoneGray:         'rgba(255,255,255,0.55)',
  stoneDark:         'rgba(255,255,255,0.30)',
  warmRed:           '#FF453A',
  accentDim:         Colors.accentDim,
  accentBorder:      Colors.accentBorder,
  glass:             'rgba(255,255,255,0.09)',
  glassBorder:       'rgba(255,255,255,0.16)',
};

const DESTINATION_PHOTOS: Record<string, string[]> = {
  beach: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
    'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=800&q=80',
  ],
  mountain: [
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&q=80',
    'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&q=80',
  ],
  city: [
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80',
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
    'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80',
  ],
  nature: [
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
  ],
  adventure: [
    'https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=800&q=80',
    'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&q=80',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80',
    'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800&q=80',
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80',
  ],
};

const getPhotoSuggestions = (destination: string, vibes: string[]): string[] => {
  const destLower = destination.toLowerCase();
  const vibesLower = vibes.map(v => v.toLowerCase());

  if (destLower.includes('beach') || destLower.includes('island') || destLower.includes('bali') || destLower.includes('maldives') || destLower.includes('hawaii')) {
    return DESTINATION_PHOTOS.beach;
  }
  if (destLower.includes('mountain') || destLower.includes('alps') || destLower.includes('himalaya') || destLower.includes('colorado')) {
    return DESTINATION_PHOTOS.mountain;
  }
  if (destLower.includes('tokyo') || destLower.includes('paris') || destLower.includes('new york') || destLower.includes('london') || destLower.includes('barcelona')) {
    return DESTINATION_PHOTOS.city;
  }

  if (vibesLower.includes('beach')) return DESTINATION_PHOTOS.beach;
  if (vibesLower.includes('nature')) return DESTINATION_PHOTOS.nature;
  if (vibesLower.includes('adventure')) return DESTINATION_PHOTOS.adventure;

  return DESTINATION_PHOTOS.default;
};

type Mode = 'trips' | 'companions';

function SwipeTutorialOverlay({ step, onNext }: { step: number; onNext: () => void }) {
  const fingerX = useSharedValue(0);
  const fingerScale = useSharedValue(1);
  const trailOpacity = useSharedValue(0);
  const trailWidth = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const labelX = useSharedValue(0);

  useEffect(() => {
    fingerX.value = 0;
    fingerScale.value = 1;
    trailOpacity.value = 0;
    trailWidth.value = 0;
    labelOpacity.value = 0;
    labelX.value = 0;

    const targetX = step === 1 ? -110 : 110;
    const labelTarget = step === 1 ? -28 : 28;
    const slideDur = 770;
    const holdDur = 130;
    const pauseDur = 600;

    fingerX.value = withRepeat(
      withSequence(
        withTiming(targetX, { duration: slideDur, easing: Easing.out(Easing.cubic) }),
        withTiming(targetX, { duration: holdDur }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: pauseDur }),
      ),
      -1,
      false,
    );

    fingerScale.value = withRepeat(
      withSequence(
        withTiming(0.86, { duration: 80 }),
        withTiming(0.86, { duration: slideDur + holdDur - 80 }),
        withTiming(1, { duration: 0 }),
        withTiming(1, { duration: pauseDur }),
      ),
      -1,
      false,
    );

    trailWidth.value = withRepeat(
      withSequence(
        withTiming(110, { duration: slideDur, easing: Easing.out(Easing.cubic) }),
        withTiming(110, { duration: holdDur }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: pauseDur }),
      ),
      -1,
      false,
    );

    trailOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 120 }),
        withTiming(0.7, { duration: slideDur + holdDur - 120 }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: pauseDur }),
      ),
      -1,
      false,
    );

    labelOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 100 }),
        withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: slideDur + holdDur - 280 }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: pauseDur }),
      ),
      -1,
      false,
    );

    labelX.value = withRepeat(
      withSequence(
        withTiming(labelTarget, { duration: slideDur, easing: Easing.out(Easing.cubic) }),
        withTiming(labelTarget, { duration: holdDur }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: pauseDur }),
      ),
      -1,
      false,
    );
  }, [step]);

  const fingerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fingerX.value }, { scale: fingerScale.value }],
  }));

  const trailStyle = useAnimatedStyle(() => ({
    opacity: trailOpacity.value,
    width: trailWidth.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ translateX: labelX.value }],
  }));

  const isLeft = step === 1;
  const accentColor = isLeft ? '#e05c52' : '#3ecf7a';
  const accentColorDim = isLeft ? 'rgba(224,92,82,0.18)' : 'rgba(62,207,122,0.18)';

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(250)}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.88)',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 999,
      }}
    >
      <View style={{
        width: width * 0.85,
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 48,
      }}>
        <Animated.View style={[{
          position: 'absolute',
          height: 3,
          borderRadius: 2,
          backgroundColor: accentColor,
          ...(isLeft ? { right: '50%' as any } : { left: '50%' as any }),
        }, trailStyle]} />

        <Animated.View style={[{
          position: 'absolute',
          top: 24,
          backgroundColor: accentColorDim,
          borderWidth: 1.5,
          borderColor: accentColor,
          paddingHorizontal: 18,
          paddingVertical: 8,
          borderRadius: 14,
        }, labelStyle]}>
          <Text style={{ color: accentColor, fontSize: 16, fontWeight: '800', letterSpacing: 1.2 }}>
            {isLeft ? 'PASS' : 'JOIN'}
          </Text>
        </Animated.View>

        <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, fingerStyle]}>
          <View style={{
            position: 'absolute',
            width: 82, height: 82, borderRadius: 41,
            backgroundColor: accentColorDim,
          }} />
          <Text style={{ fontSize: 58, lineHeight: 72 }}>
            {isLeft ? '👈' : '👉'}
          </Text>
        </Animated.View>

        <View style={{
          position: 'absolute', bottom: 8,
          flexDirection: 'row', alignItems: 'center', gap: 5, opacity: 0.28,
        }}>
          {isLeft ? (
            <>
              <Text style={{ color: accentColor, fontSize: 14, fontWeight: '700' }}>←</Text>
              <Text style={{ color: '#fff', fontSize: 11 }}>swipe left</Text>
            </>
          ) : (
            <>
              <Text style={{ color: '#fff', fontSize: 11 }}>swipe right</Text>
              <Text style={{ color: accentColor, fontSize: 14, fontWeight: '700' }}>→</Text>
            </>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 22, gap: 6 }}>
        {[1, 2].map(i => (
          <View key={i} style={{
            width: i === step ? 22 : 6, height: 6, borderRadius: 3,
            backgroundColor: i === step ? accentColor : 'rgba(255,255,255,0.2)',
          }} />
        ))}
      </View>

      <Text style={{
        color: '#f5f5f0', fontSize: 24, fontWeight: '800',
        marginBottom: 10, letterSpacing: -0.4, textAlign: 'center',
      }}>
        {isLeft ? 'Swipe left to pass' : 'Swipe right to join'}
      </Text>

      <Text style={{
        color: 'rgba(255,255,255,0.5)', fontSize: 15,
        textAlign: 'center', paddingHorizontal: 44,
        marginBottom: 40, lineHeight: 23,
      }}>
        {isLeft
          ? 'Not your vibe? Swipe left to pass on a trip or traveler.'
          : 'Love it? Swipe right to request to join a trip or connect.'}
      </Text>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onNext();
        }}
        style={{
          backgroundColor: accentColorDim,
          paddingHorizontal: 52, paddingVertical: 17,
          borderRadius: 100, borderWidth: 1.5, borderColor: accentColor,
        }}
      >
        <Text style={{ color: accentColor, fontSize: 16, fontWeight: '700' }}>
          {isLeft ? 'Got it, next' : "Let's go"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function TagAlongScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('trips');
  const [tripIndex, setTripIndex] = useState(0);
  const [showTripDetail, setShowTripDetail] = useState(false);
  const [showTravelerDetail, setShowTravelerDetail] = useState(false);
  const [showMyTrips, setShowMyTrips] = useState(false);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showTripCreatedBanner, setShowTripCreatedBanner] = useState(false);
  const [createdTripDestination, setCreatedTripDestination] = useState('');
  const [createdTripCoverImage, setCreatedTripCoverImage] = useState<string>('');
  const [showTripSearch, setShowTripSearch] = useState(false);
  const [tripSearchQuery, setTripSearchQuery] = useState('');
  const [selectedPersonProfile, setSelectedPersonProfile] = useState<PublicProfileData | null>(null);
  const [showPersonProfile, setShowPersonProfile] = useState(false);

  const [showMatchAnimation, setShowMatchAnimation] = useState<boolean>(false);
  const [matchedTraveler, setMatchedTraveler] = useState<MatchedTraveler | null>(null);
  const [showTripJoinAnimation, setShowTripJoinAnimation] = useState<boolean>(false);
  const [joinedTripName, setJoinedTripName] = useState<string>('');
  const [joinedTripCover, setJoinedTripCover] = useState<string>('');
  const [joinedTripCrew, setJoinedTripCrew] = useState<string[]>([]);
  const shownMatchIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem('shownMatchIds').then(val => {
      if (val) {
        try {
          const ids: string[] = JSON.parse(val);
          ids.forEach(id => shownMatchIds.current.add(id));
        } catch {}
      }
    });
  }, []);

  const [showSwipeLimitGate, setShowSwipeLimitGate] = useState<boolean>(false);
  const [showPremiumPaywall, setShowPremiumPaywall] = useState<boolean>(false);

  const [showSwipeTutorial, setShowSwipeTutorial] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(1);

  const [showMatchesModal, setShowMatchesModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenSwipeTutorial').then(val => {
      if (val !== 'true') setShowSwipeTutorial(true);
    });
  }, []);

  const router = useRouter();

  const addToRequests = useMatchesStore(s => s.addToRequests);
  const checkIsAlreadyLiked = useMatchesStore(s => s.isAlreadyLiked);

  const isPremium = usePremiumStore(s => s.isPremium);

  const recordSwipe = useSwipeLimitStore(s => s.recordSwipe);
  const canSwipe = useSwipeLimitStore(s => s.canSwipe);
  const getSwipesRemaining = useSwipeLimitStore(s => s.getSwipesRemaining);
  const resetSwipesIfNeeded = useSwipeLimitStore(s => s.resetSwipesIfNeeded);
  const swipesRemaining = getSwipesRemaining();

  useEffect(() => {
    resetSwipesIfNeeded();
  }, [resetSwipesIfNeeded]);

  const joinedTrips = useTripsStore(s => s.joinedTrips);
  const joinedTripsIds = useMemo(() => new Set(joinedTrips.map(t => t.id)), [joinedTrips]);
  const joinTrip = useTripsStore(s => s.joinTrip);
  const updateTripStatus = useTripsStore(s => s.updateTripStatus);
  const setGroupChatId = useTripsStore(s => s.setGroupChatId);
  const createTrip = useTripsStore(s => s.createTrip);

  const { data: supabaseTrips = [], refetch: refetchTrips } = useSupabaseTrips();
  const createTripMutation = useCreateTrip();
  const joinTripMutation = useJoinTrip();
  const swipeRPCMutation = useSwipeRPC();
  const createDirectConversation = useCreateDirectConversation();

  const isAlreadyJoined = useCallback((tripId: string) => joinedTripsIds.has(tripId), [joinedTripsIds]);

  const createGroupChat = useMessagesStore(s => s.createGroupChat);
  const startChat = useMessagesStore(s => s.startChat);

  const userProfile = useUserProfileStore(s => s.profile);
  const userAge = userProfile?.age ?? 25;
  const userCountry = userProfile?.country ?? 'Unknown';
  const userGender = userProfile?.gender ?? 'other';
  const userPhoto = userProfile?.profilePhotos?.[0] ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    getCurrentUserId().then(setCurrentUserId);
  }, []);

  const handleRealtimeMutualMatch = useCallback((matchedUser: import('@/lib/database.types').UserProfile, matchId: string) => {
    if (shownMatchIds.current.has(matchId)) return;

    const photo = (matchedUser.photos && matchedUser.photos.length > 0 ? matchedUser.photos[0] : matchedUser.profile_photo) ?? '';
    const travelerObj: import('@/lib/state/matches-store').MatchedTraveler = {
      id: matchedUser.id,
      name: matchedUser.name,
      age: matchedUser.age ?? 25,
      image: photo,
      photos: matchedUser.photos ?? [],
      country: matchedUser.country ?? '',
      city: matchedUser.city ?? '',
      travelStyles: (matchedUser.travel_styles ?? []) as string[],
      vibes: [],
      destinations: matchedUser.bucket_list ?? [],
      bio: matchedUser.bio ?? '',
      fullBio: matchedUser.bio ?? '',
      languages: matchedUser.languages ?? [],
      availability: matchedUser.availability ?? '',
      instagram: '',
      placesVisited: matchedUser.places_visited ?? [],
      likedAt: Date.now(),
      isMutual: true,
    };
    shownMatchIds.current.add(matchId);
    AsyncStorage.setItem('shownMatchIds', JSON.stringify([...shownMatchIds.current]));
    setMatchedTraveler(travelerObj);
    setShowMatchAnimation(true);
  }, []);

  useRealtimeNewMutualMatch(handleRealtimeMutualMatch);

  const tripsIn = useMemo(() => joinedTrips.filter(t => t.userStatus === 'in'), [joinedTrips]);
  const tripsMaybe = useMemo(() => joinedTrips.filter(t => t.userStatus === 'maybe'), [joinedTrips]);
  const userCreatedTripsData = useMemo(() => joinedTrips.filter(t => t.isUserCreated === true), [joinedTrips]);

  const supabaseTripsMapped = useMemo(() => supabaseTrips.map(trip => {
    const hostMember = trip.members?.find(m => m.user_id === trip.creator_id);
    const hostUser = hostMember?.user ?? trip.creator;
    const dateStr = trip.is_flexible_dates
      ? 'Dates TBD'
      : (trip.start_date && trip.end_date
        ? `${new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : trip.start_date
          ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'Dates TBD');
    const paceMap: Record<string, string> = { slow: 'Relaxed', balanced: 'Balanced', fast: 'Fast-paced' };
    return {
      id: trip.id,
      destination: trip.destination,
      country: trip.country,
      image: trip.cover_image ?? 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800',
      dates: dateStr,
      vibes: trip.vibes ?? [],
      peopleCount: trip.member_count,
      people: trip.members?.map(m => ({
        userId: m.user_id,
        name: m.user?.name ?? 'Traveler',
        age: m.user?.age ?? 25,
        image: m.user?.profile_photo ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
        photos: m.user?.photos ?? [],
        country: m.user?.country ?? '',
        city: m.user?.city ?? m.user?.country ?? '',
        bio: m.user?.bio ?? '',
        isHost: m.user_id === trip.creator_id,
        gender: (m.user?.gender ?? 'other') as 'male' | 'female' | 'other',
        travelStyles: m.user?.travel_styles ?? [],
        placesVisited: m.user?.places_visited ?? [],
        bucketList: m.user?.bucket_list ?? [],
        languages: m.user?.languages ?? [],
        availability: m.user?.availability ?? '',
        travelPace: m.user?.travel_pace ?? null,
        socialEnergy: m.user?.social_energy ?? null,
        planningStyle: m.user?.planning_style ?? null,
        experience: m.user?.experience_level ?? null,
      })) ?? [],
      description: trip.description ?? `Looking for travel companions to ${trip.destination}!`,
      fullDescription: trip.description ?? `Join this trip to ${trip.destination}, ${trip.country}.`,
      host: hostUser?.name ?? 'Traveler',
      budget: trip.budget_level ?? 'TBD',
      accommodation: 'TBD',
      groupSize: `Up to ${trip.max_group_size} people`,
      dailyPace: paceMap[trip.pace ?? ''] ?? trip.pace ?? '',
      groupPreference: trip.group_preference ?? '',
      maxPeople: trip.max_group_size,
      isUserCreated: trip.creator_id === currentUserId,
      isAlreadyJoined: trip.members?.some(m => m.user_id === currentUserId) ?? false,
    };
  }), [supabaseTrips, currentUserId]);

  const ALL_TRIPS = useMemo(() => {
    return supabaseTripsMapped;
  }, [supabaseTripsMapped]);

  const currentTrip = ALL_TRIPS[tripIndex % Math.max(ALL_TRIPS.length, 1)] ?? null;
  const { data: swipeableUsers = [], isLoading: loadingTravelers } = useSwipeableUsers();
  const currentTraveler = swipeableUsers[0] ?? null;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const isGesturing = useSharedValue(false);

  const myTripsCardScale = useSharedValue(1);
  const matchesCardScale = useSharedValue(1);
  const myTripsCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: myTripsCardScale.value }] }));
  const matchesCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: matchesCardScale.value }] }));

  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    if (!isPremium && currentUserId !== null) {
      const allowed = recordSwipe();
      if (!allowed) {
        setShowSwipeLimitGate(true);
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        rotation.value = withTiming(0, { duration: 200 });
        cardScale.value = withTiming(1, { duration: 200 });
        return;
      }
    }

    Haptics.impactAsync(direction === 'right' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);

    if (direction === 'right' && mode === 'companions' && currentTraveler) {
      swipeRPCMutation.mutate(
        { swipedId: currentTraveler.id, direction: 'right' },
        {
          onSuccess: (result) => {
            if (result.isMatch) {
              const matchedTravelerObj: import('@/lib/state/matches-store').MatchedTraveler = {
                id: currentTraveler.id,
                name: currentTraveler.name,
                age: currentTraveler.age ?? 25,
                image: (currentTraveler.photos && currentTraveler.photos.length > 0 ? currentTraveler.photos[0] : currentTraveler.profile_photo) ?? '',
                photos: currentTraveler.photos ?? [],
                country: currentTraveler.country ?? '',
                city: currentTraveler.city ?? '',
                travelStyles: (currentTraveler.travel_styles ?? []) as string[],
                vibes: [],
                destinations: currentTraveler.bucket_list ?? [],
                bio: currentTraveler.bio ?? '',
                fullBio: currentTraveler.bio ?? '',
                languages: currentTraveler.languages ?? [],
                availability: currentTraveler.availability ?? '',
                instagram: '',
                placesVisited: currentTraveler.places_visited ?? [],
                likedAt: Date.now(),
                isMutual: true,
              };
              setMatchedTraveler(matchedTravelerObj);
              if (result.matchId) {
                shownMatchIds.current.add(result.matchId);
                AsyncStorage.setItem('shownMatchIds', JSON.stringify([...shownMatchIds.current]));
              }
              setShowMatchAnimation(true);
            }
          },
        }
      );
      addToRequests({
        id: currentTraveler.id,
        name: currentTraveler.name,
        age: currentTraveler.age ?? 25,
        image: (currentTraveler.photos && currentTraveler.photos.length > 0 ? currentTraveler.photos[0] : currentTraveler.profile_photo) ?? '',
        photos: currentTraveler.photos ?? [],
        country: currentTraveler.country ?? '',
        city: currentTraveler.city ?? '',
        travelStyles: (currentTraveler.travel_styles ?? []) as string[],
        vibes: [],
        destinations: currentTraveler.bucket_list ?? [],
        bio: currentTraveler.bio ?? '',
        fullBio: currentTraveler.bio ?? '',
        languages: currentTraveler.languages ?? [],
        availability: currentTraveler.availability ?? '',
        instagram: '',
        placesVisited: currentTraveler.places_visited ?? [],
      });
    }

    if (direction === 'left' && mode === 'companions' && currentTraveler) {
      swipeRPCMutation.mutate({ swipedId: currentTraveler.id, direction: 'left' });
    }

    if (direction === 'right' && mode === 'trips' && currentTrip && !isAlreadyJoined(currentTrip.id)) {
      joinTripMutation.mutate({ tripId: currentTrip.id, status: 'in' });

      const tripToJoin = {
        id: currentTrip.id,
        destination: currentTrip.destination,
        country: currentTrip.country,
        image: currentTrip.image,
        dates: currentTrip.dates,
        vibes: currentTrip.vibes,
        description: currentTrip.description,
        fullDescription: currentTrip.fullDescription,
        host: currentTrip.host,
        budget: currentTrip.budget,
        accommodation: currentTrip.accommodation,
        groupSize: currentTrip.groupSize,
        people: currentTrip.people.map(p => ({
          ...p,
          id: `person-${p.name}-${currentTrip.id}`,
          photos: [],
          status: 'in' as const,
        })),
      };
      joinTrip(tripToJoin, 'in');

      setJoinedTripName(currentTrip.destination);
      setJoinedTripCover(currentTrip.image ?? '');
      setJoinedTripCrew(
        (currentTrip.people ?? []).slice(0, 4).map((p: any) => p.image).filter(Boolean)
      );
      setShowTripJoinAnimation(true);
    }

    if (mode === 'trips') {
      if (tripIndex < ALL_TRIPS.length - 1) {
        setTripIndex(prev => prev + 1);
      } else {
        setTripIndex(0);
      }
    }

    setTimeout(() => {
      translateX.value = 0;
      translateY.value = 0;
      rotation.value = 0;
      cardScale.value = 1;
    }, 0);
  }, [mode, tripIndex, currentTraveler, currentTrip, addToRequests, joinTrip, isAlreadyJoined, isPremium, recordSwipe, translateX, translateY, rotation, cardScale, swipeRPCMutation, joinTripMutation]);

  const triggerSwipe = useCallback((direction: 'left' | 'right') => {
    const targetX = direction === 'right' ? width * 1.5 : -width * 1.5;

    translateX.value = withTiming(targetX, { duration: 300, easing: Easing.out(Easing.cubic) }, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(handleSwipeComplete)(direction);
      }
    });
  }, [handleSwipeComplete]);

  const handleCardTap = useCallback(() => {
    if (!isGesturing.value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (mode === 'trips') {
        setShowTripDetail(true);
      } else {
        setShowTravelerDetail(true);
      }
    }
  }, [mode, isGesturing]);

  const resetGestureFlag = useCallback(() => {
    isGesturing.value = false;
  }, [isGesturing]);

  const panGesture = Gesture.Pan()
    .minDistance(15)
    .onBegin(() => {
      'worklet';
      isGesturing.value = false;
    })
    .onUpdate((event) => {
      'worklet';
      if (Math.abs(event.translationX) > 10 || Math.abs(event.translationY) > 10) {
        isGesturing.value = true;
      }
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.5;
      rotation.value = interpolate(event.translationX, [-width / 2, 0, width / 2], [-8, 0, 8]);
    })
    .onEnd((event) => {
      'worklet';
      const shouldSwipe = Math.abs(event.translationX) > SWIPE_THRESHOLD || Math.abs(event.velocityX) > 1000;

      if (shouldSwipe) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        const targetX = direction === 'right' ? width * 1.5 : -width * 1.5;

        translateX.value = withTiming(targetX, { duration: 300, easing: Easing.out(Easing.cubic) }, (finished) => {
          'worklet';
          if (finished) {
            runOnJS(handleSwipeComplete)(direction);
          }
        });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        rotation.value = withSpring(0, { damping: 20, stiffness: 300 });

        withTiming(0, { duration: 100 }, () => {
          'worklet';
          runOnJS(resetGestureFlag)();
        });
      }
    });

  const tapGesture = Gesture.Tap()
    .maxDistance(10)
    .onStart(() => {
      'worklet';
      if (!isGesturing.value) {
        runOnJS(handleCardTap)();
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: cardScale.value },
    ],
  }));

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  type TripPersonType = TripPersonMock;

  const convertTripPersonToPublicProfile = useCallback((person: TripPersonType): PublicProfileData => {
    const allPhotos = person.photos && person.photos.length > 0
      ? person.photos
      : [person.image].filter(Boolean);
    return {
      id: person.userId,
      name: person.name,
      age: person.age,
      image: allPhotos[0] || person.image,
      images: allPhotos,
      country: person.country,
      city: person.city || person.country,
      bio: person.bio || undefined,
      fullBio: person.bio || undefined,
      travelStyles: person.travelStyles ?? [],
      placesVisited: person.placesVisited ?? [],
      bucketList: person.bucketList ?? [],
      destinations: person.bucketList ?? [],
      languages: person.languages ?? [],
      availability: person.availability || undefined,
      socialEnergy: person.socialEnergy ?? null,
      travelPace: person.travelPace ?? null,
      planningStyle: person.planningStyle ?? null,
      experience: person.experience ?? null,
    };
  }, []);

  const handleOpenTripPersonProfile = useCallback((person: TripPersonType) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const profileData = convertTripPersonToPublicProfile(person);
      setSelectedPersonProfile(profileData);
      setShowPersonProfile(true);
    } catch (err) {
      console.error('[TripPersonProfile] Failed to open profile:', err);
      Alert.alert('Could not open profile', 'Please try again.');
    }
  }, [convertTripPersonToPublicProfile]);

  const handleMessageFromTripPersonProfile = useCallback(async () => {
    if (!selectedPersonProfile) return;
    try {
      setShowPersonProfile(false);
      const conversationId = await createDirectConversation.mutateAsync(selectedPersonProfile.id);
      router.push(`/chat?conversationId=${conversationId}&name=${encodeURIComponent(selectedPersonProfile.name)}`);
    } catch (err) {
      console.error('[TripPersonProfile] Failed to create conversation:', err);
      Alert.alert('Could not start chat', 'Please try again.');
    }
  }, [selectedPersonProfile, createDirectConversation, router]);


  const renderTripDetailModal = () => {
    if (!currentTrip) return null;

    const matchPercentage = calculateTripMatch(userProfile, {
      id: currentTrip.id,
      destination: currentTrip.destination,
      country: currentTrip.country,
      vibes: currentTrip.vibes,
      people: currentTrip.people,
    });

    return (
      <Modal
        visible={showTripDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTripDetail(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000', flexDirection: 'column' }}>

          <View style={{ height: height * 0.44 }}>
            <Image
              source={{ uri: currentTrip.image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.92)']}
              locations={[0, 0.3, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} edges={['top']}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 }}>
                <Pressable
                  onPress={() => setShowTripDetail(false)}
                  style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <ChevronDown size={20} color="#fff" strokeWidth={2.5} />
                </Pressable>
                <View style={{
                  backgroundColor: '#F5A623',
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                }}>
                  <Text style={{ color: '#3d1f00', fontWeight: '800', fontSize: 13, fontFamily: 'Outfit-ExtraBold' }}>
                    {matchPercentage}% match
                  </Text>
                </View>
              </View>
            </SafeAreaView>

            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <MapPin size={13} color={Colors.accent} strokeWidth={2} />
                <Text style={{ color: Colors.accent, fontSize: 13, fontFamily: 'Outfit-Regular' }}>
                  {currentTrip.country}
                </Text>
              </View>
              <Text style={{
                color: '#fff', fontSize: 40, fontWeight: '800',
                letterSpacing: -1.2, lineHeight: 42, fontFamily: 'Outfit-ExtraBold',
              }}>
                {currentTrip.destination}
              </Text>
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 20, gap: 8 }}>
              {[
                { label: 'Dates', value: currentTrip.dates },
                { label: 'Budget', value: currentTrip.budget },
                { label: 'Group', value: currentTrip.groupSize },
              ].map((item) => (
                <View key={item.label} style={{
                  flex: 1, backgroundColor: '#0F0F0F',
                  borderRadius: 16, padding: 14,
                  borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
                }}>
                  <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginBottom: 5, fontFamily: 'Outfit-Regular' }}>
                    {item.label}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 26 }}>

              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 12, fontFamily: 'Outfit-Bold' }}>
                Trip Vibes
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 26 }}>
                {currentTrip.vibes.map((vibe, i) => (
                  <View key={i} style={{
                    backgroundColor: Colors.accentDim,
                    borderWidth: 0.5, borderColor: Colors.accentBorder,
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22,
                  }}>
                    <Text style={{ color: Colors.accent, fontWeight: '600', fontSize: 14, fontFamily: 'Outfit-SemiBold' }}>
                      {vibe}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 10, fontFamily: 'Outfit-Bold' }}>
                About This Trip
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.52)', fontSize: 15, lineHeight: 24, marginBottom: 26, fontFamily: 'Outfit-Regular' }}>
                {currentTrip.fullDescription}
              </Text>

              <TripMembersSection people={currentTrip.people} />

              {(currentTrip.dailyPace || currentTrip.groupPreference) ? (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 12, fontFamily: 'Outfit-Bold' }}>
                    Trip Style
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {currentTrip.dailyPace ? (
                      <View style={{
                        flex: 1, backgroundColor: '#0F0F0F',
                        borderRadius: 16, padding: 14,
                        borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
                      }}>
                        <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginBottom: 5, fontFamily: 'Outfit-Regular' }}>Daily Pace</Text>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>{currentTrip.dailyPace}</Text>
                      </View>
                    ) : null}
                    {currentTrip.groupPreference ? (
                      <View style={{
                        flex: 1, backgroundColor: '#0F0F0F',
                        borderRadius: 16, padding: 14,
                        borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
                      }}>
                        <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginBottom: 5, fontFamily: 'Outfit-Regular' }}>Group</Text>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>{currentTrip.groupPreference}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}

            </View>
          </ScrollView>

          <View
            style={{
              backgroundColor: 'rgba(0,0,0,0.97)',
              borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)',
              paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24,
            }}
          >
            {currentTrip.isAlreadyJoined ? (
              <View style={{
                backgroundColor: Colors.accentDim,
                borderWidth: 1, borderColor: Colors.accentBorder,
                paddingVertical: 18, borderRadius: 20, alignItems: 'center',
              }}>
                <Text style={{ color: Colors.accent, fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>
                  ✓ You've joined this trip
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowTripDetail(false);
                  triggerSwipe('right');
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#f0f0f0' : '#ffffff',
                  paddingVertical: 16, borderRadius: 20,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#000', shadowOpacity: 0.18,
                  shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                })}
              >
                <Text style={{
                  color: '#000000', fontSize: 11, fontWeight: '600',
                  fontFamily: 'Outfit-SemiBold', letterSpacing: 1.2,
                  textTransform: 'uppercase', opacity: 0.4, marginBottom: 1,
                }}>
                  TagAlong
                </Text>
                <Text style={{
                  color: '#000000', fontSize: 18, fontWeight: '800',
                  fontFamily: 'Outfit-ExtraBold', letterSpacing: -0.3,
                }}>
                  Join this trip
                </Text>
              </Pressable>
            )}
          </View>

        </View>
      </Modal>
    );
  };

  const convertTravelerToPublicProfile = useCallback((traveler: UserProfile): PublicProfileData => {
    const allPhotos = traveler.photos && traveler.photos.length > 0
      ? traveler.photos
      : traveler.profile_photo ? [traveler.profile_photo] : [];
    return {
      id: traveler.id,
      name: traveler.name,
      age: traveler.age ?? 25,
      image: allPhotos[0] ?? traveler.profile_photo ?? '',
      images: allPhotos,
      country: traveler.country ?? '',
      city: traveler.city ?? '',
      bio: traveler.bio ?? '',
      fullBio: traveler.bio ?? '',
      travelStyles: (traveler.travel_styles ?? []) as string[],
      vibes: [],
      placesVisited: traveler.places_visited ?? [],
      destinations: traveler.bucket_list ?? [],
      languages: traveler.languages ?? [],
      availability: traveler.availability ?? '',
      instagram: '',
      socialEnergy: traveler.social_energy ?? 'ambivert',
      travelPace: traveler.travel_pace ?? 'balanced',
      planningStyle: traveler.planning_style ?? 'flexible',
      experience: traveler.experience_level ?? 'intermediate',
    };
  }, []);

  const handleConnectFromProfile = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTravelerDetail(false);
    triggerSwipe('right');
  }, [triggerSwipe]);

  const renderTravelerDetailModal = () => {
    if (!currentTraveler) return null;

    const alreadyLiked = checkIsAlreadyLiked(currentTraveler.id);

    return (
      <UserProfileModal
        userId={currentTraveler.id}
        visible={showTravelerDetail}
        onClose={() => setShowTravelerDetail(false)}
        showConnectButton
        onConnect={handleConnectFromProfile}
        isConnected={alreadyLiked}
      />
    );
  };

  const renderTripCard = () => {
    if (!currentTrip) return null;

    const matchPercentage = calculateTripMatch(userProfile, {
      id: currentTrip.id,
      destination: currentTrip.destination,
      country: currentTrip.country,
      vibes: currentTrip.vibes,
      people: currentTrip.people,
    });

    return (
      <View style={{ flex: 1, borderRadius: CARD_RADIUS, overflow: 'hidden', backgroundColor: '#000' }}>
        <Image
          source={{ uri: currentTrip.image }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
        />

        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.97)']}
          locations={[0, 0.3, 0.6, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* JOIN stamp */}
        <Animated.View style={[
          { position: 'absolute', top: 46, left: 18, paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 8, borderWidth: 2.5, borderColor: COLORS.forestGreen,
            backgroundColor: COLORS.accentDim, transform: [{ rotate: '-14deg' }] },
          likeOpacity,
        ]}>
          <Text style={{ color: COLORS.forestGreen, fontSize: 18, fontWeight: '900', fontFamily: 'Outfit-ExtraBold' }}>JOIN</Text>
        </Animated.View>

        {/* PASS stamp */}
        <Animated.View style={[
          { position: 'absolute', top: 46, right: 18, paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 8, borderWidth: 2.5, borderColor: COLORS.warmRed,
            backgroundColor: 'rgba(255,69,58,0.18)', transform: [{ rotate: '14deg' }] },
          nopeOpacity,
        ]}>
          <Text style={{ color: COLORS.warmRed, fontSize: 18, fontWeight: '900', fontFamily: 'Outfit-ExtraBold' }}>PASS</Text>
        </Animated.View>

        {/* Top badges */}
        <View style={{ position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#F5A623', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 }}>
            <Text style={{ color: '#3d1f00', fontWeight: '800', fontSize: 12, fontFamily: 'Outfit-ExtraBold' }}>
              {matchPercentage}% <Text style={{ fontWeight: '500', fontSize: 10, fontFamily: 'Outfit-Regular' }}>match</Text>
            </Text>
          </View>

          {currentTrip.isAlreadyJoined && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: COLORS.accentDim, borderWidth: 0.5, borderColor: COLORS.accentBorder,
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
            }}>
              <Text style={{ color: COLORS.forestGreen, fontSize: 11, fontFamily: 'Outfit-Regular' }}>✓</Text>
              <Text style={{ color: COLORS.forestGreen, fontWeight: '600', fontSize: 11, fontFamily: 'Outfit-SemiBold' }}>Joined</Text>
            </View>
          )}
        </View>

        {/* Bottom content */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <MapPin size={11} color={COLORS.forestGreen} strokeWidth={2} />
            <Text style={{ color: COLORS.forestGreen, fontSize: 11, fontWeight: '500', fontFamily: 'Outfit-Regular' }}>{currentTrip.country}</Text>
          </View>

          <Text style={{
            color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -1.2,
            lineHeight: 34, marginBottom: 10, fontFamily: 'Outfit-ExtraBold',
          }}>
            {currentTrip.destination}
          </Text>

          {/* Pills row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: COLORS.glass, borderWidth: 0.5, borderColor: COLORS.glassBorder,
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
            }}>
              <Calendar size={10} color="rgba(255,255,255,0.75)" strokeWidth={2} />
              <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: '500', fontFamily: 'Outfit-Regular' }}>
                {currentTrip.dates}
              </Text>
            </View>
            {currentTrip.vibes.map((vibe, i) => (
              <View key={i} style={{
                backgroundColor: COLORS.glass, borderWidth: 0.5, borderColor: COLORS.glassBorder,
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: '500', fontFamily: 'Outfit-Regular' }}>{vibe}</Text>
              </View>
            ))}
          </View>

          {/* Who is going */}
          <WhoIsGoing
            people={currentTrip.people}
            accentColor={COLORS.forestGreen}
            borderColor="#000"
          />
        </View>
      </View>
    );
  };

  const renderTravelerCard = () => {
    if (loadingTravelers) {
      return (
        <View style={{ flex: 1, borderRadius: CARD_RADIUS, backgroundColor: COLORS.charcoalLight, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.stoneGray, fontSize: 16, fontFamily: 'Outfit-Regular' }}>Finding travelers...</Text>
        </View>
      );
    }
    if (!currentTraveler) {
      return (
        <View style={{ flex: 1, borderRadius: CARD_RADIUS, backgroundColor: COLORS.charcoalLight, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 20 }}>✈️</Text>
          <Text style={{ color: COLORS.softWhite, fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 10, fontFamily: 'Outfit-Bold' }}>
            You've seen everyone!
          </Text>
          <Text style={{ color: COLORS.stoneGray, fontSize: 15, textAlign: 'center', lineHeight: 22, fontFamily: 'Outfit-Regular' }}>
            Check back later — new travelers join every day.
          </Text>
        </View>
      );
    }

    const matchPercentage = calculateTravelerMatch(userProfile, {
      id: currentTraveler.id,
      name: currentTraveler.name,
      gender: currentTraveler.gender,
      travelStyles: (currentTraveler.travel_styles ?? []) as string[],
      vibes: [],
      destinations: currentTraveler.bucket_list ?? [],
      experience: currentTraveler.experience_level,
      placesVisited: currentTraveler.places_visited ?? [],
      travelPace: currentTraveler.travel_pace,
      planningStyle: currentTraveler.planning_style,
      socialEnergy: currentTraveler.social_energy,
    });

    const travelerPhoto = (currentTraveler.photos && currentTraveler.photos.length > 0
      ? currentTraveler.photos[0]
      : currentTraveler.profile_photo) ?? '';

    return (
      <View style={{ flex: 1, borderRadius: CARD_RADIUS, overflow: 'hidden', backgroundColor: '#0d2818' }}>

        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '52%' }}>
          {travelerPhoto ? (
            <Image
              source={{ uri: travelerPhoto }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: '#0a2a18', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: COLORS.forestGreen,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: COLORS.accentBorder,
              }}>
                <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800', fontFamily: 'Outfit-ExtraBold' }}>
                  {currentTraveler.name.charAt(0)}
                </Text>
              </View>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(13,40,24,0.95)']}
            locations={[0.55, 1]}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 }}
          />
        </View>

        {/* Match badge */}
        <View style={{
          position: 'absolute', top: 14, left: 14,
          backgroundColor: COLORS.accentDim, borderWidth: 0.5, borderColor: COLORS.accentBorder,
          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
        }}>
          <Text style={{ color: COLORS.forestGreen, fontWeight: '800', fontSize: 12, fontFamily: 'Outfit-ExtraBold' }}>
            {matchPercentage}% <Text style={{ fontWeight: '400', fontSize: 10, fontFamily: 'Outfit-Regular' }}>match</Text>
          </Text>
        </View>

        {/* LIKE / NOPE stamps */}
        <Animated.View style={[
          { position: 'absolute', top: 46, left: 18, paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 8, borderWidth: 2.5, borderColor: COLORS.forestGreen,
            backgroundColor: COLORS.accentDim, transform: [{ rotate: '-14deg' }] },
          likeOpacity,
        ]}>
          <Text style={{ color: COLORS.forestGreen, fontSize: 18, fontWeight: '900', fontFamily: 'Outfit-ExtraBold' }}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[
          { position: 'absolute', top: 46, right: 18, paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 8, borderWidth: 2.5, borderColor: COLORS.warmRed,
            backgroundColor: 'rgba(255,69,58,0.18)', transform: [{ rotate: '14deg' }] },
          nopeOpacity,
        ]}>
          <Text style={{ color: COLORS.warmRed, fontSize: 18, fontWeight: '900', fontFamily: 'Outfit-ExtraBold' }}>NOPE</Text>
        </Animated.View>

        {/* Info area */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '52%', padding: 16 }}>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', fontFamily: 'Outfit-ExtraBold' }}>
              {currentTraveler.name}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 19, fontFamily: 'Outfit-Regular' }}>
              {currentTraveler.age}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            <MapPin size={11} color="rgba(255,255,255,0.45)" strokeWidth={2} />
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>
              {currentTraveler.city}, {currentTraveler.country}
            </Text>
          </View>

          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
            backgroundColor: COLORS.accentDim, borderWidth: 0.5, borderColor: COLORS.accentBorder,
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, marginBottom: 10,
          }}>
            <Calendar size={10} color={COLORS.forestGreen} strokeWidth={2} />
            <Text style={{ color: COLORS.forestGreen, fontSize: 11, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>
              Available: {currentTraveler.availability}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
            {currentTraveler.travel_styles.slice(0, 3).map((style: string, i: number) => (
              <View key={i} style={{
                backgroundColor: COLORS.accentDim, borderWidth: 0.5, borderColor: COLORS.accentBorder,
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
              }}>
                <Text style={{ color: COLORS.forestGreen, fontSize: 11, fontWeight: '500', fontFamily: 'Outfit-Regular' }}>{style}</Text>
              </View>
            ))}
          </View>

          {currentTraveler.bucket_list && currentTraveler.bucket_list.length > 0 && (
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 5, fontFamily: 'Outfit-Regular' }}>
              Wants to visit: <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
                {currentTraveler.bucket_list.slice(0, 3).join(' · ')}
              </Text>
            </Text>
          )}

          {currentTraveler.languages && currentTraveler.languages.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Languages size={11} color="rgba(255,255,255,0.28)" strokeWidth={2} />
              <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>
                {currentTraveler.languages.join(', ')}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const handleGroupChat = useCallback((trip: JoinedTrip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let chatId = trip.groupChatId;

    if (!chatId) {
      const participants = trip.people.map(p => ({
        id: p.id,
        name: p.name,
        age: p.age,
        image: p.image,
        country: p.country,
        city: p.country,
      }));

      chatId = createGroupChat(participants, `${trip.destination} Trip`);
      setGroupChatId(trip.id, chatId);
    }

    router.push(`/chat?chatId=${chatId}`);
  }, [createGroupChat, setGroupChatId, router]);

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── Header: TagAlong + Create ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: H_PAD, paddingTop: 10, paddingBottom: 12,
        }}>
          <Text style={{
            color: '#FFFFFF', fontSize: 28, fontWeight: '800',
            fontFamily: 'Outfit-ExtraBold', letterSpacing: -0.8,
          }}>
            TagAlong
          </Text>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowCreateTrip(true); }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: Colors.accentDim,
              borderWidth: 0.5, borderColor: Colors.accentBorder,
              paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100,
            }}
          >
            <Plus size={13} color={Colors.accent} strokeWidth={2.5} />
            <Text style={{ color: Colors.accent, fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Create Trip</Text>
          </Pressable>
        </View>

        {/* ── Mode tabs ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: H_PAD, marginBottom: 12,
        }}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setMode('trips'); }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingVertical: 9, paddingHorizontal: 16, borderRadius: 100,
              backgroundColor: mode === 'trips' ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
              marginRight: 8,
            }}
          >
            <Plane size={14} color={mode === 'trips' ? '#000' : 'rgba(255,255,255,0.45)'} strokeWidth={2.2} />
            <Text style={{
              color: mode === 'trips' ? '#000' : 'rgba(255,255,255,0.45)',
              fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold',
            }}>Find Trip</Text>
          </Pressable>

          <Pressable
            onPress={() => { Haptics.selectionAsync(); setMode('companions'); }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingVertical: 9, paddingHorizontal: 16, borderRadius: 100,
              backgroundColor: mode === 'companions' ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
            }}
          >
            <Users size={14} color={mode === 'companions' ? '#000' : 'rgba(255,255,255,0.45)'} strokeWidth={2} />
            <Text style={{
              color: mode === 'companions' ? '#000' : 'rgba(255,255,255,0.45)',
              fontSize: 13, fontWeight: '600', fontFamily: 'Outfit-SemiBold',
            }}>Companion</Text>
          </Pressable>
        </View>

        {/* ── Card stack ── */}
        <View style={{ paddingHorizontal: H_PAD / 2, backgroundColor: '#000', height: CARD_HEIGHT + 8, zIndex: 1 }}>
          {(mode === 'trips' ? ALL_TRIPS.length - tripIndex : swipeableUsers.length) > 2 && (
            <View style={{
              position: 'absolute',
              left: H_PAD / 2 + 16, right: H_PAD / 2 + 16, top: -8,
              height: CARD_HEIGHT, borderRadius: CARD_RADIUS - 2,
              backgroundColor: 'rgba(255,255,255,0.015)',
              borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.04)',
            }} />
          )}
          {(mode === 'trips' ? ALL_TRIPS.length - tripIndex : swipeableUsers.length) > 1 && (
            <View style={{
              position: 'absolute',
              left: H_PAD / 2 + 8, right: H_PAD / 2 + 8, top: -4,
              height: CARD_HEIGHT, borderRadius: CARD_RADIUS - 1,
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.07)',
            }} />
          )}

          <GestureDetector gesture={composedGesture}>
            <Animated.View
              style={[
                { borderRadius: CARD_RADIUS, overflow: 'hidden', height: CARD_HEIGHT },
                cardAnimatedStyle,
              ]}
            >
              {mode === 'trips' ? renderTripCard() : renderTravelerCard()}
            </Animated.View>
          </GestureDetector>
        </View>

        {/* ── My Trips / Matches ── */}
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
          {mode === 'trips' ? (
            <Animated.View style={myTripsCardStyle}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowMyTrips(true); }}
                onPressIn={() => { myTripsCardScale.value = withSpring(0.93, { stiffness: 400, damping: 22 }); }}
                onPressOut={() => { myTripsCardScale.value = withSpring(1, { stiffness: 300, damping: 20 }); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: '#ffffff',
                  paddingVertical: 9, paddingHorizontal: 18,
                  borderRadius: 100,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <Briefcase size={14} color="#000" strokeWidth={2.2} />
                <Text style={{ color: '#000', fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold', letterSpacing: -0.2 }}>My Trips</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View style={matchesCardStyle}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowMatchesModal(true); }}
                onPressIn={() => { matchesCardScale.value = withSpring(0.93, { stiffness: 400, damping: 22 }); }}
                onPressOut={() => { matchesCardScale.value = withSpring(1, { stiffness: 300, damping: 20 }); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: '#ff375f',
                  paddingVertical: 9, paddingHorizontal: 18,
                  borderRadius: 100,
                  shadowColor: '#ff375f',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Heart size={14} color="#fff" strokeWidth={2.2} />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold', letterSpacing: -0.2 }}>Matches</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>

      </SafeAreaView>

      {/* Modals */}
      {renderTripDetailModal()}
      {renderTravelerDetailModal()}
      <MyTripsModal visible={showMyTrips} onClose={() => setShowMyTrips(false)} />
      <MatchesModal visible={showMatchesModal} onClose={() => setShowMatchesModal(false)} />
      <CreateTripOnboarding
        visible={showCreateTrip}
        onClose={() => {
          setShowCreateTrip(false);
        }}
        onSubmit={(data) => {
          setCreatedTripDestination(data.destination);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          const paceDbMap: Record<string, 'slow' | 'balanced' | 'fast'> = {
            'Relaxed': 'slow',
            'Balanced': 'balanced',
            'Fast-paced': 'fast',
          };
          const groupPrefDbMap: Record<string, 'everyone' | 'female' | 'male' | 'mixed'> = {
            'Any': 'everyone',
            'Women only': 'female',
            'Men only': 'male',
            'Mixed': 'mixed',
          };

          let startDate: string | null = null;
          let endDate: string | null = null;
          if (!data.datesTBD && data.dates) {
            const parts = data.dates.split(' - ');
            if (parts[0]) {
              const parsed = new Date(parts[0]);
              if (!isNaN(parsed.getTime())) {
                startDate = parsed.toISOString().split('T')[0];
              }
            }
            if (parts[1]) {
              const parsed = new Date(parts[1]);
              if (!isNaN(parsed.getTime())) {
                endDate = parsed.toISOString().split('T')[0];
              }
            }
          }

          createTripMutation.mutate(
            {
              title: `${data.destination} Trip`,
              destination: data.destination,
              country: data.country,
              cover_image: data.photo,
              images: [data.photo],
              description: data.description || `Looking for travel companions to ${data.destination}!`,
              vibes: data.vibes,
              pace: paceDbMap[data.pace] ?? 'balanced',
              group_preference: groupPrefDbMap[data.groupPref] ?? 'everyone',
              max_group_size: data.maxPeople,
              budget_level: data.budget || null,
              is_flexible_dates: data.datesTBD,
              start_date: startDate,
              end_date: endDate,
              status: 'planning',
            },
            {
              onSuccess: () => {
                refetchTrips();
                setCreatedTripCoverImage(data.photo);
                setShowCreateTrip(false);
                setShowTripCreatedBanner(true);
              },
              onError: () => {
                refetchTrips();
                setCreatedTripCoverImage(data.photo);
                setShowCreateTrip(false);
                setShowTripCreatedBanner(true);
              },
            }
          );
        }}
        isSubmitting={createTripMutation.isPending}
      />

      <UserProfileModal
        userId={selectedPersonProfile?.id ?? null}
        visible={showPersonProfile}
        onClose={() => setShowPersonProfile(false)}
        showMessageButton
        onMessage={handleMessageFromTripPersonProfile}
      />

      <Modal
        visible={showTripSearch}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowTripSearch(false)}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.deepCharcoal }}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={{ borderBottomColor: 'rgba(245,245,240,0.1)', borderBottomWidth: 1 }} className="flex-row items-center px-4 py-4">
              <Pressable
                onPress={() => {
                  setShowTripSearch(false);
                  setTripSearchQuery('');
                }}
                className="p-2 -ml-2"
              >
                <ChevronLeft size={28} color={COLORS.softWhite} strokeWidth={2} />
              </Pressable>
              <View style={{ backgroundColor: COLORS.charcoalLight }} className="flex-1 flex-row items-center rounded-2xl px-4 py-3 ml-2">
                <Search size={18} color={COLORS.stoneGray} strokeWidth={2} />
                <TextInput
                  value={tripSearchQuery}
                  onChangeText={setTripSearchQuery}
                  placeholder="Search a trip..."
                  placeholderTextColor={COLORS.stoneDark}
                  style={{ color: COLORS.softWhite }}
                  className="flex-1 text-base ml-3"
                  autoFocus
                />
                {tripSearchQuery.length > 0 && (
                  <Pressable onPress={() => setTripSearchQuery('')}>
                    <X size={18} color={COLORS.stoneGray} strokeWidth={2} />
                  </Pressable>
                )}
              </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="p-4">
                {ALL_TRIPS.filter(trip =>
                  tripSearchQuery.length === 0 ||
                  trip.destination.toLowerCase().includes(tripSearchQuery.toLowerCase()) ||
                  trip.country.toLowerCase().includes(tripSearchQuery.toLowerCase()) ||
                  trip.vibes.some(v => v.toLowerCase().includes(tripSearchQuery.toLowerCase()))
                ).map((trip, index) => (
                  <Animated.View
                    key={trip.id}
                    entering={FadeInDown.delay(index * 50).springify()}
                  >
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (!trip.isAlreadyJoined) {
                          const tripToJoin = {
                            id: trip.id,
                            destination: trip.destination,
                            country: trip.country,
                            image: trip.image,
                            dates: trip.dates,
                            vibes: trip.vibes,
                            description: trip.description,
                            fullDescription: trip.fullDescription,
                            host: trip.host,
                            budget: trip.budget,
                            accommodation: trip.accommodation,
                            groupSize: trip.groupSize,
                            people: trip.people.map(p => ({
                              ...p,
                              id: `person-${p.name}-${trip.id}`,
                              photos: [],
                              status: 'in' as const,
                            })),
                          };
                          joinTrip(tripToJoin, 'in');

                          setJoinedTripName(trip.destination);
                          setShowTripJoinAnimation(true);
                        }
                        setShowTripSearch(false);
                        setTripSearchQuery('');
                      }}
                      className="bg-neutral-900 rounded-2xl mb-3 overflow-hidden active:opacity-80"
                    >
                      <View className="flex-row">
                        <Image
                          source={{ uri: trip.image }}
                          style={{ width: 100, height: 100 }}
                          resizeMode="cover"
                        />
                        <View className="flex-1 p-3">
                          <View className="flex-row items-center mb-1">
                            <MapPin size={12} color={COLORS.forestGreenBright} strokeWidth={2} />
                            <Text style={{ color: COLORS.forestGreenBright }} className="text-xs ml-1">{trip.country}</Text>
                          </View>
                          <Text style={{ color: COLORS.softWhite }} className="font-semibold text-base mb-1">{trip.destination}</Text>
                          <Text style={{ color: COLORS.stoneGray }} className="text-xs mb-2">{trip.dates}</Text>
                          <View className="flex-row flex-wrap">
                            {trip.vibes.slice(0, 2).map((vibe, i) => (
                              <View key={i} style={{ backgroundColor: 'rgba(45,90,69,0.3)' }} className="px-2 py-1 rounded-full mr-1">
                                <Text style={{ color: COLORS.forestGreenBright }} className="text-[10px] font-medium">{vibe}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                        <View className="justify-center pr-3">
                          {trip.isAlreadyJoined ? (
                            <View style={{ backgroundColor: COLORS.forestGreen }} className="px-3 py-1.5 rounded-full">
                              <Text style={{ color: COLORS.softWhite }} className="text-xs font-semibold">Joined</Text>
                            </View>
                          ) : (
                            <View style={{ backgroundColor: 'rgba(45,90,69,0.3)' }} className="px-3 py-1.5 rounded-full">
                              <Text style={{ color: COLORS.forestGreenBright }} className="text-xs font-semibold">Join</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                ))}
                {tripSearchQuery.length > 0 && ALL_TRIPS.filter(trip =>
                  trip.destination.toLowerCase().includes(tripSearchQuery.toLowerCase()) ||
                  trip.country.toLowerCase().includes(tripSearchQuery.toLowerCase()) ||
                  trip.vibes.some(v => v.toLowerCase().includes(tripSearchQuery.toLowerCase()))
                ).length === 0 && (
                  <View className="items-center py-12">
                    <Text style={{ color: COLORS.stoneDark }} className="text-base">No trips found</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {matchedTraveler && (
        <MatchAnimation
          visible={showMatchAnimation}
          onClose={() => setShowMatchAnimation(false)}
          userImage={userPhoto}
          matchImage={matchedTraveler.image}
          matchName={matchedTraveler.name}
          onStartChat={() => {
            setShowMatchAnimation(false);
            startChat({
              id: matchedTraveler.id,
              name: matchedTraveler.name,
              age: matchedTraveler.age,
              image: matchedTraveler.image,
              country: matchedTraveler.country,
              city: matchedTraveler.city,
            });
            router.push('/messages');
          }}
        />
      )}

      <TripJoinAnimation
        visible={showTripJoinAnimation}
        onComplete={() => {
          setShowTripJoinAnimation(false);
          router.push(`/(tabs)/messages?newTrip=${encodeURIComponent(joinedTripName)}`);
        }}
        tripDestination={joinedTripName}
        coverImage={joinedTripCover}
        crewPhotos={joinedTripCrew}
      />

      <TripCreatedCelebration
        visible={showTripCreatedBanner}
        destination={createdTripDestination}
        coverImage={createdTripCoverImage}
        onComplete={() => {
          setShowTripCreatedBanner(false);
          setShowMyTrips(true);
        }}
      />

      <Modal
        visible={showSwipeLimitGate}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowSwipeLimitGate(false)}
      >
        <SwipeLimitGate
          onUnlockPress={() => {
            setShowSwipeLimitGate(false);
            setShowPremiumPaywall(true);
          }}
          onTimerComplete={() => {
            setShowSwipeLimitGate(false);
          }}
        />
      </Modal>

      <Modal
        visible={showPremiumPaywall}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowPremiumPaywall(false)}
      >
        <PremiumPaywall
          onClose={() => setShowPremiumPaywall(false)}
          onSubscribe={() => {
            setShowPremiumPaywall(false);
          }}
        />
      </Modal>

      {showSwipeTutorial && (
        <SwipeTutorialOverlay
          step={tutorialStep}
          onNext={() => {
            if (tutorialStep === 1) {
              setTutorialStep(2);
            } else {
              AsyncStorage.setItem('hasSeenSwipeTutorial', 'true');
              setShowSwipeTutorial(false);
            }
          }}
        />
      )}
    </View>
  );
}
