-- Migration: Add custom repeat columns
-- This migration adds columns to support custom repeat options

-- Add custom_interval column (stores interval in milliseconds for "every X hours")
ALTER TABLE reminders
ADD COLUMN IF NOT EXISTS custom_interval BIGINT DEFAULT NULL;

-- Add specific_times column (stores array of time strings like ["09:00", "14:00"])
ALTER TABLE reminders
ADD COLUMN IF NOT EXISTS specific_times TEXT[] DEFAULT NULL;

-- Note: days_of_week column already exists from initial schema

-- Add comment for documentation
COMMENT ON COLUMN reminders.custom_interval IS 'Interval in milliseconds for custom repeat (e.g., every X hours)';
COMMENT ON COLUMN reminders.specific_times IS 'Array of specific times for daily reminders (e.g., ["09:00", "14:00", "18:00"])';
