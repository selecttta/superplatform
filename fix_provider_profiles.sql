-- Run this in Supabase SQL Editor if Provider Dashboard Onboarding is failing silently!

CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_phone TEXT NOT NULL,
  service_areas TEXT[] DEFAULT '{}',
  category TEXT,
  categories TEXT[] DEFAULT '{}',
  description TEXT,
  starting_price DECIMAL(12,2),
  id_document_url TEXT,
  business_registration_url TEXT,
  profile_picture_url TEXT,
  onboarding_submitted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'provider_profiles_select') THEN
    CREATE POLICY "provider_profiles_select" ON public.provider_profiles FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'provider_profiles_insert') THEN
    CREATE POLICY "provider_profiles_insert" ON public.provider_profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'provider_profiles_update') THEN
    CREATE POLICY "provider_profiles_update" ON public.provider_profiles FOR UPDATE USING (auth.uid() = id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;
