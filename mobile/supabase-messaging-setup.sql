-- ============================================
-- MESSAGING TRIGGERS + BACKFILL
-- Run this ONCE in Supabase SQL Editor
-- Tables (conversations, conversation_members, messages) already exist from supabase-schema.sql
-- This adds the triggers and backfills existing data
-- ============================================

-- Trigger: auto-update conversations.updated_at when a message is sent
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.messages FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- Trigger: auto-create group conversation when a trip is created
CREATE OR REPLACE FUNCTION auto_create_trip_conversation()
RETURNS TRIGGER AS $$
DECLARE
  existing_convo_id UUID;
  new_convo_id UUID;
BEGIN
  SELECT id INTO existing_convo_id FROM public.conversations
  WHERE trip_id = NEW.id AND type = 'group' LIMIT 1;

  IF existing_convo_id IS NULL THEN
    INSERT INTO public.conversations (type, trip_id, name)
    VALUES ('group', NEW.id, NEW.destination || ' Trip')
    RETURNING id INTO new_convo_id;

    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES (new_convo_id, NEW.creator_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_create_trip_conversation ON public.trips;
CREATE TRIGGER trigger_auto_create_trip_conversation
  AFTER INSERT ON public.trips FOR EACH ROW
  EXECUTE FUNCTION auto_create_trip_conversation();

-- Trigger: auto-add member to trip group chat when they join (status = 'in')
CREATE OR REPLACE FUNCTION auto_add_trip_chat_member()
RETURNS TRIGGER AS $$
DECLARE
  convo_id UUID;
BEGIN
  IF NEW.status = 'in' THEN
    SELECT id INTO convo_id FROM public.conversations
    WHERE trip_id = NEW.trip_id AND type = 'group' LIMIT 1;

    IF convo_id IS NOT NULL THEN
      INSERT INTO public.conversation_members (conversation_id, user_id)
      VALUES (convo_id, NEW.user_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_add_trip_chat_member ON public.trip_members;
CREATE TRIGGER trigger_auto_add_trip_chat_member
  AFTER INSERT OR UPDATE ON public.trip_members FOR EACH ROW
  EXECUTE FUNCTION auto_add_trip_chat_member();

-- Trigger: auto-create direct conversation when a match is accepted
CREATE OR REPLACE FUNCTION auto_create_match_conversation()
RETURNS TRIGGER AS $$
DECLARE
  existing_convo_id UUID;
  new_convo_id UUID;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    SELECT c.id INTO existing_convo_id
    FROM public.conversations c
    JOIN public.conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = NEW.user1_id
    JOIN public.conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = NEW.user2_id
    WHERE c.type = 'direct' LIMIT 1;

    IF existing_convo_id IS NULL THEN
      INSERT INTO public.conversations (type) VALUES ('direct') RETURNING id INTO new_convo_id;
      INSERT INTO public.conversation_members (conversation_id, user_id) VALUES
        (new_convo_id, NEW.user1_id),
        (new_convo_id, NEW.user2_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_create_match_conversation ON public.matches;
CREATE TRIGGER trigger_auto_create_match_conversation
  AFTER INSERT OR UPDATE ON public.matches FOR EACH ROW
  EXECUTE FUNCTION auto_create_match_conversation();

-- Enable Realtime on all messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================
-- BACKFILL: create group chats for existing trips
-- ============================================
DO $$
DECLARE
  trip_rec RECORD;
  existing_convo_id UUID;
  new_convo_id UUID;
  member_rec RECORD;
BEGIN
  FOR trip_rec IN SELECT * FROM public.trips LOOP
    SELECT id INTO existing_convo_id FROM public.conversations
    WHERE trip_id = trip_rec.id AND type = 'group' LIMIT 1;

    IF existing_convo_id IS NULL THEN
      INSERT INTO public.conversations (type, trip_id, name)
      VALUES ('group', trip_rec.id, trip_rec.destination || ' Trip')
      RETURNING id INTO new_convo_id;
    ELSE
      new_convo_id := existing_convo_id;
    END IF;

    -- Add all members with status 'in'
    FOR member_rec IN
      SELECT user_id FROM public.trip_members WHERE trip_id = trip_rec.id AND status = 'in'
    LOOP
      INSERT INTO public.conversation_members (conversation_id, user_id)
      VALUES (new_convo_id, member_rec.user_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END LOOP;

    -- Add the creator
    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES (new_convo_id, trip_rec.creator_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================
-- BACKFILL: create direct chats for existing accepted matches
-- ============================================
DO $$
DECLARE
  match_rec RECORD;
  existing_convo_id UUID;
  new_convo_id UUID;
BEGIN
  FOR match_rec IN SELECT * FROM public.matches WHERE status = 'accepted' LOOP
    SELECT c.id INTO existing_convo_id
    FROM public.conversations c
    JOIN public.conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = match_rec.user1_id
    JOIN public.conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = match_rec.user2_id
    WHERE c.type = 'direct' LIMIT 1;

    IF existing_convo_id IS NULL THEN
      INSERT INTO public.conversations (type) VALUES ('direct') RETURNING id INTO new_convo_id;
      INSERT INTO public.conversation_members (conversation_id, user_id) VALUES
        (new_convo_id, match_rec.user1_id),
        (new_convo_id, match_rec.user2_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;
