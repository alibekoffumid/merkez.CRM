import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const BookingModal = ({ isOpen, onClose, onSaved, rooms, initialDate, initialRoomId }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    room_id: initialRoomId || (rooms.length > 0 ? rooms[0].id : ''),
    guest_name: '',
    guest_phone: '',
    check_in_date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    check_out_date: initialDate ? format(new Date(initialDate.getTime() + 86400000), 'yyyy-MM-dd') : format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
    status: 'confirmed'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.room_id) {
        throw new Error('Please select a room first');
      }
      const tenantId = profile?.tenant_id || profile?.id;
      const { error } = await supabase.from('hotel_bookings').insert([{
        tenant_id: tenantId,
        ...formData
      }]);
      if (error) throw error;
      toast.success('Booking added successfully!');
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{t('hotels.newBooking') || 'New Booking'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">{t('hotels.roomsAndBeds') || 'Room / Bed'}</label>
            <select required value={formData.room_id} onChange={e => setFormData({...formData, room_id: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none">
              <option value="" disabled>Select a room...</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Guest Name</label>
            <input type="text" required value={formData.guest_name} onChange={e => setFormData({...formData, guest_name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Guest Phone</label>
            <input type="tel" value={formData.guest_phone} onChange={e => setFormData({...formData, guest_phone: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Check In</label>
              <input type="date" required value={formData.check_in_date} onChange={e => setFormData({...formData, check_in_date: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Check Out</label>
              <input type="date" required value={formData.check_out_date} onChange={e => setFormData({...formData, check_out_date: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none">
              <option value="pending">{t('hotels.pending') || 'Pending'}</option>
              <option value="confirmed">{t('hotels.confirmed') || 'Confirmed'}</option>
              <option value="checked_in">{t('hotels.checkedIn') || 'Checked In'}</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full mt-6 bg-pink-600 text-white font-bold py-3 rounded-xl hover:bg-pink-700 transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Booking'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default BookingModal;
