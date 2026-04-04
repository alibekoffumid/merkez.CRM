import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import FloorPlan from './components/FloorPlan';
import MenuManager from './components/MenuManager';
import StaffManager from './components/StaffManager';
import TableSettings from './components/TableSettings';
import Analytics from './components/Analytics';
import KitchenDisplay from './components/KitchenDisplay';

const RestaurantModule = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('floor');

  const tabs = [
    { id: 'floor', label: t('restaurant.floorPlan') },
    { id: 'kitchen', label: t('restaurant.kitchenDisplay') },
    { id: 'menu', label: t('restaurant.menuDishes') },
    { id: 'staff', label: t('restaurant.staffWaiters') },
    { id: 'settings', label: t('restaurant.tablesSettings') },
    { id: 'analytics', label: t('restaurant.reportsAnalytics') },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header - never scrolls away */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('restaurant.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('restaurant.subtitle')}</p>
        </div>
      </div>

      {/* Tabs - sticky, never scrolls away */}
      <div className="flex space-x-2 border-b border-gray-200 pb-px overflow-x-auto shrink-0 bg-white sticky top-0 z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
              activeTab === tab.id 
                ? 'border-merkez-green text-merkez-green' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 pt-6">
        {activeTab === 'floor' && <FloorPlan />}
        {activeTab === 'kitchen' && <KitchenDisplay />}
        {activeTab === 'menu' && <MenuManager />}
        {activeTab === 'staff' && <StaffManager />}
        {activeTab === 'settings' && <TableSettings />}
        {activeTab === 'analytics' && <Analytics />}
      </div>
    </div>
  );
};

export default RestaurantModule;
