-- 1. Update the existing staff table
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS salary_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS salary_type VARCHAR(50) DEFAULT 'monthly'; -- 'daily', 'weekly', 'monthly'
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS auto_salary BOOLEAN DEFAULT false;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS last_accrual_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;

-- 2. Create the staff_transactions table
CREATE TABLE IF NOT EXISTS public.staff_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id), -- Admin who owns the staff
    type VARCHAR(50) NOT NULL, -- 'salary', 'bonus', 'withdrawal'
    amount DECIMAL(10,2) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- 3. Enable RLS
ALTER TABLE public.staff_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for staff_transactions
-- Admin can manage transactions for their own staff
CREATE POLICY "Users can manage staff transactions for their own account" 
ON public.staff_transactions 
FOR ALL 
USING (user_id = auth.uid());

-- 5. Trigger to update balance on staff table automatically when a transaction is added/deleted
CREATE OR REPLACE FUNCTION update_staff_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'withdrawal' THEN
            UPDATE public.staff SET balance = COALESCE(balance, 0) - NEW.amount WHERE id = NEW.staff_id;
        ELSE
            UPDATE public.staff SET balance = COALESCE(balance, 0) + NEW.amount WHERE id = NEW.staff_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.type = 'withdrawal' THEN
            UPDATE public.staff SET balance = COALESCE(balance, 0) + OLD.amount WHERE id = OLD.staff_id;
        ELSE
            UPDATE public.staff SET balance = COALESCE(balance, 0) - OLD.amount WHERE id = OLD.staff_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_staff_balance_trigger ON public.staff_transactions;
CREATE TRIGGER update_staff_balance_trigger
AFTER INSERT OR DELETE ON public.staff_transactions
FOR EACH ROW
EXECUTE FUNCTION update_staff_balance();
