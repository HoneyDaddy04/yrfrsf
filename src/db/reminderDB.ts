/**
 * IndexedDB Wrapper for Reminder Storage
 *
 * This module provides a clean API for storing and retrieving reminders
 * using the idb library (a Promise-based wrapper for IndexedDB).
 */

import { openDB, IDBPDatabase } from 'idb';
import { Reminder } from '../utils/reminderScheduler';

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

const DB_NAME = 'reminder-db';
const DB_VERSION = 3; // Incremented for completion tracking & auto-recall

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CallHistoryEntry {
  id: string;
  reminderId: string;
  reminderTitle: string;
  reminderWhy: string;
  timestamp: number; // When call was initiated
  answered: boolean; // true if answered, false if declined
  answeredAt?: number; // When call was answered
  endedAt?: number; // When call was ended
  duration?: number; // Call duration in milliseconds
  voicePlayed: boolean; // Whether AI voice was played
  voicePlayedSuccessfully?: boolean; // Whether voice played without errors
  recallAttempt?: number; // Which recall attempt this was (1, 2, 3, etc.)
  taskCompleted?: boolean; // Did user mark task as completed?
  taskCompletedAt?: number; // When task was marked complete
}

export interface CompletionPrompt {
  id: string;
  reminderId: string;
  reminderTitle: string;
  reminderWhy: string;
  callHistoryId: string; // Link to the call that triggered this
  promptedAt: number; // When we asked
  respondedAt?: number; // When user responded
  completed: boolean; // User's response: true = yes, false = no
  skipped?: boolean; // User dismissed without answering
}

interface ReminderDB {
  reminders: {
    key: string;
    value: Reminder;
    indexes: {
      'by-nextTrigger': number;
      'by-active': boolean;
      'by-createdAt': number;
    };
  };
  callHistory: {
    key: string;
    value: CallHistoryEntry;
    indexes: {
      'by-timestamp': number;
      'by-reminderId': string;
      'by-answered': boolean;
    };
  };
  completionPrompts: {
    key: string;
    value: CompletionPrompt;
    indexes: {
      'by-promptedAt': number;
      'by-reminderId': string;
      'by-completed': boolean;
    };
  };
}

// ============================================================================
// DATABASE INSTANCE
// ============================================================================

let db: IDBPDatabase<ReminderDB> | null = null;

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize the IndexedDB database.
 * Creates the object store and indexes if they don't exist.
 */
export async function initDB(): Promise<IDBPDatabase<ReminderDB>> {
  if (db) {
    return db;
  }

  try {
    db = await openDB<ReminderDB>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion, newVersion) {
        console.log(`🔄 Upgrading database from version ${oldVersion} to ${newVersion}`);

        // Create the reminders object store
        if (!database.objectStoreNames.contains('reminders')) {
          const store = database.createObjectStore('reminders', {
            keyPath: 'id'
          });

          // Create indexes for efficient querying
          store.createIndex('by-nextTrigger', 'nextTrigger');
          store.createIndex('by-active', 'active');
          store.createIndex('by-createdAt', 'createdAt');

          console.log('✅ Database initialized with reminders store');
        }

        // Create the call history object store (version 2+)
        if (!database.objectStoreNames.contains('callHistory')) {
          const callStore = database.createObjectStore('callHistory', {
            keyPath: 'id'
          });

          // Create indexes for efficient querying
          callStore.createIndex('by-timestamp', 'timestamp');
          callStore.createIndex('by-reminderId', 'reminderId');
          callStore.createIndex('by-answered', 'answered');

          console.log('✅ Database initialized with callHistory store');
        }

        // Create the completion prompts object store (version 3+)
        if (!database.objectStoreNames.contains('completionPrompts')) {
          const promptStore = database.createObjectStore('completionPrompts', {
            keyPath: 'id'
          });

          // Create indexes for efficient querying
          promptStore.createIndex('by-promptedAt', 'promptedAt');
          promptStore.createIndex('by-reminderId', 'reminderId');
          promptStore.createIndex('by-completed', 'completed');

          console.log('✅ Database initialized with completionPrompts store');
        }
      },
      blocked() {
        console.warn('⚠️ Database upgrade blocked - please close other tabs with this app');
      },
      blocking() {
        console.warn('⚠️ Database is blocking an upgrade in another tab');
        // Close the database to allow the upgrade
        if (db) {
          db.close();
          db = null;
        }
      },
      terminated() {
        console.error('❌ Database connection terminated unexpectedly');
        db = null;
      },
    });

    console.log('✅ Database connection established');
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all reminders from the database.
 */
