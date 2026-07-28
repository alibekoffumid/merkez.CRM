-- Add columns for BEFORE and AFTER photos in warehouse_repairs
ALTER TABLE public.warehouse_repairs
ADD COLUMN IF NOT EXISTS photo_before TEXT,
ADD COLUMN IF NOT EXISTS photo_after TEXT;

-- Enable Public read access to warehouse_repairs (so receipts can be viewed without logging in)
-- Since they have an ID (UUID) which is hard to guess, viewing by ID is secure enough for receipts.
CREATE POLICY "Allow public read access for receipts by ID"
ON public.warehouse_repairs
FOR SELECT
USING (true);

-- Create a storage bucket for repair photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('repairs', 'repairs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Storage Policies for 'repairs' bucket

-- 1. Allow public to view (read) images in the repairs bucket
CREATE POLICY "Public Access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'repairs');

-- 2. Allow authenticated users to upload (insert) images
CREATE POLICY "Authenticated Users can upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'repairs' 
  AND auth.role() = 'authenticated'
);

-- 3. Allow authenticated users to update their uploaded images
CREATE POLICY "Authenticated Users can update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'repairs'
  AND auth.role() = 'authenticated'
);

-- 4. Allow authenticated users to delete images
CREATE POLICY "Authenticated Users can delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'repairs'
  AND auth.role() = 'authenticated'
);
