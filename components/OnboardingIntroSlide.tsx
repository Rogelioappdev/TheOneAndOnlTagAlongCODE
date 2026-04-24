import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, Dimensions, Image, StyleSheet, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  interpolate,
  runOnJS,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Plane } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications } from '@/lib/notifications';

const { width, height } = Dimensions.get('window');

const ACCENT = '#F0EBE3';
const NOTIFIED_KEY = 'tagalong_notified_waitlist';
const CARD_W  = width * 0.76;
const CARD_H  = height * 0.46;

const OB = 'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/';

const CARDS = [
  { image: OB + 'P1.jpeg', dest: 'Bali, Indonesia',   vibe: '🏄  Beach · Culture'  },
  { image: OB + 'P2.jpeg', dest: 'Tokyo, Japan',       vibe: '🌸  City · Nightlife'  },
  { image: OB + 'P3.jpeg', dest: 'Santorini, Greece',  vibe: '🌊  Island · Relaxed'  },
];

const PEOPLE_POS = [
  { dx: -110, dy: -80  },
  { dx:  110, dy: -60  },
  { dx:    0, dy: -145 },
  { dx: -100, dy:  90  },
  { dx:  100, dy:  90  },
];

const FALLBACK_URIS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&q=80',
];

// ─── Scene 0 — Trip Cards ─────────────────────────────────────────────────────
function TripCardsScene({ onNext }: { onNext: () => void }) {
  const [userCanSwipe, setUserCanSwipe] = useState<boolean>(false);

  const autoX   = useSharedValue(0);
  const autoR   = useSharedValue(0);
  const autoOp  = useSharedValue(1);
  const badgeOp = useSharedValue(0);
  const badgeSc = useSharedValue(0.5);
  const posP    = useSharedValue(0);
  const userX   = useSharedValue(0);
  const userR   = useSharedValue(0);
  const canSwipe = useSharedValue(0);
  const groupOp = useSharedValue(1);

  useEffect(() => {
    badgeOp.value = withDelay(2400, withTiming(1, { duration: 350 }));
    badgeSc.value = withDelay(2400, withSpring(1, { damping: 10, stiffness: 200 }));
    autoX.value   = withDelay(3200, withTiming(width * 1.4, { duration: 820, easing: Easing.out(Easing.cubic) }));
    autoR.value   = withDelay(3200, withTiming(18, { duration: 820 }));
    autoOp.value  = withDelay(3450, withTiming(0, { duration: 380 }));
    const t = setTimeout(() => {
      canSwipe.value = 1;
      posP.value = withSpring(1, { damping: 22, stiffness: 110 });
      setUserCanSwipe(true);
    }, 4300);
    return () => clearTimeout(t);
  }, []);

  const onUserSwiped = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    groupOp.value = withTiming(0, { duration: 500, easing: Easing.ease });
    setTimeout(onNext, 580);
  }, [onNext]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (canSwipe.value === 0) return;
      userX.value = e.translationX;
      userR.value = interpolate(e.translationX, [-160, 160], [-14, 14], 'clamp');
    })
    .onEnd((e) => {
      if (canSwipe.value === 0) return;
      const past = Math.abs(e.translationX) > width * 0.28 || Math.abs(e.velocityX) > 700;
      if (past) {
        const dir = (e.translationX > 0 || e.velocityX > 0) ? 1 : -1;
        userX.value = withTiming(dir * (width + 120), { duration: 400, easing: Easing.in(Easing.quad) });
        userR.value = withTiming(dir * 22, { duration: 400 });
        runOnJS(onUserSwiped)();
      } else {
        userX.value = withSpring(0, { damping: 16, stiffness: 200 });
        userR.value = withSpring(0);
      }
    });

  const c0Style = useAnimatedStyle(() => ({
    top:  interpolate(posP.value, [0, 1], [14, 7]),
    left: interpolate(posP.value, [0, 1], [-18, -8]),
    transform: [
      { rotate: `${interpolate(posP.value, [0, 1], [-6, -3])}deg` },
      { scale:   interpolate(posP.value, [0, 1], [0.89, 0.945]) },
    ],
  }));

  const c1PosStyle = useAnimatedStyle(() => ({
    top:  interpolate(posP.value, [0, 1], [7, 0]),
    left: interpolate(posP.value, [0, 1], [-8, 0]),
    transform: [
      { rotate: `${interpolate(posP.value, [0, 1], [-3, 0])}deg` },
      { scale:   interpolate(posP.value, [0, 1], [0.945, 1]) },
    ],
  }));

  const c1GestureStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: userX.value }, { rotate: `${userR.value}deg` }],
  }));

  const c2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: autoX.value }, { rotate: `${autoR.value}deg` }],
    opacity: autoOp.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOp.value,
    transform: [{ scale: badgeSc.value }],
  }));

  const groupStyle = useAnimatedStyle(() => ({ opacity: groupOp.value }));

  return (
    <View style={s.scene}>
      <Animated.View entering={FadeInDown.delay(200).springify()} style={s.textBlock}>
        <Text style={s.sceneTitle}>Discover trips</Text>
        <Text style={s.sceneSub}>Real group adventures await</Text>
      </Animated.View>

      <Animated.View style={[{ width: CARD_W, height: CARD_H, position: 'relative' }, groupStyle]}>
        {/* CARDS[0] — back → mid */}
        <Animated.View style={[s.cardOuter, { zIndex: 1 }, c0Style]}>
          <View style={s.cardInner}>
            <Image source={{ uri: CARDS[0].image }} style={s.cardImg} resizeMode="cover" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={s.cardGrad} />
            <View style={s.cardLabel}>
              <Text style={s.cardDest}>{CARDS[0].dest}</Text>
              <Text style={s.cardVibe}>{CARDS[0].vibe}</Text>
            </View>
          </View>
        </Animated.View>

        {/* CARDS[1] — mid → top + user gesture */}
        <Animated.View style={[s.cardOuter, { zIndex: 2 }, c1PosStyle]}>
          <GestureDetector gesture={pan}>
            <Animated.View style={[s.cardInner, c1GestureStyle]}>
              <Image source={{ uri: CARDS[1].image }} style={s.cardImg} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={s.cardGrad} />
              {userCanSwipe && (
                <Animated.View entering={FadeIn.delay(400)} style={s.swipeHintBadge}>
                  <Text style={s.swipeHintText}>← swipe →</Text>
                </Animated.View>
              )}
              <View style={s.cardLabel}>
                <Text style={s.cardDest}>{CARDS[1].dest}</Text>
                <Text style={s.cardVibe}>{CARDS[1].vibe}</Text>
              </View>
            </Animated.View>
          </GestureDetector>
        </Animated.View>

        {/* CARDS[2] — top, auto-swipes with JOIN badge */}
        <Animated.View style={[s.cardOuter, s.cardInner, { zIndex: 3, top: 0, left: 0 }, c2Style]}>
          <Image source={{ uri: CARDS[2].image }} style={s.cardImg} resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={s.cardGrad} />
          <Animated.View style={[s.joinBadge, badgeStyle]}>
            <Text style={s.joinText}>JOIN ✓</Text>
          </Animated.View>
          <View style={s.cardLabel}>
            <Text style={s.cardDest}>{CARDS[2].dest}</Text>
            <Text style={s.cardVibe}>{CARDS[2].vibe}</Text>
          </View>
        </Animated.View>
      </Animated.View>

      <View style={{ height: 64, justifyContent: 'center', alignItems: 'center' }}>
        {userCanSwipe && (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={{ alignItems: 'center' }}>
            <Text style={s.swipePrompt}>Your turn — swipe a trip</Text>
            <Text style={s.swipePromptSub}>Swipe left or right to explore</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ─── Scene 1 — Find Your Crew (tap to advance) ────────────────────────────────
function CrewScene({ onNext }: { onNext: () => void }) {
  const [profileUris, setProfileUris] = useState<string[]>([]);
  const pulse = useSharedValue(1);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('profile_photo')
          .not('profile_photo', 'is', null)
          .neq('profile_photo', '')
          .limit(5);
        if (data && data.length >= 5) {
          setProfileUris(data.map((u: any) => u.profile_photo));
        }
      } catch { /* fallback */ }
    };
    fetchProfiles();
    pulse.value = withRepeat(
      withSequence(withTiming(1.22, { duration: 780 }), withTiming(1, { duration: 780 })),
      -1, false,
    );
  }, []);

  const people = PEOPLE_POS.map((pos, i) => ({
    uri: profileUris[i] ?? FALLBACK_URIS[i], ...pos,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.22], [0.1, 0.32]),
  }));

  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [1, 1.22], [1, 1.07]) }],
  }));

  return (
    <Pressable style={{ flex: 1 }} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNext(); }}>
      <View style={s.scene} pointerEvents="box-none">
        <Animated.View entering={FadeInDown.delay(100).springify()} style={s.textBlock}>
          <Text style={s.sceneTitle}>Find your crew</Text>
          <Text style={s.sceneSub}>Match with travelers who vibe with you</Text>
        </Animated.View>
        <View style={s.crewWrap}>
          <Animated.View style={[s.pulseRing, ringStyle]} />
          <Animated.View entering={FadeIn.delay(150)} style={[s.crewCenter, centerStyle]}>
            <Text style={{ fontSize: 30 }}>✈️</Text>
          </Animated.View>
          {people.map((p, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(220 + i * 140).springify()}
              style={[s.bubble, { position: 'absolute', transform: [{ translateX: p.dx }, { translateY: p.dy }] }]}>
              <Image source={{ uri: p.uri }} style={s.bubbleImg} />
            </Animated.View>
          ))}
        </View>
        <Animated.View entering={FadeIn.delay(1200)} style={s.tapHint}>
          <Text style={s.tapHintText}>Tap anywhere to continue</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

