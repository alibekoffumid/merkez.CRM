import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { useTranslation } from 'react-i18next';
import { 
  DollarSign, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Loader2, 
  Download, 
  Copy, 
  Search,
  ShoppingCart,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const WarehouseReports = ({ warehouseId, isRestaurantActive = false }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('product'); // 'product' or 'ingredient'
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalCost: 0,
    totalRetail: 0,
    potentialProfit: 0,
    totalItems: 0,
    lowStockItemsCount: 0
  });

  useEffect(() => {
    if (profile?.id && warehouseId) {
      fetchReportData();
    }
  }, [profile, warehouseId]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', profile.id);
      setCategories(cats || []);

      // Fetch suppliers
      const { data: sups } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('user_id', profile.id);
      setSuppliers(sups || []);

      // Fetch products
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, barcode, stock_quantity, critical_stock, purchase_price, price, category_id, supplier_id')
        .eq('user_id', profile.id)
        .eq('warehouse_id', warehouseId)
        .eq('is_deleted', false);
      setProducts(prods || []);

      // Fetch ingredients
      const { data: ings } = await supabase
        .from('ingredients')
        .select('id, name, quantity, min_quantity, cost_price, category_id')
        .eq('user_id', profile.id)
        .eq('warehouse_id', warehouseId)
        .eq('is_deleted', false);
      setIngredients(ings || []);

    } catch (err) {
      console.error('Error fetching reports data:', err);
      toast.error('Məlumat yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  // Recalculate stats whenever products, ingredients or reportType change
  useEffect(() => {
    if (reportType === 'product') {
      const totalCost = products.reduce((sum, p) => sum + (parseFloat(p.stock_quantity || 0) * parseFloat(p.purchase_price || 0)), 0);
      const totalRetail = products.reduce((sum, p) => sum + (parseFloat(p.stock_quantity || 0) * parseFloat(p.price || 0)), 0);
      const lowStock = products.filter(p => parseFloat(p.stock_quantity || 0) < parseFloat(p.critical_stock || 15));
      
      setStats({
        totalCost,
        totalRetail,
        potentialProfit: totalRetail - totalCost,
        totalItems: products.length,
        lowStockItemsCount: lowStock.length
      });
    } else {
      const totalCost = ingredients.reduce((sum, i) => sum + (parseFloat(i.quantity || 0) * parseFloat(i.cost_price || 0)), 0);
      const lowStock = ingredients.filter(i => parseFloat(i.quantity || 0) < parseFloat(i.min_quantity || 10));
      
      setStats({
        totalCost,
        totalRetail: 0, // Ingredients don't have retail price
        potentialProfit: 0,
        totalItems: ingredients.length,
        lowStockItemsCount: lowStock.length
      });
    }
  }, [reportType, products, ingredients]);

  const getLowStockList = () => {
    if (reportType === 'product') {
      return products.filter(p => parseFloat(p.stock_quantity || 0) < parseFloat(p.critical_stock || 15));
    } else {
      return ingredients.filter(i => parseFloat(i.quantity || 0) < parseFloat(i.min_quantity || 10));
    }
  };

  const getFilteredLowStockList = () => {
    const list = getLowStockList();
    if (!searchQuery) return list;
    return list.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.barcode && item.barcode.includes(searchQuery))
    );
  };

  const exportPurchaseOrder = () => {
    const list = getLowStockList();
    if (list.length === 0) {
      toast.error('Kritik həddə olan məhsul tapılmadı');
      return;
    }

    let text = `MƏRKƏZ ANBAR - SİFARİŞ SİYAHISI\nTarix: ${new Date().toLocaleDateString()}\n\n`;
    
    if (reportType === 'product') {
      text += `Məhsul Adı | Barkod | Anbarda | Kritik Hədd | Cari Qiymət | Təchizatçı\n`;
      text += `--------------------------------------------------------------------------\n`;
      list.forEach(item => {
        const supName = suppliers.find(s => s.id === item.supplier_id)?.name || '-';
        text += `${item.name} | ${item.barcode || '-'} | ${item.stock_quantity} | ${item.critical_stock} | ₼${item.purchase_price || 0} | ${supName}\n`;
      });
    } else {
      text += `İnqrediyent Adı | Anbarda | Kritik Hədd | Cari Qiymət\n`;
      text += `--------------------------------------------------------\n`;
      list.forEach(item => {
        text += `${item.name} | ${item.quantity} | ${item.min_quantity} | ₼${item.cost_price || 0}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    toast.success('Sifariş siyahısı panoya kopyalandı!');
  };

  if (loading) {
    return (
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-merkez-blue" />
      </div>
    );
  }

  const lowStockItems = getFilteredLowStockList();

  return (
    <div className="flex-1 space-y-6">
      {/* Sub tabs */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100/80">
        {isRestaurantActive ? (
          <div className="flex gap-2">
            <button
              onClick={() => setReportType('product')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                reportType === 'product'
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Məhsul hesabatları
            </button>
            <button
              onClick={() => setReportType('ingredient')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                reportType === 'ingredient'
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              İnqrediyent hesabatları
            </button>
          </div>
        ) : (
          <h3 className="text-sm font-bold text-gray-900 px-2">Məhsul hesabatları</h3>
        )}

        <button
          onClick={fetchReportData}
          className="text-xs font-bold text-merkez-blue hover:underline"
        >
          Yenilə
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cost */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Məhsul Mayası</p>
            <h4 className="text-xl font-black text-gray-900">₼{stats.totalCost.toFixed(2)}</h4>
          </div>
        </div>

        {/* Retail */}
        {reportType === 'product' && (
          <>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Satış Dəyəri</p>
                <h4 className="text-xl font-black text-gray-900">₼{stats.totalRetail.toFixed(2)}</h4>
              </div>
            </div>

            {/* Profit */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-merkez-blue flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Gözlənilən Qazanc</p>
                <h4 className="text-xl font-black text-gray-900">₼{stats.potentialProfit.toFixed(2)}</h4>
              </div>
            </div>
          </>
        )}

        {/* Total Items */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-500 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Cəmi Çeşid</p>
            <h4 className="text-xl font-black text-gray-900">{stats.totalItems}</h4>
          </div>
        </div>

        {/* Low Stock count */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.lowStockItemsCount > 0 ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-green-50 text-green-500'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Kritik Həddə Olanlar</p>
            <h4 className="text-xl font-black text-gray-900">{stats.lowStockItemsCount}</h4>
          </div>
        </div>
      </div>

      {/* Low Stock Report Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Kritik Hədd Hesabatı</h3>
            <p className="text-xs text-gray-500 font-medium">Anbarda təyin olunmuş minimum miqdardan az qalan məhsullar</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Axtar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-merkez-blue bg-gray-50/50 focus:bg-white transition-all w-48"
              />
            </div>

            <button
              onClick={exportPurchaseOrder}
              className="px-4 py-2 bg-merkez-blue text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-md shadow-blue-600/10"
            >
              <Copy className="w-3.5 h-3.5" />
              Sifariş Siyahısı
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {lowStockItems.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
              <Package className="w-10 h-10 text-gray-200" />
              <p className="text-xs font-bold">Kritik həddə olan heç bir məhsul tapılmadı.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/40">
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Adı</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategoriya</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Anbarda</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Minimum limit</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Alış Qiyməti</th>
                  {reportType === 'product' && (
                    <>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Satış Qiyməti</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Təchizatçı</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                      {item.barcode && <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{item.barcode}</div>}
                    </td>
                    <td className="p-4 text-xs font-bold text-gray-500">
                      {categories.find(c => c.id === item.category_id)?.name || '-'}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black bg-red-50 text-red-500 border border-red-100">
                        {reportType === 'product' ? item.stock_quantity : item.quantity}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-bold text-gray-500 text-center">
                      {reportType === 'product' ? item.critical_stock : item.min_quantity}
                    </td>
                    <td className="p-4 text-xs font-bold text-gray-900 text-right">
                      ₼{reportType === 'product' ? (item.purchase_price || 0).toFixed(2) : (item.cost_price || 0).toFixed(2)}
                    </td>
                    {reportType === 'product' && (
                      <>
                        <td className="p-4 text-xs font-bold text-emerald-600 text-right">
                          ₼{(item.price || 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-500">
                          {suppliers.find(s => s.id === item.supplier_id)?.name || '-'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehouseReports;
