import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const EditProductModal = ({ isOpen, onClose, product, categories, onProductUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', category_id: '' });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        price: product.price || '',
        category_id: product.category_id || ''
      });
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    setLoading(true);

    const { error } = await supabase
      .from('products')
      .update({
        name: formData.name,
        price: parseFloat(formData.price),
        category_id: formData.category_id || null
      })
      .eq('id', product.id);

    setLoading(false);
    if (!error) {
      onProductUpdated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Edit Product</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors shadow-sm text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors shadow-sm text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
              <select
                value={formData.category_id}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors shadow-sm text-sm"
              >
                <option value="">No Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100 mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 text-sm font-bold text-white bg-merkez-blue rounded-lg hover:bg-blue-600 transition-colors shadow-md flex items-center">
              {loading ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
