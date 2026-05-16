import React, { useState, useEffect } from 'react';
import { Plus, Search, Home, Users, DollarSign, Filter, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import RoomModal from './RoomModal';
import RoomTypeModal from './RoomTypeModal';
import toast from 'react-hot-toast';
import { Tag } from 'lucide-react';

const RoomManagement = () => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

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

  const fetchRoomTypes = async () => {
    try {
      const tenantId = profile?.tenant_id || profile?.id;
      const { data, error } = await supabase
        .from('hotel_room_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      if (error) throw error;
      setRoomTypes(data || []);
    } catch (err) {
      console.warn('Room types table might not exist');
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
  }, [profile]);

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || room.type === filterType;
    return matchesSearch && matchesType;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'clean': return 'bg-green-500';
      case 'dirty': return 'bg-red-500';
      default: return 'bg-orange-500';
    }
  };

  const getRoomTypeLabel = (type) => {
    const found = roomTypes.find(t => t.id === type || t.name === type);
    if (found) return found.name;

    switch (type) {
      case 'Single': return t('hotels.typeSingle');
      case 'Double': return t('hotels.typeDouble');
      case 'Suite': return t('hotels.typeSuite');
      case 'Hostel': return t('hotels.typeHostel');
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search') || 'Search rooms...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all text-sm font-bold"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filterType === 'all' 
                  ? 'bg-gray-900 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {t('common.all')}
            </button>
            
            {roomTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.name)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterType === type.name 
                    ? 'bg-gray-900 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTypeModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-gray-100 text-gray-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all shadow-sm"
          >
            <Tag className="w-4 h-4 text-pink-600" />
            {t('hotels.manageCategories')}
          </button>
          
          <button
            onClick={() => {
              setSelectedRoom(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-pink-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-pink-500 shadow-xl shadow-pink-600/20 transition-all group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            {t('hotels.addRoom')}
          </button>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(n => (
            <div key={n} className="h-64 bg-gray-100 rounded-[2.5rem] animate-pulse" />
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Home className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-xl font-black text-gray-900 mb-2">{t('hotels.noRoomsYet')}</p>
          <p className="text-sm text-gray-500 font-medium mb-8">{t('hotels.addOneToGetStarted') || 'Add your first room to start managing bookings'}</p>
          <button
            onClick={() => {
              setSelectedRoom(null);
              setIsModalOpen(true);
            }}
            className="px-8 py-4 bg-pink-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-pink-500 shadow-xl shadow-pink-600/20 transition-all"
          >
            {t('hotels.addRoom')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRooms.map(room => (
            <div 
              key={room.id}
              onClick={() => {
                setSelectedRoom(room);
                setIsModalOpen(true);
              }}
              className="group bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-pink-900/5 transition-all duration-500 cursor-pointer p-6 relative overflow-hidden"
            >
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700 opacity-50" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition-colors duration-500">
                    <Home className="w-6 h-6" />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white ${getStatusColor(room.status)}`}>
                    {room.status}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-black text-gray-900 group-hover:text-pink-600 transition-colors">{room.name}</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">{getRoomTypeLabel(room.type)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center">
                    <Users className="w-4 h-4 text-gray-400 mb-1" />
                    <span className="text-sm font-black text-gray-900">{room.capacity}</span>
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t('hotels.capacity')}</span>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center">
                    <DollarSign className="w-4 h-4 text-gray-400 mb-1" />
                    <span className="text-sm font-black text-gray-900">{room.price_per_night}</span>
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t('hotels.pricePerNight')}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest">{t('common.edit') || 'Edit Details'}</span>
                  <Edit2 className="w-4 h-4 text-pink-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <RoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchRooms}
        room={selectedRoom}
      />
      <RoomTypeModal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        onSaved={fetchRoomTypes}
      />
    </div>
  );
};

export default RoomManagement;
