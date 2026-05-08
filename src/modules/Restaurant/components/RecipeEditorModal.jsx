import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Plus, Trash2, Search, Utensils, Scale, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const RecipeEditorModal = ({ isOpen, product, onClose, onRecipeUpdated }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [ingredients, setIngredients] = useState([]); // All available ingredients
  const [recipeItems, setRecipeItems] = useState([]); // Current recipe items
  const [searchTerm, setSearchTerm] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      fetchData();
    }
  }, [isOpen, product]);

  const fetchData = async () => {
    setFetching(true);
    // Fetch all ingredients for the dropdown/search
    const { data: allIng } = await supabase.from('ingredients').select('*').order('name');
    if (allIng) setIngredients(allIng);

    // Fetch existing recipe for this product
    const { data: existingRecipe } = await supabase
      .from('product_recipes')
      .select('*, ingredients(name, unit, cost_price, quantity)')
      .eq('product_id', product.id);
    
    if (existingRecipe) {
      setRecipeItems(existingRecipe.map(item => ({
        id: item.id,
        ingredient_id: item.ingredient_id,
        name: item.ingredients.name,
        unit: item.ingredients.unit,
        cost_per_unit: item.ingredients.cost_price,
        stock: item.ingredients.quantity,
        quantity: item.quantity
      })));
    } else {
      setRecipeItems([]);
    }
    setFetching(false);
  };

  const addIngredient = (ing) => {
    if (recipeItems.find(item => item.ingredient_id === ing.id)) return;
    setRecipeItems([...recipeItems, {
      ingredient_id: ing.id,
      name: ing.name,
      unit: ing.unit,
      cost_per_unit: ing.cost_price,
      stock: ing.quantity,
      quantity: 0
    }]);
    setSearchTerm('');
  };

  const removeIngredient = (ingredientId) => {
    setRecipeItems(recipeItems.filter(item => item.ingredient_id !== ingredientId));
  };

  const updateQuantity = (ingredientId, qty) => {
    setRecipeItems(recipeItems.map(item => 
      item.ingredient_id === ingredientId ? { ...item, quantity: parseFloat(qty) || 0 } : item
    ));
  };

  const totalPrice = recipeItems.reduce((sum, item) => sum + (item.cost_per_unit * item.quantity), 0);

  const validItems = recipeItems.filter(item => item.quantity > 0);
  const maxPortions = validItems.length > 0
    ? Math.floor(Math.min(...validItems.map(item => (item.stock || 0) / item.quantity)))
    : 0;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Delete existing recipe items
      await supabase.from('product_recipes').delete().eq('product_id', product.id);

      // Insert new recipe items
      const newItems = recipeItems.map(item => ({
        product_id: product.id,
        ingredient_id: item.ingredient_id,
        quantity: item.quantity
      }));

      if (newItems.length > 0) {
        const { error } = await supabase.from('product_recipes').insert(newItems);
        if (error) throw error;
      }

      onRecipeUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const filteredIngredients = ingredients.filter(ing => 
    ing.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    !recipeItems.find(ri => ri.ingredient_id === ing.id)
  );

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <Utensils className="w-5 h-5 mr-2 text-merkez-blue" />
              {t('restaurant.editRecipe')}: {product.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{t('restaurant.recipeSubtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Ingredient Search */}
          <div className="relative">
            <label className="block text-sm font-bold text-gray-700 mb-2">{t('restaurant.addIngredient')}</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-merkez-blue transition-all"
                placeholder={t('restaurant.searchIngredientsPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
              />
            </div>
            {(searchTerm || isInputFocused) && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                {filteredIngredients.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">{t('common.noResults')}</div>
                ) : (
                  filteredIngredients.map(ing => (
                    <button
                      key={ing.id}
                      onClick={() => addIngredient(ing)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex justify-between items-center"
                    >
                      <span className="font-medium text-gray-900">{ing.name}</span>
                      <span className="text-xs text-gray-400">{ing.unit}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Recipe Items List */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex justify-between">
              {t('restaurant.recipeIngredients')}
              <span className="text-merkez-blue">{recipeItems.length} {t('restaurant.items')}</span>
            </h4>

            {fetching ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-200" /></div>
            ) : recipeItems.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400">
                <Utensils className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">{t('restaurant.noRecipeItems')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recipeItems.map(item => (
                  <div key={item.ingredient_id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        ${item.cost_per_unit.toFixed(2)} / {item.unit} &bull; {t('warehouse.inStock') || 'Stock'}: {parseFloat(item.stock || 0).toFixed(2)} {item.unit}
                      </p>
                    </div>
                    <div className="w-32 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.001"
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-merkez-blue"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.ingredient_id, e.target.value)}
                      />
                      <span className="text-xs text-gray-400 w-8">{item.unit}</span>
                    </div>
                    <div className="w-24 text-right">
                      <p className="text-sm font-bold text-gray-900">${(item.cost_per_unit * item.quantity).toFixed(2)}</p>
                    </div>
                    <button onClick={() => removeIngredient(item.ingredient_id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Calculations */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">{t('restaurant.sellingPrice')}</p>
                <div className="flex items-center text-lg font-bold text-gray-900">
                  <DollarSign className="w-4 h-4 mr-0.5 text-gray-400" />
                  {parseFloat(product.price).toFixed(2)}
                </div>
              </div>
              <div>
                <p className="text-xs text-merkez-blue uppercase font-bold mb-1">{t('restaurant.foodCost')}</p>
                <div className="flex items-center text-lg font-bold text-merkez-blue">
                   <DollarSign className="w-4 h-4 mr-0.5 text-blue-300" />
                   {totalPrice.toFixed(2)}
                </div>
              </div>
              <div>
                <p className="text-xs text-merkez-green uppercase font-bold mb-1">{t('restaurant.margin')}</p>
                <div className="flex items-center text-lg font-bold text-merkez-green">
                   {((parseFloat(product.price) - totalPrice) / parseFloat(product.price) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="pl-4 border-l border-gray-200">
                <p className="text-xs text-orange-500 uppercase font-bold mb-1">{t('restaurant.maxPortions') || 'Max Portions'}</p>
                <div className="flex items-center text-lg font-bold text-orange-600">
                   {maxPortions}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-white transition-all shadow-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || recipeItems.length === 0}
              className="flex-[2] px-6 py-3 bg-merkez-blue text-white rounded-xl text-sm font-extrabold hover:bg-blue-600 transition-all shadow-md flex items-center justify-center disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2 shrink-0" /> : <Save className="w-5 h-5 mr-2 shrink-0" />}
              <span className="truncate">{t('restaurant.saveRecipe')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeEditorModal;
