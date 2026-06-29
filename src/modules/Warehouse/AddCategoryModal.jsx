import React, { useState, useEffect } from 'react';
 import { useTranslation } from 'react-i18next';
 import { X, Plus, Save, FolderTree, Loader2 } from 'lucide-react'; 
import { supabase } from '../../supabaseClient';
import ModalPortal from '../../components/Common/ModalPortal';
import Dropdown from '../../components/Common/Dropdown';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';

import { formatCategoriesHierarchically } from './categoryUtils';

const AddCategoryModal = ({ isOpen, onClose, onCategoryAdded }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false); 
  const [formData, setFormData] = useState({ name: '', parent_id: '' }); 
  const [categories, setCategories] = useState([]);

  // Format categories for hierarchical dropdown
  const hierarchicalCategories = React.useMemo(() => 
    formatCategoriesHierarchically(categories), 
    [categories]
  );


  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('categories').select('id, name, parent_id').eq('user_id', profile.id);
    if (data) setCategories(data);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .insert([{ 
        name: formData.name.trim(),
        parent_id: formData.parent_id || null,
        user_id: profile?.id 
      }])
      .select();

    setLoading(false);
    if (error) {
      console.error('Error adding category:', error);
      toast.error(error.message);
    } else if (data) {
      onCategoryAdded();
      onClose();
      setFormData({ name: '', parent_id: '' });
      toast.success(t('common.added') || 'Добавлено');
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-blue-100 text-merkez-blue flex items-center justify-center">
               <FolderTree className="w-4 h-4" />
             </div>
             <h3 className="text-lg font-bold text-gray-900">{t('warehouse.addCategory')}</h3>
           </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('warehouse.categoryName')}</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors shadow-sm text-sm"
              placeholder={t('warehouse.categoryPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('warehouse.parentCategory') || 'Parent Category (Optional)'}</label>
            <Dropdown 
              value={formData.parent_id}
              onChange={val => setFormData({...formData, parent_id: val})}
              options={[
                { value: '', label: t('warehouse.noParent') || 'No Parent (Main Category)' },
                ...hierarchicalCategories.map(cat => ({ value: cat.id, label: cat.label }))
              ]}
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all text-center"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-[2] py-3 bg-merkez-green text-white rounded-xl font-bold shadow-lg shadow-green-500/10 hover:bg-green-600 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('warehouse.addCategory')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

export default AddCategoryModal;
