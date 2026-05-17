import React, { useState, useEffect } from 'react';
import { X, Play, ShieldAlert, Clock, Coins, Loader2 } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export const SessionModal = ({
  isOpen,
  onClose,
  desk,
  onSessionStarted
}) => {
  const { t } = useTranslation();
  const [clientType, setClientType] = useState('guest');
  const [tariffs, setTariffs] = useState([]);
  const [selectedTariffId, setSelectedTariffId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedTariff = tariffs.find(t => t.id === selectedTariffId);

  useEffect(() => {
    const loadTariffs = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('cafe_tariffs')
          .select('*')
          .eq('zone', desk.zone);
        
        if (error) throw error;
        setTariffs(data || []);
        if (data && data.length > 0) {
          setSelectedTariffId(data[0].id);
        }
      } catch (err) {
        toast.error('Ошибка загрузки тарифов: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadTariffs();
    }
  }, [isOpen, desk.zone]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTariffId || !selectedTariff) {
      toast.error(t('cyberCafe.selectTariffFirst') || 'Выберите тариф перед запуском!');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const endsAt = new Date(now.getTime() + selectedTariff.duration_minutes * 60 * 1000);
      const organizationId = desk.organization_id;

      const payload = {
        organization_id: organizationId,
        desk_id: desk.id,
        tariff_id: selectedTariff.id,
        user_id: clientType === 'guest' ? null : null, // В демо оставим анонимный визит
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'active',
        total_paid: selectedTariff.price
      };

      const { error } = await supabase
        .from('cafe_sessions')
        .insert([payload]);

      if (error) throw error;

      toast.success((t('cyberCafe.sessionStarted') || 'Сессия запущена!') + ` (${desk.name})`);
      onSessionStarted();
    } catch (err) {
      toast.error('Не удалось запустить сессию: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-[11000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg relative z-10 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              {t('cyberCafe.startSessionTitle') || 'Запуск сессии'}: {desk.name}
            </h2>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mt-0.5">{t('cyberCafe.zone') || 'Зона'}: {desk.zone}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('cyberCafe.clientType') || 'Тип клиента'}</label>
            <div className="flex p-1.5 bg-gray-50 border border-gray-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setClientType('guest')}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  clientType === 'guest' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t('cyberCafe.anonymousGuest') || 'Анонимный гость'}
              </button>
              <button
                type="button"
                onClick={() => setClientType('registered')}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  clientType === 'registered' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t('cyberCafe.vipPlayer') || 'Лояльный игрок (VIP)'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('cyberCafe.tariff') || 'Тарифный план'}</label>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : tariffs.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-bold text-amber-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                {t('cyberCafe.noTariffsForZone') || 'В этой зоне нет настроенных тарифов!'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {tariffs.map(tOption => (
                  <label 
                    key={tOption.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedTariffId === tOption.id 
                        ? 'bg-purple-50 border-purple-500/30 ring-2 ring-purple-500/10' 
                        : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="tariff" 
                        value={tOption.id} 
                        checked={selectedTariffId === tOption.id}
                        onChange={() => setSelectedTariffId(tOption.id)}
                        className="text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <div>
                        <span className="text-sm font-black text-gray-900 block">{tOption.name}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-purple-600" />
                          {tOption.duration_minutes} {t('common.minutesShort' || 'мин')} {tOption.is_package && '• Пакет'}
                        </span>
                      </div>
                    </div>
                    <span className="text-base font-black text-gray-900">
                      {tOption.price} AZN
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedTariff && (
            <div className="p-5 bg-purple-500/5 rounded-3xl border border-purple-500/10 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                <span className="uppercase tracking-widest">{t('cyberCafe.toPay') || 'К оплате'}</span>
                <span className="uppercase tracking-widest">{t('cyberCafe.duration') || 'Длительность'}</span>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex items-baseline gap-1 text-2xl font-black text-gray-900">
                  <span>{selectedTariff.price}</span>
                  <span className="text-xs font-bold uppercase">AZN</span>
                </div>
                <div className="text-sm font-black text-purple-600 flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  {selectedTariff.duration_minutes} {t('cyberCafe.minutes') || 'минут игрового времени'}
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={submitting || tariffs.length === 0}
            className="w-full py-4 bg-purple-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-purple-500 shadow-xl shadow-purple-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('cyberCafe.starting') || 'Сессия запускается...'}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                {t('cyberCafe.activateTimer') || 'Активировать таймер'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
