import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, Plus, Calendar, X, FileText, CheckCircle, 
  ArrowUpRight, ArrowDownLeft, History, Users, DollarSign, 
  Trash2, AlertCircle, RefreshCw, UserPlus
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import QuickAddCustomerModal from '../Warehouse/QuickAddCustomerModal';

const DebtBook = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [lastPayment, setLastPayment] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);

  useEffect(() => {
    // We check for the portal target in the DOM after initial render
    setPortalTarget(document.getElementById('warehouse-top-bar-portal-target'));
    setActionTarget(document.getElementById('warehouse-actions-portal-target'));
  }, []);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyDebtors, setOnlyDebtors] = useState(true);

  // Modals & Active Customer States
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalType, setModalType] = useState(null); // 'debt' | 'payment' | 'history'
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form Inputs
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const handleCustomerAdded = () => {
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all customers
      const { data: customerData, error: customerErr } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (customerErr) throw customerErr;
      setCustomers(customerData || []);

      // 2. Fetch the most recent payment transaction for metrics
      const { data: paymentData, error: paymentErr } = await supabase
        .from('customer_debts')
        .select('amount, created_at, customer_id')
        .eq('type', 'payment')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!paymentErr && paymentData && paymentData.length > 0) {
        // Resolve customer name for last payment
        const match = (customerData || []).find(c => c.id === paymentData[0].customer_id);
        setLastPayment({
          amount: parseFloat(paymentData[0].amount),
          date: paymentData[0].created_at,
          customerName: match ? match.name : 'Müştəri'
        });
      } else {
        setLastPayment(null);
      }
    } catch (err) {
      console.error('Error fetching debt book data:', err);
      toast.error('Məlumatlar yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (customerId) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_debts')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryLogs(data || []);
    } catch (err) {
      console.error('Error fetching customer debts history:', err);
      toast.error('Tarixçə yüklənərkən xəta baş verdi');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = (customer) => {
    setSelectedCustomer(customer);
    setModalType('history');
    fetchHistory(customer.id);
  };

  const handleOpenTransaction = (customer, type) => {
    setSelectedCustomer(customer);
    setModalType(type);
    setAmount('');
    setDescription('');
  };

  const handleCloseModal = () => {
    setSelectedCustomer(null);
    setModalType(null);
    setHistoryLogs([]);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Zəhmət olmasa düzgün məbləğ daxil edin');
      return;
    }

    setSubmitting(true);
    const parsedAmount = parseFloat(amount);
    
    try {
      // 1. Insert transaction entry into customer_debts
      const { error: txError } = await supabase
        .from('customer_debts')
        .insert([{
          customer_id: selectedCustomer.id,
          type: modalType, // 'debt' or 'payment'
          amount: parsedAmount,
          description: description || (modalType === 'debt' ? 'Borc artımı' : 'Borc ödənişi')
        }]);

      if (txError) throw txError;

      // 2. Calculate new customer balance
      const currentBalance = parseFloat(selectedCustomer.debt_balance || 0);
      const newBalance = modalType === 'debt' 
        ? currentBalance + parsedAmount
        : Math.max(0, currentBalance - parsedAmount); // prevent negative debts

      // 3. Update customer record
      const { error: customerError } = await supabase
        .from('customers')
        .update({ debt_balance: newBalance })
        .eq('id', selectedCustomer.id);

      if (customerError) throw customerError;

      toast.success(
        modalType === 'debt'
          ? 'Borc uğurla əlavə edildi'
          : 'Ödəniş uğurla qəbul edildi'
      );
      
      handleCloseModal();
      fetchData();
    } catch (err) {
      console.error('Transaction failed:', err);
      toast.error('Əməliyyat baş tutmadı: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics calculation
  const totalDebt = customers.reduce((sum, c) => sum + parseFloat(c.debt_balance || 0), 0);
  const totalDebtors = customers.filter(c => parseFloat(c.debt_balance || 0) > 0).length;

  // Filter list
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.phone?.includes(searchTerm);
    const matchesDebtors = onlyDebtors ? parseFloat(c.debt_balance || 0) > 0 : true;
    return matchesSearch && matchesDebtors;
  });

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      {portalTarget ? (
        <>
          {createPortal(
            <div className="flex items-center gap-3 w-full lg:flex-1 lg:max-w-md">
              <div className="relative w-full min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder={t('crm.searchDebtors') || "Borclularda axtar..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors min-w-[200px]"
                />
              </div>
              <button
                onClick={fetchData}
                className="p-2 bg-gray-50 text-gray-400 hover:text-gray-900 border border-transparent rounded-lg transition-all shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>,
            portalTarget
          )}
          {actionTarget && createPortal(
            <div className="flex gap-2 items-center w-full lg:w-auto shrink-0 overflow-x-auto no-scrollbar pb-1 -mb-1 lg:pb-0 lg:mb-0">
              <button
                onClick={() => setOnlyDebtors(!onlyDebtors)}
                className={`px-3.5 py-2 h-[38px] rounded-lg text-xs font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-2 whitespace-nowrap ${
                  onlyDebtors 
                    ? 'bg-rose-50 border-rose-100 text-rose-700'
                    : 'bg-white border-gray-100 text-gray-500 hover:text-gray-900'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {t('crm.onlyActiveDebts') || 'Yalnız borcu olanlar'}
              </button>
            </div>,
            actionTarget
          )}
        </>
      ) : (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full lg:w-96">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder={t('crm.searchDebtors') || "Borclularda axtar..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-lg text-sm font-medium focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-rose-600/5 transition-all outline-none"
              />
            </div>
            <button
              onClick={fetchData}
              className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 border border-transparent rounded-lg transition-all"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-3 items-center w-full lg:w-auto justify-end">
            <button
              onClick={() => setOnlyDebtors(!onlyDebtors)}
              className={`px-5 py-2 h-[38px] rounded-lg text-xs font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-2 ${
                onlyDebtors 
                  ? 'bg-rose-50 border-rose-100 text-rose-700 font-black'
                  : 'bg-white border-gray-100 text-gray-400 font-bold hover:text-gray-900'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              {t('crm.onlyActiveDebts') || 'Yalnız borcu olanlar'}
            </button>
          </div>
        </div>
      )}

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Outstanding Debt */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
              {t('crm.totalOutstandingDebt') || 'Ümumi Nisyə Qalıq'}
            </p>
            <h3 className="text-3xl font-black text-gray-900 group-hover:scale-105 transition-transform duration-300">
              {totalDebt.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
            </h3>
          </div>
          <div className="w-12 h-12 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Debtors */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
              {t('crm.totalDebtors') || 'Borcluların Sayı'}
            </p>
            <h3 className="text-3xl font-black text-gray-900 group-hover:scale-105 transition-transform duration-300">
              {totalDebtors} {t('common.unit') || 'nəfər'}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Last Repayment */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
              {t('crm.lastRepayment') || 'Son Ödəniş'}
            </p>
            {lastPayment ? (
              <div>
                <h3 className="text-3xl font-black text-emerald-600">
                  +{lastPayment.amount.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                </h3>
                <p className="text-xs font-bold text-gray-400 mt-1">
                  {lastPayment.customerName} • {new Date(lastPayment.date).toLocaleDateString('az-AZ')}
                </p>
              </div>
            ) : (
              <h3 className="text-xl font-bold text-gray-400 italic py-1">
                {t('crm.noRecentPayments') || 'Ödəniş yoxdur'}
              </h3>
            )}
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Customers List */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <RefreshCw className="w-10 h-10 animate-spin mb-4 text-rose-500" />
            <p className="font-bold uppercase tracking-widest text-xs">{t('common.loading') || 'Yüklənir...'}</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12">
            <Users className="w-16 h-16 mb-4 opacity-10" />
            <p className="font-black text-lg text-gray-300">
              {t('crm.noDebtorsFound') || 'Məlumat tapılmadı'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
                  <th className="p-6">{t('crm.client') || 'Müştəri'}</th>
                  <th className="p-6">{t('crm.phoneNumber') || 'Telefon'}</th>
                  <th className="p-6">{t('crm.address') || 'Ünvan'}</th>
                  <th className="p-6">{t('crm.debtBalance') || 'Borc'}</th>
                  <th className="p-6 text-right">{t('common.actions') || 'Əməliyyatlar'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCustomers.map(customer => {
                  const balance = parseFloat(customer.debt_balance || 0);
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-6">
                        <div className="font-black text-gray-900 text-lg">{customer.name}</div>
                      </td>
                      <td className="p-6 text-sm font-bold text-gray-500">
                        {customer.phone || '—'}
                      </td>
                      <td className="p-6 text-sm font-bold text-gray-400 italic">
                        {customer.address || '—'}
                      </td>
                      <td className="p-6">
                        <span className={`text-lg font-black ${balance > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                          {balance.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenHistory(customer)}
                            title="Tarixçə"
                            className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg transition-all"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleOpenTransaction(customer, 'payment')}
                            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-lg transition-all"
                          >
                            Ödəniş al
                          </button>
                          
                          <button
                            onClick={() => handleOpenTransaction(customer, 'debt')}
                            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black uppercase tracking-wider rounded-lg transition-all"
                          >
                            Borc yaz
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Debt / Payment Modal */}
      {modalType && modalType !== 'history' && selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  {modalType === 'debt' ? 'Borc Əlavə Et' : 'Ödəniş Qəbul Et'}
                </h2>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                  {selectedCustomer.name}
                </p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                  Məbləğ (₼)
                </label>
                <input 
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-lg text-lg font-black focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-rose-600/5 transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                  Qeyd / Təsvir
                </label>
                <textarea 
                  placeholder={modalType === 'debt' ? "Nisyə alış təfərrüatları..." : "Borc ödənişi təfərrüatları..."}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-5 py-3 bg-gray-50 border border-transparent rounded-lg text-sm font-bold focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-rose-600/5 transition-all outline-none resize-none h-20"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 bg-gray-50 text-gray-500 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 px-4 py-3 text-white rounded-lg text-sm font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center ${
                    modalType === 'debt' 
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' 
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
                >
                  {submitting ? 'Saxlanılır...' : 'Təsdiqlə'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Log Drawer/Modal */}
      {modalType === 'history' && selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end p-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-gray-100 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Əməliyyat Tarixçəsi</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {selectedCustomer.name}
                </p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {historyLoading ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                  <RefreshCw className="w-8 h-8 animate-spin mb-2 text-rose-500" />
                  <p className="text-xs font-bold uppercase tracking-widest">Təfərrüatlar yüklənir...</p>
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                  <FileText className="w-12 h-12 mb-2 opacity-15" />
                  <p className="text-sm font-bold">Hələ heç bir əməliyyat yoxdur</p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
                  {historyLogs.map(log => {
                    const isDebt = log.type === 'debt';
                    return (
                      <div key={log.id} className="flex gap-4 relative">
                        {/* Icon Node */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 shrink-0 ${
                          isDebt ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {isDebt ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                        </div>
                        
                        {/* Box Details */}
                        <div className="flex-1 bg-gray-50/50 border border-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="text-sm font-black text-gray-900">
                                {isDebt ? 'Borc Yazıldı' : 'Ödəniş Alındı'}
                              </p>
                              <p className="text-xs font-bold text-gray-400 mt-1 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(log.created_at).toLocaleString('az-AZ')}
                              </p>
                            </div>
                            <span className={`text-base font-black ${isDebt ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {isDebt ? '-' : '+'}{parseFloat(log.amount).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                            </span>
                          </div>
                          
                          {log.description && (
                            <p className="text-xs font-bold text-gray-500 mt-3 pt-3 border-t border-gray-100">
                              {log.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Current Balance Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-gray-400 tracking-wider">Cari Qalıq Borc:</span>
              <span className={`text-xl font-black ${parseFloat(selectedCustomer.debt_balance || 0) > 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                {parseFloat(selectedCustomer.debt_balance || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
              </span>
            </div>
          </div>
        </div>
      )}

      <QuickAddCustomerModal 
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onCustomerAdded={handleCustomerAdded}
      />
    </div>
  );
};

export default DebtBook;
