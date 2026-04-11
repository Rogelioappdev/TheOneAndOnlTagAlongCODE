import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { X } from 'lucide-react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { useSubscriptionDetails } from '@/lib/hooks/useRevenueCat';

interface CustomerCenterProps {
  visible: boolean;
  onClose: () => void;
}

export function CustomerCenter({ visible, onClose }: CustomerCenterProps) {
  const { data: subscriptionDetails } = useSubscriptionDetails();

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
        <View className="px-6 pt-4 pb-3 flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Manage Subscription
          </Text>
          <Pressable
            onPress={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center active:opacity-70"
          >
            <X size={20} color="#666" />
          </Pressable>
        </View>

        {/* Subscription Status */}
        {subscriptionDetails?.isPremium && (
          <View className="px-6 py-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-900/30">
            <Text className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-1">
              Active Subscription
            </Text>
            <Text className="text-xs text-orange-600 dark:text-orange-400">
              {subscriptionDetails.productIdentifier || 'TagAlong+'}
            </Text>
            {subscriptionDetails.expirationDate && subscriptionDetails.willRenew && (
              <Text className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Renews on {new Date(subscriptionDetails.expirationDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* Customer Center View */}
        <View className="flex-1">
          <RevenueCatUI.CustomerCenterView
            onDismiss={onClose}
            onRestoreCompleted={() => {
              console.log('✅ Restore completed in Customer Center');
            }}
            onRestoreFailed={(error) => {
              console.error('❌ Restore failed in Customer Center:', error);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
