-- Add custom_channels column to profiles table
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS custom_channels JSONB DEFAULT '[]'::jsonb;

-- Optional: Grant access via RLS (if RLS is enabled on profiles)
-- Users can only update their own profile
CREATE POLICY IF NOT EXISTS "Users can update own custom_channels"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
