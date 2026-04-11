import * as Haptics from 'expo-haptics';

// Premium haptic feedback hooks for onboarding
export const usePremiumSounds = () => {
  // Heavy impact - for important actions, confirmations, significant UI state changes
  const playHeavy = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  // Soft impact - for gentle interactions, smooth transitions, rubber-like button presses
  const playSoft = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
  };

  // Success notification - for successful operations, completed tasks, positive confirmations
  const playSuccess = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return {
    playHeavy,
    playSoft,
    playSuccess,
  };
};
