import React from 'react';
import { NavLink } from 'react-router-dom';
import { Settings, LogOut, X, LayoutGrid } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTranslation } from 'react-i18next';
import { getNavItemsFromModules } from '../config/moduleRegistry';
import { useUser } from './UserContext';

const Sidebar = ({ onHoverChange, isMobileOpen, onCloseMobile }) => {
  const { t, i18n } = useTranslation();
  const { profile, activeModules } = useUser();

  // Build nav items from active modules only
  const navItems = getNavItemsFromModules(t, activeModules);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div 
      className={`
        fixed left-0 top-0 h-screen bg-white border-r border-gray-100 flex flex-col transition-all duration-300 z-50 overflow-hidden shadow-2xl shadow-gray-200/50
        ${isMobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-64'}
        group
      `}
      onMouseEnter={() => onHoverChange && onHoverChange(true)}
      onMouseLeave={() => onHoverChange && onHoverChange(false)}
    >
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-50 shrink-0">
        <div className="lg:hidden">
           <img src="/merkez-new-logo.svg" alt="Logo" className="h-8 w-auto" />
        </div>
        <button 
          onClick={onCloseMobile}
          className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 mt-6 space-y-2 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive 
                  ? 'bg-gray-50 text-gray-900 font-medium' 
                  : `text-gray-600 ${item.color}`
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3 shrink-0" />
            <span className={`
              transition-opacity duration-300 whitespace-nowrap
              ${isMobileOpen ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'}
            `}>
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Language Switcher for Mobile */}
      <div className="lg:hidden p-4 border-t border-gray-50 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4">Language</p>
        <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100 mx-2">
          {['en', 'ru', 'az'].map((lang) => (
            <button
              key={lang}
              onClick={() => changeLanguage(lang)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase transition-all ${
                i18n.language === lang
                  ? 'bg-white shadow-sm text-merkez-blue'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 shrink-0">
        <NavLink
          to="/modules"
          onClick={onCloseMobile}
          className="flex items-center px-4 py-3 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
        >
          <LayoutGrid className="w-5 h-5 mr-3 shrink-0" />
          <span className={`
            transition-opacity duration-300 whitespace-nowrap
            ${isMobileOpen ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'}
          `}>
            {t('sidebar.modules') || 'Модули'}
          </span>
        </NavLink>
        <NavLink
          to="/settings"
          onClick={onCloseMobile}
          className="flex items-center px-4 py-3 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors duration-200"
        >
          <Settings className="w-5 h-5 mr-3 shrink-0" />
          <span className={`
            transition-opacity duration-300 whitespace-nowrap
            ${isMobileOpen ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'}
          `}>
            {t('sidebar.settings')}
          </span>
        </NavLink>
        <button
          onClick={() => {
            onCloseMobile();
            supabase.auth.signOut();
          }}
          className="w-full flex items-center px-4 py-3 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors duration-200 mt-2"
        >
          <LogOut className="w-5 h-5 mr-3 shrink-0" />
          <span className={`
            transition-opacity duration-300 whitespace-nowrap
            ${isMobileOpen ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'}
          `}>
            {t('profile.signOut')}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
