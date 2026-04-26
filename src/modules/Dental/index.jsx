import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Activity, Package, Users, Settings, Maximize2, Minimize2, Plus } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import Scheduler from './components/Scheduler';
import DentalChart from './components/DentalChart';
import DentalInventory from './components/DentalInventory';
import PatientList from './components/PatientList';
import TreatmentHistory from './components/TreatmentHistory';
import XRayGallery from './components/XRayGallery';

const getInitials = (name) => {
  if (!name) return '?';
  try {
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  } catch (e) {
    return '?';
  }
};

const DentalModule = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('scheduler');
  const [isFullPage, setIsFullPage] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState({
    name: 'Patient',
    id: '#DN-00000',
    age: '--'
  });
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: 'Dentist',
    color: 'bg-blue-600'
  });

  const handleViewChart = (patient) => {
    setSelectedPatient({
      name: patient.name,
      id: '#DN-' + (patient.id?.toString().substring(0, 5) || '00000'),
      rawId: patient.id,
      age: '34'
    });
    setActiveTab('chart');
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      console.log('DentalModule: Fetching isolated staff...');
      
      // 1. Fetch from profiles (System Users) - Only if they have a specific flag or we want them global
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin']) // Only global admins for now
        .order('full_name');

      // 2. Fetch from staff table filtered by MODULE = 'dental'
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('module', 'dental')
        .order('name');
      
      const combinedDoctors = [];
      const uniqueNames = new Set();

      // Process Profiles (System Admins)
      if (profiles) {
        profiles.forEach((profile, index) => {
          if (!profile.full_name) return;
          const name = profile.full_name.toLowerCase();
          if (name.includes('test') || name.includes('tester')) return;
          
          if (!uniqueNames.has(profile.full_name)) {
            uniqueNames.add(profile.full_name);
            combinedDoctors.push({
              id: profile.id,
              name: profile.full_name,
              specialty: 'Administrator',
              color: 'bg-blue-500',
              avatar: getInitials(profile.full_name),
              type: 'system'
            });
          }
        });
      }

      // Process Dental Staff (Isolated)
      if (staffData) {
        staffData.forEach((staff) => {
          if (!uniqueNames.has(staff.name)) {
            uniqueNames.add(staff.name);
            combinedDoctors.push({
              id: staff.id,
              name: staff.name,
              specialty: staff.specialty || 'Dentist',
              color: staff.color || 'bg-blue-600',
              avatar: getInitials(staff.name),
              type: 'isolated'
            });
          }
        });
      }

      setDoctors(combinedDoctors);
    } catch (err) {
      console.error('DentalModule: Error fetching staff:', err);
    }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('staff')
        .insert([{
          name: newDoctor.name,
          role: 'Dentist', 
          specialty: newDoctor.specialty,
          color: newDoctor.color,
          status: 'Active',
          module: 'dental', // STRICT ISOLATION
          user_id: user?.id
        }]);

      if (error) throw error;
      
      setShowAddDoctorModal(false);
      setNewDoctor({ name: '', specialty: 'Dentist', color: 'bg-blue-600' });
      fetchDoctors();
    } catch (err) {
      console.error('Error adding doctor:', err);
      alert('Error: ' + err.message);
    }
  };

  const tabs = [
    { id: 'scheduler', label: t('dental.appointments'), icon: Calendar },
    { id: 'chart', label: t('dental.patientChart'), icon: Activity },
    { id: 'inventory', label: t('dental.inventory'), icon: Package },
    { id: 'patients', label: t('dental.patients'), icon: Users },
  ];

  try {
    return (
      <div className={`
        flex flex-col min-h-full transition-all duration-500
        ${isFullPage 
          ? 'fixed inset-0 z-[100] bg-gray-50 p-2 md:p-4 rounded-0 overflow-hidden' 
          : 'bg-white p-4 md:p-8 rounded-[2.5rem] border border-gray-100 space-y-6'}
      `}>
        {isFullPage && (
          <button 
            onClick={() => setIsFullPage(false)}
            className="fixed bottom-6 right-6 lg:top-6 lg:bottom-auto z-[200] w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-2xl shadow-gray-900/20 active:scale-95"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
        )}

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
                   className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isFullPage ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-900 bg-white border border-gray-100'}`}
                   title={isFullPage ? "Minimize" : "Maximize"}
                 >
                   {isFullPage ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                 </button>
                 <div className="w-px h-6 bg-gray-200 mx-1" />
                 <button className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">Export PDF</button>
                 <button className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 bg-white border border-gray-100 rounded-xl">
                   <Settings className="w-5 h-5" />
                 </button>
              </div>
            </div>
          </div>
        )}

        {!isFullPage && (
          <div className="flex p-1.5 bg-gray-50 rounded-[2rem] w-fit border border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
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
                {tab.icon && <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />}
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className={`flex-1 transition-all duration-500 ${isFullPage ? 'h-full overflow-hidden' : ''}`}>
          {activeTab === 'scheduler' && (
            <div className={`animate-in fade-in slide-in-from-bottom-4 duration-700 ${isFullPage ? 'h-full' : ''}`}>
              <Scheduler isFullPage={isFullPage} />
            </div>
          )}
          {activeTab === 'chart' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="bg-white rounded-[2rem] p-8 text-gray-900 shadow-sm border border-gray-100 relative overflow-hidden group">
                 <div className="relative z-10">
                   <div className="flex items-center gap-4 mb-4">
                     <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                       <Users className="w-7 h-7 text-white" />
                     </div>
                     <div>
                       <h3 className="text-2xl font-black">{selectedPatient.name}</h3>
                       <p className="text-gray-500 text-sm font-medium">Patient ID: {selectedPatient.id}</p>
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

              <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Clinical Staff</h3>
                    <p className="text-xs text-gray-500 font-medium">Manage your clinical team and doctors</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">{doctors?.length || 0} active</span>
                    <button 
                      onClick={() => setShowAddDoctorModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-xs font-bold">Add Doctor</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(doctors || []).map(doc => (
                    <div key={doc.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all group">
                      <div className={`w-10 h-10 rounded-xl ${doc.color || 'bg-blue-500'} flex items-center justify-center text-xs font-black text-white shadow-sm group-hover:scale-110 transition-transform`}>
                        {doc.avatar || '?'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{doc.name || 'Anonymous Staff'}</h4>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{doc.specialty || 'Clinical Staff'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {showAddDoctorModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-xl font-black text-gray-900">Add Clinical Staff</h3>
                <button onClick={() => setShowAddDoctorModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                   <Maximize2 className="w-5 h-5 text-gray-400 rotate-45" />
                </button>
              </div>
              <form onSubmit={handleAddDoctor} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Full Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Dr. Sahil Abbasov"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Specialty</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Orthodontist"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor({...newDoctor, specialty: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Calendar Color</label>
                  <div className="flex gap-3">
                    {['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewDoctor({...newDoctor, color: c})}
                        className={`w-8 h-8 rounded-full ${c} ${newDoctor.color === c ? 'ring-4 ring-offset-2 ring-gray-200' : ''} transition-all`}
                      />
                    ))}
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] mt-4"
                >
                  Create Profile
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  } catch (err) {
    console.error('DentalModule Render Error:', err);
    return (
      <div className="p-20 text-center bg-white rounded-[2.5rem] border border-red-100">
        <h2 className="text-2xl font-black text-rose-600 mb-4">Module Error</h2>
        <p className="text-gray-500">Something went wrong while loading the Dental module.</p>
        <pre className="mt-4 p-4 bg-gray-50 rounded-xl text-xs text-left overflow-auto max-h-40">{err.message}</pre>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">Reload Application</button>
      </div>
    );
  }
};

export default DentalModule;
