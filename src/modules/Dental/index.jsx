import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Activity, Package, Users, Settings, Maximize2, Minimize2 } from 'lucide-react';
import Scheduler, { doctors } from './components/Scheduler';
import DentalChart from './components/DentalChart';
import DentalInventory from './components/DentalInventory';
import PatientList from './components/PatientList';
import TreatmentHistory from './components/TreatmentHistory';
import XRayGallery from './components/XRayGallery';

const DentalModule = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('scheduler');
  const [isFullPage, setIsFullPage] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState({
    name: 'John Doe',
    id: '#DN-90210',
    age: '34'
  });

  const handleViewChart = (patient) => {
    setSelectedPatient({
      name: patient.name,
      id: `#DN-${patient.id?.toString().substring(0, 5) || '00000'}`,
      rawId: patient.id,
      age: '34' // Mock age
    });
    setActiveTab('chart');
  };

  const tabs = [
    { id: 'scheduler', label: t('dental.appointments'), icon: Calendar },
    { id: 'chart', label: t('dental.patientChart'), icon: Activity },
    { id: 'inventory', label: t('dental.inventory'), icon: Package },
    { id: 'patients', label: t('dental.patients'), icon: Users },
  ];

  return (
    <div className={`
      flex flex-col min-h-full transition-all duration-500
      ${isFullPage 
        ? 'fixed inset-0 z-[100] bg-gray-50 p-2 md:p-4 rounded-0 overflow-hidden' 
        : 'bg-white p-4 md:p-8 rounded-[2.5rem] border border-gray-100 space-y-6'}
    `}>
      {/* Floating Minimize Button */}
      {isFullPage && (
        <button 
          onClick={() => setIsFullPage(false)}
          className="fixed bottom-6 right-6 lg:top-6 lg:bottom-auto z-[200] w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-2xl shadow-gray-900/20 active:scale-95 animate-in fade-in slide-in-from-bottom-8 lg:slide-in-from-top-8"
          title="Exit Full Screen"
        >
          <Minimize2 className="w-6 h-6" />
        </button>
      )}

      {/* Header */}
      {!isFullPage && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('dental.title')}</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">{t('dental.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-50 rounded-2xl p-1 border border-gray-200 shadow-sm">
             <button 
               onClick={() => setIsFullPage(!isFullPage)}
               className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                 isFullPage 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-gray-500 hover:text-gray-900 bg-white border border-gray-100'
               }`}
               title={isFullPage ? "Minimize" : "Maximize"}
             >
               {isFullPage ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
             </button>
             <div className="w-px h-6 bg-gray-200 mx-1" />
             <button className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">Export PDF</button>
             <button className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 bg-white border border-gray-100 rounded-xl transition-all shadow-sm">
               <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
        </div>
      )}

      {/* Tabs */}
      {!isFullPage && (
        <div className="flex p-1.5 bg-gray-50/80 backdrop-blur-xl rounded-[2rem] w-fit border border-gray-200/50 shadow-sm overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] text-sm font-bold transition-all duration-300 whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-white'}
            `}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
            {tab.label}
          </button>
        ))}
        </div>
      )}

      {/* Content Area */}
      <div className={`flex-1 transition-all duration-500 ${isFullPage ? 'h-full overflow-hidden' : ''}`}>
        {activeTab === 'scheduler' && (
          <div className={`animate-in fade-in slide-in-from-bottom-4 duration-700 ${isFullPage ? 'h-full' : ''}`}>
            <Scheduler isFullPage={isFullPage} />
          </div>
        )}
        {activeTab === 'chart' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="bg-white rounded-[2rem] p-8 text-gray-900 shadow-sm border border-gray-100 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -translate-y-32 translate-x-32 group-hover:scale-110 transition-transform duration-1000" />
               <div className="relative z-10">
                 <div className="flex items-center gap-4 mb-4">
                   <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                     <Users className="w-7 h-7 text-white" />
                   </div>
                   <div>
                     <h3 className="text-2xl font-black">{selectedPatient.name}</h3>
                     <p className="text-gray-500 text-sm font-medium">Patient ID: {selectedPatient.id} • {selectedPatient.age} years old</p>
                   </div>
                 </div>
                 <div className="flex flex-wrap gap-8 mt-6 border-t border-gray-100 pt-6">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400 mb-1">Last Treatment</p>
                      <p className="font-bold">Cleaning & Polish (12 Oct)</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400 mb-1">Total Balance</p>
                      <p className="font-bold text-xl text-blue-600">$1,240.00</p>
                    </div>
                    <div className="flex-1 flex justify-end items-end">
                      <button className="bg-gray-50 hover:bg-gray-100 px-6 py-2.5 rounded-xl text-sm font-bold transition-all border border-gray-100 text-gray-700 shadow-sm">View Documents</button>
                    </div>
                 </div>
               </div>
             </div>
             <DentalChart patientId={selectedPatient.rawId} />
             <TreatmentHistory patientId={selectedPatient.rawId} />
             <XRayGallery patientId={selectedPatient.rawId} />
          </div>
        )}
        {activeTab === 'inventory' && (
          <DentalInventory />
        )}
        {activeTab === 'patients' && (
          <div className="space-y-12">
            <PatientList onViewChart={handleViewChart} />

            {/* Compact Doctors List */}
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-gray-900">Clinical Staff</h3>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">{doctors.length} active</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {doctors.map(doc => (
                  <div key={doc.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all group">
                    <div className={`w-10 h-10 rounded-xl ${doc.color} flex items-center justify-center text-xs font-black text-white shadow-sm group-hover:scale-110 transition-transform`}>
                      {doc.avatar}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{doc.name}</h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{doc.specialty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DentalModule;
