 import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, Image, ScrollView, Modal,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, MapPin, Users, X } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useMutualMatches,
  usePendingRequests,
  useRealtimeMatches,
  type MatchWithDetails,
} from '@/lib/hooks/useMatches';
import { useGetOrCreateDMChat } from '@/lib/hooks/useChat';
import PublicProfileView, { PublicProfileData } from '@/components/PublicProfileView';
import type { UserProfile } from '@/lib/database.types';

const ACCENT  = '#ff375f';
const GREEN   = '#10b981';
const TEXT    = '#ffffff';
const TEXT2   = 'rgba(255,255,255,0.55)';
const SURFACE = '#111111';
const SURFACE2 = '#1a1a1a';
const BORDER  = 'rgba(255,255,255,0.08)';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function MatchesModal({ visible, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'matches' | 'requests'>('matches');
  const [refreshing, setRefreshing] = useState(false);
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [messagingUserId, setMessagingUserId] = useState<string | null>(null);

  const router = useRouter();

  const { data: mutualMatches = [], isLoading: loadingMutual, refetch: refetchMutual } = useMutualMatches();
  const { data: pendingRequests = [], isLoading: loadingRequests, refetch: refetchRequests } = usePendingRequests();
  const getOrCreateDM = useGetOrCreateDMChat();

  // Subscribe to realtime match updates
  useRealtimeMatches();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMutual(), refetchRequests()]);
    setRefreshing(false);
  }, [refetchMutual, refetchRequests]);

  const handleMessage = useCallback((userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessagingUserId(userId);
    getOrCreateDM.mutate(userId, {
      onSuccess: () => {
        setMessagingUserId(null);
        onClose();
        setTimeout(() => router.push('/(tabs)/messages'), 100);
      },
      onError: () => {
        setMessagingUserId(null);
        onClose();
        setTimeout(() => router.push('/(tabs)/messages'), 100);
      },
    });
  }, [getOrCreateDM, router, onClose]);

  const profileData: PublicProfileData | null = profileUser ? {
    id: profileUser.id,
    name: profileUser.name,
    age: profileUser.age ?? 0,
    country: profileUser.country ?? '',
    city: profileUser.city ?? '',
    bio: profileUser.bio ?? undefined,
    image: profileUser.photos?.[0] ?? profileUser.profile_photo ?? '',
    images: profileUser.photos?.length
      ? profileUser.photos
      : profileUser.profile_photo ? [profileUser.profile_photo] : [],
    travelStyles: profileUser.travel_styles ?? [],
    travelPace: profileUser.travel_pace ?? undefined,
    socialEnergy: profileUser.social_energy ?? undefined,
    planningStyle: profileUser.planning_style ?? undefined,
    experience: profileUser.experience_level ?? undefined,
    languages: profileUser.languages ?? [],
    placesVisited: profileUser.places_visited ?? [],
    bucketList: profileUser.bucket_list ?? [],
    verified: profileUser.is_verified ?? false,
  } : null;

  const isLoading = activeTab === 'matches' ? loadingMutual : loadingRequests;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: TEXT, fontSize: 34, fontWeight: '700', letterSpacing: -0.5, fontFamily: 'Outfit-Bold' }}>
                Matches
              </Text>
              <Pressable
                onPress={onClose}
                style={{ backgroundColor: SURFACE2, padding: 8, borderRadius: 100 }}
              >
                <X size={22} color={TEXT} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Tab pills */}
            <View style={{ flexDirection: 'row', backgroundColor: SURFACE2, borderRadius: 16, padding: 4 }}>
              {(['matches', 'requests'] as const).map(tab => {
                const count = tab === 'matches' ? mutualMatches.length : pendingRequests.length;
                const active = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      paddingVertical: 10, borderRadius: 14, gap: 6,
                      backgroundColor: active ? ACCENT : 'transparent',
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : TEXT2, fontWeight: active ? '700' : '500', fontSize: 14, fontFamily: active ? 'Outfit-Bold' : 'Outfit-Regular' }}>
                      {tab === 'matches' ? 'Matches' : 'Requests'}
                    </Text>
                    {count > 0 && (
                      <View style={{
                        backgroundColor: active ? 'rgba(255,255,255,0.25)' : ACCENT,
                        borderRadius: 10, minWidth: 20, height: 20,
                        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
                      }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                          {count > 99 ? '99+' : count}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: BORDER, marginHorizontal: 20 }} />

          {/* Content */}
          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={ACCENT} size="large" />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
              }
            >
              {/* MATCHES TAB */}
              {activeTab === 'matches' && (
                mutualMatches.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 }}>
                    <LinearGradient
                      colors={['#ff375f', '#ff2d55']}
                      style={{ width: 80, height: 80, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
                    >
                      <Heart size={38} color="#fff" fill="#fff" strokeWidth={0} />
                    </LinearGradient>
                    <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center', fontFamily: 'Outfit-Bold' }}>
                      No matches yet
                    </Text>
                    <Text style={{ color: TEXT2, fontSize: 15, textAlign: 'center', lineHeight: 22, fontFamily: 'Outfit-Regular' }}>
                      Start swiping on companions in the Tag Along tab to find your travel match.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={{ color: TEXT2, fontSize: 13, fontWeight: '500', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {mutualMatches.length} mutual {mutualMatches.length === 1 ? 'match' : 'matches'}
                    </Text>
                    {mutualMatches.map((match, i) => {
                      const user = match.other_user;
                      if (!user) return null;
                      const photo = user.photos?.[0] ?? user.profile_photo ?? null;
                      return (
                        <Animated.View key={match.id} entering={FadeInDown.delay(i * 60).springify()}>
                          <Pressable
                            onPress={() => setProfileUser(user)}
                            style={{ backgroundColor: SURFACE, borderRadius: 20, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER }}
                          >
                            <View style={{ flexDirection: 'row', padding: 14, alignItems: 'center', gap: 14 }}>
                              {/* Avatar */}
                              <View style={{ position: 'relative' }}>
                                {photo ? (
                                  <Image source={{ uri: photo }} style={{ width: 64, height: 64, borderRadius: 20 }} />
                                ) : (
                                  <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 24 }}>👤</Text>
                                  </View>
                                )}
                                <View style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: ACCENT, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: SURFACE }}>
                                  <Heart size={10} color="#fff" fill="#fff" strokeWidth={0} />
                                </View>
                              </View>
                              {/* Info */}
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', marginBottom: 2, fontFamily: 'Outfit-Bold' }}>
                                  {user.name}{user.age ? `, ${user.age}` : ''}
                                </Text>
                                {(user.city || user.country) && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                                    <MapPin size={12} color={TEXT2} strokeWidth={2} />
                                    <Text style={{ color: TEXT2, fontSize: 13 }}>
                                      {[user.city, user.country].filter(Boolean).join(', ')}
                                    </Text>
                                  </View>
                                )}
                                {user.travel_styles && user.travel_styles.length > 0 && (
                                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                    {user.travel_styles.slice(0, 2).map(s => (
                                      <View key={s} style={{ backgroundColor: 'rgba(255,55,95,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                                        <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>{s}</Text>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                              {/* Message button */}
                              <Pressable
                                onPress={(e) => { e.stopPropagation(); handleMessage(user.id); }}
                                disabled={messagingUserId === user.id}
                                style={{ backgroundColor: messagingUserId === user.id ? SURFACE2 : GREEN, borderRadius: 14, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                              >
                                {messagingUserId === user.id
                                  ? <ActivityIndicator size="small" color={GREEN} />
                                  : <MessageCircle size={20} color="#fff" strokeWidth={2} />
                                }
                              </Pressable>
                            </View>
                            {match.trip && (
                              <View style={{ paddingHorizontal: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <MapPin size={12} color={GREEN} strokeWidth={2} />
                                <Text style={{ color: GREEN, fontSize: 12, fontWeight: '500' }}>
                                  Matched via {match.trip.destination}
                                </Text>
                              </View>
                            )}
                          </Pressable>
                        </Animated.View>
                      );
                    })}
                  </>
                )
              )}

              {/* REQUESTS TAB */}
              {activeTab === 'requests' && (
                pendingRequests.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 }}>
                    <LinearGradient
                      colors={['#ff9f0a', '#ff6b00']}
                      style={{ width: 80, height: 80, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
                    >
                      <Users size={38} color="#fff" strokeWidth={2} />
                    </LinearGradient>
                    <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center', fontFamily: 'Outfit-Bold' }}>
                      No pending requests
                    </Text>
                    <Text style={{ color: TEXT2, fontSize: 15, textAlign: 'center', lineHeight: 22, fontFamily: 'Outfit-Regular' }}>
                      When you like someone, they'll appear here while you wait for them to like you back.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={{ color: TEXT2, fontSize: 13, fontWeight: '500', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {pendingRequests.length} pending {pendingRequests.length === 1 ? 'request' : 'requests'}
                    </Text>
                    {pendingRequests.map((match, i) => {
                      const user = match.other_user;
                      if (!user) return null;
                      const photo = user.photos?.[0] ?? user.profile_photo ?? null;
                      return (
                        <Animated.View key={match.id} entering={FadeInDown.delay(i * 50).springify()}>
                          <Pressable
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setProfileUser(user); }}
                            style={{ backgroundColor: SURFACE, borderRadius: 20, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER }}
                          >
                            <View style={{ flexDirection: 'row', padding: 14, alignItems: 'center', gap: 14 }}>
                              <View>
                                {photo ? (
                                  <Image source={{ uri: photo }} style={{ width: 60, height: 60, borderRadius: 18 }} />
                                ) : (
                                  <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 22 }}>👤</Text>
                                  </View>
                                )}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: TEXT, fontSize: 15, fontWeight: '700', marginBottom: 2, fontFamily: 'Outfit-Bold' }}>
                                  {user.name}{user.age ? `, ${user.age}` : ''}
                                </Text>
                                {(user.city || user.country) && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MapPin size={11} color={TEXT2} strokeWidth={2} />
                                    <Text style={{ color: TEXT2, fontSize: 12 }}>
                                      {[user.city, user.country].filter(Boolean).join(', ')}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <View style={{ backgroundColor: 'rgba(255,55,95,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
                                <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700' }}>Pending</Text>
                              </View>
                            </View>
                          </Pressable>
                        </Animated.View>
                      );
                    })}
                  </>
                )
              )}
            </ScrollView>
          )}
        </SafeAreaView>

        {/* Profile viewer */}
        {profileData && (
          <PublicProfileView
            visible
            profile={profileData}
            onClose={() => setProfileUser(null)}
            showConnectButton={false}
            showMessageButton
            onMessage={async () => {
              if (profileUser) {
                setProfileUser(null);
                handleMessage(profileUser.id);
              }
            }}
          />
        )}
      </View>
    </Modal>
  );
}