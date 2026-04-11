 import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../supabase';

/**
 * Combined typing hook — both broadcasts your typing state and listens
 * for others' typing state in the same channel.
 */
export function useTyping(
  chatId: string | undefined,
  currentUserId: string | null,
  currentUserName: string,
) {
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    const channel = supabase.channel(`typing:${chatId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ name: string; typing: boolean }>();
      const names = Object.entries(state)
        .filter(([key]) => key !== currentUserId)
        .flatMap(([, presences]) => presences)
        .filter((p) => p.typing)
        .map((p) => p.name.split(' ')[0]);
      setTypingNames(names);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setTypingNames([]);
    };
  }, [chatId, currentUserId]);

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      const ch = channelRef.current;
      if (!ch) return;
      if (isTyping) {
        await ch.track({ name: currentUserName, typing: true });
        // Auto-stop after 4 s of no new keystrokes
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          ch.untrack();
        }, 4000);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        await ch.untrack();
      }
    },
    [currentUserName],
  );

  return { typingNames, setTyping };
}
