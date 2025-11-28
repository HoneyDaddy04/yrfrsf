/**
 * Supabase Reminder Scheduler Hook
 *
 * This hook checks for reminders stored in Supabase that need to be triggered
 * and creates pending calls for recipients.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { createPendingCall, DbReminder } from '../services/supabaseSync';
import { computeNextRecurrence, RepeatType } from '../utils/reminderScheduler';

/**
 * Hook to manage Supabase-based reminder scheduling for sending to others
 */
export function useSupabaseReminderScheduler() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    const checkReminders = async () => {
      try {
        const now = Date.now();

        // Fetch all active reminders created by this user that are for others
        const { data: reminders, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('user_id', user.id)
          .eq('active', true)
          .eq('is_for_self', false)
          .lte('next_trigger', now);

        if (error) {
          console.error('Error fetching Supabase reminders:', error);
          return;
        }

        if (!reminders || reminders.length === 0) return;

        console.log(`📞 Found ${reminders.length} reminder(s) to send to others`);

        for (const dbReminder of reminders as DbReminder[]) {
          // Only process reminders for other users
          if (!dbReminder.recipient_id) {
            console.warn('Skipping reminder without recipient_id:', dbReminder.id);
            continue;
          }

          console.log(`📨 Sending reminder "${dbReminder.title}" to recipient ${dbReminder.recipient_id}`);

          // Create pending call for recipient
          const senderName = dbReminder.sender_name
            || user?.user_metadata?.full_name
            || user?.email?.split('@')[0]
            || 'Someone';

          const { error: callError } = await createPendingCall(
            {
              id: dbReminder.id,
              title: dbReminder.title,
              why: dbReminder.why || '',
              time: dbReminder.time,
              repeat: dbReminder.repeat as RepeatType,
              nextTrigger: dbReminder.next_trigger,
              active: dbReminder.active,
              createdAt: new Date(dbReminder.created_at).getTime(),
              audioRecording: dbReminder.audio_recording || undefined,
              useCustomAudio: dbReminder.use_custom_audio,
              customInterval: dbReminder.days_of_week ? undefined : undefined, // TODO: Add custom_interval to DbReminder
              daysOfWeek: dbReminder.days_of_week || undefined,
            },
            user.id,
            dbReminder.recipient_id,
            senderName,
            user?.email || ''
          );

          if (callError) {
            console.error('Failed to create pending call:', callError);
            continue;
          }

          // Calculate next occurrence
          const reminder = {
            id: dbReminder.id,
            title: dbReminder.title,
            why: dbReminder.why || '',
            time: dbReminder.time,
            repeat: dbReminder.repeat as RepeatType,
            nextTrigger: dbReminder.next_trigger,
            active: dbReminder.active,
            createdAt: new Date(dbReminder.created_at).getTime(),
            daysOfWeek: dbReminder.days_of_week || undefined,
            audioRecording: dbReminder.audio_recording || undefined,
            useCustomAudio: dbReminder.use_custom_audio,
          };

          const nextTrigger = computeNextRecurrence(reminder);

          if (nextTrigger === null) {
            // One-time reminder - deactivate it
            await supabase
              .from('reminders')
              .update({ active: false })
              .eq('id', dbReminder.id);
            console.log(`   ℹ️ One-time reminder deactivated: ${dbReminder.title}`);
          } else {
            // Recurring reminder - update next trigger time
            await supabase
              .from('reminders')
              .update({ next_trigger: nextTrigger })
              .eq('id', dbReminder.id);
            console.log(`   ℹ️ Next occurrence scheduled for: ${new Date(nextTrigger).toLocaleString()}`);
          }
        }
      } catch (error) {
        console.error('Error in Supabase reminder scheduler:', error);
      }
    };

    // Check immediately
    checkReminders();

    // Then check every 10 seconds
    intervalRef.current = setInterval(checkReminders, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);
}
