import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import CustomSelect from './CustomSelect';
import DatePicker from '../../../components/Common/DatePicker';

const BookingModal = ({ isOpen, onClose, onSaved, rooms, initialDate, initialRoomId }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    room_id: initialRoomId || (rooms.length > 0 ? rooms[0].id : ''),
    guest_name: '',
    guest_phone: '',
    check_in_date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    check_in_time: '14:00',
    check_out_date: initialDate ? format(new Date(initialDate.getTime() + 86400000), 'yyyy-MM-dd') : format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
    check_out_time: '12:00',
    status: 'confirmed'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.room_id) {
        throw new Error(t('hotels.selectRoom'));
      }
      const tenantId = profile?.tenant_id || profile?.id;
      
      const payload = {
        tenant_id: tenantId,
        room_id: formData.room_id,
        guest_name: formData.guest_name,
        guest_phone: formData.guest_phone,
        status: formData.status,
        check_in_date: `${formData.check_in_date}T${formData.check_in_time}:00`,
        check_out_date: `${formData.check_out_date}T${formData.check_out_time}:00`
      };

      const { error } = await supabase.from('hotel_bookings').insert([payload]);
      if (error) throw error;
      toast.success(t('hotels.saveBooking') + ' ✓');
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const roomOptions = rooms.map(r => ({ value: r.id, label: `${r.name} (${r.type})` }));
  
  const statusOptions = [
    { value: 'pending', label: t('hotels.pending') },
    { value: 'confirmed', label: t('hotels.confirmed') },
    { value: 'checked_in', label: t('hotels.checkedIn') },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" />
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg relative z-10 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900">{t('hotels.newBooking')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <CustomSelect
            label={t('hotels.roomsAndBeds')}
            value={formData.room_id}
            onChange={(val) => setFormData({...formData, room_id: val})}
            options={roomOptions}
            placeholder={t('hotels.selectRoom')}
          />
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('hotels.guestName')}</label>
              <input type="text" required value={formData.guest_name} onChange={e => setFormData({...formData, guest_name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all text-sm font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('hotels.guestPhone')}</label>
              <input type="tel" value={formData.guest_phone} onChange={e => setFormData({...formData, guest_phone: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all text-sm font-bold" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <DatePicker
                  label={t('hotels.checkIn')}
                  value={formData.check_in_date.split('T')[0] || formData.check_in_date}
                  onChange={(val) => setFormData({...formData, check_in_date: val})}
                  position="top"
                />
              </div>
              <div className="w-[120px]">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">{t('hotels.time') || 'Time'}</label>
                <div className="relative">
                  <input type="time" value={formData.check_in_time || '14:00'} onChange={e => setFormData({...formData, check_in_time: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all text-sm font-bold h-[54px] text-gray-900" />
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <DatePicker
                  label={t('hotels.checkOut')}
                  value={formData.check_out_date.split('T')[0] || formData.check_out_date}
                  onChange={(val) => setFormData({...formData, check_out_date: val})}
                  position="top"
                />
              </div>
              <div className="w-[120px]">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">{t('hotels.time') || 'Time'}</label>
                <div className="relative">
                  <input type="time" value={formData.check_out_time || '12:00'} onChange={e => setFormData({...formData, check_out_time: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all text-sm font-bold h-[54px] text-gray-900" />
                </div>
              </div>
            </div>
          </div>

          <CustomSelect
            label={t('hotels.status')}
            value={formData.status}
            onChange={(val) => setFormData({...formData, status: val})}
            options={statusOptions}
          />

          <button type="submit" disabled={loading} className="w-full py-4 bg-pink-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-pink-500 shadow-xl shadow-pink-600/20 transition-all disabled:opacity-50 flex items-center justify-center">
            {loading ? t('hotels.saving') : t('hotels.saveBooking')}
          </button>
        </form>
      </div>
    </div>
  );
};
export default BookingModal;
