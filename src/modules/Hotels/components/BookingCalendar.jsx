import React, { useState, useMemo, useEffect, useRef } from 'react';
import { addDays, subDays, format, isSameDay, differenceInDays, addHours, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, User, Plus, Loader2, CalendarDays, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import RoomModal from './RoomModal';
import BookingModal from './BookingModal';
import BookingDetailsModal from './BookingDetailsModal';

const BookingCalendar = () => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [viewMode, setViewMode] = useState('week');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // 'week' or 'day'
  const [is24Hour, setIs24Hour] = useState(true);
  const calendarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    };

    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);
  
  const [rooms, setRooms] = useState([]);
  const monthNames = useMemo(() => [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ], []);

  const formatMonthYear = (date) => {
    const monthKey = monthNames[date.getMonth()];
    const monthStr = t(`common.months.${monthKey}`);
    const year = date.getFullYear();
    return `${monthStr} ${year}`;
  };

  const formatDayMonthYear = (date) => {
    const day = date.getDate();
    const monthKey = monthNames[date.getMonth()];
    const monthStr = t(`common.months.${monthKey}`);
    const year = date.getFullYear();
    return `${day} ${monthStr} ${year}`;
  };
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [activeStatuses, setActiveStatuses] = useState(['pending', 'confirmed', 'checked_in']);

  const toggleStatus = (status) => {
    setActiveStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

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
  
  // === WEEK VIEW CONFIG ===
  const daysToShow = 21; 
  const cellWidth = 96;

  const dates = useMemo(() => {
    return Array.from({ length: daysToShow }).map((_, i) => addDays(startDate, i));
  }, [startDate]);

  // === DAY VIEW CONFIG ===
  const hoursToShow = 24;
  const hourCellWidth = 80;

  const hours = useMemo(() => {
    const dayStart = startOfDay(startDate);
    return Array.from({ length: hoursToShow }).map((_, i) => addHours(dayStart, i));
  }, [startDate]);

  const handleCellClick = (room, date) => {
    setSelectedDate(date);
    setSelectedRoomId(room.id);
    setIsBookingModalOpen(true);
  };

  const navigateBack = () => {
    setStartDate(viewMode === 'week' ? subDays(startDate, 7) : subDays(startDate, 1));
  };

  const navigateForward = () => {
    setStartDate(viewMode === 'week' ? addDays(startDate, 7) : addDays(startDate, 1));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm" style={{ minHeight: '400px' }}>
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  // Check if a booking covers a specific day
  const isBookingOnDay = (booking, day = startDate) => {
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);
    return booking.checkIn < dayEnd && booking.checkOut > dayStart;
  };

  return (
    <>
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 h-full flex-1 min-h-[500px]">
      {/* Панель управления календарем */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
         <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
              <button 
                onClick={() => setViewMode('week')} 
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold px-3 ${
                  viewMode === 'week' ? 'bg-pink-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                {t('hotels.weekView') || 'Week'}
              </button>
              <button 
                onClick={() => setViewMode('day')} 
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold px-3 ${
                  viewMode === 'day' ? 'bg-pink-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {t('hotels.dayView') || 'Day'}
              </button>
            </div>

            {/* Time Format Toggle */}
            <button 
              onClick={() => setIs24Hour(!is24Hour)}
              className={`p-2 px-3 rounded-xl text-xs font-black transition-all border ${
                is24Hour ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-pink-50 text-pink-600 border-pink-100 shadow-sm'
              }`}
            >
              {is24Hour ? '24H' : '12H'}
            </button>

            {/* Date Navigation */}
            <div ref={calendarRef} className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100 relative">
              <button onClick={navigateBack} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500 hover:text-gray-900">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="px-4 font-black text-gray-900 text-sm tracking-tight w-48 text-center hover:text-pink-600 transition-colors cursor-pointer"
              >
                {viewMode === 'week' 
                  ? formatMonthYear(startDate)
                  : formatDayMonthYear(startDate)
                }
              </button>
              <button onClick={navigateForward} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500 hover:text-gray-900">
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Calendar Popup */}
              {isCalendarOpen && (
                <div className="absolute top-full mt-2 left-0 bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 w-[320px] z-[600] animate-in zoom-in-95 fade-in duration-200 origin-top">
                  {(() => {
                    const viewDate = startDate;
                    const year = viewDate.getFullYear();
                    const month = viewDate.getMonth();
                    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
                    const daysInMo = new Date(year, month + 1, 0).getDate();
                    const today = new Date();
                    const calDays = [];
                    for (let i = 0; i < firstDay; i++) calDays.push(<div key={`e${i}`} />);
                    for (let d = 1; d <= daysInMo; d++) {
                      const date = new Date(year, month, d);
                      const isToday = date.toDateString() === today.toDateString();
                      const isSelected = date.toDateString() === startDate.toDateString();
                      calDays.push(
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setStartDate(date);
                            setIsCalendarOpen(false);
                          }}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                            isSelected ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30' :
                            isToday ? 'bg-pink-50 text-pink-600 border border-pink-200' :
                            'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    }
                    return (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <button type="button" onClick={() => setStartDate(subDays(startDate, 30))} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <span className="text-sm font-black text-gray-900 uppercase tracking-tight">
                            {formatMonthYear(startDate)}
                          </span>
                          <button type="button" onClick={() => setStartDate(addDays(startDate, 30))} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => (
                            <span key={d} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              {t(`common.weekdays.${d}`)}
                            </span>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">{calDays}</div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            <button 
              onClick={() => setStartDate(new Date())}
              className="text-xs font-bold text-gray-500 hover:text-pink-600 transition-colors uppercase tracking-wider bg-gray-50 hover:bg-pink-50 px-3 py-2 rounded-xl"
            >
              {t('hotels.today') || 'Today'}
            </button>
         </div>

          <div className="flex items-center space-x-3 text-xs font-bold text-gray-500">
            {[
              { id: 'pending', color: '#f59e0b', label: t('hotels.pending') || 'Pending' },
              { id: 'confirmed', color: '#ec4899', label: t('hotels.confirmed') || 'Confirmed' },
              { id: 'checked_in', color: '#3b82f6', label: t('hotels.checkedIn') || 'Checked In' }
            ].map(s => {
              const isActive = activeStatuses.includes(s.id);
              return (
                <button 
                  key={s.id}
                  onClick={() => toggleStatus(s.id)}
                  className={`flex items-center px-2 py-1 rounded-lg transition-all border ${
                    isActive 
                      ? 'bg-white border-gray-100 shadow-sm opacity-100' 
                      : 'bg-transparent border-transparent opacity-40 grayscale-[0.5] hover:opacity-60'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: s.color }} />
                  {s.label}
                </button>
              );
            })}
          </div>
      </div>

      {/* Сетка Шахматки */}
      <div className="flex-1 overflow-auto flex relative bg-white">
        
        {/* Левая колонка: Список номеров */}
        <div className="w-56 border-r border-gray-100 flex-shrink-0 sticky left-0 bg-white z-20 shadow-[4px_0_12px_rgba(0,0,0,0.02)] min-h-full">
           <div className="h-14 border-b border-gray-100 flex items-center justify-between px-5 font-black text-[10px] text-gray-400 uppercase tracking-widest bg-gray-50/80 backdrop-blur-md z-40 sticky top-0">
             <span>{t('hotels.roomsAndBeds') || 'Rooms & Beds'}</span>
              <button 
                onClick={() => {
                  setSelectedRoom(null);
                  setIsRoomModalOpen(true);
                }} 
                className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
           </div>
           {rooms.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400 font-medium">
                {t('hotels.noRoomsYet')} <br/>
                <span 
                  className="text-pink-600 cursor-pointer" 
                  onClick={() => {
                    setSelectedRoom(null);
                    setIsRoomModalOpen(true);
                  }}
                >
                  {t('hotels.addOne')}
                </span>
              </div>
            ) : rooms.map(room => (
              <div 
                key={room.id} 
                onClick={() => {
                  setSelectedRoom(room);
                  setIsRoomModalOpen(true);
                }}
                className="h-20 border-b border-gray-100 flex flex-col justify-center px-5 hover:bg-gray-50/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-gray-900 text-sm group-hover:text-pink-600 transition-colors">{room.name}</span>
                  <div className={`w-2 h-2 rounded-full ${room.status === 'clean' ? 'bg-green-500' : room.status === 'dirty' ? 'bg-red-500' : 'bg-orange-500'}`} title={room.status} />
                </div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{room.type}</span>
              </div>
            ))}
        </div>

        {/* Правая часть */}
        <div className="flex-1 relative min-h-full flex flex-col bg-gray-50/30">
          
          {/* ============ WEEK VIEW ============ */}
          {viewMode === 'week' && (
            <>
              {/* Шапка с датами */}
              <div className="flex h-14 border-b border-gray-100 bg-gray-50/80 backdrop-blur-md sticky top-0 z-30 w-max min-w-full">
                {dates.map(d => {
                  const isToday = isSameDay(d, new Date());
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div 
                      key={d.toString()} 
                      onMouseEnter={() => setHoveredDate(d)}
                      onMouseLeave={() => setHoveredDate(null)}
                      className={`w-24 flex-shrink-0 border-r border-gray-100 flex flex-col items-center justify-center relative ${isToday ? 'bg-pink-50/50' : isWeekend ? 'bg-gray-100/30' : ''}`}
                    >
                       <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isToday ? 'text-pink-500' : 'text-gray-400'}`}>
                         {t(`common.weekdays.${format(d, 'eee').toLowerCase()}`)}
                       </span>
                       <span className={`text-base font-black ${isToday ? 'text-pink-600' : 'text-gray-900'}`}>
                         {format(d, 'd')}
                       </span>

                       {/* Guest Tooltip */}
                       {hoveredDate && isSameDay(d, hoveredDate) && (
                         <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-64 z-[100] animate-in fade-in zoom-in-95 duration-200">
                           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-50 pb-2 flex items-center justify-between">
                             <span>{format(d, 'd')} {t(`common.months.${format(d, 'MMMM').toLowerCase()}`)}</span>
                             <span className="text-pink-600">{bookings.filter(b => isBookingOnDay(b, d)).length} {t('hotels.guests')}</span>
                           </div>
                           <div className="space-y-2 max-h-60 overflow-auto pr-2 custom-scrollbar">
                             {bookings.filter(b => isBookingOnDay(b, d)).length === 0 ? (
                               <div className="text-xs text-gray-400 italic py-2">{t('hotels.noBookings') || 'No bookings'}</div>
                             ) : (
                               bookings.filter(b => isBookingOnDay(b, d)).map(b => (
                                 <div key={b.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-default group">
                                   <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                                   <div className="flex-1 min-w-0">
                                     <div className="text-xs font-bold text-gray-900 truncate">{b.guest_name}</div>
                                     <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">
                                       {format(b.checkIn, 'HH:mm')} - {format(b.checkOut, 'HH:mm')}
                                     </div>
                                   </div>
                                 </div>
                               ))
                             )}
                           </div>
                         </div>
                       )}
                    </div>
                  );
                })}
              </div>
              
              {/* Сетка ячеек и брони (WEEK) */}
              <div className="relative w-max min-w-full flex-1 flex flex-col">
                 {/* Background grid lines extending full height */}
                 <div className="absolute inset-0 flex pointer-events-none w-max min-w-full">
                   {dates.map((d, i) => (
                     <div key={`bg-${i}`} className={`w-24 flex-shrink-0 border-r border-dashed border-gray-100 ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-50/50' : 'bg-transparent'}`} />
                   ))}
                 </div>
                 
                 {rooms.map(room => (
                   <div key={room.id} className="flex h-20 border-b border-gray-100 relative group/row z-10 bg-white hover:bg-pink-50/10 transition-colors">
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
                     
                     {/* Блоки бронирований (WEEK) */}
                     {bookings
                        .filter(b => b.room_id === room.id && activeStatuses.includes(b.status))
                        .map(booking => {
                        const startDiff = (booking.checkIn.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
                        const length = (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24);
                        
                        if (startDiff + length <= 0 || startDiff >= daysToShow) return null;
                        
                        const visibleStartDiff = Math.max(0, startDiff);
                        const visibleEndDiff = Math.min(daysToShow, startDiff + length);
                         const visibleLength = visibleEndDiff - visibleStartDiff;
                        
                        const left = visibleStartDiff * cellWidth;
                        const width = visibleLength * cellWidth;
                        
                        const isCutLeft = startDiff < 0;
                        const isCutRight = startDiff + length > daysToShow;
                        
                        return (
                          <div 
                            key={booking.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(booking);
                            }}
                            className={`absolute top-2.5 h-14 shadow-md border border-white/30 flex flex-col justify-center px-3 cursor-pointer hover:shadow-xl hover:z-[20] transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden
                              ${isCutLeft ? 'rounded-r-2xl border-l-0' : isCutRight ? 'rounded-l-2xl border-r-0' : 'rounded-2xl'}
                            `}
                            style={{ 
                              left: `${left + 4}px`,
                              width: `${Math.max(width - 8, 88)}px`, // Reduced min-width to prevent blocking next cell "+" button // Minimum width for readability
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
            </>
          )}

          {/* ============ DAY VIEW (HOURS) ============ */}
          {viewMode === 'day' && (
            <>
              {/* Шапка с часами */}
              <div className="flex h-14 border-b border-gray-100 bg-gray-50/80 backdrop-blur-md sticky top-0 z-30 w-max min-w-full">
                {hours.map((h, i) => {
                  const now = new Date();
                  const isCurrentHour = isSameDay(startDate, now) && now.getHours() === i;
                  return (
                    <div key={i} className={`flex-shrink-0 border-r border-gray-100 flex flex-col items-center justify-center ${isCurrentHour ? 'bg-pink-50/50' : ''}`} style={{ width: `${hourCellWidth}px` }}>
                       <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isCurrentHour ? 'text-pink-500' : 'text-gray-400'}`}>
                         {!is24Hour ? (i < 12 ? 'AM' : 'PM') : ''}
                       </span>
                       <span className={`text-base font-black ${isCurrentHour ? 'text-pink-600' : 'text-gray-900'}`}>
                         {(() => {
                           if (is24Hour) return format(h, 'H:00');
                           const h12 = i % 12 || 12;
                           return `${h12}:00`;
                         })()}
                       </span>
                    </div>
                  );
                })}
              </div>

              {/* Сетка ячеек (DAY) */}
              <div className="relative w-max min-w-full flex-1 flex flex-col">
                 {/* Background grid lines extending full height */}
                 <div className="absolute inset-0 flex pointer-events-none w-max min-w-full">
                   {hours.map((h, i) => (
                     <div key={`bg-${i}`} className="flex-shrink-0 border-r border-dashed border-gray-100" style={{ width: `${hourCellWidth}px` }} />
                   ))}
                 </div>

                 {rooms.map(room => {
                   return (
                     <div key={room.id} className="flex h-20 border-b border-gray-100 relative group/row z-10 bg-white hover:bg-pink-50/10 transition-colors">
                       {hours.map((h, i) => (
                         <div 
                           key={i}
                           onClick={() => handleCellClick(room, h)}
                           className="flex-shrink-0 border-r border-dashed border-gray-100 hover:bg-pink-50/30 transition-colors cursor-pointer flex items-center justify-center group/cell"
                           style={{ width: `${hourCellWidth}px` }}
                         >
                           <div className="opacity-0 group-hover/cell:opacity-100 w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 transition-opacity">
                              <Plus className="w-3 h-3" />
                           </div>
                         </div>
                       ))}
                       
                       {/* Блоки бронирований (DAY) */}
                        {bookings
                          .filter(b => b.room_id === room.id && isBookingOnDay(b) && activeStatuses.includes(b.status))
                          .map(booking => {
                         const dayStart = startOfDay(startDate);
                         const dayEnd = addDays(dayStart, 1);
                         
                         const visibleStart = new Date(Math.max(booking.checkIn.getTime(), dayStart.getTime()));
                         const visibleEnd = new Date(Math.min(booking.checkOut.getTime(), dayEnd.getTime()));
                         
                         const startHourOffset = (visibleStart.getTime() - dayStart.getTime()) / (1000 * 60 * 60);
                         const durationHours = (visibleEnd.getTime() - visibleStart.getTime()) / (1000 * 60 * 60);
                         
                         const left = startHourOffset * hourCellWidth;
                         const width = durationHours * hourCellWidth;
                         
                         const isCutLeft = booking.checkIn < dayStart;
                         const isCutRight = booking.checkOut > dayEnd;
                         
                         // Если ширина слишком мала (например, 0), не рисуем (хотя функция isBookingOnDay это уже фильтрует)
                         if (width <= 0) return null;
                         
                         return (
                           <div 
                             key={booking.id}
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedBooking(booking);
                             }}
                             className={`absolute top-2.5 h-14 shadow-md border border-white/30 flex flex-col justify-center px-3 cursor-pointer hover:shadow-xl hover:z-[20] transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden
                               ${isCutLeft ? 'rounded-r-2xl border-l-0' : isCutRight ? 'rounded-l-2xl border-r-0' : 'rounded-2xl'}
                             `}
                             style={{ 
                               left: `${left + (isCutLeft ? 0 : 4)}px`,
                               width: `${width - (isCutLeft ? 0 : 4) - (isCutRight ? 0 : 4)}px`,
                               backgroundColor: booking.color,
                               zIndex: 5
                             }}
                           >
                             <div className="flex items-center text-white/90 font-black text-xs truncate">
                               <User className="w-3 h-3 mr-1 opacity-70" />
                               <span className="truncate">{booking.guest_name}</span>
                               <span className="ml-2 text-white/60 text-[10px]">
                                 {format(booking.checkIn, 'dd.MM')} → {format(booking.checkOut, 'dd.MM')}
                               </span>
                             </div>
                             <div className="text-[9px] font-bold text-white/70 uppercase tracking-wider mt-0.5">
                               {booking.status}
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   );
                 })}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
    
    <RoomModal 
      isOpen={isRoomModalOpen} 
      onClose={() => {
        setIsRoomModalOpen(false);
        setSelectedRoom(null);
      }} 
      onSaved={fetchData} 
      room={selectedRoom}
    />
    
    <BookingModal 
      isOpen={isBookingModalOpen} 
      onClose={() => setIsBookingModalOpen(false)} 
      onSaved={fetchData}
      rooms={rooms}
      initialDate={selectedDate}
      initialRoomId={selectedRoomId}
    />
    
    <BookingDetailsModal 
      isOpen={!!selectedBooking}
      onClose={() => setSelectedBooking(null)}
      booking={selectedBooking}
      room={rooms.find(r => r.id === selectedBooking?.room_id)}
      onDelete={fetchData}
    />
    </>
  );
};

export default BookingCalendar;
