import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Plane, MapPin, Users, Globe } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface TripMemberJoinedAnimationProps {
  visible: boolean;
  onClose: () => void;
  newMemberName: string;
  newMemberPhoto: string;
  tripDestination: string;
  tripCountry: string;
  existingMembersCount: number;
}

// Floating particle component for travel vibes
function FloatingParticle({
  delay,
  startX,
  icon: Icon,
  color,
}: {
  delay: number;
  startX: number;
  icon: any;
  color: string;
}) {
  const translateY = useSharedValue(height * 0.8);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(-height * 0.1, { duration: 4000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 600 }),
          withTiming(0.8, { duration: 2800 }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        false
      )
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withSpring(1, { damping: 10 }),
          withTiming(1, { duration: 3400 })
        ),
        -1,
        false
      )
    );
    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: startX,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={style}>
      <Icon size={20} color={color} />
    </Animated.View>
  );
}

export default function TripMemberJoinedAnimation({
  visible,
  onClose,
  newMemberName,
  newMemberPhoto,
  tripDestination,
  tripCountry,
  existingMembersCount,
}: TripMemberJoinedAnimationProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  // Main animation values
  const backgroundOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.3);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(80);
  const photoScale = useSharedValue(0);
  const photoRingScale = useSharedValue(0);
  const photoRingOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const destinationOpacity = useSharedValue(0);
  const membersOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(30);
  const planeX = useSharedValue(-60);
  const planeOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setPrefersReducedMotion(enabled ?? false);
    });
  }, []);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (prefersReducedMotion) {
        // Instant show for reduced motion
        backgroundOpacity.value = withTiming(1, { duration: 200 });
        cardScale.value = 1;
        cardOpacity.value = 1;
        cardTranslateY.value = 0;
        photoScale.value = 1;
        titleOpacity.value = 1;
        titleTranslateY.value = 0;
        subtitleOpacity.value = 1;
        destinationOpacity.value = 1;
        membersOpacity.value = 1;
        buttonOpacity.value = 1;
        buttonTranslateY.value = 0;
        return;
      }

      // Stagger the full animation sequence
      backgroundOpacity.value = withTiming(1, { duration: 400 });

      // Card slides up and scales in
      cardOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
      cardScale.value = withDelay(100, withSpring(1, { damping: 18, stiffness: 160 }));
      cardTranslateY.value = withDelay(100, withSpring(0, { damping: 20, stiffness: 200 }));

      // Photo pops in with ring pulse
      photoScale.value = withDelay(
        300,
        withSequence(
          withSpring(1.15, { damping: 8, stiffness: 250 }),
          withSpring(1, { damping: 14, stiffness: 200 })
        )
      );
      photoRingScale.value = withDelay(350, withSpring(1, { damping: 12, stiffness: 180 }));
      photoRingOpacity.value = withDelay(350, withTiming(1, { duration: 300 }));

      // Pulsing ring animation
      setTimeout(() => {
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.25, { duration: 900, easing: Easing.out(Easing.ease) }),
            withTiming(1, { duration: 900, easing: Easing.in(Easing.ease) })
          ),
          3,
          false
        );
      }, 550);

      // Plane flies across
      planeOpacity.value = withDelay(500, withTiming(1, { duration: 200 }));
      planeX.value = withDelay(500, withTiming(width + 60, { duration: 1200, easing: Easing.inOut(Easing.ease) }));

      // Text elements fade in
      titleOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
      titleTranslateY.value = withDelay(500, withSpring(0, { damping: 16, stiffness: 180 }));
      subtitleOpacity.value = withDelay(650, withTiming(1, { duration: 350 }));
      destinationOpacity.value = withDelay(800, withTiming(1, { duration: 350 }));
      membersOpacity.value = withDelay(950, withTiming(1, { duration: 350 }));

      // Button slides up
      buttonOpacity.value = withDelay(1100, withTiming(1, { duration: 400 }));
      buttonTranslateY.value = withDelay(1100, withSpring(0, { damping: 16, stiffness: 180 }));

    } else {
      // Reset
      backgroundOpacity.value = 0;
      cardScale.value = 0.3;
      cardOpacity.value = 0;
      cardTranslateY.value = 80;
      photoScale.value = 0;
      photoRingScale.value = 0;
      photoRingOpacity.value = 0;
      titleOpacity.value = 0;
      titleTranslateY.value = 20;
      subtitleOpacity.value = 0;
      destinationOpacity.value = 0;
      membersOpacity.value = 0;
      buttonOpacity.value = 0;
      buttonTranslateY.value = 30;
      planeX.value = -60;
      planeOpacity.value = 0;
      pulseScale.value = 1;
    }
  }, [visible, prefersReducedMotion]);

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { scale: cardScale.value },
      { translateY: cardTranslateY.value },
    ],
  }));

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoScale.value }],
  }));

  const photoRingStyle = useAnimatedStyle(() => ({
    opacity: photoRingOpacity.value,
    transform: [{ scale: photoRingScale.value }],
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: interpolate(pulseScale.value, [1, 1.25], [0.6, 0], Extrapolation.CLAMP),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const destinationStyle = useAnimatedStyle(() => ({
    opacity: destinationOpacity.value,
  }));

  const membersStyle = useAnimatedStyle(() => ({
    opacity: membersOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const planeStyle = useAnimatedStyle(() => ({
    opacity: planeOpacity.value,
    transform: [{ translateX: planeX.value }],
  }));

  const firstName = newMemberName?.split(' ')[0] ?? 'Someone';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {/* Background overlay */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            },
            backgroundStyle,
          ]}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.92)', 'rgba(2,28,20,0.96)', 'rgba(0,0,0,0.95)']}
            locations={[0, 0.5, 1]}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* Floating travel particles */}
        {!prefersReducedMotion && visible && (
          <>
            <FloatingParticle delay={0} startX={width * 0.08} icon={Plane} color="#10b981" />
            <FloatingParticle delay={800} startX={width * 0.75} icon={MapPin} color="#34d399" />
            <FloatingParticle delay={1600} startX={width * 0.45} icon={Globe} color="#6ee7b7" />
            <FloatingParticle delay={400} startX={width * 0.88} icon={Plane} color="#059669" />
            <FloatingParticle delay={1200} startX={width * 0.2} icon={MapPin} color="#10b981" />
          </>
        )}

        {/* Plane flying across */}
        {!prefersReducedMotion && (
          <Animated.View
            style={[
              planeStyle,
              {
                position: 'absolute',
                top: height * 0.18,
                left: 0,
              },
            ]}
          >
            <Plane size={28} color="#34d399" />
          </Animated.View>
        )}

        {/* Main card */}
        <Animated.View
          style={[
            cardStyle,
            {
              width: width * 0.88,
              maxWidth: 380,
              borderRadius: 28,
              overflow: 'hidden',
              shadowColor: '#10b981',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.4,
              shadowRadius: 40,
              elevation: 20,
            },
          ]}
        >
          <LinearGradient
            colors={['#0d2b1f', '#0a3d29', '#0d2b1f']}
            locations={[0, 0.5, 1]}
            style={{ padding: 32, alignItems: 'center' }}
          >
            {/* Top label */}
            <Animated.View
              style={[
                subtitleStyle,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(16,185,129,0.15)',
                  borderRadius: 100,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: 'rgba(16,185,129,0.3)',
                },
              ]}
            >
              <Users size={13} color="#10b981" />
              <Text
                style={{
                  color: '#10b981',
                  fontSize: 12,
                  fontWeight: '600',
                  marginLeft: 6,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                New Traveler Joined
              </Text>
            </Animated.View>

            {/* Profile photo with rings */}
            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              {/* Pulse ring */}
              <Animated.View
                style={[
                  pulseRingStyle,
                  {
                    position: 'absolute',
                    width: 128,
                    height: 128,
                    borderRadius: 64,
                    borderWidth: 2,
                    borderColor: '#10b981',
                  },
                ]}
              />
              {/* Static ring */}
              <Animated.View
                style={[
                  photoRingStyle,
                  {
                    position: 'absolute',
                    width: 116,
                    height: 116,
                    borderRadius: 58,
                    borderWidth: 3,
                    borderColor: '#10b981',
                  },
                ]}
              />
              {/* Photo */}
              <Animated.View style={photoStyle}>
                {newMemberPhoto ? (
                  <Image
                    source={{ uri: newMemberPhoto }}
                    style={{
                      width: 104,
                      height: 104,
                      borderRadius: 52,
                      borderWidth: 4,
                      borderColor: '#0d2b1f',
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 104,
                      height: 104,
                      borderRadius: 52,
                      backgroundColor: '#1a4a34',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 4,
                      borderColor: '#0d2b1f',
                    }}
                  >
                    <Text
                      style={{ fontSize: 40, color: '#10b981', fontWeight: '700' }}
                    >
                      {firstName[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>

            {/* Title */}
            <Animated.View style={[titleStyle, { alignItems: 'center', marginBottom: 6 }]}>
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: 26,
                  fontWeight: '800',
                  textAlign: 'center',
                  letterSpacing: -0.5,
                }}
              >
                {firstName} joined!
              </Text>
            </Animated.View>

            <Animated.View style={[subtitleStyle, { alignItems: 'center', marginBottom: 20 }]}>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: 15,
                  textAlign: 'center',
                  lineHeight: 22,
                }}
              >
                A new traveler is joining your adventure
              </Text>
            </Animated.View>

            {/* Destination pill */}
            <Animated.View
              style={[
                destinationStyle,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  marginBottom: 10,
                  width: '100%',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                },
              ]}
            >
              <MapPin size={16} color="#10b981" />
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: '600',
                  marginLeft: 10,
                  flex: 1,
                }}
              >
                {tripDestination}
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 14,
                }}
              >
                {tripCountry}
              </Text>
            </Animated.View>

            {/* Members count */}
            <Animated.View
              style={[
                membersStyle,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(16,185,129,0.08)',
                  borderRadius: 14,
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  marginBottom: 24,
                  width: '100%',
                  borderWidth: 1,
                  borderColor: 'rgba(16,185,129,0.2)',
                },
              ]}
            >
              <Users size={16} color="#10b981" />
              <Text
                style={{
                  color: '#10b981',
                  fontSize: 15,
                  fontWeight: '600',
                  marginLeft: 10,
                }}
              >
                {existingMembersCount + 1} traveler{existingMembersCount + 1 !== 1 ? 's' : ''} now on this trip
              </Text>
            </Animated.View>

            {/* CTA Button */}
            <Animated.View style={[buttonStyle, { width: '100%', gap: 10 }]}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onClose();
                }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.85 : 1,
                  borderRadius: 18,
                  overflow: 'hidden',
                })}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                  }}
                >
                  <Plane size={18} color="#fff" />
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 17,
                      fontWeight: '700',
                      marginLeft: 8,
                      letterSpacing: 0.2,
                    }}
                  >
                    Awesome!
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}
