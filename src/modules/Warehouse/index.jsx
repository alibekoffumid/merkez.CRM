import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Search, Plus, Filter, AlertTriangle, CheckCircle2, FolderTree, MoreVertical, Loader2, Pencil, Trash2, Image as ImageIcon, Truck, Upload, CheckSquare, Square, CornerDownRight } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import AddProductModal from './AddProductModal';
import AddCategoryModal from './AddCategoryModal';
import EditProductModal from './EditProductModal';
import EditCategoryModal from './EditCategoryModal';
import AddIngredientModal from './AddIngredientModal';
import EditIngredientModal from './EditIngredientModal';
import ModalPortal from '../../components/Common/ModalPortal';
import { useUser } from '../../core/UserContext';
import SuppliersList from './SuppliersList';
import AddSupplierModal from './AddSupplierModal';
import EditSupplierModal from './EditSupplierModal';
import ReceiveStockModal from './ReceiveStockModal';
import ProductImportModal from './ProductImportModal';
import DateRangePicker from '../../components/Common/DateRangePicker';
import Dropdown from '../../components/Common/Dropdown';

const WarehouseModule = () => {
  const { t, i18n } = useTranslation();
  const { profile, activeModules } = useUser();
  const isRestaurantActive = activeModules.includes('restaurant');
  const [activeTab, setActiveTab] = useState('finished'); // 'finished' | 'suppliers' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [historyFilter, setHistoryFilter] = useState(null); // supplier_id
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showReceiveStock, setShowReceiveStock] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in' | 'low' | 'out'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const menuRef = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    if (profile?.id) {
      fetchAll();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!isRestaurantActive && activeTab === 'raw') {
      setActiveTab('finished');
    }
  }, [isRestaurantActive]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Realtime updates for products
  useEffect(() => {
    const prodChannel = supabase
      .channel('warehouse-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    const catChannel = supabase
      .channel('warehouse-categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(prodChannel); 
      supabase.removeChannel(catChannel);
    };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategories(), 
      fetchProducts(), 
      fetchIngredients(), 
      fetchSuppliers(),
      fetchReceipts()
    ]);
    setLoading(false);
  };

  const fetchReceipts = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('stock_receipts')
      .select('*, products(name, barcode), suppliers(name)')
      .eq('user_id', profile.id)
      .order('received_at', { ascending: false });
    if (data) setReceipts(data);
  };

  const fetchSuppliers = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', profile.id)
      .order('name', { ascending: true });
    if (data) setSuppliers(data);
  };

  const fetchCategories = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('categories').select('*').eq('user_id', profile.id).order('name', { ascending: true });
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('archived', false)
      .eq('user_id', profile.id)
      .order('name', { ascending: true });
    if (data) setProducts(data);
  };

  const fetchIngredients = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('ingredients').select('*').eq('user_id', profile.id).order('name', { ascending: true });
    if (data) setIngredients(data);
  };

  const requestDeleteProduct = (productId) => {
    setConfirmDelete({ type: 'product', id: productId });
    setOpenMenuId(null);
  };

  const requestDeleteIngredient = (id) => {
    setConfirmDelete({ type: 'ingredient', id });
    setOpenMenuId(null);
  };

  const requestDeleteSupplier = (id) => {
    setConfirmDelete({ type: 'supplier', id });
    setOpenMenuId(null);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    
    if (confirmDelete.type === 'product') {
      const { error } = await supabase
        .from('products')
        .update({ archived: true })
        .eq('id', confirmDelete.id);
      if (!error) setProducts(prev => prev.filter(p => p.id !== confirmDelete.id));
    } else if (confirmDelete.type === 'ingredient') {
      const { error } = await supabase.from('ingredients').delete().eq('id', confirmDelete.id);
      if (!error) setIngredients(prev => prev.filter(i => i.id !== confirmDelete.id));
    } else if (confirmDelete.type === 'supplier') {
      const { error } = await supabase.from('suppliers').delete().eq('id', confirmDelete.id);
      if (!error) fetchAll();
    }
    setConfirmDelete(null);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('products')
      .update({ archived: true })
      .in('id', selectedItems);

    if (!error) {
      setProducts(prev => prev.filter(p => !selectedItems.includes(p.id)));
      setSelectedItems([]);
      setConfirmDelete(null);
    } else {
      toast.error(error.message);
    }
    setLoading(false);
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredProducts.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(p => {
      if (statusFilter === 'all') return true;
      const stock = parseFloat(p.stock_quantity || 0);
      const min = parseFloat(p.critical_stock || 15);
      if (statusFilter === 'in') return stock >= min;
      if (statusFilter === 'low') return stock > 0 && stock < min;
      if (statusFilter === 'out') return stock === 0;
      return true;
    });

  const filteredIngredients = ingredients
    .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 flex flex-col h-full w-full">
      {/* Modals */}
      <AddProductModal isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} categories={categories} suppliers={suppliers} onProductAdded={fetchProducts} />
      <ProductImportModal isOpen={showImport} onClose={() => setShowImport(false)} onImportComplete={fetchProducts} />
      <AddCategoryModal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} onCategoryAdded={fetchCategories} />
      <EditProductModal 
        isOpen={!!editingProduct} 
        product={editingProduct} 
        onClose={() => setEditingProduct(null)} 
        categories={categories} 
        suppliers={suppliers}
        onProductUpdated={fetchProducts} 
      />
      <EditCategoryModal isOpen={!!editingCategory} category={editingCategory} onClose={() => setEditingCategory(null)} onCategoryUpdated={fetchCategories} />
      
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

      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col lg:flex-row flex-wrap items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-merkez-blue/10 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-merkez-blue" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{t('sidebar.warehouse')}</h1>
          </div>
        </div>

        {/* Tab Switcher Inline - Only if Restaurant is active */}
        {isRestaurantActive && (
          <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
            <button 
              onClick={() => setActiveTab('finished')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'finished' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Package className="w-3.5 h-3.5" />
              {t('warehouse.finishedGoods')}
            </button>
            <button 
              onClick={() => setActiveTab('raw')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'raw' ? 'bg-white text-merkez-green shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              {t('warehouse.ingredients')}
            </button>
            <button 
              onClick={() => setActiveTab('suppliers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'suppliers' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Truck className="w-3.5 h-3.5" />
              {t('warehouse.suppliers') || 'Поставщики'}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'history' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Search className="w-3.5 h-3.5" />
              {t('warehouse.history') || 'История'}
            </button>
          </div>
        )}

        {!isRestaurantActive && (
          <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
            <button 
              onClick={() => setActiveTab('finished')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'finished' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Package className="w-4 h-4" />
              {t('warehouse.finishedGoods')}
            </button>
            <button 
              onClick={() => setActiveTab('suppliers')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'suppliers' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Truck className="w-4 h-4" />
              {t('warehouse.suppliers') || 'Поставщики'}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'history' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Search className="w-4 h-4" />
              {t('warehouse.history') || 'История'}
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {activeTab === 'finished' && (
            <button onClick={() => setShowAddCategory(true)} className="bg-white border text-gray-700 border-gray-200 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> {t('warehouse.addCategory')}
            </button>
          )}
          
          {activeTab === 'finished' && (
            <button onClick={() => setShowImport(true)} className="bg-white border text-gray-700 border-gray-200 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center shadow-sm">
              <Upload className="w-4 h-4 mr-2" /> {t('warehouse.import')}
            </button>
          )}

          {activeTab === 'finished' && (
            <button onClick={() => setShowAddProduct(true)} className="bg-merkez-blue text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors flex items-center shadow-lg shadow-blue-600/20">
              <Plus className="w-4 h-4 mr-2" /> {t('warehouse.addProduct')}
            </button>
          )}

          {activeTab === 'raw' && isRestaurantActive && (
            <button onClick={() => setShowAddIngredient(true)} className="bg-merkez-green text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 transition-colors flex items-center shadow-lg shadow-green-600/20">
              <Plus className="w-4 h-4 mr-2" /> {t('warehouse.addIngredient')}
            </button>
          )}

          {activeTab === 'suppliers' && (
            <button onClick={() => setShowAddSupplier(true)} className="bg-merkez-blue text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors flex items-center shadow-lg shadow-blue-600/20">
              <Plus className="w-4 h-4 mr-2" /> {t('warehouse.addSupplier')}
            </button>
          )}

          {selectedItems.length > 0 && activeTab === 'finished' && (
            <button 
              onClick={() => setConfirmDelete({ type: 'bulk' })} 
              className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors flex items-center border border-red-100"
            >
              <Trash2 className="w-4 h-4 mr-2" /> {t('common.deleteSelected') || 'Sil (Seçilənlər)'} ({selectedItems.length})
            </button>
          )}
          
          <button 
            onClick={() => setShowReceiveStock(true)} 
            className="bg-white border border-merkez-green text-merkez-green px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-50 transition-colors flex items-center shadow-sm"
          >
            <Truck className="w-4 h-4 mr-2" /> {t('warehouse.receiveStock') || 'Приемка'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {activeTab === 'suppliers' ? (
          <SuppliersList 
            suppliers={suppliers}
            loading={loading}
            onEdit={setEditingSupplier}
            onDelete={requestDeleteSupplier}
            onAdd={() => setShowAddSupplier(true)}
            onViewHistory={(id) => {
              setHistoryFilter(id);
              setActiveTab('history');
            }}
          />
        ) : activeTab === 'history' ? (
          <div className="flex-1 bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{t('warehouse.receiptHistory') || 'История приёмок'}</h3>
                  <p className="text-xs text-gray-500 mt-1">{t('warehouse.receiptHistoryDesc') || 'Список всех поступлений товаров от поставщиков'}</p>
                </div>
                {(historyFilter || startDate || endDate) && (
                  <button 
                    onClick={() => {
                      setHistoryFilter(null);
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <Search className="w-3.5 h-3.5" />
                    {t('common.clearFilters') || 'Сбросить фильтры'}
                  </button>
                )}
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col md:flex-row gap-4 p-5 bg-gray-50/50 rounded-2xl border border-gray-100">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('warehouse.supplier')}</label>
                  <Dropdown 
                    value={historyFilter || ''} 
                    onChange={(val) => setHistoryFilter(val || null)}
                    options={[
                      { value: '', label: t('common.all') || 'Все', icon: Truck },
                      ...suppliers.map(s => ({
                        value: s.id,
                        label: s.name,
                        icon: Truck
                      }))
                    ]}
                    className="w-full"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('common.period') || 'Период'}</label>
                  <DateRangePicker 
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    placeholder={t('restaurant.selectDateRange') || 'Выберите диапазон'}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{t('warehouse.receivedDate')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{t('warehouse.supplier')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{t('warehouse.product')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">{t('warehouse.quantity')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">{t('warehouse.unitPrice')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">{t('common.total') || 'Итого'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {receipts.filter(receipt => {
                    if (historyFilter && receipt.supplier_id !== historyFilter) return false;
                    if (startDate && new Date(receipt.received_at) < new Date(startDate)) return false;
                    if (endDate) {
                      const end = new Date(endDate);
                      end.setHours(23, 59, 59, 999);
                      if (new Date(receipt.received_at) > end) return false;
                    }
                    return true;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <Package className="w-12 h-12 text-gray-100" />
                          <p className="font-medium">{t('warehouse.noReceiptsFound') || 'История приёмок пуста'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    receipts.map(receipt => (
                      <tr key={receipt.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-gray-700">{new Date(receipt.received_at).toLocaleDateString()}</span>
                          {receipt.notes && <p className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{receipt.notes}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-merkez-blue">
                              <Truck className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-gray-900">{receipt.suppliers?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">{receipt.products?.name || '—'}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{receipt.products?.barcode || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-black text-gray-900">{receipt.quantity}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-600 text-sm">
                          ₼{receipt.unit_price || '0.00'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-black text-merkez-blue">
                            ₼{(receipt.quantity * (receipt.unit_price || 0)).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            {/* Categories Sidebar - Only for Finished Goods */}
        {activeTab === 'finished' && (
          <div className="w-72 bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 p-4 flex flex-col shrink-0">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">{t('warehouse.categories')}</h3>
            <div className="space-y-1 overflow-y-auto flex-1">
              <div className={`p-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${selectedCategory === null ? 'bg-blue-50 text-merkez-blue' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setSelectedCategory(null)}>
                {t('warehouse.allCategories')}
              </div>
              {categories.filter(c => !c.parent_id).map(cat => (
                <React.Fragment key={cat.id}>
                  <div 
                    className={`group p-2 rounded-lg cursor-pointer text-sm flex items-center justify-between font-medium transition-colors ${selectedCategory === cat.name ? 'bg-blue-50 text-merkez-blue' : 'text-gray-700 hover:bg-gray-50'}`} 
                    onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                  >
                    <div className="flex items-center flex-1 truncate" title={cat.name}>
                      <FolderTree className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-merkez-blue transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                        {products.filter(p => p.categories?.name === cat.name).length}
                      </span>
                    </div>
                  </div>
                  {/* Subcategories */}
                  {categories.filter(sub => sub.parent_id === cat.id).map(subcat => (
                    <div 
                      key={subcat.id} 
                      className={`group p-2 pl-8 rounded-lg cursor-pointer text-sm flex items-center justify-between font-medium transition-colors ${selectedCategory === subcat.name ? 'bg-blue-50 text-merkez-blue' : 'text-gray-600 hover:bg-gray-50'}`} 
                      onClick={() => setSelectedCategory(selectedCategory === subcat.name ? null : subcat.name)}
                    >
                      <div className="flex items-center flex-1 truncate" title={subcat.name}>
                        <CornerDownRight className="w-3.5 h-3.5 mr-2 text-gray-300 shrink-0" />
                        <span className="truncate">{subcat.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingCategory(subcat); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-merkez-blue transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                          {products.filter(p => p.categories?.name === subcat.name).length}
                        </span>
                      </div>
                    </div>
                  ))}
                </React.Fragment>
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
            <div className="relative" ref={filterRef}>
              <button 
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`border p-2 rounded-lg transition-colors ${statusFilter !== 'all' ? 'bg-blue-50 border-merkez-blue text-merkez-blue' : 'bg-gray-50 border-gray-100 text-gray-500 hover:text-gray-700'}`}
              >
                <Filter className="w-5 h-5" />
              </button>
              
              {showFilterDropdown && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-100 rounded-xl shadow-xl w-48 py-1.5 animate-in fade-in zoom-in-95">
                  <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">{t('retail.filters')}</p>
                  {[
                    { id: 'all', label: t('common.all') },
                    { id: 'in', label: t('warehouse.inStock'), color: 'text-merkez-green' },
                    { id: 'low', label: t('warehouse.lowStock'), color: 'text-merkez-yellow' },
                    { id: 'out', label: t('warehouse.outOfStock'), color: 'text-merkez-red' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setStatusFilter(item.id); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${statusFilter === item.id ? 'bg-blue-50 text-merkez-blue' : 'text-gray-700'}`}
                    >
                      <div className="flex items-center gap-2">
                        {item.id !== 'all' && <div className={`w-2 h-2 rounded-full ${item.id === 'in' ? 'bg-merkez-green' : item.id === 'low' ? 'bg-merkez-yellow' : 'bg-merkez-red'}`} />}
                        {item.label}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10">
                    <tr className="border-b border-gray-100 text-[10px] uppercase text-gray-500 tracking-wider">
                      <th className="pl-8 pr-2 py-4 w-10">
                        <button 
                          onClick={toggleSelectAll}
                          className="text-gray-400 hover:text-merkez-blue transition-colors"
                        >
                          {selectedItems.length === filteredProducts.length && filteredProducts.length > 0 ? (
                            <CheckSquare className="w-5 h-5 text-merkez-blue" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </th>
                      <th className="font-medium px-2 py-4 whitespace-nowrap">{t('warehouse.thName')}</th>
                      <th className="font-medium px-2 py-4 whitespace-nowrap">{t('warehouse.thBarcode')}</th>
                      <th className="font-medium px-2 py-4 whitespace-nowrap">{t('warehouse.thCategory')}</th>
                      <th className="font-medium px-2 py-4 whitespace-nowrap">{t('warehouse.thPurchasePrice')}</th>
                      <th className="font-medium px-2 py-4 whitespace-nowrap">{t('warehouse.thPrice')}</th>
                      <th className="font-medium px-2 py-4 whitespace-nowrap">{t('warehouse.thStock')}</th>
                      <th className="font-medium px-2 py-4 whitespace-nowrap">{t('warehouse.thStatus')}</th>
                      <th className="font-medium px-2 py-4 pr-6 text-right whitespace-nowrap">{t('warehouse.thActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map(item => (
                      <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${selectedItems.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                        <td className="pl-8 pr-2 py-4">
                          <button 
                            onClick={() => toggleSelectItem(item.id)}
                            className="text-gray-400 hover:text-merkez-blue transition-colors"
                          >
                            {selectedItems.includes(item.id) ? (
                              <CheckSquare className="w-5 h-5 text-merkez-blue" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-2 py-4">
                          <p className="font-medium text-gray-900">{item.name}</p>
                        </td>
                        <td className="px-2 py-4">
                          <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded">
                            {item.barcode || '—'}
                          </span>
                        </td>
                        <td className="px-2 py-4">
                          <span className="text-sm bg-blue-50 text-merkez-blue px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                            {item.categories?.name || '—'}
                          </span>
                        </td>
                        <td className="px-2 py-4 text-sm text-gray-500">${parseFloat(item.purchase_price || 0).toFixed(2)}</td>
                        <td className="px-2 py-4 text-sm font-bold text-gray-900">${parseFloat(item.price).toFixed(2)}</td>
                        <td className="px-2 py-4 text-sm font-bold text-gray-900">
                          {parseFloat(item.stock_quantity || 0).toFixed(2)}
                        </td>
                        <td className="px-2 py-4">
                          <div className={`flex items-center text-sm font-medium ${getStatusColor(item.stock_quantity, item.critical_stock)}`}>
                            {getStatusIcon(item.stock_quantity, item.critical_stock)}
                            <span className="ml-2">{getStatusText(item.stock_quantity, item.critical_stock)}</span>
                          </div>
                        </td>
                        <td className="px-2 py-4 pr-6 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                              className="text-gray-400 hover:text-merkez-blue transition-colors p-1.5 rounded-md hover:bg-blue-50"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            {openMenuId === item.id && (
                              <div className="absolute right-0 top-9 z-30 bg-white border border-gray-100 rounded-xl shadow-xl w-56 py-1.5 animate-in fade-in zoom-in-95">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium whitespace-nowrap"
                                >
                                  <Pencil className="w-4 h-4 text-merkez-blue" />
                                  {t('warehouse.editProduct')}
                                </button>
                                <div className="mx-3 my-1 border-t border-gray-100" />
                                <button
                                  onClick={() => requestDeleteProduct(item.id)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium whitespace-nowrap"
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
                <table className="w-full text-left border-collapse">
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
                              <div className="absolute right-0 top-9 z-30 bg-white border border-gray-100 rounded-xl shadow-xl w-56 py-1.5 animate-in fade-in zoom-in-95">
                                <button
                                  onClick={() => handleEditIngredient(item)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium whitespace-nowrap"
                                >
                                  <Pencil className="w-4 h-4 text-merkez-green" />
                                  {t('warehouse.editIngredient')}
                                </button>
                                <div className="mx-3 my-1 border-t border-gray-100" />
                                <button
                                  onClick={() => requestDeleteIngredient(item.id)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium whitespace-nowrap"
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
      </>
    )}
  </div>

      <AddSupplierModal 
        isOpen={showAddSupplier}
        onClose={() => setShowAddSupplier(false)}
        onSupplierAdded={fetchAll}
      />

      {editingSupplier && (
        <EditSupplierModal 
          isOpen={!!editingSupplier}
          onClose={() => setEditingSupplier(null)}
          supplier={editingSupplier}
          onSupplierUpdated={fetchAll}
        />
      )}

      <ReceiveStockModal 
        isOpen={showReceiveStock}
        onClose={() => setShowReceiveStock(false)}
        onStockReceived={fetchAll}
      />
      {confirmDelete && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
                  <Trash2 className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  {confirmDelete.type === 'bulk' 
                    ? (i18n.language === 'az' ? 'Seçilənləri silmək?' : 'Удалить выбранные?') 
                    : t('warehouse.deleteProduct')}
                </h3>
                <p className="text-gray-500 font-medium mb-8">
                  {confirmDelete.type === 'bulk'
                    ? (i18n.language === 'az' ? `${selectedItems.length} məhsul arxivə göndəriləcək. Bu əməliyyat geri qaytarıla bilməz.` : `${selectedItems.length} товаров будут отправлены в архив. Это действие нельзя отменить.`)
                    : t('warehouse.confirmDeleteProduct')}
                </p>
                
                <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    onClick={confirmDelete.type === 'bulk' ? handleBulkDelete : executeDelete}
                    className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default WarehouseModule;
