import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ArrowLeft, 
  Plus, 
  Phone, 
  CreditCard, 
  Search,
  MoreVertical,
  UserCheck,
  UserMinus,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { Driver } from './types/fleet';
import { UserProfile } from '../../types/auth';
import { toast } from 'react-hot-toast';
import AddDriverModal from './components/AddDriverModal';

interface UserContextType {
  profile: UserProfile | null;
}

const DriversList: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useUser() as UserContextType;
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile) {
      fetchDrivers();
    }
  }, [profile]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const tenantId = profile?.tenant_id || profile?.id;
      
      const { data, error } = await supabase
        .from('fleet_drivers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      toast.error('Ошибка загрузки водителей: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.whatsapp_number.includes(searchQuery)
  );

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/fleet')}
            className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all active:scale-90 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Водители</h1>
            <p className="text-gray-500 font-medium">Управление персоналом и балансами</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-merkez-blue text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Новый водитель
        </button>
      </div>

      {/* Search and Filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Поиск по имени или телефону..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-50 transition-all outline-none"
        />
      </div>

      {/* Drivers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-50 animate-pulse rounded-[2.5rem]" />)}
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Список пуст</h3>
          <p className="text-gray-500 mb-8">Вы еще не добавили ни одного водителя в систему.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black"
          >
            Добавить первого водителя
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map(driver => (
            <div key={driver.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Users className="w-7 h-7 text-gray-400 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 text-lg leading-tight">{driver.full_name}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                       <span className={`w-2 h-2 rounded-full ${driver.status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{driver.status}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setEditingDriver(driver);
                    setIsModalOpen(true);
                  }}
                  className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-300" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500">Баланс</span>
                  </div>
                  <span className={`text-sm font-black ${driver.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {driver.balance.toFixed(2)} ₼
                  </span>
                </div>
                <div className="flex items-center gap-3 px-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-700">{driver.whatsapp_number}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <a 
                  href={`https://wa.me/${driver.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-100 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  WHATSAPP
                </a>
                <button className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-xs font-black hover:bg-black transition-all">
                  ДЕТАЛИ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddDriverModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDriver(null);
        }}
        onSuccess={fetchDrivers}
        initialData={editingDriver}
      />
    </div>
  );
};

export default DriversList;
