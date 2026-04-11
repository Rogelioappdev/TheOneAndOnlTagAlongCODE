import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator, Alert } from 'react-native';
import { X } from 'lucide-react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import {
  useOfferings,
  useAllOfferings,
  usePurchasePackage,
  useRestorePurchases,
} from '@/lib/hooks/useRevenueCat';
import { LinearGradient } from 'expo-linear-gradient';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

export function Paywall({ visible, onClose, onPurchaseSuccess }: PaywallProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: currentOffering, isLoading: isLoadingCurrent } = useOfferings();
  const { data: allOfferings, isLoading: isLoadingAll } = useAllOfferings();
  const isLoadingOfferings = isLoadingCurrent || isLoadingAll;

  // Use the current offering if available; otherwise pick the first TagAlong one
  const offering = currentOffering ?? (allOfferings && allOfferings.length > 0 ? allOfferings[0] : null);

  const purchaseMutation = usePurchasePackage();
  const restoreMutation = useRestorePurchases();

  const handlePaywallResult = async (result: PAYWALL_RESULT) => {
    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        console.log('✅ Purchase/Restore successful');
        onPurchaseSuccess?.();
        onClose();
        break;
      case PAYWALL_RESULT.CANCELLED:
        console.log('ℹ️ User cancelled');
        break;
      case PAYWALL_RESULT.ERROR:
        console.error('❌ Paywall error');
        Alert.alert('Error', 'Something went wrong. Please try again.');
        break;
    }
  };

  const handleRestore = async () => {
    try {
      setIsProcessing(true);
      const result = await restoreMutation.mutateAsync();

      if (result.success) {
        Alert.alert(
          'Success',
          'Your purchases have been restored!',
          [{ text: 'OK', onPress: () => {
            onPurchaseSuccess?.();
            onClose();
          }}]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'We couldn\'t find any previous purchases to restore.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white dark:bg-gray-900">
        {/* Header */}
        <View className="px-6 pt-4 pb-3 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            TagAlong+
          </Text>
          <Pressable
            onPress={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center active:opacity-70"
          >
            <X size={20} color="#000" />
          </Pressable>
        </View>

        {/* Hero Section */}
        <View className="px-6 py-8">
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              padding: 24,
            }}
          >
            <Text className="text-3xl font-bold text-white mb-2">
              Unlock Premium
            </Text>
            <Text className="text-white/90 text-lg">
              Get unlimited access to all premium features
            </Text>
          </LinearGradient>
        </View>

        {/* Features */}
        <View className="px-6 py-4 space-y-4">
          {[
            { icon: '🚀', title: 'Unlimited Trips', desc: 'Create as many trips as you want' },
            { icon: '💬', title: 'Priority Support', desc: 'Get help when you need it' },
            { icon: '🎨', title: 'Custom Themes', desc: 'Personalize your experience' },
            { icon: '📊', title: 'Advanced Analytics', desc: 'Track your travel stats' },
          ].map((feature, index) => (
            <View key={index} className="flex-row items-center space-x-4">
              <View className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 items-center justify-center">
                <Text className="text-2xl">{feature.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Spacer */}
        <View className="flex-1" />

        {/* Paywall Footer */}
        {isLoadingOfferings ? (
          <View className="p-6 items-center">
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text className="mt-4 text-gray-600 dark:text-gray-400">
              Loading options...
            </Text>
          </View>
        ) : offering ? (
          <View className="px-6 pb-8">
            <RevenueCatUI.PaywallFooterContainerView
              options={{ offering }}
              onPurchaseCompleted={() => {
                handlePaywallResult(PAYWALL_RESULT.PURCHASED);
              }}
              onRestoreCompleted={() => {
                handlePaywallResult(PAYWALL_RESULT.RESTORED);
              }}
              onPurchaseCancelled={() => {
                handlePaywallResult(PAYWALL_RESULT.CANCELLED);
              }}
              onPurchaseError={() => {
                handlePaywallResult(PAYWALL_RESULT.ERROR);
              }}
              onRestoreError={() => {
                handlePaywallResult(PAYWALL_RESULT.ERROR);
              }}
            />

            {/* Restore Button */}
            <Pressable
              onPress={handleRestore}
              disabled={isProcessing || restoreMutation.isPending}
              className="mt-4 py-4 items-center active:opacity-70"
            >
              {restoreMutation.isPending ? (
                <ActivityIndicator size="small" color="#FF6B6B" />
              ) : (
                <Text className="text-orange-500 font-semibold">
                  Restore Purchases
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View className="p-6">
            <Text className="text-center text-gray-600 dark:text-gray-400">
              No subscription options available at the moment.
            </Text>
            <Pressable
              onPress={onClose}
              className="mt-4 py-4 px-6 bg-gray-200 dark:bg-gray-800 rounded-xl items-center active:opacity-70"
            >
              <Text className="font-semibold text-gray-900 dark:text-white">
                Close
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}
