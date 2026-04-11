-- ============================================
-- TAGALONG GLOBAL GROUPCHAT SETUP
-- Run this ONCE in Supabase SQL Editor
-- Creates the TagAlong global groupchat and auto-join trigger
-- ============================================

-- Step 1: Create the TagAlong global conversation (if it doesn't exist)
-- We use a fixed UUID for easy reference
DO $$
DECLARE
  tagalong_convo_id UUID;
BEGIN
  -- Check if TagAlong conversation already exists
  SELECT id INTO tagalong_convo_id
  FROM public.conversations
  WHERE name = 'TagAlong' AND type = 'group' AND trip_id IS NULL
  LIMIT 1;

  IF tagalong_convo_id IS NULL THEN
    -- Create the TagAlong global groupchat
    INSERT INTO public.conversations (type, name, trip_id)
    VALUES ('group', 'TagAlong', NULL)
    RETURNING id INTO tagalong_convo_id;

    RAISE NOTICE 'Created TagAlong groupchat with ID: %', tagalong_convo_id;
  ELSE
    RAISE NOTICE 'TagAlong groupchat already exists with ID: %', tagalong_convo_id;
  END IF;
END;
$$;

-- Step 2: Create function to get the TagAlong conversation ID
CREATE OR REPLACE FUNCTION get_tagalong_conversation_id()
RETURNS UUID AS $$
DECLARE
  convo_id UUID;
BEGIN
  SELECT id INTO convo_id
  FROM public.conversations
  WHERE name = 'TagAlong' AND type = 'group' AND trip_id IS NULL
  LIMIT 1;

  RETURN convo_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 3: Create function to add user to TagAlong groupchat
CREATE OR REPLACE FUNCTION add_user_to_tagalong_chat(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  tagalong_convo_id UUID;
BEGIN
  -- Get the TagAlong conversation ID
  tagalong_convo_id := get_tagalong_conversation_id();

  IF tagalong_convo_id IS NOT NULL THEN
    -- Add user to TagAlong groupchat (if not already a member)
    INSERT INTO public.conversation_members (conversation_id, user_id, last_read_at)
    VALUES (tagalong_convo_id, p_user_id, NOW())
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger to auto-add new users to TagAlong groupchat
-- This triggers when a user profile is first created/updated with a name (indicating onboarding completion)
CREATE OR REPLACE FUNCTION auto_add_to_tagalong_on_profile_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add to TagAlong when user has a name (indicates onboarding is complete)
  IF NEW.name IS NOT NULL AND NEW.name != '' THEN
    -- Check if this is a new record or name is being set for the first time
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.name IS NULL OR OLD.name = '')) THEN
      PERFORM add_user_to_tagalong_chat(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_add_to_tagalong ON public.users;

-- Create the trigger on users table
CREATE TRIGGER trigger_auto_add_to_tagalong
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_to_tagalong_on_profile_complete();

-- Step 5: Backfill - Add all existing users with names to the TagAlong groupchat
DO $$
DECLARE
  user_rec RECORD;
  tagalong_convo_id UUID;
BEGIN
  -- Get TagAlong conversation ID
  tagalong_convo_id := get_tagalong_conversation_id();

  IF tagalong_convo_id IS NOT NULL THEN
    -- Add all existing users with names to the TagAlong groupchat
    FOR user_rec IN
      SELECT id FROM public.users
      WHERE name IS NOT NULL AND name != ''
    LOOP
      INSERT INTO public.conversation_members (conversation_id, user_id, last_read_at)
      VALUES (tagalong_convo_id, user_rec.id, NOW())
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Backfill complete: All existing users with names added to TagAlong groupchat';
  ELSE
    RAISE WARNING 'TagAlong conversation not found - backfill skipped';
  END IF;
END;
$$;

-- Step 6: Send a welcome system message to the TagAlong groupchat
DO $$
DECLARE
  tagalong_convo_id UUID;
  system_message_exists BOOLEAN;
BEGIN
  -- Get TagAlong conversation ID
  tagalong_convo_id := get_tagalong_conversation_id();

  IF tagalong_convo_id IS NOT NULL THEN
    -- Check if a welcome message already exists
    SELECT EXISTS(
      SELECT 1 FROM public.messages
      WHERE conversation_id = tagalong_convo_id
      AND type = 'system'
      LIMIT 1
    ) INTO system_message_exists;

    -- Only add welcome message if none exists
    IF NOT system_message_exists THEN
      -- We need a sender_id, but for system messages we can use any existing user
      -- or we skip this if there are no users yet
      IF EXISTS (SELECT 1 FROM public.users LIMIT 1) THEN
        INSERT INTO public.messages (conversation_id, sender_id, content, type)
        SELECT
          tagalong_convo_id,
          (SELECT id FROM public.users LIMIT 1),
          'Welcome to TagAlong! This is the global community chat where all travelers can connect, share tips, and find travel buddies. Say hi! 👋',
          'system';

        RAISE NOTICE 'Welcome message added to TagAlong groupchat';
      END IF;
    END IF;
  END IF;
END;
$$;

-- Verify setup
SELECT
  c.id,
  c.name,
  c.type,
  c.trip_id,
  c.created_at,
  (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) as member_count
FROM conversations c
WHERE c.name = 'TagAlong' AND c.type = 'group' AND c.trip_id IS NULL;
