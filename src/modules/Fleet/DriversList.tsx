import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  ArrowLeft,
  Phone,
  CreditCard,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import AddDriverModal from './components/AddDriverModal';
import { useTranslation } from 'react-i18next';

interface Driver {
  id: string;
  full_name: string;
  license_number: string;
  whatsapp_number: string;
  balance: number;
  status: string;
}

const DriversList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useUser() as any;
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  useEffect(() => {
    if (profile) fetchDrivers();
  }, [profile]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const tenantId = profile?.tenant_id || profile?.id;
      const { data, error } = await supabase
        .from('fleet_drivers')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="flex items-center gap-6">
           <button 
             onClick={() => navigate('/fleet')}
             className="p-4 bg-white rounded-3xl shadow-xl border border-gray-100 hover:bg-gray-50 transition-all active:scale-90"
           >
             <ArrowLeft className="w-6 h-6 text-gray-900" />
           </button>
           <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-600" />
                {t('fleet.driversList')}
              </h1>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">{t('fleet.driversSubtitle')}</p>
           </div>
        </div>
        <button 
          onClick={() => {
            setSelectedDriver(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          {t('fleet.addDriver')}
        </button>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
           <div className="relative w-full sm:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder={t('header.search')}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-[1.25rem] text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fleet.fullName')}</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fleet.licenseNumber')}</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fleet.whatsapp')}</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fleet.balance')}</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fleet.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-gray-400 font-bold">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-blue-600" />
                    {t('common.loading')}
                  </td>
                </tr>
              ) : drivers.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 font-black text-sm">
                         {d.full_name.charAt(0)}
                       </div>
                       <span className="font-black text-gray-900">{d.full_name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-500 font-bold">
                      <Shield className="w-4 h-4" />
                      {d.license_number}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-gray-500 font-bold">
                    <div className="flex items-center gap-2">
                       <Phone className="w-4 h-4 text-green-500" />
                       {d.whatsapp_number}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className={`px-4 py-2 rounded-xl inline-flex items-center gap-2 font-black ${d.balance < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                       <CreditCard className="w-4 h-4" />
                       {d.balance} ₼
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                       <button 
                         onClick={() => {
                           setSelectedDriver(d);
                           setIsModalOpen(true);
                         }}
                         className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                       >
                         <Edit className="w-4 h-4" />
                       </button>
                       <button className="p-3 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all">
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

      <AddDriverModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDrivers}
        initialData={selectedDriver}
      />
    </div>
  );
};

export default DriversList;
