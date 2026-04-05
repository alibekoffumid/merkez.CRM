 import React, { useState } from 'react';
 import { useTranslation } from 'react-i18next';
 import { X, Plus, Save, FolderTree } from 'lucide-react'; 
import { supabase } from '../../supabaseClient';

 const AddCategoryModal = ({ isOpen, onClose, onCategoryAdded }) => {
   const { t } = useTranslation();
   const [loading, setLoading] = useState(false); 
   const [formData, setFormData] = useState({ name: '' }); 

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: formData.name }])
      .select();

    setLoading(false);
    if (!error && data) {
      onCategoryAdded();
      onClose();
      setFormData({ name: '' });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
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
          <div className="pt-4 border-t border-gray-100 mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 text-sm font-bold text-white bg-merkez-green rounded-lg hover:bg-green-600 transition-colors shadow-md flex items-center">
              {loading ? t('common.saving') : <><Save className="w-4 h-4 mr-2" /> {t('warehouse.addCategory')}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCategoryModal;
