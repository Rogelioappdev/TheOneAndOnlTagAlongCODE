-- ============================================
-- TAG-ALONG SUPABASE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  age INTEGER,
  bio TEXT,
  profile_photo TEXT,
  photos TEXT[] DEFAULT '{}',
  country TEXT,
  city TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  travel_with TEXT CHECK (travel_with IN ('male', 'female', 'everyone')),
  social_energy TEXT CHECK (social_energy IN ('introvert', 'extrovert', 'ambivert')),
  travel_styles TEXT[] DEFAULT '{}',
  travel_pace TEXT CHECK (travel_pace IN ('slow', 'balanced', 'fast')),
  group_type TEXT CHECK (group_type IN ('close-knit', 'open')),
  planning_style TEXT CHECK (planning_style IN ('planner', 'spontaneous', 'flexible')),
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'experienced', 'expert')),
  places_visited TEXT[] DEFAULT '{}',
  bucket_list TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  availability TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_users_gender ON public.users(gender);
CREATE INDEX IF NOT EXISTS idx_users_country ON public.users(country);
CREATE INDEX IF NOT EXISTS idx_users_travel_with ON public.users(travel_with);

-- ============================================
-- 2. TRIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  destination TEXT NOT NULL,
  country TEXT NOT NULL,
  cover_image TEXT,
  images TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  is_flexible_dates BOOLEAN DEFAULT FALSE,
  vibes TEXT[] DEFAULT '{}',
  pace TEXT CHECK (pace IN ('slow', 'balanced', 'fast')),
  group_preference TEXT CHECK (group_preference IN ('male', 'female', 'everyone', 'mixed')),
  max_group_size INTEGER DEFAULT 4,
  budget_level TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trip queries
CREATE INDEX IF NOT EXISTS idx_trips_creator ON public.trips(creator_id);
CREATE INDEX IF NOT EXISTS idx_trips_destination ON public.trips(destination);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON public.trips(start_date);

-- ============================================
-- 3. TRIP MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trip_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'maybe' CHECK (status IN ('in', 'maybe', 'out')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON public.trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user ON public.trip_members(user_id);

-- ============================================
-- 4. MATCHES TABLE (for companion matching)
-- ============================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  user1_liked BOOLEAN DEFAULT FALSE,
  user2_liked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_user1 ON public.matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON public.matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- ============================================
-- 5. SWIPES TABLE (track all swipe actions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON public.swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON public.swipes(swiped_id);

-- ============================================
-- 6. SAVED TRIPS (Bucket List)
-- ============================================
CREATE TABLE IF NOT EXISTS public.saved_trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, trip_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_trips_user ON public.saved_trips(user_id);

-- ============================================
-- 7. CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_trip ON public.conversations(trip_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);

-- ============================================
-- 8. CONVERSATION MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_conv ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON public.conversation_members(user_id);

-- ============================================
-- 9. MESSAGES TABLE (Real-time enabled)
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trips policies
CREATE POLICY "Anyone can view trips" ON public.trips
  FOR SELECT USING (true);

CREATE POLICY "Users can create trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their trips" ON public.trips
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their trips" ON public.trips
  FOR DELETE USING (auth.uid() = creator_id);

-- Trip members policies
CREATE POLICY "Anyone can view trip members" ON public.trip_members
  FOR SELECT USING (true);

CREATE POLICY "Users can join trips" ON public.trip_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership" ON public.trip_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave trips" ON public.trip_members
  FOR DELETE USING (auth.uid() = user_id);

-- Matches policies
CREATE POLICY "Users can view their matches" ON public.matches
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create matches" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their matches" ON public.matches
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Swipes policies
CREATE POLICY "Users can view own swipes" ON public.swipes
  FOR SELECT USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

CREATE POLICY "Users can create swipes" ON public.swipes
  FOR INSERT WITH CHECK (auth.uid() = swiper_id);

-- Saved trips policies
CREATE POLICY "Users can view own saved trips" ON public.saved_trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save trips" ON public.saved_trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave trips" ON public.saved_trips
  FOR DELETE USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Members can view conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (true);

-- Conversation members policies
CREATE POLICY "Members can view conversation members" ON public.conversation_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations" ON public.conversation_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership" ON public.conversation_members
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Members can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for messages (for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;

-- ============================================
-- FUNCTIONS FOR MATCHING LOGIC
-- ============================================

-- Function to handle swipe and check for match
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

-- Function to create direct conversation between two users
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

-- Function to create group conversation for a trip
CREATE OR REPLACE FUNCTION create_trip_conversation(
  p_trip_id UUID,
  p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Check if trip conversation already exists
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE trip_id = p_trip_id AND type = 'group'
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO public.conversations (type, trip_id, name)
  VALUES ('group', p_trip_id, p_name)
  RETURNING id INTO v_conversation_id;

  -- Add all trip members who are "in"
  INSERT INTO public.conversation_members (conversation_id, user_id)
  SELECT v_conversation_id, user_id
  FROM public.trip_members
  WHERE trip_id = p_trip_id AND status = 'in';

  RETURN v_conversation_id;
END;
$$;

-- Function to get users for swiping (excludes already swiped)
CREATE OR REPLACE FUNCTION get_swipeable_users(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.*
  FROM public.users u
  WHERE u.id != p_user_id
    AND u.id NOT IN (
      SELECT swiped_id FROM public.swipes WHERE swiper_id = p_user_id
    )
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Run these in Supabase Dashboard > Storage
-- 1. Create bucket: profile-photos (public)
-- 2. Create bucket: trip-images (public)

-- Storage policies (run in SQL editor):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('trip-images', 'trip-images', true);

-- CREATE POLICY "Anyone can view profile photos"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'profile-photos');

-- CREATE POLICY "Users can upload profile photos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can update own profile photos"
-- ON storage.objects FOR UPDATE
-- USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete own profile photos"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Same for trip-images bucket...

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
