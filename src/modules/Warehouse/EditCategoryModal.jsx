import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';

const EditCategoryModal = ({ isOpen, onClose, category, onCategoryUpdated }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
    }
  }, [category]);

  if (!isOpen || !category) return null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('categories')
      .update({ name: name.trim() })
      .eq('id', category.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('warehouse.categoryUpdated') || 'Категория обновлена');
      onCategoryUpdated();
      onClose();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(t('warehouse.confirmDeleteCategory') || 'Вы уверены? Товары этой категории останутся без категории.')) return;
    
    setDeleting(true);
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('warehouse.categoryDeleted') || 'Категория удалена');
      onCategoryUpdated();
      onClose();
    }
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">{t('warehouse.editCategory') || 'Редактировать категорию'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleUpdate} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
              {t('warehouse.categoryName') || 'Название категории'}
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-merkez-blue transition-all font-bold"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 border border-red-100 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 transition-all"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {t('common.delete') || 'Удалить'}
            </button>
            <button
              type="submit"
              disabled={loading || deleting}
              className="flex-[2] flex items-center justify-center gap-2 py-3 bg-merkez-blue text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-600/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('common.save') || 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCategoryModal;
