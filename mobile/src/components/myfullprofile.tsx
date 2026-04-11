import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { X, BadgeCheck, Edit3, Plus, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import useUserProfileStore from '@/lib/state/user-profile-store';
import { useMyTrips, type TripWithDetails } from '@/lib/hooks/useTrips';
import { useMutualMatches } from '@/lib/hooks/useMatches';
import { supabase, getCurrentUserId, savePhotoUrlsToDatabase } from '@/lib/supabase';
import { uploadFile, getImageMeta } from '@/lib/upload';
import { Colors, Font, Radius } from '@/lib/theme';
import TripDetailSheet from './tripDetailSheet';

const { width } = Dimensions.get('window');
const PHOTO_COL   = (width - 4) / 3; // 3-col grid, 2px gaps

// ─── Emoji maps ───────────────────────────────────────────────────────────────
const STYLE_EMOJI: Record<string, string> = {
  luxury:      '✨',
  backpacking: '🎒',
  relaxed:     '🏖️',
  cultural:    '🏛️',
  budget:      '💰',
  adventure:   '🧗',
  party:       '🎉',
  foodie:      '🍜',
};

// ─── Section header ───────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return <Text style={s.sectionLabel}>{children.toUpperCase()}</Text>;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <View style={[s.chip, accent && s.chipAccent]}>
      <Text style={[s.chipText, accent && s.chipTextAccent]}>{label}</Text>
    </View>
  );
}

