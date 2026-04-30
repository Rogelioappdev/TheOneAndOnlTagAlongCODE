import { useState, useCallback, useMemo, memo } from 'react';
import {
  View, Text, Pressable, ScrollView, Modal,
  ActivityIndicator, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin, Calendar, Check, HelpCircle, XCircle,
  MessageCircle, X, Users, Clock, DollarSign,
  Trash2, AlertTriangle, Bookmark, Plus, ChevronDown,
} from 'lucide-react-native';
import TripJoinAnimation from '@/components/TripJoinAnimation';
import TripMembersSection from '@/components/TripMembersSection';
import type { TripPerson } from '@/components/WhoIsGoing';
import { calculateTripMatch } from '@/lib/matching';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import PublicProfileView, { PublicProfileData } from '@/components/PublicProfileView';
import { useMyTrips, useJoinTrip, useLeaveTrip, useDeleteTrip, useSavedTrips, useUnsaveTrip, useJoinTripChat, TripWithDetails } from '@/lib/hooks/useTrips';
import { useCreateTripConversation, useCreateDirectConversation } from '@/lib/hooks/useChat';
import { useCurrentUser } from '@/lib/hooks/useUsers';
import useUserProfileStore from '@/lib/state/user-profile-store';
import UserAvatar from '@/components/UserAvatar';

type MainTab = 'saved' | 'mytrips';
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

