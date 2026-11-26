-- Migration: Add auto_send_order to warehouses table
-- Allows configuring whether sales made at this store/warehouse automatically queue an assembly sheet to print_jobs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warehouses' AND column_name = 'auto_send_order'
    ) THEN
        ALTER TABLE warehouses ADD COLUMN auto_send_order BOOLEAN DEFAULT true;
    END IF;
END $$;

UPDATE warehouses SET auto_send_order = true WHERE auto_send_order IS NULL;