export async function getAllReminders(): Promise<Reminder[]> {
  const database = await initDB();
  return database.getAll('reminders');
}

/**
 * Get a single reminder by ID.
 */
export async function getReminder(id: string): Promise<Reminder | undefined> {
  const database = await initDB();
  return database.get('reminders', id);
}

/**
 * Add a new reminder to the database.
 */
export async function addReminder(reminder: Reminder): Promise<void> {
  const database = await initDB();
  await database.add('reminders', reminder);
  console.log('✅ Reminder added:', reminder.title);
}

/**
 * Update an existing reminder.
 */
export async function updateReminder(reminder: Reminder): Promise<void> {
  const database = await initDB();
  await database.put('reminders', reminder);
  console.log('✅ Reminder updated:', reminder.title);
}

/**
 * Delete a reminder by ID.
 */
export async function deleteReminder(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('reminders', id);
  console.log('✅ Reminder deleted:', id);
}

/**
 * Delete all reminders (use with caution).
 */
export async function clearAllReminders(): Promise<void> {
  const database = await initDB();
  await database.clear('reminders');
  console.log('✅ All reminders cleared');
}

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * Get all active reminders.
 */
export async function getActiveReminders(): Promise<Reminder[]> {
  const database = await initDB();
  const allReminders = await database.getAll('reminders');
  return allReminders.filter(r => r.active === true);
}

/**
 * Get all inactive reminders.
 */
export async function getInactiveReminders(): Promise<Reminder[]> {
  const database = await initDB();
  const allReminders = await database.getAll('reminders');
  return allReminders.filter(r => r.active === false);
}

/**
 * Get reminders sorted by next trigger time.
 */
export async function getRemindersByNextTrigger(): Promise<Reminder[]> {
  const database = await initDB();
  const index = database.transaction('reminders').store.index('by-nextTrigger');
  return index.getAll();
}

/**
 * Get upcoming reminders (active and scheduled for the future).
 */
export async function getUpcomingReminders(limit?: number): Promise<Reminder[]> {
  const database = await initDB();
  const now = Date.now();
  
  const allReminders = await database.getAll('reminders');
  
  const upcoming = allReminders
    .filter(r => r.active && r.nextTrigger > now)
    .sort((a, b) => a.nextTrigger - b.nextTrigger);
  
  return limit ? upcoming.slice(0, limit) : upcoming;
}

/**
 * Get overdue reminders (active but scheduled time has passed).
 */
export async function getOverdueReminders(): Promise<Reminder[]> {
  const database = await initDB();
  const now = Date.now();
  
  const allReminders = await database.getAll('reminders');
  
  return allReminders
    .filter(r => r.active && r.nextTrigger <= now)
    .sort((a, b) => a.nextTrigger - b.nextTrigger);
}

/**
 * Search reminders by title or why field.
 */
export async function searchReminders(query: string): Promise<Reminder[]> {
  const database = await initDB();
  const allReminders = await database.getAll('reminders');
  
  const lowerQuery = query.toLowerCase();
  
  return allReminders.filter(r => 
    r.title.toLowerCase().includes(lowerQuery) ||
    r.why.toLowerCase().includes(lowerQuery)
  );
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Add multiple reminders at once.
 */
export async function addReminders(reminders: Reminder[]): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('reminders', 'readwrite');
  
  await Promise.all([
    ...reminders.map(r => tx.store.add(r)),
    tx.done,
  ]);
  
  console.log(`✅ Added ${reminders.length} reminders`);
}

