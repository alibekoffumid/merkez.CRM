import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Calendar, CheckCircle, Search, 
  Loader2, AlertCircle, DollarSign, X, ArrowDownLeft, ChevronRight, User
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';

const WarehouseCreditManager = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Installments details modal
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [installmentsLoading, setInstallmentsLoading] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchCredits();
    }
  }, [profile]);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_credits')
        .select(`
          *,
          customer:customers(name, phone, debt_balance)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredits(data || []);
    } catch (err) {
      toast.error('Error fetching credits: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallments = async (creditId) => {
    setInstallmentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_credit_installments')
        .select('*')
        .eq('credit_id', creditId)
        .order('month_number', { ascending: true });

      if (error) throw error;
      setInstallments(data || []);
    } catch (err) {
      toast.error('Error fetching installments: ' + err.message);
    } finally {
      setInstallmentsLoading(false);
    }
  };

  const handleOpenDetails = (credit) => {
    setSelectedCredit(credit);
    fetchInstallments(credit.id);
  };

  const handleRecordPayment = async () => {
    if (!payingInstallment || !selectedCredit) return;
    setProcessingPayment(true);
    
    try {
      const amount = payingInstallment.amount;
      const customerId = selectedCredit.customer_id;
      
      // 1. Fetch current customer details for debt balance
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .select('debt_balance')
        .eq('id', customerId)
        .single();
        
      if (custErr) throw custErr;
      
      const newBalance = Math.max(0, Number(customer.debt_balance || 0) - amount);

      // 2. Update installment status
      const { error: instErr } = await supabase
        .from('customer_credit_installments')
        .update({
          status: 'paid',
          paid_amount: amount,
          paid_date: new Date().toISOString()
        })
        .eq('id', payingInstallment.id);

      if (instErr) throw instErr;

      // 3. Update customer_credits remaining months
      const newRemaining = Math.max(0, selectedCredit.remaining_months - 1);
      const newStatus = newRemaining === 0 ? 'completed' : 'active';
      const { error: creditUpdateErr } = await supabase
        .from('customer_credits')
        .update({
          remaining_months: newRemaining,
          status: newStatus
        })
        .eq('id', selectedCredit.id);

      if (creditUpdateErr) throw creditUpdateErr;

      // 4. Log transaction inside customer_debts
      const { error: debtLogErr } = await supabase
        .from('customer_debts')
        .insert([{
          user_id: profile?.id,
          customer_id: customerId,
          type: 'payment',
          amount: amount,
          description: `Kredit ödənişi: Ay #${payingInstallment.month_number} (Cəmi: ${selectedCredit.months} ay)`
        }]);

      if (debtLogErr) throw debtLogErr;

      // 5. Update main customer debt balance
      const { error: balanceErr } = await supabase
        .from('customers')
        .update({ debt_balance: newBalance })
        .eq('id', customerId);

      if (balanceErr) throw balanceErr;

      toast.success(i18n.language === 'az' ? 'Ödəniş uğurla qəbul olundu' : 'Оплата успешно принята');
      
      // Refresh local states
      setPayingInstallment(null);
      fetchInstallments(selectedCredit.id);
      fetchCredits();
    } catch (err) {
      toast.error('Xəta baş verdi: ' + err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const filteredCredits = credits.filter(c => 
    c.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer?.phone?.includes(searchTerm)
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Filter and Search */}
      <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={i18n.language === 'az' ? 'Müştəri adı və ya telefon axtar...' : 'Поиск по имени или телефону...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-medium focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all outline-none"
          />
        </div>
      </div>

      {/* Credits List */}
      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-merkez-blue" />
            <p className="text-xs font-bold uppercase tracking-widest">{t('common.loading')}</p>
          </div>
        ) : filteredCredits.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3 border-2 border-dashed border-gray-100 rounded-2xl">
            <FileText className="w-10 h-10 text-gray-200" />
            <p className="text-xs font-bold">
              {i18n.language === 'az' ? 'Aktiv kredit sənədi tapılmadı.' : i18n.language === 'ru' ? 'Активные кредиты не найдены.' : 'No active credits found.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/40">
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'Müştəri' : 'Клиент'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{i18n.language === 'az' ? 'Məbləğ' : 'Сумма'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{i18n.language === 'az' ? 'Aylıq Ödəniş' : 'Ежемесячно'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{i18n.language === 'az' ? 'Müddət (Qalan/Cəmi)' : 'Срок (Осталось/Всего)'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{i18n.language === 'az' ? 'Status' : 'Статус'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{i18n.language === 'az' ? 'Cədvəl' : 'Календарь'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCredits.map((credit) => (
                <tr key={credit.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-900 text-sm">{credit.customer?.name || 'Walk-in'}</div>
                    <div className="text-[10px] font-bold text-gray-400 font-mono mt-0.5">{credit.customer?.phone || '—'}</div>
                  </td>
                  <td className="p-4 text-right font-black text-gray-900 text-sm">
                    ₼{Number(credit.total_amount || 0).toFixed(2)}
                  </td>
                  <td className="p-4 text-right font-black text-merkez-blue text-sm">
                    ₼{Number(credit.monthly_payment || 0).toFixed(2)}
                  </td>
                  <td className="p-4 text-center text-xs font-bold text-gray-700">
                    <span className="text-red-500">{credit.remaining_months}</span>
                    <span className="text-gray-300 mx-1">/</span>
                    <span className="text-gray-400">{credit.months} ay</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      credit.status === 'completed' 
                        ? 'bg-green-50 text-green-500 border border-green-100' 
                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      {credit.status === 'completed' 
                        ? (i18n.language === 'az' ? 'Tamamlanıb' : 'Закрыт') 
                        : (i18n.language === 'az' ? 'Aktiv' : 'Активен')
                      }
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleOpenDetails(credit)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-merkez-blue hover:text-blue-600 hover:underline"
                    >
                      <span>{i18n.language === 'az' ? 'Ödəniş cədvəli' : 'Показать график'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Credit Installments Details Modal */}
      {selectedCredit && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedCredit(null)}>
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-merkez-blue flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {i18n.language === 'az' ? 'Aylıq Ödəniş Cədvəli' : 'График ежемесячных платежей'}
                    </h3>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                      {selectedCredit.customer?.name} — {selectedCredit.months} {i18n.language === 'az' ? 'aylıq kredit' : 'месяцев рассрочки'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedCredit(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Installments List */}
              <div className="flex-1 p-6 overflow-y-auto min-h-[300px]">
                {installmentsLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-merkez-blue" />
                    <p className="text-xs font-bold uppercase tracking-widest">{t('common.loading')}</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/40 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <th className="p-4">№</th>
                        <th className="p-4">{i18n.language === 'az' ? 'Son Tarix' : 'Срок оплаты'}</th>
                        <th className="p-4 text-right">{i18n.language === 'az' ? 'Məbləğ' : 'Сумма'}</th>
                        <th className="p-4 text-center">{i18n.language === 'az' ? 'Status' : 'Статус'}</th>
                        <th className="p-4 text-right">{i18n.language === 'az' ? 'Ödəniş' : 'Принять'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((inst) => (
                        <tr key={inst.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-xs font-semibold">
                          <td className="p-4 font-black text-gray-800">
                            {inst.month_number}
                          </td>
                          <td className="p-4 text-gray-600 font-bold">
                            {new Date(inst.due_date).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right font-black text-gray-900">
                            ₼{Number(inst.amount).toFixed(2)}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                              inst.status === 'paid' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                              {inst.status === 'paid' 
                                ? (i18n.language === 'az' ? 'Ödənilib' : 'Оплачен') 
                                : (i18n.language === 'az' ? 'Ödənilməyib' : 'Не оплачен')
                              }
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {inst.status === 'paid' ? (
                              <span className="text-[10px] text-gray-400 font-bold">
                                {new Date(inst.paid_date).toLocaleDateString()}
                              </span>
                            ) : (
                              <button
                                onClick={() => setPayingInstallment(inst)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 inline-flex ml-auto shadow-sm shadow-emerald-600/10"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                {i18n.language === 'az' ? 'Ödə' : 'Оплатить'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Confirm Payment Modal */}
      {payingInstallment && selectedCredit && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" onClick={() => setPayingInstallment(null)}>
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 flex flex-col p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-green-500 mb-4">
                <CheckCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold text-gray-900">
                  {i18n.language === 'az' ? 'Ödəniş qəbul edilsin?' : 'Принять оплату?'}
                </h3>
              </div>
              <p className="text-xs font-medium text-gray-500 mb-6 leading-relaxed">
                {i18n.language === 'az'
                  ? `"${selectedCredit.customer?.name}" adlı müştəridən Ay #${payingInstallment.month_number} üçün ₼${Number(payingInstallment.amount).toFixed(2)} məbləğində kredit ödənişi qəbul ediləcək. Bu məbləğ müştərinin ümumi borcundan çıxılacaq.`
                  : `Принять ежемесячный платеж в размере ₼${Number(payingInstallment.amount).toFixed(2)} от клиента "${selectedCredit.customer?.name}" за месяц №${payingInstallment.month_number}. Эта сумма будет вычтена из его общего долга.`
                }
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setPayingInstallment(null)}
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold hover:bg-gray-50 transition-all text-xs shadow-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={processingPayment}
                  className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all text-xs shadow-lg shadow-green-500/10 flex items-center justify-center"
                >
                  {processingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                  {i18n.language === 'az' ? 'Təsdiqlə' : 'Подтвердить'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default WarehouseCreditManager;
