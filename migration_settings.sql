-- ============================================================
-- SuperPlatform — Advanced Settings & Multi-Store Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Add JSONB columns to `profiles` to handle advanced configurations
-- We use JSONB to avoid creating 5+ new relationship tables for sub-features

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_details      JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stores                JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_options      JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS privacy_settings      JSONB DEFAULT '{"disable_chats": false, "disable_feedback": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"email_marketing": true, "email_messages": true, "sms_alerts": false}'::jsonb;

-- Ensure provider_profiles also has the new business JSONs in case it diverges in the future
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS business_details      JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stores                JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_options      JSONB DEFAULT '[]'::jsonb;

SELECT 'Advanced settings migration complete ✓' AS status;
