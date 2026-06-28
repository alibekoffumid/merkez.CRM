ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{"operational_digest": true, "realtime_push": true, "community": false, "security": true}'::jsonb;
