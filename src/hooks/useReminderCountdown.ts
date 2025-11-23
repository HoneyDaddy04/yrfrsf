/**
 * React Hook for Live Countdown Display
 * 
 * This hook provides real-time countdown strings for reminders
 * that update every second for UI display.
 */

import { useState, useEffect } from 'react';
import { Reminder, getTimeUntilNextTrigger } from '../utils/reminderScheduler';

/**
 * Custom hook that returns a live countdown string for a reminder.
 * Updates every second.
 * 
 * Usage:
 * ```tsx
 * const countdown = useReminderCountdown(reminder);
 * return <div>{countdown}</div>; // "Next reminder in 1h 23m 42s"
 * ```
 */
export function useReminderCountdown(reminder: Reminder | null): string {
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    if (!reminder) {
      setCountdown('');
      return;
    }

    // Update immediately
    const updateCountdown = () => {
      setCountdown(getTimeUntilNextTrigger(reminder));
    };

    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [reminder, reminder?.nextTrigger]); // Re-run when reminder or nextTrigger changes

  return countdown;
}

/**
 * Custom hook that returns countdown strings for multiple reminders.
 * Updates every second.
 * 
 * Usage:
 * ```tsx
 * const countdowns = useReminderCountdowns(reminders);
 * return reminders.map((reminder, i) => (
 *   <div key={reminder.id}>{countdowns[i]}</div>
 * ));
 * ```
 */
export function useReminderCountdowns(reminders: Reminder[]): string[] {
  const [countdowns, setCountdowns] = useState<string[]>([]);

  useEffect(() => {
    if (!reminders || reminders.length === 0) {
      setCountdowns([]);
      return;
    }

    // Update immediately
    const updateCountdowns = () => {
      setCountdowns(reminders.map(getTimeUntilNextTrigger));
    };

    updateCountdowns();

    // Update every second
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [reminders]);

  return countdowns;
}
