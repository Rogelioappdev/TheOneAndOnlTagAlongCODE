import { useState, useCallback, useEffect, useMemo, memo, useRef } from 'react';
import { Colors } from '../../lib/theme';
import { View, Text, Pressable, Dimensions, Image, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plane, MapPin, Calendar, Languages, X, ChevronLeft, ChevronDown, Briefcase, MessageCircle, Check, HelpCircle, XCircle, Plus, Minus, Search, Clock, DollarSign, ChevronRight, RotateCcw, Send } from 'lucide-react-native';
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
  withDelay,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useTripsStore, { JoinedTrip } from '@/lib/state/trips-store';
import useMessagesStore from '@/lib/state/messages-store';
import useUserProfileStore from '@/lib/state/user-profile-store';
import usePremiumStore from '@/lib/state/premium-store';
import useSwipeLimitStore from '@/lib/state/swipe-limit-store';
import { PublicProfileData } from '@/components/PublicProfileView';
import UserProfileModal from '@/components/userprofilemodal';
import { calculateTripMatch } from '@/lib/matching';
import TripJoinAnimation from '@/components/TripJoinAnimation';
import SwipeLimitGate from '@/components/SwipeLimitGate';
import PremiumPaywall from '@/components/PremiumPaywall';
import { useTrips as useSupabaseTrips, useCreateTrip, useJoinTrip } from '@/lib/hooks/useTrips';
import { useCreateDirectConversation } from '@/lib/hooks/useChat';
import { getCurrentUserId, supabase } from '@/lib/supabase';
import TripMembersSection from '@/components/TripMembersSection';
import type { UserProfile } from '@/lib/database.types';
import CreateTripOnboarding from '@/components/CreateTripOnboarding';
import MyTripsModal from '@/components/MyTripsModal';
import TripCreatedCelebration from '@/components/TripCreatedCelebration';


const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.35;

// ─── Layout constants ─────────────────────────────────────────────────────────
const CARD_HEIGHT = height * 0.68;       // Taller card — fits richer content without crowding
const CARD_RADIUS = 20;
const H_PAD      = 16;                   // Horizontal page padding

// After this many trips swiped, show the "complete your profile" nudge card
const PROFILE_NUDGE_AT = 4;

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

// ─── NextTripPreview ──────────────────────────────────────────────────────────
// Lightweight preview of the NEXT trip, rendered behind the top SwipeCard.
// Intentionally stripped down (photo + gradient + destination + dates) — the
// rich top-card content (match %, join stamps, people going, etc.) is
// expensive to render; rendering two of them would drop frames on lower-end
// devices. The user only needs enough signal to know "another trip is coming."
// Defined at module level + memoized so it only re-renders when trip changes.
interface NextTripPreviewProps {
  trip: { image: string; destination: string; country: string; dates: string } | null;
}
const NextTripPreview = memo(function NextTripPreview({ trip }: NextTripPreviewProps) {
  if (!trip) return null;
  return (
    <View style={{ flex: 1, borderRadius: CARD_RADIUS, overflow: 'hidden', backgroundColor: '#000' }}>
      <Image
        key={trip.image}
        source={{ uri: trip.image }}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)', 'rgba(0,0,0,0.97)']}
        locations={[0, 0.38, 0.60, 0.80, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
        <Text numberOfLines={1} style={{ color: '#fff', fontSize: 26, fontWeight: '800', fontFamily: 'Outfit-ExtraBold' }}>
          {trip.destination}
        </Text>
        <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2, fontFamily: 'Outfit-Regular' }}>
          {trip.country} · {trip.dates}
        </Text>
      </View>
    </View>
  );
});

// ─── SwipeCard ────────────────────────────────────────────────────────────────
// Defined at MODULE LEVEL so React sees a stable component identity across every
// parent re-render.  This is the critical invariant: if SwipeCard were defined
// inside TagAlongScreen, React would see a NEW component type on each render and
// force an unmount → remount → RNGH native handler teardown every single time.
//
// useMemo([], []) inside guarantees the gesture objects are created EXACTLY ONCE
// for the component's lifetime.  Even when SwipeCard re-renders (children change,
// callback props change), GestureDetector always gets the same gesture reference
// and never re-registers its native handlers.
//
// Callbacks are accessed through refs so the worklets always invoke the latest
// version without needing the gesture objects to be recreated.
interface SwipeCardProps {
  children: React.ReactNode;
  cardStyle: object;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  rotation: SharedValue<number>;
  cardScale: SharedValue<number>;
  cardOpacity: SharedValue<number>;
  behindProgress: SharedValue<number>;
  overlayDirection: SharedValue<number>;
  isGesturing: SharedValue<boolean>;
  onSwipeComplete: (direction: 'left' | 'right') => void;
  onTap: () => void;
}

