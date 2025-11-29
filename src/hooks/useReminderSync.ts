/**
 * Reminder Sync Hook
 *
 * Automatically syncs reminders between local IndexedDB and Supabase
 * when the user is authenticated.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { getAllReminders, updateReminder, addReminder, getReminder } from '../db/reminderDB';
import { performFullSync, SyncResult } from '../services/supabaseSync';
import { Reminder } from '../utils/reminderScheduler';

export interface SyncStatus {
  lastSyncAt: number | null;
  isSyncing: boolean;
  fromCloud: SyncResult | null;
  toCloud: SyncResult | null;
  error: string | null;
}

export function useReminderSync(refreshTrigger?: number, onSyncComplete?: () => void) {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncAt: null,
    isSyncing: false,
    fromCloud: null,
    toCloud: null,
    error: null,
  });
  const hasSyncedRef = useRef(false);
  const syncInProgressRef = useRef(false);
  const onSyncCompleteRef = useRef(onSyncComplete);

  // Keep the callback ref up to date
  useEffect(() => {
    onSyncCompleteRef.current = onSyncComplete;
  }, [onSyncComplete]);

  // Save reminder to local DB (used by sync)
  const saveLocalReminder = useCallback(async (reminder: Reminder) => {
    const existing = await getReminder(reminder.id);
    if (existing) {
      await updateReminder(reminder);
    } else {
      await addReminder(reminder);
    }
  }, []);

  // Perform sync
  const performSync = useCallback(async () => {
    if (!user || !isSupabaseConfigured || syncInProgressRef.current) {
      return;
    }

    syncInProgressRef.current = true;
    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      // Get current local reminders
      const localReminders = await getAllReminders();

      // Perform two-way sync with ability to refresh local reminders after cloud sync
      const result = await performFullSync(user.id, localReminders, saveLocalReminder, getAllReminders);

      setSyncStatus({
        lastSyncAt: Date.now(),
        isSyncing: false,
        fromCloud: result.fromCloud,
        toCloud: result.toCloud,
        error: null,
      });

      // Store last sync time
      localStorage.setItem('yfs-last-sync', Date.now().toString());

      console.log('[useReminderSync] Sync complete:', {
        fromCloud: `${result.fromCloud.synced} items (${result.fromCloud.created} created, ${result.fromCloud.updated} updated)`,
        toCloud: `${result.toCloud.synced} items (${result.toCloud.created} created, ${result.toCloud.updated} updated)`,
      });

      // Notify callback if data was synced from cloud
      if (result.fromCloud.synced > 0 && onSyncCompleteRef.current) {
        onSyncCompleteRef.current();
      }
    } catch (err) {
      console.error('[useReminderSync] Sync failed:', err);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      }));
    } finally {
      syncInProgressRef.current = false;
    }
  }, [user, saveLocalReminder]);

  // Auto-sync on mount and when user changes
  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      // Reset sync state when user logs out
      hasSyncedRef.current = false;
      return;
    }

    // Check if we've synced recently (within last 30 seconds for same session)
    // But always sync on fresh login
    const lastSync = localStorage.getItem('yfs-last-sync');
    const lastSyncUserId = localStorage.getItem('yfs-last-sync-user');
    const thirtySecondsAgo = Date.now() - 30 * 1000;

    // If different user or first sync, always sync
    const isNewUser = lastSyncUserId !== user.id;
    const recentSync = lastSync && parseInt(lastSync, 10) > thirtySecondsAgo;

    if (!isNewUser && recentSync && hasSyncedRef.current) {
      console.log('[useReminderSync] Skipping auto-sync - synced recently');
      return;
    }

    // Perform initial sync with a small delay to let the app initialize
    const timer = setTimeout(() => {
      console.log('[useReminderSync] Starting auto-sync on app load for user:', user.id);
      hasSyncedRef.current = true;
      localStorage.setItem('yfs-last-sync-user', user.id);
      performSync();
    }, isNewUser ? 500 : 1000); // Faster sync for new user login

    return () => clearTimeout(timer);
  }, [user, performSync]);

  // Re-sync when refreshTrigger changes (after creating/editing reminders)
  useEffect(() => {
    if (!user || !isSupabaseConfigured || refreshTrigger === undefined || refreshTrigger === 0) {
      return;
    }

    // Debounce sync after changes
    const timer = setTimeout(() => {
      console.log('[useReminderSync] Syncing after changes');
      performSync();
    }, 2000);

    return () => clearTimeout(timer);
  }, [refreshTrigger, user, performSync]);

  // Manual sync function for user-triggered sync
  const manualSync = useCallback(async () => {
    hasSyncedRef.current = true; // Mark as synced
    await performSync();
  }, [performSync]);

  return {
    syncStatus,
    manualSync,
    isSyncing: syncStatus.isSyncing,
  };
}
