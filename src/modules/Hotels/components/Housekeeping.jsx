import React, { useState, useEffect } from 'react';
import { Sparkles, Trash2, Clock, CheckCircle2, AlertCircle, Search, Filter, History, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const Housekeeping = () => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, dirty, clean, in_progress

  const fetchRooms = async () => {
    try {
      const tenantId = profile?.tenant_id || profile?.id;
      const { data, error } = await supabase
        .from('hotel_rooms')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;
      setRooms(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error loading rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [profile]);

  const updateStatus = async (roomId, newStatus) => {
    try {
      const tenantId = profile?.tenant_id || profile?.id;
      const { error } = await supabase
        .from('hotel_rooms')
        .update({ 
          status: newStatus,
          last_cleaned_at: newStatus === 'clean' ? new Date().toISOString() : undefined
        })
        .eq('id', roomId);

      if (error) throw error;

      // Log the change
      await supabase.from('hotel_housekeeping_logs').insert([{
        tenant_id: tenantId,
        room_id: roomId,
        new_status: newStatus,
        staff_name: profile?.full_name || 'Staff'
      }]);

      toast.success(t('common.success'));
      fetchRooms();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  };

  const stats = {
    total: rooms.length,
    dirty: rooms.filter(r => r.status === 'dirty' || !r.status).length,
    clean: rooms.filter(r => r.status === 'clean').length,
    progress: rooms.filter(r => r.status === 'in_progress').length,
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'dirty' && (room.status === 'dirty' || !room.status)) ||
                         (filter === 'clean' && room.status === 'clean') ||
                         (filter === 'in_progress' && room.status === 'in_progress');
    return matchesSearch && matchesFilter;
  });

  const getStatusConfig = (status) => {
    switch (status) {
      case 'clean': return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2, label: t('hotels.readyForCheckIn') };
      case 'in_progress': return { color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock, label: t('hotels.inProgress') };
      default: return { color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle, label: t('hotels.roomsToClean') };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.total')}</p>
            <p className="text-2xl font-black text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-red-50 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('hotels.roomsToClean')}</p>
            <p className="text-2xl font-black text-red-600">{stats.dirty}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('hotels.inProgress')}</p>
            <p className="text-2xl font-black text-blue-600">{stats.progress}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-green-50 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('hotels.readyForCheckIn')}</p>
            <p className="text-2xl font-black text-green-600">{stats.clean}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('common.search') || 'Find room...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-lg border border-gray-100 focus:border-pink-500 outline-none transition-all text-sm font-bold"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {['all', 'dirty', 'in_progress', 'clean'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === f 
                  ? 'bg-gray-900 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? t('common.all') : t(`hotels.${f === 'dirty' ? 'roomsToClean' : f === 'in_progress' ? 'inProgress' : 'readyForCheckIn'}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredRooms.map(room => {
          const config = getStatusConfig(room.status);
          return (
            <div key={room.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-2xl hover:shadow-pink-900/5">
              <div className="p-8 flex-1">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${config.bg} rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
                      <config.icon className={`w-7 h-7 ${config.color}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900">{room.name}</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{room.type}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${config.bg} ${config.color}`}>
                    {config.label}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-500">
                    <History className="w-4 h-4" />
                    <span className="text-xs font-bold">
                      {room.last_cleaned_at 
                        ? `${t('hotels.lastCleaned')}: ${format(new Date(room.last_cleaned_at), 'HH:mm, d MMM')}`
                        : t('common.noData')}
                    </span>
                  </div>
                  {room.housekeeping_note && (
                    <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg text-orange-700">
                      <MessageSquare className="w-4 h-4 mt-0.5" />
                      <p className="text-xs font-bold">{room.housekeeping_note}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-50 flex gap-2">
                {room.status !== 'clean' && (
                  <button 
                    onClick={() => updateStatus(room.id, 'clean')}
                    className="flex-1 py-3.5 bg-green-600 text-white rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-green-500 shadow-lg shadow-green-600/10 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {t('hotels.markAsClean')}
                  </button>
                )}
                {room.status === 'dirty' && (
                  <button 
                    onClick={() => updateStatus(room.id, 'in_progress')}
                    className="flex-1 py-3.5 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 shadow-lg shadow-blue-600/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    {t('hotels.markAsInProgress')}
                  </button>
                )}
                {room.status === 'clean' && (
                  <button 
                    onClick={() => updateStatus(room.id, 'dirty')}
                    className="flex-1 py-3.5 bg-red-600 text-white rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-red-500 shadow-lg shadow-red-600/10 transition-all flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {t('hotels.markAsDirty')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Housekeeping;
