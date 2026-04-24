import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight, MapPin, Crown } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeIn, FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { TripPerson } from './WhoIsGoing';
import UserProfileModal from './userprofilemodal';
import UserAvatar from './UserAvatar';
const ACCENT = '#FFFFFF';

const STYLE_EMOJI: Record<string, string> = {
  luxury: '✨', backpacking: '🎒', relaxed: '🏖️', cultural: '🏛️',
  budget: '💰', adventure: '🏔️', party: '🎉', foodie: '🍜',
};
const PACE_LABEL: Record<string, string> = {
  slow: '🐢 Slow & Steady', balanced: '⚖️ Balanced', fast: '🚀 Fast-Paced',
};
const ENERGY_LABEL: Record<string, string> = {
  introvert: '🔋 Introvert', extrovert: '⚡ Extrovert', ambivert: '🌗 Ambivert',
};
const PLAN_LABEL: Record<string, string> = {
  planner: '📋 Planner', spontaneous: '🎲 Spontaneous', flexible: '🌊 Flexible',
};
const EXP_LABEL: Record<string, string> = {
  beginner: '🌱 Beginner', intermediate: '🗺️ Intermediate',
  experienced: '✈️ Experienced', expert: '🌍 Expert',
};

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({ person, index }: { person: TripPerson; index: number }) {
  const [showProfile, setShowProfile] = useState(false);
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.96, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 15 });
    });
    setShowProfile(true);
  };

  const photoUri = person.image || person.photos?.[0] || null;
  const location = [person.city, person.country].filter(Boolean).join(', ') || null;
  const travelStyles = (person.travelStyles ?? []).slice(0, 2);

  return (
    <>
      <Animated.View entering={FadeInRight.delay(index * 60).springify()}>
        <Animated.View style={animStyle}>
          <Pressable
            onPress={handlePress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 18,
              padding: 12,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.07)',
            }}
          >
            {/* Photo */}
            <View style={{ position: 'relative' }}>
              <UserAvatar
                uri={photoUri}
                name={person.name}
                size={58}
                borderRadius={16}
                style={{ borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' }}
              />
              {person.isHost && (
                <View style={{
                  position: 'absolute', bottom: -4, right: -4,
                  backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
                  width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                }}>
                  <Crown size={10} color="#fff" strokeWidth={2.5} />
                </View>
              )}
            </View>

            {/* Info */}
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Text style={{ color: '#f5f5f0', fontSize: 16, fontWeight: '700' }}>
                  {person.name ?? 'Traveler'}
                </Text>
                {person.age ? (
                  <Text style={{ color: '#9ca396', fontSize: 14, marginLeft: 5 }}>{person.age}</Text>
                ) : null}
                {person.isHost && (
                  <View style={{
                    marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.12)',
                    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
                  }}>
                    <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '700' }}>Host</Text>
                  </View>
                )}
              </View>

              {location ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                  <MapPin size={11} color="#9ca396" strokeWidth={2} />
                  <Text style={{ color: '#9ca396', fontSize: 12, marginLeft: 3 }}>{location}</Text>
                </View>
              ) : null}

              {travelStyles.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 5 }}>
                  {travelStyles.map(s => (
                    <View key={s} style={{
                      backgroundColor: 'rgba(255,255,255,0.09)',
                      borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
                    }}>
                      <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '600' }}>
                        {STYLE_EMOJI[s] ?? ''} {s}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Arrow CTA */}
            <Pressable
              onPress={handlePress}
              hitSlop={12}
              style={{
                width: 36, height: 36, borderRadius: 12,
                backgroundColor: '#FFFFFF',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: 'rgba(255,255,255,0.3)',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.45,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <ChevronRight size={18} color="#000" strokeWidth={3} />
            </Pressable>
          </Pressable>
        </Animated.View>
      </Animated.View>

      <UserProfileModal
        userId={person.userId ?? null}
        visible={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4 }}>
      <Text style={{ color: '#f5f5f0', fontSize: 14, fontWeight: '700', flex: 1, letterSpacing: 0.3 }}>
        {label}
      </Text>
      <View style={{
        backgroundColor: 'rgba(255,255,255,0.09)',
        borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3,
      }}>
        <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700' }}>
          {count}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  people: TripPerson[];
  accentColor?: string;
}

export default function TripMembersSection({ people }: Props) {
  if (!people || people.length === 0) return null;

  const going = [...people]
    .filter(p => p.status !== 'maybe')
    .sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));

  const maybe = people.filter(p => p.status === 'maybe');

  return (
    <Animated.View entering={FadeIn.delay(100)} style={{ marginBottom: 24 }}>
      {/* Top-level header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ color: '#f5f5f0', fontSize: 18, fontWeight: '700', flex: 1 }}>
          Who's Going
        </Text>
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.09)',
          borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
        }}>
          <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '700' }}>
            {people.length} {people.length === 1 ? 'person' : 'people'}
          </Text>
        </View>
      </View>

      {/* Going */}
      {going.length > 0 && (
        <>
          <SectionHeader label="Going" count={going.length} />
          {going.map((person, i) => (
            <MemberRow key={person.userId ?? String(i)} person={person} index={i} />
          ))}
        </>
      )}

      {/* Maybe — only shown when someone has maybe status */}
      {maybe.length > 0 && (
        <>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: going.length > 0 ? 8 : 0,
            marginBottom: 10,
          }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.07)',
              borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3,
              marginHorizontal: 10,
            }}>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>
                MAYBE · {maybe.length}
              </Text>
            </View>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          </View>
          {maybe.map((person, i) => (
            <MemberRow key={person.userId ?? String(i)} person={person} index={going.length + i} />
          ))}
        </>
      )}
    </Animated.View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {icon}
      <Text style={{
        color: ACCENT, fontSize: 11, fontWeight: '700',
        marginLeft: 5, textTransform: 'uppercase', letterSpacing: 0.6,
      }}>
        {label}
      </Text>
    </View>
  );
}
