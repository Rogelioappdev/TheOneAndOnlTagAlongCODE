import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

export function Paywall({ visible, onClose }: PaywallProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff' }}>TagAlong+</Text>
          <Pressable
            onPress={onClose}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} color="#fff" />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 24, paddingVertical: 32 }}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 24 }}
          >
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 }}>
              Unlock Premium
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
              Get unlimited access to all premium features
            </Text>
          </LinearGradient>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, textAlign: 'center' }}>
            Subscription options are not available in this environment.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <Pressable
            onPress={onClose}
            style={{ paddingVertical: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
