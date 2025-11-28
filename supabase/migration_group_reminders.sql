-- Migration: Group Reminders
-- Creates tables for the group reminders feature

-- ============================================================================
-- REMINDER GROUPS TABLE (created first without policies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reminder_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INTEGER DEFAULT 1,
  reminder_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (policies added after group_members table exists)
ALTER TABLE public.reminder_groups ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GROUP MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.reminder_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate memberships
  UNIQUE(group_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GROUP REMINDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.group_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.reminder_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  why TEXT,
  time TEXT NOT NULL,
  repeat TEXT NOT NULL DEFAULT 'daily',
  next_trigger BIGINT,
  active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.group_reminders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOW ADD ALL POLICIES (after all tables exist)
-- ============================================================================

-- REMINDER GROUPS POLICIES
DROP POLICY IF EXISTS "Users can view their groups" ON public.reminder_groups;
CREATE POLICY "Users can view their groups" ON public.reminder_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create groups" ON public.reminder_groups;
CREATE POLICY "Users can create groups" ON public.reminder_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can update groups" ON public.reminder_groups;
CREATE POLICY "Admins can update groups" ON public.reminder_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete groups" ON public.reminder_groups;
CREATE POLICY "Admins can delete groups" ON public.reminder_groups
  FOR DELETE USING (auth.uid() = created_by);

-- GROUP MEMBERS POLICIES
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
CREATE POLICY "Users can view group members" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can add members" ON public.group_members;
CREATE POLICY "Admins can add members" ON public.group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
    )
  );

DROP POLICY IF EXISTS "Admins can remove members" ON public.group_members;
CREATE POLICY "Admins can remove members" ON public.group_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- GROUP REMINDERS POLICIES
DROP POLICY IF EXISTS "Users can view group reminders" ON public.group_reminders;
CREATE POLICY "Users can view group reminders" ON public.group_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_reminders.group_id
      AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can create reminders" ON public.group_reminders;
CREATE POLICY "Members can create reminders" ON public.group_reminders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_reminders.group_id
      AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators can update reminders" ON public.group_reminders;
CREATE POLICY "Creators can update reminders" ON public.group_reminders
  FOR UPDATE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_reminders.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Creators can delete reminders" ON public.group_reminders;
CREATE POLICY "Creators can delete reminders" ON public.group_reminders
  FOR DELETE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_reminders.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_reminders_group_id ON public.group_reminders(group_id);
CREATE INDEX IF NOT EXISTS idx_group_reminders_next_trigger ON public.group_reminders(next_trigger);
CREATE INDEX IF NOT EXISTS idx_group_reminders_active ON public.group_reminders(active);

-- ============================================================================
-- TRIGGERS TO UPDATE COUNTS
-- ============================================================================

-- Update member count on insert/delete
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reminder_groups
    SET member_count = (SELECT COUNT(*) FROM public.group_members WHERE group_id = NEW.group_id)
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reminder_groups
    SET member_count = (SELECT COUNT(*) FROM public.group_members WHERE group_id = OLD.group_id)
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_member_count ON public.group_members;
CREATE TRIGGER trigger_update_member_count
AFTER INSERT OR DELETE ON public.group_members
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- Update reminder count on insert/delete
CREATE OR REPLACE FUNCTION update_group_reminder_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reminder_groups
    SET reminder_count = (SELECT COUNT(*) FROM public.group_reminders WHERE group_id = NEW.group_id)
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reminder_groups
    SET reminder_count = (SELECT COUNT(*) FROM public.group_reminders WHERE group_id = OLD.group_id)
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reminder_count ON public.group_reminders;
CREATE TRIGGER trigger_update_reminder_count
AFTER INSERT OR DELETE ON public.group_reminders
FOR EACH ROW EXECUTE FUNCTION update_group_reminder_count();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT ALL ON public.reminder_groups TO authenticated;
GRANT ALL ON public.group_members TO authenticated;
GRANT ALL ON public.group_reminders TO authenticated;