// ─── Scene 2 — Go Together (tap to advance) ───────────────────────────────────
function TogetherScene({ onNext }: { onNext: () => void }) {
  const BG = OB + 'P3.jpeg';
  const [avatarUris, setAvatarUris] = useState<string[]>([]);

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('profile_photo')
          .not('profile_photo', 'is', null)
          .neq('profile_photo', '')
          .limit(4);
        if (data && data.length > 0) {
          setAvatarUris(data.map((u: any) => u.profile_photo).filter(Boolean));
        }
      } catch { /* fallback */ }
    };
    fetchAvatars();
  }, []);

  const displayAvatars = avatarUris.length >= 3 ? avatarUris.slice(0, 3) : FALLBACK_URIS.slice(0, 3);

  return (
    <Pressable style={{ flex: 1 }} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNext(); }}>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <Animated.View entering={FadeIn.delay(80).duration(700)} style={StyleSheet.absoluteFillObject}>
          <Image source={{ uri: BG }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.18)', 'transparent', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(500).springify()} style={s.togetherText}>
          <Text style={s.sceneTitle}>Go anywhere, together</Text>
          <Text style={s.sceneSub}>Join real groups heading around the world</Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(700).springify()} style={s.togetherFooter}>
          <View style={s.locTag}>
            <Text style={s.locText}>📍  Santorini, Greece</Text>
          </View>
          <View style={s.avatarRow}>
            {displayAvatars.map((uri, i) => (
              <Animated.View key={i} entering={FadeInDown.delay(820 + i * 110).springify()}
                style={[s.ava, { marginLeft: i > 0 ? -13 : 0 }]}>
                <Image source={{ uri }} style={s.avaImg} />
              </Animated.View>
            ))}
            <Animated.View entering={FadeInDown.delay(1060).springify()} style={[s.ava, s.avaPlus, { marginLeft: -13 }]}>
              <Text style={s.avaPlusText}>+9</Text>
            </Animated.View>
            <Text style={s.avaLabel}>travelers going</Text>
          </View>
          <Animated.View entering={FadeIn.delay(1400)} style={{ marginTop: 20 }}>
            <Text style={s.tapHintText}>Tap anywhere to continue</Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

