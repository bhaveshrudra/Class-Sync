-- Migration 00005: Supabase Storage Configuration & Policies for Academic Attachments

-- 1. Create the academic-attachments bucket if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'academic-attachments',
  'academic-attachments',
  true,
  10485760, -- 10 MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ]::text[];

-- 2. Storage Policies on storage.objects

-- Allow public read access to academic attachments
DROP POLICY IF EXISTS "Public and students can view academic attachments" ON storage.objects;
CREATE POLICY "Public and students can view academic attachments"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'academic-attachments' );

-- Allow authenticated Admins to upload attachments
DROP POLICY IF EXISTS "Admins can upload academic attachments" ON storage.objects;
CREATE POLICY "Admins can upload academic attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'academic-attachments'
    AND public.is_admin()
  );

-- Allow authenticated Admins to update attachments
DROP POLICY IF EXISTS "Admins can update academic attachments" ON storage.objects;
CREATE POLICY "Admins can update academic attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'academic-attachments'
    AND public.is_admin()
  );

-- Allow authenticated Admins to delete attachments
DROP POLICY IF EXISTS "Admins can delete academic attachments" ON storage.objects;
CREATE POLICY "Admins can delete academic attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'academic-attachments'
    AND public.is_admin()
  );
