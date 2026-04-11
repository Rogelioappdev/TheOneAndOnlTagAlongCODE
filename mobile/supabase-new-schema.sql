-- ============================================================
-- TAG-ALONG: CLEAN SCHEMA v2
-- Run this in Supabase SQL Editor after the nuclear reset.
-- ============================================================

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL DEFAULT '',
  name          TEXT NOT NULL DEFAULT '',
  age           INT,
  bio           TEXT,
  profile_photo TEXT,
  photos        TEXT[]        NOT NULL DEFAULT '{}',
  country       TEXT,
  city          TEXT,
  gender        TEXT CHECK (gender IN ('male','female','other')),
  travel_with   TEXT CHECK (travel_with IN ('male','female','everyone')),
  social_energy TEXT CHECK (social_energy IN ('introvert','extrovert','ambivert')),
  travel_styles TEXT[]        NOT NULL DEFAULT '{}',
  travel_pace   TEXT CHECK (travel_pace IN ('slow','balanced','fast')),
  group_type    TEXT CHECK (group_type IN ('close-knit','open')),
  planning_style TEXT CHECK (planning_style IN ('planner','spontaneous','flexible')),
  experience_level TEXT CHECK (experience_level IN ('beginner','intermediate','experienced','expert')),
  places_visited TEXT[]       NOT NULL DEFAULT '{}',
  bucket_list   TEXT[]        NOT NULL DEFAULT '{}',
  languages     TEXT[]        NOT NULL DEFAULT '{}',
  is_verified   BOOLEAN       NOT NULL DEFAULT FALSE,
  availability  TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. TRIPS TABLE
-- ============================================================
CREATE TABLE public.trips (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL DEFAULT '',
  description       TEXT,
  destination       TEXT        NOT NULL,
  country           TEXT        NOT NULL DEFAULT '',
  cover_image       TEXT,
  images            TEXT[]      NOT NULL DEFAULT '{}',
  start_date        DATE,
  end_date          DATE,
  is_flexible_dates BOOLEAN     NOT NULL DEFAULT FALSE,
  vibes             TEXT[]      NOT NULL DEFAULT '{}',
  pace              TEXT CHECK (pace IN ('slow','balanced','fast')),
  group_preference  TEXT,
  max_group_size    INT         NOT NULL DEFAULT 6,
  budget_level      TEXT,
  status            TEXT        NOT NULL DEFAULT 'planning'
                                CHECK (status IN ('planning','confirmed','completed','cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. TRIP MEMBERS TABLE
-- ============================================================
CREATE TABLE public.trip_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    UUID        NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'in'
                         CHECK (status IN ('in','maybe','out')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, user_id)
);

-- ============================================================
-- 4. CONVERSATIONS TABLE
-- ============================================================
CREATE TABLE public.conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL CHECK (type IN ('direct','group')),
  trip_id    UUID        REFERENCES public.trips(id) ON DELETE SET NULL,
  name       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. CONVERSATION MEMBERS TABLE
-- ============================================================
CREATE TABLE public.conversation_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at    TIMESTAMPTZ,
  UNIQUE (conversation_id, user_id)
);

-- ============================================================
-- 6. MESSAGES TABLE
-- ============================================================
CREATE TABLE public.messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  type            TEXT        NOT NULL DEFAULT 'text'
                              CHECK (type IN ('text','image','system')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. SWIPES TABLE
-- ============================================================
CREATE TABLE public.swipes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  swiped_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id     UUID        REFERENCES public.trips(id) ON DELETE SET NULL,
  direction   TEXT        NOT NULL CHECK (direction IN ('left','right')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (swiper_id, swiped_id)
);

-- ============================================================
-- 8. MATCHES TABLE
-- ============================================================
CREATE TABLE public.matches (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id      UUID        REFERENCES public.trips(id) ON DELETE SET NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','accepted','rejected')),
  user1_liked  BOOLEAN     NOT NULL DEFAULT FALSE,
  user2_liked  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user1_id, user2_id)
);

-- ============================================================
-- 9. SAVED TRIPS TABLE
-- ============================================================
CREATE TABLE public.saved_trips (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id    UUID        NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, trip_id)
);

