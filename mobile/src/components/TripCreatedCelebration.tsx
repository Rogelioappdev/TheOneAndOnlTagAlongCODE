 import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plane,
  MapPin,
  Star,
  Mountain,
  Sun,
  Zap,
  Compass,
  Globe,
  Heart,
  Camera,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Font, FontSize } from '@/lib/theme';

const { width, height } = Dimensions.get('window');
const FIRST_TRIP_KEY = 'tagalong_has_seen_trip_created_v1';

// ─── Particle types ───────────────────────────────────────────────────────────
type IconComponent = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

type ParticleData = {
  id: number;
  Icon: IconComponent;
  targetX: number;
  targetY: number;
  finalRotation: number;
  iconSize: number;
  delay: number;
};

const ICON_POOL: IconComponent[] = [
  Plane, MapPin, Star, Mountain, Sun, Zap, Compass, Globe, Heart, Camera,
];

function generateParticles(): ParticleData[] {
  return Array.from({ length: 16 }, (_, i) => ({
    id: i,
    Icon: ICON_POOL[i % ICON_POOL.length],
    targetX: (Math.random() - 0.5) * width * 1.4,
    targetY: (Math.random() - 0.5) * height * 0.85,
    finalRotation: Math.random() * 720 - 360,
    iconSize: 14 + Math.floor(Math.random() * 14),
    delay: 300 + Math.floor(Math.random() * 500),
  }));
}

