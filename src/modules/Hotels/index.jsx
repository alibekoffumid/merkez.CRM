import React, { useState } from 'react';
import { Building, Calendar, Settings, Bed, Plus, Search, Filter } from 'lucide-react';
import BookingCalendar from './components/BookingCalendar';
import { useTranslation } from 'react-i18next';

const HotelsModule = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'housekeeping', 'settings'

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center">
              <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center mr-3">
                <Building className="w-5 h-5" />
              </div>
              {t('hotels.title') || 'Hotels & Hostels'}
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-1 ml-11">
              {t('hotels.subtitle') || 'Property Management System'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all">
               <Search className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all">
               <Filter className="w-4 h-4" />
            </button>
            <button className="bg-pink-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center text-sm hover:bg-pink-700 transition-all shadow-lg shadow-pink-500/30 active:scale-[0.98]">
              <Plus className="w-4 h-4 mr-2" />
              {t('hotels.newBooking') || 'New Booking'}
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 text-sm font-bold border-b-[3px] transition-all ${
              activeTab === 'calendar' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center">
              <Calendar className={`w-4 h-4 mr-2 ${activeTab === 'calendar' ? 'text-pink-600' : ''}`} />
              {t('hotels.bookingCalendar') || 'Booking Calendar'}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('housekeeping')}
            className={`pb-3 text-sm font-bold border-b-[3px] transition-all ${
              activeTab === 'housekeeping' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center">
              <Bed className={`w-4 h-4 mr-2 ${activeTab === 'housekeeping' ? 'text-pink-600' : ''}`} />
              {t('hotels.housekeeping') || 'Housekeeping'}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 text-sm font-bold border-b-[3px] transition-all ${
              activeTab === 'settings' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center">
              <Settings className={`w-4 h-4 mr-2 ${activeTab === 'settings' ? 'text-pink-600' : ''}`} />
              {t('hotels.settings') || 'Settings'}
            </div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-6 relative">
         {activeTab === 'calendar' && <BookingCalendar />}
         
         {activeTab === 'housekeeping' && (
           <div className="flex h-full items-center justify-center text-gray-400 font-medium">
              {t('hotels.housekeepingComingSoon') || 'Housekeeping module coming soon...'}
           </div>
         )}
         
         {activeTab === 'settings' && (
           <div className="flex h-full items-center justify-center text-gray-400 font-medium">
              {t('hotels.settingsComingSoon') || 'Hotel settings coming soon...'}
           </div>
         )}
      </div>
    </div>
  );
};

export default HotelsModule;
