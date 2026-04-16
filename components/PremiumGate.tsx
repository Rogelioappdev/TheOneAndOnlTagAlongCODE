import React, { ReactNode } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Lock } from 'lucide-react-native';
import { usePremiumStatus } from '@/lib/hooks/useRevenueCat';

interface PremiumGateProps {
  /**
   * Content to show if user has premium access
   */
  children: ReactNode;

  /**
   * Fallback content to show if user doesn't have premium
   * If not provided, a default premium prompt will be shown
   */
  fallback?: ReactNode;

  /**
   * Callback when user taps the upgrade button
   */
  onUpgradePress?: () => void;

  /**
   * Custom message for the premium prompt
   */
  message?: string;
}

/**
 * Component that shows premium content only if user has premium access
 * Otherwise shows a prompt to upgrade
 */
export function PremiumGate({
  children,
  fallback,
  onUpgradePress,
  message = 'This feature requires TagAlong+ premium',
}: PremiumGateProps) {
  const { data: isPremium, isLoading } = usePremiumStatus();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default premium prompt
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 items-center justify-center mb-6">
        <Lock size={32} color="#FF6B6B" />
      </View>

      <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
        Premium Feature
      </Text>

      <Text className="text-base text-gray-600 dark:text-gray-400 text-center mb-8">
        {message}
      </Text>

      {onUpgradePress && (
        <Pressable
          onPress={onUpgradePress}
          className="bg-gradient-to-r from-orange-500 to-red-500 px-8 py-4 rounded-full active:opacity-80"
          style={{
            backgroundColor: '#FF6B6B',
          }}
        >
          <Text className="text-white font-bold text-lg">
            Upgrade to Premium
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Hook to easily check if a user has premium access
 */
export function usePremium() {
  const { data: isPremium, isLoading, error } = usePremiumStatus();

  return {
    isPremium: isPremium ?? false,
    isLoading,
    error,
  };
}
