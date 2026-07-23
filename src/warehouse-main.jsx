import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { UserProvider, useUser } from './core/UserContext';
import WarehouseModule from './modules/Warehouse';
import PinGuard from './components/PinGuard';
import LocalConnectionModal from './components/Warehouse/LocalConnectionModal';
import { supabase } from './supabaseClient';
import { Toaster, toast } from 'react-hot-toast';
import { Lock, Mail, Server, Database, LogOut, Package, RefreshCw, FolderTree, Truck, Search, Settings, ClipboardList, TrendingUp, BookOpen, Users, User, Percent, ChevronDown, Menu, Hammer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './index.css';
import './i18n'; // Initialize translations
import { FlagAZ, FlagRU, FlagGB } from './components/Common/FlagIcons';

const WarehouseAppContent = () => {
  const { t, i18n } = useTranslation();
  const { profile, loading, activeModules, currentStaff } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [connectionWorking, setConnectionWorking] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    // Check localStorage first if needed, otherwise default to repairs for Master
    return 'finished';
  });
  
  // Set activeTab to repairs if the user is a Master
  useEffect(() => {
    if (currentStaff?.role === 'Master') {
      setActiveTab('repairs');
    }
  }, [currentStaff?.role]);
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
          .select('id, stock_quantity, critical_stock')
          .eq('user_id', profile.id)
          .eq('is_deleted', false);
        
        const { data: ingredientsData } = await supabase
          .from('ingredients')
          .select('id, quantity, min_quantity')
          .eq('user_id', profile.id);

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

  const handleGoogleLogin = async () => {
    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/warehouse.html`
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Google login error:', err);
      toast.error(err.message || 'Google giriş xətası');
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
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all shadow-xl shadow-blue-900 active:scale-95 flex items-center gap-2"
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
          <div className="absolute top-6 left-6 flex bg-white/5 rounded-lg p-0.5 border border-white/5">
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
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
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
                  className="block w-full pl-14 pr-5 py-4 bg-white/5 border border-white/5 rounded-lg text-white outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all font-bold text-sm"
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
                  className="block w-full pl-14 pr-5 py-4 bg-white/5 border border-white/5 rounded-lg text-white outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all font-bold text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-500/10 active:scale-95 disabled:opacity-50 flex items-center justify-center"
            >
              {authLoading ? t('warehouse.loggingIn') : t('warehouse.loginToTerminal')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#07071a] px-2 text-gray-500 font-bold tracking-widest uppercase">
                  {t('auth.or') || 'VƏ YA'}
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="mt-6 w-full flex items-center justify-center space-x-3 py-4 bg-white/5 border border-white/10 rounded-lg text-white font-bold hover:bg-white/10 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{t('auth.continueGoogle') || 'Google ilə daxil ol'}</span>
            </button>
          </div>
        </div>

        <LocalConnectionModal 
          isOpen={isConfigOpen} 
          onClose={() => setIsConfigOpen(false)} 
        />
      </div>
    );
  }

  // 3. Authenticated State: Main Warehouse Module View
  const isMaster = currentStaff?.role === 'Master';

  const navTabs = [
    ...(!isMaster ? [{ id: 'finished', icon: Package, label: t('warehouse.finishedGoods') || 'Готовые товары' }] : []),
    ...(false && activeModules?.includes('restaurant') && !isMaster ? [{ id: 'raw', icon: FolderTree, label: t('warehouse.ingredients') || 'Ингредиенты' }] : []),
    ...(currentStaff?.role !== 'Cashier' && !isMaster ? [{ id: 'suppliers', icon: Truck, label: t('warehouse.suppliers') || 'Поставщики' }] : []),
    ...(currentStaff?.role !== 'Storeman' ? [{ id: 'repairs', icon: Hammer, label: i18n.language === 'az' ? 'Təmir' : i18n.language === 'ru' ? 'Ремонт' : 'Repairs' }] : []),
    ...(!isMaster ? [{ id: 'history', icon: Search, label: t('warehouse.history') || 'История' }] : []),
    ...(!isMaster ? [{ id: 'stocktake', icon: ClipboardList, label: t('warehouse.stocktake') || 'Инвентаризация' }] : []),
    ...(!currentStaff && !isMaster ? [{ id: 'reports', icon: TrendingUp, label: t('warehouse.reports') || 'Отчеты', badge: lowStockCount > 0 ? lowStockCount : null }] : []),
    ...((!currentStaff || currentStaff?.role === 'Manager') && !isMaster ? [
      { id: 'debts', icon: BookOpen, label: t('crm.debtBook') || 'Книга долгов' },
      { id: 'clients', icon: User, label: i18n.language === 'az' ? 'Müştərilər' : i18n.language === 'ru' ? 'Клиенты' : 'Clients' },
      { id: 'staff', icon: Users, label: i18n.language === 'az' ? 'Heyət' : i18n.language === 'ru' ? 'Персонал' : 'Staff' },
      { id: 'settings', icon: Settings, label: t('common.settings') || 'Настройки' }
    ] : [])
  ];

  const activeTabItem = navTabs.find(t => t.id === activeTab) || navTabs[0];

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header bar for standalone terminal */}
      <header className="bg-[#07071a] text-white px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 shrink-0 gap-3">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-6">
            <div className="w-10 h-10 overflow-hidden flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>

            {/* Navigation Tabs (Desktop) */}
            <div className="hidden md:flex bg-white/5 rounded-lg p-0.5 border border-white/10 shrink-0 overflow-x-auto lg:overflow-visible no-scrollbar flex-nowrap max-w-full lg:max-w-none">
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

        {/* Mobile Tabs Dropdown */}
        <div className="md:hidden relative w-full lg:w-auto" ref={mobileTabsRef}>
          <button
            onClick={() => setShowMobileTabs(!showMobileTabs)}
            className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all"
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
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0c0c28] border border-white/10 rounded-lg shadow-2xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 max-h-[60vh] overflow-y-auto no-scrollbar">
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

        <div className="hidden md:flex items-center gap-2">
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
        <PinGuard moduleId="warehouse">
          <WarehouseModule activeTab={activeTab} setActiveTab={setActiveTab} />
        </PinGuard>
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
    <HashRouter>
      <UserProvider>
        <WarehouseAppContent />
        <Toaster position="top-right" />
      </UserProvider>
    </HashRouter>
  </React.StrictMode>
);
