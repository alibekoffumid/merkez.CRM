import React, { useState } from 'react';
import FloorPlan from './components/FloorPlan';
import MenuManager from './components/MenuManager';
import StaffManager from './components/StaffManager';
import TableSettings from './components/TableSettings';
import Analytics from './components/Analytics';
import KitchenDisplay from './components/KitchenDisplay';

const RestaurantModule = () => {
  const [activeTab, setActiveTab] = useState('floor');

  const tabs = [
    { id: 'floor', label: 'Floor Plan' },
    { id: 'kitchen', label: 'Kitchen Display' },
    { id: 'menu', label: 'Menu & Dishes' },
    { id: 'staff', label: 'Staff & Waiters' },
    { id: 'settings', label: 'Tables & Settings' },
    { id: 'analytics', label: 'Reports & Analytics' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - never scrolls away */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Management</h1>
          <p className="text-sm text-gray-500 mt-1">Full control over tables, menus, personnel, and statistics.</p>
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

      {/* Content - fills remaining height, overflow managed by each child */}
      <div className="flex-1 overflow-hidden pt-6">
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
