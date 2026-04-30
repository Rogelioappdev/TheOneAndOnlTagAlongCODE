import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView, ActivityIndicator, Animated as RNAnimated,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X, MapPin, Calendar, Check, HelpCircle, XCircle, PlaneTakeoff, Bookmark,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import {
  useMyTrips, useSavedTrips, useJoinTrip, useLeaveTrip, useUnsaveTrip, TripWithDetails,
} from '@/lib/hooks/useTrips';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type TripStatus = 'in' | 'maybe' | 'saved';

interface TripEntry {
  trip: TripWithDetails;
  status: TripStatus;
}

const STATUS_META: Record<TripStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  in:    { label: 'CONFIRMED', color: '#30D158', bg: 'rgba(48,209,88,0.14)',    border: 'rgba(48,209,88,0.4)',    dot: '#30D158' },
  maybe: { label: 'STANDBY',   color: '#FFD60A', bg: 'rgba(255,214,10,0.12)',   border: 'rgba(255,214,10,0.35)',  dot: '#FFD60A' },
  saved: { label: 'WATCHLIST', color: '#F0EBE3', bg: 'rgba(240,235,227,0.08)', border: 'rgba(240,235,227,0.22)', dot: '#F0EBE3' },
};

function formatDates(trip: TripWithDetails): string {
  if (!trip.start_date) return 'FLEXIBLE';
  const s = new Date(trip.start_date);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  if (!trip.end_date) return fmt(s);
  return `${fmt(s)} → ${fmt(new Date(trip.end_date))}`;
}

function PulsingDot({ color }: { color: string }) {
  const opacity = useRef(new RNAnimated.Value(1)).current;
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(opacity, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        RNAnimated.timing(opacity, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <RNAnimated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, opacity }} />
  );
}

