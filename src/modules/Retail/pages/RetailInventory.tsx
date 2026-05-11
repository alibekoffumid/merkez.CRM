import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  MoreHorizontal,
  ChevronRight,
  Barcode,
  ArrowUpDown,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import { toast } from 'react-hot-toast';
import { RetailProduct } from '../../../types/retail';
import { UserProfile } from '../../../types/auth';
import Dropdown from '../../../components/Common/Dropdown';
import DatePicker from '../../../components/Common/DatePicker';

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  activeModules: string[];
}

// Local Product interface removed

const RetailInventory: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useUser() as UserContextType;
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category_id: '',
    purchase_price: 0,
    sale_price: 0,
    stock_quantity: 0,
    critical_stock: 5,
    expiry_date: '',
    excise_stamp_required: false,
    discount_type: 'none',
    discount_value: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCategories(), fetchProducts()]);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedData = (data || []).map(p => ({
        ...p,
        category: p.categories?.name || t('common.noCategory'),
        sale_price: p.price || p.sale_price || 0
      }));
      setProducts(mappedData);
    } catch (err: any) {
      toast.error(t('common.error') + ': ' + err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        barcode: formData.barcode,
        category_id: formData.category_id || null,
        purchase_price: formData.purchase_price,
        price: formData.sale_price,
        stock_quantity: formData.stock_quantity,
        critical_stock: formData.critical_stock,
        expiry_date: formData.expiry_date || null,
        excise_stamp_required: formData.excise_stamp_required,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success(t('common.updated'));
      } else {
        if (!profile?.id) throw new Error(t('common.unauthorized'));
        const { error } = await supabase
          .from('products')
          .insert([{ 
            ...payload,
            user_id: profile.id 
          }]);
        if (error) throw error;
        toast.success(t('common.added'));
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(t('common.error') + ': ' + err.message);
    }
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      category_id: product.category_id || '',
      purchase_price: product.purchase_price,
      sale_price: product.sale_price,
      stock_quantity: product.stock_quantity || 0,
      critical_stock: product.critical_stock || 5,
      expiry_date: product.expiry_date ? product.expiry_date.split('T')[0] : '',
      excise_stamp_required: product.excise_stamp_required || false,
      discount_type: product.discount_type || 'none',
      discount_value: product.discount_value || 0
    });
    setIsModalOpen(true);
  };

  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      const { error } = await supabase
        .from('products')
        .update({ archived: true })
        .eq('id', confirmDeleteId);
      if (error) throw error;
      toast.success(t('common.archived'));
      setConfirmDeleteId(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(t('common.error') + ': ' + err.message);
    }
  };

  const toggleSort = (key: 'name' | 'price' | 'stock') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const filteredProducts = products
    .filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let valA, valB;
      if (sortBy === 'name') { valA = a.name; valB = b.name; }
      else if (sortBy === 'price') { valA = a.sale_price; valB = b.sale_price; }
      else { valA = a.stock_quantity; valB = b.stock_quantity; }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="p-8">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-40 bg-gray-50/80 backdrop-blur-md -mx-8 px-8 py-4 mb-8 border-b border-gray-200/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Sub-navigation */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 w-fit shadow-sm">
            <NavLink to="/retail" end className={({ isActive }) => `px-6 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>{t('retail.pos')}</NavLink>
            <NavLink to="/retail/inventory" className={({ isActive }) => `px-6 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>{t('retail.inventory.title')}</NavLink>
            <NavLink to="/retail/history" className={({ isActive }) => `px-6 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>{t('retail.history.title')}</NavLink>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  name: '',
                  barcode: '',
                  category_id: '',
                  purchase_price: 0,
                  sale_price: 0,
                  stock_quantity: 0,
                  critical_stock: 5,
                  expiry_date: '',
                  excise_stamp_required: false,
                  discount_type: 'none',
                  discount_value: 0
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-merkez-blue text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              {t('retail.inventory.addProduct')}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('retail.inventory.totalProducts')}</p>
          <p className="text-3xl font-black text-gray-900">{products.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('retail.inventory.criticalStock')}</p>
          <p className="text-3xl font-black text-red-500">
            {products.filter(p => p.stock_quantity <= p.critical_stock).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('retail.inventory.stockValue')}</p>
          <p className="text-3xl font-black text-green-600">
            {products.reduce((sum, p) => sum + (p.purchase_price * p.stock_quantity), 0).toLocaleString()} ₼
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('retail.inventory.expectedRevenue')}</p>
          <p className="text-3xl font-black text-blue-600">
            {products.reduce((sum, p) => sum + (p.sale_price * p.stock_quantity), 0).toLocaleString()} ₼
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder={t('retail.inventory.searchPlaceholder')}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-merkez-blue/20 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
              <button 
                onClick={() => toggleSort('name')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'name' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t('retail.inventory.sortName')} {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                onClick={() => toggleSort('price')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'price' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t('retail.inventory.sortPrice')} {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                onClick={() => toggleSort('stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'stock' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t('retail.inventory.sortStock')} {sortBy === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all">
              <Filter className="w-4 h-4" />
              {t('retail.inventory.filters')}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('retail.inventory.tableProduct')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('retail.inventory.tableCategory')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('retail.inventory.tablePurchase')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('retail.inventory.tableSale')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('retail.inventory.tableStock')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t('retail.inventory.status')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('retail.inventory.tableActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-merkez-blue/20 border-t-merkez-blue rounded-full animate-spin" />
                      <p className="text-xs font-bold text-gray-400">{t('common.loading')}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Package className="w-12 h-12 text-gray-100" />
                      <p className="text-xs font-bold text-gray-400">{t('retail.inventory.empty') || t('common.noData')}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-merkez-blue/10 transition-colors shrink-0">
                        <Barcode className="w-5 h-5 text-gray-400 group-hover:text-merkez-blue" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-tight">{product.name}</p>
                        <p className="text-[10px] text-gray-500 mt-1 font-mono tracking-wider">{product.barcode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      {product.categories?.name || t('common.noCategory')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right font-bold text-gray-500 tabular-nums">
                    {(product.purchase_price || 0).toFixed(2)} ₼
                  </td>
                  <td className="px-8 py-5 text-right font-black text-gray-900 tabular-nums">
                    <div className="flex items-center justify-end gap-2">
                      <span>{(product.sale_price || 0).toFixed(2)} ₼</span>
                      {product.discount_type !== 'none' && product.discount_value > 0 && (
                        <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          -{product.discount_value}{product.discount_type === 'percent' ? '%' : '₼'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className={`
                      inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest
                      ${product.stock_quantity <= product.critical_stock 
                        ? 'bg-red-50 text-red-600' 
                        : 'bg-green-50 text-green-700'}
                    `}>
                      {product.stock_quantity <= product.critical_stock && <AlertTriangle className="w-3 h-3" />}
                      {product.stock_quantity} {t('common.unit')}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex justify-center">
                      {product.expiry_date ? (() => {
                        const expiry = new Date(product.expiry_date);
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const diffTime = expiry.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays < 0) {
                          return <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider">{t('retail.inventory.expired')}</span>;
                        } else if (diffDays <= 10) {
                          return <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-wider">{t('retail.inventory.expiringSoon', { count: diffDays })}</span>;
                        } else {
                          return <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-black uppercase tracking-wider">{t('retail.inventory.ok', { count: diffDays })}</span>;
                        }
                      })() : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEdit(product)}
                        className="p-2.5 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-xl transition-all"
                        title={t('common.edit')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteId(product.id)}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-10">
          <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl max-h-[calc(100vh-5rem)] rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <form onSubmit={handleSave} className="flex flex-col overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h2 className="text-2xl font-black text-gray-900">
                  {editingProduct ? t('retail.inventory.editProduct') || t('common.edit') : t('retail.inventory.addProduct')}
                </h2>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-3 hover:bg-white rounded-2xl transition-all text-gray-400 hover:text-gray-900"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              <div className="p-8 grid grid-cols-2 gap-6 overflow-y-auto flex-1">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t('retail.inventory.tableProduct')}</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-merkez-blue border rounded-2xl transition-all font-bold outline-none"
                    placeholder="Coca-Cola 0.5L"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t('retail.inventory.tableBarcode')}</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-merkez-blue border rounded-2xl transition-all font-mono outline-none"
                    placeholder="0000000000000"
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t('retail.inventory.tableCategory')}</label>
                  <Dropdown 
                    value={formData.category_id}
                    onChange={(val) => setFormData({...formData, category_id: val})}
                    options={[
                      { value: '', label: t('common.noCategory') },
                      ...categories.map(cat => ({ value: cat.id, label: cat.name })),
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t('retail.inventory.tablePurchase')}</label>
                  <input 
                    type="number" step="0.01"
                    className="w-full px-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-merkez-blue border rounded-2xl transition-all font-bold outline-none"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t('retail.inventory.tableSale')}</label>
                  <input 
                    type="number" step="0.01"
                    className="w-full px-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-merkez-blue border rounded-2xl transition-all font-bold outline-none"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({...formData, sale_price: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t('retail.inventory.tableStock')}</label>
                  <input 
                    type="number"
                    className="w-full px-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-merkez-blue border rounded-2xl transition-all font-bold text-merkez-blue outline-none"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('retail.inventory.criticalStock')}</label>
                  <input 
                    type="number" 
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-merkez-blue focus:bg-white rounded-2xl outline-none transition-all font-bold"
                    value={formData.critical_stock}
                    onChange={(e) => setFormData({ ...formData, critical_stock: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <DatePicker 
                    label={t('retail.inventory.expiryDate')}
                    value={formData.expiry_date}
                    onChange={(val) => setFormData({ ...formData, expiry_date: val })}
                    position="top"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t('retail.inventory.discountType')}</label>
                  <Dropdown 
                    value={formData.discount_type}
                    onChange={(val) => setFormData({...formData, discount_type: val})}
                    options={[
                      { value: 'none', label: t('retail.inventory.noDiscount') },
                      { value: 'percent', label: t('retail.inventory.percentage') },
                      { value: 'fixed', label: t('retail.inventory.fixedAmount') }
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t('retail.inventory.discountValue')}</label>
                  <input 
                    type="number" step="0.01"
                    disabled={formData.discount_type === 'none'}
                    className={`w-full px-6 py-4 border-transparent border rounded-2xl transition-all font-bold outline-none ${formData.discount_type === 'none' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 focus:bg-white focus:border-merkez-blue text-green-600'}`}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div className="col-span-2 flex items-center gap-4 p-5 bg-amber-50 rounded-[2rem] border border-amber-100">
                  <input 
                    type="checkbox" 
                    id="excise"
                    className="w-6 h-6 rounded-lg border-amber-300 text-amber-600 focus:ring-amber-500"
                    checked={formData.excise_stamp_required}
                    onChange={(e) => setFormData({...formData, excise_stamp_required: e.target.checked})}
                  />
                  <label htmlFor="excise" className="text-sm font-bold text-amber-800 cursor-pointer select-none">
                    {t('retail.exciseRequired')}
                  </label>
                </div>
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-200 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  className="px-12 py-4 bg-merkez-blue text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all"
                >
                  {editingProduct ? t('common.save') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-md" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">{t('common.confirmDelete')}</h3>
                <p className="text-gray-500 font-medium mt-2 leading-relaxed">
                  {t('common.confirmArchive')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full mt-4">
                <button 
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-6 py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={executeDelete}
                  className="px-6 py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailInventory;
