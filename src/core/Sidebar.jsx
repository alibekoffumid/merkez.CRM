import React from 'react';
import { NavLink } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getNavItems } from '../config/navigation';

const Sidebar = () => {
  const { t } = useTranslation();
  const navItems = getNavItems(t);

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center space-x-2">
        {/* Simple geometric logo representation using Merkez colors */}
        <div className="flex space-x-1">
          <div className="w-3 h-3 rounded-full bg-merkez-blue"></div>
          <div className="w-3 h-3 rounded-full bg-merkez-red"></div>
          <div className="w-3 h-3 rounded-full bg-merkez-yellow"></div>
          <div className="w-3 h-3 rounded-full bg-merkez-green"></div>
        </div>
        <span className="text-xl font-bold tracking-tight text-gray-900">Merkez</span>
      </div>

      <nav className="flex-1 px-4 mt-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive 
                  ? 'bg-gray-50 text-gray-900 font-medium' 
                  : `text-gray-600 ${item.color}`
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <NavLink
          to="/settings"
          className="flex items-center px-4 py-3 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors duration-200"
        >
          <Settings className="w-5 h-5 mr-3" />
          <span>{t('sidebar.settings')}</span>
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;
