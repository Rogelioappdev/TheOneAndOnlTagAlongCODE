import { useState, useEffect, useCallback } from 'react';
import { Text, View, Pressable, ScrollView, Image, Dimensions, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Plus, Check, X, Search, Trash2, Globe as GlobeIcon, Bookmark } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  FadeInDown,
  SlideInUp,
  Layout,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useSavedTrips, useSaveTrip, useUnsaveTrip } from '@/lib/hooks/useTrips';
import { useTrips } from '@/lib/hooks/useTrips';
import type { TripWithDetails } from '@/lib/hooks/useTrips';

const { width } = Dimensions.get('window');
const GLOBE_SIZE = width * 0.7;

// Country data
const COUNTRIES_DATA: Record<string, { name: string; flag: string; image: string }> = {
  'Japan': { name: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80' },
  'Italy': { name: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&q=80' },
  'France': { name: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80' },
  'Spain': { name: 'Spain', flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800&q=80' },
  'Greece': { name: 'Greece', flag: '🇬🇷', image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80' },
  'Thailand': { name: 'Thailand', flag: '🇹🇭', image: 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=800&q=80' },
  'Australia': { name: 'Australia', flag: '🇦🇺', image: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&q=80' },
  'Brazil': { name: 'Brazil', flag: '🇧🇷', image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80' },
  'United States': { name: 'United States', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=800&q=80' },
  'United Kingdom': { name: 'United Kingdom', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80' },
  'Germany': { name: 'Germany', flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80' },
  'Canada': { name: 'Canada', flag: '🇨🇦', image: 'https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&q=80' },
  'Mexico': { name: 'Mexico', flag: '🇲🇽', image: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80' },
  'Netherlands': { name: 'Netherlands', flag: '🇳🇱', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&q=80' },
  'Switzerland': { name: 'Switzerland', flag: '🇨🇭', image: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=800&q=80' },
  'Portugal': { name: 'Portugal', flag: '🇵🇹', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80' },
  'Indonesia': { name: 'Indonesia', flag: '🇮🇩', image: 'https://images.unsplash.com/photo-1573790387438-4da905039392?w=800&q=80' },
  'New Zealand': { name: 'New Zealand', flag: '🇳🇿', image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80' },
  'Iceland': { name: 'Iceland', flag: '🇮🇸', image: 'https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=800&q=80' },
  'Morocco': { name: 'Morocco', flag: '🇲🇦', image: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80' },
  'South Africa': { name: 'South Africa', flag: '🇿🇦', image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80' },
  'Egypt': { name: 'Egypt', flag: '🇪🇬', image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80' },
  'Peru': { name: 'Peru', flag: '🇵🇪', image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80' },
  'Argentina': { name: 'Argentina', flag: '🇦🇷', image: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800&q=80' },
  'Vietnam': { name: 'Vietnam', flag: '🇻🇳', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80' },
  'South Korea': { name: 'South Korea', flag: '🇰🇷', image: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&q=80' },
  'Singapore': { name: 'Singapore', flag: '🇸🇬', image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=800&q=80' },
  'Dubai': { name: 'Dubai', flag: '🇦🇪', image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&q=80' },
  'India': { name: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80' },
  'Turkey': { name: 'Turkey', flag: '🇹🇷', image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80' },
};

type ActiveView = 'saved-trips' | 'bucket-list';

export default function BucketListScreen() {
  const [activeView, setActiveView] = useState<ActiveView>('saved-trips');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Supabase: saved trips from saved_trips table
  const { data: savedTrips = [], isLoading: savedTripsLoading } = useSavedTrips();
  const { data: allTrips = [] } = useTrips();
  const saveTripMutation = useSaveTrip();
  const unsaveTripMutation = useUnsaveTrip();

  // Saved trip IDs for quick lookup
  const savedTripIds = new Set(savedTrips.map(t => t.id));

  // Globe rotation
  const globeRotation = useSharedValue(0);
  const userRotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  useEffect(() => {
    globeRotation.value = withRepeat(
      withTiming(360, { duration: 30000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      savedRotation.value = userRotation.value;
    })
    .onUpdate((event) => {
      'worklet';
      userRotation.value = savedRotation.value + event.translationX * 0.3;
    });

  const globeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotateY: `${globeRotation.value + userRotation.value}deg` },
      ],
    };
  });

  const handleUnsaveTrip = useCallback((tripId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    unsaveTripMutation.mutate(tripId);
  }, [unsaveTripMutation]);

  const handleSaveTrip = useCallback((tripId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveTripMutation.mutate(tripId, {
      onSuccess: () => setShowAddModal(false),
    });
  }, [saveTripMutation]);

  // Trips that are not yet saved (for the add modal)
  const unsavedTrips = allTrips.filter(t => !savedTripIds.has(t.id));
  const filteredTrips = unsavedTrips.filter(t =>
    t.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCountryFlag = (country: string) => COUNTRIES_DATA[country]?.flag ?? '🌍';

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-4 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white text-3xl font-bold">Bucket List</Text>
              <Text className="text-gray-500 mt-1">
                {savedTrips.length} saved trip{savedTrips.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAddModal(true);
              }}
              className="bg-emerald-500 p-3 rounded-full active:opacity-80"
            >
              <Plus size={24} color="#fff" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Globe Section */}
        <View className="items-center justify-center py-6">
          <GestureDetector gesture={panGesture}>
            <Animated.View style={globeAnimatedStyle}>
              <Image
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Earth_Western_Hemisphere_transparent_background.png/600px-Earth_Western_Hemisphere_transparent_background.png' }}
                style={{
                  width: GLOBE_SIZE,
                  height: GLOBE_SIZE,
                  borderRadius: GLOBE_SIZE / 2,
                }}
                resizeMode="contain"
              />
            </Animated.View>
          </GestureDetector>
          <Text className="text-gray-600 text-xs mt-3">Swipe to spin</Text>
        </View>

        {/* Saved Trips List */}
        <View className="flex-1 bg-neutral-900 rounded-t-3xl">
          <View className="w-12 h-1 bg-gray-700 rounded-full self-center mt-3 mb-2" />
          <Text className="text-white text-lg font-semibold px-4 mb-3">Saved Trips</Text>

          {savedTripsLoading ? (
            <View className="flex-1 items-center justify-center pb-20">
              <ActivityIndicator size="large" color="#10b981" />
            </View>
          ) : savedTrips.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8 pb-20">
              <Bookmark size={64} color="#374151" strokeWidth={1} />
              <Text className="text-gray-400 text-lg font-semibold text-center mt-4">
                No saved trips yet
              </Text>
              <Text className="text-gray-600 text-center mt-2">
                Tap + to save trips from the feed
              </Text>
            </View>
          ) : (
            <ScrollView
              className="flex-1 px-4"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
            >
              {savedTrips.map((trip, index) => {
                const coverImage = trip.cover_image ?? 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80';
                return (
                  <Animated.View
                    key={trip.id}
                    entering={SlideInUp.delay(index * 50).springify()}
                    layout={Layout.springify()}
                  >
                    <View className="mb-3 rounded-2xl overflow-hidden">
                      <Image
                        source={{ uri: coverImage }}
                        style={{ width: '100%', height: 110 }}
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.88)']}
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 80,
                        }}
                      />
                      <View className="absolute bottom-0 left-0 right-0 p-3 flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                          <Text className="text-2xl mr-2">{getCountryFlag(trip.country)}</Text>
                          <View className="flex-1">
                            <Text className="text-white text-base font-bold" numberOfLines={1}>{trip.title}</Text>
                            <View className="flex-row items-center mt-0.5">
                              <MapPin size={10} color="#9ca3af" strokeWidth={2} />
                              <Text className="text-gray-400 text-xs ml-1">{trip.destination}, {trip.country}</Text>
                            </View>
                          </View>
                        </View>
                        <Pressable
                          onPress={() => handleUnsaveTrip(trip.id)}
                          className="bg-red-500/20 p-2 rounded-full ml-2"
                        >
                          <Trash2 size={18} color="#ef4444" strokeWidth={2} />
                        </Pressable>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>

      {/* Add Trip Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-black">
          <SafeAreaView className="flex-1" edges={['top']}>
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-white/10">
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={24} color="#fff" strokeWidth={2} />
              </Pressable>
              <Text className="text-white text-lg font-semibold">Save a Trip</Text>
              <View style={{ width: 24 }} />
            </View>

            <View className="px-4 py-4">
              <View className="flex-row items-center bg-neutral-900 rounded-2xl px-4 py-3">
                <Search size={20} color="#6b7280" strokeWidth={2} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search trips..."
                  placeholderTextColor="#6b7280"
                  className="flex-1 text-white text-base ml-3"
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <X size={18} color="#6b7280" strokeWidth={2} />
                  </Pressable>
                )}
              </View>
            </View>

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
              {filteredTrips.length === 0 ? (
                <View className="items-center py-12">
                  <Text className="text-gray-500 text-base">
                    {allTrips.length === 0 ? 'No trips available in feed' : 'All trips are already saved'}
                  </Text>
                </View>
              ) : (
                filteredTrips.map((trip, index) => {
                  const coverImage = trip.cover_image ?? 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80';
                  return (
                    <Animated.View key={trip.id} entering={FadeInDown.delay(index * 20)}>
                      <Pressable
                        onPress={() => handleSaveTrip(trip.id)}
                        className="flex-row items-center bg-neutral-900 rounded-2xl p-3 mb-3 active:opacity-80"
                      >
                        <Image
                          source={{ uri: coverImage }}
                          style={{ width: 56, height: 56, borderRadius: 10 }}
                        />
                        <View className="flex-1 ml-3">
                          <Text className="text-white text-base font-semibold" numberOfLines={1}>{trip.title}</Text>
                          <View className="flex-row items-center mt-1">
                            <Text className="text-lg mr-1">{getCountryFlag(trip.country)}</Text>
                            <Text className="text-gray-400 text-sm">{trip.destination}, {trip.country}</Text>
                          </View>
                        </View>
                        <View className="bg-emerald-500/20 p-2 rounded-full">
                          <Bookmark size={18} color="#10b981" strokeWidth={2} />
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })
              )}
              <View className="h-8" />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
