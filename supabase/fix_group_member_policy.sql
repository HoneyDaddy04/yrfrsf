-- Fix: Allow group creators to add members
-- Run this if you're getting "Failed to create group" errors

DROP POLICY IF EXISTS "Admins can add members" ON public.group_members;
CREATE POLICY "Admins can add members" ON public.group_members
  FOR INSERT WITH CHECK (
    -- Allow if user is the group creator (first member adds themselves)
    EXISTS (
      SELECT 1 FROM public.reminder_groups rg
      WHERE rg.id = group_id
      AND rg.created_by = auth.uid()
    )
    -- Or if user is already an admin of this group
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );
