import React, { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('screen');

const SPLASH_IMAGE = require('../mobile/splash.png');

interface CustomSplashScreenProps {
  onFinish: () => void;
}

export function CustomSplashScreen({ onFinish }: CustomSplashScreenProps) {
  const imageOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const animationStarted = useRef(false);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  useEffect(() => {
    if (animationStarted.current) return;
    animationStarted.current = true;

    // Fade in, hold for ~2s, then fade out
    imageOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }, () => {
      containerOpacity.value = withSequence(
        withTiming(1, { duration: 1800 }),
        withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) {
            runOnJS(onFinish)();
          }
        })
      );
    });
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, containerAnimatedStyle]}>
      <Animated.Image
        source={SPLASH_IMAGE}
        style={[styles.image, imageAnimatedStyle]}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
    backgroundColor: '#000',
  },
  image: {
    width,
    height,
  },
});
