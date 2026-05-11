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
  History as HistoryIcon,
  ShoppingCart,
  EyeOff,
  RotateCcw,
  CheckSquare,
  Square,
  Trash2
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

interface SaleItem {
  id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  price_at_sale: number;
  base_price?: number;
  discount_amount?: number;
  discount_type?: 'percent' | 'fixed';
  total: number;
  products?: { name: string };
}

interface Sale {
  id: string;
  user_id: string;
  total_amount: number;
  tax_amount: number;
  payment_method: 'cash' | 'card' | 'split';
  split_cash?: number;
  split_card?: number;
  discount_amount?: number;
  discount_type?: 'percent' | 'fixed';
  created_at: string;
  is_hidden?: boolean;
  retail_sale_items: SaleItem[];
}

interface UserProfile {
  id: string;
  full_name?: string;
  // ... other fields if needed
}

const monthNames: Record<string, string[]> = {
  az: ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr'],
  ru: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December']
};

const weekDays: Record<string, string[]> = {
  az: ['B.E','Ç.A','Ç','C.A','C','Ş','B'],
  ru: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],
  en: ['Mo','Tu','We','Th','Fr','Sa','Su']
};

const RetailHistory: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser() as { profile: UserProfile | null };
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'card' | 'split'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    
    const months = monthNames[i18n.language] || monthNames.az;
    return `${d} ${months[m]} ${y} ${h}:${min}`;
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
        .select('*, retail_sale_items(*)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err: any) {
      toast.error(t('retail.historyError') || 'Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSales.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSales.map(s => s.id));
    }
  };

  const hideSelectedSales = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('retail_sales')
        .update({ is_hidden: true })
        .in('id', selectedIds);
      if (error) throw error;
      toast.success(t('retail.history.hiddenSuccess') || 'Hidden successfully');
      setSelectedIds([]);
      fetchSales();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const restoreHiddenSales = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('retail_sales')
        .update({ is_hidden: false })
        .eq('user_id', profile?.id)
        .eq('is_hidden', true);
      if (error) throw error;
      toast.success(t('retail.history.restoredSuccess') || 'Restored all hidden items');
      fetchSales();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.total_amount.toString().includes(searchQuery);
    const matchesPayment = paymentFilter === 'all' || sale.payment_method === paymentFilter;
    const matchesHidden = showHidden ? sale.is_hidden : !sale.is_hidden;
    let matchesDate = true;
    if (rangeStart) {
      const start = new Date(rangeStart); start.setHours(0,0,0,0);
      matchesDate = matchesDate && new Date(sale.created_at) >= start;
    }
    if (rangeEnd) {
      const end = new Date(rangeEnd); end.setHours(23,59,59,999);
      matchesDate = matchesDate && new Date(sale.created_at) <= end;
    }
    return matchesSearch && matchesPayment && matchesDate && matchesHidden;
  });

  const clearFilters = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setPaymentFilter('all');
    setSearchQuery('');
    setShowCalendar(false);
    setShowFilter(false);
  };

  const hasActiveFilters = rangeStart || rangeEnd || paymentFilter !== 'all';

  // Calendar helpers
  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfWeek = (d: Date) => { const day = new Date(d.getFullYear(), d.getMonth(), 1).getDay(); return day === 0 ? 6 : day - 1; };
  
  const handleDayClick = (day: number) => {
    const clicked = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(clicked);
      setRangeEnd(null);
    } else {
      if (clicked < rangeStart) { setRangeEnd(rangeStart); setRangeStart(clicked); }
      else { setRangeEnd(clicked); }
    }
  };

  const isInRange = (day: number) => {
    if (!rangeStart || !rangeEnd) return false;
    const d = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    return d >= rangeStart && d <= rangeEnd;
  };

  const isStart = (day: number) => rangeStart && day === rangeStart.getDate() && calendarMonth.getMonth() === rangeStart.getMonth() && calendarMonth.getFullYear() === rangeStart.getFullYear();
  const isEnd = (day: number) => rangeEnd && day === rangeEnd.getDate() && calendarMonth.getMonth() === rangeEnd.getMonth() && calendarMonth.getFullYear() === rangeEnd.getFullYear();
  const isToday = (day: number) => { const t = new Date(); return day === t.getDate() && calendarMonth.getMonth() === t.getMonth() && calendarMonth.getFullYear() === t.getFullYear(); };


  const lang = i18n.language || 'ru';

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Sub-navigation */}
      <div className="flex items-center gap-2 mb-8 bg-white p-2 rounded-2xl border border-gray-100 w-fit">
        <NavLink to="/retail" end className={({ isActive }) => `px-6 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>{t('retail.pos')}</NavLink>
        <NavLink to="/retail/inventory" className={({ isActive }) => `px-6 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>{t('retail.inventory.title')}</NavLink>
        <NavLink to="/retail/history" className={({ isActive }) => `px-6 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>{t('retail.history.title')}</NavLink>
      </div>

      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-merkez-blue/10 flex items-center justify-center">
            <HistoryIcon className="w-6 h-6 text-merkez-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('retail.history.title')}</h1>
            <p className="text-sm text-gray-500">{t('retail.history.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center min-w-[120px]">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('retail.history.totalSales')}</span>
            <span className="text-2xl font-black text-gray-900">{sales.length}</span>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex flex-col items-center min-w-[120px]">
            <span className="text-[10px] font-black text-green-600/60 uppercase tracking-widest mb-1">{t('retail.history.revenue')}</span>
            <span className="text-2xl font-black text-green-600">{sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0).toFixed(2)} ₼</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-merkez-blue transition-colors" />
          <input 
            type="text" 
            placeholder={t('retail.history.searchPlaceholder')}
            className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-merkez-blue transition-all outline-none font-medium" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <button 
              onClick={() => { setShowCalendar(!showCalendar); setShowFilter(false); }} 
              className={`w-full flex items-center justify-center gap-2 px-5 py-3 font-bold rounded-2xl transition-all ${rangeStart || rangeEnd ? 'bg-merkez-blue/10 text-merkez-blue border border-merkez-blue/20' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            >
              <Calendar className="w-4 h-4" />
              {t('retail.history.period')}
              {(rangeStart || rangeEnd) && <span className="w-2 h-2 rounded-full bg-merkez-blue" />}
            </button>
            {showCalendar && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-[340px] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-black text-gray-900">{(monthNames[lang] || monthNames.ru)[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500 font-bold">&lt;</button>
                    <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500 font-bold">&gt;</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-0 mb-1">
                  {(weekDays[lang] || weekDays.ru).map(d => (
                    <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-wider py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0">
                  {Array.from({ length: getFirstDayOfWeek(calendarMonth) }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: getDaysInMonth(calendarMonth) }).map((_, i) => {
                    const day = i + 1;
                    const selected = isStart(day) || isEnd(day);
                    const inRange = isInRange(day);
                    const today = isToday(day);
                    return (
                      <button key={day} onClick={() => handleDayClick(day)} className={`relative w-full aspect-square flex items-center justify-center text-sm font-bold transition-all ${selected ? 'bg-merkez-blue text-white rounded-xl z-10 shadow-lg shadow-blue-500/30' : inRange ? 'bg-merkez-blue/10 text-merkez-blue' : today ? 'ring-2 ring-merkez-blue/30 rounded-xl text-merkez-blue' : 'text-gray-700 hover:bg-gray-100 rounded-xl'}`}>
                        {day}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-4 mt-2 border-t border-gray-100">
                  <button onClick={() => { setRangeStart(null); setRangeEnd(null); }} className="flex-1 py-2.5 text-xs font-bold text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">{lang === 'az' ? 'Təmizlə' : lang === 'en' ? 'Clear' : 'Очистить'}</button>
                  <button onClick={() => setShowCalendar(false)} className="flex-1 py-2.5 text-xs font-bold text-white bg-merkez-blue rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">{lang === 'az' ? 'Tətbiq et' : lang === 'en' ? 'Apply' : 'Применить'}</button>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={hideSelectedSales}
            disabled={selectedIds.length === 0 || isProcessing}
            className={`p-3 rounded-2xl border transition-all ${selectedIds.length > 0 ? 'bg-red-50 border-red-100 text-red-500 hover:bg-red-100' : 'bg-gray-50 border-gray-100 text-gray-300'}`}
            title={t('retail.history.hideSelected')}
          >
            <EyeOff className={`w-5 h-5 ${isProcessing ? 'animate-pulse' : ''}`} />
          </button>

          <button 
            onClick={restoreHiddenSales}
            disabled={isProcessing}
            className="p-3 bg-gray-50 border border-gray-100 text-gray-600 rounded-2xl hover:bg-gray-100 transition-all"
            title={t('retail.history.restoreHidden')}
          >
            <RotateCcw className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
          </button>

          <div className="relative flex-1 md:flex-none">
            <button 
              onClick={() => { setShowFilter(!showFilter); setShowCalendar(false); }} 
              className={`w-full flex items-center justify-center gap-2 px-5 py-3 font-bold rounded-2xl transition-all ${paymentFilter !== 'all' ? 'bg-merkez-blue/10 text-merkez-blue border border-merkez-blue/20' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            >
              <Filter className="w-4 h-4" />
              {t('retail.history.filters')}
              {paymentFilter !== 'all' && <span className="w-2 h-2 rounded-full bg-merkez-blue" />}
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-56 animate-in fade-in zoom-in-95 duration-150">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('retail.paymentMethod')}</p>
                <div className="space-y-1.5">
                  {(['all', 'cash', 'card', 'split'] as const).map(method => (
                    <button key={method} onClick={() => { setPaymentFilter(method); setShowFilter(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${paymentFilter === method ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {method === 'all' ? (i18n.language === 'az' ? 'Hamısı' : i18n.language === 'en' ? 'All' : 'Все') : method === 'cash' ? t('retail.cash') : method === 'card' ? t('retail.card') : 'Split'}
                    </button>
                  ))}
                  <div className="pt-2 border-t border-gray-100 mt-2">
                    <button 
                      onClick={() => { setShowHidden(!showHidden); setShowFilter(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${showHidden ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span>{t('retail.history.showHidden') || 'Show Hidden'}</span>
                      <div className={`w-10 h-5 rounded-full transition-all relative ${showHidden ? 'bg-orange-500' : 'bg-gray-200'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showHidden ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-4 py-3 text-xs font-bold text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-all">✕</button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden flex-1 flex flex-col shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 w-16">
                  <button 
                    onClick={toggleSelectAll}
                    className="text-gray-400 hover:text-merkez-blue transition-colors"
                  >
                    {selectedIds.length === filteredSales.length && filteredSales.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-merkez-blue" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="px-2 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('retail.history.tableReceipt')} / {t('retail.history.tableTime')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('retail.history.tablePayment')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('retail.history.tableVat')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('retail.history.tableTotal')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('retail.history.tableActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-merkez-blue/20 border-t-merkez-blue rounded-full animate-spin" />
                      <p className="text-sm font-bold text-gray-400">{t('common.loading')}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <HistoryIcon className="w-12 h-12 text-gray-100" />
                      <p className="text-sm font-bold text-gray-400">{t('retail.history.empty')}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.map(sale => (
                <tr key={sale.id} className={`hover:bg-gray-50/30 transition-colors group ${selectedIds.includes(sale.id) ? 'bg-blue-50/30' : ''} ${sale.is_hidden ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-8 py-5">
                    <button 
                      onClick={() => toggleSelect(sale.id)}
                      className="text-gray-400 hover:text-merkez-blue transition-colors"
                    >
                      {selectedIds.includes(sale.id) ? (
                        <CheckSquare className="w-5 h-5 text-merkez-blue" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-2 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-merkez-blue/10 transition-colors shrink-0">
                        <ShoppingCart className="w-5 h-5 text-gray-400 group-hover:text-merkez-blue" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-tight">{t('retail.history.tableReceipt')} #{sale.id?.slice(0, 8).toUpperCase() || '---'}</p>
                        <p className="text-[10px] text-gray-500 mt-1 font-bold">
                          {formatDate(sale.created_at)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      sale.payment_method === 'card' ? 'bg-blue-50 text-blue-700' : 
                      sale.payment_method === 'split' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'
                    }`}>
                      {sale.payment_method === 'card' ? <CreditCard className="w-3 h-3" /> : 
                       sale.payment_method === 'split' ? (
                         <div className="flex items-center -space-x-1">
                           <Banknote className="w-2.5 h-2.5" />
                           <CreditCard className="w-2.5 h-2.5" />
                         </div>
                       ) : <Banknote className="w-3 h-3" />}
                      {sale.payment_method === 'card' ? t('retail.card') : 
                       sale.payment_method === 'split' ? 'Split' : t('retail.cash')}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right font-bold text-gray-500 tabular-nums">
                    {Number(sale.tax_amount || 0).toFixed(2)} ₼
                  </td>
                  <td className="px-8 py-5 text-right">
                    <p className="text-lg font-black text-gray-900 tabular-nums">{Number(sale.total_amount).toFixed(2)} ₼</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setSelectedSale(sale)}
                        className="p-2.5 bg-gray-50 text-gray-400 hover:bg-merkez-blue hover:text-white rounded-xl transition-all shadow-sm hover:shadow-blue-500/20"
                        title={t('retail.history.viewDetails')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2.5 bg-gray-50 text-gray-400 hover:bg-green-500 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-green-500/20"
                        title={t('retail.history.downloadPdf')}
                      >
                        <Download className="w-4 h-4" />
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-md" onClick={() => setSelectedSale(null)} />
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
                <div className="bg-gray-50/50 rounded-3xl p-2 border border-gray-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <th className="px-4 py-4">{t('retail.itemName')}</th>
                        <th className="px-4 py-4 text-center">{t('retail.quantity')}</th>
                        <th className="px-4 py-4 text-right">{t('retail.price')}</th>
                        <th className="px-4 py-4 text-right">{t('retail.total')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedSale.retail_sale_items?.map((item: SaleItem) => (
                        <tr key={item.id} className="text-sm">
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800">{item.product_name || item.products?.name || t('retail.itemDeleted')}</span>
                              {!!item.discount_amount && item.discount_amount > 0 && (
                                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                                  {t('retail.discount')} -{Number(item.discount_amount).toFixed(2)}{item.discount_type === 'percent' ? '%' : ' ₼'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-gray-600 tabular-nums">{item.quantity}</td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-col items-end tabular-nums">
                              {item.base_price && item.base_price > item.price_at_sale ? (
                                <span className="text-[10px] text-gray-400 line-through">{Number(item.base_price).toFixed(2)}</span>
                              ) : null}
                              <span className="font-medium text-gray-500">{Number(item.price_at_sale || 0).toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-black text-gray-900 tabular-nums">{Number(item.total || 0).toFixed(2)} ₼</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-end pt-6 border-t border-gray-100">
                <div className="space-y-1">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('retail.paymentMethod')}</p>
                  {selectedSale.payment_method === 'split' ? (
                    <div className="space-y-1">
                      <p className="font-bold text-gray-900">Split Payment</p>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-lg w-fit">
                        <Banknote className="w-3 h-3" />
                        {Number(selectedSale.split_cash || 0).toFixed(2)} ₼
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit">
                        <CreditCard className="w-3 h-3" />
                        {Number(selectedSale.split_card || 0).toFixed(2)} ₼
                      </div>
                    </div>
                  ) : (
                    <p className="font-bold text-gray-900">{selectedSale.payment_method === 'card' ? t('retail.card') : t('retail.cash')}</p>
                  )}
                </div>
                <div className="text-right space-y-2">
                  {selectedSale.discount_amount && selectedSale.discount_amount > 0 && (
                    <div className="flex justify-between items-center gap-8">
                      <span className="text-xs font-black text-green-600 uppercase tracking-widest">{t('retail.discount')}</span>
                      <span className="font-bold text-green-600">-{Number(selectedSale.discount_amount).toFixed(2)} ₼</span>
                    </div>
                  )}
                  <div className="pt-2">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('retail.totalToPay')}</p>
                    <p className="text-4xl font-black text-merkez-blue tabular-nums">{Number(selectedSale.total_amount).toFixed(2)} ₼</p>
                  </div>
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
