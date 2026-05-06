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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: 'Grocery',
    purchase_price: 0,
    sale_price: 0,
    stock_quantity: 0,
    critical_stock: 5,
    excise_stamp_required: false
  });

  useEffect(() => {
    fetchProducts();
  }, []);

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
        category: p.categories?.name || p.category || 'Без категории',
        sale_price: p.price || p.sale_price || 0
      }));
      setProducts(mappedData);
    } catch (err: any) {
      toast.error('Ошибка загрузки: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        barcode: formData.barcode,
        purchase_price: formData.purchase_price,
        price: formData.sale_price,
        stock_quantity: formData.stock_quantity,
        critical_stock: formData.critical_stock,
        excise_stamp_required: formData.excise_stamp_required
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Товар обновлен');
      } else {
        if (!profile?.id) throw new Error('Пользователь не авторизован');
        const { error } = await supabase
          .from('products')
          .insert([{ 
            ...payload,
            user_id: profile.id 
          }]);
        if (error) throw error;
        toast.success('Товар добавлен');
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      toast.error('Ошибка сохранения: ' + err.message);
    }
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      purchase_price: product.purchase_price,
      sale_price: product.sale_price,
      stock_quantity: product.stock_quantity,
      critical_stock: product.critical_stock,
      excise_stamp_required: product.excise_stamp_required
    });
    setIsModalOpen(true);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Вы уверены, что хотите архивировать этот товар?')) return;
    try {
      const { error } = await supabase
        .from('products')
        .update({ archived: true })
        .eq('id', id);
      if (error) throw error;
      toast.success('Товар архивирован');
      fetchProducts();
    } catch (err: any) {
      toast.error('Ошибка при удалении: ' + err.message);
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
      {/* Sub-navigation */}
      <div className="flex items-center gap-2 mb-8 bg-white p-2 rounded-2xl border border-gray-100 w-fit">
        <NavLink to="/retail" end className={({ isActive }) => `px-6 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>{t('retail.pos')}</NavLink>
        <NavLink to="/retail/inventory" className={({ isActive }) => `px-6 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>{t('retail.inventory')}</NavLink>
        <NavLink to="/retail/history" className={({ isActive }) => `px-6 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>{t('retail.history')}</NavLink>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-merkez-blue/10 rounded-xl">
              <Package className="w-6 h-6 text-merkez-blue" />
            </div>
            Управление инвентарем
          </h1>
          <p className="text-gray-500 font-medium mt-1">Отслеживайте остатки и цены в реальном времени</p>
        </div>
        
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              name: '',
              barcode: '',
              category: 'Grocery',
              purchase_price: 0,
              sale_price: 0,
              stock_quantity: 0,
              critical_stock: 5,
              excise_stamp_required: false
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-merkez-blue text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Добавить товар
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Всего товаров</p>
          <p className="text-3xl font-black text-gray-900">{products.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Критический остаток</p>
          <p className="text-3xl font-black text-red-500">
            {products.filter(p => p.stock_quantity <= p.critical_stock).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Сумма склада (зак.)</p>
          <p className="text-3xl font-black text-green-600">
            {products.reduce((sum, p) => sum + (p.purchase_price * p.stock_quantity), 0).toLocaleString()} ₼
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ожидаемая выручка</p>
          <p className="text-3xl font-black text-blue-600">
            {products.reduce((sum, p) => sum + (p.sale_price * p.stock_quantity), 0).toLocaleString()} ₼
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Поиск по названию или штрих-коду..."
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
                Имя {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                onClick={() => toggleSort('price')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'price' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Цена {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                onClick={() => toggleSort('stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'stock' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Остаток {sortBy === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all">
              <Filter className="w-4 h-4" />
              Фильтры
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 text-left">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Товар</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Категория</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Закупка</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Продажа</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Остаток</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Загрузка...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Товары не найдены</td>
                </tr>
              ) : filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Barcode className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-none">{product.name}</p>
                        <p className="text-xs text-gray-500 mt-1 font-mono">{product.barcode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-600">
                    {(product.purchase_price || 0).toFixed(2)} ₼
                  </td>
                  <td className="px-6 py-4 text-right font-black text-gray-900">
                    {(product.sale_price || 0).toFixed(2)} ₼
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`
                      inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold
                      ${product.stock_quantity <= product.critical_stock 
                        ? 'bg-red-50 text-red-600' 
                        : 'bg-green-50 text-green-700'}
                    `}>
                      {product.stock_quantity <= product.critical_stock && <AlertTriangle className="w-3 h-3" />}
                      {product.stock_quantity} шт
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEdit(product)}
                        className="p-2 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteProduct(product.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <form onSubmit={handleSave} className="flex flex-col">
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-900">
                  {editingProduct ? 'Редактировать товар' : 'Добавить новый товар'}
                </h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              <div className="p-8 grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Наименование товара</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-merkez-blue/20 transition-all font-bold"
                    placeholder="Например: Coca-Cola 0.5L"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Штрих-код (EAN-13)</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-merkez-blue/20 transition-all font-mono"
                    placeholder="0000000000000"
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Категория</label>
                  <Dropdown 
                    value={formData.category}
                    onChange={(val) => setFormData({...formData, category: val})}
                    options={[
                      { value: 'Grocery', label: 'Бакалея' },
                      { value: 'Alcohol', label: 'Алкоголь' },
                      { value: 'Tobacco', label: 'Табак' },
                      { value: 'Beverages', label: 'Напитки' },
                      { value: 'Dairy', label: 'Молочные продукты' },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Цена закупки</label>
                  <input 
                    type="number" step="0.01"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-merkez-blue/20 transition-all font-bold"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Цена продажи</label>
                  <input 
                    type="number" step="0.01"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-merkez-blue/20 transition-all font-bold"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({...formData, sale_price: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Текущий остаток</label>
                  <input 
                    type="number"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-merkez-blue/20 transition-all font-bold text-merkez-blue"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Критический порог</label>
                  <input 
                    type="number"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-merkez-blue/20 transition-all font-bold text-red-500"
                    value={formData.critical_stock}
                    onChange={(e) => setFormData({...formData, critical_stock: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="col-span-2 flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <input 
                    type="checkbox" 
                    id="excise"
                    className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    checked={formData.excise_stamp_required}
                    onChange={(e) => setFormData({...formData, excise_stamp_required: e.target.checked})}
                  />
                  <label htmlFor="excise" className="text-sm font-bold text-amber-800">
                    Требовать сканирование акцизной марки (для алкоголя/табака)
                  </label>
                </div>
              </div>

              <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-all"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="px-10 py-3 bg-merkez-blue text-white rounded-xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all"
                >
                  {editingProduct ? 'Сохранить изменения' : 'Создать товар'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailInventory;
