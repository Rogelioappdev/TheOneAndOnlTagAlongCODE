import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Sparkles } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import useSwipeLimitStore from '@/lib/state/swipe-limit-store';

interface SwipeLimitGateProps {
  onUnlockPress: () => void;
  onTimerComplete: () => void;
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function SwipeLimitGate({ onUnlockPress, onTimerComplete }: SwipeLimitGateProps) {
  const resetTimestamp = useSwipeLimitStore(s => s.getResetTimestamp());
  const resetSwipesIfNeeded = useSwipeLimitStore(s => s.resetSwipesIfNeeded);

  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Pulse animation for the timer
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Calculate and update time remaining
  useEffect(() => {
    if (!resetTimestamp) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = resetTimestamp - now;

      if (remaining <= 0) {
        resetSwipesIfNeeded();
        onTimerComplete();
        return;
      }

      setTimeRemaining(remaining);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [resetTimestamp, resetSwipesIfNeeded, onTimerComplete]);

  const handleUnlockPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUnlockPress();
  }, [onUnlockPress]);

  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={['#0a0a0a', '#111111', '#0a0a0a']}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-center items-center px-8">
          {/* Icon with glow effect */}
          <Animated.View
            entering={FadeIn.delay(100).duration(600)}
            style={pulseStyle}
            className="mb-8"
          >
            <View className="w-24 h-24 rounded-full bg-zinc-900 items-center justify-center border border-zinc-800">
              <Clock size={44} color="#6b7280" strokeWidth={1.5} />
            </View>
          </Animated.View>

          {/* Headline */}
          <Animated.Text
            entering={FadeInDown.delay(200).duration(500)}
            className="text-white text-2xl font-semibold text-center mb-4"
            style={{ letterSpacing: -0.5 }}
          >
            You've reached your daily swipe limit
          </Animated.Text>

          {/* Timer display */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(500)}
            className="bg-zinc-900/60 rounded-2xl px-8 py-5 mb-6 border border-zinc-800/50"
          >
            <Text className="text-zinc-500 text-sm text-center mb-2 tracking-wide">
              RESETS IN
            </Text>
            <Text className="text-white text-4xl font-light text-center tracking-widest">
              {formatTimeRemaining(timeRemaining)}
            </Text>
          </Animated.View>

          {/* Subtext */}
          <Animated.Text
            entering={FadeInDown.delay(400).duration(500)}
            className="text-zinc-500 text-base text-center mb-10 leading-6"
          >
            Free users get 3 swipes every 24 hours.{'\n'}
            Come back when the timer hits zero.
          </Animated.Text>

          {/* Unlock button */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)} className="w-full">
            <Pressable
              onPress={handleUnlockPress}
              className="active:opacity-90 active:scale-[0.98]"
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16 }}
              >
                <View className="flex-row items-center justify-center py-4 px-6">
                  <Sparkles size={20} color="#ffffff" className="mr-2" />
                  <Text className="text-white text-lg font-semibold ml-2">
                    Unlock unlimited swipes
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Premium teaser */}
          <Animated.Text
            entering={FadeInDown.delay(600).duration(500)}
            className="text-zinc-600 text-sm text-center mt-6"
          >
            Tag-Along+ members swipe without limits
          </Animated.Text>
        </View>
      </LinearGradient>
    </View>
  );
}
