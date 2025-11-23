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
        maxAttempts: settings.maxRecallAttempts ?? 0, // 0 = unlimited
        recallIntervals: settings.recallIntervals ?? [5, 10, 15, 30], // minutes
      };
    }
  } catch (error) {
    console.error('Error loading recall settings:', error);
  }

  // Defaults
  return {
    enabled: true,
    maxAttempts: 0,
    recallIntervals: [5, 10, 15, 30],
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
  } catch (error) {
    console.error('Error saving recall settings:', error);
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
  } catch (error) {
    console.error('Error loading pending recalls:', error);
  }
  return [];
}

/**
 * Save pending recalls
 */
function savePendingRecalls(recalls: PendingRecall[]): void {
  try {
    localStorage.setItem(PENDING_RECALLS_KEY, JSON.stringify(recalls));
  } catch (error) {
    console.error('Error saving pending recalls:', error);
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

  if (!settings.enabled) {
    console.log('⏭️ Auto-recall is disabled');
    return;
  }

  // Check max attempts
  if (settings.maxAttempts > 0 && attemptNumber >= settings.maxAttempts) {
    console.log(`⏹️ Max recall attempts (${settings.maxAttempts}) reached for ${reminder.title}`);
    return;
  }

  // Get interval for this attempt (cycle through intervals if needed)
  const intervalIndex = Math.min(attemptNumber - 1, settings.recallIntervals.length - 1);
  const intervalMinutes = settings.recallIntervals[intervalIndex];
  const nextRecallTime = Date.now() + (intervalMinutes * 60 * 1000);

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

  console.log(`📞 Recall scheduled for ${reminder.title} - Attempt #${attemptNumber} in ${intervalMinutes} minutes`);
}

/**
 * Cancel a pending recall
 */
export function cancelRecall(reminderId: string): void {
  const recalls = getPendingRecalls();
  const filtered = recalls.filter(r => r.reminderId !== reminderId);
  savePendingRecalls(filtered);
  console.log(`❌ Recall cancelled for reminder ${reminderId}`);
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
  console.log('🗑️ All pending recalls cleared');
}
