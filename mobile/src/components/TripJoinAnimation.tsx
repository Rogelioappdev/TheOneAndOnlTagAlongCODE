import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
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
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Font } from '@/lib/theme';

const { width, height } = Dimensions.get('window');
const ACCENT = Colors.accent;

// Corner start positions for crew photos flying in
const CORNERS = [
  { x: -width * 0.55, y: -height * 0.28 },  // top-left
  { x:  width * 0.55, y: -height * 0.28 },  // top-right
  { x: -width * 0.55, y:  height * 0.28 },  // bottom-left
  { x:  width * 0.55, y:  height * 0.28 },  // bottom-right
];

const PHOTO_SIZE   = 58;
const PHOTO_GAP    = 10;
const PHOTO_BORDER = 2.5;

// ─── Single crew photo ────────────────────────────────────────────────────────
function CrewPhoto({ uri, index, triggered }: { uri: string; index: number; triggered: boolean }) {
  const tx = useSharedValue(CORNERS[index % 4].x);
  const ty = useSharedValue(CORNERS[index % 4].y);
  const op = useSharedValue(0);
  const sc = useSharedValue(0.4);

  useEffect(() => {
    if (!triggered) {
      tx.value = CORNERS[index % 4].x;
      ty.value = CORNERS[index % 4].y;
      op.value = 0;
      sc.value = 0.4;
      return;
    }
    const delay = index * 160;
    op.value = withDelay(delay, withTiming(1, { duration: 350 }));
    tx.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 70 }));
    ty.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 70 }));
    sc.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
  }, [triggered]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: sc.value }],
  }));

  return (
    <Animated.View style={[styles.crewPhoto, style]}>
      <Image source={{ uri }} style={styles.crewImg} contentFit="cover" />
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface TripJoinAnimationProps {
  visible: boolean;
  onComplete: () => void;
  tripDestination: string;
  coverImage?: string;
  crewPhotos?: string[];
}

export default function TripJoinAnimation({
  visible,
  onComplete,
  tripDestination,
  coverImage,
  crewPhotos = [],
}: TripJoinAnimationProps) {
  // Animation values
  const bgOpacity      = useSharedValue(0);
  const bgScale        = useSharedValue(1.06);
  const overlayOpacity = useSharedValue(0);
  const titleScale     = useSharedValue(0.3);
  const titleOpacity   = useSharedValue(0);
  const subtitleOp     = useSharedValue(0);
  const crewTriggered  = React.useRef(false);
  const [crewVisible, setCrwVisible] = React.useState(false);
  const pillY          = useSharedValue(28);
  const pillOp         = useSharedValue(0);
  const arrowX         = useSharedValue(0);
  const exitOpacity    = useSharedValue(1);

  const photos = crewPhotos.slice(0, 4);

  const resetAll = useCallback(() => {
    bgOpacity.value      = 0;
    bgScale.value        = 1.06;
    overlayOpacity.value = 0;
    titleScale.value     = 0.3;
    titleOpacity.value   = 0;
    subtitleOp.value     = 0;
    pillY.value          = 28;
    pillOp.value         = 0;
    arrowX.value         = 0;
    exitOpacity.value    = 1;
    crewTriggered.current = false;
    setCrwVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) {
      resetAll();
      return;
    }

    // Phase 1 — image breathes in (0ms)
    bgOpacity.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.ease) });
    bgScale.value   = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Phase 2 — darkness settles (350ms)
    overlayOpacity.value = withDelay(350, withTiming(1, { duration: 600 }));

    // Phase 3 — "YOU'RE IN." slams in (950ms)
    titleOpacity.value = withDelay(950, withTiming(1, { duration: 180 }));
    titleScale.value   = withDelay(950, withSpring(1, { damping: 9, stiffness: 180 }));
    const t1 = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 960);

    // Phase 4 — destination breathes in (1300ms)
    subtitleOp.value = withDelay(1300, withTiming(1, { duration: 500 }));

    // Phase 5 — crew photos fly in from corners (1750ms, staggered)
    const t2 = setTimeout(() => {
      setCrwVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1750);

    // Phase 6 — pill CTA slides up (2700ms)
    pillOp.value = withDelay(2700, withTiming(1, { duration: 500 }));
    pillY.value  = withDelay(2700, withSpring(0, { damping: 20, stiffness: 140 }));
    arrowX.value = withDelay(3000, withRepeat(
      withSequence(
        withTiming(6,  { duration: 550, easing: Easing.inOut(Easing.ease) }),
        withTiming(0,  { duration: 550, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    ));

    // Phase 7 — hold + exit fade (4400ms)
    const t3 = setTimeout(() => {
      exitOpacity.value = withTiming(0, { duration: 600, easing: Easing.in(Easing.ease) });
    }, 4400);

    // Phase 8 — complete (5000ms)
    const t4 = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [visible]);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    transform: [{ scale: bgScale.value }],
  }));
  const overlayStyle  = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const titleStyle    = useAnimatedStyle(() => ({
    opacity:   titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOp.value }));
  const pillStyle     = useAnimatedStyle(() => ({
    opacity:   pillOp.value,
    transform: [{ translateY: pillY.value }],
  }));
  const arrowStyle    = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowX.value }],
  }));
  const exitStyle     = useAnimatedStyle(() => ({ opacity: exitOpacity.value }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.base, exitStyle]}>

        {/* Cover image — fills screen */}
        <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
          {!!coverImage && (
            <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}
        </Animated.View>

        {/* Dark overlay */}
        <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
            <LinearGradient
              colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0.52)', 'rgba(0,0,0,0.72)']}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>

        {/* Main content */}
        <View style={styles.content} pointerEvents="none">

          {/* "YOU'RE IN." */}
          <Animated.Text style={[styles.title, titleStyle]}>
            YOU'RE IN.
          </Animated.Text>

          {/* Destination */}
          <Animated.Text style={[styles.subtitle, subtitleStyle]}>
            {tripDestination} is your next adventure.
          </Animated.Text>

          {/* Crew photos row — fly in from corners */}
          {photos.length > 0 && (
            <View style={styles.crewRow}>
              {photos.map((uri, i) => (
                <CrewPhoto key={i} uri={uri} index={i} triggered={crewVisible} />
              ))}
            </View>
          )}
        </View>

        {/* Bottom CTA pill */}
        <Animated.View style={[styles.pill, pillStyle]} pointerEvents="none">
          <Text style={styles.pillText}>Your crew is waiting in Messages</Text>
          <Animated.Text style={[styles.pillArrow, arrowStyle]}>→</Animated.Text>
        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  base: {
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontFamily: Font.extraBold,
    fontSize: 62,
    color: '#fff',
    letterSpacing: -2,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: Font.semiBold,
    fontSize: 18,
    color: ACCENT,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 52,
  },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PHOTO_GAP,
    marginTop: 8,
  },
  crewPhoto: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    overflow: 'hidden',
    borderWidth: PHOTO_BORDER,
    borderColor: ACCENT,
  },
  crewImg: {
    width: '100%',
    height: '100%',
  },
  pill: {
    position: 'absolute',
    bottom: 72,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  pillText: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: -0.2,
  },
  pillArrow: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: ACCENT,
  },
});
