-- FIX Migration: Add recipient support (skip already-created objects)
-- Run this if the original migration_add_recipients.sql failed partway through

-- ============================================================================
-- PENDING CALLS TABLE - For real-time notifications to recipients
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pending_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT,
  sender_email TEXT,
  reminder_title TEXT NOT NULL,
  reminder_why TEXT,
  audio_recording TEXT,
  use_custom_audio BOOLEAN DEFAULT false,
  triggered_at BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  answered_at BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.pending_calls ENABLE ROW LEVEL SECURITY;

-- Policies (use DROP IF EXISTS to be safe)
DROP POLICY IF EXISTS "Recipients can view their pending calls" ON public.pending_calls;
CREATE POLICY "Recipients can view their pending calls" ON public.pending_calls
  FOR SELECT USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Senders can view their sent calls" ON public.pending_calls;
CREATE POLICY "Senders can view their sent calls" ON public.pending_calls
  FOR SELECT USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can insert pending calls they send" ON public.pending_calls;
CREATE POLICY "Users can insert pending calls they send" ON public.pending_calls
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Recipients can update their pending calls" ON public.pending_calls;
CREATE POLICY "Recipients can update their pending calls" ON public.pending_calls
  FOR UPDATE USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Senders can delete their pending calls" ON public.pending_calls;
CREATE POLICY "Senders can delete their pending calls" ON public.pending_calls
  FOR DELETE USING (auth.uid() = sender_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_calls_recipient_id ON public.pending_calls(recipient_id);
CREATE INDEX IF NOT EXISTS idx_pending_calls_sender_id ON public.pending_calls(sender_id);
CREATE INDEX IF NOT EXISTS idx_pending_calls_status ON public.pending_calls(status);

-- ============================================================================
-- UPDATE PROFILES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- UPDATE CALL HISTORY
-- ============================================================================
ALTER TABLE public.call_history
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS is_received_call BOOLEAN DEFAULT false;

DROP POLICY IF EXISTS "Users can view own and received call history" ON public.call_history;
CREATE POLICY "Users can view own and received call history" ON public.call_history
  FOR SELECT USING (auth.uid() = user_id OR (is_received_call = true AND auth.uid() = user_id));

-- ============================================================================
-- ENABLE REALTIME FOR PENDING CALLS (ignore error if already added)
-- ============================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_calls;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Already added, ignore
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT ALL ON public.pending_calls TO anon, authenticated;