-- ============================================================
-- 10. INDEXES
-- ============================================================
CREATE INDEX idx_trips_creator       ON public.trips(creator_id);
CREATE INDEX idx_trips_status        ON public.trips(status);
CREATE INDEX idx_trips_destination   ON public.trips(destination);
CREATE INDEX idx_trip_members_trip   ON public.trip_members(trip_id);
CREATE INDEX idx_trip_members_user   ON public.trip_members(user_id);
CREATE INDEX idx_conv_members_conv   ON public.conversation_members(conversation_id);
CREATE INDEX idx_conv_members_user   ON public.conversation_members(user_id);
CREATE INDEX idx_messages_conv       ON public.messages(conversation_id);
CREATE INDEX idx_messages_created    ON public.messages(created_at);
CREATE INDEX idx_swipes_swiper       ON public.swipes(swiper_id);
CREATE INDEX idx_swipes_swiped       ON public.swipes(swiped_id);
CREATE INDEX idx_matches_user1       ON public.matches(user1_id);
CREATE INDEX idx_matches_user2       ON public.matches(user2_id);
CREATE INDEX idx_matches_status      ON public.matches(status);
CREATE INDEX idx_saved_trips_user    ON public.saved_trips(user_id);
CREATE INDEX idx_conversations_trip  ON public.conversations(trip_id);

-- ============================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_trips         ENABLE ROW LEVEL SECURITY;

-- USERS policies
CREATE POLICY "users_select_all"   ON public.users FOR SELECT USING (TRUE);
CREATE POLICY "users_insert_own"   ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own"   ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_delete_own"   ON public.users FOR DELETE USING (auth.uid() = id);

-- TRIPS policies
CREATE POLICY "trips_select_all"   ON public.trips FOR SELECT USING (TRUE);
CREATE POLICY "trips_insert_auth"  ON public.trips FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "trips_update_own"   ON public.trips FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "trips_delete_own"   ON public.trips FOR DELETE USING (auth.uid() = creator_id);

-- TRIP_MEMBERS policies
CREATE POLICY "tm_select_all"      ON public.trip_members FOR SELECT USING (TRUE);
CREATE POLICY "tm_insert_auth"     ON public.trip_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tm_update_own"      ON public.trip_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tm_delete_own"      ON public.trip_members FOR DELETE USING (auth.uid() = user_id);

-- CONVERSATIONS policies (no self-join loop — query conversation_members directly)
CREATE POLICY "conv_select_member" ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = id AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "conv_insert_auth"   ON public.conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "conv_update_member" ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = id AND cm.user_id = auth.uid()
    )
  );

-- CONVERSATION_MEMBERS policies (no self-reference — check auth.uid() directly)
CREATE POLICY "cm_select_own"      ON public.conversation_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cm_insert_auth"     ON public.conversation_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cm_update_own"      ON public.conversation_members FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "cm_delete_own"      ON public.conversation_members FOR DELETE USING (user_id = auth.uid());

-- MESSAGES policies
CREATE POLICY "msg_select_member"  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "msg_insert_member"  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "msg_delete_own"     ON public.messages FOR DELETE USING (sender_id = auth.uid());

-- SWIPES policies
CREATE POLICY "swipes_select_own"  ON public.swipes FOR SELECT USING (swiper_id = auth.uid());
CREATE POLICY "swipes_insert_own"  ON public.swipes FOR INSERT WITH CHECK (auth.uid() = swiper_id);

-- MATCHES policies
CREATE POLICY "matches_select_own" ON public.matches FOR SELECT
  USING (user1_id = auth.uid() OR user2_id = auth.uid());
CREATE POLICY "matches_insert_auth" ON public.matches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "matches_update_own"  ON public.matches FOR UPDATE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- SAVED_TRIPS policies
CREATE POLICY "st_select_own"      ON public.saved_trips FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "st_insert_own"      ON public.saved_trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "st_delete_own"      ON public.saved_trips FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 12. FUNCTIONS
-- ============================================================

