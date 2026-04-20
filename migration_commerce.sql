-- ============================================================
-- SuperPlatform — E-Commerce Wizard Upgrade
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Add jsonb details column to products to store brand, type, negotiation and dynamic delivery specs
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb;
  
-- 2. Create the marketplace bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('marketplace', 'marketplace', true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Storage RLS policies for marketplace 
DO $$ BEGIN

  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
    AND policyname='Public can read marketplace images') THEN
    CREATE POLICY "Public can read marketplace images" ON storage.objects
      FOR SELECT USING (bucket_id = 'marketplace');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
    AND policyname='Users can upload to marketplace') THEN
    CREATE POLICY "Users can upload to marketplace" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'marketplace'
      );
  END IF;

END $$;

SELECT 'E-Commerce Upgrade Migration complete ✓' AS status;
