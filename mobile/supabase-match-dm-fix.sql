-- ============================================================
-- MATCH DM FIX: Create direct chats in trip_chats on mutual match
-- Run this in the Supabase SQL editor
-- ============================================================

-- The messages tab reads from trip_chats/trip_chat_members/trip_messages.
-- The old handle_swipe RPC was creating DMs in conversations/conversation_members (old schema).
-- This fix replaces handle_swipe so it creates DMs in trip_chats instead,
-- with trip_id = NULL and a special name 'dm:<user1_id>:<user2_id>'.

-- Also adds a helper RPC to find an existing DM trip_chat between two users.

-- 1. Helper: get or create direct message chat between two users
CREATE OR REPLACE FUNCTION public.get_or_create_dm_chat(
  p_user1_id UUID,
  p_user2_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_chat_id UUID;
  -- Normalize so user1 < user2 lexicographically
  v_a UUID := LEAST(p_user1_id, p_user2_id);
  v_b UUID := GREATEST(p_user1_id, p_user2_id);
  v_name TEXT := 'dm:' || v_a::text || ':' || v_b::text;
BEGIN
  -- Check if DM chat already exists (identified by name convention)
  SELECT id INTO v_chat_id
  FROM public.trip_chats
  WHERE name = v_name
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    -- Create the DM chat with trip_id = NULL
    INSERT INTO public.trip_chats (trip_id, name)
    VALUES (NULL, v_name)
    RETURNING id INTO v_chat_id;

    -- Add both users as members
    INSERT INTO public.trip_chat_members (trip_chat_id, user_id, last_read_at)
    VALUES
      (v_chat_id, p_user1_id, NOW()),
      (v_chat_id, p_user2_id, NOW())
    ON CONFLICT (trip_chat_id, user_id) DO NOTHING;
  END IF;

  RETURN v_chat_id;
END;
$$;

-- 2. Replace handle_swipe to use trip_chats for DMs
CREATE OR REPLACE FUNCTION public.handle_swipe(
  p_swiper_id  UUID,
  p_swiped_id  UUID,
  p_direction  TEXT,
  p_trip_id    UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_other_swiped BOOLEAN := FALSE;
  v_is_match     BOOLEAN := FALSE;
  v_user1_id     UUID;
  v_user2_id     UUID;
  v_is_user1     BOOLEAN;
  v_match_id     UUID;
  v_chat_id      UUID;
BEGIN
  -- Record or update the swipe
  INSERT INTO public.swipes (swiper_id, swiped_id, trip_id, direction)
  VALUES (p_swiper_id, p_swiped_id, p_trip_id, p_direction)
  ON CONFLICT (swiper_id, swiped_id)
  DO UPDATE SET direction = EXCLUDED.direction;

  -- Only process right swipes for matching
  IF p_direction = 'left' THEN
    RETURN jsonb_build_object('is_match', FALSE);
  END IF;

  -- Check if the other person already swiped right on us
  SELECT EXISTS (
    SELECT 1 FROM public.swipes
    WHERE swiper_id = p_swiped_id
      AND swiped_id = p_swiper_id
      AND direction = 'right'
  ) INTO v_other_swiped;

  v_is_match := v_other_swiped;

  -- Normalize user IDs (lower UUID = user1)
  IF p_swiper_id < p_swiped_id THEN
    v_user1_id := p_swiper_id;
    v_user2_id := p_swiped_id;
    v_is_user1 := TRUE;
  ELSE
    v_user1_id := p_swiped_id;
    v_user2_id := p_swiper_id;
    v_is_user1 := FALSE;
  END IF;

  -- Upsert match record
  INSERT INTO public.matches (
    user1_id, user2_id, trip_id, status,
    user1_liked, user2_liked
  )
  VALUES (
    v_user1_id, v_user2_id, p_trip_id,
    CASE WHEN v_is_match THEN 'accepted' ELSE 'pending' END,
    CASE WHEN v_is_user1 THEN TRUE ELSE v_is_match END,
    CASE WHEN v_is_user1 THEN v_is_match ELSE TRUE END
  )
  ON CONFLICT (user1_id, user2_id) DO UPDATE SET
    status       = CASE WHEN v_is_match THEN 'accepted' ELSE matches.status END,
    user1_liked  = CASE WHEN v_is_user1 THEN TRUE ELSE matches.user1_liked END,
    user2_liked  = CASE WHEN NOT v_is_user1 THEN TRUE ELSE matches.user2_liked END,
    updated_at   = NOW()
  RETURNING id INTO v_match_id;

  -- On mutual match: auto-create a DM trip_chat between the two users
  IF v_is_match THEN
    v_chat_id := public.get_or_create_dm_chat(p_swiper_id, p_swiped_id);
  END IF;

  RETURN jsonb_build_object(
    'is_match',  v_is_match,
    'match_id',  v_match_id,
    'chat_id',   v_chat_id
  );
END;
$$;

-- 3. Allow trip_chats with trip_id = NULL (direct messages)
-- The existing FK is ON DELETE CASCADE which is fine.
-- We need to make trip_id nullable if it isn't already.
ALTER TABLE public.trip_chats ALTER COLUMN trip_id DROP NOT NULL;

-- 4. Fix the UNIQUE constraint on trip_chats.trip_id if it exists
-- (it would block multiple trip_id=NULL rows)
-- Drop the unique constraint on trip_id if it exists (DMs all have trip_id=NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'trip_chats'
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%trip_id%'
  ) THEN
    ALTER TABLE public.trip_chats DROP CONSTRAINT IF EXISTS trip_chats_trip_id_key;
  END IF;
END $$;

-- 5. Enable realtime for matches table (needed for match animation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;
END $$;

-- 6. Fix RLS on trip_chats to allow DMs (trip_id = NULL)
-- Users can see trip_chats they are members of (regardless of trip_id)
DROP POLICY IF EXISTS "Members can view trip chat" ON public.trip_chats;
CREATE POLICY "Members can view trip chat"
  ON public.trip_chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_chat_members
      WHERE trip_chat_id = trip_chats.id
        AND user_id = auth.uid()
    )
  );

-- Users can insert trip_chats (needed for get_or_create_dm_chat which is SECURITY DEFINER)
DROP POLICY IF EXISTS "Auth users can create trip chats" ON public.trip_chats;
CREATE POLICY "Auth users can create trip chats"
  ON public.trip_chats FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Backfill: create DM chats for all existing accepted matches
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT user1_id, user2_id
    FROM public.matches
    WHERE status = 'accepted'
  LOOP
    PERFORM public.get_or_create_dm_chat(r.user1_id, r.user2_id);
  END LOOP;
END $$;
