import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import toast from 'react-hot-toast';

const RoomModal = ({ isOpen, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Standard',
    capacity: 2,
    price_per_night: 0
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tenantId = profile?.tenant_id || profile?.id;
      const { error } = await supabase.from('hotel_rooms').insert([{
        tenant_id: tenantId,
        ...formData
      }]);
      if (error) throw error;
      toast.success(t('hotels.saveRoom') + ' ✓');
      setFormData({ name: '', type: 'Standard', capacity: 2, price_per_night: 0 });
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
          <h2 className="text-xl font-bold text-gray-900">{t('hotels.addRoom')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">{t('hotels.roomName')}</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none" placeholder={t('hotels.roomNamePlaceholder')} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">{t('hotels.roomType')}</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none">
              <option value="Single">{t('hotels.typeSingle')}</option>
              <option value="Double">{t('hotels.typeDouble')}</option>
              <option value="Suite">{t('hotels.typeSuite')}</option>
              <option value="Hostel">{t('hotels.typeHostel')}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('hotels.capacity')}</label>
              <input type="number" min="1" required value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('hotels.pricePerNight')}</label>
              <input type="number" min="0" step="0.01" required value={formData.price_per_night} onChange={e => setFormData({...formData, price_per_night: parseFloat(e.target.value)})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full mt-6 bg-pink-600 text-white font-bold py-3 rounded-xl hover:bg-pink-700 transition-colors disabled:opacity-50">
            {loading ? t('hotels.saving') : t('hotels.saveRoom')}
          </button>
        </form>
      </div>
    </div>
  );
};
export default RoomModal;
