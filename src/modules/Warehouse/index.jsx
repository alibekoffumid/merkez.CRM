import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Filter, AlertTriangle, CheckCircle2, FolderTree, MoreVertical, Loader2, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import AddProductModal from './AddProductModal';
import AddCategoryModal from './AddCategoryModal';
import EditProductModal from './EditProductModal';
import AddIngredientModal from './AddIngredientModal';
import EditIngredientModal from './EditIngredientModal';

const WarehouseModule = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('finished'); // 'finished' | 'raw'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchAll();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchCategories(), fetchProducts(), fetchIngredients()]);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*, categories(name)').order('name', { ascending: true });
    if (data) setProducts(data);
  };

  const fetchIngredients = async () => {
    const { data } = await supabase.from('ingredients').select('*').order('name', { ascending: true });
    if (data) setIngredients(data);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm(t('warehouse.confirmDeleteProduct'))) return;
    setOpenMenuId(null);
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (!error) setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleDeleteIngredient = async (id) => {
    if (!window.confirm(t('warehouse.confirmDeleteIngredient'))) return;
    setOpenMenuId(null);
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (!error) setIngredients(prev => prev.filter(i => i.id !== id));
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setOpenMenuId(null);
  };

  const handleEditIngredient = (ingredient) => {
    setEditingIngredient(ingredient);
    setOpenMenuId(null);
  };

  const getStatusIcon = (stock, min = 15) => {
    if (stock === 0) return <AlertTriangle className="w-4 h-4 text-merkez-red" />;
    if (stock < min) return <AlertTriangle className="w-4 h-4 text-merkez-yellow" />;
    return <CheckCircle2 className="w-4 h-4 text-merkez-green" />;
  };

  const getStatusText = (stock, min = 15) => {
    if (stock === 0) return t('warehouse.outOfStock');
    if (stock < min) return t('warehouse.lowStock');
    return t('warehouse.inStock');
  };

  const getStatusColor = (stock, min = 15) => {
    if (stock === 0) return 'text-merkez-red';
    if (stock < min) return 'text-merkez-yellow';
    return 'text-merkez-green';
  };

  const filteredProducts = products
    .filter(p => selectedCategory ? p.categories?.name === selectedCategory : true)
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredIngredients = ingredients
    .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Modals */}
      <AddProductModal isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} categories={categories} onProductAdded={fetchProducts} />
      <AddCategoryModal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} onCategoryAdded={fetchCategories} />
      <EditProductModal isOpen={!!editingProduct} product={editingProduct} onClose={() => setEditingProduct(null)} categories={categories} onProductUpdated={fetchProducts} />
      
      <AddIngredientModal 
        isOpen={showAddIngredient} 
        onClose={() => setShowAddIngredient(false)} 
        onIngredientAdded={fetchIngredients} 
      />
      <EditIngredientModal 
        isOpen={!!editingIngredient} 
        ingredient={editingIngredient} 
        onClose={() => setEditingIngredient(null)} 
        onIngredientUpdated={fetchIngredients} 
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('sidebar.warehouse')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('warehouse.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddCategory(true)} className="bg-white border text-gray-600 border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm">
            <FolderTree className="w-4 h-4 mr-2" /> {t('warehouse.manageCategories')}
          </button>
          
          {activeTab === 'finished' ? (
            <button onClick={() => setShowAddProduct(true)} className="bg-merkez-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> {t('warehouse.addProduct')}
            </button>
          ) : (
            <button onClick={() => setShowAddIngredient(true)} className="bg-merkez-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> {t('warehouse.addIngredient')}
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="sticky top-0 z-20 py-4 -mx-6 px-6 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all">
        <div className="flex bg-gray-50/50 p-1 rounded-2xl w-fit border border-gray-100">
          <button 
            onClick={() => setActiveTab('finished')}
            className={`px-8 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'finished' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {t('warehouse.finishedGoods')}
          </button>
          <button 
            onClick={() => setActiveTab('raw')}
            className={`px-8 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'raw' ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {t('warehouse.ingredients')}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Categories Sidebar - Only for Finished Goods */}
        {activeTab === 'finished' && (
          <div className="w-64 bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 p-4 flex flex-col">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">{t('warehouse.categories')}</h3>
            <div className="space-y-1 overflow-y-auto flex-1">
              <div className={`p-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${selectedCategory === null ? 'bg-blue-50 text-merkez-blue' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setSelectedCategory(null)}>
                {t('warehouse.allCategories')}
              </div>
              {categories.map(cat => (
                <div key={cat.id} className={`p-2 rounded-lg cursor-pointer text-sm flex items-center justify-between font-medium transition-colors ${selectedCategory === cat.name ? 'bg-blue-50 text-merkez-blue' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}>
                  <div className="flex items-center">
                    <FolderTree className="w-4 h-4 mr-2 text-gray-400" />
                    {cat.name}
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {products.filter(p => p.categories?.name === cat.name).length}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowAddCategory(true)} className="mt-4 w-full py-2 border-2 border-dashed border-gray-200 text-gray-400 rounded-lg text-sm font-medium hover:text-merkez-blue hover:border-merkez-blue transition-colors flex items-center justify-center">
              <Plus className="w-4 h-4 mr-1.5" /> {t('warehouse.addCategory')}
            </button>
          </div>
        )}

        {/* Products/Ingredients Table Area */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder={activeTab === 'finished' ? t('warehouse.searchPlaceholder') : t('warehouse.searchIngredients')} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors" 
              />
            </div>
            <button className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-gray-500 hover:text-gray-700 transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto" ref={menuRef}>
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mr-3" /><span>{t('warehouse.loadingInventory')}</span>
              </div>
            ) : activeTab === 'finished' ? (
              // Finished Goods Table
              filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                  <FolderTree className="w-12 h-12 text-gray-200" />
                  <p className="font-medium">{t('warehouse.noProductsFound')}</p>
                  <button onClick={() => setShowAddProduct(true)} className="px-4 py-2 bg-merkez-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm">
                    <Plus className="w-4 h-4 inline mr-1" /> {t('warehouse.addFirstProduct')}
                  </button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10">
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                      <th className="font-medium p-4 w-16"></th>
                      <th className="font-medium p-4">{t('warehouse.thName')}</th>
                      <th className="font-medium p-4">{t('warehouse.thCategory')}</th>
                      <th className="font-medium p-4">{t('warehouse.thPrice')}</th>
                      <th className="font-medium p-4">{t('warehouse.thStatus')}</th>
                      <th className="font-medium p-4 text-right">{t('warehouse.thActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-gray-300" />
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-gray-900">{item.name}</p>
                        </td>
                        <td className="p-4">
                          <span className="text-sm bg-blue-50 text-merkez-blue px-2.5 py-1 rounded-full font-medium">
                            {item.categories?.name || '—'}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-bold text-gray-900">${parseFloat(item.price).toFixed(2)}</td>
                        <td className="p-4">
                          <div className={`flex items-center text-sm font-medium ${getStatusColor(item.stock ?? 999)}`}>
                            {getStatusIcon(item.stock ?? 999)}
                            <span className="ml-2">{getStatusText(item.stock ?? 999)}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                              className="text-gray-400 hover:text-merkez-blue transition-colors p-1.5 rounded-md hover:bg-blue-50"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            {openMenuId === item.id && (
                              <div className="absolute right-0 top-9 z-30 bg-white border border-gray-100 rounded-xl shadow-xl w-44 py-1.5 animate-in fade-in zoom-in-95">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                >
                                  <Pencil className="w-4 h-4 text-merkez-blue" />
                                  {t('warehouse.editProduct')}
                                </button>
                                <div className="mx-3 my-1 border-t border-gray-100" />
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {t('warehouse.deleteProduct')}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              // Raw Ingredients Table
              filteredIngredients.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                  <FolderTree className="w-12 h-12 text-gray-200" />
                  <p className="font-medium">{t('warehouse.noIngredientsFound')}</p>
                  <button onClick={() => setShowAddIngredient(true)} className="px-4 py-2 bg-merkez-green text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors shadow-sm">
                    <Plus className="w-4 h-4 inline mr-1" /> {t('warehouse.addFirstIngredient')}
                  </button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10">
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                      <th className="font-medium p-4">{t('warehouse.thName')}</th>
                      <th className="font-medium p-4">{t('warehouse.thUnit')}</th>
                      <th className="font-medium p-4">{t('warehouse.thStock')}</th>
                      <th className="font-medium p-4">{t('warehouse.thCostPrice')}</th>
                      <th className="font-medium p-4">{t('warehouse.thStatus')}</th>
                      <th className="font-medium p-4 text-right">{t('warehouse.thActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredIngredients.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <p className="font-medium text-gray-900">{item.name}</p>
                        </td>
                        <td className="p-4 text-sm text-gray-600">{item.unit}</td>
                        <td className="p-4 text-sm font-bold text-gray-900">{parseFloat(item.quantity).toFixed(3)}</td>
                        <td className="p-4 text-sm font-bold text-gray-900">${parseFloat(item.cost_price).toFixed(2)}</td>
                        <td className="p-4">
                          <div className={`flex items-center text-sm font-medium ${getStatusColor(item.quantity, item.min_quantity)}`}>
                            {getStatusIcon(item.quantity, item.min_quantity)}
                            <span className="ml-2">{getStatusText(item.quantity, item.min_quantity)}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                              className="text-gray-400 hover:text-merkez-green transition-colors p-1.5 rounded-md hover:bg-green-50"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            {openMenuId === item.id && (
                              <div className="absolute right-0 top-9 z-30 bg-white border border-gray-100 rounded-xl shadow-xl w-44 py-1.5 animate-in fade-in zoom-in-95">
                                <button
                                  onClick={() => handleEditIngredient(item)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                >
                                  <Pencil className="w-4 h-4 text-merkez-green" />
                                  {t('warehouse.editIngredient')}
                                </button>
                                <div className="mx-3 my-1 border-t border-gray-100" />
                                <button
                                  onClick={() => handleDeleteIngredient(item.id)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {t('warehouse.deleteIngredient')}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseModule;
