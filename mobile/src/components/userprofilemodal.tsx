import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Dimensions,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronDown,
  MapPin,
  BadgeCheck,
  Globe,
  Heart,
  X,
  MessageCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import TripDetailSheet from './tripDetailSheet';

const { width } = Dimensions.get('window');

const STYLE_EMOJI: Record<string, string> = {
  luxury: '✨', backpacking: '🎒', relaxed: '🏖️', cultural: '🏛️',
  budget: '💰', adventure: '🏔️', party: '🎉', foodie: '🍜',
};
const PACE_LABELS: Record<string, string> = {
  slow: '🐢 Slow & Steady', balanced: '⚖️ Balanced', fast: '🚀 Go Go Go!',
};
const ENERGY_LABELS: Record<string, string> = {
  introvert: '🌙 Introvert', extrovert: '☀️ Extrovert', ambivert: '🌗 Ambivert',
};
const PLAN_LABELS: Record<string, string> = {
  planner: '🗓 Planner', spontaneous: '🎲 Spontaneous', flexible: '🤸 Flexible',
};

interface Props {
  userId: string | null;
  visible: boolean;
  onClose: () => void;
  onConnect?: () => void;
  onMessage?: () => void;
  showConnectButton?: boolean;
  showMessageButton?: boolean;
  isConnected?: boolean;
}

