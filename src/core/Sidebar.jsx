import React from 'react';
import { NavLink } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTranslation } from 'react-i18next';
import { getNavItems } from '../config/navigation';

const Sidebar = () => {
  const { t } = useTranslation();
  const navItems = getNavItems(t);

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0">
      <div className="h-16 flex items-center justify-center border-b border-gray-50">
        {/* Logo moved to Top Header */}
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
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center px-4 py-3 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors duration-200 mt-2"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
