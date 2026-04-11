-- ============================================================
-- TRIP MESSAGING REBUILD
-- Replaces chained triggers with a single RPC + one trigger.
--
-- New tables (separate from the general conversations system):
--   trips            (unchanged)
--   trip_members     (unchanged)
--   trip_chats       (one per trip, auto-created by RPC)
--   trip_chat_members (who is in each chat)
--   trip_messages    (messages inside a trip chat)
--
-- Flow:
--   App calls create_trip_with_chat() → inserts trip, chat,
--     adds creator to trip_members + trip_chat_members atomically.
--   User joins trip via trip_members INSERT →
--     single trigger adds them to trip_chat_members.
--   Realtime enabled on trip_messages only.
-- ============================================================

-- ============================================================
-- 1. DROP OLD OBJECTS (idempotent)
-- ============================================================
DROP TRIGGER  IF EXISTS trg_auto_create_trip_chat    ON public.trips;
DROP TRIGGER  IF EXISTS trg_auto_add_to_trip_chat    ON public.trip_members;
DROP FUNCTION IF EXISTS public.fn_auto_create_trip_chat();
DROP FUNCTION IF EXISTS public.fn_auto_add_to_trip_chat();
DROP FUNCTION IF EXISTS public.create_trip_with_chat(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], DATE, DATE, BOOLEAN, TEXT[], TEXT, TEXT, INT, TEXT, TEXT);

DROP TABLE IF EXISTS public.trip_messages     CASCADE;
DROP TABLE IF EXISTS public.trip_chat_members CASCADE;
DROP TABLE IF EXISTS public.trip_chats        CASCADE;

-- ============================================================
-- 2. NEW TABLES
-- ============================================================

-- One chat room per trip
CREATE TABLE public.trip_chats (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    UUID        NOT NULL UNIQUE REFERENCES public.trips(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Who is in each trip chat
CREATE TABLE public.trip_chat_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_chat_id    UUID        NOT NULL REFERENCES public.trip_chats(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at    TIMESTAMPTZ,
  UNIQUE (trip_chat_id, user_id)
);

-- Messages inside a trip chat
CREATE TABLE public.trip_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_chat_id UUID        NOT NULL REFERENCES public.trip_chats(id) ON DELETE CASCADE,
  sender_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  type         TEXT        NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','system')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trip_chats_trip        ON public.trip_chats(trip_id);
CREATE INDEX idx_trip_chat_members_chat ON public.trip_chat_members(trip_chat_id);
CREATE INDEX idx_trip_chat_members_user ON public.trip_chat_members(user_id);
CREATE INDEX idx_trip_messages_chat     ON public.trip_messages(trip_chat_id);
CREATE INDEX idx_trip_messages_created  ON public.trip_messages(created_at);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.trip_chats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_messages     ENABLE ROW LEVEL SECURITY;

-- trip_chats: visible only to trip members
CREATE POLICY "trip_chats_select" ON public.trip_chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_chat_members tcm
      WHERE tcm.trip_chat_id = id
        AND tcm.user_id = auth.uid()
    )
  );

-- trip_chat_members: see only your own membership rows
CREATE POLICY "tcm_select_own"  ON public.trip_chat_members FOR SELECT  USING (user_id = auth.uid());
CREATE POLICY "tcm_insert_auth" ON public.trip_chat_members FOR INSERT  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tcm_update_own"  ON public.trip_chat_members FOR UPDATE  USING (user_id = auth.uid());
CREATE POLICY "tcm_delete_own"  ON public.trip_chat_members FOR DELETE  USING (user_id = auth.uid());

-- trip_messages: only chat members can read or send
CREATE POLICY "tmsg_select_member" ON public.trip_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_chat_members tcm
      WHERE tcm.trip_chat_id = trip_chat_id
        AND tcm.user_id = auth.uid()
    )
  );

