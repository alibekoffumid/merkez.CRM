import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Settings, LogOut, X, LayoutGrid } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTranslation } from 'react-i18next';
import { getNavItemsFromModules } from '../config/moduleRegistry';
import { useUser } from './UserContext';

const Sidebar = ({ onHoverChange, isMobileOpen, onCloseMobile }) => {
  const { t, i18n } = useTranslation();
  const { profile, activeModules } = useUser();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef(null);

  // Build nav items from active modules only
  const navItems = getNavItemsFromModules(t, activeModules);

  // Listen for new inbound messages globally
  useEffect(() => {
    channelRef.current = supabase
      .channel('sidebar-unread-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'integration_messages' }, (payload) => {
        if (payload.new?.direction === 'inbound') {
          // Only increment if user is NOT on integrations page
          if (!window.location.pathname.startsWith('/integrations')) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // Clear badge when user navigates to integrations
  useEffect(() => {
    if (location.pathname.startsWith('/integrations')) {
      setUnreadCount(0);
    }
  }, [location.pathname]);

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
           <div className="text-xl font-black tracking-tighter"><span className="text-blue-600">digitall</span><span className="text-slate-900">.llc</span></div>
        </div>
        <button 
          onClick={onCloseMobile}
          className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 mt-6 space-y-2 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center px-2.5 py-2 rounded-lg transition-all duration-200 ${
                isActive 
                  ? `${item.activeText} font-bold` 
                  : `text-gray-500 hover:text-gray-800 ${item.color}`
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative shrink-0">
                  <div className={`p-2 rounded-lg mr-3 transition-all duration-200 ${
                    isActive 
                      ? `${item.activeBg} text-white shadow-lg ${item.activeShadow}` 
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  {item.id === 'integrations' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-0.5 flex items-center justify-center">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping" />
                      <span className="relative min-w-[20px] h-[20px] flex items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white"
                        style={{
                          background: 'linear-gradient(135deg, #ef4444, #ec4899)',
                          boxShadow: '0 0 12px rgba(239, 68, 68, 0.5), 0 2px 6px rgba(236, 72, 153, 0.3)'
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </span>
                  )}
                </div>
                <span className={`
                  transition-opacity duration-300 whitespace-nowrap font-medium text-[15px]
                  ${isMobileOpen ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'}
                `}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Language Switcher for Mobile */}
      <div className="lg:hidden p-4 border-t border-gray-50 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4">Language</p>
        <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-100 mx-2">
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

      <div className="p-3 border-t border-gray-100 shrink-0">
        <NavLink
          to="/modules"
          onClick={onCloseMobile}
          className="flex items-center px-2.5 py-2 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
        >
          <div className="p-2 mr-3 shrink-0 rounded-lg transition-colors">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <span className={`
            transition-opacity duration-300 whitespace-nowrap font-medium text-[15px]
            ${isMobileOpen ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'}
          `}>
            {t('sidebar.modules') || 'Модули'}
          </span>
        </NavLink>
        <NavLink
          to="/settings"
          onClick={onCloseMobile}
          className="flex items-center px-2.5 py-2 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors duration-200"
        >
          <div className="p-2 mr-3 shrink-0 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </div>
          <span className={`
            transition-opacity duration-300 whitespace-nowrap font-medium text-[15px]
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
          className="w-full flex items-center px-2.5 py-2 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors duration-200 mt-2"
        >
          <div className="p-2 mr-3 shrink-0 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
          </div>
          <span className={`
            transition-opacity duration-300 whitespace-nowrap font-medium text-[15px]
            ${isMobileOpen ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'}
          `}>
            {t('profile.signOut')}
          </span>
        </button>

        {/* Version Display */}
        <div className={`
          mt-4 px-4 py-2 border-t border-gray-50 transition-opacity duration-300
          ${isMobileOpen ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'}
        `}>
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">
            v1.0.0 Stable
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
