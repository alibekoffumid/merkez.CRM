import React, { useState, useEffect } from 'react';
import { X, TrendingUp, User, CreditCard, Gauge, Calendar, Calculator } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import { toast } from 'react-hot-toast';
import { Vehicle } from '../types/fleet';
import { useTranslation } from 'react-i18next';

interface LogShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  onSuccess: () => void;
}

const LogShiftModal: React.FC<LogShiftModalProps> = ({ isOpen, onClose, vehicle, onSuccess }) => {
  const { t } = useTranslation();
  const { profile } = useUser() as any;
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    driver_id: '',
    actual_revenue: '0',
    daily_plan: '25',
    commission: '0',
    end_mileage: vehicle.current_mileage.toString()
  });

  useEffect(() => {
    if (profile) fetchDrivers();
  }, [profile]);

  const fetchDrivers = async () => {
    const tenantId = profile?.tenant_id || profile?.id;
    const { data } = await supabase.from('fleet_drivers').select('*').eq('tenant_id', tenantId);
    setDrivers(data || []);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantId = profile?.tenant_id || profile?.id;
    if (!tenantId || !formData.driver_id) {
      toast.error(t('fleet.selectDriver'));
      return;
    }

    setLoading(true);
    try {
      const revenue = parseFloat(formData.actual_revenue) || 0;
      const plan = parseFloat(formData.daily_plan) || 0;
      const comm = parseFloat(formData.commission) || 0;
      const endMileage = parseFloat(formData.end_mileage) || vehicle.current_mileage;

      const { error: shiftError } = await supabase.from('fleet_shifts').insert([{
        tenant_id: tenantId,
        vehicle_id: vehicle.id,
        driver_id: formData.driver_id,
        start_mileage: vehicle.current_mileage,
        end_mileage: endMileage,
        daily_plan: plan,
        actual_revenue: revenue,
        commission: comm,
        status: 'closed'
      }]);

      if (shiftError) throw shiftError;

      const { error: vError } = await supabase.from('fleet_vehicles').update({
        current_mileage: endMileage,
        status: 'available'
      }).eq('id', vehicle.id);

      if (vError) throw vError;

      const { error: dError } = await supabase.rpc('increment_driver_balance', {
         d_id: formData.driver_id,
         amount: -plan
      });

      toast.success(t('fleet.calculateAndSave'));
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
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
                {t('fleet.logShift')}
              </h2>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">{vehicle.plate_number} · {vehicle.brand_model}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('fleet.driver')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                  required
                  className="w-full pl-10 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-green-100 outline-none appearance-none"
                  value={formData.driver_id}
                  onChange={e => setFormData({...formData, driver_id: e.target.value})}
                >
                  <option value="">{t('fleet.selectDriver')}</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('fleet.actualRevenue')} (₼)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" className="w-full pl-10 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-green-100 outline-none" value={formData.actual_revenue} onChange={e => setFormData({...formData, actual_revenue: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('fleet.dailyPlan')} (₼)</label>
                <div className="relative">
                  <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" className="w-full pl-10 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-green-100 outline-none" value={formData.daily_plan} onChange={e => setFormData({...formData, daily_plan: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('fleet.endMileage')}</label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type="number" className="w-full pl-10 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-green-100 outline-none" value={formData.end_mileage} onChange={e => setFormData({...formData, end_mileage: e.target.value})} />
              </div>
              <p className="text-[10px] text-gray-400 font-bold ml-1 uppercase">Начало: {vehicle.current_mileage} км</p>
            </div>

            <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 mt-4">
               <div className="flex justify-between items-center">
                  <p className="text-xs font-black text-blue-900 uppercase tracking-widest">{t('fleet.netProfit')}</p>
                  <p className={`text-xl font-black ${netProfit < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {netProfit.toFixed(2)} ₼
                  </p>
               </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2 mt-4">
              {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : t('fleet.calculateAndSave')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LogShiftModal;
