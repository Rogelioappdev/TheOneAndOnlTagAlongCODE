-- ============================================
-- FIX: "relation trip_chats does not exist" error
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop any old triggers that reference the old trip_chats table
DROP TRIGGER IF EXISTS trigger_create_trip_chat ON public.trips;
DROP TRIGGER IF EXISTS trigger_trip_chat ON public.trips;
DROP TRIGGER IF EXISTS create_trip_chat_trigger ON public.trips;
DROP TRIGGER IF EXISTS on_trip_created ON public.trips;
DROP TRIGGER IF EXISTS trip_chat_trigger ON public.trips;

-- Step 2: Drop old functions that reference trip_chats
DROP FUNCTION IF EXISTS create_trip_chat();
DROP FUNCTION IF EXISTS create_trip_chat_on_insert();
DROP FUNCTION IF EXISTS handle_new_trip();
DROP FUNCTION IF EXISTS on_trip_insert();

-- Step 3: Ensure the correct trigger using conversations table is in place
-- Drop existing correct triggers/functions first so we can recreate cleanly
DROP TRIGGER IF EXISTS trigger_auto_create_trip_conversation ON public.trips;
DROP FUNCTION IF EXISTS auto_create_trip_conversation();

-- Recreate the correct function using conversations table
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

CREATE TRIGGER trigger_auto_create_trip_conversation
  AFTER INSERT ON public.trips FOR EACH ROW
  EXECUTE FUNCTION auto_create_trip_conversation();

-- Step 4: Also fix the trip_members trigger (drop and recreate cleanly)
DROP TRIGGER IF EXISTS trigger_auto_add_trip_chat_member ON public.trip_members;
DROP FUNCTION IF EXISTS auto_add_trip_chat_member();

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

CREATE TRIGGER trigger_auto_add_trip_chat_member
  AFTER INSERT OR UPDATE ON public.trip_members FOR EACH ROW
  EXECUTE FUNCTION auto_add_trip_chat_member();

-- Verification: check all triggers on trips table
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'trips';
