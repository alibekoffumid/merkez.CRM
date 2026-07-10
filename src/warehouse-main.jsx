import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { UserProvider, useUser } from './core/UserContext';
import WarehouseModule from './modules/Warehouse';
import LocalConnectionModal from './components/Warehouse/LocalConnectionModal';
import { supabase } from './supabaseClient';
import { Toaster, toast } from 'react-hot-toast';
import { Lock, Mail, Server, Database, LogOut, Package, RefreshCw, FolderTree, Truck, Search, Settings, ClipboardList, TrendingUp, BookOpen, Users, User, Percent } from 'lucide-react';
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
  const langRef = useRef(null);

  // Close language menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    };
    if (showLangMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showLangMenu]);

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
            <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10 bg-white/5 border border-white/10">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
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
  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header bar for standalone terminal */}
      <header className="bg-[#07071a] text-white px-6 py-4 flex items-center justify-between border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-white/5 border border-white/10">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight leading-tight">{t('warehouse.terminalTitle')}</h1>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-0.5">{t('warehouse.terminalSubtitle')}</p>
          </div>
        </div>

        {/* Navigation Tabs in Standalone Header */}
        <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('finished')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'finished'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            {t('warehouse.finishedGoods')}
          </button>
          {activeModules?.includes('restaurant') && (
            <button
              onClick={() => setActiveTab('raw')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'raw'
                  ? 'bg-green-600 text-white shadow-md shadow-green-600/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              {t('warehouse.ingredients')}
            </button>
          )}
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'suppliers'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            {t('warehouse.suppliers') || 'Поставщики'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            {t('warehouse.history') || 'История'}
          </button>
          <button
            onClick={() => setActiveTab('stocktake')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'stocktake'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            {t('warehouse.stocktake') || 'Инвентаризация'}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {t('warehouse.reports') || 'Отчеты'}
            {lowStockCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse border border-gray-900 shadow-sm">
                {lowStockCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'debts'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {t('crm.debtBook') || 'Книга долгов'}
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'clients'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {i18n.language === 'az' ? 'Müştərilər' : i18n.language === 'ru' ? 'Клиенты' : 'Clients'}
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'staff'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {i18n.language === 'az' ? 'Heyət' : i18n.language === 'ru' ? 'Персонал' : 'Staff'}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            {t('common.settings') || 'Настройки'}
          </button>
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
      <main className="flex-1 overflow-hidden p-6 flex flex-col">
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
