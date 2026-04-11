import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { X, Minus, Plus } from 'lucide-react-native';
import { getTripImageSuggestions } from '@/lib/hooks/useTripImage';

const { width } = Dimensions.get('window');


const QUICK_DESTINATIONS = [
  { destination: 'Bali', country: 'Indonesia' },
  { destination: 'Tokyo', country: 'Japan' },
  { destination: 'Barcelona', country: 'Spain' },
  { destination: 'Santorini', country: 'Greece' },
  { destination: 'Marrakech', country: 'Morocco' },
  { destination: 'Lisbon', country: 'Portugal' },
];

const QUICK_DATES = ['Spring 2026', 'Summer 2026', 'Fall 2026', 'Winter 2026'];

const VIBES = [
  { label: 'Adventure', emoji: '🧗' },
  { label: 'Chill', emoji: '😌' },
  { label: 'Nature', emoji: '🌿' },
  { label: 'Culture', emoji: '🏛️' },
  { label: 'Food', emoji: '🍜' },
  { label: 'Party', emoji: '🎉' },
  { label: 'Beach', emoji: '🌊' },
  { label: 'Spiritual', emoji: '🧘' },
  { label: 'Road Trip', emoji: '🚗' },
  { label: 'Backpacking', emoji: '🎒' },
];

const PACE_OPTIONS = [
  { label: 'Relaxed', emoji: '☕' },
  { label: 'Balanced', emoji: '⚖️' },
  { label: 'Fast-paced', emoji: '⚡' },
];

const GROUP_PREF_OPTIONS = [
  { label: 'Any', emoji: '🌍' },
  { label: 'Women only', emoji: '👩' },
  { label: 'Men only', emoji: '👨' },
  { label: 'Mixed', emoji: '👫' },
];

const BUDGET_OPTIONS = [
  { label: 'Budget', emoji: '💰' },
  { label: 'Moderate', emoji: '💳' },
  { label: 'Luxury', emoji: '✨' },
];

// ── Design tokens ────────────────────────────────────────────────────────────
const LABEL_STYLE = {
  color: 'rgba(255,255,255,0.78)' as const,
  fontSize: 11,
  fontFamily: 'Outfit-Bold',
  letterSpacing: 1.3,
  textTransform: 'uppercase' as const,
  marginBottom: 10,
};

const CHIP_BASE = {
  borderRadius: 20,
  paddingHorizontal: 14,
  paddingVertical: 8,
};

const INPUT_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderRadius: 14,
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.1)',
  color: '#fff',
  fontSize: 15,
  fontFamily: 'Outfit-Regular',
  paddingHorizontal: 16,
  paddingVertical: 14,
};

// ── Props ────────────────────────────────────────────────────────────────────
type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    destination: string;
    country: string;
    dates: string;
    datesTBD: boolean;
    vibes: string[];
    pace: string;
    groupPref: string;
    maxPeople: number;
    photo: string;
    description: string;
    budget: string;
    accommodation: string;
  }) => void;
  isSubmitting?: boolean;
};

