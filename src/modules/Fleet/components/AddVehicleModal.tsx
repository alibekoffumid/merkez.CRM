import React, { useState } from 'react';
import { X, Car, Hash, Calendar, Gauge, ShieldCheck } from 'lucide-react';
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
    year: new Date().getFullYear(),
    vin: '',
    current_mileage: '',
    insurance_expiry: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('fleet_vehicles')
        .insert([{
          tenant_id: profile.tenant_id,
          plate_number: formData.plate_number,
          brand_model: formData.brand_model,
          year: formData.year,
          vin: formData.vin,
          current_mileage: parseFloat(formData.current_mileage),
          last_oil_change: parseFloat(formData.current_mileage),
          insurance_expiry: formData.insurance_expiry,
          status: 'available'
        }]);

      if (error) throw error;
      toast.success('Автомобиль успешно добавлен!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Car className="w-6 h-6 text-merkez-blue" />
              </div>
              Новый автомобиль
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Госномер</label>
                <div className="relative">
                   <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                    required 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none"
                    placeholder="99-AA-000"
                    value={formData.plate_number}
                    onChange={e => setFormData({...formData, plate_number: e.target.value})}
                   />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Марка / Модель</label>
                <input 
                  required 
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none"
                  placeholder="Toyota Prius"
                  value={formData.brand_model}
                  onChange={e => setFormData({...formData, brand_model: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">VIN Код</label>
              <input 
                required 
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none font-mono"
                placeholder="17-значный код..."
                value={formData.vin}
                onChange={e => setFormData({...formData, vin: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Текущий пробег</label>
                <div className="relative">
                   <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                    required 
                    type="number"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none"
                    placeholder="150000"
                    value={formData.current_mileage}
                    onChange={e => setFormData({...formData, current_mileage: e.target.value})}
                   />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Год выпуска</label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                    required 
                    type="number"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none"
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                   />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Страховка до</label>
              <div className="relative">
                 <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input 
                  required 
                  type="date"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none"
                  value={formData.insurance_expiry}
                  onChange={e => setFormData({...formData, insurance_expiry: e.target.value})}
                 />
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-merkez-blue text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Сохранить автомобиль'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddVehicleModal;