function FlightRow({
  entry, index, userId, onStatusChange, onUnsave,
}: {
  entry: TripEntry;
  index: number;
  userId: string;
  onStatusChange: (tripId: string, next: 'in' | 'maybe' | 'left') => void;
  onUnsave: (tripId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { trip, status } = entry;
  const meta = STATUS_META[status];
  const cover = trip.cover_image ?? trip.images?.[0] ?? '';
  const dest = trip.destination.toUpperCase();
  const memberCount = trip.members?.filter(m => m.status === 'in').length ?? 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(18)}>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); setExpanded(e => !e); }}
        style={({ pressed }) => ({
          backgroundColor: pressed ? 'rgba(255,255,255,0.04)' : (index % 2 === 0 ? '#080808' : '#050505'),
        })}
      >
        {/* Top row */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 14, gap: 12,
        }}>
          {/* Cover thumb */}
          <View style={{ position: 'relative' }}>
            {cover ? (
              <Image
                source={{ uri: cover }}
                style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: '#1a1a1a' }}
                contentFit="cover"
              />
            ) : (
              <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }}>
                <PlaneTakeoff size={20} color="rgba(255,255,255,0.2)" strokeWidth={1.5} />
              </View>
            )}
            {/* Status dot on image */}
            <View style={{ position: 'absolute', bottom: 4, right: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: meta.dot, borderWidth: 1.5, borderColor: '#000' }} />
          </View>

          {/* Destination + info */}
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Outfit-ExtraBold', fontWeight: '800', letterSpacing: 0.4 }}>{dest}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={10} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>{trip.country}</Text>
              </View>
              {memberCount > 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>{memberCount} going</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Calendar size={10} color="rgba(255,255,255,0.25)" strokeWidth={2} />
              <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, fontFamily: 'Outfit-Regular', letterSpacing: 0.3 }}>{formatDates(trip)}</Text>
            </View>
          </View>

          {/* Status badge */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: meta.bg, borderWidth: 0.5, borderColor: meta.border,
            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
          }}>
            <PulsingDot color={meta.dot} />
            <Text style={{ color: meta.color, fontSize: 10, fontFamily: 'Outfit-Bold', fontWeight: '800', letterSpacing: 0.8 }}>{meta.label}</Text>
          </View>
        </View>

        {/* Expanded action row */}
        {expanded && (
          <Animated.View entering={FadeIn.duration(160)} style={{
            flexDirection: 'row', gap: 8,
            paddingHorizontal: 16, paddingBottom: 14, paddingTop: 2,
          }}>
            {/* Join */}
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onStatusChange(trip.id, 'in'); setExpanded(false); }}
              style={({ pressed }) => ({
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                paddingVertical: 11, borderRadius: 12,
                backgroundColor: status === 'in'
                  ? (pressed ? '#22a84a' : '#30D158')
                  : (pressed ? 'rgba(48,209,88,0.18)' : 'rgba(48,209,88,0.1)'),
                borderWidth: 1, borderColor: status === 'in' ? '#30D158' : 'rgba(48,209,88,0.35)',
              })}
            >
              <Check size={13} color={status === 'in' ? '#000' : '#30D158'} strokeWidth={2.8} />
              <Text style={{ color: status === 'in' ? '#000' : '#30D158', fontSize: 12, fontFamily: 'Outfit-Bold' }}>JOIN</Text>
            </Pressable>

            {/* Maybe */}
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onStatusChange(trip.id, 'maybe'); setExpanded(false); }}
              style={({ pressed }) => ({
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                paddingVertical: 11, borderRadius: 12,
                backgroundColor: status === 'maybe'
                  ? (pressed ? '#c9aa00' : '#FFD60A')
                  : (pressed ? 'rgba(255,214,10,0.18)' : 'rgba(255,214,10,0.1)'),
                borderWidth: 1, borderColor: status === 'maybe' ? '#FFD60A' : 'rgba(255,214,10,0.35)',
              })}
            >
              <HelpCircle size={13} color={status === 'maybe' ? '#000' : '#FFD60A'} strokeWidth={2.5} />
              <Text style={{ color: status === 'maybe' ? '#000' : '#FFD60A', fontSize: 12, fontFamily: 'Outfit-Bold' }}>MAYBE</Text>
            </Pressable>

            {/* Pass (joined trips) or Unsave (saved-only trips) */}
            {status === 'saved' ? (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onUnsave(trip.id); setExpanded(false); }}
                style={({ pressed }) => ({
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                  paddingVertical: 11, borderRadius: 12,
                  backgroundColor: pressed ? 'rgba(240,235,227,0.12)' : 'rgba(240,235,227,0.06)',
                  borderWidth: 1, borderColor: 'rgba(240,235,227,0.2)',
                })}
              >
                <Bookmark size={13} color="#F0EBE3" strokeWidth={2} />
                <Text style={{ color: '#F0EBE3', fontSize: 12, fontFamily: 'Outfit-Bold' }}>UNSAVE</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onStatusChange(trip.id, 'left'); setExpanded(false); }}
                style={({ pressed }) => ({
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                  paddingVertical: 11, borderRadius: 12,
                  backgroundColor: pressed ? 'rgba(255,69,58,0.18)' : 'rgba(255,69,58,0.08)',
                  borderWidth: 1, borderColor: 'rgba(255,69,58,0.3)',
                })}
              >
                <XCircle size={13} color="#FF453A" strokeWidth={2.5} />
                <Text style={{ color: '#FF453A', fontSize: 12, fontFamily: 'Outfit-Bold' }}>PASS</Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      </Pressable>

      {/* Separator line */}
      <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16 }} />
    </Animated.View>
  );
}

