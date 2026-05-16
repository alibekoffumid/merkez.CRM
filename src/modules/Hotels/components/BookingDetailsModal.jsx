import React, { useState } from 'react';
import { X, Calendar, Clock, User, Phone, Bed, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';

const BookingDetailsModal = ({ isOpen, onClose, booking, room, onDelete }) => {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !booking) return null;

  const handleDelete = async () => {
    if (!window.confirm(t('common.confirmDelete') || 'Are you sure?')) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('hotel_bookings').delete().eq('id', booking.id);
      if (error) throw error;
      toast.success(t('common.deletedSuccessfully') || 'Deleted');
      onDelete();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" />
      <div className="bg-white rounded-[2.5rem] w-full max-w-sm relative z-10 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600">
            <User className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDelete} 
              disabled={deleting}
              className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-gray-900 mb-1">{booking.guest_name}</h2>
... (rest of the file content)
        {booking.guest_phone && (
          <div className="flex items-center text-gray-500 font-medium text-sm mb-6">
            <Phone className="w-3.5 h-3.5 mr-1.5" />
            {booking.guest_phone}
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('hotels.roomsAndBeds')}</div>
            <div className="font-bold text-gray-900 flex items-center">
              <Bed className="w-4 h-4 mr-2 text-pink-500" />
              {room?.name} <span className="text-gray-400 ml-1 text-sm font-medium">({room?.type})</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('hotels.checkIn')}</div>
              <div className="font-bold text-gray-900 text-sm">{format(booking.checkIn, 'dd MMM yyyy')}</div>
              <div className="text-xs text-gray-500 font-medium flex items-center mt-0.5">
                <Clock className="w-3 h-3 mr-1" />
                {format(booking.checkIn, 'HH:mm')}
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('hotels.checkOut')}</div>
              <div className="font-bold text-gray-900 text-sm">{format(booking.checkOut, 'dd MMM yyyy')}</div>
              <div className="text-xs text-gray-500 font-medium flex items-center mt-0.5">
                <Clock className="w-3 h-3 mr-1" />
                {format(booking.checkOut, 'HH:mm')}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('hotels.status')}</div>
            <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
              booking.status === 'checked_in' ? 'bg-blue-100 text-blue-600' : 
              booking.status === 'confirmed' ? 'bg-pink-100 text-pink-600' : 
              'bg-amber-100 text-amber-600'
            }`}>
              {t(`hotels.${booking.status === 'checked_in' ? 'checkedIn' : booking.status === 'confirmed' ? 'confirmed' : 'pending'}`)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;
