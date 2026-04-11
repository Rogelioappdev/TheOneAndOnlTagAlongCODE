-- Fix: Add missing unique constraints that are required by ON CONFLICT clauses
-- Run this in the Supabase SQL Editor

-- 1. Add unique constraint on conversation_members(conversation_id, user_id)
--    Required by the fn_auto_create_trip_chat trigger which uses ON CONFLICT on this pair
ALTER TABLE public.conversation_members
  ADD CONSTRAINT IF NOT EXISTS conversation_members_conversation_id_user_id_key
  UNIQUE (conversation_id, user_id);

-- 2. Add unique constraint on trip_members(trip_id, user_id)
--    Required by upsert ON CONFLICT in useJoinTrip
ALTER TABLE public.trip_members
  ADD CONSTRAINT IF NOT EXISTS trip_members_trip_id_user_id_key
  UNIQUE (trip_id, user_id);

-- 3. Add unique constraint on trip_chat_members(trip_chat_id, user_id)
--    Required by the fn_add_member_to_trip_chat trigger which uses ON CONFLICT on this pair
ALTER TABLE public.trip_chat_members
  ADD CONSTRAINT IF NOT EXISTS trip_chat_members_trip_chat_id_user_id_key
  UNIQUE (trip_chat_id, user_id);