// ─── CTA Slide ────────────────────────────────────────────────────────────────
function CTASlide({
  onAccessCode,
  onNotify,
}: {
  onAccessCode: () => void;
  onNotify: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Big logo fills top */}
        <Animated.View entering={FadeIn.delay(200).duration(700)} style={s.logoHero}>
          <Image
            source={require('../public/tagalong-icon.png')}
            style={s.logoHeroImg}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={s.ctaBottom}>
          <Animated.View entering={FadeInUp.delay(350).springify()}>
            <Text style={s.ctaH}>Something big{'\n'}is coming.</Text>
            <Text style={s.ctaB}>
              We're adding the final touches.{'\n'}Be first to know when we launch.
            </Text>
            {/* Early access — subtle, right below body text */}
            <Pressable
              style={{ marginTop: 14 }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onAccessCode();
              }}
            >
              <Text style={s.earlyAccessInline}>Have an early access code?</Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(550).springify()} style={{ marginTop: 36 }}>
            <Pressable
              style={s.notifyBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onNotify();
              }}
            >
              <Bell size={20} color="#000" strokeWidth={2.2} />
              <Text style={s.notifyBtnText}>Notify me when it's live</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Notified Slide ───────────────────────────────────────────────────────────
function NotifiedSlide() {
  const planeX = useSharedValue(-80);
  const planeY = useSharedValue(0);

  useEffect(() => {
    // Plane flies left → right, pauses off-screen, loops
    planeX.value = withRepeat(
      withSequence(
        withDelay(500, withTiming(width + 80, { duration: 3000, easing: Easing.inOut(Easing.sin) })),
        withTiming(-80, { duration: 0 }),
      ),
      -1,
      false,
    );
    // Gentle vertical bob
    planeY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(10,  { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, []);

  const planeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: planeX.value }, { translateY: planeY.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          {/* Plane animation strip */}
          <View style={{ width: '100%', height: 72, justifyContent: 'center', marginBottom: 52, overflow: 'hidden' }}>
            <Animated.View style={planeStyle}>
              <Plane size={42} color={ACCENT} strokeWidth={1.5} />
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(300).springify()} style={{ alignItems: 'center' }}>
            <Text style={s.notifiedH}>You're on{'\n'}the list. 🎉</Text>
            <Text style={s.notifiedB}>
              We'll notify you the moment{'\n'}TagAlong goes live.
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Denied Slide ─────────────────────────────────────────────────────────────
function DeniedSlide({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Animated.View entering={FadeInUp.delay(200).springify()} style={{ alignItems: 'center' }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(240,235,227,0.08)', borderWidth: 1.5, borderColor: 'rgba(240,235,227,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
              <Bell size={32} color={ACCENT} strokeWidth={1.6} />
            </View>
            <Text style={[s.notifiedH, { fontSize: 30 }]}>Enable{'\n'}Notifications</Text>
            <Text style={[s.notifiedB, { marginBottom: 40 }]}>
              To get notified the moment TagAlong launches, please allow notifications in your Settings.
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Linking.openSettings();
              }}
              style={s.notifyBtn}
            >
              <Text style={s.notifyBtnText}>Open Settings</Text>
            </Pressable>
            <Pressable onPress={onRetry} style={{ marginTop: 20 }}>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontFamily: 'Outfit-Regular' }}>
                I've enabled it — try again
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  onAccessCode: () => void;
  startAtCTA?: boolean;
}

export default function OnboardingIntroSlide({ onAccessCode, startAtCTA = false }: Props) {
  const [scene, setScene] = useState<number>(0);
  const [showCTA, setShowCTA] = useState<boolean>(startAtCTA);
  const [showNotified, setShowNotified] = useState<boolean>(false);
  const [showDenied, setShowDenied] = useState<boolean>(false);

  // On mount: restore persisted notified state so re-opens skip the 3 slides
  useEffect(() => {
    AsyncStorage.getItem(NOTIFIED_KEY).then(val => {
      if (val === 'true') setShowNotified(true);
    });
  }, []);

  const goNext = useCallback(() => {
    if (scene < 2) setScene(s => s + 1);
    else setShowCTA(true);
  }, [scene]);

  const handleNotify = useCallback(async () => {
    try {
      const token = await registerForPushNotifications();
      if (token) {
        // Permission granted — save token and persist notified state
        await supabase
          .from('waitlist_tokens')
          .upsert({ token }, { onConflict: 'token' });
        await AsyncStorage.setItem(NOTIFIED_KEY, 'true');
        setShowDenied(false);
        setShowNotified(true);
      } else {
        // Permission denied — show instructions to enable in Settings
        setShowDenied(true);
      }
    } catch {
      setShowDenied(true);
    }
  }, []);

  if (showNotified) return <NotifiedSlide />;
  if (showDenied) return <DeniedSlide onRetry={handleNotify} />;
  if (showCTA) return <CTASlide onAccessCode={onAccessCode} onNotify={handleNotify} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <SafeAreaView style={[StyleSheet.absoluteFillObject, { zIndex: 10 }]} pointerEvents="none" edges={['top']}>
        <View style={s.dotsRow}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.dot, i === scene && s.dotOn]} />
          ))}
        </View>
      </SafeAreaView>
      {scene === 0 && <TripCardsScene key="s0" onNext={goNext} />}
      {scene === 1 && <CrewScene      key="s1" onNext={goNext} />}
      {scene === 2 && <TogetherScene  key="s2" onNext={goNext} />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scene: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', paddingTop: 20, gap: 6 },
  dot:   { height: 5, width: 20, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  dotOn: { backgroundColor: ACCENT, width: 34 },

  textBlock: { alignItems: 'center', width: '100%' },
  sceneTitle: { color: '#fff', fontSize: 30, fontFamily: 'Outfit-ExtraBold', fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', marginBottom: 8 },
  sceneSub:   { color: 'rgba(255,255,255,0.45)', fontSize: 15, fontFamily: 'Outfit-Regular', textAlign: 'center' },

  // Cards
  cardOuter: { position: 'absolute', width: CARD_W, height: CARD_H },
  cardInner: { width: CARD_W, height: CARD_H, borderRadius: 22, overflow: 'hidden' },
  cardImg:   { width: '100%', height: '100%' },
  cardGrad:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' },
  cardLabel: { position: 'absolute', bottom: 22, left: 22 },
  cardDest:  { color: '#fff', fontSize: 20, fontFamily: 'Outfit-Bold', fontWeight: '700' },
  cardVibe:  { color: 'rgba(255,255,255,0.62)', fontSize: 13, fontFamily: 'Outfit-Regular', marginTop: 3 },

  joinBadge: { position: 'absolute', top: 22, left: 18, backgroundColor: '#22c55e', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12 },
  joinText:  { color: '#fff', fontSize: 13, fontFamily: 'Outfit-Bold', fontWeight: '800', letterSpacing: 0.8 },

  swipeHintBadge: { position: 'absolute', alignSelf: 'center', top: '42%', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },
  swipeHintText:  { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontFamily: 'Outfit-SemiBold', fontWeight: '600', letterSpacing: 0.3 },

  swipePrompt:    { color: ACCENT, fontSize: 19, fontFamily: 'Outfit-ExtraBold', fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },
  swipePromptSub: { color: 'rgba(255,255,255,0.38)', fontSize: 13, fontFamily: 'Outfit-Regular', marginTop: 4, textAlign: 'center' },

  // Crew
  crewWrap:   { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  pulseRing:  { position: 'absolute', width: 114, height: 114, borderRadius: 57, backgroundColor: ACCENT },
  crewCenter: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(240,235,227,0.09)', borderWidth: 1.5, borderColor: 'rgba(240,235,227,0.22)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  bubble:     { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', borderWidth: 2.5, borderColor: ACCENT },
  bubbleImg:  { width: '100%', height: '100%' },

  tapHint:     { paddingBottom: 8 },
  tapHintText: { color: 'rgba(255,255,255,0.28)', fontSize: 13, fontFamily: 'Outfit-Regular', textAlign: 'center', letterSpacing: 0.2 },

  // Together
  togetherText:   { position: 'absolute', bottom: 200, left: 24, right: 24 },
  togetherFooter: { position: 'absolute', bottom: 68, left: 24, right: 24 },
  locTag:  { backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 16, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.14)' },
  locText: { color: '#fff', fontSize: 14, fontFamily: 'Outfit-SemiBold', fontWeight: '600' },
  avatarRow:  { flexDirection: 'row', alignItems: 'center' },
  ava:        { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', borderWidth: 2.5, borderColor: '#000' },
  avaImg:     { width: '100%', height: '100%' },
  avaPlus:    { backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  avaPlusText:{ color: '#000', fontSize: 11, fontFamily: 'Outfit-Bold', fontWeight: '700' },
  avaLabel:   { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'Outfit-Regular', marginLeft: 10 },

  // CTA
  logoHero:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  logoHeroImg: { width: width * 0.72, height: width * 0.72, tintColor: ACCENT },
  ctaBottom:   { paddingHorizontal: 30, paddingBottom: 36 },
  ctaH: { color: '#fff', fontSize: 38, fontFamily: 'Outfit-ExtraBold', fontWeight: '800', letterSpacing: -0.8, lineHeight: 46, marginBottom: 14 },
  ctaB: { color: 'rgba(255,255,255,0.42)', fontSize: 16, fontFamily: 'Outfit-Regular', lineHeight: 24 },
  earlyAccessInline: { color: 'rgba(255,255,255,0.24)', fontSize: 12, fontFamily: 'Outfit-Regular', textDecorationLine: 'underline' },
  notifyBtn:     { backgroundColor: ACCENT, borderRadius: 18, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  notifyBtnText: { color: '#000', fontSize: 17, fontFamily: 'Outfit-SemiBold', fontWeight: '600' },

  // Notified slide
  notifiedH: { color: '#fff', fontSize: 38, fontFamily: 'Outfit-ExtraBold', fontWeight: '800', letterSpacing: -0.8, lineHeight: 46, textAlign: 'center', marginBottom: 18 },
  notifiedB: { color: 'rgba(255,255,255,0.42)', fontSize: 16, fontFamily: 'Outfit-Regular', lineHeight: 24, textAlign: 'center' },
});
