import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView,
  Platform, Dimensions, TextInput, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Minus, Plus, Calendar, MapPin, DollarSign } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { getTripImageSuggestions } from '@/lib/hooks/useTripImage';

const { width, height } = Dimensions.get('window');
const HERO_HEIGHT = height * 0.52;
const WHEEL_ITEM_H = 46;
const WHEEL_VISIBLE = 5; // items shown (center = selected)

// ── Static data ───────────────────────────────────────────────────────────────
const QUICK_DESTINATIONS = [
  { destination: 'Bali', country: 'Indonesia' },
  { destination: 'Tokyo', country: 'Japan' },
  { destination: 'Barcelona', country: 'Spain' },
  { destination: 'Santorini', country: 'Greece' },
  { destination: 'Marrakech', country: 'Morocco' },
  { destination: 'Lisbon', country: 'Portugal' },
];

const SEASON_CHIPS = [
  { label: 'Spring 2026', month: 2 },
  { label: 'Summer 2026', month: 5 },
  { label: 'Fall 2026',   month: 8 },
  { label: 'Winter 2026', month: 11 },
];

const VIBES = [
  { label: 'Adventure', emoji: '🧗' }, { label: 'Chill', emoji: '😌' },
  { label: 'Nature', emoji: '🌿' },    { label: 'Culture', emoji: '🏛️' },
  { label: 'Food', emoji: '🍜' },      { label: 'Party', emoji: '🎉' },
  { label: 'Beach', emoji: '🌊' },     { label: 'Spiritual', emoji: '🧘' },
  { label: 'Road Trip', emoji: '🚗' }, { label: 'Backpacking', emoji: '🎒' },
];
const PACE_OPTIONS   = [{ label: 'Relaxed', emoji: '☕' }, { label: 'Balanced', emoji: '⚖️' }, { label: 'Fast-paced', emoji: '⚡' }];
const GROUP_OPTIONS  = [{ label: 'Any', emoji: '🌍' }, { label: 'Women only', emoji: '👩' }, { label: 'Men only', emoji: '👨' }, { label: 'Mixed', emoji: '👫' }];
const BUDGET_OPTIONS = [{ label: 'Budget', emoji: '💰' }, { label: 'Moderate', emoji: '💳' }, { label: 'Luxury', emoji: '✨' }];

const AGES = Array.from({ length: 84 }, (_, i) => i + 16); // 16 – 99

