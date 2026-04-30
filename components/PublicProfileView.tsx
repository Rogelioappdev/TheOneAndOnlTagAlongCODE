import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Image, Modal, Dimensions, Linking, Alert, ActionSheetIOS, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  MapPin,
  Languages,
  Calendar,
  ChevronDown,
  BadgeCheck,
  Sparkles,
  Globe,
  Map,
  Award,
  MessageCircle,
  Heart,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  ArrowUpRight,
  MoreVertical,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import UserProfileModal from './userprofilemodal';
import ReportModal from './ReportModal';

const { width, height } = Dimensions.get('window');

// Travel style options (same as in profile.tsx)
const TRAVEL_STYLES = [
  { id: 'luxury', label: 'Luxury', icon: '✨' },
  { id: 'backpacking', label: 'Backpacking', icon: '🎒' },
  { id: 'relaxed', label: 'Relaxed', icon: '🏖️' },
  { id: 'cultural', label: 'Cultural', icon: '🏛️' },
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'adventure', label: 'Adventure', icon: '🏔️' },
  { id: 'party', label: 'Party', icon: '🎉' },
  { id: 'foodie', label: 'Foodie', icon: '🍜' },
];

const PACE_OPTIONS = [
  { id: 'slow', label: 'Slow & Steady', emoji: '🐢' },
  { id: 'balanced', label: 'Balanced', emoji: '⚖️' },
  { id: 'fast', label: 'Go Go Go!', emoji: '🚀' },
];

const GROUP_OPTIONS = [
  { id: 'close-knit', label: 'Close-Knit', emoji: '👯' },
  { id: 'open', label: 'Open Groups', emoji: '🌍' },
];

const PLANNING_OPTIONS = [
  { id: 'planner', label: 'Planner', emoji: '📋' },
  { id: 'spontaneous', label: 'Spontaneous', emoji: '🎲' },
  { id: 'flexible', label: 'Flexible', emoji: '🤸' },
];

const PERSONALITY_OPTIONS = [
  { id: 'introvert', label: 'Introvert', emoji: '🌙' },
  { id: 'extrovert', label: 'Extrovert', emoji: '☀️' },
  { id: 'ambivert', label: 'Ambivert', emoji: '🌗' },
];

const EXPERIENCE_OPTIONS = [
  { id: 'beginner', label: 'Beginner', emoji: '🌱' },
  { id: 'intermediate', label: 'Intermediate', emoji: '🌿' },
  { id: 'experienced', label: 'Experienced', emoji: '🌳' },
  { id: 'expert', label: 'Expert', emoji: '🌍' },
];

