import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { Colors } from '../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TagAlongTabButtonProps {
  onPress: () => void;
  focused: boolean;
}

// Tag-Along logo — uses the actual brand image for pixel-perfect accuracy
function TagAlongLogo({ size = 32 }: { size?: number; color?: string }) {
  return (
    <Image
      source={require('../public/tagalong-icon.png')}
      style={{ width: size, height: size, tintColor: '#FFFFFF' }}
      resizeMode="contain"
    />
  );
}

export default function TagAlongTabButton({ onPress, focused }: TagAlongTabButtonProps) {
  // Animation values
  const scale = useSharedValue(1);
  const breathe = useSharedValue(1);
  const outerGlow = useSharedValue(0);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const shadowRadius = useSharedValue(12);

  // Idle breathing animation
  useEffect(() => {
    // Gentle breathing pulse every 4-6 seconds
    breathe.value = withRepeat(
      withSequence(
        withDelay(
          4000,
          withTiming(1.04, { duration: 1500, easing: Easing.inOut(Easing.sin) })
        ),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // Subtle outer glow shimmer
    outerGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const handlePressIn = () => {
    // Trigger heavy haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Micro press animation
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    shadowRadius.value = withTiming(8, { duration: 100 });
  };

  const handlePressOut = () => {
    // Bounce back
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    shadowRadius.value = withSpring(12, { damping: 15 });

    // Trigger ripple effect
    rippleScale.value = 0;
    rippleOpacity.value = 0.6;
    rippleScale.value = withTiming(2, { duration: 500, easing: Easing.out(Easing.cubic) });
    rippleOpacity.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
  };

  // Main button animated style
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value * breathe.value },
      ],
    };
  });

  // Outer glow ring animated style
  const outerRingStyle = useAnimatedStyle(() => {
    const glowOpacity = interpolate(outerGlow.value, [0, 1], [0.15, 0.35]);
    const glowScale = interpolate(outerGlow.value, [0, 1], [1, 1.08]);
    return {
      opacity: glowOpacity,
      transform: [{ scale: glowScale }],
    };
  });

  // Ripple effect style
  const rippleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rippleScale.value }],
      opacity: rippleOpacity.value,
    };
  });

  // Shadow animated style
  const shadowStyle = useAnimatedStyle(() => {
    return {
      shadowRadius: shadowRadius.value,
    };
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 74,
            height: 74,
            borderRadius: 22,
            backgroundColor: Colors.accentDim,
          },
          outerRingStyle,
        ]}
      />

      {/* Ripple effect on tap */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 62,
            height: 62,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: Colors.accentBorder,
          },
          rippleStyle,
        ]}
      />

      {/* Main button */}
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          {
            width: 62,
            height: 62,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: Colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            elevation: 12,
          },
          buttonAnimatedStyle,
          shadowStyle,
        ]}
      >
        <LinearGradient
          colors={['#050505', '#050505']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{
            width: 62,
            height: 62,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: Colors.accentBorder,
          }}
        >
          {/* Logo icon */}
          <TagAlongLogo size={52} color="#FFFFFF" />
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
}