 import { View, Text, Pressable, Linking, Alert, ScrollView, ActivityIndicator, Modal } from 'react-native';
  import PremiumPaywall from '@/components/PremiumPaywall';
  import { SubscriptionPlan } from '@/lib/state/premium-store';
  import { SafeAreaView } from 'react-native-safe-area-context';
  import { useRouter } from 'expo-router';
  import { ArrowLeft, Shield, HelpCircle, ChevronRight, Trash2, Star } from 'lucide-react-native';
  import { useState } from 'react';
  import { supabase, getCurrentUserId } from '@/lib/supabase';
  import AsyncStorage from '@react-native-async-storage/async-storage';

  export default function SettingsScreen() {
    const router = useRouter();
    const [showPaywall, setShowPaywall] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const openPrivacyPolicy = async () => {
      const url = 'https://sites.google.com/view/privacypolicytag/p%C3%A1gina-principal';
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert('Error', 'Could not open the link.');
      }
    };

    const openContactSupport = async () => {
      const url = 'https://sites.google.com/view/tagalongs/p%C3%A1gina-principal';
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert('Error', 'Could not open the link.');
      }
    };

    const handleDeleteAccount = () => {
      // Step 1 — first confirmation
      Alert.alert(
        'Delete Account',
        'This will permanently delete your account and all your data. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: confirmDeleteAccount,
          },
        ]
      );
    };

    const confirmDeleteAccount = () => {
      // Step 2 — final confirmation
      Alert.alert(
        'Are you sure?',
        'Your profile, trips, matches, and messages will be deleted forever.',
        [
          { text: 'Go Back', style: 'cancel' },
          {
            text: 'Yes, Delete Everything',
            style: 'destructive',
            onPress: executeDeleteAccount,
          },
        ]
      );
    };

    const executeDeleteAccount = async () => {
      setIsDeleting(true);
      try {
        // Delete profile photos from storage first (cannot be done inside SQL)
        try {
          const userId = await getCurrentUserId();
          if (userId) {
            const { data: files } = await supabase.storage.from('profile-photos').list(userId);
            if (files && files.length > 0) {
              const paths = files.map(f => `${userId}/${f.name}`);
              await supabase.storage.from('profile-photos').remove(paths);
            }
          }
        } catch {
          // Non-fatal — continue with account deletion
        }

        // Delete all user data atomically in a single database transaction
        const { error } = await supabase.rpc('delete_user_account');
        if (error) throw error;

        // Clear all local storage and sign out
        await AsyncStorage.clear();
        await supabase.auth.signOut();

        // Navigate to onboarding
        router.replace('/onboarding');

      } catch (error: any) {
        console.error('Delete account error:', error);
        Alert.alert('Error', 'Something went wrong while deleting your account. Please try again.');
        setIsDeleting(false);
      }
    };

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={['top']}>
        {/* Loading overlay */}
        {isDeleting && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99,
          }}>
            <ActivityIndicator size="large" color="#ef4444" />
            <Text style={{ color: '#ffffff', marginTop: 16, fontSize: 16 }}>Deleting account...</Text>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
            paddingVertical: 16,
            position: 'relative',
          }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                position: 'absolute',
                left: 16,
                backgroundColor: 'rgba(255,255,255,0.12)',
                padding: 8,
                borderRadius: 50,
              }}
            >
              <ArrowLeft size={20} color="#ffffff" strokeWidth={2.5} />
            </Pressable>
            <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '600' }}>Settings</Text>
          </View>

          {/* ABOUT Section */}
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <Text style={{
              color: '#6b7280',
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 1,
              marginBottom: 8,
              marginLeft: 4,
            }}>
              ABOUT
            </Text>

            <View style={{ backgroundColor: '#111111', borderRadius: 14, overflow: 'hidden' }}>

              {/* TagAlong+ Subscription Row */}
              <Pressable
                onPress={() => setShowPaywall(true)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: pressed ? '#1c1c1c' : 'transparent',
                })}
              >
                <View style={{
                  width: 32, height: 32, backgroundColor: '#f59e0b',
                  borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12,
                }}>
                  <Star size={18} color="#ffffff" strokeWidth={2} />
                </View>
                <Text style={{ color: '#ffffff', fontSize: 16, flex: 1 }}>TagAlong+</Text>
                <ChevronRight size={18} color="#4b5563" strokeWidth={2} />
              </Pressable>

              <View style={{ height: 1, backgroundColor: '#1f1f1f', marginLeft: 60 }} />

              {/* Privacy Policy Row */}
              <Pressable
                onPress={openPrivacyPolicy}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: pressed ? '#1c1c1c' : 'transparent',
                })}
              >
                <View style={{
                  width: 32, height: 32, backgroundColor: '#10b981',
                  borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12,
                }}>
                  <Shield size={18} color="#ffffff" strokeWidth={2} />
                </View>
                <Text style={{ color: '#ffffff', fontSize: 16, flex: 1 }}>Privacy Policy</Text>
                <ChevronRight size={18} color="#4b5563" strokeWidth={2} />
              </Pressable>

              <View style={{ height: 1, backgroundColor: '#1f1f1f', marginLeft: 60 }} />

              {/* Contact Support Row */}
              <Pressable
                onPress={openContactSupport}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: pressed ? '#1c1c1c' : 'transparent',
                })}
              >
                <View style={{
                  width: 32, height: 32, backgroundColor: '#3b82f6',
                  borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12,
                }}>
                  <HelpCircle size={18} color="#ffffff" strokeWidth={2} />
                </View>
                <Text style={{ color: '#ffffff', fontSize: 16, flex: 1 }}>Contact Support</Text>
                <ChevronRight size={18} color="#4b5563" strokeWidth={2} />
              </Pressable>

            </View>
          </View>

          {/* DANGER ZONE Section */}
          <View style={{ paddingHorizontal: 16, marginTop: 32, marginBottom: 40 }}>
            <Text style={{
              color: '#6b7280',
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 1,
              marginBottom: 8,
              marginLeft: 4,
            }}>
              DANGER ZONE
            </Text>

            <View style={{ backgroundColor: '#111111', borderRadius: 14, overflow: 'hidden' }}>
              <Pressable
                onPress={handleDeleteAccount}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: pressed ? '#2a1010' : 'transparent',
                })}
              >
                <View style={{
                  width: 32, height: 32, backgroundColor: '#ef4444',
                  borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12,
                }}>
                  <Trash2 size={18} color="#ffffff" strokeWidth={2} />
                </View>
                <Text style={{ color: '#ef4444', fontSize: 16, flex: 1 }}>Delete Account</Text>
                <ChevronRight size={18} color="#4b5563" strokeWidth={2} />
              </Pressable>
            </View>
          </View>

        </ScrollView>
        {/* TagAlong+ Paywall Modal */}
        <Modal
          visible={showPaywall}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPaywall(false)}
        >
          <PremiumPaywall
            onClose={() => setShowPaywall(false)}
            onSubscribe={(_plan: SubscriptionPlan) => {
              setShowPaywall(false);
            }}
          />
        </Modal>
      </SafeAreaView>
    );                                                                                                                                                                              
  }
                                     