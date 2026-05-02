import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, DollarSign, Activity, CheckCircle, Clock, Plus, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';

const Dashboard = () => {
  const { t } = useTranslation();
  const { activeModules } = useUser();
  const [stats, setStats] = useState({ customers: 0, products: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
      const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      setStats({ 
        customers: customerCount || 0, 
        products: productCount || 0 
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 mb-8 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{t('dashboard.welcome')}</h1>
          <p className="text-gray-500 mt-1 font-medium">{t('dashboard.overview')}</p>
        </div>
        <Link 
          to="/modules"
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-900/20"
        >
          <LayoutGrid className="w-4 h-4" />
          {t('modules.manageModules') || 'Управление модулями'}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Widget 1: Statistics - Show if CRM or General active */}
        {(activeModules.includes('crm') || activeModules.length > 0) && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow group">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-2xl bg-blue-50 mr-4 group-hover:bg-blue-100 transition-colors">
                <Activity className="w-6 h-6 text-merkez-blue" />
              </div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">{t('dashboard.statistics')}</h3>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('dashboard.crmClients')}</p>
                    <h4 className="text-4xl font-black text-gray-900">{stats.customers}</h4>
                  </div>
                 <span className="text-sm font-black text-merkez-blue flex items-center bg-blue-50 px-2.5 py-1 rounded-lg">
                   +12.5% <TrendingUp className="w-4 h-4 ml-1" />
                 </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div className="bg-merkez-blue h-2 rounded-full shadow-sm" style={{ width: '75%' }}></div>
              </div>
              <p className="text-xs text-gray-400 font-medium">{t('dashboard.menuItemsCount', { count: stats.products })}</p>
            </div>
          </div>
        )}

        {/* Widget 2: Tasks - Always show */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow group">
          <div className="flex items-center mb-6">
            <div className="p-3 rounded-2xl bg-yellow-50 mr-4 group-hover:bg-yellow-100 transition-colors">
              <CheckCircle className="w-6 h-6 text-merkez-yellow" />
            </div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">{t('dashboard.tasksToday')}</h3>
          </div>
          <div className="flex-1 space-y-5">
            <div className="flex items-start gap-4">
               <div className="mt-0.5 w-6 h-6 rounded-lg border-2 border-gray-200 flex items-center justify-center shrink-0 cursor-pointer hover:border-merkez-yellow transition-colors"></div>
               <div>
                 <p className="text-sm font-bold text-gray-900">{t('dashboard.taskReport')}</p>
                 <span className="text-xs text-merkez-yellow font-black flex items-center mt-1 uppercase tracking-wider">
                   <Clock className="w-3.5 h-3.5 mr-1" /> 14:00
                 </span>
               </div>
            </div>
            <div className="flex items-start gap-4">
               <div className="mt-0.5 w-6 h-6 rounded-lg border-2 border-gray-200 flex items-center justify-center shrink-0 cursor-pointer hover:border-merkez-yellow transition-colors"></div>
               <div>
                 <p className="text-sm font-bold text-gray-900">{t('dashboard.taskMeeting')}</p>
                 <span className="text-xs text-gray-400 font-black flex items-center mt-1 uppercase tracking-wider">
                   16:30
                 </span>
               </div>
            </div>
          </div>
        </div>

        {/* Widget 3: Recent Sales - Show if CRM or Finance active */}
        {(activeModules.includes('finance') || activeModules.includes('crm')) && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow group">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-2xl bg-green-50 mr-4 group-hover:bg-green-100 transition-colors">
                <DollarSign className="w-6 h-6 text-merkez-green" />
              </div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">{t('dashboard.recentSales')}</h3>
            </div>
            <div className="flex-1 space-y-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-sm font-black text-gray-600 border border-gray-100">
                    MC
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Mega Corp LLC</p>
                    <p className="text-xs text-gray-500 font-medium">{t('dashboard.minutesAgo', { count: 10 })}</p>
                  </div>
                </div>
                <span className="text-base font-black text-merkez-green">+$4,500</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-sm font-black text-gray-600 border border-gray-100">
                    IT
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Ivan Ivanov</p>
                    <p className="text-xs text-gray-500 font-medium">{t('dashboard.hoursAgo', { count: 1 })}</p>
                  </div>
                </div>
                <span className="text-base font-black text-merkez-green">+$120</span>
              </div>
            </div>
          </div>
        )}

        {/* Module Upsell Card - Show if not all modules active */}
        {activeModules.length < 5 && (
          <Link 
            to="/modules"
            className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2rem] shadow-xl shadow-blue-600/20 flex flex-col justify-between h-full group hover:scale-[1.02] transition-all"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-black text-white leading-tight mb-2">
                Добавьте больше модулей
              </h3>
              <p className="text-blue-100 font-medium opacity-90">
                Расширьте возможности вашего бизнеса за 1 клик.
              </p>
            </div>
            
            <div className="relative z-10 flex items-center gap-2 text-white font-black uppercase tracking-widest text-xs mt-8">
              {t('modules.activate') || 'Активировать'} <Plus className="w-4 h-4" />
            </div>

            {/* Decorative circles */}
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors"></div>
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl group-hover:bg-blue-400/30 transition-colors"></div>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