const SavedTripCard = memo(({ trip, onOpen, onConfirmUnsave, onJoin, onJoinChat }: {
  trip: TripWithDetails;
  onOpen: () => void;
  onConfirmUnsave: () => void;
  onJoin: () => void;
  onJoinChat: () => void;
}) => {
  const coverImage = trip.cover_image ?? trip.images?.[0] ?? '';
  const memberCount = trip.members?.filter(m => m.status === 'in').length ?? 0;
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => ({
        borderRadius: 22, marginBottom: 16,
        backgroundColor: '#0d0d0d',
        borderWidth: 1,
        borderColor: pressed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
      })}
    >
      <View style={{ height: 200 }}>
        <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.97)']}
          locations={[0, 0.25, 0.65, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)' }}>
          <Bookmark size={11} color="#F0EBE3" strokeWidth={2} />
          <Text style={{ color: '#F0EBE3', fontSize: 10, fontWeight: '700', fontFamily: 'Outfit-Bold', letterSpacing: 0.3 }}>SAVED</Text>
        </View>
        <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)' }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: 'Outfit-Regular' }}>Tap to view →</Text>
        </View>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <MapPin size={11} color="rgba(255,255,255,0.5)" strokeWidth={2} />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginLeft: 4, fontFamily: 'Outfit-Regular' }}>{trip.country}</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', fontFamily: 'Outfit-ExtraBold', letterSpacing: -0.6 }}>{trip.destination}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 5 }}>
            {trip.start_date && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Calendar size={11} color="rgba(255,255,255,0.45)" strokeWidth={2} />
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>{formatDates(trip)}</Text>
              </View>
            )}
            {memberCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Users size={11} color="rgba(255,255,255,0.45)" strokeWidth={2} />
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>{memberCount} going</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 14, paddingTop: 8, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' }}>
          <View style={{ alignItems: 'center', gap: 7 }}>
            <Pressable
              onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onConfirmUnsave(); }}
              style={({ pressed }) => ({ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#3a1010' : '#2a0e0e', borderWidth: 1.5, borderColor: '#FF453A' })}
            >
              <X size={24} color="#FF453A" strokeWidth={2.5} />
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>Pass</Text>
          </View>

          <View style={{ alignItems: 'center', gap: 7 }}>
            <Pressable
              onPress={(e) => { e.stopPropagation(); onJoin(); }}
              style={({ pressed }) => ({ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#2a5c38' : '#1a3d25', borderWidth: 2, borderColor: '#30D158' })}
            >
              <Check size={28} color="#30D158" strokeWidth={2.8} />
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>Join</Text>
          </View>

          <View style={{ alignItems: 'center', gap: 7 }}>
            <Pressable
              onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onConfirmUnsave(); }}
              style={({ pressed }) => ({ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#2a2518' : '#1e1c14', borderWidth: 1.5, borderColor: 'rgba(240,235,227,0.45)' })}
            >
              <Bookmark size={22} color="#F0EBE3" strokeWidth={2} />
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>Unsave</Text>
          </View>
        </View>

        {/* Join Group Chat */}
        <Pressable
          onPress={(e) => { e.stopPropagation(); onJoinChat(); }}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 13, borderRadius: 16,
            backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
            borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)',
          })}
        >
          <MessageCircle size={16} color="rgba(255,255,255,0.55)" strokeWidth={2} />
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Outfit-SemiBold' }}>
            Join Group Chat to learn more
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
});

interface Props {
  visible: boolean;
  onClose: () => void;
  initialTab?: MainTab;
}

export default function MyTripsModal({ visible, onClose, initialTab = 'saved' }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);
  const [myTripsTab, setMyTripsTab] = useState<MyTripsTab>('in');
  const [showTripDetail, setShowTripDetail] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [localDetailStatus, setLocalDetailStatus] = useState<'in' | 'maybe' | 'left' | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<0 | 1 | 2>(0);
  const [selectedProfile, setSelectedProfile] = useState<PublicProfileData | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTripContext, setProfileTripContext] = useState<TripWithDetails | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSavedDetail, setShowSavedDetail] = useState(false);
  const [selectedSavedTrip, setSelectedSavedTrip] = useState<TripWithDetails | null>(null);
  const [showJoinAnim, setShowJoinAnim] = useState(false);
  const [joinAnimDest, setJoinAnimDest] = useState('');
  const [joinAnimCover, setJoinAnimCover] = useState('');
  const [joinAnimCrew, setJoinAnimCrew] = useState<string[]>([]);
  const [confirmUnsaveTrip, setConfirmUnsaveTrip] = useState<TripWithDetails | null>(null);

  const router = useRouter();

  const { data: myTripsData, isLoading: myTripsLoading, error: myTripsError } = useMyTrips();
  const myTrips = myTripsData?.trips ?? [];
  const currentUserIdFromTrips = myTripsData?.userId ?? null;
  const { data: currentUser } = useCurrentUser();
  const userProfile = useUserProfileStore(s => s.profile);
  const { data: savedTrips = [], isLoading: savedLoading } = useSavedTrips();
  const joinTrip = useJoinTrip();
  const unsaveTrip = useUnsaveTrip();
  const joinTripChat = useJoinTripChat();
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
      await createTripConversation.mutateAsync({
        tripId: trip.id,
        name: `${trip.destination} Trip`,
      });
    } catch (e) {
      // conversation may already exist, that's fine
    }
    onClose();
    setTimeout(() => {
      router.push('/(tabs)/messages');
    }, 100);
  }, [createTripConversation, router, onClose]);

  const triggerJoinAnimation = useCallback((trip: TripWithDetails) => {
    const crew = (trip.members ?? [])
      .filter(m => m.status === 'in')
      .map(m => m.user.photos?.[0] ?? m.user.profile_photo ?? '')
      .filter(Boolean)
      .slice(0, 4);
    setJoinAnimDest(trip.destination);
    setJoinAnimCover(trip.cover_image ?? trip.images?.[0] ?? '');
    setJoinAnimCrew(crew);
    setShowJoinAnim(true);
  }, []);

  const openTripDetail = useCallback((trip: TripWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTrip(trip);
    setLocalDetailStatus(null);
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

  // ── Saved Trip Detail Modal (feed-style) ──────────────────────────────────
  const renderSavedTripDetail = () => {
    const trip = selectedSavedTrip;
    if (!trip) return null;

    const coverImage = trip.cover_image ?? trip.images?.[0] ?? '';
    const dates = formatDates(trip);
    const people: TripPerson[] = (trip.members ?? [])
      .filter(m => m.status === 'in' || m.status === 'maybe')
      .map(m => ({
        userId: m.user_id,
        name: m.user.name ?? 'Traveler',
        age: m.user.age ?? 0,
        image: m.user.photos?.[0] ?? m.user.profile_photo ?? null,
        photos: m.user.photos ?? [],
        country: m.user.country ?? '',
        isHost: m.user_id === trip.creator_id,
        travelStyles: m.user.travel_styles ?? [],
        travelPace: m.user.travel_pace ?? null,
        socialEnergy: m.user.social_energy ?? null,
        planningStyle: m.user.planning_style ?? null,
        experience: m.user.experience_level ?? null,
        languages: m.user.languages ?? [],
      }));

    const matchPercentage = calculateTripMatch(userProfile, {
      id: trip.id,
      destination: trip.destination,
      country: trip.country,
      vibes: trip.vibes ?? [],
      people,
    });

    const paceLabel: Record<string, string> = { slow: 'Slow & Steady', balanced: 'Balanced', fast: 'Fast-Paced' };

    return (
      <Modal
        visible={showSavedDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSavedDetail(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000', flexDirection: 'column' }}>
          {/* Hero */}
          <View style={{ height: 300 }}>
            <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            <LinearGradient
              colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.92)']}
              locations={[0, 0.3, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} edges={['top']}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 }}>
                <Pressable
                  onPress={() => setShowSavedDetail(false)}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronDown size={20} color="#fff" strokeWidth={2.5} />
                </Pressable>
                {matchPercentage > 0 && (
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.48)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, fontFamily: 'Outfit-ExtraBold' }}>{matchPercentage}%</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>match</Text>
                  </View>
                )}
              </View>
            </SafeAreaView>
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <MapPin size={13} color="#F0EBE3" strokeWidth={2} />
                <Text style={{ color: '#F0EBE3', fontSize: 13, fontFamily: 'Outfit-Regular' }}>{trip.country}</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1.2, lineHeight: 42, fontFamily: 'Outfit-ExtraBold' }}>
                {trip.destination}
              </Text>
            </View>
          </View>

          {/* Body */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Info chips */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 20, gap: 8 }}>
              {[
                { label: 'Dates', value: dates || 'Flexible' },
                { label: 'Budget', value: trip.budget_level ?? 'TBD' },
                { label: 'Group', value: trip.max_group_size ? `Up to ${trip.max_group_size}` : 'Open' },
              ].map(item => (
                <View key={item.label} style={{ flex: 1, backgroundColor: '#0F0F0F', borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginBottom: 5, fontFamily: 'Outfit-Regular' }}>{item.label}</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>{item.value}</Text>
                </View>
              ))}
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 26 }}>
              {/* Vibes */}
              {(trip.vibes ?? []).length > 0 && (
                <>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 12, fontFamily: 'Outfit-Bold' }}>Trip Vibes</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 26 }}>
                    {trip.vibes.map((vibe, i) => (
                      <View key={i} style={{ backgroundColor: 'rgba(240,235,227,0.1)', borderWidth: 0.5, borderColor: 'rgba(240,235,227,0.25)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22 }}>
                        <Text style={{ color: '#F0EBE3', fontWeight: '600', fontSize: 14, fontFamily: 'Outfit-SemiBold' }}>{vibe}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Description */}
              {!!trip.description && (
                <>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 10, fontFamily: 'Outfit-Bold' }}>About This Trip</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.52)', fontSize: 15, lineHeight: 24, marginBottom: 26, fontFamily: 'Outfit-Regular' }}>
                    {trip.description}
                  </Text>
                </>
              )}

              {/* Members */}
              {people.length > 0 && <TripMembersSection people={people} />}

              {/* Trip style */}
              {(trip.pace || trip.group_preference) && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 12, fontFamily: 'Outfit-Bold' }}>Trip Style</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {trip.pace ? (
                      <View style={{ flex: 1, backgroundColor: '#0F0F0F', borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginBottom: 5, fontFamily: 'Outfit-Regular' }}>Daily Pace</Text>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>{paceLabel[trip.pace] ?? trip.pace}</Text>
                      </View>
                    ) : null}
                    {trip.group_preference ? (
                      <View style={{ flex: 1, backgroundColor: '#0F0F0F', borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginBottom: 5, fontFamily: 'Outfit-Regular' }}>Group</Text>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>{trip.group_preference}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom action row: 3 clear equal boxes */}
          <View style={{ backgroundColor: 'rgba(0,0,0,0.97)', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32, gap: 10 }}>
            {/* Join — primary, full width */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                joinTrip.mutate({ tripId: trip.id, status: 'in' }, {
                  onSuccess: () => {
                    unsaveTrip.mutate(trip.id);
                    setShowSavedDetail(false);
                    triggerJoinAnimation(trip);
                  },
                });
              }}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                paddingVertical: 17, borderRadius: 18, gap: 10,
                backgroundColor: pressed ? '#e8e8e8' : '#ffffff',
              })}
            >
              <Check size={20} color="#000" strokeWidth={2.8} />
              <Text style={{ color: '#000', fontSize: 17, fontWeight: '800', fontFamily: 'Outfit-Bold' }}>Join Trip</Text>
            </Pressable>

            {/* Pass + Unsave — side by side */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  unsaveTrip.mutate(trip.id);
                  setShowSavedDetail(false);
                }}
                style={({ pressed }) => ({
                  flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
                  paddingVertical: 16, borderRadius: 18,
                  backgroundColor: pressed ? 'rgba(255,69,58,0.2)' : 'rgba(255,69,58,0.12)',
                  borderWidth: 1, borderColor: 'rgba(255,69,58,0.35)',
                })}
              >
                <X size={20} color="#FF453A" strokeWidth={2.5} />
                <Text style={{ color: '#FF453A', fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Pass</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  unsaveTrip.mutate(trip.id);
                  setShowSavedDetail(false);
                }}
                style={({ pressed }) => ({
                  flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
                  paddingVertical: 16, borderRadius: 18,
                  backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                })}
              >
                <Bookmark size={20} color="rgba(255,255,255,0.55)" strokeWidth={2} />
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>Unsave</Text>
              </Pressable>
            </View>

            {/* Join Group Chat — lurk before committing */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                joinTripChat.mutate(trip.id, {
                  onSuccess: () => {
                    onClose();
                    setTimeout(() => router.push('/(tabs)/messages'), 150);
                  },
                });
              }}
              disabled={joinTripChat.isPending}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
                paddingVertical: 15, borderRadius: 18,
                backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)',
                opacity: joinTripChat.isPending ? 0.6 : 1,
              })}
            >
              <MessageCircle size={17} color="rgba(255,255,255,0.55)" strokeWidth={2} />
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontFamily: 'Outfit-SemiBold' }}>
                Join Group Chat to learn more
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  // ── Trip Detail Modal ──────────────────────────────────────────────────────
  const renderTripDetailModal = () => {
    if (!selectedTrip) return null;
    const people = buildTripMembers(selectedTrip);
    const peopleIn = people.filter(p => p.status === 'in');
    const peopleMaybe = people.filter(p => p.status === 'maybe');
    const serverStatus = getUserStatusForTrip(selectedTrip);
    // localDetailStatus updates immediately on tap; falls back to server value
    const userStatus = localDetailStatus === 'left' ? null : (localDetailStatus ?? serverStatus);
    const coverUri = selectedTrip.cover_image ?? selectedTrip.images?.[0] ?? '';
    const isCreator = selectedTrip.creator_id === currentUserId;

    return (
      <Modal
        visible={showTripDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setDeleteConfirmStep(0); setShowTripDetail(false); }}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>

          {/* ── Hero ── */}
          <View style={{ height: 280 }}>
            <Image
              source={{ uri: coverUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.90)', 'rgba(0,0,0,0.98)']}
              locations={[0, 0.38, 0.60, 0.80, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            {/* Top bar */}
            <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 }}>
                <Pressable
                  onPress={() => { setDeleteConfirmStep(0); setShowTripDetail(false); }}
                  style={{ backgroundColor: 'rgba(0,0,0,0.48)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)' }}
                >
                  <X size={18} color="#fff" strokeWidth={2.5} />
                </Pressable>

                {/* Current status badge — updates instantly on tap */}
                <View style={{
                  backgroundColor:
                    localDetailStatus === 'left' ? 'rgba(239,68,68,0.18)' :
                    userStatus === 'in' ? '#fff' :
                    userStatus === 'maybe' ? 'rgba(255,255,255,0.18)' :
                    'rgba(0,0,0,0.48)',
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
                  borderWidth: 0.5,
                  borderColor:
                    localDetailStatus === 'left' ? 'rgba(239,68,68,0.4)' :
                    'rgba(255,255,255,0.22)',
                }}>
                  <Text style={{
                    color:
                      localDetailStatus === 'left' ? '#ef4444' :
                      userStatus === 'in' ? '#000' :
                      'rgba(255,255,255,0.8)',
                    fontSize: 12, fontWeight: '700', fontFamily: 'Outfit-Bold',
                  }}>
                    {localDetailStatus === 'left' ? 'Not Going' :
                     userStatus === 'in' ? "I'm In" :
                     userStatus === 'maybe' ? 'Maybe' : 'Not Going'}
                  </Text>
                </View>
              </View>
            </SafeAreaView>

            {/* Destination overlay */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <MapPin size={12} color="#F0EBE3" strokeWidth={2} />
                <Text style={{ color: '#F0EBE3', fontSize: 12, fontFamily: 'Outfit-Regular' }}>{selectedTrip.country}</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 34, fontFamily: 'Outfit-ExtraBold', letterSpacing: -1.3, lineHeight: 38 }}>
                {selectedTrip.destination}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
                {selectedTrip.start_date && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Outfit-Regular' }}>{formatDates(selectedTrip)}</Text>
                  </View>
                )}
                {selectedTrip.budget_level && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.3)' }}>·</Text>
                    <DollarSign size={12} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Outfit-Regular' }}>{selectedTrip.budget_level}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ── Body ── */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>

              {/* Vibe chips */}
              {(selectedTrip.vibes ?? []).length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {selectedTrip.vibes.map((vibe, i) => (
                    <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }}>
                      <Text style={{ color: '#F0EBE3', fontSize: 13, fontFamily: 'Outfit-SemiBold' }}>{vibe}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Group size pill */}
              {selectedTrip.max_group_size && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', marginBottom: 20 }}>
                  <Users size={14} color="rgba(255,255,255,0.5)" strokeWidth={2} />
                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Outfit-Regular' }}>Up to {selectedTrip.max_group_size} people</Text>
                </View>
              )}

              {/* Description */}
              {!!selectedTrip.description && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold', marginBottom: 8 }}>About This Trip</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.52)', fontSize: 15, lineHeight: 24, fontFamily: 'Outfit-Regular' }}>
                    {selectedTrip.description}
                  </Text>
                </View>
              )}

              {/* ── Status picker ── */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold', marginBottom: 12 }}>Your Status</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {/* I'm In */}
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLocalDetailStatus('in'); joinTrip.mutate({ tripId: selectedTrip.id, status: 'in' }); }}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: userStatus === 'in' ? '#ffffff' : '#111', borderWidth: 1, borderColor: userStatus === 'in' ? '#ffffff' : 'rgba(255,255,255,0.1)', gap: 5 }}
                  >
                    <Check size={18} color={userStatus === 'in' ? '#000' : 'rgba(255,255,255,0.4)'} strokeWidth={2.5} />
                    <Text style={{ color: userStatus === 'in' ? '#000' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>I'm In</Text>
                  </Pressable>
                  {/* Maybe */}
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLocalDetailStatus('maybe'); joinTrip.mutate({ tripId: selectedTrip.id, status: 'maybe' }); }}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: userStatus === 'maybe' ? 'rgba(255,255,255,0.12)' : '#111', borderWidth: 1, borderColor: userStatus === 'maybe' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)', gap: 5 }}
                  >
                    <HelpCircle size={18} color={userStatus === 'maybe' ? '#fff' : 'rgba(255,255,255,0.4)'} strokeWidth={2} />
                    <Text style={{ color: userStatus === 'maybe' ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>Maybe</Text>
                  </Pressable>
                  {/* Not Going */}
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setLocalDetailStatus('left'); leaveTrip.mutate(selectedTrip.id); setTimeout(() => setShowTripDetail(false), 600); }}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: localDetailStatus === 'left' ? 'rgba(239,68,68,0.12)' : '#111', borderWidth: 1, borderColor: localDetailStatus === 'left' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)', gap: 5 }}
                  >
                    <XCircle size={18} color="rgba(239,68,68,0.7)" strokeWidth={2} />
                    <Text style={{ color: 'rgba(239,68,68,0.7)', fontSize: 13, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>Not Going</Text>
                  </Pressable>
                </View>
              </View>

              {/* ── Message Group ── */}
              <Pressable
                onPress={() => handleGroupChat(selectedTrip)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  paddingVertical: 14, borderRadius: 16, marginBottom: 24,
                  backgroundColor: pressed ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                  gap: 8,
                })}
              >
                <MessageCircle size={18} color="rgba(255,255,255,0.75)" strokeWidth={2} />
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Message Group</Text>
              </Pressable>

              {/* ── Who's Going ── */}
              {peopleIn.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold', marginBottom: 12 }}>Going · {peopleIn.length}</Text>
                  {peopleIn.map((person, i) => (
                    <Pressable
                      key={i}
                      onPress={() => openProfile(person, selectedTrip)}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', padding: 12,
                        borderRadius: 18, marginBottom: 8,
                        backgroundColor: pressed ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.05)',
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
                      })}
                    >
                      <UserAvatar uri={person.image || null} name={person.name} size={46} borderRadius={14} style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' }} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Outfit-SemiBold' }}>{person.name}</Text>
                          {person.age > 0 && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'Outfit-Regular' }}>{person.age}</Text>}
                          {person.isHost && (
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Outfit-Bold' }}>Host</Text>
                            </View>
                          )}
                        </View>
                        {!!person.country && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'Outfit-Regular', marginTop: 2 }}>{person.country}</Text>}
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* ── Maybe section ── */}
              {peopleMaybe.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginHorizontal: 10 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'Outfit-Bold', letterSpacing: 0.4 }}>MAYBE · {peopleMaybe.length}</Text>
                    </View>
                    <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
                  </View>
                  {peopleMaybe.map((person, i) => (
                    <Pressable
                      key={i}
                      onPress={() => openProfile(person, selectedTrip)}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', padding: 12,
                        borderRadius: 18, marginBottom: 8,
                        backgroundColor: pressed ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                        opacity: 0.85,
                      })}
                    >
                      <Image source={{ uri: person.image }} style={{ width: 46, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' }} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, fontFamily: 'Outfit-SemiBold' }}>{person.name}</Text>
                          {person.age > 0 && <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>{person.age}</Text>}
                        </View>
                        {!!person.country && <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'Outfit-Regular', marginTop: 2 }}>{person.country}</Text>}
                      </View>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'Outfit-SemiBold' }}>Maybe</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* ── Delete Trip (creator only) ── */}
              {isCreator && (
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setDeleteConfirmStep(1); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', gap: 8 }}
                >
                  <Trash2 size={16} color="#ef4444" strokeWidth={2} />
                  <Text style={{ color: '#ef4444', fontSize: 14, fontFamily: 'Outfit-SemiBold' }}>Delete Trip</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>

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
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', fontFamily: 'Outfit-ExtraBold' }}>
                  {mainTab === 'saved' ? 'Saved Trips' : 'My Trips'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 2, fontSize: 13 }}>
                  {mainTab === 'saved'
                    ? `${savedTrips.length} saved`
                    : `${myTrips.length} trip${myTrips.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <Pressable onPress={onClose} style={{ backgroundColor: '#1a1a1a', padding: 8, borderRadius: 100 }}>
                <X size={22} color="#fff" strokeWidth={2} />
              </Pressable>
            </View>

            {/* Main Tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: '#111', borderRadius: 18, padding: 4 }}>
              {([
                { key: 'saved' as const, label: 'Saved', count: savedTrips.length },
                { key: 'mytrips' as const, label: 'My Trips', count: myTrips.length },
              ]).map(({ key, label, count }) => {
                const active = mainTab === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => { Haptics.selectionAsync(); setMainTab(key); }}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      paddingVertical: 11, borderRadius: 14,
                      backgroundColor: active ? '#ffffff' : 'transparent', gap: 6,
                    }}
                  >
                    {key === 'saved'
                      ? <Bookmark size={15} color={active ? '#000' : '#6b7280'} strokeWidth={2} />
                      : <Check size={15} color={active ? '#000' : '#6b7280'} strokeWidth={2.5} />
                    }
                    <Text style={{ color: active ? '#000' : '#6b7280', fontWeight: active ? '700' : '500', fontSize: 14, fontFamily: active ? 'Outfit-Bold' : 'Outfit-Regular' }}>
                      {label}
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

          {/* ── Saved Tab ── */}
          {mainTab === 'saved' && (
            savedLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontFamily: 'Outfit-Regular' }}>Loading saved trips...</Text>
              </View>
            ) : savedTrips.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                <View style={{ backgroundColor: '#111', padding: 24, borderRadius: 100, marginBottom: 24 }}>
                  <Bookmark size={48} color="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                </View>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8, fontFamily: 'Outfit-Bold' }}>No saved trips yet</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, textAlign: 'center', fontFamily: 'Outfit-Regular' }}>
                  Swipe right on trips to save them
                </Text>
              </View>
            ) : (
              <FlatList
                data={savedTrips}
                keyExtractor={(trip) => trip.id}
                renderItem={({ item: trip }) => <SavedTripCard
                  trip={trip}
                  onOpen={() => { setSelectedSavedTrip(trip); setShowSavedDetail(true); }}
                  onConfirmUnsave={() => setConfirmUnsaveTrip(trip)}
                  onJoin={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    joinTrip.mutate({ tripId: trip.id, status: 'in' }, {
                      onSuccess: () => {
                        unsaveTrip.mutate(trip.id);
                        triggerJoinAnimation(trip);
                      },
                    });
                  }}
                  onJoinChat={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    joinTripChat.mutate(trip.id, {
                      onSuccess: () => {
                        onClose();
                        setTimeout(() => router.push('/(tabs)/messages'), 100);
                      },
                    });
                  }}
                />}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={5}
              />
            )
          )}

          {/* ── My Trips Tab ── */}
          {mainTab === 'mytrips' && (
            <>
              {/* In / Maybe sub-tabs */}
              <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <View style={{ flexDirection: 'row', backgroundColor: '#111', borderRadius: 14, padding: 3 }}>
                  {(['in', 'maybe'] as const).map(tab => {
                    const count = tab === 'in' ? tripsIn.length : tripsMaybe.length;
                    const active = myTripsTab === tab;
                    return (
                      <Pressable
                        key={tab}
                        onPress={() => { Haptics.selectionAsync(); setMyTripsTab(tab); }}
                        style={{
                          flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                          paddingVertical: 9, borderRadius: 11,
                          backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'transparent', gap: 5,
                        }}
                      >
                        {tab === 'in'
                          ? <Check size={14} color={active ? '#fff' : '#6b7280'} strokeWidth={2.5} />
                          : <HelpCircle size={14} color={active ? '#fff' : '#6b7280'} strokeWidth={2} />
                        }
                        <Text style={{ color: active ? '#fff' : '#6b7280', fontWeight: active ? '700' : '500', fontSize: 13, fontFamily: active ? 'Outfit-Bold' : 'Outfit-Regular' }}>
                          {tab === 'in' ? "I'm In" : 'Maybe'}
                        </Text>
                        {count > 0 && (
                          <View style={{ backgroundColor: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)', borderRadius: 7, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                            <Text style={{ color: active ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' }}>{count}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

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
                    {myTripsTab === 'in' ? 'Tap Join on a trip to confirm!' : "Trips you're considering will appear here"}
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
                        <View style={{ height: 200 }}>
                          <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                          <LinearGradient
                            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.95)']}
                            locations={[0, 0.3, 0.7, 1]}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                          />
                          <View style={{ position: 'absolute', top: 14, right: 14, backgroundColor: userStatus === 'in' ? '#fff' : 'rgba(255,255,255,0.18)', paddingHorizontal: 13, paddingVertical: 6, borderRadius: 100, borderWidth: userStatus === 'in' ? 0 : 0.5, borderColor: 'rgba(255,255,255,0.3)' }}>
                            <Text style={{ color: userStatus === 'in' ? '#000' : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>{userStatus === 'in' ? "I'm In" : 'Maybe'}</Text>
                          </View>
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
            </>
          )}
        </SafeAreaView>

        {renderTripDetailModal()}
        {renderSavedTripDetail()}

        {/* ── Unsave confirmation sheet (Instagram-style) ── */}
        <Modal
          visible={!!confirmUnsaveTrip}
          transparent
          animationType="slide"
          onRequestClose={() => setConfirmUnsaveTrip(null)}
        >
          <Pressable
            onPress={() => setConfirmUnsaveTrip(null)}
            style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{
                backgroundColor: '#141414',
                borderTopLeftRadius: 32, borderTopRightRadius: 32,
                paddingTop: 14, paddingBottom: 52, paddingHorizontal: 24,
                borderTopWidth: 0.5, borderColor: 'rgba(255,255,255,0.09)',
              }}>
                {/* Pull handle */}
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'center', marginBottom: 36 }} />

                {/* Trip thumbnail + name */}
                {confirmUnsaveTrip && (
                  <View style={{ alignItems: 'center', marginBottom: 40 }}>
                    {(confirmUnsaveTrip.cover_image ?? confirmUnsaveTrip.images?.[0]) ? (
                      <Image
                        source={{ uri: confirmUnsaveTrip.cover_image ?? confirmUnsaveTrip.images?.[0] }}
                        style={{ width: 90, height: 90, borderRadius: 22, backgroundColor: '#333', marginBottom: 16 }}
                        contentFit="cover"
                      />
                    ) : null}
                    <Text style={{ color: '#fff', fontSize: 22, fontFamily: 'Outfit-Bold', fontWeight: '700', textAlign: 'center' }}>
                      {confirmUnsaveTrip.destination}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14, fontFamily: 'Outfit-Regular', marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                      Remove this trip from your saved list?
                    </Text>
                  </View>
                )}

                {/* Remove — destructive red button */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    if (confirmUnsaveTrip) unsaveTrip.mutate(confirmUnsaveTrip.id);
                    setConfirmUnsaveTrip(null);
                    setShowSavedDetail(false);
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 22, borderRadius: 22, alignItems: 'center',
                    backgroundColor: pressed ? '#b91c1c' : '#dc2626',
                    shadowColor: '#dc2626',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: pressed ? 0 : 0.4,
                    shadowRadius: 14,
                    elevation: 8,
                  })}
                >
                  <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Outfit-Bold', fontWeight: '800' }}>
                    Remove from Saved
                  </Text>
                </Pressable>

                {/* Spacer — keeps Cancel far away from the destructive button */}
                <View style={{ height: 28 }} />

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 28 }} />

                {/* Cancel — plain text link, no background */}
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setConfirmUnsaveTrip(null); }}
                  style={{ alignItems: 'center', paddingVertical: 8 }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, fontFamily: 'Outfit-Regular' }}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <TripJoinAnimation
          visible={showJoinAnim}
          onComplete={() => {
            setShowJoinAnim(false);
            onClose();
            router.push(`/(tabs)/messages?newTrip=${encodeURIComponent(joinAnimDest)}`);
          }}
          tripDestination={joinAnimDest}
          coverImage={joinAnimCover}
          crewPhotos={joinAnimCrew}
        />

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