-- ============================================================
-- NUCLEAR RESET: Drop ALL tables, functions, triggers, policies
-- KEEPS: storage buckets (profile-photos, trip-images)
-- ============================================================

-- 1. Disable RLS first so nothing blocks drops
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversation_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.swipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trip_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trip_chats DISABLE ROW LEVEL SECURITY;

-- 2. Drop all triggers
DROP TRIGGER IF EXISTS on_trip_created ON public.trips;
DROP TRIGGER IF EXISTS on_trip_member_added ON public.trip_members;
DROP TRIGGER IF EXISTS on_match_accepted ON public.matches;
DROP TRIGGER IF EXISTS on_profile_complete ON public.users;
DROP TRIGGER IF EXISTS update_conversation_updated_at_trigger ON public.messages;
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
DROP TRIGGER IF EXISTS on_user_created ON public.users;

-- 3. Drop all custom functions
DROP FUNCTION IF EXISTS public.handle_swipe(UUID, UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.handle_swipe(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_direct_conversation(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_trip_conversation(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_swipeable_users(UUID, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS public.get_swipeable_users(UUID, INT) CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_trip_conversation() CASCADE;
DROP FUNCTION IF EXISTS public.auto_add_trip_chat_member() CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_match_conversation() CASCADE;
DROP FUNCTION IF EXISTS public.auto_add_to_tagalong_on_profile_complete() CASCADE;
DROP FUNCTION IF EXISTS public.update_conversation_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_tagalong_conversation_id() CASCADE;
DROP FUNCTION IF EXISTS public.add_user_to_tagalong_chat(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 4. Drop all tables (CASCADE handles foreign key order automatically)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_members CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.saved_trips CASCADE;
DROP TABLE IF EXISTS public.swipes CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.trip_members CASCADE;
DROP TABLE IF EXISTS public.trip_chats CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 5. Remove any leftover realtime publication entries
-- (supabase_realtime publication is managed by Supabase,
--  entries will be cleaned up automatically when tables are dropped)

-- 6. Verify everything is gone
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Expected result: 0 rows (empty)
-- Storage buckets (profile-photos, trip-images) are NOT touched by this script.
