import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Save, FolderTree, Loader2, Folder, Search, Check, ChevronRight } from 'lucide-react'; 
import { supabase } from '../../supabaseClient';
import ModalPortal from '../../components/Common/ModalPortal';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';

import { formatCategoriesHierarchically } from './categoryUtils';

const AddCategoryModal = ({ isOpen, onClose, onCategoryAdded }) => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false); 
  const [formData, setFormData] = useState({ name: '', parent_id: '' }); 
  const [categories, setCategories] = useState([]);
  const [showParentSelector, setShowParentSelector] = useState(false);
  const [searchParentTerm, setSearchParentTerm] = useState('');

  // Format categories for hierarchical dropdown
  const hierarchicalCategories = React.useMemo(() => 
    formatCategoriesHierarchically(categories, null, t), 
    [categories, t]
  );

  const selectedParentCategory = React.useMemo(() => 
    hierarchicalCategories.find(c => c.id === formData.parent_id),
    [hierarchicalCategories, formData.parent_id]
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
    if (isOpen) {
      fetchCategories();
      setShowParentSelector(false);
      setSearchParentTerm('');
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
          className={`bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ease-out w-full ${
            showParentSelector ? 'max-w-2xl md:max-w-3xl' : 'max-w-md'
          } animate-in fade-in zoom-in-95`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col md:flex-row">
            {/* Left: Main Form */}
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-merkez-blue flex items-center justify-center shadow-sm">
                    <FolderTree className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{t('warehouse.addCategory')}</h3>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {i18n.language === 'az' ? 'Yeni məhsul kateqoriyası yaradın' : 'Создать новую категорию товаров'}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">
                    {t('warehouse.categoryName')}
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-merkez-blue focus:ring-2 focus:ring-merkez-blue/10 transition-all font-bold text-sm text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
                    placeholder={t('warehouse.categoryPlaceholder') || 'Kateqoriya adını daxil edin'}
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
                            setFormData({ ...formData, parent_id: '' });
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
                    onClick={onClose} 
                    className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all text-center"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="flex-[2] py-3 bg-merkez-green text-white rounded-xl font-bold shadow-lg shadow-green-500/15 hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('warehouse.addCategory')}
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
                      {i18n.language === 'az' ? 'Kateqoriyanın daxil olacağı qovluq' : 'Папка, в которую войдет категория'}
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
                      setFormData({ ...formData, parent_id: '' });
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                      !formData.parent_id
                        ? 'bg-blue-50 text-merkez-blue font-black border border-blue-100 shadow-sm'
                        : 'text-gray-700 font-bold hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${!formData.parent_id ? 'bg-merkez-blue' : 'bg-gray-300'}`} />
                      <span className="truncate">
                        {t('warehouse.noParent') || 'Yoxdur (Ana Kateqoriya)'}
                      </span>
                    </div>
                    {!formData.parent_id && (
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
                      const isSelected = formData.parent_id === cat.id;
                      const isSub = cat.level > 0;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, parent_id: cat.id });
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
        </div>
      </div>
    </ModalPortal>
  );
};

export default AddCategoryModal;
