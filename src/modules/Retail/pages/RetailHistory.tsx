import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Filter, 
  Eye, 
  Download, 
  CreditCard, 
  Banknote,
  ChevronRight,
  ArrowUpDown,
  History,
  ShoppingCart
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

interface SaleItem {
  id: string;
  product_id: string;
  quantity: number;
  price_at_sale: number;
  total: number;
  products?: { name: string };
}

interface Sale {
  id: string;
  user_id: string;
  total_amount: number;
  tax_amount: number;
  payment_method: 'cash' | 'card';
  created_at: string;
  retail_sale_items: SaleItem[];
}

interface UserProfile {
  id: string;
  full_name?: string;
  // ... other fields if needed
}

const RetailHistory: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser() as { profile: UserProfile | null };
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = i18n.language === 'az' ? 'az-AZ' : 'ru-RU';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  useEffect(() => {
    fetchSales();
  }, [profile]);

  const fetchSales = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('retail_sales')
        .select('*, retail_sale_items(*, products(name))')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err: any) {
      toast.error(t('retail.historyError') || 'Ошибка загрузки истории: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale => 
    sale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.total_amount.toString().includes(searchQuery)
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Sub-navigation */}
      <div className="flex items-center gap-2 mb-8 bg-white p-2 rounded-2xl border border-gray-100 w-fit">
        <NavLink to="/retail" end className={({ isActive }) => `px-6 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>{t('retail.pos')}</NavLink>
        <NavLink to="/retail/inventory" className={({ isActive }) => `px-6 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>{t('retail.inventory')}</NavLink>
        <NavLink to="/retail/history" className={({ isActive }) => `px-6 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>{t('retail.history')}</NavLink>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-merkez-blue/10 rounded-xl">
              <History className="w-8 h-8 text-merkez-blue" />
            </div>
            {t('retail.historyTitle')}
          </h1>
          <p className="text-gray-500 mt-1 font-medium">{t('retail.historySubtitle')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-8">
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('retail.totalChecks')}</p>
              <p className="text-xl font-black text-gray-900">{sales.length}</p>
            </div>
            <div className="w-[1px] h-8 bg-gray-100" />
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('retail.revenue')}</p>
              <p className="text-xl font-black text-green-600">
                {sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0).toFixed(2)} ₼
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder={t('retail.idOrAmount')}
            className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-merkez-blue/20 transition-all outline-none font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all">
            <Calendar className="w-4 h-4" />
            {t('retail.period')}
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all">
            <Filter className="w-4 h-4" />
            {t('retail.filters')}
          </button>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 text-left border-b border-gray-100">
                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{t('retail.currentCheck')} / {t('common.time')}</th>
                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{t('retail.paymentMethod')}</th>
                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-[0.2em] text-right">{t('retail.tax')}</th>
                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-[0.2em] text-right">{t('retail.total')}</th>
                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-[0.2em] text-center">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-medium animate-pulse text-lg">{t('common.loading')}</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-medium text-lg">{t('dashboard.noSales')}</td></tr>
              ) : filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-merkez-blue/10 transition-colors">
                        <ShoppingCart className="w-6 h-6 text-gray-400 group-hover:text-merkez-blue" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 leading-none">{t('retail.currentCheck')} #{sale.id?.slice(0, 8).toUpperCase() || '---'}</p>
                        <p className="text-xs text-gray-500 mt-2 font-bold">
                          {formatDate(sale.created_at)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                      sale.payment_method === 'card' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                    }`}>
                      {sale.payment_method === 'card' ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                      {sale.payment_method === 'card' ? t('retail.card') : t('retail.cash')}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right font-bold text-gray-500">
                    {Number(sale.tax_amount).toFixed(2)} ₼
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="text-lg font-black text-gray-900">{Number(sale.total_amount).toFixed(2)} ₼</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setSelectedSale(sale)}
                        className="p-3 bg-gray-50 text-gray-400 hover:bg-merkez-blue hover:text-white rounded-xl transition-all shadow-sm hover:shadow-blue-500/20"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button className="p-3 bg-gray-50 text-gray-400 hover:bg-green-500 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-green-500/20">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedSale(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900">{t('retail.saleDetails')}</h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                   #{selectedSale.id?.toUpperCase() || '---'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSale(null)}
                className="p-3 hover:bg-white rounded-2xl transition-all text-gray-400 hover:text-gray-900"
              >
                <ChevronRight className="w-6 h-6 rotate-90" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{t('retail.composition')}</h3>
                <div className="bg-gray-50/50 rounded-3xl p-2 border border-gray-100">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-4 py-4">{t('retail.itemName')}</th>
                        <th className="px-4 py-4 text-center">{t('retail.quantity')}</th>
                        <th className="px-4 py-4 text-right">{t('retail.price')}</th>
                        <th className="px-4 py-4 text-right">{t('retail.total')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedSale.retail_sale_items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4 font-bold text-gray-800">{item.products?.name || t('retail.itemDeleted')}</td>
                          <td className="px-4 py-4 text-center font-bold text-gray-600">{item.quantity}</td>
                          <td className="px-8 py-4 text-right font-medium text-gray-500">{Number(item.price_at_sale || 0).toFixed(2)}</td>
                          <td className="px-4 py-4 text-right font-black text-gray-900">{Number(item.total || 0).toFixed(2)} ₼</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-end pt-6 border-t border-gray-100">
                <div className="space-y-1">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('retail.paymentMethod')}</p>
                  <p className="font-bold text-gray-900">{selectedSale.payment_method === 'card' ? t('retail.card') : t('retail.cash')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('retail.totalToPay')}</p>
                  <p className="text-4xl font-black text-merkez-blue">{Number(selectedSale.total_amount).toFixed(2)} ₼</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
              <button className="flex-1 py-4 bg-white border-2 border-gray-100 rounded-2xl font-black text-gray-600 hover:border-merkez-blue/30 transition-all">
                {t('retail.printReceipt')}
              </button>
              <button 
                onClick={() => setSelectedSale(null)}
                className="flex-1 py-4 bg-merkez-blue text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailHistory;