// Country data for bucket list images
const COUNTRIES_DATA: Record<string, { flag: string; image: string }> = {
  'Japan': { flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80' },
  'Italy': { flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=400&q=80' },
  'France': { flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80' },
  'Spain': { flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=400&q=80' },
  'Greece': { flag: '🇬🇷', image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400&q=80' },
  'Thailand': { flag: '🇹🇭', image: 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=400&q=80' },
  'Australia': { flag: '🇦🇺', image: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400&q=80' },
  'Brazil': { flag: '🇧🇷', image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&q=80' },
  'United States': { flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400&q=80' },
  'United Kingdom': { flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80' },
  'Germany': { flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&q=80' },
  'Canada': { flag: '🇨🇦', image: 'https://images.unsplash.com/photo-1517935706615-2717063c2225?w=400&q=80' },
  'Mexico': { flag: '🇲🇽', image: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=400&q=80' },
  'Netherlands': { flag: '🇳🇱', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&q=80' },
  'Switzerland': { flag: '🇨🇭', image: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=400&q=80' },
  'Portugal': { flag: '🇵🇹', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&q=80' },
  'Indonesia': { flag: '🇮🇩', image: 'https://images.unsplash.com/photo-1573790387438-4da905039392?w=400&q=80' },
  'New Zealand': { flag: '🇳🇿', image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80' },
  'Iceland': { flag: '🇮🇸', image: 'https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=400&q=80' },
  'Morocco': { flag: '🇲🇦', image: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=400&q=80' },
};

export interface PublicProfileData {
  id: string;
  name: string;
  age: number;
  image: string;
  images?: string[];
  country: string;
  city: string;
  bio?: string;
  fullBio?: string;
  verified?: boolean;
  travelStyles?: string[];
  vibes?: string[];
  placesVisited?: string[];
  destinations?: string[];
  bucketList?: string[];
  languages?: string[];
  availability?: string;
  instagram?: string;
  socialEnergy?: string | null;
  travelPace?: string | null;
  groupType?: string | null;
  planningStyle?: string | null;
  experience?: string | null;
}

interface PublicProfileViewProps {
  visible: boolean;
  onClose: () => void;
  profile: PublicProfileData | null;
  onConnect?: () => void;
  onMessage?: () => void;
  showConnectButton?: boolean;
  showMessageButton?: boolean;
  isConnected?: boolean;
  currentUserId?: string;
  // New props for trip membership gating
  isLimitedView?: boolean;
  onJoinTrip?: () => void;
  tripDestination?: string;
  showAuthModal?: boolean;
  // Full profile
  onViewFullProfile?: () => void;
  hideFooter?: boolean;
  onBlock?: (blockedUserId: string) => void;
}

export default function PublicProfileView({
  visible,
  onClose,
  profile,
  onConnect,
  onMessage,
  showConnectButton = true,
  showMessageButton = false,
  isConnected = false,
  currentUserId,
  isLimitedView = false,
  onJoinTrip,
  tripDestination,
  onViewFullProfile,
  hideFooter = false,
  onBlock,
}: PublicProfileViewProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [canSeeInstagram, setCanSeeInstagram] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const handleViewFull = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onViewFullProfile) {
      onViewFullProfile();
    } else {
      setShowFullProfile(true);
    }
  };

  const performBlock = async () => {
    if (!currentUserId || !profile?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await supabase.from('user_blocks').upsert({
      blocker_id: currentUserId,
      blocked_id: profile.id,
      created_at: new Date().toISOString(),
    }, { onConflict: 'blocker_id,blocked_id' });
    onBlock?.(profile.id);
    onClose();
  };

  const handleBlock = () => {
    if (!profile) return;
    Alert.alert(
      `Block ${profile.name}?`,
      "They won't be able to see your profile or trips.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: performBlock },
      ]
    );
  };

  const handleSubmitReport = async (reason: string) => {
    if (!currentUserId || !profile?.id) return;
    setReportSubmitting(true);
    try {
      await supabase.from('user_reports').insert({
        reporter_id: currentUserId,
        reported_user_id: profile.id,
        reason,
        created_at: new Date().toISOString(),
      });
      setShowReportModal(false);
      Alert.alert(
        'Report submitted',
        "Thank you. We'll review this. Would you also like to block this user?",
        [
          { text: 'Also Block', style: 'destructive', onPress: performBlock },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleOpenOptions = () => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', `Report ${profile.name}`, `Block ${profile.name}`],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) setShowReportModal(true);
          if (index === 2) handleBlock();
        }
      );
    } else {
      Alert.alert(profile.name, 'What would you like to do?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', onPress: () => setShowReportModal(true) },
        { text: 'Block', style: 'destructive', onPress: handleBlock },
      ]);
    }
  };

  // Reset photo index and gallery whenever a new profile is shown
  useEffect(() => {
    if (visible) {
      setSelectedPhotoIndex(0);
      setShowPhotoGallery(false);
    }
  }, [visible, profile?.id]);

  // Check if current user is connected (matched or same trip) to gate Instagram
  useEffect(() => {
    if (currentUserId && profile?.id && currentUserId === profile.id) { setCanSeeInstagram(true); return; }
    if (!visible || !profile?.instagram || !currentUserId || !profile.id) {
      setCanSeeInstagram(isConnected);
      return;
    }
    if (isConnected) { setCanSeeInstagram(true); return; }

    let cancelled = false;
    (async () => {
      // Check matches
      const { data: matchData } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${currentUserId})`)
        .limit(1);

      if (matchData && matchData.length > 0) {
        if (!cancelled) setCanSeeInstagram(true);
        return;
      }

      // Check shared trip
      const { data: myTrips } = await supabase
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', currentUserId)
        .eq('status', 'in');

      const myTripIds = myTrips?.map((t: any) => t.trip_id) ?? [];
      if (myTripIds.length > 0) {
        const { data: shared } = await supabase
          .from('trip_members')
          .select('trip_id')
          .eq('user_id', profile.id)
          .eq('status', 'in')
          .in('trip_id', myTripIds)
          .limit(1);

        if (!cancelled) setCanSeeInstagram(!!(shared && shared.length > 0));
      } else {
        if (!cancelled) setCanSeeInstagram(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible, profile?.id, profile?.instagram, currentUserId, isConnected]);

  // Always unlocked for own profile — computed at render time so it's never stale
  const isSelf = !!(currentUserId && profile?.id && currentUserId === profile.id);
  const instagramUnlocked = isSelf || canSeeInstagram;

  if (!profile) return null;

  const getStyleLabel = (id: string) => {
    const style = TRAVEL_STYLES.find(s => s.id === id);
    return style ? `${style.icon} ${style.label}` : id;
  };

  const getPaceLabel = (pace: string | null | undefined) => {
    const option = PACE_OPTIONS.find(o => o.id === pace);
    return option ? `${option.emoji} ${option.label}` : null;
  };

  const getGroupLabel = (group: string | null | undefined) => {
    const option = GROUP_OPTIONS.find(o => o.id === group);
    return option ? `${option.emoji} ${option.label}` : null;
  };

  const getPlanningLabel = (planning: string | null | undefined) => {
    const option = PLANNING_OPTIONS.find(o => o.id === planning);
    return option ? `${option.emoji} ${option.label}` : null;
  };

  const getPersonalityLabel = (personality: string | null | undefined) => {
    const option = PERSONALITY_OPTIONS.find(o => o.id === personality);
    return option ? `${option.emoji} ${option.label}` : null;
  };

  const getExperienceLabel = (exp: string | null | undefined) => {
    const option = EXPERIENCE_OPTIONS.find(o => o.id === exp);
    return option ? `${option.emoji} ${option.label}` : null;
  };

  const getCountryData = (name: string) => COUNTRIES_DATA[name] || { flag: '🌍', image: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400&q=80' };

  const allImages = profile.images && profile.images.length > 0 ? profile.images : [profile.image];
  const mainImage = allImages[selectedPhotoIndex] || profile.image;
  const bio = profile.fullBio || profile.bio || '';
  const travelStyles = profile.travelStyles || profile.vibes || [];
  const languages = profile.languages || [];
  const placesVisited = profile.placesVisited || [];
  const destinations = profile.destinations || [];
  const bucketList = profile.bucketList || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        {/* Header Image - Tappable for gallery */}
        <Pressable
          onPress={() => {
            if (allImages.length > 1) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPhotoGallery(true);
            }
          }}
          style={{ height: height * 0.45 }}
        >
          <Image
            source={{ uri: mainImage }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.95)']}
            locations={[0, 0.2, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Photo navigation arrows */}
          {allImages.length > 1 && (
            <>
              {selectedPhotoIndex > 0 && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.selectionAsync();
                    setSelectedPhotoIndex(selectedPhotoIndex - 1);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full"
                >
                  <ChevronLeft size={24} color="#fff" strokeWidth={2} />
                </Pressable>
              )}
              {selectedPhotoIndex < allImages.length - 1 && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.selectionAsync();
                    setSelectedPhotoIndex(selectedPhotoIndex + 1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full"
                >
                  <ChevronRight size={24} color="#fff" strokeWidth={2} />
                </Pressable>
              )}
              {/* Photo indicators */}
              <View className="absolute bottom-20 left-0 right-0 flex-row justify-center">
                {allImages.map((_, idx) => (
                  <Pressable
                    key={idx}
                    onPress={(e) => {
                      e.stopPropagation();
                      Haptics.selectionAsync();
                      setSelectedPhotoIndex(idx);
                    }}
                    style={{
                      width: idx === selectedPhotoIndex ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: idx === selectedPhotoIndex ? '#10b981' : 'rgba(255,255,255,0.5)',
                      marginHorizontal: 3,
                    }}
                  />
                ))}
              </View>
            </>
          )}

          {/* Header: back button + options menu */}
          <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} edges={['top']}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
              <Pressable onPress={onClose}>
                <View className="bg-black/50 p-2 rounded-full">
                  <ChevronDown size={24} color="#fff" strokeWidth={2} />
                </View>
              </Pressable>
              {!isSelf && !!currentUserId && !!profile.id && (
                <Pressable onPress={handleOpenOptions}>
                  <View className="bg-black/50 p-2 rounded-full">
                    <MoreVertical size={24} color="#fff" strokeWidth={2} />
                  </View>
                </Pressable>
              )}
            </View>
          </SafeAreaView>

          {/* Verified Badge */}
          {profile.verified && (
            <View className="absolute top-16 right-4 bg-emerald-500 flex-row items-center px-3 py-1.5 rounded-full">
              <BadgeCheck size={14} color="#fff" strokeWidth={2} />
              <Text className="text-white text-sm font-semibold ml-1">Verified</Text>
            </View>
          )}

          {/* Name overlay */}
          <View className="absolute bottom-0 left-0 right-0 p-6">
            <View className="flex-row items-center">
              <Text className="text-white text-4xl font-bold">{profile.name}</Text>
              <Text className="text-gray-300 text-3xl font-light ml-3">{profile.age}</Text>
            </View>
            <View className="flex-row items-center mt-2">
              <MapPin size={16} color="#10b981" strokeWidth={2} />
              <Text className="text-gray-300 ml-1">{profile.city}, {profile.country}</Text>
            </View>
          </View>
        </Pressable>

        {/* Additional Photos */}
        {profile.images && profile.images.length > 1 && (
          <View className="px-4 py-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              {profile.images.slice(1).map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={{ width: 72, height: 72, borderRadius: 12, marginRight: 8 }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Content */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-6">
            {/* Bio */}
            {bio && (
              <>
                <Text className="text-white text-lg font-semibold mb-3">About</Text>
                <Text className="text-gray-300 text-base leading-7 mb-6">
                  {isLimitedView ? bio.slice(0, 150) + (bio.length > 150 ? '...' : '') : bio}
                </Text>
              </>
            )}

            {/* Instagram */}
            {profile.instagram && !isLimitedView && (
              <View style={{ marginBottom: 24 }}>
                {instagramUnlocked ? (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Linking.openURL(`https://instagram.com/${profile.instagram}`);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, gap: 14 }}
                  >
                    <Text style={{ fontSize: 24 }}>📸</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'Outfit-Regular', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Instagram</Text>
                      <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Outfit-SemiBold' }}>@{profile.instagram}</Text>
                    </View>
                    <ArrowUpRight size={18} color="rgba(255,255,255,0.35)" strokeWidth={2} />
                  </Pressable>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, gap: 14 }}>
                    <Text style={{ fontSize: 24, opacity: 0.3 }}>📸</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'Outfit-Regular', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Instagram</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16, fontFamily: 'Outfit-SemiBold', letterSpacing: 4 }}>••••••••</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 }}>
                      <Lock size={11} color="rgba(255,255,255,0.35)" strokeWidth={2} />
                      <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>Match to unlock</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Limited View - Show locked message */}
            {isLimitedView ? (
              <View className="relative mt-4">
                {/* Blurred Content Preview */}
                <View className="opacity-30">
                  <Text className="text-white text-lg font-semibold mb-3">Travel Style</Text>
                  <View className="flex-row flex-wrap mb-6">
                    <View className="bg-emerald-500/20 px-4 py-2 rounded-full mr-2 mb-2">
                      <Text className="text-emerald-400 font-medium">Adventure</Text>
                    </View>
                    <View className="bg-emerald-500/20 px-4 py-2 rounded-full mr-2 mb-2">
                      <Text className="text-emerald-400 font-medium">Cultural</Text>
                    </View>
                  </View>
                  <Text className="text-white text-lg font-semibold mb-3">Dream Destinations</Text>
                  <View className="flex-row flex-wrap mb-6">
                    <View className="bg-neutral-900 px-4 py-2 rounded-full mr-2 mb-2">
                      <Text className="text-white font-medium">Japan</Text>
                    </View>
                  </View>
                </View>

                {/* Lock Overlay */}
                <BlurView intensity={20} tint="dark" className="absolute inset-0 items-center justify-center rounded-2xl">
                  <View className="bg-black/80 p-6 rounded-2xl items-center" style={{ maxWidth: 280 }}>
                    <View className="bg-emerald-500/20 p-4 rounded-full mb-4">
                      <Lock size={32} color="#10b981" strokeWidth={2} />
                    </View>
                    <Text className="text-white text-xl font-bold text-center mb-2">
                      Join this trip to see the full profile
                    </Text>
                    <Text className="text-gray-400 text-sm text-center mb-6">
                      Connect with {profile.name} by joining the {tripDestination || 'trip'}
                    </Text>
                    {onJoinTrip && (
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          onJoinTrip();
                        }}
                        className="bg-emerald-500 px-8 py-3 rounded-full active:opacity-80"
                      >
                        <Text className="text-white font-bold text-base">Join Trip</Text>
                      </Pressable>
                    )}
                  </View>
                </BlurView>
              </View>
            ) : (
              <>
                {/* Full profile content - only shown when not limited */}

            {/* Travel Styles */}
            {travelStyles.length > 0 && (
              <>
                <View className="flex-row items-center mb-3">
                  <Sparkles size={18} color="#10b981" strokeWidth={2} />
                  <Text className="text-white text-lg font-semibold ml-2">Travel Style</Text>
                </View>
                <View className="flex-row flex-wrap mb-6">
                  {travelStyles.map((style, i) => (
                    <View key={i} className="bg-emerald-500/20 px-4 py-2 rounded-full mr-2 mb-2">
                      <Text className="text-emerald-400 font-medium">{getStyleLabel(style)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Travel Preferences Grid */}
            {(profile.socialEnergy || profile.travelPace || profile.groupType || profile.planningStyle) && (
              <>
                <Text className="text-white text-lg font-semibold mb-3">Travel Preferences</Text>
                <View className="flex-row flex-wrap mb-6">
                  {getPersonalityLabel(profile.socialEnergy) && (
                    <View className="bg-neutral-900 px-4 py-2 rounded-xl mr-2 mb-2">
                      <Text className="text-gray-400 text-xs mb-0.5">Personality</Text>
                      <Text className="text-white font-medium">{getPersonalityLabel(profile.socialEnergy)}</Text>
                    </View>
                  )}
                  {getPaceLabel(profile.travelPace) && (
                    <View className="bg-neutral-900 px-4 py-2 rounded-xl mr-2 mb-2">
                      <Text className="text-gray-400 text-xs mb-0.5">Daily Pace</Text>
                      <Text className="text-white font-medium">{getPaceLabel(profile.travelPace)}</Text>
                    </View>
                  )}
                  {getGroupLabel(profile.groupType) && (
                    <View className="bg-neutral-900 px-4 py-2 rounded-xl mr-2 mb-2">
                      <Text className="text-gray-400 text-xs mb-0.5">Group Preference</Text>
                      <Text className="text-white font-medium">{getGroupLabel(profile.groupType)}</Text>
                    </View>
                  )}
                  {getPlanningLabel(profile.planningStyle) && (
                    <View className="bg-neutral-900 px-4 py-2 rounded-xl mr-2 mb-2">
                      <Text className="text-gray-400 text-xs mb-0.5">Planning Style</Text>
                      <Text className="text-white font-medium">{getPlanningLabel(profile.planningStyle)}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Experience Level */}
            {profile.experience && getExperienceLabel(profile.experience) && (
              <View className="bg-neutral-900 rounded-2xl p-4 mb-6">
                <View className="flex-row items-center">
                  <Award size={18} color="#10b981" strokeWidth={2} />
                  <Text className="text-gray-400 text-sm ml-2">Experience Level</Text>
                  <Text className="text-white font-semibold ml-auto">{getExperienceLabel(profile.experience)}</Text>
                </View>
              </View>
            )}

            {/* Dream Destinations */}
            {destinations.length > 0 && (
              <>
                <View className="flex-row items-center mb-3">
                  <Globe size={18} color="#10b981" strokeWidth={2} />
                  <Text className="text-white text-lg font-semibold ml-2">Dream Destinations</Text>
                </View>
                <View className="flex-row flex-wrap mb-6">
                  {destinations.map((dest, i) => (
                    <View key={i} className="bg-neutral-900 px-4 py-2 rounded-full mr-2 mb-2">
                      <Text className="text-white font-medium">{dest}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Places Visited */}
            {placesVisited.length > 0 && (
              <>
                <View className="flex-row items-center mb-3">
                  <Map size={18} color="#10b981" strokeWidth={2} />
                  <Text className="text-white text-lg font-semibold ml-2">Places Visited</Text>
                  <Text className="text-emerald-400 font-semibold ml-auto">{placesVisited.length}</Text>
                </View>
                <View className="flex-row flex-wrap mb-6">
                  {placesVisited.slice(0, 8).map((place, i) => (
                    <View key={i} className="bg-white/5 px-3 py-1.5 rounded-full mr-2 mb-2">
                      <Text className="text-gray-400">{place}</Text>
                    </View>
                  ))}
                  {placesVisited.length > 8 && (
                    <View className="bg-white/10 px-3 py-1.5 rounded-full mr-2 mb-2">
                      <Text className="text-gray-400">+{placesVisited.length - 8} more</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Languages & Availability */}
            {(languages.length > 0 || profile.availability) && (
              <View className="flex-row mb-8">
                {languages.length > 0 && (
                  <View className={`flex-1 bg-neutral-900 p-4 rounded-xl ${profile.availability ? 'mr-3' : ''}`}>
                    <View className="flex-row items-center mb-2">
                      <Languages size={16} color="#6b7280" strokeWidth={2} />
                      <Text className="text-gray-400 text-sm ml-2">Languages</Text>
                    </View>
                    <Text className="text-white font-medium">{languages.join(', ')}</Text>
                  </View>
                )}
                {profile.availability && (
                  <View className="flex-1 bg-neutral-900 p-4 rounded-xl">
                    <View className="flex-row items-center mb-2">
                      <Calendar size={16} color="#6b7280" strokeWidth={2} />
                      <Text className="text-gray-400 text-sm ml-2">Available</Text>
                    </View>
                    <Text className="text-white font-medium">{profile.availability}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Dream Bucket List with Images */}
            {bucketList.length > 0 && (
              <>
                <View className="flex-row items-center mb-3">
                  <Sparkles size={18} color="#10b981" strokeWidth={2} />
                  <Text className="text-white text-lg font-semibold ml-2">Dream Bucket List</Text>
                  <Text className="text-emerald-400 font-semibold ml-auto">{bucketList.length}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 24 }}>
                  {bucketList.map((country, i) => {
                    const countryData = getCountryData(country);
                    return (
                      <View key={i} className="mr-3" style={{ width: 120 }}>
                        <View className="rounded-xl overflow-hidden">
                          <Image
                            source={{ uri: countryData.image }}
                            style={{ width: 120, height: 80 }}
                            resizeMode="cover"
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50 }}
                          />
                          <View className="absolute bottom-2 left-2 right-2">
                            <Text className="text-white text-sm font-semibold" numberOfLines={1}>
                              {countryData.flag} {country}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}
              </>
            )}
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        {!hideFooter && <SafeAreaView edges={['bottom']} style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)', gap: 10 }}>
          {/* View Full Profile */}
          {!!profile?.id && (
            <Pressable
              onPress={handleViewFull}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(240,235,227,0.08)', borderRadius: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(240,235,227,0.15)' }}
            >
              <Text style={{ color: '#F0EBE3', fontSize: 15, fontFamily: 'Outfit-SemiBold' }}>View Full Profile</Text>
              <ArrowUpRight size={16} color="#F0EBE3" strokeWidth={2} />
            </Pressable>
          )}

          {/* Connect / Message */}
          {showMessageButton && onMessage ? (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onMessage(); }}
              className="bg-emerald-500 py-4 rounded-2xl flex-row items-center justify-center active:opacity-80"
            >
              <MessageCircle size={20} color="#fff" strokeWidth={2} />
              <Text className="text-white text-lg font-semibold ml-2">Send Message</Text>
            </Pressable>
          ) : showConnectButton && onConnect ? (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onConnect(); }}
              className={`py-4 rounded-2xl flex-row items-center justify-center active:opacity-80 ${isConnected ? 'bg-neutral-800' : 'bg-emerald-500'}`}
              disabled={isConnected}
            >
              {isConnected ? (
                <>
                  <Heart size={20} color="#10b981" fill="#10b981" strokeWidth={2} />
                  <Text className="text-emerald-400 text-lg font-semibold ml-2">Already Liked</Text>
                </>
              ) : (
                <>
                  <Heart size={20} color="#fff" strokeWidth={2} />
                  <Text className="text-white text-lg font-semibold ml-2">Connect</Text>
                </>
              )}
            </Pressable>
          ) : !profile?.id ? (
            <Pressable onPress={onClose} className="bg-neutral-900 py-4 rounded-2xl active:opacity-80">
              <Text className="text-white text-lg font-semibold text-center">Close</Text>
            </Pressable>
          ) : null}
        </SafeAreaView>}

        {/* Embedded full profile modal */}
        <UserProfileModal
          userId={profile?.id ?? null}
          visible={showFullProfile}
          onClose={() => setShowFullProfile(false)}
        />

        {/* Report sheet */}
        <ReportModal
          visible={showReportModal}
          targetName={profile.name}
          submitting={reportSubmitting}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleSubmitReport}
        />
      </View>

      {/* Photo Gallery Overlay - replaces nested Modal to avoid iOS sheet crash */}
      {showPhotoGallery && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 100 }}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4">
              <Pressable
                onPress={() => setShowPhotoGallery(false)}
                className="bg-white/10 p-2 rounded-full"
              >
                <X size={24} color="#fff" strokeWidth={2} />
              </Pressable>
              <Text className="text-white font-semibold">
                {selectedPhotoIndex + 1} / {allImages.length}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Large Photo */}
            <View className="flex-1 justify-center items-center px-4">
              <Image
                source={{ uri: allImages[selectedPhotoIndex] }}
                style={{ width: width - 32, height: width - 32, borderRadius: 16 }}
                resizeMode="cover"
              />
            </View>

            {/* Navigation */}
            <View className="flex-row justify-between items-center px-4 py-6">
              <Pressable
                onPress={() => {
                  if (selectedPhotoIndex > 0) {
                    Haptics.selectionAsync();
                    setSelectedPhotoIndex(selectedPhotoIndex - 1);
                  }
                }}
                className={`p-4 rounded-full ${selectedPhotoIndex > 0 ? 'bg-white/10' : 'bg-white/5'}`}
                disabled={selectedPhotoIndex === 0}
              >
                <ChevronLeft size={28} color={selectedPhotoIndex > 0 ? '#fff' : '#6b7280'} strokeWidth={2} />
              </Pressable>

              {/* Thumbnail indicators */}
              <View className="flex-row">
                {allImages.map((img, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedPhotoIndex(idx);
                    }}
                    style={{ marginHorizontal: 4 }}
                  >
                    <Image
                      source={{ uri: img }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        borderWidth: idx === selectedPhotoIndex ? 2 : 0,
                        borderColor: '#10b981',
                        opacity: idx === selectedPhotoIndex ? 1 : 0.5,
                      }}
                      resizeMode="cover"
                    />
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => {
                  if (selectedPhotoIndex < allImages.length - 1) {
                    Haptics.selectionAsync();
                    setSelectedPhotoIndex(selectedPhotoIndex + 1);
                  }
                }}
                className={`p-4 rounded-full ${selectedPhotoIndex < allImages.length - 1 ? 'bg-white/10' : 'bg-white/5'}`}
                disabled={selectedPhotoIndex === allImages.length - 1}
              >
                <ChevronRight size={28} color={selectedPhotoIndex < allImages.length - 1 ? '#fff' : '#6b7280'} strokeWidth={2} />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      )}
    </Modal>
  );
}