const SwipeCard = memo(function SwipeCard({
  children,
  cardStyle,
  translateX,
  translateY,
  rotation,
  cardScale,
  cardOpacity,
  behindProgress,
  overlayDirection,
  isGesturing,
  onSwipeComplete,
  onTap,
}: SwipeCardProps) {
  // Always-current refs — updated on every render, never trigger re-registration
  const onSwipeCompleteRef = useRef(onSwipeComplete);
  onSwipeCompleteRef.current = onSwipeComplete;
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  // Stable JS bridges — same function reference for the component's lifetime
  const callSwipe = useCallback((dir: 'left' | 'right') => {
    onSwipeCompleteRef.current(dir);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const callTap = useCallback(() => {
    onTapRef.current();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gesture objects: created once, never recreated ──────────────────────────
  const panGesture = useMemo(() => Gesture.Pan()
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
      // Behind-card rises from 0 (small/behind) to 1 (full/centered) as drag
      // progresses. Direction-agnostic — either swipe commits the same next
      // card, so both left and right should cue it coming forward.
      const progress = Math.abs(event.translationX) / SWIPE_THRESHOLD;
      behindProgress.value = progress > 1 ? 1 : progress;
    })
    .onEnd((event) => {
      'worklet';
      const shouldSwipe = Math.abs(event.translationX) > SWIPE_THRESHOLD || Math.abs(event.velocityX) > 1000;
      if (shouldSwipe) {
        const dir = event.translationX > 0 ? 'right' : 'left';
        const targetX = dir === 'right' ? width * 1.5 : -width * 1.5;
        // Lock the overlay direction so the pass/join screen picks the
        // right variant and stays stable through the commit gap.
        overlayDirection.value = dir === 'right' ? 1 : -1;
        // Finish the behind-card's rise in lockstep with the flyoff.
        behindProgress.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
        translateX.value = withTiming(targetX, { duration: 140, easing: Easing.out(Easing.quad) }, (finished) => {
          'worklet';
          if (finished) {
            // Atomic swap on the UI thread:
            //  1. Hide the top card (old children won't flash at reset position)
            //  2. Reset transform to 0/0/0 — now guaranteed to be applied BEFORE
            //     React commits the new children, because both happen in the same
            //     worklet tick.
            //  3. Signal JS to advance tripIndex.
            //  4. Fade opacity back up with a tiny delay so React has committed.
            //  5. After the top card is fully visible (~76ms), snap behindProgress
            //     back to 0 so the (now trip[N+2]) behind card drops back to its
            //     small preview position — the reset is hidden under the opaque
            //     top card, so no visible pop.
            cardOpacity.value = 0;
            translateX.value = 0;
            translateY.value = 0;
            rotation.value = 0;
            // Snap behind card to preview position NOW. It's invisible (because
            // cardOpacity is 0 and behind multiplies by it), so the snap has no
            // visible cost. When cardOpacity is raised again post-commit, the
            // behind card is already in its preview slot — no flash possible.
            behindProgress.value = 0;
            isGesturing.value = false;
            runOnJS(callSwipe)(dir);
            // DO NOT raise cardOpacity from here. A UI-thread timer can never
            // know when React has committed the new children — raising opacity
            // before commit exposes the old trip's JSX for a frame. Opacity is
            // raised from a useEffect keyed on swipeGen (below), which React
            // guarantees runs AFTER commit.
          }
        });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        rotation.value = withSpring(0, { damping: 20, stiffness: 300 });
        behindProgress.value = withSpring(0, { damping: 20, stiffness: 300 });
        isGesturing.value = false;
      }
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const tapGesture = useMemo(() => Gesture.Tap()
    .maxDistance(10)
    .onStart(() => {
      'worklet';
      if (!isGesturing.value) {
        runOnJS(callTap)();
      }
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, tapGesture),
    [panGesture, tapGesture],
  );

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: cardScale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[cardStyle, cardAnimatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
});

// ─── Profile completion nudge card ────────────────────────────────────────────
// Shown in the feed after PROFILE_NUDGE_AT swipes; not swipeable — intentional
// tap targets only so the CTA is deliberate. Gated by hasSeenProfileNudge so it
// only ever shows once per install.
interface ProfileCompleteCardProps {
  userProfile: any;
  onComplete: () => void;
  onDismiss: () => void;
}

const NUDGE_FIELDS = [
  { key: 'bio', label: 'Bio' },
  { key: 'travelStyles', label: 'Travel Style', isArray: true },
  { key: 'travelPace', label: 'Travel Pace' },
  { key: 'socialEnergy', label: 'Social Energy' },
  { key: 'planningStyle', label: 'Planning Style' },
  { key: 'experience', label: 'Experience' },
  { key: 'languages', label: 'Languages', isArray: true },
  { key: 'placesVisited', label: 'Places Visited', isArray: true },
  { key: 'gender', label: 'Gender' },
  { key: 'travelWith', label: 'Travel Partner Pref' },
] as const;

const ACCENT_COLOR = '#F0EBE3';

/** Pulsing ring for the nudge card — matches OnboardingIntroSlide */
function NudgePulseRing({ size = 120 }: { size?: number }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.2], [0.06, 0.18]),
  }));
  return (
    <Animated.View style={[{
      position: 'absolute',
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: ACCENT_COLOR,
    }, style]} />
  );
}

/** Floating glass orb for the nudge card */
function NudgeOrb({ size = 40, dx = 0, dy = 0, delay = 0 }: { size?: number; dx?: number; dy?: number; delay?: number }) {
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    ));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: dx + interpolate(float.value, [0, 1], [0, 6]) },
      { translateY: dy + interpolate(float.value, [0, 1], [0, -10]) },
    ],
    opacity: interpolate(float.value, [0, 0.5, 1], [0.35, 0.65, 0.35]),
  }));
  return (
    <Animated.View style={[{
      position: 'absolute',
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: 'rgba(240,235,227,0.05)',
      borderWidth: 1, borderColor: 'rgba(240,235,227,0.1)',
    }, style]} />
  );
}

