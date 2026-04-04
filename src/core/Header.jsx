import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Bell, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10 w-full pl-72 transition-all duration-300">
      <div className="flex items-center space-x-6">
        <div className="flex items-center pr-6 mr-2">
           <img src="/merkez-logo.gif" alt="Logo" className="w-auto h-20 object-contain scale-150 transform origin-left" />
        </div>
        
        <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 w-80 border border-gray-100 focus-within:border-merkez-blue transition-colors">
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder={t('header.search')} 
            className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {/* Language Switcher */}
        <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-100">
          {['en', 'ru', 'az'].map((lang) => (
            <button
              key={lang}
              onClick={() => changeLanguage(lang)}
              className={`px-3 py-1 text-xs font-medium rounded-md uppercase transition-colors ${
                i18n.language === lang
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-merkez-red rounded-full"></span>
          </button>
          
          <Link to="/profile" className="flex items-center space-x-2 cursor-pointer p-1 pr-3 rounded-full border border-gray-100 hover:bg-gray-50 transition-colors no-underline">
            <div className="w-8 h-8 rounded-full bg-merkez-blue flex items-center justify-center text-white font-medium text-sm">
              AA
            </div>
            <span className="text-sm font-medium text-gray-700">{t('header.profile')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
