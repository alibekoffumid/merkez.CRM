import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout, ChefHat, UtensilsCrossed, Users, Settings, Package, BarChart3 } from 'lucide-react';
import FloorPlan from './components/FloorPlan';
import MenuManager from './components/MenuManager';
import StaffManager from './components/StaffManager';
import TableSettings from './components/TableSettings';
import Analytics from './components/Analytics';
import KitchenDisplay from './components/KitchenDisplay';
import InventoryManager from './components/InventoryManager';

const RestaurantModule = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('floor');

  const tabs = [
    { id: 'floor', label: t('restaurant.floorPlan'), icon: Layout },
    { id: 'kitchen', label: t('restaurant.kitchenDisplay'), icon: ChefHat },
    { id: 'menu', label: t('restaurant.menuDishes'), icon: UtensilsCrossed },
    { id: 'staff', label: t('restaurant.staffWaiters'), icon: Users },
    { id: 'settings', label: t('restaurant.tablesSettings'), icon: Settings },
    { id: 'inventory', label: t('restaurant.inventory'), icon: Package },
    { id: 'analytics', label: t('restaurant.reportsAnalytics'), icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col min-h-full space-y-6">
      {/* Standardized TabBar Container */}
      <div className="sticky top-0 z-[150] flex justify-start lg:justify-center w-full pointer-events-none pb-4 bg-gray-50/80 backdrop-blur-md pt-2 px-4 sm:px-0">
        <div className="pointer-events-auto flex p-1.5 bg-white/90 backdrop-blur-xl rounded-[2rem] border border-gray-200 shadow-2xl shadow-blue-900/5 overflow-x-auto no-scrollbar max-w-full mx-auto w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-[1.5rem] text-[11px] sm:text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
              `}
            >
              <tab.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('restaurant.title')}</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">{t('restaurant.subtitle')}</p>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1">
        {activeTab === 'floor' && <FloorPlan />}
        {activeTab === 'kitchen' && <KitchenDisplay />}
        {activeTab === 'menu' && <MenuManager />}
        {activeTab === 'staff' && <StaffManager />}
        {activeTab === 'settings' && <TableSettings />}
        {activeTab === 'inventory' && <InventoryManager />}
        {activeTab === 'analytics' && <Analytics />}
      </div>
    </div>
  );
};

export default RestaurantModule;
