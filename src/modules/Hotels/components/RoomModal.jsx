import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import toast from 'react-hot-toast';
import CustomSelect from './CustomSelect';

const RoomModal = ({ isOpen, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Single',
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
      setFormData({ name: '', type: 'Single', capacity: 2, price_per_night: 0 });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    { value: 'Single', label: t('hotels.typeSingle') },
    { value: 'Double', label: t('hotels.typeDouble') },
    { value: 'Suite', label: t('hotels.typeSuite') },
    { value: 'Hostel', label: t('hotels.typeHostel') },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" />
      <div className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{t('hotels.addRoom')}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('hotels.roomName')}</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all text-sm font-bold" placeholder={t('hotels.roomNamePlaceholder')} />
          </div>
          
          <CustomSelect
            label={t('hotels.roomType')}
            value={formData.type}
            onChange={(val) => setFormData({...formData, type: val})}
            options={typeOptions}
          />

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('hotels.capacity')}</label>
              <input type="number" min="1" required value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all text-sm font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('hotels.pricePerNight')}</label>
              <input type="number" min="0" step="0.01" required value={formData.price_per_night} onChange={e => setFormData({...formData, price_per_night: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all text-sm font-bold" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 bg-pink-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-pink-500 shadow-xl shadow-pink-600/20 transition-all disabled:opacity-50 flex items-center justify-center">
            {loading ? t('hotels.saving') : t('hotels.saveRoom')}
          </button>
        </form>
      </div>
    </div>
  );
};
export default RoomModal;
