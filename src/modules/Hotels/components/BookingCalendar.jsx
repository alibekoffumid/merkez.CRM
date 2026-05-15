import React, { useState, useMemo, useEffect } from 'react';
import { addDays, subDays, format, isSameDay, differenceInDays } from 'date-fns';
import { ChevronLeft, ChevronRight, User, Plus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import RoomModal from './RoomModal';
import BookingModal from './BookingModal';

const BookingCalendar = () => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [startDate, setStartDate] = useState(new Date());
  
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const fetchData = async () => {
    try {
      const tenantId = profile?.tenant_id || profile?.id;
      if (!tenantId) return;

      const [roomsRes, bookingsRes] = await Promise.all([
        supabase.from('hotel_rooms').select('*').eq('tenant_id', tenantId).order('name'),
        supabase.from('hotel_bookings').select('*').eq('tenant_id', tenantId)
      ]);

      if (roomsRes.error) throw roomsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;

      setRooms(roomsRes.data || []);
      
      // Parse dates safely for frontend
      const parsedBookings = (bookingsRes.data || []).map(b => ({
        ...b,
        checkIn: new Date(b.check_in_date),
        checkOut: new Date(b.check_out_date),
        color: b.status === 'checked_in' ? '#3b82f6' : b.status === 'confirmed' ? '#ec4899' : '#f59e0b'
      }));
      setBookings(parsedBookings);

    } catch (err) {
      console.error('Error fetching hotel data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);
  
  const daysToShow = 21; 
  const cellWidth = 96; 

  const dates = useMemo(() => {
    return Array.from({ length: daysToShow }).map((_, i) => addDays(startDate, i));
  }, [startDate]);

  const handleCellClick = (room, date) => {
    setSelectedDate(date);
    setSelectedRoomId(room.id);
    setIsBookingModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <>
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Панель управления календарем */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
         <div className="flex items-center space-x-4">
            <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
              <button onClick={() => setStartDate(subDays(startDate, 7))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500 hover:text-gray-900">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 font-black text-gray-900 text-sm tracking-tight w-32 text-center">
                {format(startDate, 'MMM yyyy')}
              </div>
              <button onClick={() => setStartDate(addDays(startDate, 7))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500 hover:text-gray-900">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button 
              onClick={() => setStartDate(new Date())}
              className="text-xs font-bold text-gray-500 hover:text-pink-600 transition-colors uppercase tracking-wider bg-gray-50 hover:bg-pink-50 px-3 py-2 rounded-xl"
            >
              {t('hotels.today') || 'Today'}
            </button>
         </div>

         <div className="flex items-center space-x-3 text-xs font-bold text-gray-500">
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#f59e0b] mr-1.5" /> {t('hotels.pending') || 'Pending'}</div>
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#ec4899] mr-1.5" /> {t('hotels.confirmed') || 'Confirmed'}</div>
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#3b82f6] mr-1.5" /> {t('hotels.checkedIn') || 'Checked In'}</div>
         </div>
      </div>

      {/* Сетка Шахматки */}
      <div className="flex-1 overflow-auto flex relative bg-gray-50/30">
        
        {/* Левая колонка: Список номеров */}
        <div className="w-56 border-r border-gray-100 flex-shrink-0 sticky left-0 bg-white z-20 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
           <div className="h-14 border-b border-gray-100 flex items-center justify-between px-5 font-black text-[10px] text-gray-400 uppercase tracking-widest bg-gray-50/80 backdrop-blur-md">
             <span>{t('hotels.roomsAndBeds') || 'Rooms & Beds'}</span>
             <button onClick={() => setIsRoomModalOpen(true)} className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors">
               <Plus className="w-4 h-4" />
             </button>
           </div>
           {rooms.length === 0 ? (
             <div className="p-6 text-center text-sm text-gray-400 font-medium">
               {t('hotels.noRoomsYet')} <br/><span className="text-pink-600 cursor-pointer" onClick={() => setIsRoomModalOpen(true)}>{t('hotels.addOne')}</span>
             </div>
           ) : rooms.map(room => (
             <div key={room.id} className="h-20 border-b border-gray-100 flex flex-col justify-center px-5 hover:bg-gray-50/50 transition-colors group cursor-pointer">
               <div className="flex items-center justify-between mb-1">
                 <span className="font-black text-gray-900 text-sm">{room.name}</span>
                 <div className={`w-2 h-2 rounded-full ${room.status === 'clean' ? 'bg-green-500' : room.status === 'dirty' ? 'bg-red-500' : 'bg-orange-500'}`} title={room.status} />
               </div>
               <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{room.type}</span>
             </div>
           ))}
        </div>

        {/* Правая часть: Даты и блоки бронирований */}
        <div className="flex-1 relative">
          
          {/* Шапка с датами */}
          <div className="flex h-14 border-b border-gray-100 bg-gray-50/80 backdrop-blur-md sticky top-0 z-10 w-max min-w-full">
            {dates.map(d => {
              const isToday = isSameDay(d, new Date());
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={d.toString()} className={`w-24 flex-shrink-0 border-r border-gray-100 flex flex-col items-center justify-center ${isToday ? 'bg-pink-50/50' : isWeekend ? 'bg-gray-100/30' : ''}`}>
                   <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isToday ? 'text-pink-500' : isWeekend ? 'text-gray-400' : 'text-gray-400'}`}>
                     {format(d, 'EEE')}
                   </span>
                   <span className={`text-base font-black ${isToday ? 'text-pink-600' : 'text-gray-900'}`}>
                     {format(d, 'd')}
                   </span>
                </div>
              );
            })}
          </div>
          
          {/* Сетка ячеек и брони */}
          <div className="relative w-max min-w-full">
             {rooms.map(room => (
               <div key={room.id} className="flex h-20 border-b border-gray-100 relative group/row">
                 
                 {/* Пустые ячейки (дни) */}
                 {dates.map(d => (
                   <div 
                     key={d.toString()} 
                     onClick={() => handleCellClick(room, d)}
                     className={`w-24 flex-shrink-0 border-r border-dashed border-gray-100 hover:bg-pink-50/30 transition-colors cursor-pointer flex items-center justify-center group/cell ${
                       d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-50/30' : ''
                     }`}
                   >
                     <div className="opacity-0 group-hover/cell:opacity-100 w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 transition-opacity">
                        <Plus className="w-3 h-3" />
                     </div>
                   </div>
                 ))}
                 
                 {/* Блоки бронирований для этой комнаты */}
                 {bookings.filter(b => b.room_id === room.id).map(booking => {
                    const startDiff = differenceInDays(booking.checkIn, startDate);
                    const length = differenceInDays(booking.checkOut, booking.checkIn);
                    
                    // Не рендерим, если бронь полностью за пределами видимой области
                    if (startDiff + length <= 0 || startDiff >= daysToShow) return null;
                    
                    // Обрезаем блок, если он выходит за края видимой зоны
                    const visibleStartDiff = Math.max(0, startDiff);
                    const visibleLength = Math.min(daysToShow, startDiff + length) - visibleStartDiff;
                    
                    const left = visibleStartDiff * cellWidth;
                    const width = visibleLength * cellWidth;
                    
                    // Флаги для закругления краев, если бронь продолжается за пределами экрана
                    const isCutLeft = startDiff < 0;
                    const isCutRight = startDiff + length > daysToShow;
                    
                    return (
                      <div 
                        key={booking.id}
                        className={`absolute top-2.5 h-14 shadow-sm border border-white/20 flex flex-col justify-center px-3 cursor-pointer hover:shadow-lg hover:z-10 transition-all hover:scale-[1.02] active:scale-[0.98] group/booking overflow-hidden
                          ${isCutLeft ? 'rounded-r-2xl border-l-0' : isCutRight ? 'rounded-l-2xl border-r-0' : 'rounded-2xl'}
                        `}
                        style={{ 
                          left: `${left + 4}px`, // +4px padding
                          width: `${width - 8}px`, // -8px padding
                          backgroundColor: booking.color,
                          zIndex: 5
                        }}
                      >
                        <div className="flex items-center text-white/90 font-black text-xs truncate">
                          <User className="w-3 h-3 mr-1 opacity-70" />
                          <span className="truncate">{booking.guest_name}</span>
                        </div>
                        <div className="text-[9px] font-bold text-white/70 uppercase tracking-wider mt-0.5">
                          {booking.status}
                        </div>
                      </div>
                    )
                 })}
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
    
    <RoomModal 
      isOpen={isRoomModalOpen} 
      onClose={() => setIsRoomModalOpen(false)} 
      onSaved={fetchData} 
    />
    
    <BookingModal 
      isOpen={isBookingModalOpen} 
      onClose={() => setIsBookingModalOpen(false)} 
      onSaved={fetchData}
      rooms={rooms}
      initialDate={selectedDate}
      initialRoomId={selectedRoomId}
    />
    </>
  );
};

export default BookingCalendar;
