-- Add is_hidden column to retail_sales to support hiding transactions from history
ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Update RLS if needed (usually not needed if we just want to filter in UI)
-- But for better security/logic, we can keep it as is and just filter in the app.
