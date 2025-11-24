-- Yrfrsf Database Schema for Supabase
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- REMINDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  why TEXT,
  time TEXT NOT NULL, -- HH:MM format
  next_trigger BIGINT NOT NULL,
  repeat TEXT NOT NULL DEFAULT 'once', -- 'once', 'daily', 'weekly', 'custom'
  days_of_week INTEGER[], -- For custom repeat: [0,1,2,3,4,5,6] (Sun-Sat)
  active BOOLEAN NOT NULL DEFAULT true,
  audio_recording TEXT, -- Base64 encoded audio
  use_custom_audio BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Users can only access their own reminders
CREATE POLICY "Users can view own reminders" ON public.reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders" ON public.reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" ON public.reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" ON public.reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_next_trigger ON public.reminders(next_trigger);
CREATE INDEX idx_reminders_active ON public.reminders(active);

-- ============================================================================
-- CALL HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.call_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  reminder_title TEXT NOT NULL,
  reminder_why TEXT,
  timestamp BIGINT NOT NULL,
  answered BOOLEAN NOT NULL DEFAULT false,
  answered_at BIGINT,
  ended_at BIGINT,
  duration BIGINT, -- in milliseconds
  voice_played BOOLEAN NOT NULL DEFAULT false,
  voice_played_successfully BOOLEAN,
  recall_attempt INTEGER DEFAULT 1,
  task_completed BOOLEAN,
  task_completed_at BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Users can only access their own call history
CREATE POLICY "Users can view own call history" ON public.call_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own call history" ON public.call_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own call history" ON public.call_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own call history" ON public.call_history
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_call_history_user_id ON public.call_history(user_id);
CREATE INDEX idx_call_history_timestamp ON public.call_history(timestamp);

-- ============================================================================
-- COMPLETION PROMPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.completion_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  reminder_title TEXT NOT NULL,
  reminder_why TEXT,
  call_history_id UUID REFERENCES public.call_history(id) ON DELETE SET NULL,
  prompted_at BIGINT NOT NULL,
  responded_at BIGINT,
  completed BOOLEAN NOT NULL DEFAULT false,
  skipped BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.completion_prompts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own completion prompts
CREATE POLICY "Users can view own completion prompts" ON public.completion_prompts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completion prompts" ON public.completion_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completion prompts" ON public.completion_prompts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own completion prompts" ON public.completion_prompts
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_completion_prompts_user_id ON public.completion_prompts(user_id);

-- ============================================================================
-- USER SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_enabled BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  ringtone TEXT NOT NULL DEFAULT 'chimes',
  auto_recall_enabled BOOLEAN NOT NULL DEFAULT true,
  max_recall_attempts INTEGER NOT NULL DEFAULT 0,
  tts_provider TEXT NOT NULL DEFAULT 'browser', -- 'browser' or 'openai'
  browser_voice TEXT,
  browser_rate DECIMAL NOT NULL DEFAULT 1.0,
  browser_pitch DECIMAL NOT NULL DEFAULT 1.0,
  openai_voice TEXT DEFAULT 'nova',
  panic_audio TEXT, -- Base64 encoded audio
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- ============================================================================
-- USER PROFILES TABLE (extends auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile and settings on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );

  -- Create default settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
