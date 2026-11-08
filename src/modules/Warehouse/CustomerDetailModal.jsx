import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useTranslation } from 'react-i18next';
import { 
  User, Phone, MapPin, FileText, Users, Calendar, 
  DollarSign, Clock, CheckCircle2, AlertCircle, Edit3, 
  X, ChevronRight, Copy, Check, CreditCard, ArrowDownLeft, 
  ArrowUpRight, Loader2, ShieldAlert, Receipt
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';

const CustomerDetailModal = ({ 
  isOpen, 
  onClose, 
  customerId, 
  customerData, 
  onEdit,
  onOpenCreditSchedule 
}) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(customerData || null);
  const [credits, setCredits] = useState([]);
  const [debts, setDebts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'credits' | 'debts'
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (isOpen && (customerId || customerData?.id)) {
      loadCustomerDetails();
    }
  }, [isOpen, customerId, customerData]);

  const loadCustomerDetails = async () => {
    const id = customerId || customerData?.id;
    if (!id) return;
    setLoading(true);

    try {
      // 1. Fetch latest customer data
      const { data: cData, error: cErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (!cErr && cData) {
        setCustomer(cData);
      } else if (customerData) {
        setCustomer(customerData);
      }

      // 2. Fetch customer credits
      const { data: credData, error: credErr } = await supabase
        .from('customer_credits')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (!credErr && credData) {
        setCredits(credData);
      }

      // 3. Fetch customer debts/payments
      const { data: debtData, error: debtErr } = await supabase
        .from('customer_debts')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (!debtErr && debtData) {
        setDebts(debtData);
      }
    } catch (err) {
      console.error('Error loading customer details:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(
      i18n.language === 'az' ? 'Kopyalandı' : 'Скопировано',
      { duration: 1500 }
    );
    setTimeout(() => setCopiedField(null), 1500);
  };

  if (!isOpen) return null;

  const currentCust = customer || customerData || {};
  const passInfo = currentCust.passport_info || '';
  const [passSer, passFin] = passInfo.includes(' || FIN: ') 
    ? passInfo.split(' || FIN: ') 
    : [passInfo, ''];

  const totalCreditsAmount = credits.reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0);
  const activeCredits = credits.filter(c => c.status === 'active');
  const monthlyTotal = activeCredits.reduce((sum, c) => sum + (Number(c.monthly_payment) || 0), 0);
  const debtBalance = Number(currentCust.debt_balance) || 0;

  // Get initials
  const initials = (currentCust.name || 'M')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 bg-gray-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-5" 
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh] border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Card */}
          <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-blue-950 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-start justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-lg shadow-blue-500/30 shrink-0 border border-white/20">
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                      {currentCust.name || (i18n.language === 'az' ? 'Müştəri' : 'Клиент')}
                    </h2>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      debtBalance > 0
                        ? 'bg-red-500/20 border-red-500/40 text-red-300'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    }`}>
                      {debtBalance > 0 
                        ? (i18n.language === 'az' ? 'Borclu' : 'Есть долг') 
                        : (i18n.language === 'az' ? 'Aktiv / Təmiz' : 'Активен')}
                    </span>
                  </div>
                  <p className="text-gray-300 text-xs sm:text-sm font-medium mt-1 flex items-center gap-2 flex-wrap">
                    {currentCust.phone && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-blue-400" />
                        <a href={`tel:${currentCust.phone}`} className="hover:text-blue-300 transition-colors">
                          {currentCust.phone}
                        </a>
                      </span>
                    )}
                    {currentCust.address && (
                      <span className="flex items-center gap-1 text-gray-400 text-xs truncate max-w-xs">
                        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="truncate">{currentCust.address}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(currentCust);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all text-xs font-bold flex items-center gap-1.5"
                    title={i18n.language === 'az' ? 'Redaktə et' : 'Редактировать'}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="hidden sm:inline">{i18n.language === 'az' ? 'Redaktə' : 'Редактировать'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
                  title="Bağla"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-white/10">
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {i18n.language === 'az' ? 'Borc Balansı' : 'Долговой баланс'}
                </span>
                <span className={`text-base font-black tracking-tight ${debtBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  ₼{debtBalance.toFixed(2)}
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {i18n.language === 'az' ? 'Kredit Müqaviləsi' : 'Кредиты (кол-во)'}
                </span>
                <span className="text-base font-black tracking-tight text-white">
                  {credits.length} {i18n.language === 'az' ? 'ədəd' : 'дог.'}
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {i18n.language === 'az' ? 'Cəmi Kredit' : 'Сумма кредитов'}
                </span>
                <span className="text-base font-black tracking-tight text-blue-300">
                  ₼{totalCreditsAmount.toFixed(2)}
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {i18n.language === 'az' ? 'Aylıq Ödəniş' : 'Ежемесячный платеж'}
                </span>
                <span className="text-base font-black tracking-tight text-amber-300">
                  ₼{monthlyTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Subtabs Switcher */}
          <div className="flex items-center gap-1 px-5 pt-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'border-merkez-blue text-merkez-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{i18n.language === 'az' ? 'Əsas Məlumatlar' : 'Основная информация'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('credits')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'credits'
                  ? 'border-merkez-blue text-merkez-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{i18n.language === 'az' ? 'Kreditlər / Taksitlər' : 'Кредиты и рассрочка'}</span>
              {credits.length > 0 && (
                <span className="ml-1 text-[10px] font-black px-1.5 py-0.2 bg-blue-100 text-merkez-blue rounded-full">
                  {credits.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('debts')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'debts'
                  ? 'border-merkez-blue text-merkez-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{i18n.language === 'az' ? 'Ödəniş və Borc Tarixçəsi' : 'История платежей и долгов'}</span>
              {debts.length > 0 && (
                <span className="ml-1 text-[10px] font-black px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded-full">
                  {debts.length}
                </span>
              )}
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 custom-scrollbar bg-white">
            {loading ? (
              <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-7 h-7 animate-spin mb-2 text-merkez-blue" />
                <p className="text-xs font-bold uppercase tracking-wider">{t('common.loading')}</p>
              </div>
            ) : activeTab === 'overview' ? (
              <div className="space-y-4">
                {/* Contact and Identity Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Personal info */}
                  <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      {i18n.language === 'az' ? 'Şəxsi Məlumatlar' : 'Личные данные'}
                    </h4>

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">
                        {i18n.language === 'az' ? 'Ad, Soyad' : 'ФИО'}
                      </span>
                      <span className="text-sm font-bold text-gray-900 block mt-0.5">
                        {currentCust.name || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">
                        {i18n.language === 'az' ? 'Əlaqə nömrəsi' : 'Номер телефона'}
                      </span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-sm font-mono font-bold text-gray-900">
                          {currentCust.phone || '—'}
                        </span>
                        {currentCust.phone && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(currentCust.phone, 'phone')}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                            title="Kopyala"
                          >
                            {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">
                        {i18n.language === 'az' ? 'Yaşayış ünvanı' : 'Адрес проживания'}
                      </span>
                      <span className="text-xs font-medium text-gray-700 block mt-0.5">
                        {currentCust.address || (i18n.language === 'az' ? 'Qeyd olunmayıb' : 'Не указан')}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Identity / Passport */}
                  <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      {i18n.language === 'az' ? 'Şəxsiyyət vəsiqəsi və FİN' : 'Паспортные данные и ФИН'}
                    </h4>

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">
                        {i18n.language === 'az' ? 'Vəsiqənin seriya və nömrəsi' : 'Серия и номер паспорта'}
                      </span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-sm font-bold font-mono text-gray-900">
                          {passSer || (i18n.language === 'az' ? 'Qeyd olunmayıb' : 'Не указана')}
                        </span>
                        {passSer && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(passSer, 'passSer')}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                            title="Kopyala"
                          >
                            {copiedField === 'passSer' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">
                        {i18n.language === 'az' ? 'FİN Kod' : 'ФИН Код'}
                      </span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-sm font-bold font-mono text-merkez-blue bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100">
                          {passFin || '—'}
                        </span>
                        {passFin && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(passFin, 'passFin')}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                            title="Kopyala"
                          >
                            {copiedField === 'passFin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Relatives and Contact References */}
                <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2.5">
                    <Users className="w-3.5 h-3.5 text-purple-500" />
                    {i18n.language === 'az' ? 'Qohumlar və Əlaqəli şəxslər' : 'Родственники и доверенные лица'}
                  </h4>

                  {currentCust.relatives_info ? (
                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-xs text-gray-800 font-medium whitespace-pre-line leading-relaxed">
                      {currentCust.relatives_info}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      {i18n.language === 'az' ? 'Qohum və ya zamin məlumatı daxil edilməyib.' : 'Информация о родственниках не указана.'}
                    </p>
                  )}
                </div>
              </div>
            ) : activeTab === 'credits' ? (
              <div className="space-y-3">
                {credits.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    <p className="text-xs font-bold">
                      {i18n.language === 'az' ? 'Bu müştəriyə aid kredit müqaviləsi tapılmadı.' : 'Кредитные договора для этого клиента не найдены.'}
                    </p>
                  </div>
                ) : (
                  credits.map((cr) => (
                    <div 
                      key={cr.id}
                      className="bg-gray-50/90 hover:bg-gray-100/80 transition-all rounded-xl p-4 border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-gray-900">
                            {cr.bank || 'Kredit'}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            cr.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-blue-50 text-merkez-blue border-blue-200'
                          }`}>
                            {cr.status === 'completed' 
                              ? (i18n.language === 'az' ? 'Tamamlanıb' : 'Закрыт') 
                              : (i18n.language === 'az' ? 'Aktiv' : 'Активен')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-3">
                          <span>
                            {i18n.language === 'az' ? 'Müddət:' : 'Срок:'}{' '}
                            <strong className="text-gray-800">{cr.remaining_months} / {cr.months} ay</strong>
                          </span>
                          <span>•</span>
                          <span>
                            {i18n.language === 'az' ? 'Tarix:' : 'Дата:'}{' '}
                            {new Date(cr.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="text-sm font-black text-gray-900">
                            ₼{Number(cr.total_amount || 0).toFixed(2)}
                          </div>
                          <div className="text-[11px] font-bold text-merkez-blue">
                            ₼{Number(cr.monthly_payment || 0).toFixed(2)} / {i18n.language === 'az' ? 'ay' : 'мес'}
                          </div>
                        </div>

                        {onOpenCreditSchedule && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenCreditSchedule(cr);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-merkez-blue text-merkez-blue text-xs font-bold flex items-center gap-1 shadow-2xs hover:shadow-xs transition-all shrink-0"
                          >
                            <span>{i18n.language === 'az' ? 'Cədvəl' : 'График'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {debts.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    <p className="text-xs font-bold">
                      {i18n.language === 'az' ? 'Əməliyyat tarixçəsi boşdur.' : 'История операций пуста.'}
                    </p>
                  </div>
                ) : (
                  debts.map((d) => (
                    <div 
                      key={d.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          d.type === 'payment'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-red-50 text-red-500'
                        }`}>
                          {d.type === 'payment' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">
                            {d.description || (d.type === 'payment' ? 'Ödəniş' : 'Borc artımı')}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {new Date(d.created_at).toLocaleDateString()} {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-sm font-black ${
                          d.type === 'payment' ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {d.type === 'payment' ? '-' : '+'}₼{Number(d.amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-2xs"
            >
              {i18n.language === 'az' ? 'Bağla' : 'Закрыть'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CustomerDetailModal;