-- Auto-update updated_at on conversations when a message is inserted
CREATE OR REPLACE FUNCTION public.fn_update_conversation_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversation_ts
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.fn_update_conversation_timestamp();

-- Auto-update updated_at on trips/users
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trips_updated_at
BEFORE UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Auto-create user profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.fn_handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, profile_photo)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_auth_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_auth_user();

-- Auto-create trip group chat when a trip is created
CREATE OR REPLACE FUNCTION public.fn_auto_create_trip_chat()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  -- Create the group conversation for this trip
  INSERT INTO public.conversations (type, trip_id, name)
  VALUES ('group', NEW.id, NEW.destination)
  RETURNING id INTO v_conv_id;

  -- Add the creator as the first member
  INSERT INTO public.conversation_members (conversation_id, user_id, last_read_at)
  VALUES (v_conv_id, NEW.creator_id, NOW())
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_trip_chat
AFTER INSERT ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.fn_auto_create_trip_chat();

-- Auto-add user to trip group chat when they join with status='in'
CREATE OR REPLACE FUNCTION public.fn_auto_add_to_trip_chat()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  -- Only act when status is 'in'
  IF NEW.status != 'in' THEN
    RETURN NEW;
  END IF;

  -- Find the conversation for this trip
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE trip_id = NEW.trip_id AND type = 'group'
  LIMIT 1;

  -- If no conversation exists yet, create it
  IF v_conv_id IS NULL THEN
    SELECT destination INTO STRICT v_conv_id FROM public.trips WHERE id = NEW.trip_id;
    INSERT INTO public.conversations (type, trip_id, name)
    VALUES ('group', NEW.trip_id, v_conv_id::TEXT)
    RETURNING id INTO v_conv_id;
  END IF;

  -- Add user to the conversation
  INSERT INTO public.conversation_members (conversation_id, user_id, last_read_at)
  VALUES (v_conv_id, NEW.user_id, NOW())
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_add_to_trip_chat
AFTER INSERT OR UPDATE OF status ON public.trip_members
FOR EACH ROW EXECUTE FUNCTION public.fn_auto_add_to_trip_chat();

-- Process a companion swipe: record it, check for mutual match,
-- create match record, and auto-create DM on mutual match
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
  v_conv_id      UUID;
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

  -- Normalize user IDs for consistent ordering (lower UUID is always user1)
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

  -- On mutual match: auto-create a direct conversation if it doesn't exist
  IF v_is_match THEN
    -- Check if direct convo already exists between these two users
    SELECT cm1.conversation_id INTO v_conv_id
    FROM public.conversation_members cm1
    JOIN public.conversation_members cm2
      ON cm1.conversation_id = cm2.conversation_id
    JOIN public.conversations c
      ON c.id = cm1.conversation_id
    WHERE cm1.user_id = p_swiper_id
      AND cm2.user_id = p_swiped_id
      AND c.type = 'direct'
    LIMIT 1;

    IF v_conv_id IS NULL THEN
      -- Create the direct conversation
      INSERT INTO public.conversations (type)
      VALUES ('direct')
      RETURNING id INTO v_conv_id;

      -- Add both users
      INSERT INTO public.conversation_members (conversation_id, user_id, last_read_at)
      VALUES
        (v_conv_id, p_swiper_id, NOW()),
        (v_conv_id, p_swiped_id, NOW())
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_match',  v_is_match,
    'match_id',  v_match_id,
    'conv_id',   v_conv_id
  );
END;
$$;

-- ============================================================
-- 13. REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_members;

-- ============================================================
-- 14. CREATE TAGALONG GLOBAL CHAT
-- ============================================================
INSERT INTO public.conversations (type, name, trip_id)
VALUES ('group', 'TagAlong', NULL);

-- ============================================================
-- DONE. Verify tables exist:
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
