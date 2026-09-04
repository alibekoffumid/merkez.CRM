import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Trash2, Loader2, FolderTree, Folder, Search, Check, ChevronRight } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';

import { formatCategoriesHierarchically } from './categoryUtils';

const EditCategoryModal = ({ isOpen, onClose, category, onCategoryUpdated }) => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showParentSelector, setShowParentSelector] = useState(false);
  const [searchParentTerm, setSearchParentTerm] = useState('');

  // Format categories for hierarchical dropdown, excluding current category and its children
  const hierarchicalCategories = React.useMemo(() => 
    formatCategoriesHierarchically(categories, category?.id, t), 
    [categories, category?.id, t]
  );

  const selectedParentCategory = React.useMemo(() => 
    hierarchicalCategories.find(c => c.id === parentId),
    [hierarchicalCategories, parentId]
  );

  const filteredHierarchicalCategories = React.useMemo(() => {
    if (!searchParentTerm.trim()) return hierarchicalCategories;
    const q = searchParentTerm.trim().toLowerCase()
      .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ə/g, 'e').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ё/g, 'е');
    
    return hierarchicalCategories.filter(cat => {
      const raw = (cat.rawName || '').toLowerCase()
        .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ə/g, 'e').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ё/g, 'е');
      const parent = (cat.parentName || '').toLowerCase()
        .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ə/g, 'e').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ё/g, 'е');
      return raw.includes(q) || parent.includes(q);
    });
  }, [hierarchicalCategories, searchParentTerm]);

  useEffect(() => {
    if (category && isOpen) {
      setName(category.name);
      setParentId(category.parent_id || '');
      setShowConfirmDelete(false);
      setShowParentSelector(false);
      setSearchParentTerm('');
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
    try {
      const { error: deleteError, data: deleteData } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)
        .select();

      if (deleteError) {
        throw deleteError;
      }

      if (!deleteData || deleteData.length === 0) {
        throw new Error(t('warehouse.noDeletePermission'));
      }
      
      toast.success(t('warehouse.categoryDeleted') || 'Категория удалена');
      
      setTimeout(() => {
        onCategoryUpdated();
        onClose();
      }, 500);
      
    } catch (error) {
      toast.error(error.message || 'Error deleting category');
    } finally {
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
        <div 
          className={`bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ease-out w-full ${
            showParentSelector && !showConfirmDelete ? 'max-w-2xl md:max-w-3xl' : 'max-w-md'
          } animate-in fade-in zoom-in-95`}
          onClick={e => e.stopPropagation()}
        >
          {showConfirmDelete ? (
            <div>
              <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-base font-bold text-gray-900">{t('common.confirmDelete')}</h3>
                <button onClick={() => setShowConfirmDelete(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    {t('warehouse.confirmDeleteCategory') || 'Bu kateqoriyanı silmək istədiyinizdən əminsiniz?'}
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
            </div>
          ) : (
            <div className="flex flex-col md:flex-row">
              {/* Left: Main Form */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-merkez-blue flex items-center justify-center shadow-sm">
                      <FolderTree className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{t('warehouse.editCategory')}</h3>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {i18n.language === 'az' ? 'Kateqoriya məlumatlarını redaktə edin' : 'Редактировать данные категории'}
                      </p>
                    </div>
                  </div>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-200">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdate} className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">
                      {t('warehouse.categoryName')}
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:ring-2 focus:ring-merkez-blue/10 transition-all font-bold text-gray-800"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">
                      {t('warehouse.parentCategory') || 'Əsas Kateqoriya (İstəyə bağlı)'}
                    </label>
                    <div
                      onClick={() => setShowParentSelector(prev => !prev)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        showParentSelector
                          ? 'border-merkez-blue bg-blue-50/40 ring-2 ring-merkez-blue/15 shadow-sm'
                          : 'border-gray-200 bg-gray-50/70 hover:bg-white hover:border-merkez-blue shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                        {selectedParentCategory ? (
                          <Folder 
                            className="w-4 h-4 shrink-0" 
                            style={{ color: selectedParentCategory.color }} 
                            fill={selectedParentCategory.color} 
                            fillOpacity={0.2} 
                          />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-400 shrink-0 ml-1" />
                        )}
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-xs font-bold text-gray-800 truncate">
                            {selectedParentCategory ? selectedParentCategory.rawName : (t('warehouse.noParent') || 'Yoxdur (Ana Kateqoriya)')}
                          </span>
                          {selectedParentCategory?.parentName && (
                            <span className="text-[10px] text-gray-400 font-medium truncate">
                              {t('warehouse.inside') || 'İçində:'} {selectedParentCategory.parentName}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {selectedParentCategory && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setParentId('');
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mr-0.5"
                            title={i18n.language === 'az' ? 'Sıfırla' : 'Сбросить'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="flex items-center gap-1 text-merkez-blue text-xs font-bold pl-1">
                          <span className="text-[11px] hidden sm:inline">
                            {showParentSelector ? (i18n.language === 'az' ? 'Bağla' : 'Закрыть') : (i18n.language === 'az' ? 'Seç' : 'Выбрать')}
                          </span>
                          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showParentSelector ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
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
              </div>

              {/* Right: Expanded Category Tree Selector & Search */}
              {showParentSelector && (
                <div className="w-full md:w-[360px] bg-slate-50/70 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col shrink-0 animate-in fade-in slide-in-from-right-4 duration-200">
                  {/* Panel Header */}
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/90">
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        {i18n.language === 'az' ? 'Ana Kateqoriya Seçimi' : 'Выбор родительской категории'}
                      </h4>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {i18n.language === 'az' ? 'Kateqoriyanın daxil olacağı qovluğu seçin' : 'Выберите папку, в которую войдет категория'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowParentSelector(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search Box */}
                  <div className="p-3 border-b border-gray-100 bg-white/60">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchParentTerm}
                        onChange={(e) => setSearchParentTerm(e.target.value)}
                        placeholder={i18n.language === 'az' ? 'Kateqoriya axtar...' : 'Поиск категорий...'}
                        className="w-full pl-8 pr-8 py-2 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 placeholder-gray-400 outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue/20 transition-all"
                        autoFocus
                      />
                      {searchParentTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchParentTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category List */}
                  <div className="p-2.5 overflow-y-auto max-h-[340px] custom-scrollbar space-y-1 flex-1">
                    {/* Root Category Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setParentId('');
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                        !parentId
                          ? 'bg-blue-50 text-merkez-blue font-black border border-blue-100 shadow-sm'
                          : 'text-gray-700 font-bold hover:bg-white hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${!parentId ? 'bg-merkez-blue' : 'bg-gray-300'}`} />
                        <span className="truncate">
                          {t('warehouse.noParent') || 'Yoxdur (Ana Kateqoriya)'}
                        </span>
                      </div>
                      {!parentId && (
                        <Check className="w-4 h-4 text-merkez-blue shrink-0" />
                      )}
                    </button>

                    <div className="my-1 border-t border-gray-200/50" />

                    {filteredHierarchicalCategories.length === 0 ? (
                      <div className="py-8 text-center text-xs font-bold text-gray-400">
                        {i18n.language === 'az' ? 'Kateqoriya tapılmadı' : 'Категория не найдена'}
                      </div>
                    ) : (
                      filteredHierarchicalCategories.map(cat => {
                        const isSelected = parentId === cat.id;
                        const isSub = cat.level > 0;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setParentId(cat.id);
                            }}
                            style={{
                              paddingLeft: `${10 + (cat.level || 0) * 14}px`,
                              borderLeft: cat.level > 0 ? `2.5px solid ${cat.color}` : undefined
                            }}
                            className={`w-full flex items-center justify-between gap-2 py-2 pr-2.5 rounded-xl text-left text-xs transition-all ${
                              isSelected
                                ? 'bg-blue-50 text-merkez-blue font-black border border-blue-100 shadow-sm'
                                : 'text-gray-700 font-semibold hover:bg-white hover:text-gray-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                              <Folder 
                                className="w-3.5 h-3.5 shrink-0" 
                                style={{ color: cat.color }} 
                                fill={cat.color} 
                                fillOpacity={0.2} 
                              />
                              <span className="truncate">{cat.rawName}</span>
                              {cat.parentName && (searchParentTerm || isSub) && (
                                <span className="text-[10px] text-gray-400 font-normal shrink-0 ml-auto mr-1 truncate max-w-[100px] bg-gray-100/80 px-1.5 py-0.5 rounded">
                                  {cat.parentName}
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-merkez-blue shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};

export default EditCategoryModal;