// ─── Single Particle ──────────────────────────────────────────────────────────
function ParticleItem({
  particle,
  triggered,
}: {
  particle: ParticleData;
  triggered: boolean;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rot = useSharedValue(0);
  const scale = useSharedValue(0.2);

  useEffect(() => {
    if (!triggered) {
      x.value = 0;
      y.value = 0;
      opacity.value = 0;
      rot.value = 0;
      scale.value = 0.2;
      return;
    }
    const d = particle.delay;
    const dur = 1000;

    opacity.value = withDelay(
      d,
      withSequence(
        withTiming(0.92, { duration: 200 }),
        withDelay(600, withTiming(0, { duration: 450 })),
      ),
    );
    x.value = withDelay(d, withTiming(particle.targetX, { duration: dur, easing: Easing.out(Easing.cubic) }));
    y.value = withDelay(d, withTiming(particle.targetY, { duration: dur, easing: Easing.out(Easing.cubic) }));
    rot.value = withDelay(d, withTiming(particle.finalRotation, { duration: dur, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(d, withSpring(1, { damping: 10, stiffness: 180 }));
  }, [triggered]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rot.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const IconComponent = particle.Icon;
  return (
    <Animated.View style={[styles.particle, animStyle]}>
      <IconComponent size={particle.iconSize} color={Colors.accent} strokeWidth={1.5} />
    </Animated.View>
  );
}

// ─── Onboarding card data ─────────────────────────────────────────────────────
const CARD_DATA = [
  {
    emoji: '✈️',
    title: "You're on the feed",
    body: (dest: string) =>
      `Travelers near ${dest} can now see your trip and join.`,
  },
  {
    emoji: '🔔',
    title: "We'll let you know",
    body: () =>
      "You'll get a push notification the moment someone joins your trip.",
  },
  {
    emoji: '💬',
    title: 'Group chat in Messages',
    body: () =>
      'Once you accept co-travelers, they will automatically join your group chat in your Messages tab.',
  },
];

// ─── Onboarding Card ──────────────────────────────────────────────────────────
function OnboardingCard({
  step,
  destination,
  onNext,
  isLast,
}: {
  step: number;
  destination: string;
  onNext: () => void;
  isLast: boolean;
}) {
  const card = CARD_DATA[step];
  const slideX = useSharedValue(width);

  useEffect(() => {
    slideX.value = width;
    slideX.value = withSpring(0, { damping: 22, stiffness: 200 });
  }, [step]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.cardWrap, slideStyle]}>
      <Text style={styles.cardEmoji}>{card.emoji}</Text>
      <Text style={styles.cardTitle}>{card.title}</Text>
      <Text style={styles.cardBody}>{card.body(destination)}</Text>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {CARD_DATA.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <Pressable
        onPress={onNext}
        style={styles.nextBtn}
      >
        <Text style={styles.nextBtnText}>
          {isLast ? "Let's go! 🎉" : 'Next →'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface TripCreatedCelebrationProps {
  visible: boolean;
  destination: string;
  coverImage?: string;
  onComplete: () => void;
}

export default function TripCreatedCelebration({
  visible,
  destination,
  coverImage,
  onComplete,
}: TripCreatedCelebrationProps) {
  const [phase, setPhase] = useState<'idle' | 'celebration' | 'onboarding'>('idle');
  const [particlesTriggered, setParticlesTriggered] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const particles = useMemo(generateParticles, []);

  // ── Shared animation values ──
  const overlayOpacity   = useSharedValue(0);
  const titleScale       = useSharedValue(0.6);
  const titleOpacity     = useSharedValue(0);
  const subtitleOpacity  = useSharedValue(0);
  const pill1Opacity     = useSharedValue(0);
  const pill2Opacity     = useSharedValue(0);
  const pill3Opacity     = useSharedValue(0);
  const exitOpacity      = useSharedValue(1);

  const resetAll = useCallback(() => {
    overlayOpacity.value  = 0;
    titleScale.value      = 0.6;
    titleOpacity.value    = 0;
    subtitleOpacity.value = 0;
    pill1Opacity.value    = 0;
    pill2Opacity.value    = 0;
    pill3Opacity.value    = 0;
    exitOpacity.value     = 1;
    setParticlesTriggered(false);
    setOnboardingStep(0);
    setPhase('idle');
  }, []);

  useEffect(() => {
    if (!visible) {
      resetAll();
      return;
    }

    setPhase('celebration');

    // Phase 1 — overlay + image fade in (0ms)
    overlayOpacity.value = withTiming(1, { duration: 400 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Phase 2 — particles (350ms)
    const t1 = setTimeout(() => setParticlesTriggered(true), 350);

    // Phase 3 — title (800ms)
    titleOpacity.value = withDelay(800, withTiming(1, { duration: 380 }));
    titleScale.value   = withDelay(800, withSpring(1, { damping: 12, stiffness: 200 }));
    const t2 = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 900);

    // subtitle (1150ms)
    subtitleOpacity.value = withDelay(1150, withTiming(1, { duration: 350 }));

    // Phase 4 — pills (1550, 1850, 2150ms)
    pill1Opacity.value = withDelay(1550, withTiming(1, { duration: 280 }));
    pill2Opacity.value = withDelay(1850, withTiming(1, { duration: 280 }));
    pill3Opacity.value = withDelay(2150, withTiming(1, { duration: 280 }));

    // Phase 5 — exit fade (3300ms)
    const t3 = setTimeout(() => {
      exitOpacity.value = withTiming(0, { duration: 500 });
    }, 3300);

    // Transition to onboarding or complete (3900ms)
    const t4 = setTimeout(() => {
      AsyncStorage.getItem(FIRST_TRIP_KEY).then((val) => {
        if (val === null) {
          AsyncStorage.setItem(FIRST_TRIP_KEY, 'seen');
          overlayOpacity.value = withTiming(1, { duration: 0 });
          exitOpacity.value    = 1;
          setPhase('onboarding');
        } else {
          onComplete();
        }
      });
    }, 3900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [visible]);

  // ── Animated styles ──
  const overlayStyle  = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const exitStyle     = useAnimatedStyle(() => ({ opacity: exitOpacity.value }));
  const titleStyle    = useAnimatedStyle(() => ({
    opacity:   titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const pill1Style    = useAnimatedStyle(() => ({
    opacity:   pill1Opacity.value,
    transform: [{ translateY: interpolate(pill1Opacity.value, [0, 1], [8, 0]) }],
  }));
  const pill2Style    = useAnimatedStyle(() => ({
    opacity:   pill2Opacity.value,
    transform: [{ translateY: interpolate(pill2Opacity.value, [0, 1], [8, 0]) }],
  }));
  const pill3Style    = useAnimatedStyle(() => ({
    opacity:   pill3Opacity.value,
    transform: [{ translateY: interpolate(pill3Opacity.value, [0, 1], [8, 0]) }],
  }));

  const handleNextCard = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onboardingStep < 2) {
      setOnboardingStep((s) => s + 1);
    } else {
      onComplete();
    }
  }, [onboardingStep, onComplete]);

  if (!visible && phase === 'idle') return null;

  return (
    <Modal
      visible={visible || phase !== 'idle'}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      {/* Base black layer */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.base, overlayStyle]}>

        {/* Full-bleed trip image */}
        {!!coverImage && (
          <Image
            source={{ uri: coverImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        )}
        {/* Dark gradient overlay for text readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.65)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* ── CELEBRATION PHASE ── */}
        {phase === 'celebration' && (
          <Animated.View style={[StyleSheet.absoluteFill, exitStyle]}>

            {/* Particles — rendered above ribbons */}
            <View style={styles.particleContainer}>
              {particles.map((p) => (
                <ParticleItem key={p.id} particle={p} triggered={particlesTriggered} />
              ))}
            </View>

            {/* Center text */}
            <View style={styles.centerContent} pointerEvents="none">
              <Animated.Text style={[styles.mainTitle, titleStyle]}>
                Trip Created.
              </Animated.Text>
              <Animated.Text style={[styles.subtitle, subtitleStyle]}>
                {destination} is live.
              </Animated.Text>
            </View>

            {/* Info pills */}
            <View style={styles.pillsContainer} pointerEvents="none">
              <Animated.View style={[styles.pill, pill1Style]}>
                <Text style={styles.pillEmoji}>✈️</Text>
                <Text style={styles.pillText}>Your trip is live on the feed</Text>
              </Animated.View>
              <Animated.View style={[styles.pill, pill2Style]}>
                <Text style={styles.pillEmoji}>🔔</Text>
                <Text style={styles.pillText}>You'll hear when someone joins</Text>
              </Animated.View>
              <Animated.View style={[styles.pill, pill3Style]}>
                <Text style={styles.pillEmoji}>💬</Text>
                <Text style={styles.pillText}>Group chat ready in Messages</Text>
              </Animated.View>
            </View>
          </Animated.View>
        )}

        {/* ── ONBOARDING PHASE (first trip only) ── */}
        {phase === 'onboarding' && (
          <OnboardingCard
            step={onboardingStep}
            destination={destination}
            onNext={handleNextCard}
            isLast={onboardingStep === 2}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  base: {
    backgroundColor: '#000000',
  },

  // Particles
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },

  // Center text
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  mainTitle: {
    fontFamily: Font.extraBold,
    fontSize: 52,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1.5,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: Font.extraBold,
    fontSize: 22,
    color: Colors.accent,
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  // Info pills
  pillsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  pillEmoji: {
    fontSize: 18,
  },
  pillText: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },

  // Onboarding cards
  cardWrap: {
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  cardEmoji: {
    fontSize: 64,
    marginBottom: 28,
  },
  cardTitle: {
    fontFamily: Font.extraBold,
    fontSize: FontSize.xl,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.8,
    marginBottom: 16,
  },
  cardBody: {
    fontFamily: Font.regular,
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 20,
    borderRadius: 3,
  },
  nextBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  nextBtnText: {
    fontFamily: Font.bold,
    fontSize: FontSize.md,
    color: '#000000',
    letterSpacing: -0.2,
  },
});
