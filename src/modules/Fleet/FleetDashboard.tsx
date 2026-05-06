import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Users, 
  AlertCircle, 
  DollarSign, 
  MessageCircle, 
  Search,
  Plus,
  Wrench,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { Vehicle, Driver, RentLog, FleetStats } from './types/fleet';
import { UserProfile } from '../../types/auth';
import { toast } from 'react-hot-toast';
import AddVehicleModal from './components/AddVehicleModal';
import AddDriverModal from './components/AddDriverModal';
import LogShiftModal from './components/LogShiftModal';
import { sendDriverDailyReport } from './utils/whatsapp';

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  activeModules: string[];
}

const FleetDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useUser() as UserContextType;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<FleetStats>({
    total_vehicles: 0,
    active_vehicles: 0,
    daily_revenue: 0,
    pending_maintenance: 0
  });
  const [loading, setLoading] = useState(true);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile) {
      fetchFleetData();
    }
  }, [profile]);

  const fetchFleetData = async () => {
    try {
      setLoading(true);
      const tenantId = profile?.tenant_id || profile?.id;
      
      const { data: vData, error: vError } = await supabase
        .from('fleet_vehicles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (vError) throw vError;
      setVehicles(vData || []);

      const maintenanceAlerts = (vData || []).filter(v => {
        const oilGap = v.current_mileage - v.last_oil_change;
        const daysToInsurance = v.insurance_expiry 
          ? (new Date(v.insurance_expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
          : 999;
        return oilGap > 9000 || daysToInsurance < 7;
      }).length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: lData } = await supabase
        .from('fleet_rent_logs')
        .select('actual_revenue')
        .eq('tenant_id', tenantId)
        .gte('created_at', today.toISOString());

      const todayRevenue = (lData || []).reduce((sum, l) => sum + (l.actual_revenue || 0), 0);

      setStats({
        total_vehicles: vData?.length || 0,
        active_vehicles: vData?.filter(v => v.status === 'active').length || 0,
        daily_revenue: todayRevenue,
        pending_maintenance: maintenanceAlerts
      });

    } catch (error: any) {
      toast.error('Error fetching fleet data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'repair': return 'bg-red-500';
      case 'available': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const isMaintenanceCritical = (v: Vehicle) => {
    const oilGap = v.current_mileage - v.last_oil_change;
    const daysToInsurance = v.insurance_expiry 
      ? (new Date(v.insurance_expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
      : 999;
    return oilGap > 9000 || daysToInsurance < 7;
  };

  const filteredVehicles = vehicles.filter(v => 
    v.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.brand_model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-merkez-blue/10 rounded-2xl">
              <Car className="w-8 h-8 text-merkez-blue" />
            </div>
            Mərkəз Fleet
          </h1>
          <p className="text-gray-500 font-medium mt-1">Управление таксопарком и водителями</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/fleet/drivers')}
            className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-3 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Users className="w-5 h-5" />
            Водители
          </button>
          <button 
            onClick={() => setIsVehicleModalOpen(true)}
            className="flex items-center gap-2 bg-merkez-blue text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Добавить авто
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Всего машин</p>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-black text-gray-900">{stats.total_vehicles}</p>
            <div className="p-2 bg-blue-50 rounded-xl">
              <Car className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">На линии</p>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-black text-green-500">{stats.active_vehicles}</p>
            <div className="p-2 bg-green-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Выручка (сегодня)</p>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-black text-merkez-blue">{stats.daily_revenue} ₼</p>
            <div className="p-2 bg-blue-50 rounded-xl">
              <DollarSign className="w-6 h-6 text-merkez-blue" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Нужен сервис</p>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-black text-red-500">{stats.pending_maintenance}</p>
            <div className="p-2 bg-red-50 rounded-xl">
              <Wrench className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">Автопарк</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Поиск по номеру..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-merkez-blue/20 transition-all outline-none"
            />
          </div>
        </div>

        {filteredVehicles.length === 0 && !loading ? (
          <div className="bg-white rounded-[2.5rem] p-12 text-center border-2 border-dashed border-gray-100">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="w-10 h-10 text-gray-300" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">Автопарк пуст</h3>
             <p className="text-gray-500 mb-6">Начните с добавления первого автомобиля в вашу систему.</p>
             <button 
              onClick={() => setIsVehicleModalOpen(true)}
              className="px-8 py-3 bg-merkez-blue text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20"
             >
               Добавить первый автомобиль
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-[2.5rem]" />)
            ) : filteredVehicles.map(vehicle => (
              <div 
                key={vehicle.id} 
                className={`bg-white p-6 rounded-[2.5rem] border-2 transition-all group ${
                  isMaintenanceCritical(vehicle) ? 'border-red-100 bg-red-50/20' : 'border-gray-100 hover:border-merkez-blue/30'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(vehicle.status)}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {vehicle.status}
                      </span>
                    </div>
                    <h4 className="text-xl font-black text-gray-900 uppercase">{vehicle.plate_number}</h4>
                    <p className="text-sm font-bold text-gray-500">{vehicle.brand_model}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-2xl group-hover:bg-merkez-blue/5 transition-colors">
                    <Car className="w-6 h-6 text-gray-400 group-hover:text-merkez-blue" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Пробег</p>
                    <p className="font-bold text-gray-900">{vehicle.current_mileage.toLocaleString()} км</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">VIN</p>
                    <p className="font-mono text-[10px] font-bold text-gray-700">{vehicle.vin}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold ${
                    vehicle.current_mileage - vehicle.last_oil_change > 9000 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                  }`}>
                    <Wrench className="w-4 h-4" />
                    Замена масла: {vehicle.last_oil_change.toLocaleString()} км
                  </div>
                  <div className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold ${
                    new Date(vehicle.insurance_expiry).getTime() - new Date().getTime() < 7 * 24 * 3600 * 1000 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                  }`}>
                    <ShieldCheck className="w-4 h-4" />
                    Страховка до: {new Date(vehicle.insurance_expiry).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2">
                   <button 
                    onClick={() => setSelectedVehicle(vehicle)}
                    className="flex-1 py-3 bg-gray-900 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"
                   >
                      Лог смены
                      <TrendingUp className="w-4 h-4" />
                   </button>
                   <button 
                    onClick={() => {
                      setEditingVehicle(vehicle);
                      setIsVehicleModalOpen(true);
                    }}
                    className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:text-merkez-blue transition-all"
                   >
                      <AlertCircle className="w-5 h-5" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Driver WhatsApp Reporting Section */}
      <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <MessageCircle className="w-32 h-32" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl font-black mb-2">WhatsApp Отчетность</h2>
          <p className="text-gray-400 font-medium mb-6">
            Автоматически формируйте и отправляйте детализированные отчеты водителям на азербайджанском языке.
          </p>
          <div className="flex gap-3">
             <button 
              onClick={() => toast('Выберите смену для отправки отчета')}
              className="flex items-center gap-2 bg-merkez-blue text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all"
             >
                <MessageCircle className="w-5 h-5" />
                Отправить отчет водителю
             </button>
          </div>
        </div>
      </div>

      <AddVehicleModal 
        isOpen={isVehicleModalOpen} 
        onClose={() => {
          setIsVehicleModalOpen(false);
          setEditingVehicle(null);
        }} 
        onSuccess={fetchFleetData}
        initialData={editingVehicle}
      />
      <AddDriverModal 
        isOpen={isDriverModalOpen} 
        onClose={() => setIsDriverModalOpen(false)} 
        onSuccess={fetchFleetData} 
      />
      <LogShiftModal 
        isOpen={!!selectedVehicle}
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onSuccess={fetchFleetData}
      />
    </div>
  );
};

export default FleetDashboard;
