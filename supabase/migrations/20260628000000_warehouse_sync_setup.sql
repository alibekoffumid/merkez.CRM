-- Migration: 20260628000000_warehouse_sync_setup.sql
-- Setup replication sync queue, triggers, and alter tables for loop avoidance.

-- 1. Create the sync_queue table
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  record_id UUID NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ
);

-- Index for performance when polling unsynced entries
CREATE INDEX IF NOT EXISTS idx_sync_queue_unsynced ON sync_queue (created_at) WHERE synced_at IS NULL;

-- 2. Alter existing Warehouse tables to support updated_at and is_deleted (soft delete)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE product_recipes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE product_recipes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE stock_receipts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE stock_receipts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 3. Create helper function to automatically refresh updated_at column on update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers (drop if exists to be safe and idempotent)
DROP TRIGGER IF EXISTS set_updated_at_categories ON categories;
CREATE TRIGGER set_updated_at_categories BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_products ON products;
CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_ingredients ON ingredients;
CREATE TRIGGER set_updated_at_ingredients BEFORE UPDATE ON ingredients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_product_recipes ON product_recipes;
CREATE TRIGGER set_updated_at_product_recipes BEFORE UPDATE ON product_recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_suppliers ON suppliers;
CREATE TRIGGER set_updated_at_suppliers BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_stock_receipts ON stock_receipts;
CREATE TRIGGER set_updated_at_stock_receipts BEFORE UPDATE ON stock_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Create the core replication logging trigger function with loop prevention
CREATE OR REPLACE FUNCTION log_sync_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If app.current_sync is set to 'true', the write is coming from the sync agent.
  -- Do not log it into the queue to prevent infinite feedback loops.
  IF current_setting('app.current_sync', true) = 'true' THEN
    IF (TG_OP = 'DELETE') THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO sync_queue(table_name, action, record_id, payload)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, jsonb_build_object('id', OLD.id));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO sync_queue(table_name, action, record_id, payload)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO sync_queue(table_name, action, record_id, payload)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach replication triggers to each Warehouse table
DROP TRIGGER IF EXISTS sync_trigger_categories ON categories;
CREATE TRIGGER sync_trigger_categories AFTER INSERT OR UPDATE OR DELETE ON categories FOR EACH ROW EXECUTE FUNCTION log_sync_change();

DROP TRIGGER IF EXISTS sync_trigger_products ON products;
CREATE TRIGGER sync_trigger_products AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION log_sync_change();

DROP TRIGGER IF EXISTS sync_trigger_ingredients ON ingredients;
CREATE TRIGGER sync_trigger_ingredients AFTER INSERT OR UPDATE OR DELETE ON ingredients FOR EACH ROW EXECUTE FUNCTION log_sync_change();

DROP TRIGGER IF EXISTS sync_trigger_product_recipes ON product_recipes;
CREATE TRIGGER sync_trigger_product_recipes AFTER INSERT OR UPDATE OR DELETE ON product_recipes FOR EACH ROW EXECUTE FUNCTION log_sync_change();

DROP TRIGGER IF EXISTS sync_trigger_suppliers ON suppliers;
CREATE TRIGGER sync_trigger_suppliers AFTER INSERT OR UPDATE OR DELETE ON suppliers FOR EACH ROW EXECUTE FUNCTION log_sync_change();

DROP TRIGGER IF EXISTS sync_trigger_stock_receipts ON stock_receipts;
CREATE TRIGGER sync_trigger_stock_receipts AFTER INSERT OR UPDATE OR DELETE ON stock_receipts FOR EACH ROW EXECUTE FUNCTION log_sync_change();
