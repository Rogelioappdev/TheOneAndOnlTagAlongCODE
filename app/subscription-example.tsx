import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Crown, Settings as SettingsIcon, RefreshCw, Info } from 'lucide-react-native';
import { usePremiumStatus, useSubscriptionDetails } from '@/lib/hooks/useRevenueCat';
import { Paywall } from '@/components/Paywall';
import { CustomerCenter } from '@/components/CustomerCenter';
import { LinearGradient } from 'expo-linear-gradient';

export default function SubscriptionScreen() {
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);

  const { data: isPremium, isLoading: isLoadingPremium } = usePremiumStatus();
  const { data: subscriptionDetails } = useSubscriptionDetails();

  if (isLoadingPremium) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">
          Loading subscription status...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-16 pb-8">
          <View className="flex-row items-center mb-2">
            <Crown size={32} color="#FF6B6B" />
            <Text className="text-3xl font-bold text-gray-900 dark:text-white ml-3">
              TagAlong+
            </Text>
          </View>
          <Text className="text-base text-gray-600 dark:text-gray-400">
            {isPremium ? 'Premium Active' : 'Unlock Premium Features'}
          </Text>
        </View>

        {/* Status Card */}
        {isPremium ? (
          <View className="mx-6 mb-6">
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 20,
                padding: 24,
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-2xl font-bold text-white">
                  Premium Active
                </Text>
                <Crown size={24} color="white" />
              </View>

              {subscriptionDetails?.productIdentifier && (
                <Text className="text-white/90 text-base mb-2">
                  Plan: {subscriptionDetails.productIdentifier}
                </Text>
              )}

              {subscriptionDetails?.expirationDate && subscriptionDetails.willRenew && (
                <Text className="text-white/80 text-sm">
                  Renews: {new Date(subscriptionDetails.expirationDate).toLocaleDateString()}
                </Text>
              )}

              {subscriptionDetails?.expirationDate && !subscriptionDetails.willRenew && (
                <Text className="text-white/80 text-sm">
                  Expires: {new Date(subscriptionDetails.expirationDate).toLocaleDateString()}
                </Text>
              )}
            </LinearGradient>
          </View>
        ) : (
          <View className="mx-6 mb-6 p-6 bg-gray-100 dark:bg-gray-800 rounded-3xl">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Free Plan
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Upgrade to unlock all premium features
            </Text>
          </View>
        )}

        {/* Features List */}
        <View className="px-6 mb-6">
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Premium Features
          </Text>

          {[
            { icon: '🚀', title: 'Unlimited Trips', desc: 'Create as many trips as you want' },
            { icon: '💬', title: 'Priority Support', desc: 'Get help when you need it' },
            { icon: '🎨', title: 'Custom Themes', desc: 'Personalize your experience' },
            { icon: '📊', title: 'Advanced Analytics', desc: 'Track your travel stats' },
            { icon: '🌟', title: 'Exclusive Features', desc: 'Access to beta features first' },
            { icon: '📱', title: 'Ad-Free Experience', desc: 'No interruptions' },
          ].map((feature, index) => (
            <View key={index} className="flex-row items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 items-center justify-center">
                <Text className="text-2xl">{feature.icon}</Text>
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.desc}
                </Text>
              </View>
              {isPremium && (
                <View className="w-6 h-6 rounded-full bg-green-500 items-center justify-center">
                  <Text className="text-white text-xs font-bold">✓</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="px-6 pb-8">
          {!isPremium && (
            <Pressable
              onPress={() => setShowPaywall(true)}
              className="mb-4 py-4 px-6 rounded-2xl items-center active:opacity-80"
              style={{ backgroundColor: '#FF6B6B' }}
            >
              <Text className="text-white font-bold text-lg">
                Upgrade to Premium
              </Text>
            </Pressable>
          )}

          {isPremium && (
            <Pressable
              onPress={() => setShowCustomerCenter(true)}
              className="mb-4 py-4 px-6 bg-gray-200 dark:bg-gray-800 rounded-2xl flex-row items-center justify-center active:opacity-70"
            >
              <SettingsIcon size={20} color="#666" />
              <Text className="ml-2 text-gray-900 dark:text-white font-semibold text-base">
                Manage Subscription
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => setShowPaywall(true)}
            className="py-3 items-center active:opacity-70"
          >
            <Text className="text-gray-600 dark:text-gray-400 text-sm">
              View All Plans
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modals */}
      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseSuccess={() => {
          console.log('✅ Purchase successful!');
          // Optionally show a success message or navigate somewhere
        }}
      />

      <CustomerCenter
        visible={showCustomerCenter}
        onClose={() => setShowCustomerCenter(false)}
      />
    </View>
  );
}
