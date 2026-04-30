import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Sparkles } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeInDown,
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

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [resetTimestamp, resetSwipesIfNeeded, onTimerComplete]);

  const handleUnlockPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUnlockPress();
  }, [onUnlockPress]);

  return (
    <View style={styles.root}>
      <View style={styles.inner}>

        <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.iconWrap}>
          <Clock size={44} color="#F0EBE3" strokeWidth={1.5} />
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.headline}>
          You've reached your{'\n'}daily swipe limit
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.timerBox}>
          <Text style={styles.timerLabel}>RESETS IN</Text>
          <Text style={styles.timerText}>{formatTimeRemaining(timeRemaining)}</Text>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(400).duration(500)} style={styles.subtext}>
          Free users get 10 swipes every 24 hours.{'\n'}
          Come back when the timer hits zero.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.btnWrap}>
          <Pressable
            onPress={handleUnlockPress}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <LinearGradient
              colors={['#F0EBE3', '#d8d1c8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              <Sparkles size={20} color="#000" strokeWidth={2} />
              <Text style={styles.btnText}>Unlock unlimited swipes</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(600).duration(500)} style={styles.teaser}>
          TagAlong+ members swipe without limits
        </Animated.Text>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(240,235,227,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(240,235,227,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  headline: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 24,
    lineHeight: 32,
  },
  timerBox: {
    backgroundColor: 'rgba(240,235,227,0.06)',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(240,235,227,0.1)',
    alignItems: 'center',
  },
  timerLabel: {
    color: 'rgba(240,235,227,0.4)',
    fontSize: 11,
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  timerText: {
    color: '#F0EBE3',
    fontSize: 40,
    fontFamily: 'Outfit-Bold',
    letterSpacing: 2,
  },
  subtext: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  btnWrap: {
    width: '100%',
  },
  btn: {
    borderRadius: 18,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnText: {
    color: '#000000',
    fontSize: 17,
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.2,
  },
  teaser: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    textAlign: 'center',
    marginTop: 20,
  },
});
