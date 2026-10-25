import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Wallet, 
  Banknote, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  FileText, 
  CheckCircle2, 
  Printer, 
  ArrowDownRight, 
  Receipt, 
  Coins, 
  TrendingDown, 
  Layers, 
  AlertCircle,
  CreditCard,
  Building2,
  Check,
  RefreshCw,
  Car,
  Utensils,
  Package,
  Wrench,
  Briefcase
} from 'lucide-react';
import ModalPortal from '../../components/Common/ModalPortal';
import Dropdown from '../../components/Common/Dropdown';
import AnimatedNumber from '../../components/Common/AnimatedNumber';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import { printThermalExpenseVoucher } from './thermalReceiptService';

const EXPENSE_CATEGORIES = [
  { 
    id: 'Taksi', 
    icon: Car, 
    labelAz: 'Taksi / Nəqliyyat', 
    shortAz: 'Taksi',
    labelRu: 'Такси / Транспорт', 
    shortRu: 'Такси',
    color: 'text-amber-600 bg-amber-50 border-amber-200' 
  },
  { 
    id: 'Yemək', 
    icon: Utensils, 
    labelAz: 'Yemək / Qida', 
    shortAz: 'Yemək',
    labelRu: 'Обед / Еда', 
    shortRu: 'Еда / Обед',
    color: 'text-orange-600 bg-orange-50 border-orange-200' 
  },
  { 
    id: 'Kuryer', 
    icon: Package, 
    labelAz: 'Kuryer / Çatdırılma', 
    shortAz: 'Kuryer',
    labelRu: 'Курьер / Доставка', 
    shortRu: 'Курьер',
    color: 'text-blue-600 bg-blue-50 border-blue-200' 
  },
  { 
    id: 'Təsərrüfat', 
    icon: Wrench, 
    labelAz: 'Təsərrüfat / Xırdavat', 
    shortAz: 'Təsərrüfat',
    labelRu: 'Хоз. расходы', 
    shortRu: 'Хозрасходы',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200' 
  },
  { 
    id: 'Kommunal', 
    icon: Building2, 
    labelAz: 'Kommunal / İcarə', 
    shortAz: 'Kommunal',
    labelRu: 'Аренда / Коммуналка', 
    shortRu: 'Коммуналка',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200' 
  },
  { 
    id: 'Maaş', 
    icon: Briefcase, 
    labelAz: 'Maaş / Avans', 
    shortAz: 'Maaş / Avans',
    labelRu: 'Зарплата / Аванс', 
    shortRu: 'Зарплата',
    color: 'text-purple-600 bg-purple-50 border-purple-200' 
  },
  { 
    id: 'Digər', 
    icon: FileText, 
    labelAz: 'Digər xərc', 
    shortAz: 'Digər xərc',
    labelRu: 'Прочие расходы', 
    shortRu: 'Прочие',
    color: 'text-slate-600 bg-slate-100 border-slate-200' 
  }
];

export const parseExpenseDetails = (description = '') => {
  const desc = String(description || '');
  const recipMatch = desc.match(/\[Xərcləyən:\s*([^\]]+)\]/i);
  const sourceMatch = desc.match(/\[Mənbə:\s*([^\]]+)\]/i);
  const cleanNote = desc
    .replace(/\[Xərcləyən:\s*[^\]]+\]/gi, '')
    .replace(/\[Mənbə:\s*[^\]]+\]/gi, '')
    .trim();

  return {
    recipient: recipMatch ? recipMatch[1].trim() : null,
    source: sourceMatch ? sourceMatch[1].trim() : 'Nağd Kassa',
    cleanNote: cleanNote || '—'
  };
};

