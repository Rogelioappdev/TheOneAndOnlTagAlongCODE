import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  ActionSheetIOS,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Send,
  Users,
  MapPin,
  Calendar,
  X,
  MoreVertical,
  ImageIcon,
  Reply,
  Pin,
  BellOff,
  Search,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { ContextMenu } from '@/lib/contextMenuShim';
import {
  useTripMessages,
  useSendTripMessage,
  useSendImageMessage,
  useToggleReaction,
  useMarkTripChatRead,
  useRealtimeTripMessages,
  useRealtimeReactions,
  type TripMessageWithSender,
} from '@/lib/hooks/useTripChat';
import {
  useConversations,
  useRealtimeConversations,
  useLeaveConversation,
  usePinConversation,
  useMuteConversation,
  type ChatMemberRow,
} from '@/lib/hooks/useChat';
import { useTyping } from '@/lib/hooks/useTyping';
import { supabase } from '@/lib/supabase';
import type { TripPerson } from '@/components/WhoIsGoing';
import TripMembersSection from '@/components/TripMembersSection';
import { useQueryClient, InfiniteData } from '@tanstack/react-query';
import { tripChatKeys } from '@/lib/hooks/useTripChat';
import { type PublicProfileData } from '@/components/PublicProfileView';
import UserProfileModal from '@/components/userprofilemodal';

  const { width: SCREEN_W } = Dimensions.get('window');

  // ─── Color tokens ─────────────────────────────────────────────────────────────
  const BG          = '#000000';
  const SURFACE     = '#0f0f0f';
  const SURFACE2    = '#1a1a1a';
  const BUBBLE_ME   = '#0A84FF';
  const BUBBLE_THEM = '#2C2C2E';
  const TEXT        = '#ffffff';
  const TEXT2       = 'rgba(255,255,255,0.55)';
  const TEXT3       = 'rgba(255,255,255,0.3)';
  const SEP         = 'rgba(255,255,255,0.07)';
  const ACCENT      = '#10b981';
  const UNREAD_DOT  = '#0A84FF';
  const DANGER      = '#ff453a';

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function formatTime(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function formatSectionDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (msgDay.getTime() === today.getTime()) return 'Today';
    if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function formatTripDates(start?: string | null, end?: string | null): string {
    if (!start) return 'Flexible Dates';
    const s = new Date(start);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!end) return fmt(s);
    return `${fmt(s)} – ${fmt(new Date(end))}`;
  }

  function getAvatarColors(name: string): [string, string] {
    const colors: Record<string, [string, string]> = {
      a: ['#0b84ff', '#0066cc'], b: ['#ff375f', '#cc1e3e'],
      c: ['#ff9f0a', '#cc7d00'], d: ['#30d158', '#1eaa40'],
      e: ['#bf5af2', '#9a33d0'], f: ['#ff6482', '#e04761'],
      g: ['#64d2ff', '#3ab8e8'], h: ['#ffd60a', '#ccab00'],
    };
    const firstChar = (name?.charAt(0) || 'a').toLowerCase();
    const index = firstChar.charCodeAt(0) % 8;
    const keys = Object.keys(colors);
    return colors[keys[index]] ?? ['#636366', '#48484a'];
  }

  // ─── Avatar ───────────────────────────────────────────────────────────────────
  function Avatar({ name, photo, size = 36 }: { name: string; photo?: string | null; size?: number }) {
    if (photo) {
      return (
        <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: SURFACE2 }} />
      );
    }
    const colors = getAvatarColors(name);
    return (
      <LinearGradient colors={colors} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>
          {(name?.charAt(0) || '?').toUpperCase()}
        </Text>
      </LinearGradient>
    );
  }

  // ─── Date separator ───────────────────────────────────────────────────────────
  function DateSeparator({ dateString }: { dateString: string }) {
    return (
      <View style={{ alignItems: 'center', marginVertical: 16 }}>
        <Text style={{ color: TEXT3, fontSize: 12, fontWeight: '400', letterSpacing: 0.1 }}>
          {formatSectionDate(dateString)}
        </Text>
      </View>
    );
  }

  // ─── Typing indicator ─────────────────────────────────────────────────────────
  function TypingIndicator({ names }: { names: string[] }) {
    const dot1 = useSharedValue(0);
    const dot2 = useSharedValue(0);
    const dot3 = useSharedValue(0);

    useEffect(() => {
      const animate = (sv: typeof dot1, delay: number) => {
        const run = () => {
          sv.value = withTiming(1, { duration: 300 }, () => {
            sv.value = withTiming(0, { duration: 300 });
          });
        };
        const t = setTimeout(run, delay);
        const interval = setInterval(run, 1000);
        return () => { clearTimeout(t); clearInterval(interval); };
      };
      const c1 = animate(dot1, 0);
      const c2 = animate(dot2, 200);
      const c3 = animate(dot3, 400);
      return () => { c1(); c2(); c3(); };
    }, []);

    const s1 = useAnimatedStyle(() => ({ opacity: 0.4 + dot1.value * 0.6, transform: [{ translateY: -dot1.value * 3 }] }));
    const s2 = useAnimatedStyle(() => ({ opacity: 0.4 + dot2.value * 0.6, transform: [{ translateY: -dot2.value * 3 }] }));
    const s3 = useAnimatedStyle(() => ({ opacity: 0.4 + dot3.value * 0.6, transform: [{ translateY: -dot3.value * 3 }] }));

    const label = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} & ${names[1]}` : 'Several people';

    return (
      <Animated.View entering={FadeIn.duration(200)} style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 14, paddingBottom: 6, gap: 6 }}>
        <View style={{ width: 32, marginRight: 2 }} />
        <View style={{ backgroundColor: BUBBLE_THEM, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          {[s1, s2, s3].map((s, i) => (
            <Animated.View key={i} style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.6)' }, s]} />
          ))}
        </View>
        <Text style={{ color: TEXT3, fontSize: 11, marginBottom: 4 }}>{label} {names.length === 1 ? 'is' : 'are'} typing…</Text>
      </Animated.View>
    );
  }

  // ─── Message bubble ───────────────────────────────────────────────────────────
  const TAPBACK_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '✈️'];

  function MessageBubble({
    msg, isMe, showAvatar, showName, showDateAbove, isFirstInGroup, isLastInGroup, isLastMessage, seenByMembers, currentUserId, chatId, onReply, onAvatarPress, onDelete, onImagePress,
  }: {
    msg: TripMessageWithSender;
    isMe: boolean;
    showAvatar: boolean;
    showName: boolean;
    showDateAbove: boolean;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    isLastMessage: boolean;
    seenByMembers: Array<{ name: string | null; photo: string | null }>;
    currentUserId: string | null;
    chatId: string;
    onReply: () => void;
    onAvatarPress?: () => void;
    onDelete: () => void;
    onImagePress: (uri: string) => void;
  }) {
    const senderName = msg.sender?.name?.split(' ')[0] ?? null;
    const senderPhoto = msg.sender?.photos?.[0] || msg.sender?.profile_photo;
    const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const toggleReaction = useToggleReaction();

    // iOS continuous-bubble corner radii
    const R = 18;
    const r = 4;
    const borderTopLeftRadius     = isMe ? R : (isFirstInGroup ? R : r);
    const borderTopRightRadius    = isMe ? (isFirstInGroup ? R : r) : R;
    const borderBottomLeftRadius  = isMe ? R : (isLastInGroup ? R : r);
    const borderBottomRightRadius = isMe ? (isLastInGroup ? R : r) : R;

    // Group reactions by emoji
    const reactions = msg.reactions ?? [];
    const reactionMap: Record<string, { count: number; myReactionId: string | null }> = {};
    reactions.forEach(r => {
      if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, myReactionId: null };
      reactionMap[r.emoji].count++;
      if (r.user_id === currentUserId) reactionMap[r.emoji].myReactionId = r.id;
    });
    const reactionEntries = Object.entries(reactionMap);

    const handleReact = (emoji: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const existing = reactionMap[emoji]?.myReactionId ?? null;
      toggleReaction.mutate({ messageId: msg.id, emoji, chatId, existingReactionId: existing });
    };

    const isImage = msg.type === 'image';
  const [imgError, setImgError] = useState(false);

  // ── Swipe-to-reply gesture ──────────────────────────────────────────────────
  const SWIPE_THRESHOLD = 65;
  const translateX = useSharedValue(0);
  const replyTriggered = useSharedValue(false);

  const triggerReply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReply();
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([8, Infinity])   // only activate on rightward swipe
    .failOffsetY([-12, 12])         // cancel if user scrolls vertically
    .onUpdate((e) => {
      const dx = Math.min(e.translationX * 0.5, SWIPE_THRESHOLD + 10);
      if (dx > 0) translateX.value = dx;
      if (dx >= SWIPE_THRESHOLD && !replyTriggered.value) {
        replyTriggered.value = true;
        runOnJS(triggerReply)();
      }
    })
    .onEnd(() => {
      replyTriggered.value = false;
      translateX.value = withSpring(0, { stiffness: 300, damping: 26 });
    });

  const bubbleSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const replyIconStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, translateX.value / SWIPE_THRESHOLD);
    return {
      opacity: progress,
      transform: [{ scale: 0.5 + progress * 0.5 }],
    };
  });
  // ───────────────────────────────────────────────────────────────────────────

    return (
      <View style={{ marginBottom: isLastInGroup ? 2 : 1 }}>
        {showDateAbove && <DateSeparator dateString={msg.created_at} />}

        {/* Sender name */}
        {showName && !isMe && isFirstInGroup && !!senderName && (
          <Text style={{ color: TEXT2, fontSize: 12, fontFamily: 'Outfit-SemiBold', marginBottom: 3, marginLeft: 50, letterSpacing: 0.1 }}>
            {senderName}
          </Text>
        )}

        <GestureDetector gesture={swipeGesture}>
          <View style={{ position: 'relative' }}>

            {/* Reply icon revealed behind the sliding bubble */}
            <Animated.View style={[{
              position: 'absolute',
              left: 10,
              top: 0, bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 0,
            }, replyIconStyle]}>
              <View style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: SURFACE2,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Reply size={15} color={TEXT2} strokeWidth={2} />
              </View>
            </Animated.View>

        <Animated.View style={[{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: isMe ? 'flex-end' : 'flex-start',
          paddingHorizontal: 8,
          marginBottom: reactionEntries.length > 0 ? 0 : (isLastInGroup ? 0 : 2),
          zIndex: 1,
        }, bubbleSlideStyle]}>
          {/* Avatar slot */}
          {!isMe && (
            <View style={{ width: 32, marginRight: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
              {showAvatar && isLastInGroup ? (
                <Pressable onPress={onAvatarPress} hitSlop={8}>
                  <Avatar name={senderName ?? ''} photo={senderPhoto} size={28} />
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Bubble with context menu */}
          <ContextMenu.Root>
            <ContextMenu.Trigger>
              <View style={{ maxWidth: SCREEN_W * 0.72 }}>
                {/* Reply quote — normalize reply_to since PostgREST self-joins can return arrays */}
                {(() => {
                  const replyTo = Array.isArray(msg.reply_to) ? (msg.reply_to[0] ?? null) : (msg.reply_to ?? null);
                  if (!replyTo?.id) return null;
                  return (
                    <View style={{
                      backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      borderLeftWidth: 3,
                      borderLeftColor: isMe ? 'rgba(255,255,255,0.5)' : BUBBLE_ME,
                      padding: 8,
                      marginBottom: 3,
                    }}>
                      <Text style={{ color: isMe ? 'rgba(255,255,255,0.7)' : BUBBLE_ME, fontSize: 12, fontWeight: '700', marginBottom: 2 }} numberOfLines={1}>
                        {(Array.isArray(replyTo.sender) ? replyTo.sender[0] : replyTo.sender)?.name?.split(' ')[0] ?? ''}
                      </Text>
                      <Text style={{ color: isMe ? 'rgba(255,255,255,0.6)' : TEXT2, fontSize: 13 }} numberOfLines={2}>
                        {replyTo.content}
                      </Text>
                    </View>
                  );
                })()}

                {/* Image or text bubble */}
                {isImage ? (
                  <Pressable
                    onPress={() => !imgError && onImagePress(msg.content)}
                    style={{ borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius, overflow: 'hidden', backgroundColor: SURFACE2 }}
                  >
                    {imgError ? (
                      <View style={{ width: SCREEN_W * 0.6, height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: SURFACE2 }}>
                        <ImageIcon size={28} color={TEXT3} strokeWidth={1.5} />
                        <Text style={{ color: TEXT3, fontSize: 12, marginTop: 6 }}>Image unavailable</Text>
                      </View>
                    ) : (
                      <ExpoImage
                        source={{ uri: msg.content }}
                        style={{ width: SCREEN_W * 0.62, height: SCREEN_W * 0.52 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        recyclingKey={msg.id}
                        transition={150}
                        onError={() => setImgError(true)}
                      />
                    )}
                  </Pressable>
                ) : (
                  <View style={{
                    backgroundColor: isMe ? BUBBLE_ME : BUBBLE_THEM,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderTopLeftRadius,
                    borderTopRightRadius,
                    borderBottomLeftRadius,
                    borderBottomRightRadius,
                  }}>
                    <Text style={{ color: '#ffffff', fontSize: 16, lineHeight: 22, letterSpacing: -0.1, fontFamily: 'Outfit-Regular' }}>
                      {msg.content}
                    </Text>
                  </View>
                )}
              </View>
            </ContextMenu.Trigger>

            <ContextMenu.Content>
              {TAPBACK_EMOJIS.map(emoji => (
                <ContextMenu.Item key={`react-${emoji}`} onSelect={() => handleReact(emoji)}>
                  <ContextMenu.ItemTitle>{emoji}  {reactionMap[emoji]?.myReactionId ? 'Remove' : 'React'}</ContextMenu.ItemTitle>
                </ContextMenu.Item>
              ))}
              <ContextMenu.Separator />
              <ContextMenu.Item key="reply" onSelect={onReply}>
                <ContextMenu.ItemTitle>Reply</ContextMenu.ItemTitle>
                <ContextMenu.ItemIcon ios={{ name: 'arrowshape.turn.up.left', pointSize: 16 }} />
              </ContextMenu.Item>
              <ContextMenu.Item key="copy" onSelect={() => { Clipboard.setStringAsync(msg.content); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <ContextMenu.ItemTitle>Copy</ContextMenu.ItemTitle>
                <ContextMenu.ItemIcon ios={{ name: 'doc.on.doc', pointSize: 16 }} />
              </ContextMenu.Item>
              {isMe && (
                <ContextMenu.Item key="delete" destructive onSelect={onDelete}>
                  <ContextMenu.ItemTitle>Delete</ContextMenu.ItemTitle>
                  <ContextMenu.ItemIcon ios={{ name: 'trash', pointSize: 16 }} />
                </ContextMenu.Item>
              )}
            </ContextMenu.Content>
          </ContextMenu.Root>
        </Animated.View>

          </View>
        </GestureDetector>

        {/* Reaction badges */}
        {reactionEntries.length > 0 && (
          <View style={{
            flexDirection: 'row',
            justifyContent: isMe ? 'flex-end' : 'flex-start',
            paddingHorizontal: isMe ? 14 : 48,
            marginTop: -6,
            marginBottom: 4,
            gap: 4,
            flexWrap: 'wrap',
          }}>
            {reactionEntries.map(([emoji, { count, myReactionId }]) => (
              <Pressable
                key={emoji}
                onPress={() => handleReact(emoji)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: myReactionId ? 'rgba(10,132,255,0.2)' : SURFACE2,
                  borderRadius: 12,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: myReactionId ? 'rgba(10,132,255,0.5)' : 'rgba(255,255,255,0.1)',
                  gap: 3,
                }}
              >
                <Text style={{ fontSize: 14 }}>{emoji}</Text>
                {count > 1 && <Text style={{ color: TEXT2, fontSize: 12, fontWeight: '600' }}>{count}</Text>}
              </Pressable>
            ))}
          </View>
        )}

        {/* Timestamp + seen indicators */}
        {isLastInGroup && (
          <View style={{
            flexDirection: 'row',
            justifyContent: isMe ? 'flex-end' : 'flex-start',
            alignItems: 'center',
            paddingHorizontal: isMe ? 10 : 50,
            marginTop: 3,
            marginBottom: 8,
            gap: 5,
          }}>
            <Text style={{ color: TEXT3, fontSize: 11, fontFamily: 'Outfit-Regular' }}>{timeStr}</Text>
            {isMe && isLastMessage && seenByMembers.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: TEXT3, fontSize: 11 }}>·</Text>
                <Text style={{ color: TEXT3, fontSize: 11, fontFamily: 'Outfit-Regular' }}>Seen</Text>
                <View style={{ flexDirection: 'row' }}>
                  {seenByMembers.slice(0, 4).map((m, i) => (
                    <View key={i} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: BG, overflow: 'hidden', marginLeft: i > 0 ? -3 : 0 }}>
                      {m.photo ? (
                        <Image source={{ uri: m.photo }} style={{ width: 14, height: 14 }} />
                      ) : (
                        <LinearGradient colors={getAvatarColors(m.name ?? 'T')} style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 6, fontWeight: '700' }}>{(m.name ?? '?').charAt(0).toUpperCase()}</Text>
                        </LinearGradient>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  // ─── Send button ──────────────────────────────────────────────────────────────
  function SendButton({ active, onPress, loading }: { active: boolean; onPress: () => void; loading: boolean }) {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const handlePress = () => {
      scale.value = withSpring(0.88, { stiffness: 400, damping: 15 }, () => {
        scale.value = withSpring(1, { stiffness: 300, damping: 12 });
      });
      onPress();
    };

    return (
      <Animated.View style={animStyle}>
        <Pressable
          onPress={handlePress}
          disabled={!active || loading}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: active && !loading ? BUBBLE_ME : SURFACE2, alignItems: 'center', justifyContent: 'center' }}
        >
          {loading
            ? <ActivityIndicator size="small" color={TEXT3} />
            : <Send size={15} color={active ? '#fff' : TEXT3} strokeWidth={2.5} />}
        </Pressable>
      </Animated.View>
    );
  }

  // ─── Full-screen image viewer ─────────────────────────────────────────────────
  function ImageViewerModal({ uri, visible, onClose }: { uri: string | null; visible: boolean; onClose: () => void }) {
    const insets = useSafeAreaInsets();
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.97)' }}>
          <Pressable
            onPress={onClose}
            style={{
              position: 'absolute',
              top: insets.top + 12,
              right: 16,
              zIndex: 10,
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={20} color="#fff" strokeWidth={2.5} />
          </Pressable>
          {uri && (
            <ExpoImage
              source={{ uri }}
              style={{ flex: 1 }}
              contentFit="contain"
              transition={150}
            />
          )}
        </View>
      </Modal>
    );
  }

  // ─── Pending image bubble (shown while upload is in progress) ─────────────────
  function PendingImageBubble({ uri }: { uri: string }) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 8, marginBottom: 8 }}>
        <View style={{
          borderRadius: 18, borderBottomRightRadius: 4, overflow: 'hidden',
          backgroundColor: SURFACE2, width: SCREEN_W * 0.62, height: SCREEN_W * 0.52,
        }}>
          <ExpoImage source={{ uri }} style={{ flex: 1 }} contentFit="cover" />
          <View style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.45)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 }}>Sending…</Text>
          </View>
        </View>
      </View>
    );
  }

  // ─── Helper to convert chat member to TripPerson ──────────────────────────────
  function memberToTripPerson(m: { user?: { id?: string; name?: string | null; age?: number | null; photos?: string[] | null; profile_photo?: string | null; country?: string |
  null; city?: string | null; bio?: string | null; travel_styles?: string[] | null; places_visited?: string[] | null; languages?: string[] | null; travel_pace?: string | null;
  social_energy?: string | null; planning_style?: string | null; experience?: string | null } | null }): TripPerson {
    const user = m.user;
    return {
      userId: user?.id ?? '',
      name: user?.name ?? '',
      age: user?.age ?? 0,
      image: user?.photos?.[0] ?? user?.profile_photo ?? null,
      photos: user?.photos ?? [],
      country: user?.country ?? undefined,
      city: user?.city ?? undefined,
      bio: user?.bio ?? undefined,
      isHost: false,
      travelStyles: user?.travel_styles ?? [],
      placesVisited: user?.places_visited ?? [],
      languages: user?.languages ?? [],
      travelPace: user?.travel_pace ?? null,
      socialEnergy: user?.social_energy ?? null,
      planningStyle: user?.planning_style ?? null,
      experience: user?.experience ?? null,
    };
  }

  // ─── Trip Info Modal ───────────────────────────────────────────────────────────
  function TripInfoModal({
    visible,
    onClose,
    conversation,
  }: {
    visible: boolean;
    onClose: () => void;
    conversation: ChatMemberRow;
  }) {
    const trip = conversation.trip_chats?.trips;
    const chatId = conversation.trip_chat_id;

    const [liveMembers, setLiveMembers] = useState(conversation.trip_chats?.members ?? []);

    const tripId = trip?.id;
    const fetchMembers = useCallback(async () => {
      if (!tripId) return;
      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          user_id,
          user:users(
            id, name, age, profile_photo, photos,
            country, city, bio, travel_styles, places_visited,
            languages, travel_pace, social_energy, planning_style, experience_level
          )
        `)
        .eq('trip_id', tripId)
        .eq('status', 'in');
      if (data && !error) {
        setLiveMembers(data.map((m: any) => ({
          user_id: m.user_id,
          user: Array.isArray(m.user) ? m.user[0] : m.user,
        })));
      }
    }, [tripId]);

    useEffect(() => {
      if (visible) fetchMembers();
    }, [visible, fetchMembers]);

    useEffect(() => {
      if (!visible || !tripId) return;
      const channel = supabase
        .channel(`trip-members-live:${tripId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${tripId}` },
          () => { fetchMembers(); }
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }, [visible, tripId, fetchMembers]);

    const tripPeople: TripPerson[] = liveMembers.map((m: any) => memberToTripPerson(m));

    if (!trip) return null;

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: BG }}>
          {/* Hero Image */}
          <View style={{ height: 260 }}>
            {trip.cover_image ? (
              <Image
                source={{ uri: trip.cover_image }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: '100%', height: '100%', backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={48} color={ACCENT} strokeWidth={1.5} />
              </View>
            )}
            <LinearGradient
              colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.92)']}
              locations={[0, 0.35, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} edges={['top']}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 }}>
                <Pressable
                  onPress={onClose}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} color="#fff" strokeWidth={2.5} />
                </Pressable>
              </View>
            </SafeAreaView>
            {/* Destination */}
            <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>
                {trip.destination}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Calendar size={13} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                    {formatTripDates(trip.start_date, trip.end_date)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            {trip.description && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: TEXT2, fontSize: 14, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>ABOUT THIS TRIP</Text>
                <Text style={{ color: TEXT, fontSize: 15, lineHeight: 22 }}>{trip.description}</Text>
              </View>
            )}

            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: TEXT2, fontSize: 14, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>
                WHO'S GOING · {tripPeople.length}
              </Text>
              <TripMembersSection people={tripPeople} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ─── Trip Chat Screen ──────────────────────────────────────────────────────────
  function TripChatScreen({
    conversation,
    onBack,
    onLeft,
    onBlock,
    onReport,
  }: {
    conversation: ChatMemberRow;
    onBack: () => void;
    onLeft: () => void;
    onBlock: (conv: ChatMemberRow) => void;
    onReport: (conv: ChatMemberRow) => void;
  }) {
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState('');
    const hasScrolledOnce = useRef(false);
    const prevLastMsgIdRef = useRef<string | undefined>(undefined);
    const [showTripInfo, setShowTripInfo] = useState(false);
    const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);
    const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
    const [chatMembers, setChatMembers] = useState<Array<{ user_id: string; last_read_at: string | null; user: { id: string; name: string | null; profile_photo: string | null;
  photos: string[] | null } }>>([]);
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    // Reply state
    const [replyTo, setReplyTo] = useState<TripMessageWithSender | null>(null);

    // DM profile preview state
    const [dmProfileData, setDmProfileData] = useState<PublicProfileData | null>(null);
    const [showDmProfile, setShowDmProfile] = useState(false);

    // Message sender profile preview (tap avatar in group chat)
    const senderProfileCache = useRef<Map<string, PublicProfileData>>(new Map());
    const [senderProfileData, setSenderProfileData] = useState<PublicProfileData | null>(null);
    const [showSenderProfile, setShowSenderProfile] = useState(false);

    const chatId = conversation.trip_chat_id;

    // Paginated messages — pages[0] = most recent 50, pages[1] = older 50, etc.
    const {
      data: messagesData,
      isLoading,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
    } = useTripMessages(chatId);

    // Flatten all pages in chronological order: oldest pages first, newest last
    const messages: TripMessageWithSender[] = messagesData?.pages.slice().reverse().flat() ?? [];

    const sendMessage = useSendTripMessage();
    const sendImage = useSendImageMessage();
    const markAsRead = useMarkTripChatRead();

    // Typing presence
    const { typingNames, setTyping } = useTyping(chatId, currentUserId, currentUserName);

    // Realtime reactions
    useRealtimeReactions(chatId);
    const leaveConversation = useLeaveConversation();

    useRealtimeTripMessages(chatId);

    const trip = conversation.trip_chats?.trips;
    const chatName = conversation.trip_chats?.name ?? '';
    const isDM = !trip && chatName.startsWith('dm:');
    const dmUser = isDM ? conversation.dm_user : null;

    const displayName = isDM
      ? (dmUser?.name ?? 'Chat')
      : (trip?.destination ?? chatName);
    const displayPhoto = isDM
      ? (dmUser?.photos?.[0] ?? dmUser?.profile_photo ?? null)
      : trip?.cover_image ?? null;

    // Load current user
    useEffect(() => {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        const user = session?.user;
        if (!user) return;
        setCurrentUserId(user.id);
        const { data } = await supabase.from('users').select('name').eq('id', user.id).single();
        if (data?.name) setCurrentUserName(data.name);
      });
    }, []);

    // Mark chat as read immediately on open, and whenever new messages arrive
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
      if (chatId) {
        markAsRead.mutate(chatId);
      }
    }, [chatId, messages.length]); // markAsRead is a stable mutation ref

    // Load chat members with last_read_at for seen-by indicator
    const loadChatMembers = useCallback(async () => {
      if (!chatId) return;
      const { data } = await supabase
        .from('trip_chat_members')
        .select(`
          user_id,
          last_read_at,
          user:users(id, name, profile_photo, photos)
        `)
        .eq('trip_chat_id', chatId);
      if (data) {
        setChatMembers((data as any[]).map((m: any) => ({
          user_id: m.user_id,
          last_read_at: m.last_read_at,
          user: Array.isArray(m.user) ? m.user[0] : m.user,
        })));
      }
    }, [chatId]);

    useEffect(() => { loadChatMembers(); }, [loadChatMembers]);

    // Fetch full profile for DM partner when tapping the header avatar
    const handleOpenDmProfile = useCallback(async () => {
      if (!dmUser?.id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (dmProfileData?.id === dmUser.id) {
        setShowDmProfile(true);
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', dmUser.id)
        .single();

      if (data) {
        const profile: PublicProfileData = {
          id: data.id,
          name: data.name ?? '',
          age: data.age ?? 0,
          image: data.photos?.[0] ?? data.profile_photo ?? '',
          images: data.photos ?? [],
          country: data.country ?? '',
          city: data.city ?? '',
          bio: data.bio ?? undefined,
          fullBio: data.bio ?? undefined,
          verified: data.is_verified ?? false,
          travelStyles: data.travel_styles ?? [],
          languages: data.languages ?? [],
          placesVisited: data.places_visited ?? [],
          bucketList: data.bucket_list ?? [],
          travelPace: data.travel_pace ?? null,
          socialEnergy: data.social_energy ?? null,
          planningStyle: data.planning_style ?? null,
          experience: data.experience_level ?? null,
        };
        setDmProfileData(profile);
        setShowDmProfile(true);
      }
    }, [dmUser, dmProfileData]);

    // Tap profile pic of any sender in a group chat message
    const handleOpenSenderProfile = useCallback(async (senderId: string) => {
      if (!senderId || senderId === currentUserId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const cached = senderProfileCache.current.get(senderId);
      if (cached) {
        setSenderProfileData(cached);
        setShowSenderProfile(true);
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', senderId)
        .single();

      if (data) {
        const profile: PublicProfileData = {
          id: data.id,
          name: data.name ?? '',
          age: data.age ?? 0,
          image: data.photos?.[0] ?? data.profile_photo ?? '',
          images: data.photos ?? [],
          country: data.country ?? '',
          city: data.city ?? '',
          bio: data.bio ?? undefined,
          fullBio: data.bio ?? undefined,
          verified: data.is_verified ?? false,
          travelStyles: data.travel_styles ?? [],
          languages: data.languages ?? [],
          placesVisited: data.places_visited ?? [],
          bucketList: data.bucket_list ?? [],
          travelPace: data.travel_pace ?? null,
          socialEnergy: data.social_energy ?? null,
          planningStyle: data.planning_style ?? null,
          experience: data.experience_level ?? null,
        };
        senderProfileCache.current.set(senderId, profile);
        setSenderProfileData(profile);
        setShowSenderProfile(true);
      }
    }, [currentUserId]);

    // Scroll to end on initial message load
    const lastMsgId = messages.length > 0 ? messages[messages.length - 1]?.id : undefined;

    useEffect(() => {
      if (messages.length && !hasScrolledOnce.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
          hasScrolledOnce.current = true;
          prevLastMsgIdRef.current = lastMsgId;
        }, 100);
      }
    }, [messages.length]);

    // Scroll to end only when a NEW message arrives (not when loading older history)
    useEffect(() => {
      if (!hasScrolledOnce.current || !messages.length) return;
      if (lastMsgId && lastMsgId !== prevLastMsgIdRef.current) {
        prevLastMsgIdRef.current = lastMsgId;
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
      }
    }, [lastMsgId]);

    // Real-time subscription for DELETE events
    useEffect(() => {
      if (!chatId) return;
      const channel = supabase
        .channel(`trip-msg-deletes:${chatId}`)
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'trip_messages', filter: `trip_chat_id=eq.${chatId}` },
          (payload) => {
            const deletedId = (payload.old as any)?.id;
            if (!deletedId) return;
            queryClient.setQueryData<InfiniteData<TripMessageWithSender[]>>(
              tripChatKeys.messages(chatId),
              (old) => {
                if (!old) return old;
                return {
                  ...old,
                  pages: old.pages.map(page => page.filter(m => m.id !== deletedId)),
                };
              }
            );
          }
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }, [chatId, queryClient]);

    // Real-time subscription for trip deletion — notify members
    useEffect(() => {
      const tripId = conversation.trip_chats?.trips?.id;
      if (!tripId || isDM) return;

      const channel = supabase
        .channel(`trip-deleted:${tripId}`)
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
          () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
              'Trip Cancelled',
              `"${trip?.destination ?? 'This trip'}" has been cancelled by the host. The group chat is no longer available.`,
              [
                {
                  text: 'OK',
                  onPress: () => onBack(),
                },
              ],
              { cancelable: false }
            );
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }, [conversation.trip_chats?.trips?.id, isDM, trip?.destination, onBack]);

    const handleSend = useCallback(() => {
      const text = inputText.trim();
      if (!text || !chatId || sendMessage.isPending) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      sendMessage.mutate({ chatId, content: text, type: 'text', replyToId: replyTo?.id ?? null });
      setInputText('');
      setReplyTo(null);
      setTyping(false);
      setTimeout(loadChatMembers, 1000);
    }, [inputText, chatId, sendMessage, loadChatMembers, replyTo, setTyping]);

    const handlePickImage = useCallback(async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos to send images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPendingImageUri(uri);
      setReplyTo(null);
      sendImage.mutate(
        { chatId, uri, replyToId: replyTo?.id ?? null },
        {
          onSuccess: () => setPendingImageUri(null),
          onError: () => {
            setPendingImageUri(null);
            Alert.alert('Upload failed', 'Could not send image. Please try again.');
          },
        }
      );
      setTimeout(loadChatMembers, 1000);
    }, [chatId, sendImage, replyTo, loadChatMembers]);

    const handleDeleteMessage = useCallback((msg: TripMessageWithSender) => {
      if (msg.sender_id !== currentUserId) return;

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Delete for Everyone'],
            cancelButtonIndex: 0,
            destructiveButtonIndex: 1,
            title: 'Delete this message?',
            message: 'This will remove the message for all members.',
          },
          async (buttonIndex) => {
            if (buttonIndex === 1) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const { error } = await supabase
                .from('trip_messages')
                .delete()
                .eq('id', msg.id)
                .eq('sender_id', currentUserId);
              if (!error) {
                queryClient.setQueryData<InfiniteData<TripMessageWithSender[]>>(
                  tripChatKeys.messages(chatId),
                  (old) => {
                    if (!old) return old;
                    return {
                      ...old,
                      pages: old.pages.map(page => page.filter(m => m.id !== msg.id)),
                    };
                  }
                );
              }
            }
          }
        );
      } else {
        Alert.alert(
          'Delete Message',
          'This will remove the message for all members.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete for Everyone',
              style: 'destructive',
              onPress: async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const { error } = await supabase
                  .from('trip_messages')
                  .delete()
                  .eq('id', msg.id)
                  .eq('sender_id', currentUserId);
                if (!error) {
                  queryClient.setQueryData<InfiniteData<TripMessageWithSender[]>>(
                    tripChatKeys.messages(chatId),
                    (old) => {
                      if (!old) return old;
                      return {
                        ...old,
                        pages: old.pages.map(page => page.filter(m => m.id !== msg.id)),
                      };
                    }
                  );
                }
              },
            },
          ]
        );
      }
    }, [currentUserId, chatId, queryClient]);

    const handleLeaveGroupchat = useCallback(() => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Leave Groupchat'],
            cancelButtonIndex: 0,
            destructiveButtonIndex: 1,
            title: 'Leave this groupchat?',
            message: 'You will no longer be able to see messages from this trip group.',
          },
          async (buttonIndex) => {
            if (buttonIndex === 1) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              leaveConversation.mutate(chatId, {
                onSuccess: () => {
                  onLeft();
                },
              });
            }
          }
        );
      } else {
        Alert.alert(
          'Leave Groupchat',
          'You will no longer be able to see messages from this trip group.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                leaveConversation.mutate(chatId, {
                  onSuccess: () => {
                    onLeft();
                  },
                });
              },
            },
          ]
        );
      }
    }, [chatId, leaveConversation, onLeft]);

    const handleMoreOptions = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const isDM = !conversation.trip_chats?.trips && (conversation.trip_chats?.name ?? '').startsWith('dm:');
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: isDM
              ? ['Cancel', 'Block', 'Report', 'Leave Chat']
              : ['Cancel', 'Report', 'Leave Groupchat'],
            cancelButtonIndex: 0,
            destructiveButtonIndex: isDM ? 1 : 2,
          },
          (buttonIndex) => {
            if (isDM) {
              if (buttonIndex === 1) onBlock(conversation);
              if (buttonIndex === 2) onReport(conversation);
              if (buttonIndex === 3) handleLeaveGroupchat();
            } else {
              if (buttonIndex === 1) onReport(conversation);
              if (buttonIndex === 2) handleLeaveGroupchat();
            }
          }
        );
      } else {
        Alert.alert('Options', '', [
          { text: 'Cancel', style: 'cancel' },
          ...(isDM ? [{ text: 'Block', style: 'destructive' as const, onPress: () => onBlock(conversation) }] : []),
          { text: 'Report', onPress: () => onReport(conversation) },
          { text: isDM ? 'Leave Chat' : 'Leave Groupchat', style: 'destructive' as const, onPress: handleLeaveGroupchat },
        ]);
      }
    }, [handleLeaveGroupchat, conversation, onBlock, onReport]);

    // Load older messages when user scrolls near the top
    const handleScroll = useCallback((event: any) => {
      const y = event.nativeEvent.contentOffset.y;
      if (y < 120 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const memberCount = chatMembers.length;

    // Compute who has seen the last message sent by me
    const myMessages = messages.filter(m => m.sender_id === currentUserId);
    const lastMyMsg = myMessages.length > 0 ? myMessages[myMessages.length - 1] : null;
    const seenByMembers = lastMyMsg
      ? chatMembers
          .filter(m => m.user_id !== currentUserId && m.last_read_at && m.last_read_at >= lastMyMsg.created_at)
          .map(m => ({ name: m.user?.name ?? null, photo: m.user?.photos?.[0] ?? m.user?.profile_photo ?? null }))
      : [];

    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        {/* ── iOS-style Nav Header ── */}
        <View style={{
          backgroundColor: BG,
          borderBottomWidth: 0.5,
          borderBottomColor: SEP,
          paddingTop: insets.top,
        }}>
          <View style={{
            height: 60,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
          }}>
            {/* Left — back button */}
            <Pressable
              onPress={onBack}
              hitSlop={10}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingHorizontal: 4,
                paddingVertical: 8,
                opacity: pressed ? 0.5 : 1,
                minWidth: 72,
              })}
            >
              <ChevronLeft size={28} color={UNREAD_DOT} strokeWidth={2} />
              <Text style={{ color: UNREAD_DOT, fontSize: 17, fontWeight: '400' }}>Back</Text>
            </Pressable>

            {/* Center — tappable display image + name */}
            <Pressable
              onPress={() => {
                if (isDM) {
                  handleOpenDmProfile();
                } else {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowTripInfo(true);
                }
              }}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {displayPhoto ? (
                <Image
                  source={{ uri: displayPhoto }}
                  style={{ width: 38, height: 38, borderRadius: 19, marginBottom: 3 }}
                  resizeMode="cover"
                />
              ) : isDM ? (
                <Avatar name={displayName} size={38} />
              ) : (
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center', marginBottom: 3 }}>
                  <MapPin size={16} color={ACCENT} strokeWidth={2} />
                </View>
              )}
              <Text style={{ color: TEXT, fontSize: 13, fontWeight: '700', letterSpacing: -0.1, textAlign: 'center' }} numberOfLines={1}>
                {displayName}
              </Text>
            </Pressable>

            {/* Right — 3-dot menu */}
            <Pressable
              onPress={handleMoreOptions}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 72,
                alignItems: 'flex-end',
                paddingHorizontal: 8,
                paddingVertical: 8,
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <MoreVertical size={22} color={TEXT2} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={ACCENT} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={m => m.id}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 8, flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              ListHeaderComponent={
                isFetchingNextPage ? (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={ACCENT} />
                  </View>
                ) : null
              }
              renderItem={({ item, index }) => {
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const showDateAbove = !prevMsg ||
                  new Date(prevMsg.created_at).toDateString() !== new Date(item.created_at).toDateString();

                // System messages render as centered pills, not bubbles
                if (item.type === 'system') {
                  return (
                    <View>
                      {showDateAbove && <DateSeparator dateString={item.created_at} />}
                      <View style={{ alignItems: 'center', marginVertical: 6, paddingHorizontal: 24 }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 }}>
                          <Text style={{ color: TEXT2, fontSize: 12, fontWeight: '500', textAlign: 'center' }}>
                            {item.content}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                }

                const isMe = item.sender_id === currentUserId;
                const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
                const isLastInGroup = !nextMsg || nextMsg.sender_id !== item.sender_id || nextMsg.type === 'system';
                const isFirstInGroup = !prevMsg || prevMsg.sender_id !== item.sender_id || prevMsg.type === 'system';
                const isLastMyMessage = isMe && item.id === lastMyMsg?.id;

                return (
                  <MessageBubble
                    msg={item} isMe={isMe}
                    showAvatar={isLastInGroup} showName={!isMe}
                    showDateAbove={showDateAbove}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    isLastMessage={isLastMyMessage}
                    seenByMembers={isLastMyMessage ? seenByMembers : []}
                    currentUserId={currentUserId}
                    chatId={chatId}
                    onReply={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setReplyTo(item); }}
                    onDelete={() => handleDeleteMessage(item)}
                    onImagePress={(uri) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewingImageUri(uri); }}
                    onAvatarPress={() => {
                      if (isDM) handleOpenDmProfile();
                      else handleOpenSenderProfile(item.sender_id);
                    }}
                  />
                );
              }}
              ListFooterComponent={
                <>
                  {pendingImageUri && <PendingImageBubble uri={pendingImageUri} />}
                  {typingNames.length > 0 && <TypingIndicator names={typingNames} />}
                </>
              }
              ListEmptyComponent={
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
                  <Animated.View entering={FadeIn.delay(200)} style={{ alignItems: 'center' }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Send size={28} color={ACCENT} strokeWidth={1.8} />
                    </View>
                    <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
                      Start the conversation
                    </Text>
                    <Text style={{ color: TEXT2, fontSize: 14, textAlign: 'center', lineHeight: 21 }}>
                      Say hi to your fellow travelers and start planning your trip together!
                    </Text>
                  </Animated.View>
                </View>
              }
            />
          )}

          <View style={{ borderTopWidth: 0.5, borderTopColor: SEP, backgroundColor: BG }}>
            {/* Reply preview strip */}
            {replyTo && (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 10 }}>
                <Reply size={14} color={BUBBLE_ME} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: BUBBLE_ME, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
                    {replyTo.sender?.name?.split(' ')[0] ?? ''}
                  </Text>
                  <Text style={{ color: TEXT2, fontSize: 13 }} numberOfLines={1}>{replyTo.content}</Text>
                </View>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={10}>
                  <X size={16} color={TEXT3} strokeWidth={2} />
                </Pressable>
              </View>
            )}
            <View style={{
              paddingHorizontal: 12, paddingTop: 10,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
              flexDirection: 'row', alignItems: 'flex-end', gap: 8,
            }}>
              {/* Photo button */}
              <Pressable
                onPress={handlePickImage}
                disabled={sendImage.isPending}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center' }}
              >
                {sendImage.isPending
                  ? <ActivityIndicator size="small" color={TEXT3} />
                  : <ImageIcon size={17} color={TEXT2} strokeWidth={2} />}
              </Pressable>
              <View style={{
                flex: 1, backgroundColor: SURFACE, borderRadius: 20,
                borderWidth: 0.5, borderColor: SEP,
                paddingHorizontal: 14,
                paddingVertical: Platform.OS === 'ios' ? 10 : 8,
                minHeight: 40, justifyContent: 'center',
              }}>
                <TextInput
                  value={inputText}
                  onChangeText={(t) => {
                    setInputText(t);
                    setTyping(t.length > 0);
                  }}
                  placeholder="Message..."
                  placeholderTextColor={TEXT3}
                  style={{ color: TEXT, fontSize: 16, maxHeight: 100, lineHeight: 22 }}
                  multiline
                  returnKeyType="default"
                  onSubmitEditing={inputText.trim() ? handleSend : undefined}
                />
              </View>
              <SendButton active={!!inputText.trim()} onPress={handleSend} loading={sendMessage.isPending} />
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Trip Info Modal */}
        <TripInfoModal
          visible={showTripInfo}
          onClose={() => setShowTripInfo(false)}
          conversation={conversation}
        />

        {/* DM — Full profile view */}
        {isDM && (
          <UserProfileModal
            userId={dmProfileData?.id ?? null}
            visible={showDmProfile}
            onClose={() => setShowDmProfile(false)}
          />
        )}

        {/* Group chat — sender profile preview */}
        {!isDM && (
          <UserProfileModal
            userId={senderProfileData?.id ?? null}
            visible={showSenderProfile}
            onClose={() => setShowSenderProfile(false)}
          />
        )}

        {/* Full-screen image viewer */}
        <ImageViewerModal
          uri={viewingImageUri}
          visible={!!viewingImageUri}
          onClose={() => setViewingImageUri(null)}
        />
      </View>
    );
  }

  // ─── Conversation row — iMessage-style ───────────────────────────────────────
  function ConversationRow({ conversation, onPress, onBlock, onReport, onDelete, index, currentUserId }: { conversation: ChatMemberRow; onPress: () => void; onBlock: (conv: ChatMemberRow) => void;
  onReport: (conv: ChatMemberRow) => void; onDelete: (conv: ChatMemberRow) => void; index: number; currentUserId: string | null }) {
    const pinConversation = usePinConversation();
    const muteConversation = useMuteConversation();

    const trip = conversation.trip_chats?.trips;
    const chatName = conversation.trip_chats?.name ?? '';
    const members = conversation.trip_chats?.members ?? [];
    const unreadCount = conversation.unread_count ?? 0;
    const lastTime = conversation.last_message_at ?? conversation.trip_chats?.created_at;
    const isPinned = conversation.is_pinned;
    const isMuted = conversation.is_muted;

    const isDM = !trip && chatName.startsWith('dm:');
    const dmUser = isDM ? conversation.dm_user : null;

    const rowTitle = isDM ? (dmUser?.name ?? 'User') : (trip?.destination ?? chatName);
    const coverPhoto = isDM
      ? (dmUser?.photos?.[0] ?? dmUser?.profile_photo ?? null)
      : trip?.cover_image ?? null;

    const topMembers = members.slice(0, 3);

    // Last message preview — "You: …" if sent by me, else plain content
    const lastContent = conversation.last_message_content;
    const lastSenderId = conversation.last_message_sender_id;
    const isMyLastMessage = lastSenderId === currentUserId;
    const lastIsImage = lastContent?.startsWith('http') && lastContent?.includes('chat-images');
    const messagePreview = lastContent
      ? (lastIsImage ? (isMyLastMessage ? 'You sent a photo 📷' : 'Sent a photo 📷') : (isMyLastMessage ? `You: ${lastContent}` : lastContent))
      : null;

    const renderRightActions = () => (
      <Pressable
        onPress={() => onDelete(conversation)}
        style={{ backgroundColor: DANGER, width: 80, justifyContent: 'center', alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Delete</Text>
      </Pressable>
    );

    return (
      <Animated.View entering={FadeInRight.delay(index * 40).springify()}>
        <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
        <ContextMenu.Root>
          <ContextMenu.Trigger>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: pressed ? 'rgba(255,255,255,0.04)' : 'transparent',
          })}
        >
          {/* Avatar — circular, 56px */}
          <View style={{ marginRight: 12 }}>
            {coverPhoto ? (
              <Image
                source={{ uri: coverPhoto }}
                style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: SURFACE2 }}
                resizeMode="cover"
              />
            ) : isDM ? (
              <Avatar name={dmUser?.name ?? 'U'} size={60} />
            ) : (
              <View style={{
                width: 60, height: 60, borderRadius: 30,
                backgroundColor: SURFACE2,
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {topMembers.length >= 2 ? (
                  <View style={{ width: 60, height: 60, flexDirection: 'row', flexWrap: 'wrap' }}>
                    {topMembers.slice(0, 4).map((m, i) => {
                      const photo = m.user?.photos?.[0] || m.user?.profile_photo;
                      const name = m.user?.name ?? 'T';
                      const isOdd = topMembers.length === 3 && i === 2;
                      return (
                        <View key={i} style={{ width: isOdd ? 56 : 28, height: 28 }}>
                          {photo ? (
                            <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          ) : (
                            <LinearGradient
                              colors={getAvatarColors(name)}
                              style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                                {(name?.charAt(0) || '?').toUpperCase()}
                              </Text>
                            </LinearGradient>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : topMembers.length === 1 ? (
                  <Avatar name={topMembers[0]?.user?.name ?? 'T'} photo={topMembers[0]?.user?.photos?.[0] || topMembers[0]?.user?.profile_photo} size={60} />
                ) : (
                  <MapPin size={22} color={ACCENT} strokeWidth={1.8} />
                )}
              </View>
            )}

            {/* Unread dot */}
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                bottom: 0, right: 0,
                width: 16, height: 16, borderRadius: 8,
                backgroundColor: UNREAD_DOT,
                borderWidth: 2.5, borderColor: BG,
              }} />
            )}
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {isPinned && <Pin size={11} color={TEXT3} strokeWidth={2} />}
                <Text
                  style={{
                    color: TEXT,
                    fontSize: 16,
                    fontWeight: unreadCount > 0 ? '700' : '600',
                    letterSpacing: -0.3,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {rowTitle}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                {isMuted && <BellOff size={12} color={TEXT3} strokeWidth={2} />}
                <Text style={{ color: TEXT3, fontSize: 13 }}>
                  {formatTime(lastTime)}
                </Text>
                {unreadCount > 0 && !isMuted && (
                  <View style={{
                    backgroundColor: UNREAD_DOT,
                    borderRadius: 10,
                    minWidth: 20, height: 20,
                    paddingHorizontal: 6,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text
              style={{
                color: unreadCount > 0 && !isMuted ? TEXT : TEXT2,
                fontSize: 15,
                fontWeight: unreadCount > 0 && !isMuted ? '500' : '400',
                lineHeight: 20,
              }}
              numberOfLines={2}
            >
              {messagePreview ?? (isDM ? 'Start a conversation' : 'Start chatting with your crew')}
            </Text>
          </View>
        </Pressable>
          </ContextMenu.Trigger>

          <ContextMenu.Content>
            <ContextMenu.Item key="pin" onSelect={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              pinConversation.mutate({ chatId: conversation.trip_chat_id, pinned: !isPinned });
            }}>
              <ContextMenu.ItemTitle>{isPinned ? 'Unpin' : 'Pin'}</ContextMenu.ItemTitle>
              <ContextMenu.ItemIcon ios={{ name: isPinned ? 'pin.slash' : 'pin', pointSize: 16 }} />
            </ContextMenu.Item>
            <ContextMenu.Item key="mute" onSelect={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              muteConversation.mutate({ chatId: conversation.trip_chat_id, muted: !isMuted });
            }}>
              <ContextMenu.ItemTitle>{isMuted ? 'Unmute' : 'Mute'}</ContextMenu.ItemTitle>
              <ContextMenu.ItemIcon ios={{ name: isMuted ? 'bell' : 'bell.slash', pointSize: 16 }} />
            </ContextMenu.Item>
            <ContextMenu.Separator />
            {isDM && (
              <ContextMenu.Item key="block" destructive onSelect={() => onBlock(conversation)}>
                <ContextMenu.ItemTitle>Block</ContextMenu.ItemTitle>
                <ContextMenu.ItemIcon ios={{ name: 'hand.raised', pointSize: 16 }} />
              </ContextMenu.Item>
            )}
            <ContextMenu.Item key="report" onSelect={() => onReport(conversation)}>
              <ContextMenu.ItemTitle>Report</ContextMenu.ItemTitle>
              <ContextMenu.ItemIcon ios={{ name: 'flag', pointSize: 16 }} />
            </ContextMenu.Item>
            <ContextMenu.Item key="delete" destructive onSelect={() => onDelete(conversation)}>
              <ContextMenu.ItemTitle>Delete</ContextMenu.ItemTitle>
              <ContextMenu.ItemIcon ios={{ name: 'trash', pointSize: 16 }} />
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
        </Swipeable>
      </Animated.View>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────────────
  function EmptyState() {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
        <Animated.View entering={FadeInUp.delay(150).springify()} style={{ alignItems: 'center' }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: SURFACE2, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Users size={36} color={ACCENT} strokeWidth={1.6} />
          </View>
          <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.3, marginBottom: 10, textAlign: 'center' }}>
            No chats yet
          </Text>
          <Text style={{ color: TEXT2, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            Join a trip to start chatting with fellow travelers. Swipe right on trips you like!
          </Text>
        </Animated.View>
      </View>
    );
  }

  // ─── Main Messages Screen ─────────────────────────────────────────────────────
  // ─── Report Modal ─────────────────────────────────────────────────────────────
  const REPORT_REASONS = [
    'Spam or scam',
    'Inappropriate content',
    'Harassment or bullying',
    'Fake profile',
    'Hate speech',
    'Other',
  ];

  function ReportModal({
    visible,
    targetName,
    onSubmit,
    onClose,
    submitting,
  }: {
    visible: boolean;
    targetName: string;
    onSubmit: (reason: string) => void;
    onClose: () => void;
    submitting: boolean;
  }) {
    const [selected, setSelected] = useState<string | null>(null);

    const handleClose = () => {
      setSelected(null);
      onClose();
    };

    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={handleClose}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: '#111',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 24, paddingBottom: 40,
            }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 }} />
              <Text style={{ color: TEXT, fontSize: 18, fontWeight: '800', letterSpacing: -0.4, marginBottom: 4 }}>
                Report
              </Text>
              <Text style={{ color: TEXT2, fontSize: 14, marginBottom: 20 }}>
                Why are you reporting {targetName}?
              </Text>
              {REPORT_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setSelected(reason)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14,
                    marginBottom: 8,
                    backgroundColor: selected === reason ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: selected === reason ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.07)',
                  }}
                >
                  <Text style={{ color: TEXT, fontSize: 15, fontWeight: selected === reason ? '700' : '500' }}>
                    {reason}
                  </Text>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selected === reason ? ACCENT : 'rgba(255,255,255,0.2)',
                    backgroundColor: selected === reason ? ACCENT : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected === reason && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                    )}
                  </View>
                </Pressable>
              ))}
              <Pressable
                onPress={() => { if (selected) onSubmit(selected); }}
                disabled={!selected || submitting}
                style={{
                  marginTop: 8, borderRadius: 16, paddingVertical: 16,
                  backgroundColor: selected && !submitting ? ACCENT : 'rgba(255,255,255,0.08)',
                  alignItems: 'center',
                }}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: selected ? '#fff' : TEXT3, fontSize: 16, fontWeight: '800' }}>Submit Report</Text>
                }
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  export default function MessagesScreen() {
    const [selectedConversation, setSelectedConversation] = useState<ChatMemberRow | null>(null);
    const [showChatModal, setShowChatModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hiddenChatIds, setHiddenChatIds] = useState<Set<string>>(new Set());
    const [showReport, setShowReport] = useState(false);
    const [reportTarget, setReportTarget] = useState<{ chatId: string; name: string; userId?: string; tripId?: string } | null>(null);
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { newTrip } = useLocalSearchParams<{ newTrip?: string }>();
    const [showJoinBanner, setShowJoinBanner] = useState<boolean>(false);

    useEffect(() => {
      if (newTrip) {
        setShowJoinBanner(true);
        const t = setTimeout(() => setShowJoinBanner(false), 3500);
        return () => clearTimeout(t);
      }
    }, [newTrip]);

    const { data: conversations, isLoading, refetch } = useConversations();

    useRealtimeConversations();

    const tripIdsKey = (conversations ?? [])
      .map(c => c.trip_chats?.trips?.id)
      .filter(Boolean)
      .sort()
      .join(',');

    useEffect(() => {
      if (!tripIdsKey) return;

      const channel = supabase
        .channel(`trips-deleted-list:${tripIdsKey}`)
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'trips' },
          (payload) => {
            const deletedTripId = (payload.old as any)?.id;
            if (!deletedTripId) return;
            const matchingConv = (conversations ?? []).find(
              c => c.trip_chats?.trips?.id === deletedTripId
            );
            if (matchingConv) {
              setHiddenChatIds(prev => new Set([...prev, matchingConv.trip_chat_id]));
              const dest = matchingConv.trip_chats?.trips?.destination ?? 'A trip';
              Alert.alert(
                'Trip Cancelled',
                `"${dest}" has been cancelled by the host and removed from your chats.`
              );
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripIdsKey]);

    useEffect(() => {
      const loadBlocks = async () => {
        const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
        if (!user) return;
        setCurrentUserId(user.id);
        const { data: blocks } = await supabase
          .from('user_blocks')
          .select('blocked_id')
          .eq('blocker_id', user.id);
        if (blocks && blocks.length > 0) {
          // We'll match these against dm_user ids when filtering conversations
        }
      };
      loadBlocks();
    }, []);

    useFocusEffect(
      useCallback(() => {
        refetch();
      }, [refetch])
    );

    const visibleConversations = (conversations ?? []).filter(c => !hiddenChatIds.has(c.trip_chat_id));

    const filteredConversations = searchQuery.trim()
      ? visibleConversations.filter(c => {
          const isDMRow = !c.trip_chats?.trips && (c.trip_chats?.name ?? '').startsWith('dm:');
          const name = isDMRow
            ? (c.dm_user?.name ?? '')
            : (c.trip_chats?.trips?.destination ?? c.trip_chats?.name ?? '');
          return name.toLowerCase().includes(searchQuery.toLowerCase());
        })
      : visibleConversations;

    const handleBlock = useCallback(async (conv: ChatMemberRow) => {
      const isDM = !conv.trip_chats?.trips && (conv.trip_chats?.name ?? '').startsWith('dm:');
      const targetUserId = isDM ? conv.dm_user?.id : null;
      const targetName = isDM ? (conv.dm_user?.name ?? 'this user') : (conv.trip_chats?.trips?.destination ?? 'this chat');

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Alert.alert(
        'Block ' + targetName + '?',
        isDM
          ? "They won't be able to message you and will disappear from your chats."
          : 'This trip chat will be removed from your messages.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setHiddenChatIds(prev => new Set([...prev, conv.trip_chat_id]));
              if (targetUserId && currentUserId) {
                await supabase.from('user_blocks').upsert({
                  blocker_id: currentUserId,
                  blocked_id: targetUserId,
                  created_at: new Date().toISOString(),
                }, { onConflict: 'blocker_id,blocked_id' });
              }
            },
          },
        ]
      );
    }, [currentUserId]);

    const handleOpenReport = useCallback((conv: ChatMemberRow) => {
      const isDM = !conv.trip_chats?.trips && (conv.trip_chats?.name ?? '').startsWith('dm:');
      const name = isDM ? (conv.dm_user?.name ?? 'this user') : (conv.trip_chats?.trips?.destination ?? 'this chat');
      setReportTarget({
        chatId: conv.trip_chat_id,
        name,
        userId: isDM ? conv.dm_user?.id : undefined,
        tripId: conv.trip_chats?.trips?.id ?? undefined,
      });
      setShowReport(true);
    }, []);

    const handleSubmitReport = useCallback(async (reason: string) => {
      if (!reportTarget || !currentUserId) return;
      setReportSubmitting(true);
      try {
        await supabase.from('user_reports').insert({
          reporter_id: currentUserId,
          reported_user_id: reportTarget.userId ?? null,
          reported_trip_id: reportTarget.tripId ?? null,
          reason,
          created_at: new Date().toISOString(),
        });
        setHiddenChatIds(prev => new Set([...prev, reportTarget.chatId]));
        setShowReport(false);
        setReportTarget(null);
        Alert.alert('Report submitted', "Thank you. We'll review this and take action if needed.");
      } catch (e) {
        Alert.alert('Error', 'Failed to submit report. Please try again.');
      } finally {
        setReportSubmitting(false);
      }
    }, [reportTarget, currentUserId]);

    const handleDeleteConversation = useCallback((conv: ChatMemberRow) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert('Delete Chat', 'Remove this chat from your list?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => setHiddenChatIds(prev => new Set([...prev, conv.trip_chat_id])),
        },
      ]);
    }, []);

    const handleOpenChat = useCallback((conv: ChatMemberRow) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedConversation(conv);
      setShowChatModal(true);
    }, []);

    const handleBack = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowChatModal(false);
      refetch();
      setTimeout(() => {
        setSelectedConversation(null);
      }, 300);
    }, [refetch]);

    const handleLeft = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowChatModal(false);
      setTimeout(() => {
        setSelectedConversation(null);
        refetch();
      }, 300);
    }, [refetch]);

    const handleBlockFromChat = useCallback((conv: ChatMemberRow) => {
      setShowChatModal(false);
      setTimeout(() => handleBlock(conv), 350);
    }, [handleBlock]);

    const handleReportFromChat = useCallback((conv: ChatMemberRow) => {
      setShowChatModal(false);
      setTimeout(() => handleOpenReport(conv), 350);
    }, [handleOpenReport]);

    const onRefresh = useCallback(async () => {
      setRefreshing(true);
      await refetch();
      setRefreshing(false);
    }, [refetch]);

    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Header */}
          <Animated.View entering={FadeInDown.springify()} style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 }}>
            <Text style={{ color: TEXT, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 }}>
              Messages
            </Text>

            {/* Search bar */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: SURFACE2,
              borderRadius: 14,
              paddingHorizontal: 12, paddingVertical: 10,
              marginTop: 12,
              gap: 8,
            }}>
              <Search size={16} color={TEXT3} strokeWidth={2} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search conversations…"
                placeholderTextColor={TEXT3}
                style={{ flex: 1, color: TEXT, fontSize: 15 }}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
          </Animated.View>

          {/* Divider */}
          <View style={{ height: 0.5, backgroundColor: SEP }} />

          {/* New trip join banner */}
          {showJoinBanner && newTrip && (
            <Animated.View
              entering={FadeInDown.springify().damping(18)}
              style={{
                marginHorizontal: 16,
                marginTop: 10,
                marginBottom: 2,
                backgroundColor: '#F0EBE3',
                borderRadius: 16,
                paddingVertical: 12,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 20 }}>👋</Text>
              <Text style={{ flex: 1, color: '#000', fontSize: 13, fontFamily: 'Outfit-SemiBold', fontWeight: '600', letterSpacing: -0.1 }}>
                You just joined {decodeURIComponent(newTrip)} Trip! Say hi to your crew.
              </Text>
            </Animated.View>
          )}

          {isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={ACCENT} />
            </View>
          ) : filteredConversations.length === 0 ? (
            <EmptyState />
          ) : (
            <FlatList
              data={filteredConversations}
              keyExtractor={c => c.trip_chat_id}
              renderItem={({ item, index }) => (
                <ConversationRow
                  conversation={item}
                  onPress={() => handleOpenChat(item)}
                  onBlock={handleBlock}
                  onReport={handleOpenReport}
                  onDelete={handleDeleteConversation}
                  index={index}
                  currentUserId={currentUserId}
                />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              ItemSeparatorComponent={() => (
                <View style={{ height: 0.5, backgroundColor: SEP, marginLeft: 84 }} />
              )}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
              }
            />
          )}
        </SafeAreaView>

        {/* Full-screen chat modal */}
        <Modal
          visible={showChatModal}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={handleBack}
        >
          {selectedConversation && (
            <TripChatScreen
              conversation={selectedConversation}
              onBack={handleBack}
              onLeft={handleLeft}
              onBlock={handleBlockFromChat}
              onReport={handleReportFromChat}
            />
          )}
        </Modal>

        {/* Report modal */}
        <ReportModal
          visible={showReport}
          targetName={reportTarget?.name ?? ''}
          onSubmit={handleSubmitReport}
          onClose={() => { setShowReport(false); setReportTarget(null); }}
          submitting={reportSubmitting}
        />
      </View>
    );
  }

