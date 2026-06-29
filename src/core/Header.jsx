import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Bell, User, Menu, X, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUser } from './UserContext';
import { ShoppingCart, AlertTriangle, TrendingUp } from 'lucide-react';

const Header = ({ onMenuClick }) => {
  const { t, i18n } = useTranslation();
  const { profile, loading } = useUser();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [digestData, setDigestData] = useState({ totalSales: 0, lowStockItems: [], loaded: false });

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const fetchDigestData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: criticalItems } = await supabase
        .from('products')
        .select('id, name, stock_quantity, critical_stock')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .lte('stock_quantity', 5);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const { data: salesToday } = await supabase
        .from('retail_sales')
        .select('total_amount')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString());

      let totalSales = 0;
      if (salesToday) {
        totalSales = salesToday.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
      }

      const lowStockItems = (criticalItems || []).filter(item => item.stock_quantity <= (item.critical_stock || 5));

      setDigestData({ totalSales, lowStockItems, loaded: true });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleNotifications = () => {
    if (!isNotificationsOpen && !digestData.loaded) {
      fetchDigestData();
    }
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isNotificationsOpen && !e.target.closest('#notification-container')) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationsOpen]);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30 w-full lg:pl-28 transition-all duration-300">
      <div className="flex items-center space-x-2 sm:space-x-6">
        {/* Mobile Menu Toggle */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center pr-2 sm:pr-6 mr-0 sm:mr-2 border-r border-gray-100 h-10">
           <div className="text-xl sm:text-2xl font-black tracking-tighter"><span className="text-blue-600">digitall</span><span className="text-slate-900">.llc</span></div>
           {profile?.business_name && (
             <div className="ml-4 hidden xl:flex flex-col">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Workspace</span>
               <span className="text-sm font-bold text-gray-900 leading-none">{profile.business_name}</span>
             </div>
           )}
        </div>
        
        <div className="hidden md:flex items-center bg-gray-50 rounded-lg px-3 py-2 w-64 lg:w-80 border border-gray-100 focus-within:border-merkez-blue transition-colors">
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder={t('header.search')} 
            className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-6">
        {/* Language Switcher */}
        <div className="hidden sm:flex bg-gray-50 rounded-lg p-1 border border-gray-100">
          {['en', 'ru', 'az'].map((lang) => (
            <button
              key={lang}
              onClick={() => changeLanguage(lang)}
              className={`px-2 small:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-md uppercase transition-colors ${
                i18n.language === lang
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-1 sm:space-x-4">
          <div id="notification-container" className="relative">
            <button 
              onClick={toggleNotifications}
              className={`relative p-2 transition-colors rounded-full ${isNotificationsOpen ? 'bg-blue-50 text-merkez-blue' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform opacity-100 scale-100 origin-top-right transition-all">
                <div className="p-4 bg-gradient-to-r from-merkez-blue to-blue-600 text-white flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-100" />
                    <h3 className="font-black text-sm tracking-tight">{t('header.digestTitle')}</h3>
                  </div>
                </div>
                
                <div className="p-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto no-scrollbar">
                  {!digestData.loaded ? (
                    <div className="flex justify-center p-4">
                      <div className="w-6 h-6 border-2 border-merkez-blue border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <>
                      {/* Sales Summary */}
                      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                          <ShoppingCart className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{t('header.todaySales')}</p>
                          <p className="text-lg font-black text-gray-900 leading-none">${digestData.totalSales.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Critical Inventory */}
                      {digestData.lowStockItems.length > 0 ? (
                        <div className="flex items-start gap-3 bg-red-50 p-3 rounded-xl border border-red-100">
                          <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-red-600 shrink-0 mt-1">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5">{t('header.criticalStock')}</p>
                            <ul className="text-xs font-bold text-gray-800 space-y-1">
                              {digestData.lowStockItems.slice(0, 5).map(item => (
                                <li key={item.id} className="flex justify-between items-center bg-white/50 p-1.5 rounded-lg">
                                  <span className="truncate max-w-[120px]">{item.name}</span>
                                  <span className="text-red-600 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">{t('header.itemsLeft', { count: item.stock_quantity })}</span>
                                </li>
                              ))}
                              {digestData.lowStockItems.length > 5 && (
                                <li className="text-[10px] text-red-500 mt-1">{t('header.moreItems', { count: digestData.lowStockItems.length - 5 })}</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
                          <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">{t('header.inventoryStatus')}</p>
                            <p className="text-xs font-bold text-gray-800">{t('header.allStockOk')}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <Link to="/profile" className="flex items-center space-x-2 cursor-pointer p-1 rounded-full border border-gray-100 hover:bg-gray-50 transition-colors no-underline">
            <div className="w-8 h-8 rounded-full bg-merkez-blue flex items-center justify-center text-white font-medium text-sm shadow-sm">
              {loading ? '...' : getInitials(profile?.full_name)}
            </div>
            <span className="hidden sm:block text-sm font-bold text-gray-700 mr-2">
              {loading ? t('common.loading') : (profile?.full_name || t('header.profile'))}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;

