-- Migration: Accountability Partners
-- Creates tables for the accountability partners feature

-- ============================================================================
-- ACCOUNTABILITY PARTNERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accountability_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_email TEXT NOT NULL,
  partner_name TEXT,
  nickname TEXT,
  requester_name TEXT,
  requester_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  notify_on_missed BOOLEAN DEFAULT true,
  can_send_motivation BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate partnerships
  UNIQUE(user_id, partner_id)
);

-- Enable Row Level Security
ALTER TABLE public.accountability_partners ENABLE ROW LEVEL SECURITY;

-- Users can view partnerships they're part of
DROP POLICY IF EXISTS "Users can view their partnerships" ON public.accountability_partners;
CREATE POLICY "Users can view their partnerships" ON public.accountability_partners
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- Users can create partnership requests
DROP POLICY IF EXISTS "Users can create partnership requests" ON public.accountability_partners;
CREATE POLICY "Users can create partnership requests" ON public.accountability_partners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update partnerships they're part of (for accepting/declining)
DROP POLICY IF EXISTS "Users can update their partnerships" ON public.accountability_partners;
CREATE POLICY "Users can update their partnerships" ON public.accountability_partners
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- Users can delete partnerships they're part of
DROP POLICY IF EXISTS "Users can delete their partnerships" ON public.accountability_partners;
CREATE POLICY "Users can delete their partnerships" ON public.accountability_partners
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accountability_partners_user_id ON public.accountability_partners(user_id);
CREATE INDEX IF NOT EXISTS idx_accountability_partners_partner_id ON public.accountability_partners(partner_id);
CREATE INDEX IF NOT EXISTS idx_accountability_partners_status ON public.accountability_partners(status);

-- ============================================================================
-- PARTNER NOTIFICATIONS TABLE (for missed reminder alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.partner_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partnership_id UUID NOT NULL REFERENCES public.accountability_partners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL, -- 'missed_reminder', 'motivation_call', 'streak_update'
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.partner_notifications ENABLE ROW LEVEL SECURITY;

-- Partners can view notifications sent to them
DROP POLICY IF EXISTS "Partners can view their notifications" ON public.partner_notifications;
CREATE POLICY "Partners can view their notifications" ON public.partner_notifications
  FOR SELECT USING (auth.uid() = partner_id);

-- System can create notifications
DROP POLICY IF EXISTS "Users can create notifications" ON public.partner_notifications;
CREATE POLICY "Users can create notifications" ON public.partner_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Partners can update (mark as read)
DROP POLICY IF EXISTS "Partners can update notifications" ON public.partner_notifications;
CREATE POLICY "Partners can update notifications" ON public.partner_notifications
  FOR UPDATE USING (auth.uid() = partner_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partner_notifications_partner_id ON public.partner_notifications(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_notifications_read ON public.partner_notifications(read);

-- Grant permissions
GRANT ALL ON public.accountability_partners TO authenticated;
GRANT ALL ON public.partner_notifications TO authenticated;

-- Enable realtime for notifications
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
