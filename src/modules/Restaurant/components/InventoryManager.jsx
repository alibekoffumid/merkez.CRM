import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Search, Edit2, Trash2, AlertTriangle, 
  ArrowUpCircle, ArrowDownCircle, Loader2, 
  Package, Scale, DollarSign, History
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const InventoryManager = () => {
  const { t } = useTranslation();
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg',
    quantity: 0,
    min_quantity: 10,
    cost_price: 0
  });

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');
    
    if (data) setIngredients(data);
    setLoading(false);
  };

  const handleOpenModal = (ing = null) => {
    if (ing) {
      setEditingIngredient(ing);
      setFormData({
        name: ing.name,
        unit: ing.unit,
        quantity: ing.quantity,
        min_quantity: ing.min_quantity,
        cost_price: ing.cost_price
      });
    } else {
      setEditingIngredient(null);
      setFormData({
        name: '',
        unit: 'kg',
        quantity: 0,
        min_quantity: 10,
        cost_price: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingIngredient) {
        const { error } = await supabase
          .from('ingredients')
          .update(formData)
          .eq('id', editingIngredient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ingredients')
          .insert([formData]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      fetchIngredients();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      alert('Error saving ingredient');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('restaurant.deleteDishConfirm'))) return;
    
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);
    
    if (!error) fetchIngredients();
  };

  const filteredIngredients = ingredients.filter(ing => 
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('restaurant.searchIngredientsPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-merkez-blue transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full md:w-auto px-6 py-2.5 bg-merkez-blue text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center justify-center shadow-lg shadow-blue-200/50"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('restaurant.addIngredientBtn')}
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-merkez-blue">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('restaurant.ingredients')}</p>
            <p className="text-xl font-black text-gray-900">{ingredients.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('restaurant.lowStock')}</p>
            <p className="text-xl font-black text-gray-900">
              {ingredients.filter(ing => ing.quantity <= ing.min_quantity).length}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-merkez-green">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('restaurant.inventoryValue')}</p>
            <p className="text-xl font-black text-gray-900">
              ${ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_price), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('common.name')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('restaurant.stock')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('restaurant.unit')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('restaurant.cost')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('common.status')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-merkez-blue mx-auto" />
                  </td>
                </tr>
              ) : filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>{t('common.noData')}</p>
                  </td>
                </tr>
              ) : (
                filteredIngredients.map(ing => (
                  <tr key={ing.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{ing.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono font-bold ${ing.quantity <= ing.min_quantity ? 'text-red-500' : 'text-gray-900'}`}>
                          {parseFloat(ing.quantity).toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-400">/ {parseFloat(ing.min_quantity).toFixed(0)} min</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ing.unit}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">${parseFloat(ing.cost_price).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      {ing.quantity <= ing.min_quantity ? (
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-full flex items-center w-fit">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {t('restaurant.lowStock')}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-full w-fit">
                           OK
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleOpenModal(ing)}
                          className="p-2 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(ing.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                {editingIngredient ? t('common.edit') : t('common.add')} {t('restaurant.ingredient')}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('common.name')}</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-merkez-blue"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('restaurant.unit')}</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-merkez-blue"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                    <option value="pcs">pcs</option>
                    <option value="pack">pack</option>
                    <option value="gram">gram</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('restaurant.cost')}</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-merkez-blue"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('restaurant.stock')}</label>
                  <input
                    required
                    type="number"
                    step="0.001"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-merkez-blue"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('restaurant.minStock')}</label>
                  <input
                    required
                    type="number"
                    step="0.001"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-merkez-blue"
                    value={formData.min_quantity}
                    onChange={(e) => setFormData({...formData, min_quantity: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-merkez-blue text-white rounded-xl text-sm font-extrabold hover:bg-blue-600 transition-all shadow-md flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
