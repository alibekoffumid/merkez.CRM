-- Table Merging Support
-- Allows linking a 'child' table to a 'master' table

-- Add self-referencing foreign key 'merged_id'
-- If merged_id is present, it means this table is part of a group led by the table with id = merged_id
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS merged_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL;

-- Comment for developer clarity
COMMENT ON COLUMN restaurant_tables.merged_id IS 'Points to the master table in a merged group. All tables in the group share the master tables active order.';
