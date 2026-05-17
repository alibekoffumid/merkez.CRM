import React, { useState } from 'react';
import { Calendar, Laptop, Settings } from 'lucide-react';
import { CafeDashboard } from './pages/CafeDashboard';
import { useTranslation } from 'react-i18next';

const CyberCafeModule = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: t('cyberCafe.dashboard') || 'Шахматка клубов', icon: Laptop },
    { id: 'settings', label: t('cyberCafe.settings') || 'Настройки', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent p-0 rounded-0 border-0 space-y-4">
      {/* Unified Tab Bar — same style as Hotels, Education, etc. */}
      <div className="sticky top-0 z-40 flex justify-start lg:justify-center w-full pointer-events-none pb-4 bg-gray-50/80 backdrop-blur-md pt-2 px-4 sm:px-0">
        <div className="pointer-events-auto flex p-1.5 bg-white/90 backdrop-blur-xl rounded-[2rem] border border-gray-100 shadow-2xl shadow-purple-900/5 overflow-x-auto no-scrollbar max-w-full mx-auto w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-[1.5rem] text-[11px] sm:text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 scale-105' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
              `}
            >
              <tab.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 mt-2 px-4 flex flex-col min-h-0">
        {activeTab === 'dashboard' && <CafeDashboard />}
        
        {activeTab === 'settings' && (
          <div className="bg-white rounded-[2.5rem] p-16 text-center border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Settings className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-xl font-black text-gray-900 mb-2">{t('cyberCafe.settings') || 'Настройки'}</p>
            <p className="text-sm text-gray-500 font-medium">{t('cyberCafe.settingsDesc') || 'Настройки тарифов и игровых зон клуба скоро появятся...'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CyberCafeModule;
