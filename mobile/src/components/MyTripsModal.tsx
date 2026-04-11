 import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, Pressable, Image, ScrollView, Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin, Calendar, Check, HelpCircle, XCircle,
  MessageCircle, X, Users, Clock, DollarSign,
  Trash2, AlertTriangle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import PublicProfileView, { PublicProfileData } from '@/components/PublicProfileView';
import { useMyTrips, useJoinTrip, useLeaveTrip, useDeleteTrip, TripWithDetails } from '@/lib/hooks/useTrips';
import { useCreateTripConversation, useCreateDirectConversation } from '@/lib/hooks/useChat';
import { useCurrentUser } from '@/lib/hooks/useUsers';

type MyTripsTab = 'in' | 'maybe';

interface TripMemberDisplay {
  id: string;
  name: string;
  age: number;
  image: string;
  photos: string[];
  country: string;
  isHost: boolean;
  status: 'in' | 'maybe';
}

const formatDates = (trip: TripWithDetails): string => {
  if (!trip.start_date) return 'Flexible Dates';
  const start = new Date(trip.start_date);
  const end = trip.end_date ? new Date(trip.end_date) : null;
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return end ? `${fmt(start)} - ${fmt(end)}` : fmt(start);
};

const buildTripMembers = (trip: TripWithDetails): TripMemberDisplay[] =>
  trip.members
    .filter((m): m is typeof m & { status: 'in' | 'maybe' } =>
      m.status === 'in' || m.status === 'maybe'
    )
    .map(m => ({
      id: m.user_id,
      name: m.user.name ?? 'Traveler',
      age: m.user.age ?? 0,
      image: m.user.photos?.[0] ?? m.user.profile_photo ?? '',
      photos: m.user.photos ?? [],
      country: m.user.country ?? '',
      isHost: m.user_id === trip.creator_id,
      status: m.status as 'in' | 'maybe',
    }));

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function MyTripsModal({ visible, onClose }: Props) {
  const [myTripsTab, setMyTripsTab] = useState<MyTripsTab>('in');
  const [showTripDetail, setShowTripDetail] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<0 | 1 | 2>(0);
  const [selectedProfile, setSelectedProfile] = useState<PublicProfileData | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTripContext, setProfileTripContext] = useState<TripWithDetails | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const router = useRouter();

  const { data: myTripsData, isLoading: myTripsLoading, error: myTripsError } = useMyTrips();
  const myTrips = myTripsData?.trips ?? [];
  const currentUserIdFromTrips = myTripsData?.userId ?? null;
  const { data: currentUser } = useCurrentUser();
  const joinTrip = useJoinTrip();
  const leaveTrip = useLeaveTrip();
  const deleteTrip = useDeleteTrip();
  const createTripConversation = useCreateTripConversation();
  const createDirectConversation = useCreateDirectConversation();

  const currentUserId = currentUserIdFromTrips ?? currentUser?.id ?? null;

  const tripsIn = useMemo(
    () => myTrips.filter(t => t.members.find(m => m.user_id === currentUserId)?.status === 'in'),
    [myTrips, currentUserId]
  );
  const tripsMaybe = useMemo(
    () => myTrips.filter(t => t.members.find(m => m.user_id === currentUserId)?.status === 'maybe'),
    [myTrips, currentUserId]
  );
  const currentTrips = myTripsTab === 'in' ? tripsIn : tripsMaybe;

  const getUserStatusForTrip = (trip: TripWithDetails): 'in' | 'maybe' | null =>
    (trip.members.find(m => m.user_id === currentUserId)?.status as 'in' | 'maybe' | null) ?? null;

  const handleGroupChat = useCallback(async (trip: TripWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const conversationId = await createTripConversation.mutateAsync({
        tripId: trip.id,
        name: `${trip.destination} Trip`,
      });
      onClose();
      setTimeout(() => {
        router.push({ pathname: '/chat', params: { chatId: conversationId } });
      }, 100);
    } catch (e) {
      console.error('Failed to create trip conversation', e);
    }
  }, [createTripConversation, router, onClose]);

  const openTripDetail = useCallback((trip: TripWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTrip(trip);
    setShowTripDetail(true);
  }, []);

  const convertPersonToProfile = useCallback((person: TripMemberDisplay): PublicProfileData => {
    const allPhotos = person.photos?.length ? person.photos : [person.image].filter(Boolean);
    return {
      id: person.id,
      name: person.name,
      age: person.age,
      image: allPhotos[0] ?? person.image,
      images: allPhotos,
      country: person.country,
      city: person.country,
      bio: `Travel enthusiast from ${person.country}`,
      fullBio: `I'm ${person.name}, a passionate traveler from ${person.country}.`,
      verified: false,
      travelStyles: ['Adventure', 'Cultural', 'Relaxed'],
      vibes: ['Adventure', 'Cultural'],
      placesVisited: [],
      destinations: [],
      languages: ['English'],
      availability: '',
      socialEnergy: 'extrovert',
      travelPace: 'balanced',
      planningStyle: 'flexible',
      experience: 'intermediate',
      instagram: '',
    };
  }, []);

  const checkUserJoinedTrip = useCallback(
    (trip: TripWithDetails): boolean =>
      trip.members.find(m => m.user_id === currentUserId)?.status === 'in',
    [currentUserId]
  );

  const openProfile = useCallback((person: TripMemberDisplay, trip: TripWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!currentUser) { setShowAuthModal(true); return; }
    setSelectedProfile(convertPersonToProfile(person));
    setProfileTripContext(trip);
    setShowProfileModal(true);
  }, [currentUser, convertPersonToProfile]);

  const handleMessageFromProfile = useCallback(async () => {
    if (!selectedProfile) return;
    try {
      const conversationId = await createDirectConversation.mutateAsync(selectedProfile.id);
      setShowProfileModal(false);
      onClose();
      setTimeout(() => {
        router.push({ pathname: '/chat', params: { chatId: conversationId } });
      }, 100);
    } catch (e) {
      console.error('Failed to create direct conversation', e);
    }
  }, [selectedProfile, createDirectConversation, router, onClose]);

  const handleJoinTripFromProfile = useCallback(async () => {
    if (!profileTripContext) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await joinTrip.mutateAsync({ tripId: profileTripContext.id, status: 'in' });
    } catch (e) {
      console.error('Failed to join trip', e);
    }
    setShowProfileModal(false);
    setTimeout(() => setShowProfileModal(true), 300);
  }, [profileTripContext, joinTrip]);

  // ── Trip Detail Modal ──────────────────────────────────────────────────────
  const renderTripDetailModal = () => {
    if (!selectedTrip) return null;
    const people = buildTripMembers(selectedTrip);
    const peopleIn = people.filter(p => p.status === 'in');
    const peopleMaybe = people.filter(p => p.status === 'maybe');
    const userStatus = getUserStatusForTrip(selectedTrip);

    return (
      <Modal
        visible={showTripDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setDeleteConfirmStep(0); setShowTripDetail(false); }}
      >
        <View className="flex-1 bg-black">
          {/* Header Image */}
          <View style={{ height: 220 }}>
            <Image
              source={{ uri: selectedTrip.cover_image ?? selectedTrip.images?.[0] ?? '' }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.95)']}
              locations={[0, 0.3, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} edges={['top']}>
              <View className="flex-row items-center justify-between px-4 py-2">
                <Pressable
                  onPress={() => { setDeleteConfirmStep(0); setShowTripDetail(false); }}
                  className="bg-black/50 p-2 rounded-full"
                >
                  <X size={24} color="#fff" strokeWidth={2} />
                </Pressable>
                <View style={{ backgroundColor: userStatus === 'in' ? '#ffffff' : 'rgba(255,255,255,0.18)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 }}>
                  <Text style={{ color: userStatus === 'in' ? '#000' : 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>
                    {userStatus === 'in' ? "I'm In" : 'Maybe'}
                  </Text>
                </View>
              </View>
            </SafeAreaView>
            <View className="absolute bottom-4 left-4 right-4">
              <View className="flex-row items-center mb-1">
                <MapPin size={16} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                <Text className="text-white/60 text-sm ml-1">{selectedTrip.country}</Text>
              </View>
              <Text className="text-white text-3xl font-bold">{selectedTrip.destination}</Text>
            </View>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="p-4">
              {/* Quick Info */}
              <View className="flex-row flex-wrap mb-4">
                <View className="bg-neutral-900 px-4 py-3 rounded-xl mr-3 mb-3 flex-row items-center">
                  <Calendar size={16} color="#6b7280" strokeWidth={2} />
                  <Text className="text-white font-medium ml-2">{formatDates(selectedTrip)}</Text>
                </View>
                {selectedTrip.budget_level && (
                  <View className="bg-neutral-900 px-4 py-3 rounded-xl mr-3 mb-3 flex-row items-center">
                    <DollarSign size={16} color="#6b7280" strokeWidth={2} />
                    <Text className="text-white font-medium ml-2">{selectedTrip.budget_level}</Text>
                  </View>
                )}
                {selectedTrip.max_group_size && (
                  <View className="bg-neutral-900 px-4 py-3 rounded-xl mb-3 flex-row items-center">
                    <Users size={16} color="#6b7280" strokeWidth={2} />
                    <Text className="text-white font-medium ml-2">Up to {selectedTrip.max_group_size} people</Text>
                  </View>
                )}
              </View>

              {selectedTrip.pace && (
                <View className="flex-row mb-4">
                  <View className="bg-neutral-900 px-4 py-3 rounded-xl mr-3 flex-row items-center">
                    <Clock size={16} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                    <Text className="text-gray-400 text-sm ml-2">Pace:</Text>
                    <Text className="text-white font-medium ml-1">{selectedTrip.pace}</Text>
                  </View>
                </View>
              )}

              {selectedTrip.vibes && selectedTrip.vibes.length > 0 && (
                <>
                  <Text className="text-white text-lg font-semibold mb-3">Trip Vibes</Text>
                  <View className="flex-row flex-wrap mb-4">
                    {selectedTrip.vibes.map((vibe, i) => (
                      <View key={i} className="bg-white/10 px-4 py-2 rounded-full mr-2 mb-2">
                        <Text className="text-white/60 font-medium">{vibe}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {selectedTrip.description && (
                <>
                  <Text className="text-white text-lg font-semibold mb-3">About This Trip</Text>
                  <Text className="text-gray-400 text-base leading-7 mb-4">
                    {selectedTrip.description}
                  </Text>
                </>
              )}

              {peopleIn.length > 0 && (
                <>
                  <Text className="text-white text-lg font-semibold mb-3">Going ({peopleIn.length})</Text>
                  <View className="mb-4">
                    {peopleIn.map((person, i) => (
                      <Pressable
                        key={i}
                        onPress={() => openProfile(person, selectedTrip)}
                        className="bg-neutral-900 flex-row items-center p-3 rounded-xl mb-2 active:opacity-80"
                      >
                        <Image source={{ uri: person.image }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                        <View className="flex-1 ml-3">
                          <View className="flex-row items-center">
                            <Text className="text-white font-semibold">{person.name}, {person.age}</Text>
                            {person.isHost && (
                              <View className="bg-white px-2 py-0.5 rounded-full ml-2">
                                <Text className="text-white text-xs font-semibold">Host</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-gray-500 text-sm">{person.country}</Text>
                        </View>
                        <View className="bg-white/10 px-2 py-1 rounded-full">
                          <Text className="text-white/60 text-xs font-medium">Going</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {peopleMaybe.length > 0 && (
                <>
                  <Text className="text-white text-lg font-semibold mb-3">Maybe ({peopleMaybe.length})</Text>
                  <View className="mb-4">
                    {peopleMaybe.map((person, i) => (
                      <Pressable
                        key={i}
                        onPress={() => openProfile(person, selectedTrip)}
                        className="bg-neutral-900 flex-row items-center p-3 rounded-xl mb-2 active:opacity-80"
                      >
                        <Image source={{ uri: person.image }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                        <View className="flex-1 ml-3">
                          <View className="flex-row items-center">
                            <Text className="text-white font-semibold">{person.name}, {person.age}</Text>
                            {person.isHost && (
                              <View className="bg-white px-2 py-0.5 rounded-full ml-2">
                                <Text className="text-white text-xs font-semibold">Host</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-gray-500 text-sm">{person.country}</Text>
                        </View>
                        <View className="bg-gray-500/20 px-2 py-1 rounded-full">
                          <Text className="text-gray-400 text-xs font-medium">Maybe</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <SafeAreaView edges={['bottom']} className="px-4 pb-4 pt-4 border-t border-white/10">
            {selectedTrip.creator_id === currentUserId && (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setDeleteConfirmStep(1); }}
                className="flex-row items-center justify-center py-3 mb-3 rounded-xl active:opacity-80"
                style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}
              >
                <Trash2 size={17} color="#ef4444" strokeWidth={2} />
                <Text className="text-red-400 font-semibold ml-2">Delete Trip</Text>
              </Pressable>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); joinTrip.mutate({ tripId: selectedTrip.id, status: 'in' }); }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 14, backgroundColor: userStatus === 'in' ? '#ffffff' : '#1a1a1a', borderWidth: 0.5, borderColor: userStatus === 'in' ? '#ffffff' : 'rgba(255,255,255,0.08)' }}
              >
                <Check size={17} color={userStatus === 'in' ? '#000' : 'rgba(255,255,255,0.45)'} strokeWidth={2.5} />
                <Text style={{ color: userStatus === 'in' ? '#000' : 'rgba(255,255,255,0.45)', marginLeft: 6, fontWeight: '700', fontFamily: 'Outfit-Bold', fontSize: 14 }}>I'm In</Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); joinTrip.mutate({ tripId: selectedTrip.id, status: 'maybe' }); }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 14, backgroundColor: userStatus === 'maybe' ? 'rgba(255,255,255,0.12)' : '#1a1a1a', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <HelpCircle size={17} color={userStatus === 'maybe' ? '#fff' : 'rgba(255,255,255,0.35)'} strokeWidth={2} />
                <Text style={{ color: userStatus === 'maybe' ? '#fff' : 'rgba(255,255,255,0.35)', marginLeft: 6, fontWeight: '600', fontFamily: 'Outfit-SemiBold', fontSize: 14 }}>Maybe</Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); leaveTrip.mutate(selectedTrip.id); setShowTripDetail(false); }}
                style={{ paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <XCircle size={17} color="rgba(239,68,68,0.7)" strokeWidth={2} />
              </Pressable>
            </View>

            {userStatus === 'in' && (
              <Pressable
                onPress={() => handleGroupChat(selectedTrip)}
                className="bg-white/10 flex-row items-center justify-center py-3 rounded-xl active:opacity-80"
              >
                <MessageCircle size={18} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                <Text className="text-white/60 font-semibold ml-2">Message Group</Text>
              </Pressable>
            )}
          </SafeAreaView>

          {/* Delete confirm step 1 */}
          {deleteConfirmStep === 1 && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <View style={{ backgroundColor: '#1a1a1a', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                <View style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 50, padding: 16, marginBottom: 20 }}>
                  <Trash2 size={32} color="#ef4444" strokeWidth={1.5} />
                </View>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>Delete Trip?</Text>
                <Text style={{ color: '#9ca3af', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                  This will permanently delete your {selectedTrip.destination} trip, remove all members, and delete the group chat.
                </Text>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setDeleteConfirmStep(2); }}
                  style={{ backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10 }}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Yes, Delete Trip</Text>
                </Pressable>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDeleteConfirmStep(0); }}
                  style={{ paddingVertical: 12, width: '100%', alignItems: 'center' }}
                >
                  <Text style={{ color: '#6b7280', fontSize: 15 }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Delete confirm step 2 */}
          {deleteConfirmStep === 2 && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <View style={{ backgroundColor: '#1a1a1a', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)' }}>
                <View style={{ backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 50, padding: 16, marginBottom: 20 }}>
                  <AlertTriangle size={32} color="#ef4444" strokeWidth={1.5} />
                </View>
                <Text style={{ color: '#ef4444', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>Are you absolutely sure?</Text>
                <Text style={{ color: '#9ca3af', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                  This cannot be undone. Your {selectedTrip.destination} trip and all associated data will be gone forever.
                </Text>
                <Pressable
                  onPress={async () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    try {
                      await deleteTrip.mutateAsync(selectedTrip.id);
                      setDeleteConfirmStep(0);
                      setShowTripDetail(false);
                    } catch (e) {
                      console.error('Failed to delete trip', e);
                      setDeleteConfirmStep(0);
                    }
                  }}
                  disabled={deleteTrip.isPending}
                  style={{ backgroundColor: deleteTrip.isPending ? '#7f1d1d' : '#ef4444', borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10, opacity: deleteTrip.isPending ? 0.7 : 1 }}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                    {deleteTrip.isPending ? 'Deleting...' : 'Delete Forever'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDeleteConfirmStep(0); }}
                  style={{ paddingVertical: 12, width: '100%', alignItems: 'center' }}
                >
                  <Text style={{ color: '#6b7280', fontSize: 15 }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  // ── Main Modal ─────────────────────────────────────────────────────────────
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
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', fontFamily: 'Outfit-ExtraBold' }}>My Trips</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 2, fontSize: 13 }}>{myTrips.length} trip{myTrips.length !== 1 ? 's' : ''}</Text>
              </View>
              <Pressable
                onPress={onClose}
                style={{ backgroundColor: '#1a1a1a', padding: 8, borderRadius: 100 }}
              >
                <X size={22} color="#fff" strokeWidth={2} />
              </Pressable>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: '#111', borderRadius: 18, padding: 4 }}>
              {(['in', 'maybe'] as const).map(tab => {
                const count = tab === 'in' ? tripsIn.length : tripsMaybe.length;
                const active = myTripsTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => { Haptics.selectionAsync(); setMyTripsTab(tab); }}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      paddingVertical: 11, borderRadius: 14,
                      backgroundColor: active ? '#ffffff' : 'transparent', gap: 6,
                    }}
                  >
                    {tab === 'in'
                      ? <Check size={16} color={active ? '#000' : '#6b7280'} strokeWidth={2} />
                      : <HelpCircle size={16} color={active ? '#000' : '#6b7280'} strokeWidth={2} />
                    }
                    <Text style={{ color: active ? '#000' : '#6b7280', fontWeight: active ? '700' : '500', fontSize: 14, fontFamily: active ? 'Outfit-Bold' : 'Outfit-Regular' }}>
                      {tab === 'in' ? "I'm In" : 'Maybe'}
                    </Text>
                    {count > 0 && (
                      <View style={{ backgroundColor: active ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)', borderRadius: 8, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                        <Text style={{ color: active ? '#000' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' }}>{count}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Content */}
          {myTripsLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontFamily: 'Outfit-Regular' }}>Loading your trips...</Text>
            </View>
          ) : myTripsError ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8, fontFamily: 'Outfit-Bold' }}>Failed to load trips</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontFamily: 'Outfit-Regular' }}>
                {myTripsError instanceof Error ? myTripsError.message : 'Something went wrong'}
              </Text>
            </View>
          ) : currentTrips.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
              <View style={{ backgroundColor: '#111', padding: 24, borderRadius: 100, marginBottom: 24 }}>
                {myTripsTab === 'in'
                  ? <Check size={48} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
                  : <HelpCircle size={48} color="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                }
              </View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8, fontFamily: 'Outfit-Bold' }}>
                {myTripsTab === 'in' ? 'No confirmed trips' : 'No maybe trips'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, textAlign: 'center', fontFamily: 'Outfit-Regular' }}>
                {myTripsTab === 'in' ? 'Swipe right on trips to join them!' : "Trips you're considering will appear here"}
              </Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {currentTrips.map((trip) => {
                const userStatus = getUserStatusForTrip(trip);
                const coverImage = trip.cover_image ?? trip.images?.[0] ?? '';
                return (
                  <Pressable
                    key={trip.id}
                    onPress={() => openTripDetail(trip)}
                    style={{ borderRadius: 22, marginBottom: 14, overflow: 'hidden', backgroundColor: '#0d0d0d' }}
                  >
                    {/* Full image card — Adventures style */}
                    <View style={{ height: 200 }}>
                      <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      <LinearGradient
                        colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.95)']}
                        locations={[0, 0.3, 0.7, 1]}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                      />
                      {/* Status pill — top right */}
                      <View style={{ position: 'absolute', top: 14, right: 14, backgroundColor: userStatus === 'in' ? '#fff' : 'rgba(255,255,255,0.18)', paddingHorizontal: 13, paddingVertical: 6, borderRadius: 100, borderWidth: userStatus === 'in' ? 0 : 0.5, borderColor: 'rgba(255,255,255,0.3)' }}>
                        <Text style={{ color: userStatus === 'in' ? '#000' : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>{userStatus === 'in' ? "I'm In" : 'Maybe'}</Text>
                      </View>
                      {/* Destination — bottom of image */}
                      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                          <MapPin size={11} color="rgba(255,255,255,0.5)" strokeWidth={2} />
                          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginLeft: 4, fontFamily: 'Outfit-Regular' }}>{trip.country}</Text>
                        </View>
                        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', fontFamily: 'Outfit-ExtraBold', letterSpacing: -0.5 }}>{trip.destination}</Text>
                        {trip.start_date && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                            <Calendar size={11} color="rgba(255,255,255,0.4)" strokeWidth={2} />
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>{formatDates(trip)}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Action row */}
                    <View style={{ padding: 12, gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); joinTrip.mutate({ tripId: trip.id, status: 'in' }); }}
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: userStatus === 'in' ? '#ffffff' : '#1a1a1a', borderWidth: 0.5, borderColor: userStatus === 'in' ? '#ffffff' : 'rgba(255,255,255,0.08)' }}
                        >
                          <Check size={15} color={userStatus === 'in' ? '#000' : 'rgba(255,255,255,0.4)'} strokeWidth={2.5} />
                          <Text style={{ color: userStatus === 'in' ? '#000' : 'rgba(255,255,255,0.4)', marginLeft: 6, fontWeight: '700', fontSize: 13, fontFamily: 'Outfit-Bold' }}>I'm In</Text>
                        </Pressable>
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); joinTrip.mutate({ tripId: trip.id, status: 'maybe' }); }}
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: userStatus === 'maybe' ? 'rgba(255,255,255,0.12)' : '#1a1a1a', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }}
                        >
                          <HelpCircle size={15} color={userStatus === 'maybe' ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth={2} />
                          <Text style={{ color: userStatus === 'maybe' ? '#fff' : 'rgba(255,255,255,0.3)', marginLeft: 6, fontWeight: '600', fontSize: 13, fontFamily: 'Outfit-SemiBold' }}>Maybe</Text>
                        </Pressable>
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); leaveTrip.mutate(trip.id); }}
                          style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }}
                        >
                          <XCircle size={15} color="rgba(239,68,68,0.7)" strokeWidth={2} />
                        </Pressable>
                      </View>
                      {userStatus === 'in' && (
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); handleGroupChat(trip); }}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: '#1a1a1a', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                          <MessageCircle size={15} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginLeft: 6, fontFamily: 'Outfit-SemiBold', fontSize: 13 }}>Message Group</Text>
                        </Pressable>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </SafeAreaView>

        {renderTripDetailModal()}

        <PublicProfileView
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profile={selectedProfile}
          showConnectButton={false}
          showMessageButton={!!(profileTripContext && checkUserJoinedTrip(profileTripContext))}
          onMessage={handleMessageFromProfile}
          isLimitedView={profileTripContext ? !checkUserJoinedTrip(profileTripContext) : false}
          onJoinTrip={profileTripContext ? handleJoinTripFromProfile : undefined}
          tripDestination={profileTripContext?.destination}
        />

        {/* Auth Modal */}
        <Modal visible={showAuthModal} transparent animationType="fade" onRequestClose={() => setShowAuthModal(false)}>
          <Pressable onPress={() => setShowAuthModal(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' }}>
            <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: '#111', borderRadius: 24, padding: 24, marginHorizontal: 24 }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>Create an account</Text>
              <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>Create an account to join trips and view full profiles</Text>
              <Pressable
                onPress={() => { setShowAuthModal(false); onClose(); router.push('/'); }}
                style={{ backgroundColor: '#fff', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#000', fontWeight: '700', fontSize: 15, fontFamily: 'Outfit-Bold' }}>Get Started</Text>
              </Pressable>
              <Pressable onPress={() => setShowAuthModal(false)} style={{ paddingVertical: 12, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: '#6b7280' }}>Maybe Later</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}