/**
 * Update multiple reminders at once.
 */
export async function updateReminders(reminders: Reminder[]): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('reminders', 'readwrite');
  
  await Promise.all([
    ...reminders.map(r => tx.store.put(r)),
    tx.done,
  ]);
  
  console.log(`✅ Updated ${reminders.length} reminders`);
}

/**
 * Delete multiple reminders by IDs.
 */
export async function deleteReminders(ids: string[]): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('reminders', 'readwrite');
  
  await Promise.all([
    ...ids.map(id => tx.store.delete(id)),
    tx.done,
  ]);
  
  console.log(`✅ Deleted ${ids.length} reminders`);
}

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

/**
 * Get total count of reminders.
 */
export async function getReminderCount(): Promise<number> {
  const database = await initDB();
  return database.count('reminders');
}

/**
 * Get count of active reminders.
 */
export async function getActiveReminderCount(): Promise<number> {
  const reminders = await getActiveReminders();
  return reminders.length;
}

/**
 * Check if a reminder exists by ID.
 */
export async function reminderExists(id: string): Promise<boolean> {
  const reminder = await getReminder(id);
  return reminder !== undefined;
}

/**
 * Export all reminders as JSON string.
 */
export async function exportRemindersJSON(): Promise<string> {
  const reminders = await getAllReminders();
  return JSON.stringify(reminders, null, 2);
}

/**
 * Import reminders from JSON string.
 * Optionally clear existing reminders first.
 */
export async function importRemindersJSON(
  json: string, 
  clearExisting: boolean = false
): Promise<number> {
  const reminders: Reminder[] = JSON.parse(json);
  
  if (clearExisting) {
    await clearAllReminders();
  }
  
  await addReminders(reminders);
  return reminders.length;
}

// ============================================================================
// DATABASE MANAGEMENT
// ============================================================================

/**
 * Close the database connection.
 */
export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
    console.log('✅ Database connection closed');
  }
}

/**
 * Delete the entire database (use with extreme caution).
 */
