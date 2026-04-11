import { Modal, View, Text, Pressable, Image, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, X, Globe, Languages, Zap, Star } from 'lucide-react-native';
import type { TripPerson } from './WhoIsGoing';

const { width, height } = Dimensions.get('window');
const PLACEHOLDER = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';

const STYLE_EMOJI: Record<string, string> = {
  luxury: '✨', backpacking: '🎒', relaxed: '🏖️', cultural: '🏛️',
  budget: '💰', adventure: '🏔️', party: '🎉', foodie: '🍜',
};
const PACE_LABEL: Record<string, string> = { slow: '🐢 Slow & Steady', balanced: '⚖️ Balanced', fast: '🚀 Go Go Go' };
const ENERGY_LABEL: Record<string, string> = { introvert: '🔋 Introvert', extrovert: '⚡ Extrovert', ambivert: '🌗 Ambivert' };
const PLAN_LABEL: Record<string, string> = { planner: '📋 Planner', spontaneous: '🎲 Spontaneous', flexible: '🌊 Flexible' };
const EXP_LABEL: Record<string, string> = { beginner: '🌱 Beginner', intermediate: '🗺️ Intermediate', experienced: '✈️ Experienced', expert: '🌍 Expert' };

interface Props {
  person: TripPerson | null;
  onClose: () => void;
  accentColor?: string;
}

export default function UserPreviewCard({ person, onClose, accentColor = '#4a9d6e' }: Props) {
  if (!person) return null;

  const photoUri = person.image || (person.photos?.[0]) || PLACEHOLDER;
  const location = [person.city, person.country].filter(Boolean).join(', ') || null;
  const travelStyles = person.travelStyles?.filter(Boolean) ?? [];
  const languages = person.languages?.filter(Boolean) ?? [];

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        onPress={onClose}
      >
        {/* Card — stop propagation so tapping inside doesn't close */}
        <Pressable
          onPress={e => e.stopPropagation()}
          style={{ width: width - 40, maxHeight: height * 0.75, borderRadius: 24, overflow: 'hidden', backgroundColor: '#1a1f1c' }}
        >
          {/* Photo header */}
          <View style={{ height: 220 }}>
            <Image
              source={{ uri: photoUri }}
              defaultSource={{ uri: PLACEHOLDER }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(26,31,28,0.85)', '#1a1f1c']}
              locations={[0.4, 0.75, 1]}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }}
            />

            {/* Close button */}
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={{ position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 6 }}
            >
              <X size={18} color="#f5f5f0" strokeWidth={2.5} />
            </Pressable>

            {/* Host badge */}
            {person.isHost && (
              <View style={{ position: 'absolute', top: 14, left: 14, backgroundColor: accentColor, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Host</Text>
              </View>
            )}

            {/* Name / age / location */}
            <View style={{ position: 'absolute', bottom: 14, left: 16, right: 16 }}>
              <Text style={{ color: '#f5f5f0', fontSize: 22, fontWeight: '700' }}>
                {person.name ?? 'Traveler'}{person.age ? `, ${person.age}` : ''}
              </Text>
              {location ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <MapPin size={13} color="#9ca396" strokeWidth={2} />
                  <Text style={{ color: '#9ca396', fontSize: 13, marginLeft: 4 }}>{location}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Scrollable body */}
          <ScrollView
            style={{ maxHeight: height * 0.75 - 220 }}
            contentContainerStyle={{ padding: 16, paddingTop: 12 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Bio */}
            {!!person.bio && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ color: '#f5f5f0', fontSize: 14, lineHeight: 20 }}>{person.bio}</Text>
              </View>
            )}

            {/* Personality chips row */}
            {(person.travelPace || person.socialEnergy || person.planningStyle || person.experience) ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {person.travelPace ? <Chip label={PACE_LABEL[person.travelPace] ?? person.travelPace} /> : null}
                {person.socialEnergy ? <Chip label={ENERGY_LABEL[person.socialEnergy] ?? person.socialEnergy} /> : null}
                {person.planningStyle ? <Chip label={PLAN_LABEL[person.planningStyle] ?? person.planningStyle} /> : null}
                {person.experience ? <Chip label={EXP_LABEL[person.experience] ?? person.experience} /> : null}
              </View>
            ) : null}

            {/* Travel styles */}
            {travelStyles.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <SectionLabel icon={<Star size={13} color={accentColor} strokeWidth={2} />} label="Travel Style" accentColor={accentColor} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {travelStyles.map(s => (
                    <Chip key={s} label={`${STYLE_EMOJI[s] ?? ''} ${s}`} accent />
                  ))}
                </View>
              </View>
            )}

            {/* Languages */}
            {languages.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <SectionLabel icon={<Languages size={13} color={accentColor} strokeWidth={2} />} label="Languages" accentColor={accentColor} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {languages.map(l => <Chip key={l} label={l} />)}
                </View>
              </View>
            )}

            {/* Places visited */}
            {(person.placesVisited ?? []).length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <SectionLabel icon={<Globe size={13} color={accentColor} strokeWidth={2} />} label="Been to" accentColor={accentColor} />
                <Text style={{ color: '#9ca396', fontSize: 13, marginTop: 5, lineHeight: 19 }}>
                  {person.placesVisited!.slice(0, 8).join(' · ')}
                  {person.placesVisited!.length > 8 ? ` +${person.placesVisited!.length - 8} more` : ''}
                </Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <View style={{
      backgroundColor: accent ? 'rgba(74,157,110,0.18)' : 'rgba(255,255,255,0.07)',
      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    }}>
      <Text style={{ color: accent ? '#4a9d6e' : '#c8cdc9', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function SectionLabel({ icon, label, accentColor }: { icon: React.ReactNode; label: string; accentColor: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {icon}
      <Text style={{ color: accentColor, fontSize: 12, fontWeight: '700', marginLeft: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}
