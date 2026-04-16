import React, { useEffect } from 'react';
import { View, Text, Image, Pressable, Modal, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Plane, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface MatchAnimationProps {
  visible: boolean;
  onClose: () => void;
  userImage: string;
  matchImage: string;
  matchName: string;
  onStartChat: () => void;
}

export default function MatchAnimation({
  visible,
  onClose,
  userImage,
  matchImage,
  matchName,
  onStartChat,
}: MatchAnimationProps) {
  // Animation values
  const leftPhotoX = useSharedValue(-200);
  const rightPhotoX = useSharedValue(200);
  const leftPhotoScale = useSharedValue(0.5);
  const rightPhotoScale = useSharedValue(0.5);
  const lineScale = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const backgroundOpacity = useSharedValue(0);

  // Check if reduced motion is enabled
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState<boolean>(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setPrefersReducedMotion(enabled || false);
    });
  }, []);

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const duration = prefersReducedMotion ? 200 : 600;
      const springConfig = { damping: 15, stiffness: 150 };

      // Background fade in
      backgroundOpacity.value = withTiming(1, { duration: 300 });

      // Photos slide in and scale up
      leftPhotoX.value = withSpring(-60, springConfig);
      rightPhotoX.value = withSpring(60, springConfig);
      leftPhotoScale.value = withSpring(1, springConfig);
      rightPhotoScale.value = withSpring(1, springConfig);

      // Line grows between photos
      setTimeout(() => {
        lineScale.value = withTiming(1, { duration: duration * 0.4, easing: Easing.out(Easing.ease) });
      }, duration * 0.4);

      // Icon appears with bounce
      setTimeout(() => {
        iconScale.value = withSequence(
          withSpring(1.2, { damping: 10, stiffness: 200 }),
          withSpring(1, { damping: 15, stiffness: 150 })
        );
      }, duration * 0.6);

      // Text fades in
      setTimeout(() => {
        textOpacity.value = withTiming(1, { duration: duration * 0.5 });
      }, duration * 0.7);

      // Buttons fade in
      setTimeout(() => {
        buttonsOpacity.value = withTiming(1, { duration: duration * 0.4 });
      }, duration * 0.9);
    } else {
      // Reset values
      leftPhotoX.value = -200;
      rightPhotoX.value = 200;
      leftPhotoScale.value = 0.5;
      rightPhotoScale.value = 0.5;
      lineScale.value = 0;
      iconScale.value = 0;
      textOpacity.value = 0;
      buttonsOpacity.value = 0;
      backgroundOpacity.value = 0;
    }
  }, [visible, prefersReducedMotion]);

  const leftPhotoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: leftPhotoX.value },
      { scale: leftPhotoScale.value },
    ],
  }));

  const rightPhotoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: rightPhotoX.value },
      { scale: rightPhotoScale.value },
    ],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: lineScale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-center items-center">
        {/* Animated gradient background */}
        <Animated.View style={[{ position: 'absolute', inset: 0 }, backgroundStyle]}>
          <LinearGradient
            colors={['#000000ee', '#10b981', '#059669', '#000000ee']}
            locations={[0, 0.3, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>

        <View className="items-center px-6">
          {/* Profile photos with connecting line */}
          <View className="flex-row items-center justify-center mb-8" style={{ height: 140 }}>
            {/* Left photo (User) */}
            <Animated.View style={[leftPhotoStyle]}>
              <View className="bg-white p-1 rounded-full">
                <Image
                  source={{ uri: userImage }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                />
              </View>
            </Animated.View>

            {/* Connecting line and icon */}
            <View className="absolute inset-0 items-center justify-center">
              <Animated.View
                style={[
                  lineStyle,
                  { width: 200, height: 4, backgroundColor: '#fff', borderRadius: 2 },
                ]}
              />
              <Animated.View style={[iconStyle, { position: 'absolute' }]}>
                <View className="bg-emerald-500 p-3 rounded-full" style={{ borderWidth: 4, borderColor: '#fff' }}>
                  <MapPin size={32} color="#fff" fill="#fff" />
                </View>
              </Animated.View>
            </View>

            {/* Right photo (Match) */}
            <Animated.View style={[rightPhotoStyle]}>
              <View className="bg-white p-1 rounded-full">
                <Image
                  source={{ uri: matchImage }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                />
              </View>
            </Animated.View>
          </View>

          {/* Text content */}
          <Animated.View style={textStyle} className="items-center mb-8">
            <View className="flex-row items-center mb-2">
              <Plane size={24} color="#fff" />
              <Text className="text-white text-3xl font-bold ml-2">It's a match!</Text>
            </View>
            <Text className="text-white/90 text-lg text-center">
              You and {matchName} are tag-along ready
            </Text>
          </Animated.View>

          {/* Action buttons */}
          <Animated.View style={buttonsStyle} className="w-full max-w-xs gap-3">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onStartChat();
              }}
              className="bg-white py-4 px-6 rounded-2xl active:opacity-80"
            >
              <Text className="text-emerald-600 text-center text-lg font-bold">
                Start Chat
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              className="bg-white/20 py-4 px-6 rounded-2xl active:opacity-80"
            >
              <Text className="text-white text-center text-lg font-semibold">
                Keep Exploring
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