export default function UserProfileModal({
  userId, visible, onClose,
  onConnect, onMessage,
  showConnectButton = false, showMessageButton = false,
  isConnected = false,
}: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile-modal', userId],
    enabled: !!userId && visible,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: tripsCount = 0 } = useQuery({
    queryKey: ['user-trips-count', userId],
    enabled: !!userId && visible,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('trip_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId!);
      return count ?? 0;
    },
  });

  const { data: matchesCount = 0 } = useQuery({
    queryKey: ['user-matches-count', userId],
    enabled: !!userId && visible,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      return count ?? 0;
    },
  });

  const { data: userTrips = [] } = useQuery({
    queryKey: ['user-trips', userId],
    enabled: !!userId && visible,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('trip_members')
        .select(`
          trip:trips!trip_id(
            id, destination, country, cover_image, start_date, end_date,
            is_flexible_dates, vibes, budget_level, max_group_size, description, creator_id,
            members:trip_members(id, user_id, user:users(id, name, profile_photo, age))
          )
        `)
        .eq('user_id', userId!)
        .limit(12);
      return (data ?? []).map((row: any) => row.trip).filter(Boolean);
    },
  });

  const selectedTrip = userTrips.find((t: any) => t.id === selectedTripId) ?? null;

  const photos = profile
    ? ([profile.profile_photo, ...(profile.photos ?? [])].filter(Boolean) as string[])
    : [];

  const dnaChips = profile
    ? (
        [
          profile.travel_pace ? PACE_LABELS[profile.travel_pace] : null,
          profile.social_energy ? ENERGY_LABELS[profile.social_energy] : null,
          profile.planning_style ? PLAN_LABELS[profile.planning_style] : null,
        ].filter(Boolean) as string[]
      )
    : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {isLoading || !profile ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#F0EBE3" />
          </View>
        ) : (
          <>
            {/* ── Hero ── */}
            <View style={{ height: 400 }}>
              {/* Swipeable photos */}
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={photos.length > 1}
                onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                  setPhotoIndex(idx);
                }}
                style={{ width, height: 400 }}
              >
                {photos.length > 0 ? photos.map((photo, i) => (
                  <Pressable key={i} onPress={() => { setPreviewPhotoIndex(i); setShowPhotoPreview(true); }}>
                    <Image
                      source={{ uri: photo }}
                      style={{ width, height: 400 }}
                      contentFit="cover"
                    />
                  </Pressable>
                )) : (
                  <View style={{ width, height: 400, backgroundColor: '#111' }} />
                )}
              </ScrollView>

              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,1)']}
                locations={[0, 0.25, 0.65, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}
              />

              <SafeAreaView
                style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
                edges={['top']}
              >
                <Pressable onPress={onClose} style={{ padding: 16, alignSelf: 'flex-start' }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      borderRadius: 20,
                      padding: 8,
                    }}
                  >
                    <ChevronDown size={22} color="#fff" strokeWidth={2} />
                  </View>
                </Pressable>
              </SafeAreaView>

              {/* Photo dots — only when > 1 photo */}
              {photos.length > 1 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 60,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 5,
                    pointerEvents: 'none',
                  }}
                >
                  {photos.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: i === photoIndex ? 22 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor:
                          i === photoIndex ? '#F0EBE3' : 'rgba(255,255,255,0.35)',
                      }}
                    />
                  ))}
                </View>
              )}

              {/* Name overlay */}
              <View
                style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 30,
                      fontFamily: 'Outfit-Bold',
                      letterSpacing: -0.5,
                    }}
                  >
                    {profile.name}
                  </Text>
                  {profile.age ? (
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.55)',
                        fontSize: 24,
                        fontFamily: 'Outfit-Light',
                      }}
                    >
                      {profile.age}
                    </Text>
                  ) : null}
                  {profile.is_verified ? (
                    <BadgeCheck
                      size={18}
                      color="#F0EBE3"
                      fill="rgba(240,235,227,0.15)"
                    />
                  ) : null}
                </View>
                {(profile.city || profile.country) ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 4,
                      gap: 4,
                    }}
                  >
                    <MapPin size={12} color="rgba(255,255,255,0.45)" strokeWidth={2} />
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.45)',
                        fontSize: 13,
                        fontFamily: 'Outfit-Regular',
                      }}
                    >
                      {[profile.city, profile.country].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ── Body ── */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
            >
              {/* Stats row */}
              <View
                style={{
                  flexDirection: 'row',
                  borderBottomWidth: 0.5,
                  borderBottomColor: 'rgba(255,255,255,0.08)',
                }}
              >
                {[
                  { value: tripsCount, label: 'Trips' },
                  { value: matchesCount, label: 'Matches' },
                  { value: (profile.places_visited ?? []).length, label: 'Places' },
                ].map((stat, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 16,
                      borderRightWidth: i < 2 ? 0.5 : 0,
                      borderRightColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Text
                      style={{
                        color: '#F0EBE3',
                        fontSize: 22,
                        fontFamily: 'Outfit-Bold',
                      }}
                    >
                      {stat.value}
                    </Text>
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.38)',
                        fontSize: 11,
                        fontFamily: 'Outfit-Regular',
                        marginTop: 2,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                      }}
                    >
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={{ padding: 20, gap: 22 }}>
                {/* Bio */}
                {!!profile.bio && (
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.72)',
                      fontSize: 15,
                      lineHeight: 23,
                      fontFamily: 'Outfit-Regular',
                    }}
                  >
                    {profile.bio}
                  </Text>
                )}

                {/* Travel DNA */}
                {((profile.travel_styles ?? []).length > 0 || dnaChips.length > 0) && (
                  <View>
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: 10,
                        fontFamily: 'Outfit-SemiBold',
                        letterSpacing: 1.4,
                        textTransform: 'uppercase',
                        marginBottom: 10,
                      }}
                    >
                      Travel DNA
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                      {(profile.travel_styles ?? []).map((s: string) => (
                        <View
                          key={s}
                          style={{
                            backgroundColor: 'rgba(240,235,227,0.1)',
                            borderRadius: 20,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: '#F0EBE3',
                              fontSize: 13,
                              fontFamily: 'Outfit-SemiBold',
                            }}
                          >
                            {STYLE_EMOJI[s] ?? ''} {s}
                          </Text>
                        </View>
                      ))}
                      {dnaChips.map((chip, i) => (
                        <View
                          key={i}
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.07)',
                            borderRadius: 20,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: 'rgba(255,255,255,0.55)',
                              fontSize: 13,
                              fontFamily: 'Outfit-SemiBold',
                            }}
                          >
                            {chip}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Been to */}
                {(profile.places_visited ?? []).length > 0 && (
                  <View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 10,
                      }}
                    >
                      <Globe size={12} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.3)',
                          fontSize: 10,
                          fontFamily: 'Outfit-SemiBold',
                          letterSpacing: 1.4,
                          textTransform: 'uppercase',
                        }}
                      >
                        Been To
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                      {(profile.places_visited ?? []).slice(0, 12).map(
                        (place: string, i: number) => (
                          <View
                            key={i}
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              borderRadius: 16,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                            }}
                          >
                            <Text
                              style={{
                                color: 'rgba(255,255,255,0.48)',
                                fontSize: 12,
                                fontFamily: 'Outfit-Regular',
                              }}
                            >
                              🌍 {place}
                            </Text>
                          </View>
                        )
                      )}
                    </View>
                  </View>
                )}

                {/* Bucket list */}
                {(profile.bucket_list ?? []).length > 0 && (
                  <View>
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: 10,
                        fontFamily: 'Outfit-SemiBold',
                        letterSpacing: 1.4,
                        textTransform: 'uppercase',
                        marginBottom: 10,
                      }}
                    >
                      Bucket List
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                      {(profile.bucket_list ?? []).slice(0, 8).map(
                        (place: string, i: number) => (
                          <View
                            key={i}
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              borderRadius: 16,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                            }}
                          >
                            <Text
                              style={{
                                color: 'rgba(255,255,255,0.48)',
                                fontSize: 12,
                                fontFamily: 'Outfit-Regular',
                              }}
                            >
                              ✈️ {place}
                            </Text>
                          </View>
                        )
                      )}
                    </View>
                  </View>
                )}

                {/* Languages */}
                {(profile.languages ?? []).length > 0 && (
                  <View>
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: 10,
                        fontFamily: 'Outfit-SemiBold',
                        letterSpacing: 1.4,
                        textTransform: 'uppercase',
                        marginBottom: 10,
                      }}
                    >
                      Languages
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                      {(profile.languages ?? []).map((lang: string, i: number) => (
                        <View
                          key={i}
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.07)',
                            borderRadius: 16,
                            paddingHorizontal: 12,
                            paddingVertical: 5,
                          }}
                        >
                          <Text
                            style={{
                              color: 'rgba(255,255,255,0.52)',
                              fontSize: 13,
                              fontFamily: 'Outfit-Regular',
                            }}
                          >
                            {lang}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Trips */}
                {userTrips.length > 0 && (
                  <View>
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: 10,
                        fontFamily: 'Outfit-SemiBold',
                        letterSpacing: 1.4,
                        textTransform: 'uppercase',
                        marginBottom: 10,
                      }}
                    >
                      Adventures
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ flexGrow: 0, marginHorizontal: -20 }}
                      contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                    >
                      {userTrips.map((trip: any, i: number) => (
                        <Pressable
                          key={i}
                          onPress={() => setSelectedTripId(trip.id)}
                          style={{
                            width: 110,
                            height: 150,
                            borderRadius: 14,
                            overflow: 'hidden',
                            backgroundColor: '#111',
                            justifyContent: 'flex-end',
                          }}
                        >
                          {trip.cover_image ? (
                            <Image
                              source={{ uri: trip.cover_image }}
                              style={StyleSheet.absoluteFillObject}
                              contentFit="cover"
                            />
                          ) : null}
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.85)']}
                            locations={[0.4, 1]}
                            style={StyleSheet.absoluteFillObject}
                          />
                          <Text
                            style={{
                              color: '#fff',
                              fontSize: 12,
                              fontFamily: 'Outfit-Bold',
                              padding: 10,
                              letterSpacing: -0.2,
                            }}
                            numberOfLines={2}
                          >
                            {trip.destination}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </ScrollView>

          </>
        )}

        {/* ── Bottom Actions ── */}
        {(showConnectButton || showMessageButton) && (
          <SafeAreaView
            edges={['bottom']}
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 8,
              borderTopWidth: 0.5,
              borderTopColor: 'rgba(255,255,255,0.08)',
              backgroundColor: '#000',
            }}
          >
            {showMessageButton && onMessage ? (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onMessage();
                }}
                style={{
                  backgroundColor: '#F0EBE3',
                  borderRadius: 999,
                  paddingVertical: 15,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <MessageCircle size={19} color="#000" strokeWidth={2} />
                <Text style={{ color: '#000', fontSize: 15, fontFamily: 'Outfit-SemiBold' }}>
                  Send Message
                </Text>
              </Pressable>
            ) : showConnectButton ? (
              <Pressable
                onPress={() => {
                  if (!isConnected) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onConnect?.();
                  }
                }}
                disabled={isConnected}
                style={{
                  backgroundColor: isConnected ? 'rgba(255,255,255,0.08)' : '#F0EBE3',
                  borderRadius: 999,
                  paddingVertical: 15,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Heart
                  size={19}
                  color={isConnected ? 'rgba(255,255,255,0.4)' : '#000'}
                  fill={isConnected ? 'rgba(255,255,255,0.15)' : 'transparent'}
                  strokeWidth={2}
                />
                <Text style={{
                  color: isConnected ? 'rgba(255,255,255,0.4)' : '#000',
                  fontSize: 15,
                  fontFamily: 'Outfit-SemiBold',
                }}>
                  {isConnected ? 'Already Liked' : 'Connect'}
                </Text>
              </Pressable>
            ) : null}
          </SafeAreaView>
        )}

        {/* Full-Screen Photo Preview */}
        <Modal visible={showPhotoPreview} animationType="fade" onRequestClose={() => setShowPhotoPreview(false)}>
          <View style={{ flex: 1, backgroundColor: '#000', paddingTop: 54 }}>
            {/* X button row */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 8 }}>
              <Pressable
                onPress={() => setShowPhotoPreview(false)}
                style={{ backgroundColor: '#ffffff', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} color="#000" strokeWidth={2.5} />
              </Pressable>
            </View>
            {/* Photos */}
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: previewPhotoIndex * width, y: 0 }}
              onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                setPreviewPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width));
              }}
              style={{ flex: 1 }}
            >
              {photos.map((photo, i) => (
                <Image key={i} source={{ uri: photo }} style={{ width, flex: 1 }} contentFit="contain" />
              ))}
            </ScrollView>
            {/* Dots */}
            {photos.length > 1 && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 20 }}>
                {photos.map((_, i) => (
                  <View key={i} style={{ width: i === previewPhotoIndex ? 22 : 6, height: 6, borderRadius: 3, backgroundColor: i === previewPhotoIndex ? '#F0EBE3' : 'rgba(255,255,255,0.35)' }} />
                ))}
              </View>
            )}
          </View>
        </Modal>

        {/* Trip detail sheet */}
        <TripDetailSheet
          trip={selectedTrip ? {
            destination: selectedTrip.destination,
            country: selectedTrip.country,
            cover_image: selectedTrip.cover_image,
            start_date: selectedTrip.start_date,
            end_date: selectedTrip.end_date,
            is_flexible_dates: selectedTrip.is_flexible_dates,
            vibes: selectedTrip.vibes ?? [],
            budget_level: selectedTrip.budget_level,
            max_group_size: selectedTrip.max_group_size,
            description: selectedTrip.description,
            members: (selectedTrip.members ?? []).map((m: any) => ({
              id: m.id,
              name: m.user?.name ?? 'Traveler',
              photo: m.user?.profile_photo ?? null,
              age: m.user?.age ?? null,
              isCreator: m.user_id === selectedTrip.creator_id,
            })),
          } : null}
          visible={!!selectedTripId}
          onClose={() => setSelectedTripId(null)}
        />
      </View>
    </Modal>
  );
}
