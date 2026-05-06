import React, { useState } from 'react';
import { X, Car, Hash, Calendar, Gauge, ShieldCheck, Plus } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import { toast } from 'react-hot-toast';
import { UserProfile } from '../../../types/auth';

interface UserContextType {
  profile: UserProfile | null;
}

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddVehicleModal: React.FC<AddVehicleModalProps> = ({ isOpen, onClose, onSuccess }) => {
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) {
      toast.error('Ошибка авторизации: Tenant ID не найден');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('fleet_vehicles')
        .insert([{
          tenant_id: profile.tenant_id,
          plate_number: formData.plate_number.toUpperCase(),
          brand_model: formData.brand_model,
          year: parseInt(formData.year),
          vin: formData.vin.toUpperCase(),
          current_mileage: parseFloat(formData.current_mileage) || 0,
          last_oil_change: parseFloat(formData.current_mileage) || 0,
          insurance_expiry: formData.insurance_expiry,
          status: 'available'
        }]);

      if (error) throw error;
      
      toast.success('Автомобиль успешно добавлен!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Не удалось сохранить: ' + (error.message || 'Проверьте данные'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="relative p-8 sm:p-10">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shadow-inner">
                <Car className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Новый автомобиль</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Регистрация в автопарке</p>
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
                    <Plus className="w-5 h-5" />
                    Сохранить автомобиль
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