CREATE POLICY "tmsg_insert_member" ON public.trip_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.trip_chat_members tcm
      WHERE tcm.trip_chat_id = trip_chat_id
        AND tcm.user_id = auth.uid()
    )
  );

CREATE POLICY "tmsg_delete_own" ON public.trip_messages FOR DELETE
  USING (sender_id = auth.uid());

-- ============================================================
-- 4. RPC: create_trip_with_chat
--    Creates trip + chat + adds creator to trip_members and
--    trip_chat_members — all in one atomic transaction.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_trip_with_chat(
  p_creator_id       UUID,
  p_title            TEXT,
  p_destination      TEXT,
  p_country          TEXT,
  p_cover_image      TEXT    DEFAULT NULL,
  p_description      TEXT    DEFAULT NULL,
  p_images           TEXT[]  DEFAULT '{}',
  p_start_date       DATE    DEFAULT NULL,
  p_end_date         DATE    DEFAULT NULL,
  p_is_flexible      BOOLEAN DEFAULT FALSE,
  p_vibes            TEXT[]  DEFAULT '{}',
  p_pace             TEXT    DEFAULT NULL,
  p_group_preference TEXT    DEFAULT NULL,
  p_max_group_size   INT     DEFAULT 6,
  p_budget_level     TEXT    DEFAULT NULL,
  p_status           TEXT    DEFAULT 'planning'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id      UUID;
  v_chat_id      UUID;
BEGIN
  -- 1. Insert the trip
  INSERT INTO public.trips (
    creator_id, title, destination, country,
    cover_image, description, images,
    start_date, end_date, is_flexible_dates,
    vibes, pace, group_preference,
    max_group_size, budget_level, status
  )
  VALUES (
    p_creator_id, p_title, p_destination, p_country,
    p_cover_image, p_description, p_images,
    p_start_date, p_end_date, p_is_flexible,
    p_vibes, p_pace, p_group_preference,
    p_max_group_size, p_budget_level, p_status
  )
  RETURNING id INTO v_trip_id;

  -- 2. Create the trip chat
  INSERT INTO public.trip_chats (trip_id, name)
  VALUES (v_trip_id, p_destination)
  RETURNING id INTO v_chat_id;

  -- 3. Add creator to trip_members
  INSERT INTO public.trip_members (trip_id, user_id, status)
  VALUES (v_trip_id, p_creator_id, 'in')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- 4. Add creator to trip_chat_members
  INSERT INTO public.trip_chat_members (trip_chat_id, user_id, last_read_at)
  VALUES (v_chat_id, p_creator_id, NOW())
  ON CONFLICT (trip_chat_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'trip_id', v_trip_id,
    'chat_id', v_chat_id
  );
END;
$$;

-- ============================================================
-- 5. TRIGGER: auto-add trip member to trip chat on INSERT
--    Fires on trip_members INSERT only (status = 'in').
--    One trigger, one job.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_add_member_to_trip_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id UUID;
BEGIN
  -- Only care about members who are joining as 'in'
  IF NEW.status != 'in' THEN
    RETURN NEW;
  END IF;

  -- Find the chat for this trip
  SELECT id INTO v_chat_id
  FROM public.trip_chats
  WHERE trip_id = NEW.trip_id
  LIMIT 1;

  -- If chat exists, add the user
  IF v_chat_id IS NOT NULL THEN
    INSERT INTO public.trip_chat_members (trip_chat_id, user_id, last_read_at)
    VALUES (v_chat_id, NEW.user_id, NOW())
    ON CONFLICT (trip_chat_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_add_member_to_trip_chat
AFTER INSERT ON public.trip_members
FOR EACH ROW
EXECUTE FUNCTION public.fn_add_member_to_trip_chat();

-- ============================================================
-- 6. REALTIME — trip_messages only
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_messages;

-- ============================================================
-- DONE — verify:
-- ============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('trip_chats','trip_chat_members','trip_messages')
ORDER BY table_name;