// ── Tokens ────────────────────────────────────────────────────────────────────
const LABEL = { color: 'rgba(255,255,255,0.78)' as const, fontSize: 11, fontFamily: 'Outfit-Bold', letterSpacing: 1.3, textTransform: 'uppercase' as const, marginBottom: 10 };
const CHIP_BASE = { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 };
const INPUT = { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', color: '#fff' as const, fontSize: 15, fontFamily: 'Outfit-Regular', paddingHorizontal: 16, paddingVertical: 14 };

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ── Wheel Picker ──────────────────────────────────────────────────────────────
// Native-feel drum-roll picker built from ScrollView + snap.
// Works identically on iOS and Android.
function WheelPicker({ values, selectedValue, onChange, label }: {
  values: number[];
  selectedValue: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const ref = useRef<ScrollView>(null);
  const totalH = WHEEL_ITEM_H * WHEEL_VISIBLE;
  const pad = WHEEL_ITEM_H * Math.floor(WHEEL_VISIBLE / 2); // 2 items padding top/bottom

  // Scroll to value (no animation on mount to avoid flicker)
  const scrollTo = useCallback((val: number, animated = true) => {
    const idx = values.indexOf(val);
    if (idx >= 0) ref.current?.scrollTo({ y: idx * WHEEL_ITEM_H, animated });
  }, [values]);

  useEffect(() => {
    const t = setTimeout(() => scrollTo(selectedValue, false), 80);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_H);
    const clamped = Math.max(0, Math.min(idx, values.length - 1));
    const newVal = values[clamped];
    if (newVal !== selectedValue) {
      Haptics.selectionAsync();
      onChange(newVal);
    }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'Outfit-SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </Text>
      <View style={{ height: totalH, width: '100%', overflow: 'hidden' }}>
        {/* Selection highlight bar */}
        <View style={{
          position: 'absolute', top: pad, left: 0, right: 0, height: WHEEL_ITEM_H,
          backgroundColor: 'rgba(255,255,255,0.07)',
          borderTopWidth: 0.5, borderBottomWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.15)',
        }} pointerEvents="none" />

        <ScrollView
          ref={ref}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_H}
          decelerationRate="fast"
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingVertical: pad }}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}
        >
          {values.map((v) => {
            const isSelected = v === selectedValue;
            return (
              <Pressable
                key={v}
                onPress={() => { scrollTo(v); onChange(v); Haptics.selectionAsync(); }}
                style={{ height: WHEEL_ITEM_H, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{
                  color: isSelected ? '#fff' : 'rgba(255,255,255,0.28)',
                  fontSize: isSelected ? 22 : 17,
                  fontFamily: isSelected ? 'Outfit-Bold' : 'Outfit-Regular',
                }}>
                  {v}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Gradient fade top */}
        <LinearGradient
          colors={['rgba(10,10,10,1)', 'rgba(10,10,10,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: pad }}
          pointerEvents="none"
        />
        {/* Gradient fade bottom */}
        <LinearGradient
          colors={['rgba(10,10,10,0)', 'rgba(10,10,10,1)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: pad }}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    destination: string; country: string;
    dates: string; datesTBD: boolean;
    startDate: string | null; endDate: string | null;
    vibes: string[]; pace: string; groupPref: string;
    maxPeople: number;
    ageMin: number | null; ageMax: number | null;
    photo: string; description: string; budget: string;
    accommodation: string;
  }) => void;
  isSubmitting?: boolean;
};

// ── Main component ────────────────────────────────────────────────────────────
export default function CreateTripOnboarding({ visible, onClose, onSubmit, isSubmitting }: Props) {
  const insets = useSafeAreaInsets();

  const [destination, setDestination] = useState('');
  const [country, setCountry]         = useState('');
  const [startDate, setStartDate]     = useState<Date | null>(null);
  const [endDate, setEndDate]         = useState<Date | null>(null);
  const [seasonChip, setSeasonChip]   = useState<string | null>(null); // e.g. "Spring 2026"
  const [datesTBD, setDatesTBD]       = useState(false);
  const [vibes, setVibes]             = useState<string[]>([]);
  const [pace, setPace]               = useState('');
  const [groupPref, setGroupPref]     = useState('');
  const [maxPeople, setMaxPeople]     = useState(4);
  const [anyAge, setAnyAge]           = useState(true);
  const [ageMin, setAgeMin]           = useState(18);
  const [ageMax, setAgeMax]           = useState(40);
  const [photo, setPhoto]             = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget]           = useState('');
  const [coverPhotos, setCoverPhotos] = useState<string[]>([]);

  // Native date picker state (for start/end date — not season chips)
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [tempDate, setTempDate]         = useState<Date>(new Date());

  // Cover photos
  useEffect(() => {
    if (!visible) return;
    const initial = getTripImageSuggestions('', [], 12);
    setCoverPhotos(initial); setPhoto(initial[0] ?? '');
  }, [visible]);
  useEffect(() => {
    if (!visible) return;
    setCoverPhotos(getTripImageSuggestions(destination, vibes, 12));
  }, [destination, vibes, visible]);

  // Reset on close
  useEffect(() => {
    if (!visible) {
      setDestination(''); setCountry('');
      setStartDate(null); setEndDate(null); setSeasonChip(null); setDatesTBD(false);
      setVibes([]); setPace(''); setGroupPref('');
      setMaxPeople(4); setAnyAge(true); setAgeMin(18); setAgeMax(40);
      setPhoto(''); setDescription(''); setBudget('');
      setCoverPhotos([]); setPickerTarget(null);
    }
  }, [visible]);

  const toggleVibe = (v: string) => {
    Haptics.selectionAsync();
    if (vibes.includes(v)) setVibes(vibes.filter(x => x !== v));
    else if (vibes.length < 3) setVibes([...vibes, v]);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  // ── Date helpers ─────────────────────────────────────────────────────────────
  const openPicker = (target: 'start' | 'end') => {
    Haptics.selectionAsync();
    setTempDate((target === 'start' ? startDate : endDate) ?? new Date());
    setPickerTarget(target);
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setPickerTarget(null);
      if (event.type === 'set' && selected) {
        if (pickerTarget === 'start') { setStartDate(selected); if (endDate && selected > endDate) setEndDate(null); }
        else setEndDate(selected);
      }
    } else {
      if (selected) setTempDate(selected);
    }
  };

  const confirmIOS = () => {
    if (pickerTarget === 'start') { setStartDate(tempDate); if (endDate && tempDate > endDate) setEndDate(null); }
    else setEndDate(tempDate);
    setPickerTarget(null);
  };

  // What to display on the hero card and in the dates row
  const datesLabel = (() => {
    if (datesTBD) return 'Dates TBD';
    if (seasonChip) return seasonChip;
    if (startDate && endDate) return `${formatDate(startDate)} – ${formatDate(endDate)}`;
    if (startDate) return `From ${formatDate(startDate)}`;
    return '';
  })();

  // Whether date is satisfied for submit
  const hasDate = datesTBD || seasonChip !== null || startDate !== null;

  const canSubmit = destination.trim().length > 0 && country.trim().length > 0 && hasDate && vibes.length > 0 && pace.length > 0 && groupPref.length > 0 && photo.length > 0;

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit({
      destination, country,
      dates: datesLabel,
      datesTBD,
      startDate: (datesTBD || seasonChip) ? null : (startDate ? toISO(startDate) : null),
      endDate:   (datesTBD || seasonChip) ? null : (endDate   ? toISO(endDate)   : null),
      vibes, pace, groupPref, maxPeople,
      ageMin: anyAge ? null : ageMin,
      ageMax: anyAge ? null : ageMax,
      photo, description, budget, accommodation: '',
    });
  };

  // Show specific date inputs only when no season chip and not TBD
  const showDateInputs = !datesTBD && !seasonChip;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>

        {/* ── Single scroll area ── */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        >

          {/* ── Hero card preview ── */}
          <View style={{ height: HERO_HEIGHT, overflow: 'hidden' }}>
            {photo
              ? <Image source={{ uri: photo }} style={{ width, height: HERO_HEIGHT }} contentFit="cover" />
              : <View style={{ width, height: HERO_HEIGHT, backgroundColor: '#111' }} />
            }
            <LinearGradient
              colors={['transparent','transparent','rgba(0,0,0,0.55)','rgba(0,0,0,0.88)','rgba(0,0,0,0.97)']}
              locations={[0,0.38,0.60,0.80,1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 16 }}>
              {destination
                ? <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                      <MapPin size={11} color="#F0EBE3" strokeWidth={2} />
                      <Text style={{ color: '#F0EBE3', fontSize: 12, fontFamily: 'Outfit-Regular' }}>{country || '—'}</Text>
                    </View>
                    <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -1.2, lineHeight: 34, marginBottom: 8, fontFamily: 'Outfit-ExtraBold' }}>
                      {destination}
                    </Text>
                  </>
                : <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 22, fontFamily: 'Outfit-Bold', marginBottom: 8 }}>Your destination...</Text>
              }
              {(datesLabel || budget) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                  {datesLabel ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Calendar size={11} color="rgba(255,255,255,0.55)" strokeWidth={2} />
                      <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>{datesLabel}</Text>
                    </View>
                  ) : null}
                  {datesLabel && budget ? <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' }} /> : null}
                  {budget ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <DollarSign size={11} color="rgba(255,255,255,0.55)" strokeWidth={2} />
                      <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>{budget}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              {description ? (
                <Text numberOfLines={2} style={{ color: 'rgba(255,255,255,0.58)', fontSize: 12, lineHeight: 17, marginBottom: 8, fontFamily: 'Outfit-Regular' }}>{description}</Text>
              ) : null}
              {vibes.length > 0 ? (
                <View style={{ flexDirection: 'row', gap: 5 }}>
                  {vibes.map((v, i) => (
                    <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>{v}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Form ── */}
          <View style={{ padding: 20, gap: 28 }}>

            {/* DESTINATION */}
            <View>
              <Text style={LABEL}>Destination</Text>
              <TextInput value={destination} onChangeText={setDestination} placeholder="City or destination" placeholderTextColor="rgba(255,255,255,0.25)" style={[INPUT, { marginBottom: 10 }]} autoCorrect={false} />
              <TextInput value={country} onChangeText={setCountry} placeholder="Country" placeholderTextColor="rgba(255,255,255,0.25)" style={INPUT} autoCorrect={false} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 12, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                {QUICK_DESTINATIONS.map(q => (
                  <Pressable key={q.destination} onPress={() => { Haptics.selectionAsync(); setDestination(q.destination); setCountry(q.country); }}
                    style={{ ...CHIP_BASE, backgroundColor: destination === q.destination ? '#fff' : 'rgba(255,255,255,0.07)' }}
                  >
                    <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 13, color: destination === q.destination ? '#000' : 'rgba(255,255,255,0.55)' }}>{q.destination}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* COVER PHOTO */}
            <View>
              <Text style={LABEL}>Cover Photo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                {coverPhotos.map((url, i) => (
                  <Pressable key={i} onPress={() => { Haptics.selectionAsync(); setPhoto(url); }}
                    style={{ width: 110, height: 150, borderRadius: 14, overflow: 'hidden', borderWidth: photo === url ? 2 : 0, borderColor: '#F0EBE3' }}
                  >
                    <Image source={{ uri: url }} style={{ width: 110, height: 150 }} contentFit="cover" />
                    {photo === url && (
                      <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#F0EBE3', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13 }}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* DATES */}
            <View>
              <Text style={LABEL}>Dates</Text>

              {/* Season quick-chips — selecting one is the entire date */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {SEASON_CHIPS.map(({ label: chipLabel, month }) => {
                  const selected = seasonChip === chipLabel;
                  return (
                    <Pressable
                      key={chipLabel}
                      onPress={() => {
                        Haptics.selectionAsync();
                        if (selected) {
                          // Deselect
                          setSeasonChip(null);
                        } else {
                          setSeasonChip(chipLabel);
                          setStartDate(null);
                          setEndDate(null);
                          setDatesTBD(false);
                        }
                      }}
                      style={{ ...CHIP_BASE, backgroundColor: selected ? '#fff' : 'rgba(255,255,255,0.07)' }}
                    >
                      <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 13, color: selected ? '#000' : 'rgba(255,255,255,0.55)' }}>
                        {chipLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Start + End date pickers — hidden when season chip selected or TBD */}
              {showDateInputs && (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <Pressable onPress={() => openPicker('start')}
                    style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 0.5, borderColor: startDate ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)', padding: 14 }}
                  >
                    <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontFamily: 'Outfit-SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>Start Date</Text>
                    <Text style={{ color: startDate ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 14, fontFamily: startDate ? 'Outfit-SemiBold' : 'Outfit-Regular' }}>
                      {startDate ? formatDate(startDate) : 'Select date'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => openPicker('end')}
                    style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 0.5, borderColor: endDate ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)', padding: 14 }}
                  >
                    <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontFamily: 'Outfit-SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>End Date</Text>
                    <Text style={{ color: endDate ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 14, fontFamily: endDate ? 'Outfit-SemiBold' : 'Outfit-Regular' }}>
                      {endDate ? formatDate(endDate) : 'Select date'}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Flexible toggle */}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  const next = !datesTBD;
                  setDatesTBD(next);
                  if (next) { setStartDate(null); setEndDate(null); setSeasonChip(null); }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
                  borderColor: datesTBD ? '#fff' : 'rgba(255,255,255,0.25)',
                  backgroundColor: datesTBD ? '#fff' : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {datesTBD && <Text style={{ color: '#000', fontSize: 13, fontFamily: 'Outfit-Bold' }}>✓</Text>}
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontFamily: 'Outfit-Regular' }}>Dates are flexible / TBD</Text>
              </Pressable>
            </View>

            {/* VIBES */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={[LABEL, { marginBottom: 0 }]}>Vibes</Text>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>{vibes.length}/3</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {VIBES.map(v => {
                  const sel = vibes.includes(v.label);
                  return (
                    <Pressable key={v.label} onPress={() => toggleVibe(v.label)}
                      style={{ ...CHIP_BASE, backgroundColor: sel ? '#fff' : 'rgba(255,255,255,0.07)', opacity: !sel && vibes.length === 3 ? 0.35 : 1 }}
                    >
                      <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 13, color: sel ? '#000' : 'rgba(255,255,255,0.55)' }}>{v.emoji} {v.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* DAILY PACE */}
            <View>
              <Text style={LABEL}>Daily Pace</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PACE_OPTIONS.map(p => {
                  const sel = pace === p.label;
                  return (
                    <Pressable key={p.label} onPress={() => { Haptics.selectionAsync(); setPace(p.label); }}
                      style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', gap: 4, backgroundColor: sel ? '#fff' : 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: sel ? '#fff' : 'rgba(255,255,255,0.1)' }}
                    >
                      <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                      <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 12, color: sel ? '#000' : 'rgba(255,255,255,0.55)' }}>{p.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* GROUP */}
            <View>
              <Text style={LABEL}>Group</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12 }}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontFamily: 'Outfit-Regular' }}>Max travelers</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <Pressable onPress={() => { if (maxPeople > 2) { Haptics.selectionAsync(); setMaxPeople(maxPeople - 1); } }}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Minus size={15} color="#fff" strokeWidth={2} />
                  </Pressable>
                  <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Outfit-Bold', minWidth: 24, textAlign: 'center' }}>{maxPeople}</Text>
                  <Pressable onPress={() => { if (maxPeople < 20) { Haptics.selectionAsync(); setMaxPeople(maxPeople + 1); } }}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={15} color="#fff" strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GROUP_OPTIONS.map(g => {
                  const sel = groupPref === g.label;
                  return (
                    <Pressable key={g.label} onPress={() => { Haptics.selectionAsync(); setGroupPref(g.label); }}
                      style={{ ...CHIP_BASE, backgroundColor: sel ? '#fff' : 'rgba(255,255,255,0.07)' }}
                    >
                      <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 13, color: sel ? '#000' : 'rgba(255,255,255,0.55)' }}>{g.emoji} {g.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* AGE PREFERENCE */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View>
                  <Text style={[LABEL, { marginBottom: 2 }]}>Age Preference</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'Outfit-Regular' }}>Travelers you're looking for</Text>
                </View>
                <Pressable onPress={() => { Haptics.selectionAsync(); setAnyAge(!anyAge); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: anyAge ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: 'Outfit-SemiBold' }}>Any age</Text>
                  <View style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: anyAge ? '#F0EBE3' : 'rgba(255,255,255,0.12)', justifyContent: 'center', paddingHorizontal: 3 }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: anyAge ? '#000' : 'rgba(255,255,255,0.5)', alignSelf: anyAge ? 'flex-end' : 'flex-start' }} />
                  </View>
                </Pressable>
              </View>

              {!anyAge && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
                  {/* Two wheels side by side */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                    <WheelPicker
                      values={AGES.filter(a => a <= ageMax - 1)}
                      selectedValue={ageMin}
                      onChange={(v) => setAgeMin(v)}
                      label="MIN AGE"
                    />
                    {/* Divider */}
                    <View style={{ width: 1, height: WHEEL_ITEM_H * WHEEL_VISIBLE, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 26 }} />
                    <WheelPicker
                      values={AGES.filter(a => a >= ageMin + 1)}
                      selectedValue={ageMax}
                      onChange={(v) => setAgeMax(v)}
                      label="MAX AGE"
                    />
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, fontFamily: 'Outfit-Regular', textAlign: 'center', marginTop: 8 }}>
                    {ageMin} – {ageMax} years old
                  </Text>
                </View>
              )}
            </View>

            {/* BUDGET */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={[LABEL, { marginBottom: 0 }]}>Budget</Text>
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'Outfit-Regular' }}>optional</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {BUDGET_OPTIONS.map(b => {
                  const sel = budget === b.label;
                  return (
                    <Pressable key={b.label} onPress={() => { Haptics.selectionAsync(); setBudget(sel ? '' : b.label); }}
                      style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', gap: 4, backgroundColor: sel ? '#fff' : 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: sel ? '#fff' : 'rgba(255,255,255,0.1)' }}
                    >
                      <Text style={{ fontSize: 20 }}>{b.emoji}</Text>
                      <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 12, color: sel ? '#000' : 'rgba(255,255,255,0.55)' }}>{b.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* DESCRIPTION */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={[LABEL, { marginBottom: 0 }]}>Description</Text>
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'Outfit-Regular' }}>optional</Text>
              </View>
              <TextInput value={description} onChangeText={setDescription}
                placeholder="Tell travelers what makes this trip special..."
                placeholderTextColor="rgba(255,255,255,0.25)" multiline numberOfLines={4}
                style={[INPUT, { minHeight: 100, textAlignVertical: 'top' }]}
              />
            </View>

          </View>
        </ScrollView>

        {/* ── Sticky Create Trip button ── */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 8, backgroundColor: '#000', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' }}>
          <Pressable onPress={handleSubmit} disabled={!canSubmit || isSubmitting}
            style={{ backgroundColor: canSubmit && !isSubmitting ? '#F0EBE3' : 'rgba(240,235,227,0.15)', borderRadius: 100, paddingVertical: 17, alignItems: 'center' }}
          >
            <Text style={{ color: canSubmit && !isSubmitting ? '#000' : 'rgba(255,255,255,0.3)', fontSize: 16, fontFamily: 'Outfit-Bold', letterSpacing: 0.2 }}>
              {isSubmitting ? 'Creating trip...' : 'Create Trip'}
            </Text>
          </Pressable>
        </View>

        {/* ── Floating header: X + title ── */}
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 10 }}>
            <Pressable onPress={onClose} hitSlop={16}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.70)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} color="#fff" strokeWidth={2.5} />
            </Pressable>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.70)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Outfit-SemiBold' }}>Create Trip</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>
        </View>

        {/* ── iOS date picker sheet ── */}
        {pickerTarget !== null && Platform.OS === 'ios' && (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1a1a1a', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)', paddingBottom: insets.bottom }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
              <Pressable onPress={() => setPickerTarget(null)} hitSlop={12}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, fontFamily: 'Outfit-Regular' }}>Cancel</Text>
              </Pressable>
              <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Outfit-SemiBold' }}>{pickerTarget === 'start' ? 'Start Date' : 'End Date'}</Text>
              <Pressable onPress={confirmIOS} hitSlop={12}>
                <Text style={{ color: '#F0EBE3', fontSize: 16, fontFamily: 'Outfit-Bold' }}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker value={tempDate} mode="date" display="spinner" onChange={onPickerChange}
              minimumDate={pickerTarget === 'end' && startDate ? startDate : new Date()}
              textColor="#fff" style={{ backgroundColor: '#1a1a1a' }}
            />
          </View>
        )}

        {/* ── Android date picker ── */}
        {pickerTarget !== null && Platform.OS === 'android' && (
          <DateTimePicker value={tempDate} mode="date" display="default" onChange={onPickerChange}
            minimumDate={pickerTarget === 'end' && startDate ? startDate : new Date()}
          />
        )}

      </View>
    </Modal>
  );
}
