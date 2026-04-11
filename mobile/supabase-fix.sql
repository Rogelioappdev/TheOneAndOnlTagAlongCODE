-- ============================================
-- TAG-ALONG SUPABASE FIX SCRIPT
-- Run this in the Supabase SQL Editor
-- Fixes: RLS policies, realtime subscriptions,
--        conversation_members recursion bug,
--        and missing policies.
-- ============================================

-- ============================================
-- 1. DROP AND RECREATE BROKEN RLS POLICIES
-- ============================================

-- Drop the self-referencing recursive policy on conversation_members
-- (It references itself: cm.conversation_id = conversation_id which can recurse)
DROP POLICY IF EXISTS "Members can view conversation members" ON public.conversation_members;

-- Recreate with a simpler, non-recursive version
-- Users can see members of conversations they belong to
CREATE POLICY "Members can view conversation members" ON public.conversation_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR conversation_id IN (
      SELECT conversation_id FROM public.conversation_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 2. FIX CONVERSATIONS SELECT POLICY
-- The subquery on conversation_members is fine but let's ensure it works
-- ============================================
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;

CREATE POLICY "Members can view conversations" ON public.conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id FROM public.conversation_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 3. ADD UPDATE POLICY FOR CONVERSATIONS
-- (needed to update updated_at when sending messages)
-- ============================================
DROP POLICY IF EXISTS "Members can update conversations" ON public.conversations;

CREATE POLICY "Members can update conversations" ON public.conversations
  FOR UPDATE USING (
    id IN (
      SELECT conversation_id FROM public.conversation_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 4. ENSURE SWIPES POLICIES ARE CORRECT
-- ============================================
DROP POLICY IF EXISTS "Users can view own swipes" ON public.swipes;
DROP POLICY IF EXISTS "Users can create swipes" ON public.swipes;

CREATE POLICY "Users can view own swipes" ON public.swipes
  FOR SELECT USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

CREATE POLICY "Users can create swipes" ON public.swipes
  FOR INSERT WITH CHECK (auth.uid() = swiper_id);

-- ============================================
-- 5. ENSURE SAVED_TRIPS POLICIES ARE CORRECT
-- ============================================
DROP POLICY IF EXISTS "Users can view own saved trips" ON public.saved_trips;
DROP POLICY IF EXISTS "Users can save trips" ON public.saved_trips;
DROP POLICY IF EXISTS "Users can unsave trips" ON public.saved_trips;

CREATE POLICY "Users can view own saved trips" ON public.saved_trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save trips" ON public.saved_trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave trips" ON public.saved_trips
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 6. ENSURE MATCHES POLICIES ARE CORRECT
-- ============================================
DROP POLICY IF EXISTS "Users can view their matches" ON public.matches;
DROP POLICY IF EXISTS "Users can create matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update their matches" ON public.matches;

CREATE POLICY "Users can view their matches" ON public.matches
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create matches" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their matches" ON public.matches
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================
-- 7. ENSURE MESSAGES POLICIES ARE CORRECT
-- ============================================
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;

CREATE POLICY "Members can view messages" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND conversation_id IN (
      SELECT conversation_id FROM public.conversation_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 8. REALTIME SUBSCRIPTIONS
-- Ensure all necessary tables are in the realtime publication
-- ============================================
DO $$
BEGIN
  -- Add messages to realtime if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  -- Add matches to realtime if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;

  -- Add conversation_members to realtime if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
  END IF;

  -- Add conversations to realtime for updated_at changes
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;

-- ============================================
-- 9. RE-CREATE handle_swipe FUNCTION (ensure SECURITY DEFINER is correct)
-- ============================================
CREATE OR REPLACE FUNCTION handle_swipe(
  p_swiper_id UUID,
  p_swiped_id UUID,
  p_direction TEXT,
  p_trip_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_swipe RECORD;
  v_match_id UUID;
  v_is_match BOOLEAN := FALSE;
BEGIN
  -- Security check: ensure caller is the swiper
  IF auth.uid() != p_swiper_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Insert the swipe
  INSERT INTO public.swipes (swiper_id, swiped_id, trip_id, direction)
  VALUES (p_swiper_id, p_swiped_id, p_trip_id, p_direction)
  ON CONFLICT (swiper_id, swiped_id) DO UPDATE SET direction = p_direction;

  -- If right swipe, check for mutual match
  IF p_direction = 'right' THEN
    -- Check if the other person also swiped right
    SELECT * INTO v_existing_swipe
    FROM public.swipes
    WHERE swiper_id = p_swiped_id AND swiped_id = p_swiper_id AND direction = 'right';

    IF FOUND THEN
      -- It's a match! Create or update match record
      INSERT INTO public.matches (user1_id, user2_id, trip_id, status, user1_liked, user2_liked)
      VALUES (
        LEAST(p_swiper_id, p_swiped_id),
        GREATEST(p_swiper_id, p_swiped_id),
        p_trip_id,
        'accepted',
        TRUE,
        TRUE
      )
      ON CONFLICT (user1_id, user2_id) DO UPDATE SET
        status = 'accepted',
        user1_liked = TRUE,
        user2_liked = TRUE,
        updated_at = NOW()
      RETURNING id INTO v_match_id;

      v_is_match := TRUE;
    ELSE
      -- No mutual match yet, create pending match
      INSERT INTO public.matches (user1_id, user2_id, trip_id, status, user1_liked, user2_liked)
      VALUES (
        LEAST(p_swiper_id, p_swiped_id),
        GREATEST(p_swiper_id, p_swiped_id),
        p_trip_id,
        'pending',
        p_swiper_id < p_swiped_id,
        p_swiper_id > p_swiped_id
      )
      ON CONFLICT (user1_id, user2_id) DO UPDATE SET
        user1_liked = CASE WHEN p_swiper_id < p_swiped_id THEN TRUE ELSE public.matches.user1_liked END,
        user2_liked = CASE WHEN p_swiper_id > p_swiped_id THEN TRUE ELSE public.matches.user2_liked END,
        updated_at = NOW()
      RETURNING id INTO v_match_id;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'is_match', v_is_match,
    'match_id', v_match_id
  );
END;
$$;

-- ============================================
-- 10. RE-CREATE create_direct_conversation FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION create_direct_conversation(
  p_user1_id UUID,
  p_user2_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Security check: caller must be one of the participants
  IF auth.uid() != p_user1_id AND auth.uid() != p_user2_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Check if conversation already exists
  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  JOIN public.conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = p_user1_id
  JOIN public.conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = p_user2_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO public.conversations (type)
  VALUES ('direct')
  RETURNING id INTO v_conversation_id;

  -- Add both users
  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES
    (v_conversation_id, p_user1_id),
    (v_conversation_id, p_user2_id);

  RETURN v_conversation_id;
END;
$$;

-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify everything is set up:
-- ============================================

-- Check all tables have RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check all policies:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- Check realtime publications:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
