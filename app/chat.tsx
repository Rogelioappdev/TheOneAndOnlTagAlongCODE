import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_W } = Dimensions.get('window');

const ACCENT = '#4a9d6e';
const BG = '#0a0d0b';
const SURFACE = '#141916';
const SURFACE2 = '#1c211e';
const BORDER = 'rgba(255,255,255,0.06)';
const TEXT = '#f5f5f0';
const MUTED = '#6b7566';
const MUTED2 = '#9ca396';

// ─── iMessage bubble palette ──────────────────────────────────
const BUBBLE_SENT     = '#0A84FF';  // iOS blue
const BUBBLE_RECEIVED = '#E5E5EA';  // iOS light grey
const TEXT_SENT       = '#FFFFFF';
const TEXT_RECEIVED   = '#000000';
const R = 22;  // base corner radius
const r = 6;   // tail corner (last bubble in group)

type Message = {
  id: string;
  trip_chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  type: 'text' | 'image' | 'system';
  sender_name: string | null;
  sender_photo: string | null;
};

function DateSeparator({ isoString }: { isoString: string }) {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  let label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  if (date.toDateString() === today.toDateString()) label = 'Today';
  else if (date.toDateString() === yesterday.toDateString()) label = 'Yesterday';
  return (
    <View style={{ alignItems: 'center', marginVertical: 14 }}>
      <View style={{ backgroundColor: SURFACE2, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 }}>
        <Text style={{ color: MUTED, fontSize: 12, fontWeight: '500' }}>{label}</Text>
      </View>
    </View>
  );
}

