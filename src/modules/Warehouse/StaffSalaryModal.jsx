import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Plus, Minus, DollarSign, History, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';
import Dropdown from '../../components/Common/Dropdown';

const StaffSalaryModal = ({ isOpen, onClose, staff, onUpdate }) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteTrx, setConfirmDeleteTrx] = useState(null);
  
  // Transaction form states
  const [type, setType] = useState('salary');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen && staff) {
      fetchTransactions();
      // Reset form
      setType('salary');
      setAmount(staff.salary_amount ? staff.salary_amount.toString() : '');
      setDescription('');
    }
  }, [isOpen, staff]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_transactions')
        .select('*')
        .eq('staff_id', staff.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      toast.error('Error fetching transactions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error(i18n.language === 'az' ? 'Düzgün məbləğ daxil edin' : 'Введите правильную сумму');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('staff_transactions')
        .insert([{
          staff_id: staff.id,
          user_id: staff.user_id,
          type,
          amount: parseFloat(amount),
          description: description.trim()
        }]);

      if (error) throw error;
      
      toast.success(i18n.language === 'az' ? 'Əməliyyat uğurla qeyd edildi' : 'Операция успешно сохранена');
      
      setAmount('');
      setDescription('');
      fetchTransactions();
      if (onUpdate) onUpdate();
      
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const executeDeleteTransaction = async () => {
    if (!confirmDeleteTrx) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('staff_transactions')
        .delete()
        .eq('id', confirmDeleteTrx.id);

      if (error) throw error;
      
      toast.success(i18n.language === 'az' ? 'Əməliyyat silindi' : 'Операция удалена');
      setConfirmDeleteTrx(null);
      fetchTransactions();
      if (onUpdate) onUpdate();
      
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !staff) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-950/60 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
        <div 
          className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white shadow-sm z-10 relative">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-merkez-blue/10 rounded-full flex items-center justify-center text-merkez-blue shadow-sm">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-wide">
                  {staff.name}
                </h3>
                <p className="text-xs font-bold text-gray-500 flex gap-2">
                  <span>{i18n.language === 'az' ? 'Balans' : 'Баланс'}:</span>
                  <span className={`${(staff.balance || 0) < 0 ? 'text-red-500' : 'text-green-600'} text-sm`}>
                    {(staff.balance || 0).toFixed(2)} ₼
                  </span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-all bg-white border border-gray-100 shadow-sm">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            
            {/* Action Form */}
            <form onSubmit={handleTransactionSubmit} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> 
                {i18n.language === 'az' ? 'Yeni Əməliyyat' : 'Новая операция'}
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{i18n.language === 'az' ? 'Növ' : 'Тип'}</label>
                  <Dropdown 
                    value={type}
                    onChange={(val) => {
                      setType(val);
                      if (val === 'salary' && staff.salary_amount) {
                        setAmount(staff.salary_amount.toString());
                      } else {
                        setAmount('');
                      }
                    }}
                    options={[
                      { value: 'salary', label: i18n.language === 'az' ? 'Maaş əlavə et (+)' : 'Начислить зарплату (+)' },
                      { value: 'bonus', label: i18n.language === 'az' ? 'Mükafat / Premya (+)' : 'Бонус / Премия (+)' },
                      { value: 'withdrawal', label: i18n.language === 'az' ? 'Ödəniş / Götürdü (-)' : 'Выплата / Взял (-)' }
                    ]}
                    buttonClassName="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold focus:outline-none focus:border-merkez-blue transition-colors cursor-pointer text-left flex justify-between items-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{i18n.language === 'az' ? 'Məbləğ' : 'Сумма'} (₼)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold focus:outline-none focus:border-merkez-blue transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{i18n.language === 'az' ? 'Qeyd' : 'Примечание'}</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium focus:outline-none focus:border-merkez-blue transition-colors"
                    placeholder={i18n.language === 'az' ? 'Məsələn: Avans' : 'Например: Аванс'}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button 
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all flex items-center justify-center min-w-[120px] ${
                    type === 'withdrawal' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (type === 'withdrawal' ? (i18n.language === 'az' ? 'Ödəniş et' : 'Выплатить') : (i18n.language === 'az' ? 'Əlavə et' : 'Добавить'))}
                </button>
              </div>
            </form>

            {/* History */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[250px]">
              <div className="p-4 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
                <History className="w-4 h-4 text-gray-400" />
                <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest">
                  {i18n.language === 'az' ? 'Əməliyyat Tarixçəsi' : 'История операций'}
                </h4>
              </div>
              <div className="p-0 overflow-y-auto max-h-[350px]">
                {loading ? (
                  <div className="p-8 flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mb-2 text-merkez-blue" />
                    <p className="text-xs font-bold uppercase">{t('common.loading')}</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm font-medium">
                    {i18n.language === 'az' ? 'Heç bir əməliyyat tapılmadı' : 'Операции не найдены'}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white sticky top-0 border-b border-gray-100 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'Tarix' : 'Дата'}</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'Növ' : 'Тип'}</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'Qeyd' : 'Примечание'}</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{i18n.language === 'az' ? 'Məbləğ' : 'Сумма'}</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {transactions.map(trx => (
                        <tr key={trx.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs font-bold text-gray-600">
                              {new Date(trx.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              trx.type === 'salary' ? 'bg-blue-50 text-blue-600' :
                              trx.type === 'bonus' ? 'bg-purple-50 text-purple-600' :
                              'bg-red-50 text-red-500'
                            }`}>
                              {trx.type === 'salary' ? (i18n.language === 'az' ? 'Maaş' : 'Зарплата') :
                               trx.type === 'bonus' ? (i18n.language === 'az' ? 'Premya' : 'Бонус') :
                               (i18n.language === 'az' ? 'Ödəniş' : 'Выплата')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500 font-medium">{trx.description || '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className={`text-sm font-black ${trx.type === 'withdrawal' ? 'text-red-500' : 'text-green-500'}`}>
                              {trx.type === 'withdrawal' ? '-' : '+'}{parseFloat(trx.amount).toFixed(2)} ₼
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setConfirmDeleteTrx(trx)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              title={i18n.language === 'az' ? 'Sil' : 'Удалить'}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteTrx && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" onClick={() => setConfirmDeleteTrx(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="p-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {i18n.language === 'az' ? 'Əməliyyatı silmək' : 'Удалить операцию'}
                </h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  {i18n.language === 'az' 
                    ? `Bu əməliyyatı silmək istədiyinizdən əminsiniz?`
                    : `Вы уверены, что хотите удалить эту операцию?`}
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setConfirmDeleteTrx(null)}
                    className="flex-1 py-2.5 border border-gray-150 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    onClick={executeDeleteTransaction}
                    disabled={loading}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors flex items-center justify-center"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    {i18n.language === 'az' ? 'Sil' : 'Удалить'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </ModalPortal>
  );
};

export default StaffSalaryModal;
