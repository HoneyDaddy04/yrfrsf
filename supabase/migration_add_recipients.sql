-- Migration: Add recipient support for "call someone else" feature
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- UPDATE REMINDERS TABLE - Add recipient fields
-- ============================================================================
ALTER TABLE public.reminders
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recipient_email TEXT,
ADD COLUMN IF NOT EXISTS is_for_self BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Index for faster recipient queries
CREATE INDEX IF NOT EXISTS idx_reminders_recipient_id ON public.reminders(recipient_id);

-- Update RLS policies to allow recipients to see reminders sent to them
DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;
CREATE POLICY "Users can view own and received reminders" ON public.reminders
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = recipient_id);

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
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'delivered', 'answered', 'missed', 'expired'
  answered_at BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.pending_calls ENABLE ROW LEVEL SECURITY;

-- Recipients can view calls sent to them
CREATE POLICY "Recipients can view their pending calls" ON public.pending_calls
  FOR SELECT USING (auth.uid() = recipient_id);

-- Senders can view calls they sent
CREATE POLICY "Senders can view their sent calls" ON public.pending_calls
  FOR SELECT USING (auth.uid() = sender_id);

-- System can insert pending calls (via service role or trigger)
CREATE POLICY "Users can insert pending calls they send" ON public.pending_calls
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Recipients can update status of their calls
CREATE POLICY "Recipients can update their pending calls" ON public.pending_calls
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Senders can delete their pending calls
CREATE POLICY "Senders can delete their pending calls" ON public.pending_calls
  FOR DELETE USING (auth.uid() = sender_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_calls_recipient_id ON public.pending_calls(recipient_id);
CREATE INDEX IF NOT EXISTS idx_pending_calls_sender_id ON public.pending_calls(sender_id);
CREATE INDEX IF NOT EXISTS idx_pending_calls_status ON public.pending_calls(status);

-- ============================================================================
-- UPDATE PROFILES TABLE - Allow users to search for others by email
-- ============================================================================
-- Add policy to allow searching profiles by email (for adding recipients)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT USING (true); -- All authenticated users can search profiles

-- Add unique constraint on email for profile lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- UPDATE CALL HISTORY - Add sender info for received calls
-- ============================================================================
ALTER TABLE public.call_history
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS is_received_call BOOLEAN DEFAULT false;

-- Update RLS to allow viewing received calls
DROP POLICY IF EXISTS "Users can view own call history" ON public.call_history;
CREATE POLICY "Users can view own and received call history" ON public.call_history
  FOR SELECT USING (auth.uid() = user_id OR (is_received_call = true AND auth.uid() = user_id));

-- ============================================================================
-- ENABLE REALTIME FOR PENDING CALLS
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_calls;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT ALL ON public.pending_calls TO anon, authenticated;
