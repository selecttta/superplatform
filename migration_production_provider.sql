-- ============================================================
-- SuperPlatform — Production Provider Workflow Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Provider document columns
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS id_document_url          text,
  ADD COLUMN IF NOT EXISTS business_registration_url text,
  ADD COLUMN IF NOT EXISTS profile_picture_url       text,
  ADD COLUMN IF NOT EXISTS categories                text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_submitted_at   timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason          text;

-- 2. Ban columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text;

-- 3. Moderation status on services and products
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'pending_review';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'pending_review';

-- 4. Storage buckets (documents + avatars)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', false, 10485760,
   ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('avatars', 'avatars', true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 5. Storage RLS policies
DO $$ BEGIN

  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
    AND policyname='Owner can upload documents') THEN
    CREATE POLICY "Owner can upload documents" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
    AND policyname='Owner can read their documents') THEN
    CREATE POLICY "Owner can read their documents" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'documents' AND (
          auth.uid()::text = (storage.foldername(name))[1]
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
    AND policyname='Public can read avatars') THEN
    CREATE POLICY "Public can read avatars" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
    AND policyname='Owner can upload avatar') THEN
    CREATE POLICY "Owner can upload avatar" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

END $$;

SELECT 'Migration complete ✓' AS status;
