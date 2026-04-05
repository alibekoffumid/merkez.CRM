-- Automated Stock Deduction Trigger
-- Deducts ingredients from 'ingredients' table when a new 'order_items' record is created

CREATE OR REPLACE FUNCTION deduct_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
  recipe_record RECORD;
BEGIN
  -- 1. Find all ingredients associated with the ordered product
  FOR recipe_record IN 
    SELECT ingredient_id, quantity 
    FROM product_recipes 
    WHERE product_id = NEW.product_id
  LOOP
    -- 2. Update the ingredient quantity
    UPDATE ingredients 
    SET quantity = quantity - (recipe_record.quantity * NEW.quantity)
    WHERE id = recipe_record.ingredient_id;

    -- 3. Log the transaction for historical tracking
    INSERT INTO warehouse_transactions (ingredient_id, type, quantity, notes)
    VALUES (
      recipe_record.ingredient_id, 
      'out', 
      (recipe_record.quantity * NEW.quantity), 
      'Automatic deduction for Order Item: ' || NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_deduct_stock_on_order ON order_items;
CREATE TRIGGER tr_deduct_stock_on_order
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION deduct_stock_on_order();
