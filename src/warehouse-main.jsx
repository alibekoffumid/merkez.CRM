import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { UserProvider, useUser } from './core/UserContext';
import WarehouseModule from './modules/Warehouse';
import LocalConnectionModal from './components/Warehouse/LocalConnectionModal';
import { supabase } from './supabaseClient';
import { Toaster, toast } from 'react-hot-toast';
import { Lock, Mail, Server, Database, LogOut, Package, RefreshCw, FolderTree, Truck, Search, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './index.css';
import './i18n'; // Initialize translations

const WarehouseAppContent = () => {
  const { t, i18n } = useTranslation();
  const { profile, loading, activeModules } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [connectionWorking, setConnectionWorking] = useState(null);
  const [activeTab, setActiveTab] = useState('finished');

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
            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-[1.5rem] flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
              <Package className="w-8 h-8" />
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
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
            <Package className="w-5 h-5" />
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

        <div className="flex items-center gap-4">
          {/* Language Switcher */}
          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/10">
            {['en', 'ru', 'az'].map((lang) => (
              <button
                key={lang}
                onClick={() => i18n.changeLanguage(lang)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase transition-all ${
                  i18n.language === lang
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full py-1.5 px-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Server: Lokal</span>
          </div>

          <button
            onClick={() => setIsConfigOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Qoşulma tənzimləmələri"
          >
            <Server className="w-4 h-4" />
          </button>

          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
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
