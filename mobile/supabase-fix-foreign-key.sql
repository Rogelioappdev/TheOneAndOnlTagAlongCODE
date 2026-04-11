-- ============================================================
-- FIX: Foreign Key Violation on trips.creator_id
-- Run this in the Supabase SQL Editor.
--
-- Root cause: After a DB wipe, auth users exist in auth.users
-- but have no corresponding row in public.users. The trips table
-- has a FK trips.creator_id → public.users(id), so any insert
-- fails with a foreign key violation.
--
-- This script:
--  1. Recreates fn_handle_new_auth_user + trigger (auto-creates
--     public.users row whenever a new auth user signs up)
--  2. Backfills any existing auth.users who are missing a profile
--  3. Recreates fn_auto_create_trip_chat + trigger (trip → convo)
--  4. Recreates fn_auto_add_to_trip_chat + trigger (join → chat)
-- ============================================================

-- ============================================================
-- STEP 1: Recreate the auth user → public.users trigger
-- ============================================================

-- Drop old trigger + function if they exist (idempotent)
DROP TRIGGER IF EXISTS trg_new_auth_user ON auth.users;
DROP FUNCTION IF EXISTS public.fn_handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.fn_handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, profile_photo)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Traveler'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_auth_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.fn_handle_new_auth_user();

-- ============================================================
-- STEP 2: Backfill — create public.users rows for any auth
--         users that were created before the trigger existed
-- ============================================================

INSERT INTO public.users (id, email, name, profile_photo)
SELECT
  au.id,
  COALESCE(au.email, ''),
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    'Traveler'
  ),
  COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture',
    NULL
  )
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 3: Recreate trip → group chat trigger (idempotent)
-- ============================================================

DROP TRIGGER IF EXISTS trg_auto_create_trip_chat ON public.trips;
DROP FUNCTION IF EXISTS public.fn_auto_create_trip_chat();

CREATE OR REPLACE FUNCTION public.fn_auto_create_trip_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
BEGIN
  -- Create the group conversation for this trip
  INSERT INTO public.conversations (type, trip_id, name)
  VALUES ('group', NEW.id, NEW.destination)
  RETURNING id INTO v_conv_id;

  -- Add the creator as the first member of the chat
  INSERT INTO public.conversation_members (conversation_id, user_id, last_read_at)
  VALUES (v_conv_id, NEW.creator_id, NOW())
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_trip_chat
AFTER INSERT ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_create_trip_chat();

-- ============================================================
-- STEP 4: Recreate trip_members → chat membership trigger
-- ============================================================

DROP TRIGGER IF EXISTS trg_auto_add_to_trip_chat ON public.trip_members;
DROP FUNCTION IF EXISTS public.fn_auto_add_to_trip_chat();

CREATE OR REPLACE FUNCTION public.fn_auto_add_to_trip_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
  v_dest    TEXT;
BEGIN
  -- Only act when status is 'in'
  IF NEW.status != 'in' THEN
    RETURN NEW;
  END IF;

  -- Find the existing group conversation for this trip
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE trip_id = NEW.trip_id AND type = 'group'
  LIMIT 1;

  -- If somehow no conversation exists, create one
  IF v_conv_id IS NULL THEN
    SELECT destination INTO v_dest FROM public.trips WHERE id = NEW.trip_id;
    INSERT INTO public.conversations (type, trip_id, name)
    VALUES ('group', NEW.trip_id, COALESCE(v_dest, 'Trip Chat'))
    RETURNING id INTO v_conv_id;
  END IF;

  -- Add the user to the conversation
  INSERT INTO public.conversation_members (conversation_id, user_id, last_read_at)
  VALUES (v_conv_id, NEW.user_id, NOW())
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_add_to_trip_chat
AFTER INSERT OR UPDATE OF status ON public.trip_members
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_add_to_trip_chat();

-- ============================================================
-- DONE — verify the trigger exists on auth.users:
-- ============================================================
SELECT trigger_name, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trg_new_auth_user';
