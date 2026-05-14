import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Box, Scale, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import Dropdown from '../../components/Common/Dropdown';

const EditIngredientModal = ({ isOpen, ingredient, onClose, onIngredientUpdated }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg',
    quantity: '',
    min_quantity: '10',
    cost_price: ''
  });

  const [availableUnits, setAvailableUnits] = useState(['kg', 'g', 'liter', 'ml', 'pcs', 'pack', 'bottle', 'm', 'm2']);

  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name,
        unit: ingredient.unit,
        quantity: ingredient.quantity.toString(),
        min_quantity: ingredient.min_quantity.toString(),
        cost_price: ingredient.cost_price.toString()
      });
      
      const saved = localStorage.getItem('merkez_warehouse_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.availableUnits && parsed.availableUnits.length > 0) {
            setAvailableUnits(parsed.availableUnits);
          }
        } catch (e) {}
      }
    }
  }, [ingredient, isOpen]);

  if (!isOpen || !ingredient) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.quantity || !formData.cost_price) return;

    setLoading(true);
    const { error } = await supabase
      .from('ingredients')
      .update({
        name: formData.name,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity),
        min_quantity: parseFloat(formData.min_quantity || 0),
        cost_price: parseFloat(formData.cost_price)
      })
      .eq('id', ingredient.id);

    if (!error) {
      // Log adjustment if quantity changed
      if (parseFloat(formData.quantity) !== ingredient.quantity) {
        await supabase.from('warehouse_transactions').insert([{
          ingredient_id: ingredient.id,
          type: 'adjust',
          quantity: parseFloat(formData.quantity) - ingredient.quantity,
          notes: 'Manual stock adjustment'
        }]);
      }

      onIngredientUpdated();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Box className="w-5 h-5 mr-2 text-merkez-green" />
            {t('warehouse.editIngredient')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('warehouse.thName')}</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-merkez-green focus:ring-1 focus:ring-merkez-green transition-all"
              placeholder={t('warehouse.ingredientNamePlaceholder')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('warehouse.thUnit')}</label>
              <Dropdown 
                value={formData.unit}
                onChange={val => setFormData({ ...formData, unit: val })}
                options={availableUnits.map(u => ({ value: u, label: t('restaurant.' + u) || u }))}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('warehouse.thStock')}</label>
              <div className="relative">
                <Scale className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.001"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-merkez-green transition-all"
                  placeholder="0.000"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('warehouse.thCostPrice')}</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-merkez-green transition-all"
                  placeholder="0.00"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('warehouse.minStockAlert')}</label>
              <div className="relative">
                <AlertCircle className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.001"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-merkez-green transition-all"
                  placeholder="10.000"
                  value={formData.min_quantity}
                  onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-merkez-green text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-all shadow-md flex items-center justify-center disabled:opacity-50"
            >
              {loading ? <Box className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              {t('common.update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditIngredientModal;
