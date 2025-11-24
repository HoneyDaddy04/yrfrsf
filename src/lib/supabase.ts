import { createClient } from '@supabase/supabase-js';

// These will be replaced with your actual Supabase credentials
// Get them from: https://supabase.com/dashboard/project/_/settings/api
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for TypeScript
export interface DbReminder {
  id: string;
  user_id: string;
  title: string;
  why: string;
  time: string;
  next_trigger: number;
  repeat: 'once' | 'daily' | 'weekly' | 'custom';
  days_of_week?: number[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCallHistory {
  id: string;
  user_id: string;
  reminder_id: string;
  reminder_title: string;
  reminder_why: string;
  timestamp: number;
  answered: boolean;
  answered_at?: number;
  ended_at?: number;
  duration?: number;
  voice_played: boolean;
  voice_played_successfully?: boolean;
  recall_attempt?: number;
  task_completed?: boolean;
  task_completed_at?: number;
}

export interface DbUserSettings {
  id: string;
  user_id: string;
  api_key_encrypted?: string; // We'll store encrypted or not at all
  voice_enabled: boolean;
  notifications_enabled: boolean;
  ringtone: string;
  auto_recall_enabled: boolean;
  max_recall_attempts: number;
  tts_provider: 'browser' | 'openai';
  browser_voice?: string;
  browser_rate: number;
  browser_pitch: number;
  openai_voice: string;
  panic_audio?: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}
