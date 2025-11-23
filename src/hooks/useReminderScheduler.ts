/**
 * React Hook for Reminder Scheduler Integration
 * 
 * This hook manages the reminder scheduler lifecycle and provides
 * easy integration with your React components.
 */

import { useEffect, useRef } from 'react';
import { startReminderScheduler, Reminder } from '../utils/reminderScheduler';

interface UseReminderSchedulerOptions {
  getAllReminders: () => Promise<Reminder[]>;
  updateReminder: (reminder: Reminder) => Promise<void>;
  checkInterval?: number; // How often to check (ms), default 5000
  enabled?: boolean; // Whether scheduler should be active, default true
}

/**
 * Custom hook to manage the reminder scheduler.
 * 
 * Usage:
 * ```tsx
 * useReminderScheduler({
 *   getAllReminders: db.getAllReminders,
 *   updateReminder: db.updateReminder,
 *   checkInterval: 5000,
 *   enabled: true
 * });
 * ```
 */
export function useReminderScheduler({
  getAllReminders,
  updateReminder,
  checkInterval = 5000,
  enabled = true,
}: UseReminderSchedulerOptions): void {
  const stopSchedulerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Stop scheduler if disabled
      if (stopSchedulerRef.current) {
        stopSchedulerRef.current();
        stopSchedulerRef.current = null;
      }
      return;
    }

    // Start the scheduler
    const stopScheduler = startReminderScheduler(
      getAllReminders,
      updateReminder,
      checkInterval
    );

    stopSchedulerRef.current = stopScheduler;

    // Cleanup on unmount or when dependencies change
    return () => {
      if (stopSchedulerRef.current) {
        stopSchedulerRef.current();
        stopSchedulerRef.current = null;
      }
    };
  }, [getAllReminders, updateReminder, checkInterval, enabled]);
}
