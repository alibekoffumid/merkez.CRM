import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';
import { DeskCard } from '../components/DeskCard';
import { SessionModal } from '../components/SessionModal';
import { MonitorPlay, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export const CafeDashboard = () => {
  const { t } = useTranslation();
  const [desks, setDesks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDesk, setSelectedDesk] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: desksRes, error: desksErr } = await supabase
        .from('cafe_desks')
        .select('*')
        .order('name');
      
      if (desksErr) throw desksErr;

      const { data: sessionsRes, error: sessionsErr } = await supabase
        .from('cafe_sessions')
        .select('*')
        .eq('status', 'active');
      
      if (sessionsErr) throw sessionsErr;

      setDesks(desksRes || []);
      setSessions(sessionsRes || []);
    } catch (err) {
      console.error(err);
      toast.error('Ошибка загрузки данных интернет-кафе: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('cafe-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cafe_desks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDesks(prev => [...prev, payload.new].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setDesks(prev => prev.map(d => d.id === payload.new.id ? payload.new : d));
          } else if (payload.eventType === 'DELETE') {
            setDesks(prev => prev.filter(d => d.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cafe_sessions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (payload.new.status === 'active') {
              setSessions(prev => [...prev, payload.new]);
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status !== 'active') {
              setSessions(prev => prev.filter(s => s.id !== payload.new.id));
            } else {
              setSessions(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStopSession = async (sessionId) => {
    try {
      const { error } = await supabase
        .from('cafe_sessions')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
      toast.success(t('cyberCafe.sessionStoppedSuccess') || 'Сессия остановлена, ПК свободен!');
    } catch (err) {
      toast.error('Не удалось завершить сессию: ' + err.message);
    }
  };

  const handleStartSessionClick = (desk) => {
    setSelectedDesk(desk);
    setIsModalOpen(true);
  };

  const groupedDesks = useMemo(() => {
    const groups = {
      Standard: [],
      VIP: [],
      Bootcamp: [],
      PS5: []
    };
    desks.forEach(desk => {
      if (groups[desk.zone]) {
        groups[desk.zone].push(desk);
      }
    });
    return groups;
  }, [desks]);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center bg-transparent">
        <Loader2 className="w-10 h-10 animate-spin text-pink-600" />
      </div>
    );
  }

  const hasAnyDesks = desks.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6 bg-white/50 p-6 rounded-3xl border border-gray-50/50">
        <div>
          <div className="flex items-center gap-3">
            <MonitorPlay className="w-8 h-8 text-pink-600" />
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t('cyberCafe.dashboardTitle') || 'Интернет-Кафе'}</h1>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-gray-400 font-bold text-xs tracking-wider mt-1 uppercase">{t('cyberCafe.realtimeMode') || 'Режим реального времени'}</p>
        </div>
        
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-pink-600 bg-pink-50 hover:bg-pink-100 px-5 py-3 rounded-2xl transition-all self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          {t('common.refresh') || 'Обновить'}
        </button>
      </div>

      {!hasAnyDesks ? (
        <div className="bg-white rounded-[2.5rem] p-16 text-center border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <MonitorPlay className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-xl font-black text-gray-900 mb-2">{t('cyberCafe.noDesksYet') || 'Нет игровых мест'}</p>
          <p className="text-sm text-gray-500 font-medium">{t('cyberCafe.addDesksInDatabase') || 'Добавьте компьютеры или приставки в базу данных, чтобы начать мониторинг.'}</p>
        </div>
      ) : (
        Object.entries(groupedDesks).map(([zone, zoneDesks]) => {
          if (zoneDesks.length === 0) return null;

          return (
            <div key={zone} className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">{zone} {t('cyberCafe.zoneName') || 'Зона'}</h2>
                <div className="h-px bg-gray-100 flex-1" />
                <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-lg">
                  {t('cyberCafe.totalDevices') || 'Всего'}: {zoneDesks.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {zoneDesks.map(desk => {
                  const activeSession = sessions.find(s => s.desk_id === desk.id);
                  return (
                    <DeskCard
                      key={desk.id}
                      desk={desk}
                      activeSession={activeSession}
                      onStartSession={handleStartSessionClick}
                      onStopSession={handleStopSession}
                    />
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {isModalOpen && selectedDesk && (
        <SessionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDesk(null);
          }}
          desk={selectedDesk}
          onSessionStarted={() => {
            setIsModalOpen(false);
            setSelectedDesk(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};
