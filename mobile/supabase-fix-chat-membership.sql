-- ============================================================
-- FIX: ensure_trip_chat_member RPC
--
-- Handles the case where a user is in trip_members with status 'in'
-- but was never added to trip_chat_members (due to upsert UPDATE
-- not triggering the INSERT trigger).
--
-- Run this in Supabase SQL editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_trip_chat_member(p_trip_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_chat_id UUID;
  v_is_member BOOLEAN;
BEGIN
  -- Get the calling user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Verify the user is actually a trip member with status 'in'
  SELECT EXISTS(
    SELECT 1 FROM public.trip_members
    WHERE trip_id = p_trip_id
      AND user_id = v_user_id
      AND status = 'in'
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_a_member');
  END IF;

  -- Find the chat for this trip (bypasses RLS because SECURITY DEFINER)
  SELECT id INTO v_chat_id
  FROM public.trip_chats
  WHERE trip_id = p_trip_id
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_chat_found');
  END IF;

  -- Add the user to trip_chat_members if not already there
  INSERT INTO public.trip_chat_members (trip_chat_id, user_id, last_read_at)
  VALUES (v_chat_id, v_user_id, NOW())
  ON CONFLICT (trip_chat_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'chat_id', v_chat_id);
END;
$$;