const CashboxExpensesModal = ({ isOpen, onClose, warehouseId, warehouseName }) => {
  const { t, i18n } = useTranslation();
  const { profile, currentStaff } = useUser();
  const isAdmin = !currentStaff || currentStaff?.role === 'Admin' || currentStaff?.role?.toLowerCase() === 'admin' || currentStaff?.role?.toLowerCase() === 'owner';

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [todayCashSalesTotal, setTodayCashSalesTotal] = useState(0);
  const [staffAndMasters, setStaffAndMasters] = useState([]);
  
  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('all');
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'all'

  // Add Expense Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Taksi');
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState('');
  const [paymentSource, setPaymentSource] = useState('Nağd Kassa'); // 'Nağd Kassa' | 'Bank / Kart hesabı'
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Fetch expenses and today's cash sales
  const fetchData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      // 1. Fetch business_expenses
      const { data: expData, error: expErr } = await supabase
        .from('business_expenses')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (expErr) throw expErr;
      setExpenses(expData || []);

      // 2. Fetch today's cash inflows from stock_dispatches (reason = 'sale' and payment is Nağd)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data: salesDispatches, error: sErr } = await supabase
        .from('stock_dispatches')
        .select('id, notes, created_at, issued_at')
        .eq('user_id', profile.id)
        .eq('reason', 'sale')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      if (!sErr && salesDispatches) {
        let cashTotal = 0;
        salesDispatches.forEach(disp => {
          const n = String(disp.notes || '').toLowerCase();
          // Exclude cancelled / refunded
          if (n.includes('[status: refunded]') || n.includes('[status: cancelled]') || n.includes('qaytarıldı')) return;
          
          // Check if cash sale
          const isCash = n.includes('ödəniş: nağd') || n.includes('ödəniş: nəqd') || (!n.includes('ödəniş: kart') && !n.includes('ödəniş: kredit') && !n.includes('ödəniş: nisyə') && !n.includes('birmarket'));
          if (isCash) {
            const priceMatch = n.match(/\[Məbləğ:\s*₼?([0-9.,]+)\]/i) || n.match(/\[Cəmi:\s*₼?([0-9.,]+)\]/i);
            if (priceMatch) {
              cashTotal += parseFloat(priceMatch[1].replace(',', '.'));
            }
          }
        });
        setTodayCashSalesTotal(cashTotal);
      }

      // 3. Fetch staff and masters for recipient selector
      fetchStaffAndMasters();
    } catch (err) {
      console.error('Error fetching cashbox data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffAndMasters = async () => {
    if (!profile?.id) return;
    try {
      const list = [];
      const seen = new Set();

      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, role')
        .eq('user_id', profile.id)
        .order('name');

      if (staffData) {
        staffData.forEach(s => {
          if (s.name && !seen.has(s.name.toLowerCase().trim())) {
            seen.add(s.name.toLowerCase().trim());
            list.push({
              id: `staff_${s.id}`,
              name: s.name,
              displayName: `${s.name}${s.role ? ` (${s.role})` : ''}`
            });
          }
        });
      }

      const { data: mastersData } = await supabase
        .from('warehouse_masters')
        .select('id, name')
        .eq('user_id', profile.id)
        .order('name');

      if (mastersData) {
        mastersData.forEach(m => {
          if (m.name && !seen.has(m.name.toLowerCase().trim())) {
            seen.add(m.name.toLowerCase().trim());
            list.push({
              id: `master_${m.id}`,
              name: m.name,
              displayName: `${m.name} (Usta)`
            });
          }
        });
      }

      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setStaffAndMasters(list);
    } catch (err) {
      console.warn('Error fetching staff list:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, profile?.id]);

  // Calculations
  const todayExpensesList = useMemo(() => {
    return expenses.filter(e => {
      const d = e.expense_date || (e.created_at ? e.created_at.split('T')[0] : '');
      return d === todayStr;
    });
  }, [expenses, todayStr]);

  const todayCashExpensesTotal = useMemo(() => {
    return todayExpensesList
      .filter(e => {
        const details = parseExpenseDetails(e.description);
        return details.source === 'Nağd Kassa';
      })
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }, [todayExpensesList]);

  const todayAllExpensesTotal = useMemo(() => {
    return todayExpensesList.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }, [todayExpensesList]);

  // Actual cash in register = Cash sales - Cash expenses
  const netCashInHand = useMemo(() => {
    return Math.max(0, todayCashSalesTotal - todayCashExpensesTotal);
  }, [todayCashSalesTotal, todayCashExpensesTotal]);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Date filter
      if (dateFilter === 'today') {
        const d = e.expense_date || (e.created_at ? e.created_at.split('T')[0] : '');
        if (d !== todayStr) return false;
      }

      // Category filter
      if (selectedFilterCategory !== 'all') {
        if (e.category !== selectedFilterCategory) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cat = (e.category || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const amt = String(e.amount || '');
        return cat.includes(q) || desc.includes(q) || amt.includes(q);
      }

      return true;
    });
  }, [expenses, dateFilter, selectedFilterCategory, searchQuery, todayStr]);

  // Submit new expense
  const handleAddExpense = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error(i18n.language === 'az' ? 'Düzgün məbləğ daxil edin' : 'Введите корректную сумму');
      return;
    }

    if (!category) {
      toast.error(i18n.language === 'az' ? 'Xərc kateqoriyasını seçin' : 'Выберите категорию расхода');
      return;
    }

    setIsSubmitting(true);
    try {
      // Format description with structured metadata
      let fullDescription = description.trim() || 'Xərc';
      if (recipient.trim()) {
        fullDescription += ` [Xərcləyən: ${recipient.trim()}]`;
      }
      fullDescription += ` [Mənbə: ${paymentSource}]`;

      const { data, error } = await supabase
        .from('business_expenses')
        .insert([{
          user_id: profile.id,
          category,
          description: fullDescription,
          amount: parsedAmount,
          expense_date: expenseDate || todayStr
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success(i18n.language === 'az' ? `₼${parsedAmount.toFixed(2)} məbləğində xərc qeydə alındı` : `Расход на сумму ₼${parsedAmount.toFixed(2)} сохранён`);
      
      // Auto-print thermal voucher option
      try {
        printThermalExpenseVoucher({
          receiptNumber: (data?.id || Date.now().toString()).slice(0, 8).toUpperCase(),
          date: new Date(),
          warehouseName: warehouseName || 'Əsas Mağaza',
          category,
          amount: parsedAmount,
          description: description.trim() || '—',
          recipient: recipient.trim() || 'Kassa',
          paymentSource,
          cashierName: currentStaff?.name || profile?.full_name || 'Kassir'
        });
      } catch (printErr) {
        console.warn('Auto print notice:', printErr);
      }

      // Reset form
      setAmount('');
      setDescription('');
      setRecipient('');
      setPaymentSource('Nağd Kassa');
      setExpenseDate(todayStr);

      fetchData();
    } catch (err) {
      console.error('Error adding expense:', err);
      toast.error(err.message || (i18n.language === 'az' ? 'Xəta baş verdi' : 'Произошла ошибка'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete expense
  const handleDeleteExpense = async (exp) => {
    if (!isAdmin) {
      toast.error(i18n.language === 'az' ? 'Yalnız admin xərci silə bilər' : 'Только администратор может удалять расходы');
      return;
    }

    if (!window.confirm(i18n.language === 'az' ? 'Bu xərci silmək istədiyinizə əminsiniz?' : 'Вы уверены, что хотите удалить этот расход?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('business_expenses')
        .delete()
        .eq('id', exp.id);

      if (error) throw error;

      toast.success(i18n.language === 'az' ? 'Xərc silindi' : 'Расход удалён');
      setExpenses(prev => prev.filter(item => item.id !== exp.id));
    } catch (err) {
      console.error('Error deleting expense:', err);
      toast.error(err.message || 'Xəta baş verdi');
    }
  };

  // Manual print voucher
  const handlePrintVoucher = (exp) => {
    const details = parseExpenseDetails(exp.description);
    printThermalExpenseVoucher({
      receiptNumber: (exp.id || Date.now().toString()).slice(0, 8).toUpperCase(),
      date: exp.created_at || new Date(),
      warehouseName: warehouseName || 'Əsas Mağaza',
      category: exp.category,
      amount: parseFloat(exp.amount) || 0,
      description: details.cleanNote,
      recipient: details.recipient || 'Kassa',
      paymentSource: details.source,
      cashierName: currentStaff?.name || profile?.full_name || 'Kassir'
    });
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div 
          className="bg-white w-full max-w-5xl h-[94vh] max-h-[850px] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">
                    {i18n.language === 'az' ? 'KASSA VƏ MAĞAZA XƏRCLƏRİ' : 'КАССА И РАСХОДЫ МАГАЗИНА'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                    {warehouseName || 'Əsas Mağaza'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {i18n.language === 'az' 
                    ? 'Kassadan nağd məxaric, gündəlik təsərrüfat, taksi, yemək və şəxsi xərclərin operativ idarə edilməsi'
                    : 'Оперативный учет расходов кассы: такси, обеды, курьеры, хоз. нужды и прочие выплаты'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={fetchData}
                disabled={loading}
                className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors border border-gray-200 disabled:opacity-50"
                title={i18n.language === 'az' ? 'Yenilə' : 'Обновить'}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
              </button>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors border border-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Top Live Financial Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-5 border-b border-gray-100 bg-slate-50/60 shrink-0">
            {/* 1. Today's Cash Inflow */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5">
                  {i18n.language === 'az' ? '1. Bugünkü Nağd Satışlar' : '1. Продажи за нал (Приход)'}
                </span>
                <div className="text-2xl font-black text-emerald-600 tracking-tight">
                  +₼<AnimatedNumber value={todayCashSalesTotal} />
                </div>
                <span className="text-[10px] font-bold text-emerald-600/80 mt-0.5 block">
                  {i18n.language === 'az' ? 'Kassaya nağd daxilolma' : 'Поступление в кассу'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
            </div>

            {/* 2. Today's Store Cash Expenses */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5">
                  {i18n.language === 'az' ? '2. Bugünkü Xərclər (Kassa Məxarici)' : '2. Расходы магазина (Расход)'}
                </span>
                <div className="text-2xl font-black text-rose-600 tracking-tight">
                  -₼<AnimatedNumber value={todayCashExpensesTotal} />
                </div>
                <span className="text-[10px] font-bold text-rose-600/80 mt-0.5 block">
                  {todayExpensesList.length} {i18n.language === 'az' ? 'əməliyyat (Taksi, yemək və s.)' : 'операций (Такси, еда и др.)'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            {/* 3. Net Cash in Hand */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 rounded-2xl shadow-md shadow-orange-500/15 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-100 block mb-0.5">
                  {i18n.language === 'az' ? '3. Faktiki Nağd Kassa Qalığı' : '3. Остаток в кассе (На руках)'}
                </span>
                <div className="text-2xl font-black tracking-tight text-white">
                  ₼<AnimatedNumber value={netCashInHand} />
                </div>
                <span className="text-[10px] font-bold text-amber-100/90 mt-0.5 block">
                  {i18n.language === 'az' ? 'Təhvil veriləcək faktiki nağd pul' : 'Фактическая сумма к сдаче кассы'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Modal Body: Split into Form (Left/Top) & Expenses List (Right/Bottom) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar bg-slate-50/30">
            
            {/* LEFT COLUMN: Add Expense Form (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-orange-600" />
                    <span>{i18n.language === 'az' ? 'Yeni Xərc Qeydiyyatı' : 'Новый расход кассы'}</span>
                  </h4>
                  <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                    {i18n.language === 'az' ? 'Kassa Məxarici' : 'Расходный кассовый ордер'}
                  </span>
                </div>

                <form onSubmit={handleAddExpense} className="space-y-4">
                  {/* Amount Input */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5 px-0.5">
                      {i18n.language === 'az' ? 'Xərc Məbləği' : 'Сумма расхода'} (₼) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-black text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-xs"
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-black text-gray-400">₼</span>
                    </div>
                  </div>

                  {/* Category Chips */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5 px-0.5">
                      {i18n.language === 'az' ? 'Xərc Təyinatı / Kateqoriya' : 'Категория расхода'} *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {EXPENSE_CATEGORIES.map(cat => {
                        const IconComponent = cat.icon;
                        const isSelected = category === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 border text-left active:scale-[0.98] ${
                              isSelected
                                ? 'bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-500/25 ring-2 ring-orange-200'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-orange-50/40 hover:border-orange-200 hover:text-gray-900 shadow-2xs'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate leading-tight font-black">
                              {i18n.language === 'az' ? cat.shortAz : cat.shortRu}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description / Notes */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5 px-0.5">
                      {i18n.language === 'az' ? 'Xərcin İzahı / Səbəbi' : 'Описание / Причина расхода'}
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={i18n.language === 'az' ? 'Məs: Çatdırılma üçün taksi, ustaların naharı...' : 'Напр: Такси для доставки, обед мастерам...'}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                    />
                  </div>

                  {/* Recipient / Spender */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5 px-0.5">
                      {i18n.language === 'az' ? 'Xərcləyən / Pulu alan şəxs' : 'Кто потратил / получил деньги'}
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Dropdown
                          value={recipient}
                          onChange={(val) => setRecipient(val)}
                          buttonClassName="w-full rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:border-orange-500 shadow-2xs"
                          options={[
                            { value: '', label: i18n.language === 'az' ? 'İşçi və ya Ustanı seçin...' : 'Выберите сотрудника или мастера...' },
                            ...staffAndMasters.map(sm => ({
                              value: sm.name,
                              label: sm.displayName
                            }))
                          ]}
                          searchable={true}
                        />
                      </div>
                    </div>
                    {/* Free text fallback if not in dropdown */}
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder={i18n.language === 'az' ? 'Və ya adı bura yazın (məs: Kuryer Rauf)' : 'Или введите имя вручную (напр: Курьер Рауф)'}
                      className="w-full mt-1.5 px-3 py-1.5 bg-gray-50/70 border border-gray-200/70 rounded-lg text-[11px] font-semibold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-orange-400"
                    />
                  </div>

                  {/* Source and Date row */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Source */}
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5 px-0.5">
                        {i18n.language === 'az' ? 'Ödəniş Mənbəyi' : 'Источник выплаты'}
                      </label>
                      <select
                        value={paymentSource}
                        onChange={(e) => setPaymentSource(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500 shadow-2xs"
                      >
                        <option value="Nağd Kassa">{i18n.language === 'az' ? 'Nağd Kassa' : 'Наличные из кассы'}</option>
                        <option value="Bank / Kart hesabı">{i18n.language === 'az' ? 'Bank / Kart hesabı' : 'С карты / Расч. счета'}</option>
                      </select>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5 px-0.5">
                        {i18n.language === 'az' ? 'Tarix' : 'Дата'}
                      </label>
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !amount}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-sm transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{i18n.language === 'az' ? 'Xərci Qeyd Et (Kassadan Çıxar)' : 'Списать расход из кассы'}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* RIGHT COLUMN: Expenses History & Audit List (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col flex-1 min-h-[450px]">
                
                {/* Header & Filter Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div>
                    <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-gray-500" />
                      <span>{i18n.language === 'az' ? 'Xərclər Tarixçəsi və Reyestri' : 'Журнал расходов кассы'}</span>
                    </h4>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {filteredExpenses.length} {i18n.language === 'az' ? 'qeydə alınmış əməliyyat' : 'записей'}
                    </p>
                  </div>

                  {/* Date Filter Tabs */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setDateFilter('today')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        dateFilter === 'today'
                          ? 'bg-white text-orange-600 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {i18n.language === 'az' ? 'Yalnız Bugün' : 'Только сегодня'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        dateFilter === 'all'
                          ? 'bg-white text-orange-600 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {i18n.language === 'az' ? 'Bütün Tarixlər' : 'Все даты'}
                    </button>
                  </div>
                </div>

                {/* Search Bar & Category Filter */}
                <div className="flex flex-col sm:flex-row gap-2.5 my-3.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={i18n.language === 'az' ? 'İzah, kateqoriya və ya məbləğlə axtarış...' : 'Поиск по описанию, категории...'}
                      className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  <select
                    value={selectedFilterCategory}
                    onChange={(e) => setSelectedFilterCategory(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:bg-white focus:border-orange-500 shrink-0"
                  >
                    <option value="all">{i18n.language === 'az' ? 'Bütün Kateqoriyalar' : 'Все категории'}</option>
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>
                        {i18n.language === 'az' ? c.labelAz : c.labelRu}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expenses List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-orange-600" />
                      <span className="text-xs font-bold">{i18n.language === 'az' ? 'Xərclər yüklənir...' : 'Загрузка...'}</span>
                    </div>
                  ) : filteredExpenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-gray-600">
                        {i18n.language === 'az' ? 'Qeydə alınmış xərc tapılmadı' : 'Расходы не найдены'}
                      </span>
                      <p className="text-[11px] text-gray-400 max-w-xs">
                        {i18n.language === 'az' ? 'Kassadan çıxarılan xərcləri sol tərəfdəki formadan əlavə edə bilərsiniz' : 'Добавляйте расходы через форму слева'}
                      </p>
                    </div>
                  ) : (
                    filteredExpenses.map((exp) => {
                      const details = parseExpenseDetails(exp.description);
                      const catConfig = EXPENSE_CATEGORIES.find(c => c.id === exp.category) || {
                        icon: FileText,
                        labelAz: exp.category || 'Digər',
                        labelRu: exp.category || 'Прочее',
                        shortAz: exp.category || 'Digər',
                        shortRu: exp.category || 'Прочее',
                        color: 'text-slate-600 bg-slate-50 border-slate-200'
                      };
                      const IconComponent = catConfig.icon || FileText;

                      return (
                        <div 
                          key={exp.id}
                          className="p-3.5 rounded-2xl border border-gray-100 hover:border-orange-200 bg-white hover:bg-orange-50/20 transition-all flex items-center justify-between gap-3 group shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${catConfig.color || 'bg-orange-50 text-orange-600 border-orange-100/80'}`}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-gray-900 text-xs">
                                  {i18n.language === 'az' ? catConfig.labelAz : catConfig.labelRu}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400">
                                  {exp.expense_date || (exp.created_at ? exp.created_at.split('T')[0] : '')}
                                </span>
                                {details.source && (
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    details.source === 'Nağd Kassa' 
                                      ? 'bg-amber-100/80 text-amber-800 border border-amber-200' 
                                      : 'bg-blue-100/80 text-blue-800 border border-blue-200'
                                  }`}>
                                    {details.source}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-gray-600 truncate mt-0.5">
                                {details.cleanNote}
                              </p>
                              {details.recipient && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100/60 px-2 py-0.5 rounded mt-1">
                                  <User className="w-2.5 h-2.5" />
                                  {details.recipient}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-base font-black text-rose-600 tracking-tight">
                                -₼{parseFloat(exp.amount || 0).toFixed(2)}
                              </div>
                            </div>

                            {/* Print Voucher Button */}
                            <button
                              type="button"
                              onClick={() => handlePrintVoucher(exp)}
                              className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 border border-gray-200 transition-colors"
                              title={i18n.language === 'az' ? 'Məxaric qəbzini çap et' : 'Распечатать расходный чек'}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button (Admin only) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp)}
                                className="p-2 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-gray-200 transition-colors"
                                title={i18n.language === 'az' ? 'Sil' : 'Удалить'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Total bar */}
                <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-600">
                  <span>{i18n.language === 'az' ? 'Göstərilən xərclərin cəmi:' : 'Итого по списку:'}</span>
                  <span className="text-rose-600 font-black text-sm">
                    -₼{filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0).toFixed(2)}
                  </span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CashboxExpensesModal;
