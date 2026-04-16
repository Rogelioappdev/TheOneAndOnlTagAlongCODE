import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { X } from 'lucide-react-native';
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
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff' }}>
            Manage Subscription
          </Text>
          <Pressable
            onPress={onClose}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} color="#fff" />
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, textAlign: 'center' }}>
            {subscriptionDetails?.isPremium
              ? 'You have an active TagAlong+ subscription.'
              : 'No active subscription.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