const ProfileCompleteCard = memo(function ProfileCompleteCard({
  userProfile, onComplete, onDismiss,
}: ProfileCompleteCardProps) {
  const filled = NUDGE_FIELDS.filter(f => {
    const val = userProfile?.[f.key];
    if (!val) return false;
    if ('isArray' in f && f.isArray) return Array.isArray(val) && val.length > 0;
    return true;
  });
  const total = NUDGE_FIELDS.length;
  const pct = Math.round((filled.length / total) * 100);
  const missing = NUDGE_FIELDS.filter(f => {
    const val = userProfile?.[f.key];
    if (!val) return true;
    if ('isArray' in f && f.isArray) return !Array.isArray(val) || val.length === 0;
    return false;
  }).slice(0, 3);

  return (
    <View style={{
      flex: 1,
      borderRadius: CARD_RADIUS,
      overflow: 'hidden',
      backgroundColor: '#000',
    }}>
      {/* Animated background elements */}
      <View style={{ position: 'absolute', top: '18%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
        <NudgePulseRing size={160} />
      </View>
      <NudgeOrb size={44} dx={-width * 0.28} dy={60} delay={200} />
      <NudgeOrb size={32} dx={width * 0.24} dy={80} delay={600} />
      <NudgeOrb size={28} dx={-width * 0.15} dy={height * 0.42} delay={400} />
      <NudgeOrb size={24} dx={width * 0.2} dy={height * 0.38} delay={800} />

      <View style={{ flex: 1, padding: 28, justifyContent: 'space-between', zIndex: 10 }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <View style={{
            width: 68, height: 68, borderRadius: 34,
            backgroundColor: 'rgba(240,235,227,0.09)',
            borderWidth: 1.5, borderColor: 'rgba(240,235,227,0.22)',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Text style={{ fontSize: 28 }}>✈️</Text>
          </View>
          <Text style={{
            color: '#fff', fontSize: 28, fontWeight: '800',
            fontFamily: 'Outfit-ExtraBold', letterSpacing: -0.6,
            textAlign: 'center', marginBottom: 8,
          }}>
            Get trips that{'\n'}actually fit you
          </Text>
          <Text style={{
            color: 'rgba(255,255,255,0.42)', fontSize: 14,
            fontFamily: 'Outfit-Regular', textAlign: 'center', lineHeight: 21,
          }}>
            Complete your travel DNA for more{'\n'}accurate matches
          </Text>
        </View>

        {/* Progress */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Outfit-SemiBold', fontWeight: '600' }}>
              Profile completion
            </Text>
            <Text style={{ color: ACCENT_COLOR, fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>
              {pct}%
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, marginBottom: 16 }}>
            <View style={{
              height: 4, backgroundColor: ACCENT_COLOR,
              borderRadius: 999, width: `${pct}%`,
            }} />
          </View>

          {/* Missing fields */}
          {missing.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              {missing.map(f => (
                <View key={f.key} style={{
                  backgroundColor: 'rgba(240,235,227,0.06)',
                  borderRadius: 999,
                  paddingHorizontal: 12, paddingVertical: 5,
                  borderWidth: 1, borderColor: 'rgba(240,235,227,0.12)',
                }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>
                    + {f.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* CTAs */}
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={onComplete}
            style={{
              backgroundColor: ACCENT_COLOR,
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>
              Complete Profile
            </Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: 'Outfit-Regular' }}>
              Maybe later
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

export default function TagAlongScreen() {
  const insets = useSafeAreaInsets();
  const [tripIndex, setTripIndex] = useState(0);
  const [showTripDetail, setShowTripDetail] = useState(false);
  const [showMyTrips, setShowMyTrips] = useState(false);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showTripCreatedBanner, setShowTripCreatedBanner] = useState(false);
  const [createdTripDestination, setCreatedTripDestination] = useState('');
  const [createdTripCoverImage, setCreatedTripCoverImage] = useState<string>('');
  const [showTripSearch, setShowTripSearch] = useState(false);
  const [tripSearchQuery, setTripSearchQuery] = useState('');
  const [selectedPersonProfile, setSelectedPersonProfile] = useState<PublicProfileData | null>(null);
  const [showPersonProfile, setShowPersonProfile] = useState(false);

  const [showTripJoinAnimation, setShowTripJoinAnimation] = useState<boolean>(false);
  const [joinedTripName, setJoinedTripName] = useState<string>('');
  const [joinedTripCover, setJoinedTripCover] = useState<string>('');
  const [joinedTripCrew, setJoinedTripCrew] = useState<string[]>([]);
  const [showSwipeLimitGate, setShowSwipeLimitGate] = useState<boolean>(false);
  const [showPremiumPaywall, setShowPremiumPaywall] = useState<boolean>(false);

  const [showSwipeTutorial, setShowSwipeTutorial] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(1);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenSwipeTutorial').then(val => {
      if (val !== 'true') setShowSwipeTutorial(true);
    });
  }, []);

  const router = useRouter();

  const isPremium = usePremiumStore(s => s.isPremium);

  const recordSwipe = useSwipeLimitStore(s => s.recordSwipe);
  const resetSwipesIfNeeded = useSwipeLimitStore(s => s.resetSwipesIfNeeded);

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
  const createDirectConversation = useCreateDirectConversation();

  const isAlreadyJoined = useCallback((tripId: string) => joinedTripsIds.has(tripId), [joinedTripsIds]);

  const createGroupChat = useMessagesStore(s => s.createGroupChat);

  const userProfile = useUserProfileStore(s => s.profile);
  const userPhoto = userProfile?.profilePhotos?.[0] ?? null;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEmailUser, setIsEmailUser] = useState<boolean>(false);
  useEffect(() => {
    getCurrentUserId().then(setCurrentUserId);
    supabase.auth.getSession().then(({ data: { session } }) => {
      const provider = session?.user?.app_metadata?.provider;
      setIsEmailUser(provider === 'email');
    });
  }, []);

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
        image: m.user?.profile_photo ?? null,
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
  const nextTrip = ALL_TRIPS.length > 0
    ? (ALL_TRIPS[(tripIndex + 1) % ALL_TRIPS.length] ?? null)
    : null;

  // Prefetch the next two trip cover images so they're in-cache by the time
  // they become the top card. Kills the "blank dark rectangle" frame after
  // a swipe while the image streams from the network.
  useEffect(() => {
    const len = ALL_TRIPS.length;
    if (len === 0) return;
    const next1 = ALL_TRIPS[(tripIndex + 1) % len];
    const next2 = ALL_TRIPS[(tripIndex + 2) % len];
    if (next1?.image) Image.prefetch(next1.image).catch(() => {});
    if (next2?.image) Image.prefetch(next2.image).catch(() => {});
  }, [tripIndex, ALL_TRIPS]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const behindProgress = useSharedValue(0);
  const isGesturing = useSharedValue(false);
  // Direction of the in-flight / just-completed swipe: -1 = pass (left),
  // +1 = join (right), 0 = idle. Drives the pass/join action screen that
  // fills the card slot during the commit gap (when cardOpacity = 0).
  const overlayDirection = useSharedValue(0);

  // Profile nudge: shown once after PROFILE_NUDGE_AT swipes
  const [hasSeenProfileNudge, setHasSeenProfileNudge] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem('hasSeenProfileNudge').then(val => {
      if (val === 'true') setHasSeenProfileNudge(true);
    });
  }, []);
  const dismissProfileNudge = useCallback(() => {
    setHasSeenProfileNudge(true);
    AsyncStorage.setItem('hasSeenProfileNudge', 'true');
  }, []);
  const showProfileNudge = !hasSeenProfileNudge && tripIndex >= PROFILE_NUDGE_AT;

  // Generation counter incremented on EVERY swipe completion (including
  // rate-limited ones). The useEffect below fires after React commits — this
  // is the only moment we can guarantee the new children are on screen, which
  // is the only moment it's safe to raise cardOpacity back to 1. Using tripIndex
  // alone wouldn't work: wrap-around (N → N on single-trip feeds) doesn't
  // re-render. swipeGen is monotonic and always triggers the effect.
  const [swipeGen, setSwipeGen] = useState(0);

  // Tracks which trip's Image has actually finished loading in the native
  // view. This is THE fix for the "Tokyo image with Barcelona text" bug:
  // React Native's <Image> retains the previous texture on its native view
  // until the new URI is decoded, so React-rendered text can update while
  // the image lags behind. We refuse to raise cardOpacity until the current
  // trip's image has confirmed its onLoad — guaranteeing text+image match
  // the frame the user sees.
  const [loadedTripId, setLoadedTripId] = useState<string | null>(null);

  useEffect(() => {
    if (swipeGen === 0) return; // skip initial mount
    // Only reveal when the CURRENT trip's image has fully loaded. If
    // loadedTripId lags behind currentTrip.id, this effect is a no-op —
    // it will re-run when setLoadedTripId fires in the Image's onLoad.
    if (!currentTrip || loadedTripId !== currentTrip.id) return;
    cardOpacity.value = withTiming(1, { duration: 60 });
  }, [swipeGen, loadedTripId, currentTrip, cardOpacity]);

  // Safety net: if an image fails or takes absurdly long to load (bad
  // network, 404, etc.), don't leave the user staring at a black card
  // forever. After 600ms, force-reveal regardless of load state.
  useEffect(() => {
    if (swipeGen === 0) return;
    const t = setTimeout(() => {
      cardOpacity.value = withTiming(1, { duration: 60 });
    }, 600);
    return () => clearTimeout(t);
  }, [swipeGen, cardOpacity]);

  const myTripsCardScale = useSharedValue(1);
  const myTripsCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: myTripsCardScale.value }] }));

  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    if (!isPremium && !isEmailUser && currentUserId !== null) {
      const allowed = recordSwipe();
      if (!allowed) {
        setShowSwipeLimitGate(true);
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        rotation.value = withTiming(0, { duration: 200 });
        cardScale.value = withTiming(1, { duration: 200 });
        // Card is hidden (cardOpacity=0 from worklet) and tripIndex didn't
        // change — must still bump swipeGen so the effect raises opacity back,
        // otherwise the card stays invisible behind the paywall.
        setSwipeGen(n => n + 1);
        return;
      }
    }

    Haptics.impactAsync(direction === 'right' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);

    if (direction === 'right' && currentTrip && !isAlreadyJoined(currentTrip.id)) {
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

    // NOTE: transform reset is handled on the UI thread inside the pan gesture's
    // flyoff-completion worklet (and in triggerSwipe's callback), behind an
    // opacity bridge. By the time this JS callback runs, the shared values are
    // already at 0/0/0 and the card is briefly invisible — so setTripIndex
    // swapping the children is guaranteed to commit into a centered, hidden
    // card, which then fades back in. No wrong-position frame is possible.

    if (tripIndex < ALL_TRIPS.length - 1) {
      setTripIndex(prev => prev + 1);
    } else {
      setTripIndex(0);
    }
    // Bump generation AFTER setTripIndex so React batches both into one render.
    // The effect keyed on swipeGen fires only after this render commits, which
    // is the first moment it's safe to raise cardOpacity — the new children
    // are guaranteed on screen. If tripIndex wrap-arounds (single-trip feeds
    // where N → N is a no-op re-render), swipeGen still changes and the effect
    // still fires.
    setSwipeGen(n => n + 1);
  }, [tripIndex, currentTrip, joinTrip, isAlreadyJoined, isPremium, isEmailUser, recordSwipe, translateX, translateY, rotation, cardScale, joinTripMutation]);

  const handleCardTap = useCallback(() => {
    if (!isGesturing.value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowTripDetail(true);
    }
  }, [isGesturing]);

  // ── Stable bridge for triggerSwipe (button-press initiated swipes) ───────────
  // The gesture system lives in the SwipeCard component above. This ref+callback
  // pair is only needed so triggerSwipe can call handleSwipeComplete without
  // having it as a dep (which would recreate the worklet on every render).
  const handleSwipeCompleteRef = useRef(handleSwipeComplete);
  handleSwipeCompleteRef.current = handleSwipeComplete;

  const stableSwipeComplete = useCallback((direction: 'left' | 'right') => {
    handleSwipeCompleteRef.current(direction);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerSwipe = useCallback((direction: 'left' | 'right') => {
    const targetX = direction === 'right' ? width * 1.5 : -width * 1.5;
    // Lock overlay direction for the pass/join action screen.
    overlayDirection.value = direction === 'right' ? 1 : -1;
    // Rise the behind card during the flyoff, same curve and duration.
    behindProgress.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
    translateX.value = withTiming(targetX, { duration: 140, easing: Easing.out(Easing.quad) }, (finished) => {
      'worklet';
      if (finished) {
        // Same atomic UI-thread swap as the pan gesture's completion.
        // Opacity is NOT raised here — see the pan gesture's flyoff worklet
        // for why. A useEffect keyed on swipeGen handles the raise, post-commit.
        cardOpacity.value = 0;
        translateX.value = 0;
        translateY.value = 0;
        rotation.value = 0;
        // Behind snaps to preview position while hidden — see the pan
        // gesture's completion worklet for the full rationale.
        behindProgress.value = 0;
        runOnJS(stableSwipeComplete)(direction);
      }
    });
  }, [stableSwipeComplete, translateX, translateY, rotation, cardOpacity, behindProgress, overlayDirection]);

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  // Behind card — driven by behindProgress (0 = small/behind, 1 = full/centered).
  // At 0: scaled 0.94, translated down 12px, 85% opaque (peeking).
  // At 1: scaled 1.0, translateY 0, fully opaque — visually identical to top.
  //
  // CRITICAL: opacity is MULTIPLIED by cardOpacity (the same gate the top card
  // uses during the post-swipe swap). When cardOpacity=0 (worklet hides the
  // scene during the children swap), the behind card is invisible too. This
  // is what prevents the "trip[N+2] flashes at main position" bug: during the
  // ~60ms of React commit + top fade-in, BOTH cards are hidden; they reveal
  // together after the useEffect raises cardOpacity back. No card can show
  // wrong content at the wrong position for any frame.
  const behindCardStyle = useAnimatedStyle(() => {
    const p = behindProgress.value;
    return {
      opacity: (0.85 + p * 0.15) * cardOpacity.value,
      transform: [
        { translateY: 12 - p * 12 },
        { scale: 0.94 + p * 0.06 },
      ],
    };
  });

  // Pass / Join action screens — fill the card slot during the brief commit
  // gap (the ~frames between the old card flying off and the new card's image
  // actually painting). Each screen is only visible when (a) its direction
  // matches the swipe, and (b) cardOpacity has dipped below 1. The formula
  // `1 - cardOpacity` means the screen is at full opacity exactly when the
  // card is fully hidden, then cross-fades out as the new card fades in.
  const passScreenStyle = useAnimatedStyle(() => {
    const active = overlayDirection.value < 0 ? 1 : 0;
    return { opacity: active * (1 - cardOpacity.value) };
  });
  const joinScreenStyle = useAnimatedStyle(() => {
    const active = overlayDirection.value > 0 ? 1 : 0;
    return { opacity: active * (1 - cardOpacity.value) };
  });

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
                  backgroundColor: 'rgba(0,0,0,0.48)',
                  borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)',
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, fontFamily: 'Outfit-ExtraBold' }}>
                    {matchPercentage}%
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>match</Text>
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

  const renderTripCard = () => {
    if (!currentTrip) return null;

    const matchPercentage = calculateTripMatch(userProfile, {
      id: currentTrip.id,
      destination: currentTrip.destination,
      country: currentTrip.country,
      vibes: currentTrip.vibes,
      people: currentTrip.people,
    });

    // Build the "going" label: "Alex, Maria +1 going" or "Alex going"
    const visiblePeople = currentTrip.people.slice(0, 2);
    const extraCount = currentTrip.people.length - visiblePeople.length;
    const goingLabel = visiblePeople.map(p => p.name.split(' ')[0]).join(', ')
      + (extraCount > 0 ? ` +${extraCount}` : '')
      + ' going';

    return (
      <View style={{ flex: 1, borderRadius: CARD_RADIUS, overflow: 'hidden', backgroundColor: '#000' }}>

        {/* Full-bleed photo */}
        <Image
          key={currentTrip.id}
          source={{ uri: currentTrip.image }}
          onLoad={() => setLoadedTripId(currentTrip.id)}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
        />

        {/* Gradient — transparent top half, darkens only from ~45% down */}
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)', 'rgba(0,0,0,0.97)']}
          locations={[0, 0.38, 0.60, 0.80, 1]}
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
          {/* Match % — glass style */}
          <View style={{
            backgroundColor: 'rgba(0,0,0,0.48)',
            borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)',
            paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20,
            flexDirection: 'row', alignItems: 'center', gap: 3,
          }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, fontFamily: 'Outfit-ExtraBold' }}>{matchPercentage}%</Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>match</Text>
          </View>

          {currentTrip.isAlreadyJoined && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: COLORS.accentDim, borderWidth: 0.5, borderColor: COLORS.accentBorder,
              paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20,
            }}>
              <Text style={{ color: COLORS.forestGreen, fontSize: 12, fontFamily: 'Outfit-Regular' }}>✓</Text>
              <Text style={{ color: COLORS.forestGreen, fontWeight: '600', fontSize: 12, fontFamily: 'Outfit-SemiBold' }}>Joined</Text>
            </View>
          )}
        </View>

        {/* Bottom content — overlaid on gradient */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12 }}>

          {/* Country */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <MapPin size={11} color={COLORS.forestGreen} strokeWidth={2} />
            <Text style={{ color: COLORS.forestGreen, fontSize: 12, fontWeight: '500', fontFamily: 'Outfit-Regular' }}>{currentTrip.country}</Text>
          </View>

          {/* Destination */}
          <Text style={{
            color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -1.3,
            lineHeight: 36, marginBottom: 8, fontFamily: 'Outfit-ExtraBold',
          }}>
            {currentTrip.destination}
          </Text>

          {/* Dates + Budget row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 9 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Calendar size={12} color="rgba(255,255,255,0.55)" strokeWidth={2} />
              <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>{currentTrip.dates}</Text>
            </View>
            {currentTrip.budget ? (
              <>
                <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <DollarSign size={12} color="rgba(255,255,255,0.55)" strokeWidth={2} />
                  <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>{currentTrip.budget}</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Short description */}
          <Text
            numberOfLines={2}
            style={{
              color: 'rgba(255,255,255,0.60)', fontSize: 13, lineHeight: 18,
              marginBottom: 10, fontFamily: 'Outfit-Regular',
            }}
          >
            {currentTrip.description}
          </Text>

          {/* Vibe pills */}
          <View style={{ flexDirection: 'row', gap: 5, marginBottom: 13, flexWrap: 'nowrap' }}>
            {currentTrip.vibes.slice(0, 3).map((vibe, i) => (
              <View key={i} style={{
                backgroundColor: COLORS.glass, borderWidth: 0.5, borderColor: COLORS.glassBorder,
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: '500', fontFamily: 'Outfit-Regular' }}>{vibe}</Text>
              </View>
            ))}
          </View>

          {/* Avatar row with names */}
          {currentTrip.people.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Overlapping avatar circles */}
              <View style={{ flexDirection: 'row' }}>
                {currentTrip.people.slice(0, 4).map((person, i) => (
                  <View key={i} style={{
                    marginLeft: i === 0 ? 0 : -9,
                    width: 30, height: 30, borderRadius: 15,
                    borderWidth: 1.5, borderColor: '#000',
                    overflow: 'hidden', backgroundColor: '#1a1a1a',
                  }}>
                    <Image source={{ uri: person.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                ))}
                {currentTrip.people.length > 4 && (
                  <View style={{
                    marginLeft: -9, width: 30, height: 30, borderRadius: 15,
                    borderWidth: 1.5, borderColor: '#000',
                    backgroundColor: COLORS.glass,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>
                      +{currentTrip.people.length - 4}
                    </Text>
                  </View>
                )}
              </View>

              {/* Names label */}
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: 'Outfit-Regular', flex: 1 }} numberOfLines={1}>
                {goingLabel}
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

        {/* ── Card stack ── */}
        <View style={{ paddingHorizontal: H_PAD / 2, backgroundColor: '#000', height: CARD_HEIGHT + 8, zIndex: 1 }}>
          {/* Action screens — sit at the bottom of the stack so they only show
              through when both cards are hidden (the commit gap after a swipe).
              Variant picked by overlayDirection; opacity gated by cardOpacity.
              pointerEvents="none" so gestures still reach the top card. */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: H_PAD / 2, right: H_PAD / 2, top: 0,
                height: CARD_HEIGHT,
                borderRadius: CARD_RADIUS,
                overflow: 'hidden',
                backgroundColor: 'rgba(255,69,58,0.18)',
                borderWidth: 1,
                borderColor: 'rgba(255,69,58,0.35)',
                alignItems: 'center',
                justifyContent: 'center',
              },
              passScreenStyle,
            ]}
          >
            <LinearGradient
              colors={['rgba(255,69,58,0.05)', 'rgba(255,69,58,0.25)', 'rgba(20,0,0,0.95)']}
              locations={[0, 0.55, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View style={{
              width: 96, height: 96, borderRadius: 48,
              borderWidth: 3, borderColor: COLORS.warmRed,
              backgroundColor: 'rgba(255,69,58,0.14)',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 18,
            }}>
              <X size={52} color={COLORS.warmRed} strokeWidth={3} />
            </View>
            <Text style={{
              color: COLORS.warmRed, fontSize: 30, fontWeight: '900',
              fontFamily: 'Outfit-ExtraBold', letterSpacing: 3,
            }}>
              PASSED
            </Text>
            <Text style={{
              color: 'rgba(255,255,255,0.55)', fontSize: 13,
              fontFamily: 'Outfit-Regular', marginTop: 6, letterSpacing: 0.4,
            }}>
              Not your vibe
            </Text>
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: H_PAD / 2, right: H_PAD / 2, top: 0,
                height: CARD_HEIGHT,
                borderRadius: CARD_RADIUS,
                overflow: 'hidden',
                backgroundColor: 'rgba(240,235,227,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(240,235,227,0.35)',
                alignItems: 'center',
                justifyContent: 'center',
              },
              joinScreenStyle,
            ]}
          >
            <LinearGradient
              colors={['rgba(240,235,227,0.05)', 'rgba(240,235,227,0.22)', 'rgba(10,10,10,0.95)']}
              locations={[0, 0.55, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View style={{
              width: 96, height: 96, borderRadius: 48,
              borderWidth: 3, borderColor: COLORS.forestGreen,
              backgroundColor: 'rgba(240,235,227,0.14)',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 18,
            }}>
              <Check size={52} color={COLORS.forestGreen} strokeWidth={3} />
            </View>
            <Text style={{
              color: COLORS.forestGreen, fontSize: 30, fontWeight: '900',
              fontFamily: 'Outfit-ExtraBold', letterSpacing: 3,
            }}>
              JOINED
            </Text>
            <Text style={{
              color: 'rgba(255,255,255,0.55)', fontSize: 13,
              fontFamily: 'Outfit-Regular', marginTop: 6, letterSpacing: 0.4,
            }}>
              Let's go!
            </Text>
          </Animated.View>

          {/* Behind card — the REAL next trip, rising into place as you drag.
              pointerEvents="none" so taps/pans all target the top SwipeCard. */}
          {nextTrip && (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: H_PAD / 2, right: H_PAD / 2, top: 0,
                  height: CARD_HEIGHT,
                  borderRadius: CARD_RADIUS,
                  overflow: 'hidden',
                },
                behindCardStyle,
              ]}
            >
              <NextTripPreview trip={nextTrip} />
            </Animated.View>
          )}

          {/* Profile nudge card — replaces the swipe card for one appearance */}
          {showProfileNudge ? (
            <View style={{
              position: 'absolute',
              left: H_PAD / 2, right: H_PAD / 2, top: 0,
              height: CARD_HEIGHT,
            }}>
              <ProfileCompleteCard
                userProfile={userProfile}
                onComplete={() => {
                  dismissProfileNudge();
                  router.push('/(tabs)/profile');
                }}
                onDismiss={() => {
                  dismissProfileNudge();
                }}
              />
            </View>
          ) : (
            <SwipeCard
              cardStyle={{ borderRadius: CARD_RADIUS, overflow: 'hidden', height: CARD_HEIGHT }}
              translateX={translateX}
              translateY={translateY}
              rotation={rotation}
              cardScale={cardScale}
              cardOpacity={cardOpacity}
              behindProgress={behindProgress}
              overlayDirection={overlayDirection}
              isGesturing={isGesturing}
              onSwipeComplete={handleSwipeComplete}
              onTap={handleCardTap}
            >
              {renderTripCard()}
            </SwipeCard>
          )}
        </View>

        {/* ── My Trips ── */}
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
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
        </View>

      </SafeAreaView>

      {/* Modals */}
      {renderTripDetailModal()}
      <MyTripsModal visible={showMyTrips} onClose={() => setShowMyTrips(false)} />
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
              start_date: data.startDate ?? null,
              end_date: data.endDate ?? null,
              age_min: data.ageMin ?? null,
              age_max: data.ageMax ?? null,
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
