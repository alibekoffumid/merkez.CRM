import React, { useState, useEffect } from 'react';
import { Monitor, Play, RotateCcw, AlertTriangle, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DeskCard = ({
  desk,
  activeSession,
  onStartSession,
  onStopSession
}) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  const [percentLeft, setPercentLeft] = useState(100);

  useEffect(() => {
    if (!activeSession || desk.status !== 'occupied') return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(activeSession.ends_at).getTime();
      const start = new Date(activeSession.started_at).getTime();
      
      const total = end - start;
      const remaining = end - now;

      if (remaining <= 0) {
        setTimeLeft('00:00:00');
        setPercentLeft(0);
        clearInterval(timer);
      } else {
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

        const hString = hours.toString().padStart(2, '0');
        const mString = minutes.toString().padStart(2, '0');
        const sString = seconds.toString().padStart(2, '0');

        setTimeLeft(`${hString}:${mString}:${sString}`);
        setPercentLeft(Math.max(0, (remaining / total) * 100));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession, desk.status]);

  const statusStyles = {
    available: {
      bg: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
      text: 'text-emerald-500',
      badge: 'bg-emerald-500/20 text-emerald-400',
      glow: 'shadow-emerald-500/5'
    },
    occupied: {
      bg: 'bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40',
      text: 'text-rose-500',
      badge: 'bg-rose-500/20 text-rose-400',
      glow: 'shadow-rose-500/5'
    },
    maintenance: {
      bg: 'bg-gray-500/10 border-gray-500/20 hover:border-gray-500/40',
      text: 'text-gray-400',
      badge: 'bg-gray-500/20 text-gray-400',
      glow: 'shadow-gray-500/5'
    }
  }[desk.status] || {
    bg: 'bg-gray-500/10 border-gray-500/20 hover:border-gray-500/40',
    text: 'text-gray-400',
    badge: 'bg-gray-500/20 text-gray-400',
    glow: 'shadow-gray-500/5'
  };

  return (
    <div className={`p-6 rounded-[2rem] border backdrop-blur-md transition-all duration-300 shadow-2xl flex flex-col justify-between h-[220px] relative overflow-hidden group ${statusStyles.bg} ${statusStyles.glow}`}>
      {desk.status === 'occupied' && (
        <div className="absolute top-0 left-0 w-full h-[3px] bg-white/5">
          <div 
            className="h-full bg-gradient-to-r from-rose-500 to-purple-500 transition-all duration-1000" 
            style={{ width: `${percentLeft}%` }}
          />
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-black text-gray-900 group-hover:scale-105 transition-transform origin-left">{desk.name}</h3>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mt-0.5">{desk.ip_address || 'NO IP'}</span>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${statusStyles.badge}`}>
          {desk.zone}
        </span>
      </div>

      <div className="my-4 flex items-center gap-3">
        {desk.status === 'occupied' ? (
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t('cyberCafe.timeLeft') || 'Осталось времени'}</span>
            <span className="text-2xl font-black text-gray-900 tracking-tight font-mono tabular-nums animate-pulse">
              {timeLeft}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Monitor className={`w-8 h-8 ${statusStyles.text}`} />
            <span className={`text-sm font-black uppercase tracking-wider ${statusStyles.text}`}>
              {desk.status === 'available' ? (t('cyberCafe.available') || 'Свободен') : (t('cyberCafe.maintenance') || 'Ремонт')}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100/50 pt-4">
        {desk.status === 'available' ? (
          <button 
            onClick={() => onStartSession(desk)}
            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            {t('cyberCafe.startSession') || 'Запустить сессию'}
          </button>
        ) : desk.status === 'occupied' && activeSession ? (
          <button 
            onClick={() => onStopSession(activeSession.id)}
            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-500 hover:text-rose-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('cyberCafe.stopSession') || 'Стоп сессия'}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-black text-gray-400 uppercase tracking-widest">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t('cyberCafe.unavailable') || 'Недоступен'}
          </div>
        )}
        
        {desk.status === 'occupied' && activeSession?.user_id && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg" title="Постоянный клиент">
            <User className="w-3 h-3" />
            VIP
          </div>
        )}
      </div>
    </div>
  );
};
