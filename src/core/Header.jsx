import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Bell, User, Menu, X, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUser } from './UserContext';

const Header = ({ onMenuClick }) => {
  const { t, i18n } = useTranslation();
  const { profile, loading } = useUser();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 w-full lg:pl-28 transition-all duration-300">
      <div className="flex items-center space-x-2 sm:space-x-6">
        {/* Mobile Menu Toggle */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center pr-2 sm:pr-6 mr-0 sm:mr-2 border-r border-gray-100 h-10">
           <img src="/merkez-new-logo.svg" alt="Logo" className="h-8 sm:h-10 w-auto object-contain" />
           {profile?.business_name && (
             <div className="ml-4 hidden xl:flex flex-col">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Workspace</span>
               <span className="text-sm font-bold text-gray-900 leading-none">{profile.business_name}</span>
             </div>
           )}
        </div>
        
        <div className="hidden md:flex items-center bg-gray-50 rounded-lg px-3 py-2 w-64 lg:w-80 border border-gray-100 focus-within:border-merkez-blue transition-colors">
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder={t('header.search')} 
            className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-6">
        {/* Language Switcher */}
        <div className="hidden sm:flex bg-gray-50 rounded-lg p-1 border border-gray-100">
          {['en', 'ru', 'az'].map((lang) => (
            <button
              key={lang}
              onClick={() => changeLanguage(lang)}
              className={`px-2 small:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-md uppercase transition-colors ${
                i18n.language === lang
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-1 sm:space-x-4">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          
          <Link to="/profile" className="flex items-center space-x-2 cursor-pointer p-1 rounded-full border border-gray-100 hover:bg-gray-50 transition-colors no-underline">
            <div className="w-8 h-8 rounded-full bg-merkez-blue flex items-center justify-center text-white font-medium text-sm shadow-sm">
              {loading ? '...' : getInitials(profile?.full_name)}
            </div>
            <span className="hidden sm:block text-sm font-bold text-gray-700 mr-2">
              {loading ? 'Loading...' : (profile?.full_name || t('header.profile'))}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;

