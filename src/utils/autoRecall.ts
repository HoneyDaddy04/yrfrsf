/**
 * Auto-Recall System
 *
 * Automatically re-triggers reminders that were declined/missed
 * Keeps calling until the user answers
 */

import { Reminder } from './reminderScheduler';

export interface RecallSettings {
  enabled: boolean;
  maxAttempts: number; // Maximum number of recall attempts (0 = unlimited)
  recallIntervals: number[]; // Intervals in minutes [5, 10, 15, 30]
}

export interface PendingRecall {
  reminderId: string;
  reminder: Reminder;
  attemptNumber: number;
  nextRecallTime: number; // UTC timestamp
  callHistoryId: string; // The call that was declined
}

const PENDING_RECALLS_KEY = 'pendingRecalls';

/**
 * Get recall settings from localStorage
 */
export function getRecallSettings(): RecallSettings {
  try {
    const settingsStr = localStorage.getItem('aiReminderSettings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      return {
        enabled: settings.autoRecallEnabled ?? true,
        maxAttempts: settings.maxRecallAttempts ?? 3, // Default to 3 attempts (not unlimited)
        recallIntervals: settings.recallIntervals ?? [1, 5, 15, 30], // minutes - first recall after 1 min
      };
    }
  } catch {
    // Use defaults on error
  }

  // Defaults - sensible limits
  return {
    enabled: true,
    maxAttempts: 3, // Max 3 recall attempts by default
    recallIntervals: [1, 5, 15, 30],
  };
}

/**
 * Save recall settings
 */
export function saveRecallSettings(settings: Partial<RecallSettings>): void {
  try {
    const settingsStr = localStorage.getItem('aiReminderSettings');
    const currentSettings = settingsStr ? JSON.parse(settingsStr) : {};

    if (settings.enabled !== undefined) {
      currentSettings.autoRecallEnabled = settings.enabled;
    }
    if (settings.maxAttempts !== undefined) {
      currentSettings.maxRecallAttempts = settings.maxAttempts;
    }
    if (settings.recallIntervals !== undefined) {
      currentSettings.recallIntervals = settings.recallIntervals;
    }

    localStorage.setItem('aiReminderSettings', JSON.stringify(currentSettings));
  } catch {
    // Ignore save errors
  }
}

/**
 * Get all pending recalls
 */
export function getPendingRecalls(): PendingRecall[] {
  try {
    const recallsStr = localStorage.getItem(PENDING_RECALLS_KEY);
    if (recallsStr) {
      return JSON.parse(recallsStr);
    }
  } catch {
    // Return empty on error
  }
  return [];
}

/**
 * Save pending recalls
 */
function savePendingRecalls(recalls: PendingRecall[]): void {
  try {
    localStorage.setItem(PENDING_RECALLS_KEY, JSON.stringify(recalls));
  } catch {
    // Ignore save errors
  }
}

/**
 * Schedule a recall for a declined/missed reminder
 */
export function scheduleRecall(
  reminder: Reminder,
  attemptNumber: number,
  callHistoryId: string
): void {
  const settings = getRecallSettings();

  if (!settings.enabled) return;

  // Check max attempts (attemptNumber is the NEXT attempt we'd schedule)
  if (settings.maxAttempts > 0 && attemptNumber > settings.maxAttempts) return;

  // Get interval for this attempt (cycle through intervals if needed)
  const intervalIndex = Math.min(attemptNumber - 1, settings.recallIntervals.length - 1);
  const intervalMinutes = settings.recallIntervals[intervalIndex];

  // Safety: minimum 30 seconds between recalls to prevent rapid fire
  const minIntervalMs = 30 * 1000;
  const intervalMs = Math.max(intervalMinutes * 60 * 1000, minIntervalMs);
  const nextRecallTime = Date.now() + intervalMs;

  const recall: PendingRecall = {
    reminderId: reminder.id,
    reminder,
    attemptNumber,
    nextRecallTime,
    callHistoryId,
  };

  const recalls = getPendingRecalls();

  // Remove any existing recall for this reminder
  const filtered = recalls.filter(r => r.reminderId !== reminder.id);

  // Add new recall
  filtered.push(recall);
  savePendingRecalls(filtered);
}

/**
 * Cancel a pending recall
 */
export function cancelRecall(reminderId: string): void {
  const recalls = getPendingRecalls();
  const filtered = recalls.filter(r => r.reminderId !== reminderId);
  savePendingRecalls(filtered);
}

/**
 * Get due recalls (should be triggered now)
 */
export function getDueRecalls(): PendingRecall[] {
  const recalls = getPendingRecalls();
  const now = Date.now();
  return recalls.filter(r => r.nextRecallTime <= now);
}

/**
 * Remove a recall from pending list (after it's been triggered)
 */
export function removeRecall(reminderId: string): void {
  const recalls = getPendingRecalls();
  const filtered = recalls.filter(r => r.reminderId !== reminderId);
  savePendingRecalls(filtered);
}

/**
 * Clear all pending recalls
 */
export function clearAllRecalls(): void {
  savePendingRecalls([]);
}
