-- Scanner Cart Events: Realtime bridge between mobile scanner and desktop POS
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS scanner_cart_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  business_id UUID NOT NULL,
  barcode TEXT NOT NULL,
  product_id UUID,
  product_name TEXT,
  price NUMERIC(10,2),
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'added', 'not_found')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE scanner_cart_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON scanner_cart_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own events"
  ON scanner_cart_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON scanner_cart_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON scanner_cart_events FOR DELETE
  USING (auth.uid() = user_id);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE scanner_cart_events;

-- Index for fast lookups
CREATE INDEX idx_scanner_cart_user_status ON scanner_cart_events(user_id, status);
CREATE INDEX idx_scanner_cart_business ON scanner_cart_events(business_id);

-- Add business_id to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN business_id UUID DEFAULT gen_random_uuid();
  END IF;
END $$;
