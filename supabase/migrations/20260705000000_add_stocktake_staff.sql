-- Add checked_by, received_by, and handed_over_by columns to stocktakes
ALTER TABLE stocktakes ADD COLUMN IF NOT EXISTS checked_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE stocktakes ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE stocktakes ADD COLUMN IF NOT EXISTS handed_over_by UUID REFERENCES staff(id) ON DELETE SET NULL;
