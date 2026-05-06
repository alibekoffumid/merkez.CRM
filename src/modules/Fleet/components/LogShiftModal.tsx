import React, { useState, useEffect } from 'react';
import { X, TrendingUp, DollarSign, User, Gauge } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import { Vehicle, Driver } from '../types/fleet';
import { toast } from 'react-hot-toast';
import { UserProfile } from '../../../types/auth';

interface UserContextType {
  profile: UserProfile | null;
}

interface LogShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onSuccess: () => void;
}

const LogShiftModal: React.FC<LogShiftModalProps> = ({ isOpen, onClose, vehicle, onSuccess }) => {
  const { profile } = useUser() as UserContextType;
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [formData, setFormData] = useState({
    driver_id: '',
    daily_plan: '25', // Default rent price
    actual_revenue: '',
    commission: '0',
    end_mileage: ''
  });

  useEffect(() => {
    if (isOpen && profile?.tenant_id) {
      fetchDrivers();
      if (vehicle) {
        setFormData(prev => ({ ...prev, end_mileage: (vehicle.current_mileage + 150).toString() }));
      }
    }
  }, [isOpen, profile, vehicle]);

  const fetchDrivers = async () => {
    const tenantId = profile?.tenant_id || profile?.id;
    const { data } = await supabase
      .from('fleet_drivers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');
    setDrivers(data || []);
  };

  if (!isOpen || !vehicle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantId = profile?.tenant_id || profile?.id;
    if (!tenantId || !formData.driver_id) {
      toast.error('Выберите водителя');
      return;
    }

    setLoading(true);
    try {
      const revenue = parseFloat(formData.actual_revenue);
      const plan = parseFloat(formData.daily_plan);
      const comm = parseFloat(formData.commission);
      const newMileage = parseFloat(formData.end_mileage);

      // 1. Create rent log
      const { error: logError } = await supabase
        .from('fleet_rent_logs')
        .insert([{
          tenant_id: tenantId,
          vehicle_id: vehicle.id,
          driver_id: formData.driver_id,
          daily_plan: plan,
          actual_revenue: revenue,
          commission: comm,
          start_mileage: vehicle.current_mileage,
          end_mileage: newMileage,
          status: 'closed',
          shift_end: new Date().toISOString()
        }]);

      if (logError) throw logError;

      // 2. Update vehicle mileage and status
      const { error: vError } = await supabase
        .from('fleet_vehicles')
        .update({ 
          current_mileage: newMileage,
          status: 'available'
        })
        .eq('id', vehicle.id);

      if (vError) throw vError;

      // 3. Update driver balance
      const netProfitForOwner = plan + comm; // In this model, plan is fixed rent, revenue is what driver earned
      // Or if owner takes a cut from revenue:
      const driverEarnings = revenue - plan - comm;
      
      const { error: dError } = await supabase.rpc('increment_driver_balance', {
         d_id: formData.driver_id,
         amount: -plan // Subtracting rent from driver's balance
      });

      toast.success('Смена успешно закрыта и рассчитана!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const netProfit = (parseFloat(formData.actual_revenue) || 0) - (parseFloat(formData.daily_plan) || 0) - (parseFloat(formData.commission) || 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                Закрыть смену
              </h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">{vehicle.plate_number} · {vehicle.brand_model}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Водитель</label>
              <div className="relative">
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <select 
                  required 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none appearance-none"
                  value={formData.driver_id}
                  onChange={e => setFormData({...formData, driver_id: e.target.value})}
                 >
                   <option value="">Выберите водителя...</option>
                   {drivers.map(d => (
                     <option key={d.id} value={d.id}>{d.full_name}</option>
                   ))}
                 </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Выручка (Общая)</label>
                <div className="relative">
                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                    required 
                    type="number"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none"
                    placeholder="120"
                    value={formData.actual_revenue}
                    onChange={e => setFormData({...formData, actual_revenue: e.target.value})}
                   />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Аренда (План)</label>
                <input 
                  required 
                  type="number"
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none"
                  value={formData.daily_plan}
                  onChange={e => setFormData({...formData, daily_plan: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Пробег на конец смены</label>
              <div className="relative">
                 <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input 
                  required 
                  type="number"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none"
                  value={formData.end_mileage}
                  onChange={e => setFormData({...formData, end_mileage: e.target.value})}
                 />
              </div>
              <p className="text-[10px] text-gray-400 ml-1">Начало: {vehicle.current_mileage} км</p>
            </div>

            <div className="p-4 bg-merkez-blue/5 rounded-2xl border border-merkez-blue/10">
               <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Чистая прибыль водителя</span>
                  <span className={`text-xl font-black ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netProfit.toFixed(2)} ₼
                  </span>
               </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-merkez-blue text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Рассчитать и сохранить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LogShiftModal;
