import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Activity, Package, Users, Settings } from 'lucide-react';
import Scheduler from './components/Scheduler';
import DentalChart from './components/DentalChart';
import DentalInventory from './components/DentalInventory';

const DentalModule = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('scheduler');

  const tabs = [
    { id: 'scheduler', label: t('dental.appointments'), icon: Calendar },
    { id: 'chart', label: t('dental.patientChart'), icon: Activity },
    { id: 'inventory', label: t('dental.inventory'), icon: Package },
    { id: 'patients', label: t('dental.patients'), icon: Users },
  ];

  return (
    <div className="flex flex-col min-h-full space-y-6 bg-[#040711] p-4 md:p-8 rounded-[2.5rem]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">{t('dental.title')}</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">{t('dental.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900/50 rounded-2xl p-1 border border-slate-800">
             <button className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">Export PDF</button>
             <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-all">
               <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-900/80 backdrop-blur-xl rounded-[2rem] w-fit border border-slate-800/50 shadow-2xl overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] text-sm font-bold transition-all duration-300 whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}
            `}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 transition-all duration-500">
        {activeTab === 'scheduler' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Scheduler />
          </div>
        )}
        {activeTab === 'chart' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 group-hover:scale-110 transition-transform duration-1000" />
               <div className="relative z-10">
                 <div className="flex items-center gap-4 mb-4">
                   <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                     <Users className="w-7 h-7" />
                   </div>
                   <div>
                     <h3 className="text-2xl font-black">John Doe</h3>
                     <p className="text-white/70 text-sm font-medium">Patient ID: #DN-90210 • 34 years old</p>
                   </div>
                 </div>
                 <div className="flex flex-wrap gap-8 mt-6 border-t border-white/10 pt-6">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/50 mb-1">Last Treatment</p>
                      <p className="font-bold">Cleaning & Polish (12 Oct)</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/50 mb-1">Total Balance</p>
                      <p className="font-bold text-xl">$1,240.00</p>
                    </div>
                    <div className="flex-1 flex justify-end items-end">
                      <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10">View Documents</button>
                    </div>
                 </div>
               </div>
             </div>
             <DentalChart />
          </div>
        )}
        {activeTab === 'inventory' && (
          <DentalInventory />
        )}
        {activeTab === 'patients' && (
          <div className="bg-slate-900/40 rounded-[2.5rem] p-20 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
            <Users className="w-16 h-16 text-slate-700 mb-6" />
            <h3 className="text-2xl font-bold text-white tracking-tight">{t('dental.patients')}</h3>
            <p className="text-slate-400 max-w-sm mt-3 font-medium">Encrypted storage for patient history, X-ray imagery, and multi-visit clinical records.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DentalModule;