// ── Component ────────────────────────────────────────────────────────────────
export default function CreateTripOnboarding({ visible, onClose, onSubmit, isSubmitting }: Props) {
  const [destination, setDestination] = useState('');
  const [country, setCountry] = useState('');
  const [dates, setDates] = useState('');
  const [datesTBD, setDatesTBD] = useState(false);
  const [vibes, setVibes] = useState<string[]>([]);
  const [pace, setPace] = useState('');
  const [groupPref, setGroupPref] = useState('');
  const [maxPeople, setMaxPeople] = useState(4);
  const [photo, setPhoto] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [coverPhotos, setCoverPhotos] = useState<string[]>([]);

  // Load initial cover photos on open (no destination yet → mixed categories)
  useEffect(() => {
    if (!visible) return;
    const initial = getTripImageSuggestions('', [], 12);
    setCoverPhotos(initial);
    setPhoto(initial[0] ?? '');
  }, [visible]);

  // Update cover photos whenever destination or vibes change
  useEffect(() => {
    if (!visible) return;
    const suggestions = getTripImageSuggestions(destination, vibes, 12);
    setCoverPhotos(suggestions);
  }, [destination, vibes, visible]);

  // Reset on close
  useEffect(() => {
    if (!visible) {
      setDestination('');
      setCountry('');
      setDates('');
      setDatesTBD(false);
      setVibes([]);
      setPace('');
      setGroupPref('');
      setMaxPeople(4);
      setPhoto('');
      setDescription('');
      setBudget('');
      setCoverPhotos([]);
    }
  }, [visible]);

  const toggleVibe = (v: string) => {
    Haptics.selectionAsync();
    if (vibes.includes(v)) {
      setVibes(vibes.filter(x => x !== v));
    } else if (vibes.length < 3) {
      setVibes([...vibes, v]);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const canSubmit =
    destination.trim().length > 0 &&
    country.trim().length > 0 &&
    (dates.trim().length > 0 || datesTBD) &&
    vibes.length > 0 &&
    pace.length > 0 &&
    groupPref.length > 0 &&
    photo.length > 0;

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit({ destination, country, dates, datesTBD, vibes, pace, groupPref, maxPeople, photo, description, budget, accommodation: '' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>

        {/* ── Hero photo ── */}
        <View style={{ height: 260, overflow: 'hidden' }}>
          {photo ? (
            <Image source={{ uri: photo }} style={{ width, height: 260 }} contentFit="cover" />
          ) : (
            <View style={{ width, height: 260, backgroundColor: '#111' }} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
            locations={[0, 0.3, 0.7, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Header overlay */}
          <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14 }}>
              <Pressable
                onPress={onClose}
                style={{ backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 22, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} color="#fff" strokeWidth={2.5} />
              </Pressable>
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Outfit-SemiBold' }}>
                Create Trip
              </Text>
              <View style={{ width: 42 }} />
            </View>
          </SafeAreaView>

          {/* Destination overlay on hero */}
          {destination ? (
            <View style={{ position: 'absolute', bottom: 18, left: 20 }}>
              <Text style={{ color: '#fff', fontSize: 26, fontFamily: 'Outfit-Bold', letterSpacing: -0.5 }}>
                {destination}
              </Text>
              {country ? (
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontFamily: 'Outfit-Regular' }}>
                  {country}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ── Form ── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, gap: 28, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── DESTINATION ── */}
            <View>
              <Text style={LABEL_STYLE}>Destination</Text>
              <TextInput
                value={destination}
                onChangeText={setDestination}
                placeholder="City or destination"
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={[INPUT_STYLE, { marginBottom: 10 }]}
                autoCorrect={false}
              />
              <TextInput
                value={country}
                onChangeText={setCountry}
                placeholder="Country"
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={INPUT_STYLE}
                autoCorrect={false}
              />
              {/* Quick chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, marginTop: 12, marginHorizontal: -20 }}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
              >
                {QUICK_DESTINATIONS.map(q => (
                  <Pressable
                    key={q.destination}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDestination(q.destination);
                      setCountry(q.country);
                    }}
                    style={{
                      ...CHIP_BASE,
                      backgroundColor:
                        destination === q.destination
                          ? '#fff'
                          : 'rgba(255,255,255,0.07)',
                    }}
                  >
                    <Text style={{
                      fontFamily: 'Outfit-SemiBold',
                      fontSize: 13,
                      color: destination === q.destination ? '#000' : 'rgba(255,255,255,0.55)',
                    }}>
                      {q.destination}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* ── COVER PHOTO ── */}
            <View>
              <Text style={LABEL_STYLE}>Cover Photo</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, marginHorizontal: -20 }}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
              >
                {coverPhotos.map((url, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPhoto(url);
                    }}
                    style={{
                      width: 110,
                      height: 150,
                      borderRadius: 14,
                      overflow: 'hidden',
                      borderWidth: photo === url ? 2 : 0,
                      borderColor: '#F0EBE3',
                    }}
                  >
                    <Image source={{ uri: url }} style={{ width: 110, height: 150 }} contentFit="cover" />
                    {photo === url && (
                      <View style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: '#F0EBE3',
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 13 }}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* ── DATES ── */}
            <View>
              <Text style={LABEL_STYLE}>Dates</Text>
              <TextInput
                value={datesTBD ? '' : dates}
                onChangeText={setDates}
                placeholder="e.g. Mar 15 – Mar 28"
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={[INPUT_STYLE, { marginBottom: 12, opacity: datesTBD ? 0.35 : 1 }]}
                editable={!datesTBD}
              />
              {/* Flexible toggle */}
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setDatesTBD(!datesTBD); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}
              >
                <View style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: datesTBD ? '#fff' : 'rgba(255,255,255,0.25)',
                  backgroundColor: datesTBD ? '#fff' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {datesTBD && <Text style={{ color: '#000', fontSize: 13, fontFamily: 'Outfit-Bold' }}>✓</Text>}
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontFamily: 'Outfit-Regular' }}>
                  Dates are flexible / TBD
                </Text>
              </Pressable>
              {/* Season chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_DATES.map(q => (
                  <Pressable
                    key={q}
                    onPress={() => { Haptics.selectionAsync(); setDates(q); setDatesTBD(false); }}
                    style={{
                      ...CHIP_BASE,
                      backgroundColor: dates === q && !datesTBD ? '#fff' : 'rgba(255,255,255,0.07)',
                    }}
                  >
                    <Text style={{
                      fontFamily: 'Outfit-SemiBold',
                      fontSize: 13,
                      color: dates === q && !datesTBD ? '#000' : 'rgba(255,255,255,0.55)',
                    }}>
                      {q}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ── VIBES ── */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={[LABEL_STYLE, { marginBottom: 0 }]}>Vibes</Text>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>
                  {vibes.length}/3
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {VIBES.map(v => {
                  const selected = vibes.includes(v.label);
                  return (
                    <Pressable
                      key={v.label}
                      onPress={() => toggleVibe(v.label)}
                      style={{
                        ...CHIP_BASE,
                        backgroundColor: selected ? '#fff' : 'rgba(255,255,255,0.07)',
                        opacity: !selected && vibes.length === 3 ? 0.35 : 1,
                      }}
                    >
                      <Text style={{
                        fontFamily: 'Outfit-SemiBold',
                        fontSize: 13,
                        color: selected ? '#000' : 'rgba(255,255,255,0.55)',
                      }}>
                        {v.emoji} {v.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── DAILY PACE ── */}
            <View>
              <Text style={LABEL_STYLE}>Daily Pace</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PACE_OPTIONS.map(p => {
                  const selected = pace === p.label;
                  return (
                    <Pressable
                      key={p.label}
                      onPress={() => { Haptics.selectionAsync(); setPace(p.label); }}
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        borderRadius: 14,
                        alignItems: 'center',
                        backgroundColor: selected ? '#fff' : 'rgba(255,255,255,0.06)',
                        borderWidth: 0.5,
                        borderColor: selected ? '#fff' : 'rgba(255,255,255,0.1)',
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                      <Text style={{
                        fontFamily: 'Outfit-SemiBold',
                        fontSize: 12,
                        color: selected ? '#000' : 'rgba(255,255,255,0.55)',
                      }}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── GROUP ── */}
            <View>
              <Text style={LABEL_STYLE}>Group</Text>
              {/* Max travelers stepper */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                borderWidth: 0.5,
                borderColor: 'rgba(255,255,255,0.1)',
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginBottom: 12,
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontFamily: 'Outfit-Regular' }}>
                  Max travelers
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <Pressable
                    onPress={() => { if (maxPeople > 2) { Haptics.selectionAsync(); setMaxPeople(maxPeople - 1); } }}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={15} color="#fff" strokeWidth={2} />
                  </Pressable>
                  <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Outfit-Bold', minWidth: 24, textAlign: 'center' }}>
                    {maxPeople}
                  </Text>
                  <Pressable
                    onPress={() => { if (maxPeople < 20) { Haptics.selectionAsync(); setMaxPeople(maxPeople + 1); } }}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={15} color="#fff" strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
              {/* Group preference chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GROUP_PREF_OPTIONS.map(g => {
                  const selected = groupPref === g.label;
                  return (
                    <Pressable
                      key={g.label}
                      onPress={() => { Haptics.selectionAsync(); setGroupPref(g.label); }}
                      style={{
                        ...CHIP_BASE,
                        backgroundColor: selected ? '#fff' : 'rgba(255,255,255,0.07)',
                      }}
                    >
                      <Text style={{
                        fontFamily: 'Outfit-SemiBold',
                        fontSize: 13,
                        color: selected ? '#000' : 'rgba(255,255,255,0.55)',
                      }}>
                        {g.emoji} {g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── BUDGET (optional) ── */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={[LABEL_STYLE, { marginBottom: 0 }]}>Budget</Text>
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'Outfit-Regular' }}>optional</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {BUDGET_OPTIONS.map(b => {
                  const selected = budget === b.label;
                  return (
                    <Pressable
                      key={b.label}
                      onPress={() => { Haptics.selectionAsync(); setBudget(selected ? '' : b.label); }}
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        borderRadius: 14,
                        alignItems: 'center',
                        backgroundColor: selected ? '#fff' : 'rgba(255,255,255,0.06)',
                        borderWidth: 0.5,
                        borderColor: selected ? '#fff' : 'rgba(255,255,255,0.1)',
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{b.emoji}</Text>
                      <Text style={{
                        fontFamily: 'Outfit-SemiBold',
                        fontSize: 12,
                        color: selected ? '#000' : 'rgba(255,255,255,0.55)',
                      }}>
                        {b.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── DESCRIPTION (optional) ── */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={[LABEL_STYLE, { marginBottom: 0 }]}>Description</Text>
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'Outfit-Regular' }}>optional</Text>
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Tell travelers what makes this trip special..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                multiline
                numberOfLines={4}
                style={[INPUT_STYLE, { minHeight: 100, textAlignVertical: 'top' }]}
              />
            </View>

          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Create Trip button (sticky bottom) ── */}
        <SafeAreaView edges={['bottom']} style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: '#000', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' }}>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            style={{
              backgroundColor: canSubmit && !isSubmitting ? '#F0EBE3' : 'rgba(240,235,227,0.15)',
              borderRadius: 100,
              paddingVertical: 17,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: canSubmit && !isSubmitting ? '#000' : 'rgba(255,255,255,0.3)',
              fontSize: 16,
              fontFamily: 'Outfit-Bold',
              letterSpacing: 0.2,
            }}>
              {isSubmitting ? 'Creating trip...' : 'Create Trip'}
            </Text>
          </Pressable>
        </SafeAreaView>

      </View>
    </Modal>
  );
}
