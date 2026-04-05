import { supabase } from '../supabaseClient';

export const InventoryService = {
  /**
   * Deducts ingredients from warehouse based on an order's items and their recipes.
   * @param {string} orderId - The UUID of the completed order.
   */
  deductIngredientsFromOrder: async (orderId) => {
    try {
      // 1. Fetch all items in this order
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (itemsError || !orderItems.length) return;

      // 2. For each product, fetch its recipe
      for (const item of orderItems) {
        const { data: recipeData } = await supabase
          .from('product_recipes')
          .select('ingredient_id, quantity')
          .eq('product_id', item.product_id);

        if (!recipeData || !recipeData.length) continue;

        // 3. Deduct each ingredient
        for (const recipeItem of recipeData) {
          const totalDeduction = recipeItem.quantity * item.quantity;
          
          // Get current stock to calculate new value (and for logging)
          const { data: ingredient } = await supabase
            .from('ingredients')
            .select('quantity')
            .eq('id', recipeItem.ingredient_id)
            .single();

          if (!ingredient) continue;

          const newQuantity = Math.max(0, ingredient.quantity - totalDeduction);

          // Update stock
          await supabase
            .from('ingredients')
            .update({ quantity: newQuantity })
            .eq('id', recipeItem.ingredient_id);

          // 4. Log transaction
          await supabase
            .from('warehouse_transactions')
            .insert([{
              ingredient_id: recipeItem.ingredient_id,
              type: 'out',
              quantity: totalDeduction,
              notes: `Order #${orderId.substring(0, 8)}`
            }]);
        }
      }
    } catch (error) {
      console.error('Inventory deduction failed:', error);
    }
  },

  /**
   * Checks if all items in a cart have enough ingredients available.
   * Returns a list of warnings if any ingredient is below min_quantity or will become negative.
   */
  checkStockAvailability: async (cart) => {
    const warnings = [];
    try {
      for (const cartItem of cart) {
        const { data: recipeData } = await supabase
          .from('product_recipes')
          .select('ingredient_id, quantity, ingredients(name, quantity, min_quantity, unit)')
          .eq('product_id', cartItem.id);

        if (!recipeData) continue;

        for (const recipeItem of recipeData) {
          const needed = recipeItem.quantity * cartItem.quantity;
          const current = recipeItem.ingredients.quantity;
          const min = recipeItem.ingredients.min_quantity;

          if (current < needed) {
            warnings.push(`${recipeItem.ingredients.name}: Out of stock (${current} ${recipeItem.ingredients.unit} left, need ${needed})`);
          } else if (current - needed < min) {
            warnings.push(`${recipeItem.ingredients.name}: Low stock warning (${(current - needed).toFixed(2)} ${recipeItem.ingredients.unit} remaining)`);
          }
        }
      }
    } catch (error) {
      console.error('Stock check failed:', error);
    }
    return warnings;
  }
};