// ─── Quote editor bottom sheet ────────────────────────────────────────────────
function QuoteSheet({
  visible,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: string;
  onClose: () => void;
  onSave: (q: string) => void;
}) {
  const [val, setVal] = useState(initial);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.sheetOverlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Travel Quote</Text>
          <TextInput
            value={val}
            onChangeText={setVal}
            placeholder="e.g. Life is short, travel often."
            placeholderTextColor={Colors.textDisabled}
            style={s.quoteInput}
            multiline
            maxLength={160}
            autoFocus
          />
          <Pressable style={s.saveBtn} onPress={() => onSave(val.trim())}>
            <Text style={s.saveBtnText}>Save</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface MyFullProfileProps {
  visible: boolean;
  onClose: () => void;
}

export default function MyFullProfile({ visible, onClose }: MyFullProfileProps) {
  const insets      = useSafeAreaInsets();
  const profile     = useUserProfileStore(s => s.profile);
  const updateProfile = useUserProfileStore(s => s.updateProfile);

  const { data: myTripsData }     = useMyTrips();
  const { data: mutualMatches }   = useMutualMatches();

  const [showQuoteEditor,  setShowQuoteEditor]  = useState(false);
  const [uploadingPhoto,   setUploadingPhoto]   = useState(false);
  const [deletingPhoto,    setDeletingPhoto]    = useState<string | null>(null);
  const [previewPhoto,     setPreviewPhoto]     = useState<string | null>(null);
  const [selectedTrip,     setSelectedTrip]     = useState<TripWithDetails | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSaveQuote = useCallback(async (q: string) => {
    const val = q || null;
    updateProfile({ travelQuote: val });
    setShowQuoteEditor(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userId = await getCurrentUserId();
    if (userId) await supabase.from('users').update({ travel_quote: val }).eq('id', userId);
  }, [updateProfile]);

  const handleAddPhoto = useCallback(async () => {
    const current = profile?.profilePhotos ?? [];
    if (current.length >= 10) {
      Alert.alert('Limit reached', 'You can add up to 10 travel photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setUploadingPhoto(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Not signed in');
      const { mimeType, ext } = getImageMeta(uri);
      const filename = `travel-${userId}-${Date.now()}.${ext}`;
      const uploaded = await uploadFile(uri, filename, mimeType);
      const updated = [...current, uploaded.url];
      updateProfile({ profilePhotos: updated });
      await savePhotoUrlsToDatabase(userId, updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('Upload failed', 'Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }, [profile?.profilePhotos, updateProfile]);

  const handleDeletePhoto = useCallback(async (uri: string) => {
    Alert.alert('Remove photo', 'Remove this photo from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setDeletingPhoto(uri);
          try {
            const current = profile?.profilePhotos ?? [];
            const updated = current.filter(p => p !== uri);
            updateProfile({ profilePhotos: updated });
            const userId = await getCurrentUserId();
            if (userId) await savePhotoUrlsToDatabase(userId, updated);
          } finally {
            setDeletingPhoto(null);
          }
        },
      },
    ]);
  }, [profile?.profilePhotos, updateProfile]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!profile) return null;

  const myTrips      = myTripsData?.trips ?? [];
  const tripsCount   = myTrips.length;
  const friendsCount = mutualMatches?.length ?? 0;
  const placesCount  = profile.placesVisited?.length ?? 0;
  const heroBg       = myTrips[0]?.cover_image ?? profile.profilePhotos?.[0] ?? null;

  const dnaPills: string[] = [
    ...(profile.travelStyles ?? []).map((st: string) => `${STYLE_EMOJI[st] ?? '🌍'} ${st.charAt(0).toUpperCase() + st.slice(1)}`),
    profile.travelPace === 'slow'           ? '🐢 Slow & Steady' :
    profile.travelPace === 'fast'           ? '⚡ Go Go Go!'      :
    profile.travelPace === 'balanced'       ? '⚖️ Balanced'      : null,
    profile.planningStyle === 'planner'     ? '🗓 Planner'        :
    profile.planningStyle === 'spontaneous' ? '🎲 Spontaneous'    :
    profile.planningStyle === 'flexible'    ? '🔄 Flexible'       : null,
    profile.socialEnergy === 'introvert'    ? '🌙 Introvert'      :
    profile.socialEnergy === 'extrovert'    ? '☀️ Extrovert'      :
    profile.socialEnergy === 'ambivert'     ? '⚡ Ambivert'       : null,
    profile.experience === 'beginner'       ? '🌱 Beginner'       :
    profile.experience === 'intermediate'   ? '🧭 Explorer'       :
    profile.experience === 'experienced'    ? '✈️ Experienced'    :
    profile.experience === 'expert'         ? '🏆 Expert'         : null,
  ].filter(Boolean) as string[];

  const photos = profile.profilePhotos ?? [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={s.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces
          contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
        >

          {/* ── HERO ───────────────────────────────────────────────────────── */}
          <View style={s.hero}>
            {heroBg ? (
              <Image
                source={{ uri: heroBg }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, s.heroFallback]} />
            )}

            {/* Cinematic gradient — dark at top for close button, heavy dark at bottom for text */}
            <LinearGradient
              colors={['rgba(0,0,0,0.30)', 'transparent', 'rgba(0,0,0,0.10)', 'rgba(0,0,0,0.92)']}
              locations={[0, 0.25, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />

            {/* Close */}
            <View style={[s.heroTopBar, { paddingTop: insets.top + 12 }]}>
              <Pressable onPress={onClose} style={s.closeBtn} hitSlop={12}>
                <X size={17} color="#fff" strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Name block */}
            <View style={s.heroBottom}>
              {/* Avatar */}
              {profile.profilePhotos?.[0] ? (
                <Image
                  source={{ uri: profile.profilePhotos[0] }}
                  style={s.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[s.avatar, s.avatarEmpty]} />
              )}

              <View style={{ flex: 1, gap: 3 }}>
                <View style={s.nameRow}>
                  <Text style={s.heroName} numberOfLines={1}>
                    {profile.name}{profile.age ? `, ${profile.age}` : ''}
                  </Text>
                  {profile.verified && (
                    <BadgeCheck size={17} color={Colors.accent} strokeWidth={2} />
                  )}
                </View>
                {(profile.city || profile.country) && (
                  <Text style={s.heroLocation}>
                    📍 {[profile.city, profile.country].filter(Boolean).join(', ')}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* ── STATS ──────────────────────────────────────────────────────── */}
          <View style={s.statsRow}>
            {[
              { value: tripsCount,   label: 'Trips'   },
              { value: friendsCount, label: 'Friends' },
              { value: placesCount,  label: 'Places'  },
            ].map((stat, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={s.statDivider} />}
                <View style={s.statItem}>
                  <Text style={s.statValue}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* ── QUOTE ──────────────────────────────────────────────────────── */}
          <Pressable
            style={s.quoteCard}
            onPress={() => {
              setShowQuoteEditor(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={s.quoteText}>
              {profile.travelQuote || profile.bio
                ? `❝  ${profile.travelQuote || profile.bio}  ❞`
                : '+ Add a travel quote'}
            </Text>
            <Edit3 size={13} color={Colors.textTertiary} style={{ alignSelf: 'flex-end', marginTop: 8 }} />
          </Pressable>

          {/* ── TRAVEL DNA ─────────────────────────────────────────────────── */}
          {dnaPills.length > 0 && (
            <View style={s.section}>
              <SectionLabel>Travel DNA</SectionLabel>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                style={{ flexGrow: 0 }}
              >
                {dnaPills.map((pill, i) => <Chip key={i} label={pill} />)}
              </ScrollView>
            </View>
          )}

          {/* ── ADVENTURES ─────────────────────────────────────────────────── */}
          <View style={s.section}>
            <SectionLabel>Adventures</SectionLabel>
            {tripsCount === 0 ? (
              <Text style={s.emptyText}>No trips yet — start swiping ✈️</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
                style={{ flexGrow: 0 }}
              >
                {myTrips.map((trip, i) => (
                  <Pressable
                    key={i}
                    style={s.tripCard}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedTrip(trip);
                    }}
                  >
                    <Image
                      source={{ uri: trip.cover_image ?? '' }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.88)']}
                      locations={[0.45, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={s.tripCardLabel} numberOfLines={2}>
                      {trip.destination}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* ── TRAVEL PHOTOS ──────────────────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionRow}>
              <SectionLabel>Travel Photos</SectionLabel>
              <Text style={s.photoCount}>{photos.length}/10</Text>
            </View>

            <View style={s.photoGrid}>
              {photos.map((uri, i) => (
                <Pressable
                  key={i}
                  style={s.photoCell}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPreviewPhoto(uri);
                  }}
                  onLongPress={() => handleDeletePhoto(uri)}
                  delayLongPress={400}
                >
                  <Image
                    source={{ uri }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                  {deletingPhoto === uri && (
                    <View style={s.photoOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}

              {/* Add button (shown when < 10 photos) */}
              {photos.length < 10 && (
                <Pressable
                  style={[s.photoCell, s.photoAddCell]}
                  onPress={handleAddPhoto}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <>
                      <Plus size={22} color={Colors.accent} strokeWidth={2} />
                      <Text style={s.photoAddText}>Add</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            <Text style={s.photoHint}>Long-press a photo to remove it</Text>
          </View>

          {/* ── BEEN TO ────────────────────────────────────────────────────── */}
          {(profile.placesVisited?.length ?? 0) > 0 && (
            <View style={s.section}>
              <SectionLabel>Been to</SectionLabel>
              <View style={s.chipWrap}>
                {profile.placesVisited.map((place, i) => (
                  <Chip key={i} label={`🌍 ${place}`} />
                ))}
              </View>
            </View>
          )}

          {/* ── BUCKET LIST ────────────────────────────────────────────────── */}
          {(profile.bucketList?.length ?? 0) > 0 && (
            <View style={s.section}>
              <SectionLabel>Bucket list</SectionLabel>
              <View style={s.chipWrap}>
                {profile.bucketList.map((place, i) => (
                  <Chip key={i} label={`✈️ ${place}`} accent />
                ))}
              </View>
            </View>
          )}

          {/* ── LANGUAGES ──────────────────────────────────────────────────── */}
          {(profile.languages?.length ?? 0) > 0 && (
            <View style={s.section}>
              <SectionLabel>Speaks</SectionLabel>
              <View style={s.chipWrap}>
                {profile.languages.map((lang, i) => (
                  <Chip key={i} label={lang} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── QUOTE EDITOR ─────────────────────────────────────────────────── */}
        <QuoteSheet
          visible={showQuoteEditor}
          initial={profile.travelQuote ?? profile.bio ?? ''}
          onClose={() => setShowQuoteEditor(false)}
          onSave={handleSaveQuote}
        />
      </View>

      {/* ── FULL-SCREEN PHOTO PREVIEW ─────────────────────────────────────── */}
      <Modal
        visible={!!previewPhoto}
        animationType="fade"
        presentationStyle="overFullScreen"
        transparent
        onRequestClose={() => setPreviewPhoto(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {previewPhoto && (
            <Image
              source={{ uri: previewPhoto }}
              style={{ flex: 1 }}
              contentFit="contain"
            />
          )}
          <Pressable
            onPress={() => setPreviewPhoto(null)}
            style={{
              position: 'absolute',
              top: insets.top + 12,
              left: 16,
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} color="#fff" strokeWidth={2.5} />
          </Pressable>
        </View>
      </Modal>

      {/* ── TRIP DETAIL SHEET ────────────────────────────────────────────────── */}
      <TripDetailSheet
        trip={selectedTrip ? {
          destination: selectedTrip.destination,
          country: selectedTrip.country,
          cover_image: selectedTrip.cover_image,
          start_date: selectedTrip.start_date,
          end_date: selectedTrip.end_date,
          is_flexible_dates: selectedTrip.is_flexible_dates,
          vibes: selectedTrip.vibes ?? [],
          budget_level: selectedTrip.budget_level,
          max_group_size: selectedTrip.max_group_size,
          description: selectedTrip.description,
          members: selectedTrip.members?.map(m => ({
            id: m.id,
            name: m.user?.name ?? 'Traveler',
            photo: m.user?.profile_photo ?? null,
            age: m.user?.age ?? null,
            isCreator: m.user_id === selectedTrip.creator_id,
          })),
        } : null}
        visible={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
      />
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Hero ──
  hero: {
    height: 420,
  },
  heroFallback: {
    backgroundColor: '#0d0d0d',
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingRight: 16,
    zIndex: 10,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottom: {
    position: 'absolute',
    bottom: 22,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2.5,
    borderColor: Colors.accent,
    overflow: 'hidden',
    marginBottom: 2,
  },
  avatarEmpty: {
    backgroundColor: '#1a1a1a',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heroName: {
    fontFamily: Font.extraBold,
    fontSize: 26,
    color: '#fff',
    letterSpacing: -0.6,
    flexShrink: 1,
  },
  heroLocation: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.60)',
    letterSpacing: 0.1,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 22,
    paddingHorizontal: 28,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(240,235,227,0.08)',
  },
  statDivider: {
    width: 0.5,
    backgroundColor: 'rgba(240,235,227,0.10)',
    marginVertical: 6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontFamily: Font.extraBold,
    fontSize: 28,
    color: '#fff',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: 'rgba(240,235,227,0.40)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ── Quote ──
  quoteCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 18,
    backgroundColor: 'rgba(240,235,227,0.05)',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(240,235,227,0.12)',
  },
  quoteText: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Colors.accent,
    lineHeight: 23,
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },

  // ── Sections ──
  section: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 14,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontFamily: Font.semiBold,
    fontSize: 10,
    color: 'rgba(240,235,227,0.40)',
    letterSpacing: 1.8,
  },
  emptyText: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.30)',
  },

  // ── Trip cards ──
  tripCard: {
    width: 110,
    height: 155,
    borderRadius: Radius.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#111',
  },
  tripCardLabel: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: '#fff',
    padding: 11,
    letterSpacing: -0.2,
  },

  // ── Travel photos grid ──
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  photoCell: {
    width: PHOTO_COL,
    height: PHOTO_COL,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  photoAddCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(240,235,227,0.15)',
    gap: 5,
  },
  photoAddText: {
    fontFamily: Font.semiBold,
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCount: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: 'rgba(240,235,227,0.30)',
    letterSpacing: 0.5,
  },
  photoHint: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.20)',
    marginTop: -4,
  },

  // ── Chips ──
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: '#111',
    borderRadius: Radius.full,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chipAccent: {
    backgroundColor: 'rgba(240,235,227,0.07)',
    borderColor: 'rgba(240,235,227,0.20)',
  },
  chipText: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  chipTextAccent: {
    color: Colors.accent,
  },

  // ── Quote sheet ──
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetTitle: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: '#fff',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  quoteInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: Radius.md,
    padding: 14,
    fontFamily: Font.regular,
    fontSize: 15,
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: '#000',
    letterSpacing: -0.2,
  },
});
