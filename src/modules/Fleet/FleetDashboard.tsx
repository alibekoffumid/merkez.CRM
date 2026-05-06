import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Users, 
  Clock, 
  Calendar, 
  Plus, 
  Search,
  Settings,
  MoreVertical,
  Edit,
  Trash2,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Loader2,
  Map as MapIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { Vehicle } from './types/fleet';
import { UserProfile } from '../../types/auth';
import { toast } from 'react-hot-toast';
import AddVehicleModal from './components/AddVehicleModal';
import LogShiftModal from './components/LogShiftModal';
import { useTranslation } from 'react-i18next';

interface UserContextType {
  profile: UserProfile | null;
}

const FleetDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useUser() as UserContextType;
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inRepair: 0,
    dailyRent: 0
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (profile) {
      fetchFleetData();
    }
  }, [profile]);

  const fetchFleetData = async () => {
    try {
      setLoading(true);
      const tenantId = profile?.tenant_id || profile?.id;
      
      const { data, error } = await supabase
        .from('fleet_vehicles')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setVehicles(data || []);

      // Simple stats calculation
      const active = data?.filter(v => v.status === 'active').length || 0;
      const repair = data?.filter(v => v.status === 'repair').length || 0;
      
      setStats({
        total: data?.length || 0,
        active,
        inRepair: repair,
        dailyRent: (data?.length || 0) * 25 // Placeholder logic
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-600';
      case 'repair': return 'bg-red-100 text-red-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t('fleet.statusActive');
      case 'repair': return t('fleet.statusRepair');
      default: return t('fleet.statusAvailable');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-[1.25rem] shadow-xl shadow-blue-600/20">
              <Car className="w-8 h-8 text-white" />
            </div>
            {t('fleet.dashboardTitle')}
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-3 ml-1 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {t('fleet.dashboardSubtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/fleet/map')}
            className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-3 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <MapIcon className="w-5 h-5 text-blue-500" />
            {t('fleet.map')}
          </button>
          <button 
            onClick={() => navigate('/fleet/drivers')}
            className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-3 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Users className="w-5 h-5" />
            {t('fleet.drivers')}
          </button>
          <button 
            onClick={() => {
              setSelectedVehicle(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {t('fleet.addVehicle')}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: t('fleet.totalVehicles'), value: stats.total, icon: Car, color: 'blue' },
          { label: t('fleet.onLine'), value: stats.active, icon: TrendingUp, color: 'green' },
          { label: t('fleet.activeShifts'), value: stats.active, icon: Clock, color: 'purple' },
          { label: t('fleet.totalRentToday'), value: `${stats.dailyRent} ₼`, icon: Calendar, color: 'orange' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-200 group-hover:text-gray-400 transition-colors" />
            </div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xl font-black text-gray-900">{t('fleet.fleetList')}</h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={t('header.search')}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fleet.plateNumber')}</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fleet.brandModel')}</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fleet.status')}</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fleet.mileage')}</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fleet.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 font-bold">{t('common.loading', 'Загрузка данных...')}</p>
                  </td>
                </tr>
              ) : vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-xs text-gray-500">
                        AZ
                      </div>
                      <span className="font-black text-gray-900 tracking-tight">{v.plate_number}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-gray-900">{v.brand_model}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{v.year} Year · {v.vin.substring(0, 8)}...</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${getStatusColor(v.status)}`}>
                      {getStatusLabel(v.status)}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-gray-300" />
                      <span className="font-black text-gray-700">{v.current_mileage.toLocaleString()} км</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setSelectedVehicle(v);
                          setIsShiftModalOpen(true);
                        }}
                        className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
                      >
                        {t('fleet.logShift')}
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedVehicle(v);
                          setIsAddModalOpen(true);
                        }}
                        className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddVehicleModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchFleetData}
        initialData={selectedVehicle}
      />

      {selectedVehicle && (
        <LogShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          vehicle={selectedVehicle}
          onSuccess={fetchFleetData}
        />
      )}
    </div>
  );
};

export default FleetDashboard;