// Centered pill for system events — "Alex joined the trip", "Alex left the trip"
function SystemMessage({ content }: { content: string }) {
  return (
    <View style={{ alignItems: 'center', marginVertical: 8, paddingHorizontal: 24 }}>
      <View style={{
        backgroundColor: 'rgba(255,255,255,0.07)',
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 20,
      }}>
        <Text style={{ color: MUTED2, fontSize: 12, fontWeight: '500', textAlign: 'center' }}>
          {content}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// MessageBubble — iMessage-style
//
// Grouping rules (mirrors native iOS Messages):
//   isFirst  = first bubble in a run of same-sender messages
//   isLast   = last  bubble in a run of same-sender messages
//
// Corner radius geometry:
//   Sent   isLast  → bottom-right = r (tail), all others = R
//   Sent   !isLast → top-right    = R-6 (slight tuck)
//   Recv   isLast  → bottom-left  = r (tail), all others = R
//   Recv   !isLast → top-left     = R-6 (slight tuck)
//   Single bubble  → all corners  = R
// ─────────────────────────────────────────────────────────────
function MessageBubble({
  item,
  isCurrentUser,
  isFirst,
  isLast,
  showSenderName,
  prevItem,
}: {
  item: Message;
  isCurrentUser: boolean;
  isFirst: boolean;
  isLast: boolean;
  showSenderName: boolean;
  prevItem: Message | null;
}) {
  const showDate = !prevItem ||
    new Date(prevItem.created_at).toDateString() !== new Date(item.created_at).toDateString();

  // ── Corner radius per iMessage geometry ──
  const borderRadius = isCurrentUser
    ? {
        borderTopLeftRadius: R,
        borderTopRightRadius: isFirst && !isLast ? R - 6 : R,
        borderBottomRightRadius: isLast ? r : R - 6,
        borderBottomLeftRadius: R,
      }
    : {
        borderTopLeftRadius: isFirst && !isLast ? R - 6 : R,
        borderTopRightRadius: R,
        borderBottomRightRadius: R,
        borderBottomLeftRadius: isLast ? r : R - 6,
      };

  // ── Vertical spacing: tight within a group, roomier between groups ──
  const marginBottom = isLast ? 8 : 2;

  const bubbleBg   = isCurrentUser ? BUBBLE_SENT : BUBBLE_RECEIVED;
  const bubbleText = isCurrentUser ? TEXT_SENT   : TEXT_RECEIVED;
  const timeColor  = isCurrentUser ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.40)';

  return (
    <View>
      {showDate && <DateSeparator isoString={item.created_at} />}

      {/* Sender name — only on first bubble of a received group */}
      {showSenderName && (
        <Text style={{
          color: MUTED2,
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 3,
          marginLeft: 44,
          alignSelf: 'flex-start',
        }}>
          {item.sender_name ?? 'Traveler'}
        </Text>
      )}

      <View style={{
        flexDirection: isCurrentUser ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        marginBottom,
        paddingHorizontal: 8,
      }}>

        {/* Avatar — received messages only, shown on last bubble of group */}
        {!isCurrentUser && (
          isLast ? (
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              overflow: 'hidden',
              marginRight: 8,
              marginBottom: 2,
              flexShrink: 0,
            }}>
              {item.sender_photo ? (
                <Image
                  source={{ uri: item.sender_photo }}
                  style={{ width: 28, height: 28 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{
                  flex: 1,
                  backgroundColor: '#555',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                    {(item.sender_name ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            // Spacer keeps bubbles aligned when avatar is hidden
            <View style={{ width: 28, marginRight: 8 }} />
          )
        )}

        {/* Bubble */}
        <View style={{
          maxWidth: SCREEN_W * 0.75,
          backgroundColor: bubbleBg,
          paddingHorizontal: 16,
          paddingVertical: 10,
          ...borderRadius,
        }}>
          <Text style={{
            color: bubbleText,
            fontSize: 16,
            lineHeight: 22,
            letterSpacing: -0.1,
          }}>
            {item.content}
          </Text>

          {/* Timestamp — shown only on last bubble of each group */}
          {isLast && (
            <Text style={{
              color: timeColor,
              fontSize: 11,
              marginTop: 4,
              textAlign: isCurrentUser ? 'right' : 'left',
            }}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { chatId, tripName } = useLocalSearchParams<{ chatId: string; tripName: string }>();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const hasScrolled = useRef(false);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    const { data, error } = await supabase
      .from('trip_messages')
      .select(`
        id, trip_chat_id, sender_id, content, created_at,
        sender:users(name, profile_photo, photos)
      `)
      .eq('trip_chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) { console.error('[ChatScreen] load error:', error.message); return; }

    const mapped: Message[] = (data ?? []).map((m: any) => {
      const user = Array.isArray(m.sender) ? m.sender[0] : m.sender;
      return {
        id: m.id,
        trip_chat_id: m.trip_chat_id,
        sender_id: m.sender_id,
        content: m.content,
        created_at: m.created_at,
        type: m.type ?? 'text',
        sender_name: user?.name ?? null,
        sender_photo: user?.photos?.[0] ?? user?.profile_photo ?? null,
      };
    });

    setMessages(mapped);
    setIsLoading(false);
  }, [chatId]);

  // Get current user + member count
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (user) setCurrentUserId(user.id);
    });

    if (chatId) {
      supabase
        .from('trip_chat_members')
        .select('*', { count: 'exact', head: true })
        .eq('trip_chat_id', chatId)
        .then(({ count }) => setMemberCount(count ?? 0));
    }
  }, [chatId]);

  // Load messages on mount
  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Mark as read when opened
  useEffect(() => {
    if (!chatId || !currentUserId) return;
    supabase
      .from('trip_chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('trip_chat_id', chatId)
      .eq('user_id', currentUserId)
      .then(() => {});
  }, [chatId, currentUserId]);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length && !hasScrolled.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        hasScrolled.current = true;
      }, 150);
    }
  }, [messages.length]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length && hasScrolled.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Realtime subscription
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`trip_chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trip_messages', filter: `trip_chat_id=eq.${chatId}` },
        async (payload) => {
          // Fetch full message with sender info
          const { data } = await supabase
            .from('trip_messages')
            .select(`id, trip_chat_id, sender_id, content, created_at, type, sender:users(name, profile_photo, photos)`)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const user = Array.isArray((data as any).sender) ? (data as any).sender[0] : (data as any).sender;
            const newMsg: Message = {
              id: data.id,
              trip_chat_id: (data as any).trip_chat_id,
              sender_id: data.sender_id,
              content: data.content,
              created_at: data.created_at,
              type: (data as any).type ?? 'text',
              sender_name: user?.name ?? null,
              sender_photo: user?.photos?.[0] ?? user?.profile_photo ?? null,
            };
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Mark as read if from someone else
            if (currentUserId && data.sender_id !== currentUserId) {
              supabase
                .from('trip_chat_members')
                .update({ last_read_at: new Date().toISOString() })
                .eq('trip_chat_id', chatId)
                .eq('user_id', currentUserId)
                .then(() => {});
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId, currentUserId]);

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !chatId || !currentUserId || isSending) return;
    const text = messageText.trim();
    setMessageText('');
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { error } = await supabase
      .from('trip_messages')
      .insert({ trip_chat_id: chatId, sender_id: currentUserId, content: text });

    if (error) {
      console.error('[ChatScreen] send error:', error.message);
      setMessageText(text);
    }
    setIsSending(false);
  }, [messageText, chatId, currentUserId, isSending]);

  if (!chatId) return <View style={{ flex: 1, backgroundColor: BG }} />;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={{ borderBottomWidth: 0.5, borderBottomColor: BORDER }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 }}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
              style={{ padding: 6, marginRight: 2 }}
            >
              <ChevronLeft size={26} color={TEXT} strokeWidth={2.2} />
            </Pressable>

            <View style={{ flex: 1, marginLeft: 4 }}>
              <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 }} numberOfLines={1}>
                {tripName ?? 'Trip Chat'}
              </Text>
              <Text style={{ color: MUTED, fontSize: 12, marginTop: 1 }}>
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => {
              // Compute shared values once — used by both system and regular messages
              const prevItem = index > 0 ? messages[index - 1] : null;
              const nextItem = index < messages.length - 1 ? messages[index + 1] : null;
              const sameDayAsPrev = prevItem
                ? new Date(prevItem.created_at).toDateString() === new Date(item.created_at).toDateString()
                : false;
              const sameDayAsNext = nextItem
                ? new Date(nextItem.created_at).toDateString() === new Date(item.created_at).toDateString()
                : false;

              // System messages (join/leave) render as centered pills, not bubbles
              if (item.type === 'system') {
                return (
                  <>
                    {!sameDayAsPrev && <DateSeparator isoString={item.created_at} />}
                    <SystemMessage content={item.content} />
                  </>
                );
              }

              const isCurrentUser = item.sender_id === currentUserId;
              const isFirst = !prevItem || prevItem.sender_id !== item.sender_id || !sameDayAsPrev;
              const isLast  = !nextItem || nextItem.sender_id !== item.sender_id || !sameDayAsNext;

              // Only show sender name for received group chats on the first bubble
              const showSenderName = !isCurrentUser && isFirst && memberCount > 2;

              return (
                <MessageBubble
                  item={item}
                  isCurrentUser={isCurrentUser}
                  isFirst={isFirst}
                  isLast={isLast}
                  showSenderName={showSenderName}
                  prevItem={prevItem}
                />
              );
            }}
            contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Animated.View entering={FadeIn.delay(200)} style={{ alignItems: 'center' }}>
                  <Text style={{ color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                    {tripName ?? 'Trip Chat'}
                  </Text>
                  <Text style={{ color: MUTED, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 }}>
                    Start planning your adventure together!
                  </Text>
                </Animated.View>
              </View>
            }
          />
        )}

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <SafeAreaView edges={['bottom']}>
            <View style={{
              flexDirection: 'row', alignItems: 'flex-end',
              paddingHorizontal: 16, paddingVertical: 10,
              borderTopWidth: 0.5, borderTopColor: BORDER,
            }}>
              <View style={{
                flex: 1, backgroundColor: SURFACE2, borderRadius: 22,
                paddingHorizontal: 16, paddingVertical: 10, marginRight: 10, minHeight: 44,
              }}>
                <TextInput
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Message…"
                  placeholderTextColor={MUTED}
                  style={{ color: TEXT, fontSize: 15, maxHeight: 120, lineHeight: 20 }}
                  multiline
                  returnKeyType="default"
                />
              </View>
              <Pressable
                onPress={handleSend}
                disabled={!messageText.trim() || isSending}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: messageText.trim() && !isSending ? ACCENT : SURFACE2,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Send size={18} color={messageText.trim() && !isSending ? '#fff' : MUTED} strokeWidth={2.2} />
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>

      </SafeAreaView>
    </View>
  );
}