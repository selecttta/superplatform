-- Run this in Supabase SQL Editor to make sure all columns are actually added to profiles!

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trips_completed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jobs_completed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_plate TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_color TEXT,
  ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS current_lng DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS id_type TEXT,
  ADD COLUMN IF NOT EXISTS id_number TEXT,
  ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paystack_customer_id TEXT;

-- Reload the schema cache for PostgREST (Fixes the "schema cache" error)
NOTIFY pgrst, 'reload schema';
