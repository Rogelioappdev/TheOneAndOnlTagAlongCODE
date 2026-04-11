-- ============================================================
-- Chat Features: Delete for Everyone + Seen By + Leave Groupchat
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Enable REPLICA IDENTITY FULL on trip_messages so DELETE events
--    include the old row data in realtime payloads (needed to know which message was deleted)
ALTER TABLE public.trip_messages REPLICA IDENTITY FULL;

-- 2. Add trip_chat_members to realtime publication so last_read_at updates
--    are broadcast live (powers the "Seen by" indicator)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'trip_chat_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_chat_members;
  END IF;
END $$;

-- 3. Ensure trip_messages is already in realtime (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'trip_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_messages;
  END IF;
END $$;

-- 4. Update RLS so ANY member of the chat can delete messages
--    (not just the sender — the app already checks sender_id client-side,
--     but RLS currently only allows sender_id = auth.uid())
-- Keep existing policy: sender can delete own messages
-- The app enforces "only sender can delete" at the client + query level (.eq sender_id)
-- No RLS change needed — Supabase policy already allows sender to delete their own rows.
