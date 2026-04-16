 import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, MapPin } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

interface SimpleMember {
  id: string;
  name: string;
  photo: string | null;
  age?: number | null;
  isCreator?: boolean;
}

interface SimpleTrip {
  destination: string;
  country: string;
  cover_image: string | null;
  start_date: string | null;
  end_date: string | null;
  is_flexible_dates: boolean;
  vibes: string[];
  budget_level: string | null;
  max_group_size: number;
  description: string | null;
  members?: SimpleMember[];
}

interface Props {
  trip: SimpleTrip | null;
  visible: boolean;
  onClose: () => void;
}

function formatDates(start: string | null, end: string | null, flexible: boolean): string {
  if (flexible) return 'Flexible dates';
  if (!start) return 'TBD';
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (!end) return s.toLocaleDateString('en-US', opts);
  const e = new Date(end);
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

export default function TripDetailSheet({ trip, visible, onClose }: Props) {
  if (!trip) return null;

  const dates = formatDates(trip.start_date, trip.end_date, trip.is_flexible_dates);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* ── Hero ── */}
        <View style={{ height: height * 0.44 }}>
          {trip.cover_image ? (
            <Image
              source={{ uri: trip.cover_image }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: '#111' }} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.92)']}
            locations={[0, 0.3, 1]}
            style={StyleSheet.absoluteFill}
          />

          <SafeAreaView
            style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
            edges={['top']}
          >
            <Pressable
              onPress={onClose}
              style={s.closeBtn}
            >
              <ChevronDown size={20} color="#fff" strokeWidth={2.5} />
            </Pressable>
          </SafeAreaView>

          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <MapPin size={13} color="#F0EBE3" strokeWidth={2} />
              <Text style={{ color: '#F0EBE3', fontSize: 13, fontFamily: 'Outfit-Regular' }}>
                {trip.country}
              </Text>
            </View>
            <Text style={s.heroTitle}>{trip.destination}</Text>
          </View>
        </View>

        {/* ── Body ── */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Info pills */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 20, gap: 8 }}>
            {[
              { label: 'Dates', value: dates },
              { label: 'Budget', value: trip.budget_level ?? '—' },
              { label: 'Group', value: `Up to ${trip.max_group_size}` },
            ].map((item) => (
              <View key={item.label} style={s.pill}>
                <Text style={s.pillLabel}>{item.label}</Text>
                <Text style={s.pillValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 24, gap: 0 }}>
            {/* Vibes */}
            {(trip.vibes ?? []).length > 0 && (
              <View style={{ marginBottom: 26 }}>
                <Text style={s.sectionTitle}>Trip Vibes</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {trip.vibes.map((vibe, i) => (
                    <View key={i} style={s.vibeChip}>
                      <Text style={s.vibeChipText}>{vibe}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Description */}
            {!!trip.description && (
              <View style={{ marginBottom: 26 }}>
                <Text style={s.sectionTitle}>About This Trip</Text>
                <Text style={s.description}>{trip.description}</Text>
              </View>
            )}

            {/* Members */}
            {(trip.members ?? []).length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={s.sectionTitle}>Who's Going</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0, marginTop: 12 }}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {trip.members!.map((m, i) => (
                    <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                      <View style={[s.memberAvatar, m.isCreator && s.memberAvatarCreator]}>
                        {m.photo ? (
                          <Image
                            source={{ uri: m.photo }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={{ flex: 1, backgroundColor: '#222' }} />
                        )}
                      </View>
                      <Text style={s.memberName} numberOfLines={1}>
                        {m.name.split(' ')[0]}
                      </Text>
                      {m.isCreator && (
                        <Text style={s.creatorBadge}>Creator</Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  closeBtn: {
    margin: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 38,
    fontFamily: 'Outfit-ExtraBold',
    letterSpacing: -1.2,
    lineHeight: 42,
  },
  pill: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillLabel: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 11,
    marginBottom: 5,
    fontFamily: 'Outfit-Regular',
  },
  pillValue: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Outfit-Bold',
  },
  vibeChip: {
    backgroundColor: 'rgba(240,235,227,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(240,235,227,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
  },
  vibeChipText: {
    color: '#F0EBE3',
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
  },
  description: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Outfit-Regular',
    marginTop: 10,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  memberAvatarCreator: {
    borderColor: '#F0EBE3',
  },
  memberName: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    maxWidth: 60,
    textAlign: 'center',
  },
  creatorBadge: {
    color: '#F0EBE3',
    fontSize: 9,
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: -4,
  },
});
