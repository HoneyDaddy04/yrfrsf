// Supabase Sync Service - Handles syncing reminders and real-time notifications
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Reminder } from '../utils/reminderScheduler';

// Types for Supabase tables
export interface DbReminder {
  id: string;
  user_id: string;
  title: string;
  why: string | null;
  time: string;
  next_trigger: number;
  repeat: string;
  days_of_week: number[] | null;
  custom_interval: number | null;
  specific_times: string[] | null;
  active: boolean;
  audio_recording: string | null;
  use_custom_audio: boolean;
  created_at: string;
  updated_at: string;
  // Recipient fields
  recipient_id: string | null;
  recipient_email: string | null;
  is_for_self: boolean;
  sender_name: string | null;
}

export interface PendingCall {
  id: string;
  reminder_id: string | null;
  sender_id: string;
  recipient_id: string;
  sender_name: string | null;
  sender_email: string | null;
  reminder_title: string;
  reminder_why: string | null;
  audio_recording: string | null;
  use_custom_audio: boolean;
  triggered_at: number;
  status: 'pending' | 'delivered' | 'answered' | 'missed' | 'expired';
  answered_at: number | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string | null;
  nickname: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

// Convert local Reminder to DB format
function toDbReminder(reminder: Reminder, userId: string, recipientId?: string, recipientEmail?: string, senderName?: string): Omit<DbReminder, 'created_at' | 'updated_at'> {
  return {
    id: reminder.id,
    user_id: userId,
    title: reminder.title,
    why: reminder.why || null,
    time: reminder.time,
    next_trigger: reminder.nextTrigger,
    repeat: reminder.repeat,
    days_of_week: reminder.daysOfWeek || null,
    custom_interval: reminder.customInterval || null,
    specific_times: reminder.specificTimes || null,
    active: reminder.active,
    audio_recording: reminder.audioRecording || null,
    use_custom_audio: reminder.useCustomAudio || false,
    recipient_id: recipientId || null,
    recipient_email: recipientEmail || null,
    is_for_self: !recipientId && !recipientEmail,
    sender_name: senderName || null,
  };
}

// Convert DB Reminder to local format
function fromDbReminder(dbReminder: DbReminder): Reminder & { recipientId?: string; recipientEmail?: string; isForSelf?: boolean; senderName?: string } {
  return {
    id: dbReminder.id,
    title: dbReminder.title,
    why: dbReminder.why || '',
    time: dbReminder.time,
    nextTrigger: dbReminder.next_trigger,
    repeat: dbReminder.repeat as Reminder['repeat'],
    daysOfWeek: dbReminder.days_of_week || undefined,
    customInterval: dbReminder.custom_interval || undefined,
    specificTimes: dbReminder.specific_times || undefined,
    active: dbReminder.active,
    createdAt: new Date(dbReminder.created_at).getTime(),
    audioRecording: dbReminder.audio_recording || undefined,
    useCustomAudio: dbReminder.use_custom_audio || false,
    recipientId: dbReminder.recipient_id || undefined,
    recipientEmail: dbReminder.recipient_email || undefined,
    isForSelf: dbReminder.is_for_self,
    senderName: dbReminder.sender_name || undefined,
  };
}

// ============================================================================
// REMINDER SYNC OPERATIONS
// ============================================================================

/**
 * Save a reminder to Supabase
 */
export async function saveReminderToSupabase(
  reminder: Reminder,
  userId: string,
  recipientId?: string,
  recipientEmail?: string,
  senderName?: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { error: null }; // Silent fail if not configured
  }

  try {
    const dbReminder = toDbReminder(reminder, userId, recipientId, recipientEmail, senderName);

    const { error } = await supabase
      .from('reminders')
      .upsert(dbReminder, { onConflict: 'id' });

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Failed to save reminder to Supabase:', err);
    return { error: err as Error };
  }
}

/**
 * Get all reminders for a user (created by them)
 */
export async function getUserReminders(userId: string): Promise<Reminder[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('is_for_self', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(fromDbReminder);
  } catch (err) {
    console.error('Failed to fetch reminders from Supabase:', err);
    return [];
  }
}

/**
 * Get reminders sent to a user (from others)
 */
export async function getReceivedReminders(userId: string): Promise<Reminder[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(fromDbReminder);
  } catch (err) {
    console.error('Failed to fetch received reminders:', err);
    return [];
  }
}

/**
 * Delete a reminder from Supabase
 */
export async function deleteReminderFromSupabase(reminderId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) return { error: null };

  try {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Failed to delete reminder from Supabase:', err);
    return { error: err as Error };
  }
}

/**
 * Update a reminder in Supabase
 */
export async function updateReminderInSupabase(
  reminder: Reminder,
  userId: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) return { error: null };

  try {
    const { error } = await supabase
      .from('reminders')
      .update({
        title: reminder.title,
        why: reminder.why || null,
        time: reminder.time,
        next_trigger: reminder.nextTrigger,
        repeat: reminder.repeat,
        days_of_week: reminder.daysOfWeek || null,
        custom_interval: reminder.customInterval || null,
        specific_times: reminder.specificTimes || null,
        active: reminder.active,
        audio_recording: reminder.audioRecording || null,
        use_custom_audio: reminder.useCustomAudio || false,
      })
      .eq('id', reminder.id)
      .eq('user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Failed to update reminder in Supabase:', err);
    return { error: err as Error };
  }
}

