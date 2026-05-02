import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, DollarSign, Activity, CheckCircle, Clock, Plus, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';

const Dashboard = () => {
  const { t } = useTranslation();
  const { activeModules } = useUser();
  const [stats, setStats] = useState({ customers: 0, products: 0, recentOrders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
      const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      
      // Fetch recent orders if restaurant module is likely active or just for general sales
      const { data: recentOrders } = await supabase
        .from('orders')
        .select(`
          id, 
          total_amount, 
          created_at,
          customers (name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      setStats({ 
        customers: customerCount || 0, 
        products: productCount || 0,
        recentOrders: recentOrders || []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 mb-8 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">{t('dashboard.welcome')}</h1>
          <p className="text-gray-500 mt-1 font-medium italic">{t('dashboard.overview')}</p>
        </div>
        <Link 
          to="/modules"
          className="flex items-center gap-2 px-6 py-3.5 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.1em] hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-900/20"
        >
          <LayoutGrid className="w-4 h-4" />
          {t('modules.manageModules') || 'Управление модулями'}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* Widget 1: Statistics */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-xl transition-all group relative overflow-hidden">
          <div className="flex items-center mb-8 relative z-10">
            <div className="p-4 rounded-2xl bg-blue-50 mr-4 group-hover:bg-merkez-blue group-hover:text-white transition-all duration-500">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('dashboard.statistics')}</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center relative z-10">
            <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{t('dashboard.crmClients')}</p>
                  <h4 className="text-5xl font-black text-gray-900 leading-none">{stats.customers}</h4>
                </div>
               <span className="text-xs font-black text-emerald-600 flex items-center bg-emerald-50 px-3 py-1.5 rounded-xl">
                 +12.5% <TrendingUp className="w-3.5 h-3.5 ml-1" />
               </span>
            </div>
            <div className="w-full bg-gray-50 rounded-full h-3 mb-3 p-0.5">
              <div className="bg-gradient-to-r from-merkez-blue to-blue-400 h-full rounded-full shadow-lg shadow-blue-500/20 transition-all duration-1000" style={{ width: '65%' }}></div>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('dashboard.menuItemsCount', { count: stats.products })}</p>
          </div>
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl transition-all group-hover:bg-blue-100/50"></div>
        </div>

        {/* Widget 2: Tasks */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-xl transition-all group relative overflow-hidden">
          <div className="flex items-center mb-8 relative z-10">
            <div className="p-4 rounded-2xl bg-yellow-50 mr-4 group-hover:bg-merkez-yellow group-hover:text-white transition-all duration-500">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('dashboard.tasksToday')}</h3>
          </div>
          <div className="flex-1 space-y-6 relative z-10">
            <div className="flex items-start gap-5 p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer group/item">
               <div className="mt-1 w-6 h-6 rounded-lg border-2 border-gray-200 flex items-center justify-center shrink-0 group-hover/item:border-merkez-yellow transition-all"></div>
               <div>
                 <p className="text-sm font-black text-gray-900 leading-tight">{t('dashboard.taskReport')}</p>
                 <span className="text-[10px] text-merkez-yellow font-black flex items-center mt-2 uppercase tracking-widest">
                   <Clock className="w-3 h-3 mr-1" /> 14:00
                 </span>
               </div>
            </div>
            <div className="flex items-start gap-5 p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer group/item">
               <div className="mt-1 w-6 h-6 rounded-lg border-2 border-gray-200 flex items-center justify-center shrink-0 group-hover/item:border-merkez-yellow transition-all"></div>
               <div>
                 <p className="text-sm font-black text-gray-900 leading-tight">{t('dashboard.taskMeeting')}</p>
                 <span className="text-[10px] text-gray-400 font-black flex items-center mt-2 uppercase tracking-widest">
                   <Clock className="w-3 h-3 mr-1" /> 16:30
                 </span>
               </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-yellow-50/50 rounded-full blur-3xl transition-all group-hover:bg-yellow-100/50"></div>
        </div>

        {/* Widget 3: Recent Sales */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-xl transition-all group relative overflow-hidden">
          <div className="flex items-center mb-8 relative z-10">
            <div className="p-4 rounded-2xl bg-emerald-50 mr-4 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('dashboard.recentSales')}</h3>
          </div>
          <div className="flex-1 space-y-6 relative z-10">
            {stats.recentOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <DollarSign className="w-12 h-12 opacity-10 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('dashboard.noSales') || 'Нет продаж'}</p>
              </div>
            ) : (
              stats.recentOrders.map((order, idx) => (
                <div key={order.id} className={`flex justify-between items-center ${idx < stats.recentOrders.length - 1 ? 'border-b border-gray-50 pb-6' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-sm font-black text-gray-400 border border-gray-100 group-hover:bg-white transition-colors">
                      {(order.customers?.name || '??').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{order.customers?.name || 'Anonymous'}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-emerald-600">
                    +{order.total_amount} <span className="text-[10px]">AZN</span>
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-50/50 rounded-full blur-3xl transition-all group-hover:bg-emerald-100/50"></div>
        </div>

        {/* Module Upsell Card */}
        {activeModules.length < 5 && (
          <Link 
            to="/modules"
            className="relative overflow-hidden bg-gray-900 p-10 rounded-[3rem] shadow-2xl shadow-gray-900/30 flex flex-col justify-between h-full group hover:-translate-y-2 transition-all duration-500"
          >
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-8 border border-white/10">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white leading-tight mb-4 tracking-tight">
                {t('dashboard.expandBusiness') || 'Расширьте свой бизнес'}
              </h3>
              <p className="text-gray-400 font-bold text-sm leading-relaxed">
                {t('dashboard.expandDesc') || 'Подключайте новые модули за считанные секунды и управляйте всем в одном месте.'}
              </p>
            </div>
            
            <div className="relative z-10 flex items-center gap-3 text-white font-black uppercase tracking-[0.2em] text-[10px] mt-10 group-hover:gap-5 transition-all">
              {t('modules.activate') || 'Активировать'} <LayoutGrid className="w-4 h-4" />
            </div>

            {/* Decorative background effects */}
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-merkez-blue/20 rounded-full blur-[80px] group-hover:bg-merkez-blue/40 transition-all duration-1000"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
