import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Search, Plus, Filter, AlertTriangle, CheckCircle2, FolderTree, Folder, MoreVertical, Loader2, Pencil, Trash2, Image as ImageIcon, Truck, Upload, CheckSquare, Square, CornerDownRight, Settings, ChevronRight, ChevronDown, ArrowRightLeft, Minus, Menu, X, HelpCircle, DollarSign, TrendingUp } from 'lucide-react';
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
import WarehouseSettings from './WarehouseSettings';
import DispatchStockModal from './DispatchStockModal';
import TransferStockModal from './TransferStockModal';
import WarehouseTour from './WarehouseTour';
import WarehouseStocktake from './WarehouseStocktake';
import WarehouseReports from './WarehouseReports';
import DebtBook from '../CRM/DebtBook';
import SellProductModal from './SellProductModal';
import { formatCategoriesHierarchically } from './categoryUtils';
import WarehouseStaffManager from './WarehouseStaffManager';
import WarehouseClientManager from './WarehouseClientManager';

const WarehouseModule = ({ activeTab: propActiveTab, setActiveTab: propSetActiveTab }) => {
  const { t, i18n } = useTranslation();
  const { profile, activeModules } = useUser();
  const isRestaurantActive = activeModules.includes('restaurant');
  const [localActiveTab, localSetActiveTab] = useState('finished');
  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = propSetActiveTab || localSetActiveTab;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [historyFilter, setHistoryFilter] = useState(null); // supplier_id
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyTab, setHistoryTab] = useState('receipts'); // 'receipts' | 'dispatches'
  const [salesChannelFilter, setSalesChannelFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCategorySidebar, setShowCategorySidebar] = useState(window.innerWidth > 1536);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showReceiveStock, setShowReceiveStock] = useState(false);
  const [showDispatchStock, setShowDispatchStock] = useState(false);
  const [showTransferStock, setShowTransferStock] = useState(false);
  const [showSellProduct, setShowSellProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in' | 'low' | 'out'
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [currentWarehouseId, setCurrentWarehouseId] = useState(null);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const menuRef = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    if (profile?.id) {
      fetchAll();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (currentWarehouseId) {
      fetchProducts();
      fetchIngredients();
      fetchReceipts();
      fetchDispatches();
    }
  }, [currentWarehouseId]);

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

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('warehouse_tour_seen');
    if (!hasSeenTour && warehouses.length > 0) {
      const timer = setTimeout(() => setShowTour(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [warehouses.length]);

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
    // Fetch warehouses first to get the current context
    await fetchWarehouses();
    await Promise.all([
      fetchCategories(), 
      fetchProducts(), 
      fetchIngredients(), 
      fetchSuppliers(),
      fetchReceipts(),
      fetchDispatches(),
      fetchTransfers()
    ]);
    setLoading(false);
  };

  const fetchWarehouses = async () => {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('user_id', profile.id)
      .order('is_default', { ascending: false });
    
    if (data) {
      if (data.length === 0) {
        const { data: newW } = await supabase
          .from('warehouses')
          .insert({ name: t('warehouse.mainWarehouse') || 'Main Warehouse', is_default: true, user_id: profile.id })
          .select()
          .single();
        if (newW) {
          setWarehouses([newW]);
          setCurrentWarehouseId(newW.id);
        }
      } else {
        setWarehouses(data);
        if (!currentWarehouseId) {
          setCurrentWarehouseId(data[0].id);
        }
      }
    }
  };

  const fetchReceipts = async () => {
    if (!profile?.id || !currentWarehouseId) return;
    const { data } = await supabase
      .from('stock_receipts')
      .select('*, products(name, barcode), suppliers(name)')
      .eq('user_id', profile.id)
      .eq('warehouse_id', currentWarehouseId)
      .order('received_at', { ascending: false });
    if (data) setReceipts(data);
  };

  const fetchDispatches = async () => {
    if (!profile?.id || !currentWarehouseId) return;
    const { data } = await supabase
      .from('stock_dispatches')
      .select('*, products(name, barcode, category_id)')
      .eq('user_id', profile.id)
      .eq('warehouse_id', currentWarehouseId)
      .order('issued_at', { ascending: false });
    if (data) setDispatches(data);
  };
  
  const fetchTransfers = async () => {
    if (!profile?.id) return;
    
    // Fetch transfers
    const { data: transfersData, error: transfersError } = await supabase
      .from('stock_transfers')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (transfersError) {
      console.error('fetchTransfers error:', transfersError);
      return;
    }
    
    if (!transfersData || transfersData.length === 0) {
      setTransfers([]);
      return;
    }

    // Fetch warehouse names
    const warehouseIds = [...new Set([
      ...transfersData.map(t => t.from_warehouse_id),
      ...transfersData.map(t => t.to_warehouse_id)
    ].filter(Boolean))];
    
    const { data: warehousesData } = await supabase
      .from('warehouses')
      .select('id, name')
      .in('id', warehouseIds);
    
    const warehouseMap = {};
    (warehousesData || []).forEach(w => { warehouseMap[w.id] = w.name; });

    // Fetch transfer items - try simple query first (no joins)
    const transferIds = transfersData.map(t => t.id);
    const { data: itemsRaw, error: itemsError } = await supabase
      .from('stock_transfer_items')
      .select('*')
      .in('transfer_id', transferIds);
    
    if (itemsError) {
      console.error('Transfer items error:', itemsError);
    }

    // Look up product/ingredient names for items
    let itemsEnriched = itemsRaw || [];
    if (itemsRaw && itemsRaw.length > 0) {
      const productIds = itemsRaw.map(i => i.product_id).filter(Boolean);
      const ingredientIds = itemsRaw.map(i => i.ingredient_id).filter(Boolean);
      
      let productsMap = {};
      let ingredientsMap = {};
      
      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from('products')
          .select('id, name, barcode')
          .in('id', productIds);
        (prods || []).forEach(p => { productsMap[p.id] = p; });
      }
      
      if (ingredientIds.length > 0) {
        const { data: ings } = await supabase
          .from('ingredients')
          .select('id, name, barcode')
          .in('id', ingredientIds);
        (ings || []).forEach(i => { ingredientsMap[i.id] = i; });
      }

      itemsEnriched = itemsRaw.map(item => ({
        ...item,
        products: item.product_id ? productsMap[item.product_id] || null : null,
        ingredients: item.ingredient_id ? ingredientsMap[item.ingredient_id] || null : null
      }));
    }

    // Group items by transfer_id
    const itemsByTransfer = {};
    itemsEnriched.forEach(item => {
      if (!itemsByTransfer[item.transfer_id]) itemsByTransfer[item.transfer_id] = [];
      itemsByTransfer[item.transfer_id].push(item);
    });

    // Combine everything
    const enriched = transfersData.map(t => ({
      ...t,
      from_warehouse: { name: warehouseMap[t.from_warehouse_id] || '—' },
      to_warehouse: { name: warehouseMap[t.to_warehouse_id] || '—' },
      stock_transfer_items: itemsByTransfer[t.id] || []
    }));

    setTransfers(enriched);
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
    if (!profile?.id || !currentWarehouseId) return;
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('is_deleted', false)
      .eq('user_id', profile.id)
      .eq('warehouse_id', currentWarehouseId)
      .order('name', { ascending: true });
    if (data) setProducts(data);
  };

  const fetchIngredients = async () => {
    if (!profile?.id || !currentWarehouseId) return;
    const { data } = await supabase
      .from('ingredients')
      .select('*')
      .eq('user_id', profile.id)
      .eq('warehouse_id', currentWarehouseId)
      .order('name', { ascending: true });
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
        .update({ is_deleted: true })
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
      .update({ is_deleted: true })
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
    .filter(p => {
      if (!selectedCategory) return true;
      if (p.category_id === selectedCategory) return true;
      
      // Recursive check for subcategories
      const getAllDescendantIds = (catId) => {
        let ids = [];
        const children = categories.filter(c => c.parent_id === catId);
        ids = [...children.map(c => c.id)];
        children.forEach(child => {
          ids = [...ids, ...getAllDescendantIds(child.id)];
        });
        return ids;
      };

      const allSubIds = getAllDescendantIds(selectedCategory);
      return allSubIds.includes(p.category_id);
    })
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(p => {
      if (statusFilter === 'all') return true;
      const stock = parseFloat(p.stock_quantity || 0);
      const min = parseFloat(p.critical_stock || 15);
      if (statusFilter === 'in') return stock >= min;
      if (statusFilter === 'low') return stock > 0 && stock < min;
      if (statusFilter === 'out') return stock === 0;
      return true;
    })
    .filter(p => {
      if (supplierFilter === 'all') return true;
      return p.supplier_id === supplierFilter;
    });

  const filteredIngredients = ingredients
    .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 flex flex-col h-full w-full">
      {/* Modals */}
      <AddProductModal isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} categories={categories} suppliers={suppliers} onProductAdded={fetchProducts} initialCategoryId={selectedCategory} warehouseId={currentWarehouseId} />
      <ProductImportModal isOpen={showImport} onClose={() => setShowImport(false)} onImportComplete={fetchProducts} warehouseId={currentWarehouseId} />
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
        warehouseId={currentWarehouseId}
      />
      <EditIngredientModal 
        isOpen={!!editingIngredient} 
        ingredient={editingIngredient} 
        onClose={() => setEditingIngredient(null)} 
        onIngredientUpdated={fetchIngredients} 
      />

      {/* Header & Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col shrink-0 overflow-hidden">
        {/* Top Row: Title & Navigation */}
        <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-nowrap overflow-x-auto no-scrollbar w-full">
          <div className="flex items-center gap-4 flex-nowrap shrink-0">
            <div className="flex items-center gap-4 shrink-0">
              <div className="w-10 h-10 rounded-lg bg-merkez-blue/10 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-merkez-blue" />
              </div>
              <div id="tour-warehouse-selector">
                {warehouses?.length > 0 ? (
                  <Dropdown
                    trigger={
                      <button 
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50/50 border border-blue-100/50 rounded-lg text-xs font-bold text-gray-600 hover:text-merkez-blue hover:bg-blue-50 hover:border-blue-200 transition-all group shadow-sm"
                      >
                        {warehouses.find(w => w.id === currentWarehouseId)?.name || t('warehouse.mainWarehouse')}
                        <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                      </button>
                    }
                    items={[
                      ...(warehouses || []).map(w => ({
                        id: w.id,
                        label: w.name,
                        onClick: () => setCurrentWarehouseId(w.id),
                        active: w.id === currentWarehouseId
                      })),
                      {
                        id: 'add-new',
                        label: `+ ${t('warehouse.addNewWarehouse') || 'Добавить склад'}`,
                        onClick: () => setActiveTab('settings'),
                        className: 'text-merkez-blue font-bold border-t border-gray-50 mt-1'
                      }
                    ]}
                  />
                ) : (
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className="flex items-center gap-1 text-[10px] font-black text-merkez-blue hover:text-blue-700 transition-colors uppercase tracking-widest"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    {t('warehouse.createFirstWarehouse') || 'Создать первый склад'}
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs (Admin View) */}
            {!propActiveTab && (
              <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200/50 shrink-0 ml-2 overflow-x-auto no-scrollbar flex-nowrap max-w-full">
                <button
                  onClick={() => setActiveTab('finished')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'finished'
                      ? 'bg-white text-merkez-blue shadow-sm'
                      : 'text-gray-500 hover:text-gray-850'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  {t('warehouse.finishedGoods') || 'Məhsullar'}
                </button>
                
                {false && isRestaurantActive && (
                  <button
                    onClick={() => setActiveTab('raw')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === 'raw'
                        ? 'bg-white text-merkez-green shadow-sm'
                        : 'text-gray-500 hover:text-gray-850'
                    }`}
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                    {t('warehouse.ingredients') || 'İnqrediyentlər'}
                  </button>
                )}
                
                <button
                  onClick={() => setActiveTab('suppliers')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'suppliers'
                      ? 'bg-white text-merkez-blue shadow-sm'
                      : 'text-gray-500 hover:text-gray-850'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  {t('warehouse.suppliers') || 'Tədarükçülər'}
                </button>
                
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'history'
                      ? 'bg-white text-merkez-blue shadow-sm'
                      : 'text-gray-500 hover:text-gray-850'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  {t('warehouse.history') || 'Tarixçə'}
                </button>

                <button
                  onClick={() => setActiveTab('stocktake')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'stocktake'
                      ? 'bg-white text-merkez-blue shadow-sm'
                      : 'text-gray-500 hover:text-gray-850'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {t('warehouse.stocktake') || 'İnventarlaşdırma'}
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'reports'
                      ? 'bg-white text-merkez-blue shadow-sm'
                      : 'text-gray-500 hover:text-gray-850'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  {t('warehouse.reports') || 'Hesabatlar'}
                </button>
                
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'settings'
                      ? 'bg-white text-merkez-blue shadow-sm'
                      : 'text-gray-500 hover:text-gray-850'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  {t('common.settings') || 'Parametrlər'}
                </button>
              </div>
            )}

            {/* Vertical separator */}
            {(activeTab === 'finished' || (activeTab === 'raw' && isRestaurantActive) || activeTab === 'suppliers') && (
              <div className="h-6 w-[1px] bg-gray-200 mx-2 hidden sm:block"></div>
            )}

            {/* Tab-specific actions (Shifted to Left) */}
            {activeTab === 'finished' && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap max-w-full pb-1 -mb-1 w-full lg:w-auto lg:overflow-visible lg:pb-0 lg:mb-0 shrink-0">
                <button 
                  onClick={() => setShowCategorySidebar(!showCategorySidebar)}
                  className={`lg:hidden p-2 rounded-lg border transition-all ${showCategorySidebar ? 'bg-merkez-blue text-white border-merkez-blue' : 'bg-white text-gray-500 border-gray-200'}`}
                  title={t('warehouse.categories')}
                >
                  <Menu className="w-4 h-4" />
                </button>
                {selectedItems.length > 0 && (
                  <button 
                    id="tour-bulk-delete"
                    onClick={() => setConfirmDelete({ type: 'bulk' })} 
                    className="bg-red-50 text-red-600 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center border border-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> {t('common.deleteSelected') || 'Sil (Seçilənlər)'} ({selectedItems.length})
                  </button>
                )}
                <button onClick={() => setShowAddCategory(true)} className="bg-white border text-gray-700 border-gray-200 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center shadow-sm">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> {t('warehouse.addCategory')}
                </button>
                <button id="tour-import-btn" onClick={() => setShowImport(true)} className="bg-white border text-gray-700 border-gray-200 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center shadow-sm">
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> {t('warehouse.import')}
                </button>
              </div>
            )}

            {activeTab === 'raw' && isRestaurantActive && (
              <div className="flex items-center gap-2">
              </div>
            )}

            {activeTab === 'suppliers' && (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAddSupplier(true)} className="bg-merkez-green text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-green-600 transition-colors flex items-center shadow-md shadow-green-600/10 border border-transparent">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> {t('warehouse.addSupplier')}
                </button>
              </div>
            )}
          </div>

          {/* Moved Search Bar (relocated to filter bar) */}

          {(activeTab === 'debts' || activeTab === 'clients' || activeTab === 'staff') && (
            <div id="warehouse-top-bar-portal-target" className="relative w-full lg:flex-1 lg:max-w-3xl flex items-center gap-4 justify-between shrink-0" />
          )}

          <div className="grid grid-cols-2 lg:flex lg:flex-nowrap lg:items-center gap-2 w-full lg:w-auto ml-auto shrink-0">
            {/* Main Warehouse Actions */}
            <button 
              onClick={() => setShowSellProduct(true)} 
              className="bg-merkez-green text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-green-600 transition-colors flex items-center justify-center shadow-md shadow-green-600/10 whitespace-nowrap w-full border border-transparent"
            >
              <DollarSign className="w-3.5 h-3.5 mr-1.5 shrink-0" /> {i18n.language === 'az' ? 'Məhsul Sat' : i18n.language === 'ru' ? 'Продать товар' : 'Sell Product'}
            </button>
            <button 
              id="tour-receive-btn"
              onClick={() => setShowReceiveStock(true)} 
              className="bg-white border border-merkez-green text-merkez-green px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-green-50 transition-colors flex items-center justify-center shadow-sm whitespace-nowrap w-full"
            >
              <Truck className="w-3.5 h-3.5 mr-1.5 shrink-0" /> {t('warehouse.receiveStock') || 'Приемка'}
            </button>
            <button 
              id="tour-dispatch-btn"
              onClick={() => setShowDispatchStock(true)} 
              className="bg-white border border-merkez-red text-merkez-red px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors flex items-center justify-center shadow-sm whitespace-nowrap w-full"
            >
              <Minus className="w-3.5 h-3.5 mr-1.5 shrink-0" /> {t('warehouse.dispatchStock') || 'Списание'}
            </button>
            <button 
              id="tour-transfer-btn"
              onClick={() => setShowTransferStock(true)} 
              className="bg-white border border-merkez-blue text-merkez-blue px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors flex items-center justify-center shadow-sm whitespace-nowrap w-full"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 shrink-0" /> {t('warehouse.transferStock') || 'Перемещение'}
            </button>
            <div id="warehouse-actions-portal-target" className="contents"></div>
          </div>
        </div>
      </div>

      <div className={`flex flex-1 ${activeTab === 'history' || activeTab === 'debts' || activeTab === 'staff' || activeTab === 'clients' ? 'overflow-visible' : 'overflow-hidden'} ${activeTab === 'finished' ? '2xl:gap-6' : 'gap-6'}`}>
        {activeTab === 'debts' ? (
          <div className="flex-1 bg-white rounded-lg border border-gray-100 p-6 overflow-y-auto">
            <DebtBook />
          </div>
        ) : activeTab === 'clients' ? (
          <WarehouseClientManager />
        ) : activeTab === 'staff' ? (
          <WarehouseStaffManager />
        ) : activeTab === 'suppliers' ? (
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
        ) : activeTab === 'settings' ? (
          <WarehouseSettings />
        ) : activeTab === 'history' ? (
          <div className="flex-1 bg-white rounded-lg shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {historyTab === 'receipts' ? (t('warehouse.receiptHistory') || 'История приёмок') : 
                     historyTab === 'dispatches' ? (t('warehouse.dispatchHistory') || 'История списаний') : 
                     historyTab === 'sales' ? (t('warehouse.salesHistory') || 'Satış tarixçəsi') : 
                     (t('warehouse.transferHistory') || 'История перемещений')}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {historyTab === 'receipts' ? (t('warehouse.receiptHistoryDesc') || 'Список всех поступлений товаров от поставщиков') : 
                     historyTab === 'dispatches' ? (t('warehouse.dispatchHistoryDesc') || 'Список всех выданных и списанных товаров') : 
                     historyTab === 'sales' ? (t('warehouse.salesHistoryDesc') || 'Məhsul satışlarının ətraflı qeydləri') : 
                     (t('warehouse.transferHistoryDesc') || 'Журнал перемещения товаров между складами')}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full xl:w-auto">
                  <div className="flex p-1 bg-gray-50 rounded-lg border border-gray-100 overflow-x-auto no-scrollbar flex-nowrap max-w-full w-full sm:w-auto">
                    <button 
                      onClick={() => setHistoryTab('receipts')}
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${historyTab === 'receipts' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {t('warehouse.receipts') || 'Приёмки'}
                    </button>
                    <button 
                      onClick={() => setHistoryTab('sales')}
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${historyTab === 'sales' ? 'bg-white text-merkez-green shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {t('warehouse.salesHistory') || 'Satış tarixçəsi'}
                    </button>
                    <button 
                      onClick={() => setHistoryTab('dispatches')}
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${historyTab === 'dispatches' ? 'bg-white text-merkez-red shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {t('warehouse.dispatches') || 'Списания'}
                    </button>
                    <button 
                      onClick={() => setHistoryTab('transfers')}
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${historyTab === 'transfers' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {t('warehouse.transfers') || 'Перемещения'}
                    </button>
                  </div>
                  {(historyFilter || startDate || endDate || salesChannelFilter || categoryFilter) && (
                    <button 
                      onClick={() => {
                        setHistoryFilter(null);
                        setHistorySearchTerm('');
                        setStartDate('');
                        setEndDate('');
                        setSalesChannelFilter('');
                        setCategoryFilter('');
                      }}
                      className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                      {t('common.clearFilters') || 'Сбросить фильтры'}
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col md:flex-row gap-4 p-5 bg-gray-50/50 rounded-lg border border-gray-100">
                {historyTab === 'receipts' && (
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
                )}

                {historyTab === 'sales' && (
                  <>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        {i18n.language === 'az' ? 'Satış kanalı' : 'Канал продажи'}
                      </label>
                      <Dropdown 
                        value={salesChannelFilter} 
                        onChange={(val) => setSalesChannelFilter(val)}
                        options={[
                          { value: '', label: i18n.language === 'az' ? 'Bütün kanallar' : 'Все каналы' },
                          { value: 'Mağaza', label: i18n.language === 'az' ? 'Mağaza' : 'Магазин' },
                          { value: 'Sosial şəbəkə', label: i18n.language === 'az' ? 'Sosial şəbəkə' : 'Социальные сети' },
                          { value: 'Birmarket', label: 'Birmarket' },
                          { value: 'Kredit', label: i18n.language === 'az' ? 'Kredit (Bütün Banklar)' : 'Кредит (Все банки)' },
                          { value: 'Kredit - ABB Kredit', label: 'Kredit - ABB Kredit' },
                          { value: 'Kredit - Birkart', label: 'Kredit - Birkart' },
                          { value: 'Kredit - Tamkart', label: 'Kredit - Tamkart' },
                          { value: 'Kredit - Kapital Kredit 35', label: 'Kredit - Kapital Kredit 35' },
                          { value: 'Kredit - Ferrum Standart', label: 'Kredit - Ferrum Standart' },
                          { value: 'Kredit - Ferrum Fast', label: 'Kredit - Ferrum Fast' },
                          { value: 'Kredit - Ferrum DTI', label: 'Kredit - Ferrum DTI' }
                        ]}
                        className="w-full"
                      />
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        {i18n.language === 'az' ? 'Məhsul Kateqoriyası' : 'Категория товара'}
                      </label>
                      <Dropdown 
                        value={categoryFilter} 
                        onChange={(val) => setCategoryFilter(val)}
                        options={[
                          { value: '', label: t('common.all') || 'Все' },
                          ...categories.map(c => ({
                            value: c.id,
                            label: c.name
                          }))
                        ]}
                        className="w-full"
                      />
                    </div>
                  </>
                )}
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('common.search') || 'Поиск'}</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder={t('warehouse.searchPlaceholder') || 'Поиск по названию или штрихкоду...'} 
                      value={historySearchTerm} 
                      onChange={(e) => setHistorySearchTerm(e.target.value)} 
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors" 
                    />
                  </div>
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
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      {historyTab === 'receipts' ? t('warehouse.receivedDate') : 
                       historyTab === 'dispatches' ? (t('warehouse.dispatchedDate') || 'Дата операции') : 
                       (t('common.date') || 'Дата')}
                    </th>
                    {historyTab === 'receipts' && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{t('warehouse.supplier')}</th>}
                    {historyTab === 'dispatches' && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{t('warehouse.reason') || 'Причина'}</th>}
                    {historyTab === 'transfers' && (
                      <>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{t('warehouse.fromWarehouse') || 'Откуда'}</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{t('warehouse.toWarehouse') || 'Куда'}</th>
                      </>
                    )}
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{t('warehouse.product')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">{t('warehouse.quantity')}</th>
                    {historyTab === 'receipts' && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">{t('warehouse.unitPrice')}</th>}
                    {historyTab === 'receipts' && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">{t('common.total') || 'Итого'}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {historyTab === 'receipts' ? (
                    receipts.filter(receipt => {
                      if (historyFilter && receipt.supplier_id !== historyFilter) return false;
                      if (startDate && new Date(receipt.received_at) < new Date(startDate)) return false;
                      if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        if (new Date(receipt.received_at) > end) return false;
                      }
                      if (historySearchTerm) {
                        const search = historySearchTerm.toLowerCase();
                        const productName = (receipt.products?.name || '').toLowerCase();
                        const barcode = (receipt.products?.barcode || '').toLowerCase();
                        const supplierName = (receipt.suppliers?.name || '').toLowerCase();
                        const notes = (receipt.notes || '').toLowerCase();
                        return productName.includes(search) || barcode.includes(search) || supplierName.includes(search) || notes.includes(search);
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
                      receipts.filter(receipt => {
                        if (historyFilter && receipt.supplier_id !== historyFilter) return false;
                        if (startDate && new Date(receipt.received_at) < new Date(startDate)) return false;
                        if (endDate) {
                          const end = new Date(endDate);
                          end.setHours(23, 59, 59, 999);
                          if (new Date(receipt.received_at) > end) return false;
                        }
                        if (historySearchTerm) {
                          const search = historySearchTerm.toLowerCase();
                          const productName = (receipt.products?.name || '').toLowerCase();
                          const barcode = (receipt.products?.barcode || '').toLowerCase();
                          const supplierName = (receipt.suppliers?.name || '').toLowerCase();
                          const notes = (receipt.notes || '').toLowerCase();
                          return productName.includes(search) || barcode.includes(search) || supplierName.includes(search) || notes.includes(search);
                        }
                        return true;
                      }).map(receipt => (
                        <tr key={receipt.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-gray-700">{new Date(receipt.received_at).toLocaleDateString()}</span>
                            {receipt.notes && <p className="text-[10px] text-gray-400 font-medium max-w-[250px] break-words whitespace-normal mt-0.5">{receipt.notes}</p>}
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
                    )
                  ) : historyTab === 'dispatches' ? (
                    dispatches.filter(dispatch => {
                      if (dispatch.reason === 'sale') return false;
                      if (startDate && new Date(dispatch.issued_at) < new Date(startDate)) return false;
                      if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        if (new Date(dispatch.issued_at) > end) return false;
                      }
                      if (historySearchTerm) {
                        const search = historySearchTerm.toLowerCase();
                        const productName = (dispatch.products?.name || '').toLowerCase();
                        const barcode = (dispatch.products?.barcode || '').toLowerCase();
                        const notes = (dispatch.notes || '').toLowerCase();
                        return productName.includes(search) || barcode.includes(search) || notes.includes(search);
                      }
                      return true;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-400">
                            <Package className="w-12 h-12 text-gray-100" />
                            <p className="font-medium">{t('warehouse.noDispatchesFound') || 'История списаний пуста'}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      dispatches.filter(dispatch => {
                        if (dispatch.reason === 'sale') return false;
                        if (startDate && new Date(dispatch.issued_at) < new Date(startDate)) return false;
                        if (endDate) {
                          const end = new Date(endDate);
                          end.setHours(23, 59, 59, 999);
                          if (new Date(dispatch.issued_at) > end) return false;
                        }
                        if (historySearchTerm) {
                          const search = historySearchTerm.toLowerCase();
                          const productName = (dispatch.products?.name || '').toLowerCase();
                          const barcode = (dispatch.products?.barcode || '').toLowerCase();
                          const notes = (dispatch.notes || '').toLowerCase();
                          return productName.includes(search) || barcode.includes(search) || notes.includes(search);
                        }
                        return true;
                      }).map(dispatch => (
                        <tr key={dispatch.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-gray-700">{new Date(dispatch.issued_at).toLocaleDateString()}</span>
                            {dispatch.notes && <p className="text-[10px] text-gray-400 font-medium max-w-[250px] break-words whitespace-normal mt-0.5">{dispatch.notes}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                              dispatch.reason === 'damaged' ? 'bg-red-50 text-red-500' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {t(`warehouse.reason${dispatch.reason.charAt(0).toUpperCase() + dispatch.reason.slice(1)}`) || dispatch.reason}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900">{dispatch.products?.name || '—'}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{dispatch.products?.barcode || '—'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-black text-red-500">-{dispatch.quantity}</span>
                          </td>
                        </tr>
                      ))
                    )
                  ) : historyTab === 'sales' ? (
                    dispatches.filter(dispatch => {
                      if (dispatch.reason !== 'sale') return false;
                      if (startDate && new Date(dispatch.issued_at) < new Date(startDate)) return false;
                      if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        if (new Date(dispatch.issued_at) > end) return false;
                      }

                      // Channel filter
                      if (salesChannelFilter) {
                        const notesStr = (dispatch.notes || '').toLowerCase();
                        const filterLower = salesChannelFilter.toLowerCase();
                        let channelMatch = false;
                        if (notesStr.includes(`[kanal: ${filterLower}]`) || (filterLower === 'kredit' && notesStr.includes('[kanal: kredit -'))) {
                          channelMatch = true;
                        } else {
                          // Fallback checks for older/seeded rows
                          if (filterLower === 'birmarket') {
                            channelMatch = notesStr.includes('birmarket');
                          } else if (filterLower === 'kredit') {
                            channelMatch = notesStr.includes('kredit') || notesStr.includes('birkart') || notesStr.includes('tamkart') || notesStr.includes('abb kredit') || notesStr.includes('kapital kredit');
                          } else if (filterLower.startsWith('kredit - ')) {
                            const bankPart = filterLower.replace('kredit - ', '');
                            channelMatch = notesStr.includes(bankPart);
                          } else if (filterLower === 'mağaza') {
                            channelMatch = notesStr.includes('nəqd') || notesStr.includes('kart') || (!notesStr.includes('birmarket') && !notesStr.includes('kredit') && !notesStr.includes('sosial'));
                          } else if (filterLower === 'sosial şəbəkə') {
                            channelMatch = notesStr.includes('sosial');
                          }
                        }
                        if (!channelMatch) return false;
                      }

                      // Category filter
                      if (categoryFilter && dispatch.products?.category_id !== categoryFilter) {
                        return false;
                      }

                      if (historySearchTerm) {
                        const search = historySearchTerm.toLowerCase();
                        const productName = (dispatch.products?.name || '').toLowerCase();
                        const barcode = (dispatch.products?.barcode || '').toLowerCase();
                        const notes = (dispatch.notes || '').toLowerCase();
                        return productName.includes(search) || barcode.includes(search) || notes.includes(search);
                      }
                      return true;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-400">
                            <Package className="w-12 h-12 text-gray-100" />
                            <p className="font-medium">{t('warehouse.noSalesFound') || 'Satış tarixçəsi boşdur'}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      dispatches.filter(dispatch => {
                        if (dispatch.reason !== 'sale') return false;
                        if (startDate && new Date(dispatch.issued_at) < new Date(startDate)) return false;
                        if (endDate) {
                          const end = new Date(endDate);
                          end.setHours(23, 59, 59, 999);
                          if (new Date(dispatch.issued_at) > end) return false;
                        }

                        // Channel filter
                        if (salesChannelFilter) {
                          const notesStr = (dispatch.notes || '').toLowerCase();
                          const filterLower = salesChannelFilter.toLowerCase();
                          let channelMatch = false;
                          if (notesStr.includes(`[kanal: ${filterLower}]`) || (filterLower === 'kredit' && notesStr.includes('[kanal: kredit -'))) {
                            channelMatch = true;
                          } else {
                            // Fallback checks for older/seeded rows
                            if (filterLower === 'birmarket') {
                              channelMatch = notesStr.includes('birmarket');
                            } else if (filterLower === 'kredit') {
                              channelMatch = notesStr.includes('kredit') || notesStr.includes('birkart') || notesStr.includes('tamkart') || notesStr.includes('abb kredit') || notesStr.includes('kapital kredit');
                            } else if (filterLower.startsWith('kredit - ')) {
                              const bankPart = filterLower.replace('kredit - ', '');
                              channelMatch = notesStr.includes(bankPart);
                            } else if (filterLower === 'mağaza') {
                              channelMatch = notesStr.includes('nəqd') || notesStr.includes('kart') || (!notesStr.includes('birmarket') && !notesStr.includes('kredit') && !notesStr.includes('sosial'));
                            } else if (filterLower === 'sosial şəbəkə') {
                              channelMatch = notesStr.includes('sosial');
                            }
                          }
                          if (!channelMatch) return false;
                        }

                        // Category filter
                        if (categoryFilter && dispatch.products?.category_id !== categoryFilter) {
                          return false;
                        }

                        if (historySearchTerm) {
                          const search = historySearchTerm.toLowerCase();
                          const productName = (dispatch.products?.name || '').toLowerCase();
                          const barcode = (dispatch.products?.barcode || '').toLowerCase();
                          const notes = (dispatch.notes || '').toLowerCase();
                          return productName.includes(search) || barcode.includes(search) || notes.includes(search);
                        }
                        return true;
                      }).map(dispatch => (
                        <tr key={dispatch.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-gray-700">{new Date(dispatch.issued_at).toLocaleDateString()}</span>
                            {dispatch.notes && <p className="text-[10px] text-gray-400 font-medium max-w-[250px] break-words whitespace-normal mt-0.5">{dispatch.notes}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-50 text-merkez-green">
                              {t(`warehouse.reason${dispatch.reason.charAt(0).toUpperCase() + dispatch.reason.slice(1)}`) || dispatch.reason}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900">{dispatch.products?.name || '—'}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{dispatch.products?.barcode || '—'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-black text-red-500">-{dispatch.quantity}</span>
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    /* Transfers Tab */
                    transfers.filter(transfer => {
                      if (startDate && new Date(transfer.created_at) < new Date(startDate)) return false;
                      if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        if (new Date(transfer.created_at) > end) return false;
                      }
                      if (historySearchTerm) {
                        const search = historySearchTerm.toLowerCase();
                        const fromWH = (transfer.from_warehouse?.name || '').toLowerCase();
                        const toWH = (transfer.to_warehouse?.name || '').toLowerCase();
                        const notes = (transfer.notes || '').toLowerCase();
                        const itemsMatch = transfer.stock_transfer_items?.some(item => {
                          const productName = (item.products?.name || item.ingredients?.name || '').toLowerCase();
                          const barcode = (item.products?.barcode || item.ingredients?.barcode || '').toLowerCase();
                          return productName.includes(search) || barcode.includes(search);
                        });
                        return fromWH.includes(search) || toWH.includes(search) || notes.includes(search) || itemsMatch;
                      }
                      return true;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-400">
                            <ArrowRightLeft className="w-12 h-12 text-gray-100" />
                            <p className="font-medium">{t('warehouse.noTransfersFound') || 'История перемещений пуста'}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      transfers.filter(transfer => {
                        if (startDate && new Date(transfer.created_at) < new Date(startDate)) return false;
                        if (endDate) {
                          const end = new Date(endDate);
                          end.setHours(23, 59, 59, 999);
                          if (new Date(transfer.created_at) > end) return false;
                        }
                        if (historySearchTerm) {
                          const search = historySearchTerm.toLowerCase();
                          const fromWH = (transfer.from_warehouse?.name || '').toLowerCase();
                          const toWH = (transfer.to_warehouse?.name || '').toLowerCase();
                          const notes = (transfer.notes || '').toLowerCase();
                          const itemsMatch = transfer.stock_transfer_items?.some(item => {
                            const productName = (item.products?.name || item.ingredients?.name || '').toLowerCase();
                            const barcode = (item.products?.barcode || item.ingredients?.barcode || '').toLowerCase();
                            return productName.includes(search) || barcode.includes(search);
                          });
                          return fromWH.includes(search) || toWH.includes(search) || notes.includes(search) || itemsMatch;
                        }
                        return true;
                      }).map(transfer => (
                        <tr key={transfer.id} className="hover:bg-gray-50/50 transition-colors group border-b border-gray-50">
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-gray-700">{new Date(transfer.created_at).toLocaleDateString()}</span>
                            {transfer.notes && <p className="text-[10px] text-gray-400 font-medium max-w-[250px] break-words whitespace-normal mt-0.5">{transfer.notes}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                              {transfer.from_warehouse?.name || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-merkez-blue bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                              {transfer.to_warehouse?.name || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {transfer.stock_transfer_items?.map((item, idx) => (
                                <div key={idx} className="flex flex-col">
                                  <span className="text-sm font-bold text-gray-900">
                                    {item.products?.name || item.ingredients?.name || '—'}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {item.products?.barcode || item.ingredients?.barcode || '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col gap-1">
                              {transfer.stock_transfer_items?.map((item, idx) => (
                                <span key={idx} className="text-sm font-black text-gray-900 block py-1.5">
                                  {item.quantity}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'stocktake' ? (
          <WarehouseStocktake warehouseId={currentWarehouseId} warehouses={warehouses} isRestaurantActive={isRestaurantActive} />
        ) : activeTab === 'reports' ? (
          <WarehouseReports warehouseId={currentWarehouseId} isRestaurantActive={isRestaurantActive} />
        ) : (
        <div className="flex flex-1 gap-0 2xl:gap-6 overflow-hidden relative">
          {activeTab === 'finished' && (
              <div id="tour-categories" className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-md shadow-2xl p-6 flex flex-col 
                lg:static lg:z-auto lg:shadow-none lg:bg-gray-50/30 lg:border lg:border-gray-100 lg:rounded-lg
                transition-transform duration-300 border-r border-gray-100 lg:border-r-0
                ${showCategorySidebar ? 'translate-x-0 lg:flex' : '-translate-x-full lg:hidden'}
              `}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-merkez-blue/10 flex items-center justify-center">
                      <FolderTree className="w-4 h-4 text-merkez-blue" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{t('warehouse.categories')}</h3>
                  </div>
                  <button onClick={() => setShowCategorySidebar(false)} className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1.5 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                  <div 
                    className={`group p-3 rounded-lg cursor-pointer text-sm font-bold transition-all duration-200 flex items-center justify-between ${selectedCategory === null ? 'bg-merkez-blue text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm'}`} 
                    onClick={() => setSelectedCategory(null)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${selectedCategory === null ? 'bg-white' : 'bg-gray-300 group-hover:bg-merkez-blue'}`} />
                      {t('warehouse.allCategories')}
                    </div>
                  </div>

                  <div className="my-4 border-t border-gray-100/50" />

                  {(() => {
                    const getDescendantIds = (catId) => {
                      let ids = [];
                      const children = categories.filter(c => c.parent_id === catId);
                      ids = [...children.map(c => c.id)];
                      children.forEach(child => {
                        ids = [...ids, ...getDescendantIds(child.id)];
                      });
                      return ids;
                    };

                    const renderCategory = (cat, level = 0) => {
                      const hasSubcategories = categories.some(sub => sub.parent_id === cat.id);
                      const isExpanded = expandedCategories.includes(cat.id);
                      const isActive = selectedCategory === cat.id;
                      
                      const descendantIds = getDescendantIds(cat.id);
                      const count = products.filter(p => p.category_id === cat.id || descendantIds.includes(p.category_id)).length;
                      
                      return (
                        <React.Fragment key={cat.id}>
                          <div 
                            className={`group p-3 rounded-lg cursor-pointer text-sm flex items-center justify-between font-bold transition-all duration-200 ${isActive ? 'bg-white text-merkez-blue shadow-md border border-blue-50' : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'}`} 
                            style={{ marginLeft: level > 0 ? `${level * 12}px` : '0' }}
                            onClick={() => {
                              setSelectedCategory(isActive ? null : cat.id);
                              if (hasSubcategories && !isExpanded) {
                                setExpandedCategories(prev => [...prev, cat.id]);
                              }
                            }}
                          >
                            <div className="flex items-center flex-1 truncate gap-3">
                              {hasSubcategories ? (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedCategories(prev => 
                                      prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                                    );
                                  }}
                                  className={`p-1 rounded-md transition-colors ${isExpanded ? 'bg-blue-50 text-merkez-blue' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}
                                >
                                  <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                              ) : (
                                <div className="w-5 h-5 flex items-center justify-center opacity-40">
                                  <Folder className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <span className="truncate" title={t(`categories.${cat.name}`, { defaultValue: cat.name })}>{t(`categories.${cat.name}`, { defaultValue: cat.name })}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isActive ? 'bg-merkez-blue text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {count}
                              </span>
                            </div>
                          </div>

                          {isExpanded && categories
                            .filter(sub => sub.parent_id === cat.id)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(subcat => renderCategory(subcat, level + 1))
                          }
                        </React.Fragment>
                      );
                    };

                    return categories
                      .filter(c => !c.parent_id)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(cat => renderCategory(cat));
                  })()}
                </div>
                
                <div className="pt-6 mt-auto border-t border-gray-100/50">
                  <button 
                    onClick={() => setShowAddCategory(true)} 
                    className="w-full py-3 bg-white border border-gray-200 text-gray-500 rounded-lg text-xs font-black hover:border-merkez-blue hover:text-merkez-blue hover:shadow-lg hover:shadow-blue-600/5 transition-all flex items-center justify-center gap-2 group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                    {t('warehouse.addCategory')}
                  </button>
                </div>
              </div>
            )}

        {/* Overlay for mobile sidebar */}
        {activeTab === 'finished' && showCategorySidebar && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 2xl:hidden"
            onClick={() => setShowCategorySidebar(false)}
          />
        )}

        {/* Products/Ingredients Table Area */}
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 overflow-hidden w-full">
          <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row gap-4 relative z-20 items-center justify-between">
            <div className="flex items-center gap-2 flex-1 w-full xl:max-w-3xl shrink-0">
              {activeTab === 'finished' && (
                <button
                  className="p-2 text-gray-500 hover:text-merkez-blue bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors shrink-0"
                  onClick={() => setShowCategorySidebar(!showCategorySidebar)}
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              {(activeTab === 'finished' || activeTab === 'raw') && (
                <div id="tour-search" className="relative w-full flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder={activeTab === 'finished' ? t('warehouse.searchPlaceholder') : t('warehouse.searchIngredients')} 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors" 
                  />
                </div>
              )}

              {activeTab === 'finished' && (
                <button id="tour-add-product-btn" onClick={() => setShowAddProduct(true)} className="bg-merkez-green text-white px-4 py-2 rounded-lg text-sm font-medium border border-transparent hover:bg-green-600 transition-colors flex items-center justify-center shadow-sm shrink-0">
                  <Plus className="w-4 h-4 mr-1.5 shrink-0" /> {t('warehouse.addProduct')}
                </button>
              )}

              {activeTab === 'raw' && isRestaurantActive && (
                <button onClick={() => setShowAddIngredient(true)} className="bg-merkez-green text-white px-4 py-2 rounded-lg text-sm font-medium border border-transparent hover:bg-green-600 transition-colors flex items-center justify-center shadow-sm shrink-0">
                  <Plus className="w-4 h-4 mr-1.5 shrink-0" /> {t('warehouse.addIngredient')}
                </button>
              )}

              <div className="relative shrink-0 xl:hidden" ref={filterRef}>
                <button 
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`border p-2 rounded-lg transition-colors ${statusFilter !== 'all' ? 'bg-blue-50 border-merkez-blue text-merkez-blue' : 'bg-gray-50 border-gray-100 text-gray-500 hover:text-gray-700'}`}
                >
                  <Filter className="w-5 h-5" />
                </button>
                
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-100 rounded-lg shadow-xl w-48 py-1.5 animate-in fade-in zoom-in-95">
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

            {activeTab === 'finished' && (
              <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto xl:ml-auto">
                <div className="w-full sm:w-56 shrink-0">
                  <Dropdown
                    value={selectedCategory || 'all'}
                    onChange={(val) => setSelectedCategory(val === 'all' ? null : val)}
                    options={[
                      { value: 'all', label: t('warehouse.allCategories') || 'Bütün kateqoriyalar' },
                      ...formatCategoriesHierarchically(categories, null, t).map(c => ({ value: c.id, label: c.label }))
                    ]}
                    buttonClassName="rounded-lg px-4 py-2 text-sm w-full"
                  />
                </div>

                <div className="w-full sm:w-56 shrink-0">
                  <Dropdown
                    value={supplierFilter}
                    onChange={setSupplierFilter}
                    options={[
                      { value: 'all', label: t('warehouse.allSuppliers') || 'Bütün tədarükçülər' },
                      ...suppliers.map(s => ({ value: s.id, label: s.name }))
                    ]}
                    buttonClassName="rounded-lg px-4 py-2 text-sm w-full"
                  />
                </div>
              </div>
            )}

            <div className="relative shrink-0 hidden xl:block" ref={filterRef}>
              <button 
                id="tour-filter"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`border p-2 rounded-lg transition-colors ${statusFilter !== 'all' ? 'bg-blue-50 border-merkez-blue text-merkez-blue' : 'bg-gray-50 border-gray-100 text-gray-500 hover:text-gray-700'}`}
              >
                <Filter className="w-5 h-5" />
              </button>
              
              {showFilterDropdown && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-100 rounded-lg shadow-xl w-48 py-1.5 animate-in fade-in zoom-in-95">
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
                <>
                  <table className="hidden md:table w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10">
                      <tr className="border-b border-gray-100 text-[10px] uppercase text-gray-500 tracking-wider">
                        <th className="pl-8 pr-2 py-4 w-10">
                          <button 
                            id="tour-select-all"
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
                      {filteredProducts.map((item, index) => (
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
                              {item.categories?.name ? (t(`categories.${item.categories.name}`, { defaultValue: item.categories.name })) : '—'}
                            </span>
                          </td>
                          <td className="px-2 py-4 text-sm text-gray-500">${parseFloat(item.purchase_price || 0).toFixed(2)}</td>
                          <td className="px-2 py-4 text-sm font-bold text-gray-900">${parseFloat(item.price).toFixed(2)}</td>
                          <td className="px-2 py-4 text-sm font-bold text-gray-900">
                            {parseFloat(item.stock_quantity || 0).toFixed(2)} {t('restaurant.' + (item.unit || 'pcs')) || item.unit || 'шт'}
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
                                id={index === 0 ? "tour-actions" : undefined}
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                                className="text-gray-400 hover:text-merkez-blue transition-colors p-1.5 rounded-md hover:bg-blue-50"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>

                              {openMenuId === item.id && (
                                <div className="absolute right-0 top-9 z-30 bg-white border border-gray-100 rounded-lg shadow-xl w-56 py-1.5 animate-in fade-in zoom-in-95">
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

                  {/* Mobile Products Cards Grid */}
                  <div className="md:hidden divide-y divide-gray-100 overflow-y-auto flex-1">
                    {filteredProducts.map((item, index) => (
                      <div key={item.id} className={`p-4 flex flex-col gap-2.5 ${selectedItems.includes(item.id) ? 'bg-blue-50/20' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => toggleSelectItem(item.id)}
                              className="text-gray-400 hover:text-merkez-blue transition-colors mt-0.5"
                            >
                              {selectedItems.includes(item.id) ? (
                                <CheckSquare className="w-5 h-5 text-merkez-blue" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                              <span className="text-[10px] font-mono text-gray-400 mt-1 block">
                                {item.barcode || '—'}
                              </span>
                            </div>
                          </div>

                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                              className="text-gray-400 hover:text-merkez-blue transition-colors p-1"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            {openMenuId === item.id && (
                              <div className="absolute right-0 top-7 z-30 bg-white border border-gray-100 rounded-lg shadow-xl w-44 py-1.5 animate-in fade-in zoom-in-95">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-merkez-blue" />
                                  {t('warehouse.editProduct') || 'Düzəliş et'}
                                </button>
                                <div className="mx-3 my-1 border-t border-gray-100" />
                                <button
                                  onClick={() => requestDeleteProduct(item.id)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors font-semibold"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {t('warehouse.deleteProduct') || 'Sil'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-blue-50 text-merkez-blue px-2 py-0.5 rounded-full font-bold">
                            {item.categories?.name || '—'}
                          </span>
                          <div className={`flex items-center text-[10px] font-bold ${getStatusColor(item.stock_quantity, item.critical_stock)}`}>
                            {getStatusIcon(item.stock_quantity, item.critical_stock)}
                            <span className="ml-1">{getStatusText(item.stock_quantity, item.critical_stock)}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50 mt-1">
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">{t('warehouse.thPurchasePrice') || 'Alış'}</span>
                            <span className="text-xs font-bold text-gray-500">${parseFloat(item.purchase_price || 0).toFixed(2)}</span>
                          </div>
                          <div className="text-center">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">{t('warehouse.thPrice') || 'Satış'}</span>
                            <span className="text-xs font-black text-gray-900">${parseFloat(item.price).toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">{t('warehouse.thStock') || 'Stok'}</span>
                            <span className="text-xs font-black text-gray-900">{parseFloat(item.stock_quantity || 0).toFixed(2)} {t('restaurant.' + (item.unit || 'pcs')) || item.unit || 'шт'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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
                <>
                  <table className="hidden md:table w-full text-left border-collapse">
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
                                <div className="absolute right-0 top-9 z-30 bg-white border border-gray-100 rounded-lg shadow-xl w-56 py-1.5 animate-in fade-in zoom-in-95">
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

                  {/* Mobile Ingredients Cards Grid */}
                  <div className="md:hidden divide-y divide-gray-100 overflow-y-auto flex-1">
                    {filteredIngredients.map(item => (
                      <div key={item.id} className="p-4 flex flex-col gap-2.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                            <span className="text-[10px] text-gray-500 mt-1 block">
                              Ölçü vahidi: <strong className="text-gray-700">{item.unit || '—'}</strong>
                            </span>
                          </div>

                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                              className="text-gray-400 hover:text-merkez-blue transition-colors p-1"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            {openMenuId === item.id && (
                              <div className="absolute right-0 top-7 z-30 bg-white border border-gray-100 rounded-lg shadow-xl w-44 py-1.5 animate-in fade-in zoom-in-95">
                                <button
                                  onClick={() => handleEditIngredient(item)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-semibold animate-in fade-in zoom-in-95"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-merkez-green" />
                                  {t('warehouse.editIngredient') || 'Düzəliş et'}
                                </button>
                                <div className="mx-3 my-1 border-t border-gray-100" />
                                <button
                                  onClick={() => requestDeleteIngredient(item.id)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors font-semibold"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {t('warehouse.deleteIngredient') || 'Sil'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={`flex items-center text-[10px] font-bold ${getStatusColor(item.quantity, item.min_quantity)}`}>
                          {getStatusIcon(item.quantity, item.min_quantity)}
                          <span className="ml-1">{getStatusText(item.quantity, item.min_quantity)}</span>
                        </div>

                        <div className="flex justify-between items-center bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50 mt-1">
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">{t('warehouse.thCostPrice') || 'Mayə Dəyəri'}</span>
                            <span className="text-xs font-bold text-gray-900">${parseFloat(item.cost_price || 0).toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">{t('warehouse.thStock') || 'Stok'}</span>
                            <span className="text-xs font-black text-gray-900">{parseFloat(item.quantity || 0).toFixed(3)} {item.unit || ''}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </div>
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

      <ModalPortal>
        <ReceiveStockModal 
          isOpen={showReceiveStock} 
          onClose={() => setShowReceiveStock(false)} 
          products={activeTab === 'finished' ? products : ingredients} 
          suppliers={suppliers}
          onStockReceived={fetchAll}
          type={activeTab === 'finished' ? 'product' : 'ingredient'}
          warehouseId={currentWarehouseId}
        />
      </ModalPortal>

      <ModalPortal>
        <DispatchStockModal
          isOpen={showDispatchStock}
          onClose={() => setShowDispatchStock(false)}
          products={activeTab === 'finished' ? products : ingredients}
          onStockDispatched={fetchAll}
          type={activeTab === 'finished' ? 'product' : 'ingredient'}
          warehouseId={currentWarehouseId}
        />
      </ModalPortal>

      <ModalPortal>
        <TransferStockModal
          isOpen={showTransferStock}
          onClose={() => setShowTransferStock(false)}
          products={activeTab === 'finished' ? products : ingredients}
          warehouses={warehouses}
          onStockTransferred={fetchAll}
          type={activeTab === 'finished' ? 'product' : 'ingredient'}
        />
      </ModalPortal>

      <ModalPortal>
        <SellProductModal
          isOpen={showSellProduct}
          onClose={() => setShowSellProduct(false)}
          onSaleComplete={fetchAll}
          warehouseId={currentWarehouseId}
        />
      </ModalPortal>
      {confirmDelete && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
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
                    className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-lg font-black hover:bg-gray-100 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    onClick={confirmDelete.type === 'bulk' ? handleBulkDelete : executeDelete}
                    className="flex-1 py-4 bg-red-500 text-white rounded-lg font-black shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <WarehouseTour 
        isOpen={showTour}
        onClose={() => setShowTour(false)}
      />
    </div>
  );
};

export default WarehouseModule;