// ============================================================================
// USER SEARCH OPERATIONS
// ============================================================================

/**
 * Search for a user by email
 */
export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .ilike('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    return data;
  } catch (err) {
    console.error('Failed to find user by email:', err);
    return null;
  }
}

/**
 * Search for users by email (partial match)
 */
export async function searchUsersByEmail(emailQuery: string, limit: number = 5): Promise<UserProfile[]> {
  if (!isSupabaseConfigured || emailQuery.length < 3) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .ilike('email', `%${emailQuery}%`)
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to search users:', err);
    return [];
  }
}

// ============================================================================
// PENDING CALLS OPERATIONS (for recipient notifications)
// ============================================================================

/**
 * Create a pending call for a recipient
 */
export async function createPendingCall(
  reminder: Reminder,
  senderId: string,
  recipientId: string,
  senderName: string,
  senderEmail: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) return { error: new Error('Supabase not configured') };

  try {
    const pendingCall: Omit<PendingCall, 'id' | 'created_at'> = {
      reminder_id: reminder.id,
      sender_id: senderId,
      recipient_id: recipientId,
      sender_name: senderName,
      sender_email: senderEmail,
      reminder_title: reminder.title,
      reminder_why: reminder.why || null,
      audio_recording: reminder.audioRecording || null,
      use_custom_audio: reminder.useCustomAudio || false,
      triggered_at: Date.now(),
      status: 'pending',
      answered_at: null,
    };

    const { error } = await supabase
      .from('pending_calls')
      .insert(pendingCall);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Failed to create pending call:', err);
    return { error: err as Error };
  }
}

/**
 * Get pending calls for current user
 */
export async function getPendingCalls(userId: string): Promise<PendingCall[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('pending_calls')
      .select('*')
      .eq('recipient_id', userId)
      .eq('status', 'pending')
      .order('triggered_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch pending calls:', err);
    return [];
  }
}

/**
 * Update pending call status
 */
export async function updatePendingCallStatus(
  callId: string,
  status: PendingCall['status'],
  answeredAt?: number
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) return { error: null };

  try {
    const updateData: Partial<PendingCall> = { status };
    if (answeredAt) updateData.answered_at = answeredAt;

    const { error } = await supabase
      .from('pending_calls')
      .update(updateData)
      .eq('id', callId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Failed to update pending call:', err);
    return { error: err as Error };
  }
}

// ============================================================================
// REAL-TIME SUBSCRIPTION
// ============================================================================

/**
 * Subscribe to pending calls for a user (real-time notifications)
 */
export function subscribeToPendingCalls(
  userId: string,
  onNewCall: (call: PendingCall) => void
): (() => void) | null {
  if (!isSupabaseConfigured) return null;

  const channel = supabase
    .channel('pending_calls_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'pending_calls',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        console.log('📞 New pending call received:', payload.new);
        onNewCall(payload.new as PendingCall);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================================
// CONTACTS OPERATIONS
// ============================================================================

/**
 * Get all contacts for a user
 */
export async function getContacts(userId: string): Promise<Contact[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('is_favorite', { ascending: false })
      .order('nickname', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch contacts:', err);
    return [];
  }
}

/**
 * Search contacts by nickname or email
 */
export async function searchContacts(userId: string, query: string): Promise<Contact[]> {
  if (!isSupabaseConfigured || query.length < 1) return [];

  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .or(`nickname.ilike.%${query}%,email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .order('is_favorite', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to search contacts:', err);
    return [];
  }
}

/**
 * Add a new contact
 */
export async function addContact(
  userId: string,
  contact: {
    nickname: string;
    email: string;
    full_name?: string;
    contact_user_id?: string;
    avatar_url?: string;
    notes?: string;
    is_favorite?: boolean;
  }
): Promise<{ contact: Contact | null; error: Error | null }> {
  if (!isSupabaseConfigured) return { contact: null, error: new Error('Supabase not configured') };

  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        nickname: contact.nickname,
        email: contact.email.toLowerCase(),
        full_name: contact.full_name || null,
        contact_user_id: contact.contact_user_id || null,
        avatar_url: contact.avatar_url || null,
        notes: contact.notes || null,
        is_favorite: contact.is_favorite || false,
      })
      .select()
      .single();

    if (error) throw error;
    return { contact: data, error: null };
  } catch (err) {
    console.error('Failed to add contact:', err);
    return { contact: null, error: err as Error };
  }
}

/**
 * Update a contact
 */
export async function updateContact(
  contactId: string,
  updates: Partial<Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) return { error: null };

  try {
    const { error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', contactId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Failed to update contact:', err);
    return { error: err as Error };
  }
}

/**
 * Delete a contact
 */
export async function deleteContact(contactId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) return { error: null };

  try {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Failed to delete contact:', err);
    return { error: err as Error };
  }
}

/**
 * Get contact by nickname
 */
export async function getContactByNickname(userId: string, nickname: string): Promise<Contact | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .ilike('nickname', nickname)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    return data;
  } catch (err) {
    console.error('Failed to get contact by nickname:', err);
    return null;
  }
}
