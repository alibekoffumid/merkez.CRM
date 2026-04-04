import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, DollarSign, Activity, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const Dashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ customers: 0, products: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
    const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
    setStats({ 
      customers: customerCount || 0, 
      products: productCount || 0 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-6 mb-8 border-b border-gray-100 pb-8">
        <img src="/merkez-logo.gif" alt="Logo" className="w-24 h-24 object-contain" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.welcome')}</h1>
          <p className="text-gray-500 mt-1">{t('dashboard.overview')}</p>
        </div>
      </div>

      {/* CSS Grid for Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Widget 1: Statistics (Blue) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-xl bg-blue-50 mr-4">
              <Activity className="w-6 h-6 text-merkez-blue" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Статистика</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-sm text-gray-500">Клиенты в CRM</p>
                  <h4 className="text-3xl font-bold text-gray-900">{stats.customers}</h4>
                </div>
               <span className="text-sm font-medium text-merkez-blue flex items-center bg-blue-50 px-2.5 py-1 rounded-lg">
                 +12.5% <TrendingUp className="w-4 h-4 ml-1" />
               </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div className="bg-merkez-blue h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <p className="text-xs text-gray-400">{stats.products} позиций в меню</p>
          </div>
        </div>

        {/* Widget 2: Tasks for today (Yellow) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-xl bg-yellow-50 mr-4">
              <CheckCircle className="w-6 h-6 text-merkez-yellow" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Задачи на сегодня</h3>
          </div>
          <div className="flex-1 space-y-4 overflow-auto">
            <div className="flex items-start gap-3">
               <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center shrink-0 cursor-pointer hover:border-merkez-yellow"></div>
               <div>
                 <p className="text-sm font-medium text-gray-900">Подготовить отчет для Налоговой</p>
                 <span className="text-xs text-merkez-yellow font-medium flex items-center mt-1">
                   <Clock className="w-3 h-3 mr-1" /> 14:00
                 </span>
               </div>
            </div>
            <div className="flex items-start gap-3">
               <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center shrink-0 cursor-pointer hover:border-merkez-yellow"></div>
               <div>
                 <p className="text-sm font-medium text-gray-900">Встреча с ключевым клиентом</p>
                 <span className="text-xs text-gray-400 font-medium flex items-center mt-1">
                   16:30
                 </span>
               </div>
            </div>
          </div>
        </div>

        {/* Widget 3: Recent sales (Green) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-green-50 mr-4">
                <DollarSign className="w-6 h-6 text-merkez-green" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Последние продажи</h3>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-50 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                  MC
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">ООО "Мега Корп"</p>
                  <p className="text-xs text-gray-500">10 минут назад</p>
                </div>
              </div>
              <span className="text-sm font-bold text-merkez-green">+$4,500</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                  IT
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Иван Иванов</p>
                  <p className="text-xs text-gray-500">1 час назад</p>
                </div>
              </div>
              <span className="text-sm font-bold text-merkez-green">+$120</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
