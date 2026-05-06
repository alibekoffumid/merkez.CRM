import React, { useState, useEffect } from 'react';
import { X, Car, Hash, Calendar, Gauge, ShieldCheck, Plus, Save } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import { toast } from 'react-hot-toast';
import { UserProfile } from '../../../types/auth';
import { Vehicle } from '../types/fleet';

interface UserContextType {
  profile: UserProfile | null;
}

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Vehicle | null;
}

const AddVehicleModal: React.FC<AddVehicleModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { profile } = useUser() as UserContextType;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    plate_number: '',
    brand_model: '',
    year: new Date().getFullYear().toString(),
    vin: '',
    current_mileage: '',
    insurance_expiry: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        plate_number: initialData.plate_number,
        brand_model: initialData.brand_model,
        year: initialData.year.toString(),
        vin: initialData.vin,
        current_mileage: initialData.current_mileage.toString(),
        insurance_expiry: initialData.insurance_expiry.split('T')[0]
      });
    } else {
      setFormData({
        plate_number: '',
        brand_model: '',
        year: new Date().getFullYear().toString(),
        vin: '',
        current_mileage: '',
        insurance_expiry: new Date().toISOString().split('T')[0]
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantId = profile?.tenant_id || profile?.id;
    if (!tenantId) {
      toast.error('Ошибка авторизации: ID не найден');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tenant_id: tenantId,
        plate_number: formData.plate_number.toUpperCase(),
        brand_model: formData.brand_model,
        year: parseInt(formData.year),
        vin: formData.vin.toUpperCase(),
        current_mileage: parseFloat(formData.current_mileage) || 0,
        insurance_expiry: formData.insurance_expiry
      };

      if (initialData) {
        // Update existing
        const { error } = await supabase
          .from('fleet_vehicles')
          .update(payload)
          .eq('id', initialData.id);
        if (error) throw error;
        toast.success('Данные автомобиля обновлены!');
      } else {
        // Create new
        const { error } = await supabase
          .from('fleet_vehicles')
          .insert([{ ...payload, last_oil_change: payload.current_mileage, status: 'available' }]);
        if (error) throw error;
        toast.success('Автомобиль успешно добавлен!');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 sm:p-10">
          
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shadow-inner">
                <Car className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  {initialData ? 'Редактировать авто' : 'Новый автомобиль'}
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  {initialData ? 'Обновление информации' : 'Регистрация в автопарке'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 hover:bg-gray-100 rounded-2xl transition-all active:scale-90"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Госномер</label>
                <div className="relative group">
                   <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                   <input 
                    required 
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] text-sm font-black focus:bg-white focus:border-blue-100 transition-all outline-none placeholder:text-gray-300"
                    placeholder="99-AA-000"
                    value={formData.plate_number}
                    onChange={e => setFormData({...formData, plate_number: e.target.value})}
                   />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Марка / Модель</label>
                <input 
                  required 
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] text-sm font-black focus:bg-white focus:border-blue-100 transition-all outline-none placeholder:text-gray-300"
                  placeholder="Toyota Prius"
                  value={formData.brand_model}
                  onChange={e => setFormData({...formData, brand_model: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">VIN Код</label>
              <input 
                required 
                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] text-sm font-black focus:bg-white focus:border-blue-100 transition-all outline-none font-mono uppercase placeholder:text-gray-300"
                placeholder="17-значный код кузова..."
                value={formData.vin}
                onChange={e => setFormData({...formData, vin: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
               <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Текущий пробег</label>
                <div className="relative group">
                   <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                   <input 
                    required 
                    type="number"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] text-sm font-black focus:bg-white focus:border-blue-100 transition-all outline-none placeholder:text-gray-300"
                    placeholder="150000"
                    value={formData.current_mileage}
                    onChange={e => setFormData({...formData, current_mileage: e.target.value})}
                   />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Год выпуска</label>
                <div className="relative group">
                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                   <input 
                    required 
                    type="number"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] text-sm font-black focus:bg-white focus:border-blue-100 transition-all outline-none"
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: e.target.value})}
                   />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Страховка действительна до</label>
              <div className="relative group">
                 <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                 <input 
                  required 
                  type="date"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] text-sm font-black focus:bg-white focus:border-blue-100 transition-all outline-none"
                  value={formData.insurance_expiry}
                  onChange={e => setFormData({...formData, insurance_expiry: e.target.value})}
                 />
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {initialData ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {initialData ? 'Сохранить изменения' : 'Сохранить автомобиль'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddVehicleModal;