export default function TripStatusBoard({ visible, onClose }: Props) {
  const { data: myTripsData, isLoading: myLoading } = useMyTrips();
  const { data: savedTrips = [], isLoading: savedLoading } = useSavedTrips();
  const joinTrip = useJoinTrip();
  const leaveTrip = useLeaveTrip();
  const unsaveTrip = useUnsaveTrip();

  const myTrips = myTripsData?.trips ?? [];
  const userId = myTripsData?.userId ?? '';

  const isLoading = myLoading || savedLoading;

  // Build combined trip list: joined (in/maybe) first, then saved-only
  const entries: TripEntry[] = (() => {
    const seen = new Set<string>();
    const result: TripEntry[] = [];

    // My trips (in or maybe)
    for (const trip of myTrips) {
      const memberStatus = trip.members.find(m => m.user_id === userId)?.status;
      if (memberStatus === 'in' || memberStatus === 'maybe') {
        seen.add(trip.id);
        result.push({ trip, status: memberStatus as TripStatus });
      }
    }

    // Saved trips not already in result
    for (const trip of savedTrips) {
      if (!seen.has(trip.id)) {
        seen.add(trip.id);
        result.push({ trip, status: 'saved' });
      }
    }

    return result;
  })();

  const handleStatusChange = (tripId: string, next: 'in' | 'maybe' | 'left') => {
    if (next === 'left') {
      leaveTrip.mutate(tripId);
    } else {
      joinTrip.mutate({ tripId, status: next });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>

        {/* ── Amber departure board header ── */}
        <LinearGradient
          colors={['#0d0900', '#000000']}
          style={{ paddingBottom: 0 }}
        >
          <SafeAreaView edges={['top']}>
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
              {/* Close button */}
              <Pressable
                onPress={onClose}
                style={{ position: 'absolute', top: 16, right: 20, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
              </Pressable>

              {/* Airport code style header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <PulsingDot color="#FFD60A" />
                <Text style={{ color: '#FFD60A', fontSize: 11, fontFamily: 'Outfit-Bold', fontWeight: '800', letterSpacing: 2.5 }}>DEPARTURES</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                <PlaneTakeoff size={28} color="#fff" strokeWidth={1.8} />
                <View>
                  <Text style={{ color: '#fff', fontSize: 28, fontFamily: 'Outfit-ExtraBold', fontWeight: '800', letterSpacing: -0.5, lineHeight: 30 }}>
                    Trip Status
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: 'Outfit-Regular', marginTop: 2 }}>
                    {entries.length} {entries.length === 1 ? 'trip' : 'trips'} on your radar
                  </Text>
                </View>
              </View>

              {/* Status legend */}
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 18 }}>
                {(Object.entries(STATUS_META) as [TripStatus, typeof STATUS_META[TripStatus]][]).map(([key, m]) => (
                  <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.dot }} />
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'Outfit-Regular', letterSpacing: 0.6 }}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Column headers — amber tinted, airport board style */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 16, paddingVertical: 8,
              backgroundColor: 'rgba(255,214,10,0.06)',
              borderTopWidth: 0.5, borderBottomWidth: 0.5,
              borderColor: 'rgba(255,214,10,0.15)',
            }}>
              <Text style={{ flex: 1, color: 'rgba(255,214,10,0.5)', fontSize: 10, fontFamily: 'Outfit-Bold', letterSpacing: 1.8 }}>DESTINATION</Text>
              <Text style={{ color: 'rgba(255,214,10,0.5)', fontSize: 10, fontFamily: 'Outfit-Bold', letterSpacing: 1.8 }}>STATUS</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* ── Trip list ── */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#FFD60A" />
            <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 12, fontFamily: 'Outfit-Regular', fontSize: 13 }}>
              Loading your flights…
            </Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
            <PlaneTakeoff size={48} color="rgba(255,255,255,0.12)" strokeWidth={1.5} />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, fontFamily: 'Outfit-Bold', marginTop: 20, textAlign: 'center' }}>
              No trips yet
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, fontFamily: 'Outfit-Regular', marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
              Save or join trips to track them here
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'Outfit-Regular', letterSpacing: 1.2, paddingHorizontal: 16, paddingVertical: 10 }}>
              TAP ANY ROW TO CHANGE STATUS
            </Text>
            {entries.map((entry, i) => (
              <FlightRow
                key={entry.trip.id}
                entry={entry}
                index={i}
                userId={userId}
                onStatusChange={handleStatusChange}
                onUnsave={(tripId) => unsaveTrip.mutate(tripId)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
