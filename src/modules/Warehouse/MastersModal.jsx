import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, Banknote, History, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';

const MastersModal = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [payingMasterId, setPayingMasterId] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const fetchMasters = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouse_masters')
        .select('*')
        .eq('user_id', profile.id)
        .order('name');
        
      if (!error && data) {
        setMasters(data);
      }
    } catch (err) {
      console.error('Error fetching masters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMasters();
    }
  }, [isOpen, profile]);

  const handlePay = async (masterId, currentBalance) => {
    if (!payAmount || parseFloat(payAmount) <= 0) return;
    const amount = parseFloat(payAmount);
    if (amount > currentBalance) {
      toast.error(i18n.language === 'az' ? 'Məbləğ borcdan çox ola bilməz' : 'Сумма не может превышать долг');
      return;
    }

    try {
      const newBalance = currentBalance - amount;
      
      const { error } = await supabase
        .from('warehouse_masters')
        .update({ balance: newBalance })
        .eq('id', masterId);
        
      if (error) throw error;
      
      // We should ideally record a cash operation here in a real accounting system.
      // But for this quick feature, we just reduce the balance.
      toast.success(i18n.language === 'az' ? 'Ödəniş qeydə alındı' : 'Оплата зарегистрирована');
      
      setPayingMasterId(null);
      setPayAmount('');
      fetchMasters();
    } catch (err) {
      console.error('Error paying master:', err);
      toast.error(i18n.language === 'az' ? 'Xəta baş verdi' : 'Произошла ошибка');
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  {i18n.language === 'az' ? 'Usta Kartları və Maliyyə' : 'Карточки Мастеров и Финансы'}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  {i18n.language === 'az' ? 'Ustaların balansı və onlara edilən ödənişlər' : 'Баланс мастеров и выплаты'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 p-2 rounded-xl transition-all shadow-sm border border-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/30">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            ) : masters.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 font-bold">{i18n.language === 'az' ? 'Usta tapılmadı' : 'Мастера не найдены'}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {masters.map(master => (
                  <div key={master.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{master.name}</h3>
                        {master.phone && <p className="text-sm text-gray-500">{master.phone}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                          {i18n.language === 'az' ? 'Cari Borcumuz' : 'Наш долг'}
                        </p>
                        <p className={`text-xl font-black ${master.balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          ₼{parseFloat(master.balance || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {payingMasterId === master.id ? (
                      <div className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <Banknote className="w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="Məbləğ / Сумма"
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                        <button
                          onClick={() => handlePay(master.id, master.balance)}
                          className="px-4 py-2 bg-gray-900 text-white font-bold text-sm rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          {i18n.language === 'az' ? 'Ödə' : 'Оплатить'}
                        </button>
                        <button
                          onClick={() => setPayingMasterId(null)}
                          className="px-3 py-2 bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      master.balance > 0 && (
                        <button
                          onClick={() => {
                            setPayingMasterId(master.id);
                            setPayAmount('');
                          }}
                          className="w-full py-2.5 flex items-center justify-center gap-2 bg-orange-50 text-orange-700 font-bold text-sm rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          <Banknote className="w-4 h-4" />
                          {i18n.language === 'az' ? 'Kassadan Ödəniş Et' : 'Выплатить из кассы'}
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default MastersModal;
