-- Migration 00016: E-taxes (E-kassa) Integration Setup

-- 1. Create E-taxes Settings Table
CREATE TABLE IF NOT EXISTS public.e_taxes_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    api_endpoint TEXT,
    merchant_id TEXT,
    terminal_id TEXT,
    api_key TEXT,
    shift_status TEXT CHECK (shift_status IN ('open', 'closed')) DEFAULT 'closed',
    last_shift_open_at TIMESTAMPTZ,
    last_shift_close_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id)
);

-- 2. Add Fiscal Columns to Orders Table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fiscal_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fiscal_status TEXT CHECK (fiscal_status IN ('pending', 'success', 'error', 'refunded')) DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('cash', 'card', 'bonus')) DEFAULT 'cash';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fiscal_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fiscal_print_url TEXT;

-- 3. Enable RLS for Settings
ALTER TABLE public.e_taxes_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own e-taxes settings" 
ON public.e_taxes_settings 
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. Trigger for updated_at
CREATE TRIGGER on_e_taxes_settings_updated
    BEFORE UPDATE ON public.e_taxes_settings
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 5. Comments for Documentation
COMMENT ON TABLE public.e_taxes_settings IS 'Stores API configuration for fiscal integration (e-kassa/e-taxes).';
COMMENT ON COLUMN public.orders.fiscal_id IS 'Transaction ID from the fiscal operator API.';
