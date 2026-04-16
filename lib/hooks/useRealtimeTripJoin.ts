import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import type { UserProfile } from '../database.types';

export interface TripJoinEvent {
  newMember: UserProfile;
  tripId: string;
  tripDestination: string;
  tripCountry: string;
  memberCount: number;
}

/**
 * useRealtimeTripJoin
 *
 * Subscribes to trip_members INSERT events for all trips the current user
 * belongs to (as creator or member). When a new person joins, fires the
 * `onNewMember` callback with info about the joiner and the trip — so that
 * other members on those trips can see the full-screen animation in real time.
 *
 * The hook skips the event when the newly inserted user_id matches the
 * current user (they joined themselves — no need to show the animation to
 * the person who just clicked "Join").
 */
export function useRealtimeTripJoin(
  onNewMember: (event: TripJoinEvent) => void
) {
  // Keep a stable ref to the callback so the channel subscription never
  // needs to be torn down when the parent component re-renders.
  const callbackRef = useRef(onNewMember);
  callbackRef.current = onNewMember;

  useEffect(() => {
    let isMounted = true;
    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      // getSession reads from AsyncStorage — no network round-trip
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user || !isMounted) return;

      const currentUserId = user.id;

      channelRef = supabase
        .channel(`trip-member-join:${currentUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'trip_members',
          },
          async (payload) => {
            if (!isMounted) return;

            const newRow = payload.new as {
              id: string;
              trip_id: string;
              user_id: string;
              status: string;
              created_at: string;
            };

            // Skip if this is the current user joining (they triggered it themselves)
            if (newRow.user_id === currentUserId) return;

            // Only fire for "in" status joins (not "maybe")
            if (newRow.status !== 'in') return;

            // Check whether the current user is on this trip
            const { data: membership } = await supabase
              .from('trip_members')
              .select('id')
              .eq('trip_id', newRow.trip_id)
              .eq('user_id', currentUserId)
              .maybeSingle();

            // Also check if the current user is the creator
            const { data: tripData } = await supabase
              .from('trips')
              .select('id, destination, country, creator_id')
              .eq('id', newRow.trip_id)
              .maybeSingle();

            if (!tripData) return;

            const isOnTrip =
              !!membership || tripData.creator_id === currentUserId;

            if (!isOnTrip) return;

            // Fetch the new member's profile
            const { data: newMemberProfile } = await supabase
              .from('users')
              .select('*')
              .eq('id', newRow.user_id)
              .maybeSingle();

            if (!newMemberProfile || !isMounted) return;

            // Count total members now
            const { count } = await supabase
              .from('trip_members')
              .select('id', { count: 'exact', head: true })
              .eq('trip_id', newRow.trip_id)
              .eq('status', 'in');

            callbackRef.current({
              newMember: newMemberProfile as UserProfile,
              tripId: newRow.trip_id,
              tripDestination: tripData.destination,
              tripCountry: tripData.country,
              memberCount: (count ?? 1) - 1, // pass count before new member
            });
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      isMounted = false;
      if (channelRef) {
        supabase.removeChannel(channelRef);
      }
    };
  }, []);
}