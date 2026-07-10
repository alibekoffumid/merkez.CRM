import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { UserProvider, useUser } from './core/UserContext';
import WarehouseModule from './modules/Warehouse';
import LocalConnectionModal from './components/Warehouse/LocalConnectionModal';
import { supabase } from './supabaseClient';
import { Toaster, toast } from 'react-hot-toast';
import { Lock, Mail, Server, Database, LogOut, Package, RefreshCw, FolderTree, Truck, Search, Settings, ClipboardList, TrendingUp, BookOpen, Users, User, Percent, ChevronDown, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './index.css';
import './i18n'; // Initialize translations
import { FlagAZ, FlagRU, FlagGB } from './components/Common/FlagIcons';

const WarehouseAppContent = () => {
  const { t, i18n } = useTranslation();
  const { profile, loading, activeModules } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [connectionWorking, setConnectionWorking] = useState(null);
  const [activeTab, setActiveTab] = useState('finished');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMobileTabs, setShowMobileTabs] = useState(false);
  const langRef = useRef(null);
  const mobileTabsRef = useRef(null);

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
      if (mobileTabsRef.current && !mobileTabsRef.current.contains(e.target)) {
        setShowMobileTabs(false);
      }
    };
    if (showLangMenu || showMobileTabs) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showLangMenu, showMobileTabs]);

  useEffect(() => {
    if (!profile) return;
    const fetchLowStockCount = async () => {
      try {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, stock_quantity, critical_stock');
        
        const { data: ingredientsData } = await supabase
          .from('ingredients')
          .select('id, quantity, min_quantity');

        const lowProducts = (productsData || []).filter(p => parseFloat(p.stock_quantity || 0) < parseFloat(p.critical_stock || 15)).length;
        const lowIngredients = (ingredientsData || []).filter(i => parseFloat(i.quantity || 0) < parseFloat(i.min_quantity || 10)).length;

        setLowStockCount(lowProducts + lowIngredients);
      } catch (err) {
        console.error('Error fetching low stock count:', err);
      }
    };
    fetchLowStockCount();
    
    const interval = setInterval(fetchLowStockCount, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  // Check if we can reach the database on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('categories').select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        setConnectionWorking(true);
      } catch (err) {
        console.error('Database connection test failed:', err);
        setConnectionWorking(false);
        setIsConfigOpen(true); // Open settings modal if connection fails
      }
    };
    checkConnection();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });
      if (error) throw error;
      toast.success('Sistemə uğurlu giriş!');
    } catch (err) {
      console.error('Login error:', err);
      toast.error(err.message || 'Giriş xətası');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Sistemdən çıxış etdiniz');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading || connectionWorking === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#07071a] text-white">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Anbar modulu yüklənir...</p>
      </div>
    );
  }

  // 1. Connection failed/unconfigured state
  if (!connectionWorking) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#07071a] text-white p-6 text-center">
        <Database className="w-16 h-16 text-red-500 mb-6 animate-pulse" />
        <h2 className="text-2xl font-black mb-2 tracking-tight">Lokal server tapılmadı</h2>
        <p className="text-gray-400 text-sm max-w-md mb-8 leading-relaxed">
          Məlumat bazasına qoşulmaq mümkün olmadı. Zəhmət olmasa lokal serverin qoşulma parametrlərini yoxlayın.
        </p>
        <button
          onClick={() => setIsConfigOpen(true)}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-blue-900 active:scale-95 flex items-center gap-2"
        >
          <Server className="w-4 h-4" /> Qoşulmanı tənzimlə
        </button>

        <LocalConnectionModal 
          isOpen={isConfigOpen} 
          onClose={() => setIsConfigOpen(false)} 
        />
      </div>
    );
  }

  // 2. Not Logged In State
  if (!profile) {
    return (
      <div className="flex min-h-screen bg-[#07071a] items-center justify-center p-6">
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 max-w-md w-full backdrop-blur-md relative overflow-hidden">
          {/* Language Switcher */}
          <div className="absolute top-6 left-6 flex bg-white/5 rounded-xl p-0.5 border border-white/5">
            {['en', 'ru', 'az'].map((lang) => (
              <button
                key={lang}
                onClick={() => i18n.changeLanguage(lang)}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase transition-all ${
                  i18n.language === lang
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Settings button in corner */}
          <button
            onClick={() => setIsConfigOpen(true)}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Qoşulma tənzimləmələri"
          >
            <Server className="w-5 h-5" />
          </button>


          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 overflow-hidden flex items-center justify-center mb-4">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{t('warehouse.terminalTitle')}</h2>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">{t('warehouse.autonomousTerminal')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('warehouse.userEmail')}</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-14 pr-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('warehouse.password')}</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-14 pr-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all font-bold text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-500/10 active:scale-95 disabled:opacity-50 flex items-center justify-center"
            >
              {authLoading ? t('warehouse.loggingIn') : t('warehouse.loginToTerminal')}
            </button>
          </form>
        </div>

        <LocalConnectionModal 
          isOpen={isConfigOpen} 
          onClose={() => setIsConfigOpen(false)} 
        />
      </div>
    );
  }

  // 3. Authenticated State: Main Warehouse Module View
  const navTabs = [
    { id: 'finished', icon: Package, label: t('warehouse.finishedGoods') || 'Готовые товары' },
    ...(activeModules?.includes('restaurant') ? [{ id: 'raw', icon: FolderTree, label: t('warehouse.ingredients') || 'Ингредиенты' }] : []),
    { id: 'suppliers', icon: Truck, label: t('warehouse.suppliers') || 'Поставщики' },
    { id: 'history', icon: Search, label: t('warehouse.history') || 'История' },
    { id: 'stocktake', icon: ClipboardList, label: t('warehouse.stocktake') || 'Инвентаризация' },
    { id: 'reports', icon: TrendingUp, label: t('warehouse.reports') || 'Отчеты', badge: lowStockCount > 0 ? lowStockCount : null },
    { id: 'debts', icon: BookOpen, label: t('crm.debtBook') || 'Книга долгов' },
    { id: 'clients', icon: User, label: i18n.language === 'az' ? 'Müştərilər' : i18n.language === 'ru' ? 'Клиенты' : 'Clients' },
    { id: 'staff', icon: Users, label: i18n.language === 'az' ? 'Heyət' : i18n.language === 'ru' ? 'Персонал' : 'Staff' },
    { id: 'settings', icon: Settings, label: t('common.settings') || 'Настройки' }
  ];

  const activeTabItem = navTabs.find(t => t.id === activeTab) || navTabs[0];

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header bar for standalone terminal */}
      <header className="bg-[#07071a] text-white px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 shrink-0 gap-3">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 overflow-hidden flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-tight">{t('warehouse.terminalTitle')}</h1>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-0.5">{t('warehouse.terminalSubtitle')}</p>
            </div>
          </div>

          {/* Mobile Header Controls */}
          <div className="flex items-center gap-1.5 md:hidden">
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 bg-white/5 border border-white/10 text-gray-300 rounded-lg px-2 h-8 text-[10px] font-bold transition-all"
              >
                {i18n.language.toUpperCase()}
                <span className="text-[7px]">▼</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-[#0c0c28] border border-white/10 rounded-lg shadow-2xl py-1 w-20 animate-in fade-in zoom-in-95">
                  {[
                    { value: 'az', label: 'AZ' },
                    { value: 'ru', label: 'RU' },
                    { value: 'en', label: 'EN' }
                  ].map(item => (
                    <button
                      key={item.value}
                      onClick={() => {
                        i18n.changeLanguage(item.value);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-center py-1.5 text-[10px] font-bold hover:bg-white/5 transition-colors block ${i18n.language === item.value ? 'text-blue-400' : 'text-gray-400'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsConfigOpen(true)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 border border-white/10 rounded-lg transition-all relative"
              title="Qoşulma tənzimləmələri"
            >
              <Server className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 rounded-lg transition-all"
              title="Sistemdən çıx"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <div className="hidden md:flex bg-white/5 rounded-xl p-0.5 border border-white/10 shrink-0 overflow-x-auto lg:overflow-visible no-scrollbar flex-nowrap max-w-full lg:max-w-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile Tabs Dropdown */}
        <div className="md:hidden relative w-full lg:w-auto" ref={mobileTabsRef}>
          <button
            onClick={() => setShowMobileTabs(!showMobileTabs)}
            className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all"
          >
            <div className="flex items-center gap-2">
              {activeTabItem && <activeTabItem.icon className="w-4 h-4 text-blue-400" />}
              <span>{activeTabItem?.label}</span>
              {activeTabItem?.badge && (
                <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                  {activeTabItem.badge}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${showMobileTabs ? 'rotate-180' : ''}`} />
          </button>

          {showMobileTabs && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0c0c28] border border-white/10 rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 max-h-[60vh] overflow-y-auto no-scrollbar">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowMobileTabs(false);
                    }}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </div>
                    {tab.badge && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Language Dropdown Selector */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-lg px-3 h-9 text-xs font-bold transition-all"
            >
              <div className="flex items-center gap-1.5">
                {i18n.language === 'az' ? <FlagAZ /> : i18n.language === 'ru' ? <FlagRU /> : <FlagGB />}
                <span>{i18n.language.toUpperCase()}</span>
              </div>
              <span className="text-[9px] opacity-75">▼</span>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-50 bg-[#0c0c28] border border-white/10 rounded-lg shadow-2xl py-1.5 w-full animate-in fade-in zoom-in-95">
                {[
                  { value: 'az', Flag: FlagAZ, label: 'AZ' },
                  { value: 'ru', Flag: FlagRU, label: 'RU' },
                  { value: 'en', Flag: FlagGB, label: 'EN' }
                ].map(item => (
                  <button
                    key={item.value}
                    onClick={() => {
                      i18n.changeLanguage(item.value);
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-white/5 transition-colors flex items-center gap-2 ${i18n.language === item.value ? 'text-blue-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
                  >
                    <item.Flag />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsConfigOpen(true)}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 border border-white/10 rounded-lg transition-all relative"
            title="Qoşulma tənzimləmələri (Server: Online)"
          >
            <Server className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          </button>

          <button
            onClick={handleLogout}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 rounded-lg transition-all"
            title="Sistemdən çıx"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content container */}
      <main className="flex-1 overflow-hidden p-3 md:p-6 flex flex-col">
        <WarehouseModule activeTab={activeTab} setActiveTab={setActiveTab} />
      </main>

      <LocalConnectionModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <WarehouseAppContent />
      <Toaster position="top-right" />
    </UserProvider>
  </React.StrictMode>
);
