import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';
import Dropdown from '../../components/Common/Dropdown';

const EditCategoryModal = ({ isOpen, onClose, category, onCategoryUpdated }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (category && isOpen) {
      setName(category.name);
      setParentId(category.parent_id || '');
      setShowConfirmDelete(false);
      fetchCategories();
    }
  }, [category, isOpen]);

  const fetchCategories = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('categories').select('id, name, parent_id').eq('user_id', profile.id);
    if (data) setCategories(data);
  };

  if (!isOpen || !category) return null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .update({ 
        name: name.trim(),
        parent_id: parentId || null
      })
      .eq('id', category.id)
      .select();

    if (error) {
      toast.error(error.message);
    } else if (!data || data.length === 0) {
      toast.error(t('warehouse.noEditPermission'));
    } else {
      toast.success(t('warehouse.categoryUpdated') || 'Категория обновлена');
      onCategoryUpdated();
      onClose();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    console.log('Current profile:', profile);
    console.log('Target category:', category);
    console.log('Attempting to delete category:', category.id, category.name);
    
    try {
      // Deleting the category will now automatically set category_id to NULL 
      // for all products thanks to the ON DELETE SET NULL constraint.
      const { error: deleteError, data: deleteData } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)
        .select();

      if (deleteError) {
        console.error('Error deleting category row:', deleteError);
        throw deleteError;
      }

      if (!deleteData || deleteData.length === 0) {
        throw new Error(t('warehouse.noDeletePermission'));
      }

      console.log('Category deleted successfully from DB', deleteData);
      
      toast.success(t('warehouse.categoryDeleted') || 'Категория удалена');
      
      // Small delay to ensure DB consistency before refresh
      setTimeout(() => {
        onCategoryUpdated();
        onClose();
      }, 500);
      
    } catch (error) {
      console.error('Final delete error caught:', error);
      toast.error(error.message || 'Error deleting category');
    } finally {
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">{showConfirmDelete ? t('common.confirmDelete') : t('warehouse.editCategory')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {showConfirmDelete ? (
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm text-gray-600">
                {t('warehouse.confirmDeleteCategory')}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t('common.delete')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                {t('warehouse.categoryName')}
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

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                {t('warehouse.parentCategory') || 'Parent Category (Optional)'}
              </label>
              <Dropdown 
                value={parentId}
                onChange={val => setParentId(val)}
                options={[
                  { value: '', label: t('warehouse.noParent') || 'No Parent (Main Category)' },
                  ...categories.filter(c => c.id !== category.id && !c.parent_id).map(cat => ({ value: cat.id, label: cat.name }))
                ]}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-red-100 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.delete')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] flex items-center justify-center gap-2 py-3 bg-merkez-blue text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-600/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('common.save')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </ModalPortal>
  );
};

export default EditCategoryModal;
