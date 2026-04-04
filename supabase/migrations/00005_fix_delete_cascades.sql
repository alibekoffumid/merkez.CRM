-- Update FK constraints to allow cascade deletion for easier management during dev
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