export async function deleteDB(): Promise<void> {
  closeDB();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      console.log('✅ Database deleted');
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get database statistics.
 */
export async function getDBStats(): Promise<{
  totalReminders: number;
  activeReminders: number;
  inactiveReminders: number;
  upcomingReminders: number;
  overdueReminders: number;
}> {
  const allReminders = await getAllReminders();
  const now = Date.now();
  
  const active = allReminders.filter(r => r.active).length;
  const inactive = allReminders.filter(r => !r.active).length;
  const upcoming = allReminders.filter(r => r.active && r.nextTrigger > now && r.nextTrigger < now + 24 * 60 * 60 * 1000).length;
  const overdue = allReminders.filter(r => r.active && r.nextTrigger < now).length;

  return {
    totalReminders: allReminders.length,
    activeReminders: active,
    inactiveReminders: inactive,
    upcomingReminders: upcoming,
    overdueReminders: overdue,
  };
}

// ============================================================================
// CALL HISTORY OPERATIONS
// ============================================================================

/**
 * Add a call history entry to the database.
 */
export async function addCallHistory(entry: CallHistoryEntry): Promise<void> {
  const database = await initDB();
  await database.add('callHistory', entry);
  console.log('✅ Call history entry added:', entry.id);
}

/**
 * Update a call history entry.
 */
export async function updateCallHistory(entry: CallHistoryEntry): Promise<void> {
  const database = await initDB();
  await database.put('callHistory', entry);
  console.log('✅ Call history entry updated:', entry.id);
}

/**
 * Get all call history entries.
 */
export async function getAllCallHistory(): Promise<CallHistoryEntry[]> {
  const database = await initDB();
  const entries = await database.getAll('callHistory');
  // Sort by timestamp, most recent first
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get call history for a specific reminder.
 */
export async function getCallHistoryForReminder(reminderId: string): Promise<CallHistoryEntry[]> {
  const database = await initDB();
  const index = database.transaction('callHistory').store.index('by-reminderId');
  const entries = await index.getAll(reminderId);
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get answered calls only.
 */
export async function getAnsweredCalls(): Promise<CallHistoryEntry[]> {
  const database = await initDB();
  const allHistory = await database.getAll('callHistory');
  return allHistory.filter(h => h.answered === true).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get missed calls (declined calls).
 */
export async function getMissedCalls(): Promise<CallHistoryEntry[]> {
  const database = await initDB();
  const allHistory = await database.getAll('callHistory');
  return allHistory.filter(h => h.answered === false).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Delete a call history entry.
 */
export async function deleteCallHistory(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('callHistory', id);
  console.log('✅ Call history entry deleted:', id);
}

/**
 * Clear all call history.
 */
export async function clearAllCallHistory(): Promise<void> {
  const database = await initDB();
  await database.clear('callHistory');
  console.log('✅ All call history cleared');
}

/**
 * Get call history statistics.
 */
export async function getCallHistoryStats(): Promise<{
  total: number;
  answered: number;
  missed: number;
  withVoice: number;
  averageDuration: number;
}> {
  const allHistory = await getAllCallHistory();

  const answered = allHistory.filter(h => h.answered).length;
  const missed = allHistory.filter(h => !h.answered).length;
  const withVoice = allHistory.filter(h => h.voicePlayed).length;

  const durations = allHistory
    .filter(h => h.duration !== undefined)
    .map(h => h.duration!);

  const averageDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;

  return {
    total: allHistory.length,
    answered,
    missed,
    withVoice,
    averageDuration,
  };
}

// ============================================================================
// COMPLETION PROMPT OPERATIONS
// ============================================================================

/**
 * Add a completion prompt entry.
 */
export async function addCompletionPrompt(prompt: CompletionPrompt): Promise<void> {
  const database = await initDB();
  await database.add('completionPrompts', prompt);
  console.log('✅ Completion prompt added:', prompt.id);
}

/**
 * Update a completion prompt entry with partial updates.
 */
export async function updateCompletionPrompt(id: string, updates: Partial<CompletionPrompt>): Promise<void> {
  const database = await initDB();

  // Get the existing prompt
  const existingPrompt = await database.get('completionPrompts', id);
  if (!existingPrompt) {
    throw new Error(`Completion prompt with id ${id} not found`);
  }

  // Merge updates with existing data
  const updatedPrompt = { ...existingPrompt, ...updates };

  await database.put('completionPrompts', updatedPrompt);
  console.log('✅ Completion prompt updated:', id);
}

/**
 * Get all completion prompts.
 */
export async function getAllCompletionPrompts(): Promise<CompletionPrompt[]> {
  const database = await initDB();
  const prompts = await database.getAll('completionPrompts');
  return prompts.sort((a, b) => b.promptedAt - a.promptedAt);
}

/**
 * Get completion prompts for a specific reminder.
 */
export async function getCompletionPromptsForReminder(reminderId: string): Promise<CompletionPrompt[]> {
  const database = await initDB();
  const index = database.transaction('completionPrompts').store.index('by-reminderId');
  const prompts = await index.getAll(reminderId);
  return prompts.sort((a, b) => b.promptedAt - a.promptedAt);
}

/**
 * Get unanswered completion prompts (for showing pending prompts).
 */
export async function getUnansweredPrompts(): Promise<CompletionPrompt[]> {
  const allPrompts = await getAllCompletionPrompts();
  return allPrompts.filter(p => !p.respondedAt && !p.skipped);
}

/**
 * Delete a completion prompt.
 */
export async function deleteCompletionPrompt(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('completionPrompts', id);
  console.log('✅ Completion prompt deleted:', id);
}

// ============================================================================
// DATA EXPORT/IMPORT OPERATIONS
// ============================================================================

export interface ExportData {
  version: number;
  exportedAt: number;
  reminders: Reminder[];
  callHistory: CallHistoryEntry[];
  completionPrompts: CompletionPrompt[];
  settings?: Record<string, unknown>;
}

/**
 * Export all data from all stores for backup.
 */
export async function exportAllData(): Promise<ExportData> {
  const database = await initDB();

  const reminders = await database.getAll('reminders');
  const callHistory = await database.getAll('callHistory');
  const completionPrompts = await database.getAll('completionPrompts');

  // Also export localStorage settings
  let settings: Record<string, unknown> = {};
  try {
    const aiSettings = localStorage.getItem('aiReminderSettings');
    const ttsSettings = localStorage.getItem('yrfrsf-tts-settings');
    if (aiSettings) settings.aiReminderSettings = JSON.parse(aiSettings);
    if (ttsSettings) settings.ttsSettings = JSON.parse(ttsSettings);
  } catch (e) {
    console.warn('Could not export some settings:', e);
  }

  return {
    version: DB_VERSION,
    exportedAt: Date.now(),
    reminders,
    callHistory,
    completionPrompts,
    settings,
  };
}

/**
 * Import data from a backup file.
 * Optionally merge with existing data or replace.
 */
export async function importData(
  data: ExportData,
  options: { merge?: boolean } = { merge: true }
): Promise<{ imported: number; errors: string[] }> {
  const database = await initDB();
  const errors: string[] = [];
  let imported = 0;

  // Import reminders
  if (data.reminders && Array.isArray(data.reminders)) {
    const tx = database.transaction('reminders', 'readwrite');
    for (const reminder of data.reminders) {
      try {
        if (options.merge) {
          await tx.store.put(reminder);
        } else {
          const exists = await tx.store.get(reminder.id);
          if (!exists) {
            await tx.store.add(reminder);
          }
        }
        imported++;
      } catch (e) {
        errors.push(`Failed to import reminder: ${reminder.title}`);
      }
    }
    await tx.done;
  }

  // Import call history
  if (data.callHistory && Array.isArray(data.callHistory)) {
    const tx = database.transaction('callHistory', 'readwrite');
    for (const entry of data.callHistory) {
      try {
        if (options.merge) {
          await tx.store.put(entry);
        } else {
          const exists = await tx.store.get(entry.id);
          if (!exists) {
            await tx.store.add(entry);
          }
        }
        imported++;
      } catch (e) {
        errors.push(`Failed to import call history: ${entry.id}`);
      }
    }
    await tx.done;
  }

  // Import completion prompts
  if (data.completionPrompts && Array.isArray(data.completionPrompts)) {
    const tx = database.transaction('completionPrompts', 'readwrite');
    for (const prompt of data.completionPrompts) {
      try {
        if (options.merge) {
          await tx.store.put(prompt);
        } else {
          const exists = await tx.store.get(prompt.id);
          if (!exists) {
            await tx.store.add(prompt);
          }
        }
        imported++;
      } catch (e) {
        errors.push(`Failed to import completion prompt: ${prompt.id}`);
      }
    }
    await tx.done;
  }

  // Import settings
  if (data.settings) {
    try {
      if (data.settings.aiReminderSettings) {
        localStorage.setItem('aiReminderSettings', JSON.stringify(data.settings.aiReminderSettings));
      }
      if (data.settings.ttsSettings) {
        localStorage.setItem('yrfrsf-tts-settings', JSON.stringify(data.settings.ttsSettings));
      }
    } catch (e) {
      errors.push('Failed to import some settings');
    }
  }

  console.log(`✅ Import complete: ${imported} items imported, ${errors.length} errors`);
  return { imported, errors };
}
