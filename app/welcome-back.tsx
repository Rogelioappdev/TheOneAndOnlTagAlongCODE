import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Dimensions, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// Cinematic travel imagery
const BG_IMAGE = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900';

export default function WelcomeBackScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name?: string }>();

  // Animation values
  const imageScale = useSharedValue(1.08);
  const overlayOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(60);
  const cardOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.88);
  const buttonOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // Image slowly zooms in
    imageScale.value = withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) });

    // Overlay fades in
    overlayOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });

    // Card slides up
    cardTranslateY.value = withDelay(300, withSpring(0, { damping: 22, stiffness: 120 }));
    cardOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));

    // Button appears
    buttonScale.value = withDelay(700, withSpring(1, { damping: 18, stiffness: 140 }));
    buttonOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));

    // Glow pulse
    glowOpacity.value = withDelay(900, withSequence(
      withTiming(0.7, { duration: 1000 }),
      withTiming(0.35, { duration: 1000 }),
    ));
  }, []);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslateY.value }],
    opacity: cardOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: buttonOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withSpring(1, { damping: 12 })
    );
    // Brief pause for haptic feel, then navigate
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 120);
  };

  const firstName = name ? name.split(' ')[0] : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Full-bleed cinematic background */}
      <Animated.View style={[{ position: 'absolute', inset: 0 }, imageStyle]}>
        <Image
          source={{ uri: BG_IMAGE }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Dark cinematic overlay — deep vignette from bottom */}
      <Animated.View style={[{ position: 'absolute', inset: 0 }, overlayStyle]}>
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.08)',
            'rgba(0,0,0,0.15)',
            'rgba(0,0,0,0.55)',
            'rgba(0,0,0,0.88)',
            'rgba(0,0,0,0.97)',
          ]}
          locations={[0, 0.2, 0.48, 0.72, 1]}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 28, paddingBottom: 40 }}>

          {/* Glow accent behind text */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                bottom: 160,
                left: 28,
                right: 28,
                height: 200,
                borderRadius: 100,
                backgroundColor: '#10b981',
                filter: undefined,
              },
              glowStyle,
            ]}
          />

          {/* Main card content */}
          <Animated.View style={cardStyle}>

            {/* Small label */}
            <Animated.View
              entering={FadeIn.delay(400).duration(500)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <View style={{
                width: 28,
                height: 2,
                backgroundColor: '#10b981',
                marginRight: 10,
                borderRadius: 1,
              }} />
              <Text style={{
                color: '#10b981',
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 3,
                textTransform: 'uppercase',
              }}>
                Welcome back
              </Text>
            </Animated.View>

            {/* Headline */}
            <Animated.View entering={FadeIn.delay(500).duration(600)}>
              {firstName ? (
                <>
                  <Text style={{
                    color: '#ffffff',
                    fontSize: 52,
                    fontWeight: '800',
                    letterSpacing: -1.5,
                    lineHeight: 52,
                  }}>
                    Hey,
                  </Text>
                  <Text style={{
                    color: '#ffffff',
                    fontSize: 52,
                    fontWeight: '800',
                    letterSpacing: -1.5,
                    lineHeight: 58,
                  }}>
                    {firstName}.
                  </Text>
                </>
              ) : (
                <Text style={{
                  color: '#ffffff',
                  fontSize: 52,
                  fontWeight: '800',
                  letterSpacing: -1.5,
                  lineHeight: 58,
                }}>
                  Welcome{'\n'}back.
                </Text>
              )}
            </Animated.View>

            {/* Subtitle */}
            <Animated.Text
              entering={FadeIn.delay(620).duration(600)}
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: 17,
                fontWeight: '400',
                letterSpacing: 0.1,
                marginTop: 14,
                lineHeight: 24,
              }}
            >
              Your adventures are waiting.{'\n'}Let's pick up where you left off.
            </Animated.Text>

            {/* Divider */}
            <View style={{
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.08)',
              marginVertical: 32,
            }} />

            {/* CTA button */}
            <Animated.View style={buttonStyle}>
              <Pressable
                onPress={handleContinue}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#0ea571' : '#10b981',
                  borderRadius: 18,
                  paddingVertical: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Text style={{
                  color: '#fff',
                  fontSize: 17,
                  fontWeight: '700',
                  letterSpacing: 0.2,
                }}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>

          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
