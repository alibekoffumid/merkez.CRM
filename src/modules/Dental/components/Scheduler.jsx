import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Clock, 
  Activity, 
  MoreHorizontal, 
  Loader2,
  X,
  User,
  Phone 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DentalService } from '../../../services/DentalService';
import { supabase } from '../../../supabaseClient';

const getInitials = (name) => {
  return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
};

const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${min}`;
});

const Scheduler = ({ isFullPage, doctors = [], refreshTrigger }) => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [formData, setFormData] = useState({
    patient_name: '',
    phone: '',
    doctor_name: '',
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    duration_minutes: 30,
    procedure_type: 'Consultation'
  });

  useEffect(() => {
    console.log('Scheduler: Initializing with date:', currentDate);
    fetchAppointments();
    fetchPatients();

    // Refresh live indicator every minute
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, [currentDate, refreshTrigger]);

  const [tick, setTick] = React.useState(0);

  const showNotification = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };


  useEffect(() => {
    if (!formData.doctor_name && doctors.length > 0) {
      setFormData(prev => ({ ...prev, doctor_name: doctors[0].name }));
    }
  }, [doctors]);
  const fetchPatients = async () => {
    try {
      const { data } = await supabase.from('customers').select('id, name, phone').order('name');
      setPatientsList(data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const dateString = currentDate.toISOString().split('T')[0];
      const data = await DentalService.getAppointments(dateString);
      
      if (data) {
        const formatted = data.map(app => ({
          id: app.id,
          patient: app.patient?.name || app.patient_name || 'New Patient',
          phone: app.patient?.phone || app.phone || '',
          doctorName: app.doctor_name,
          time: (app.start_time || '00:00').substring(0, 5),
          duration: app.duration_minutes || (() => {
            // Calculate from end_time - start_time
            if (app.end_time && app.start_time) {
              const [sh, sm] = app.start_time.split(':').map(Number);
              const [eh, em] = app.end_time.split(':').map(Number);
              return (eh * 60 + em) - (sh * 60 + sm);
            }
            return 30;
          })(),
          type: app.procedure_type || 'Consultation',
          status: app.status || 'SCHEDULED',
          doctorId: app.doctor_id
        }));
        setAppointments(formatted);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patient_name || !formData.doctor_name) {
      showNotification('Please enter patient name and select a doctor', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Starting appointment save...', formData);
      
      // 1. Check or Create Patient
      let patientId;
      const { data: existing, error: searchError } = await supabase
        .from('customers')
        .select('id')
        .eq('name', formData.patient_name)
        .limit(1);
      
      if (searchError) throw searchError;

      if (existing && existing.length > 0) {
        patientId = existing[0].id;
        console.log('Existing patient found:', patientId);
      } else {
        console.log('Creating new patient...');
        const { data: newPatients, error: createError } = await supabase
          .from('customers')
          .insert([{ 
            name: formData.patient_name, 
            phone: formData.phone || null,
            type: 'Regular' 
          }])
          .select();
        
        if (createError) throw createError;
        if (!newPatients || newPatients.length === 0) throw new Error('Failed to create patient record');
        patientId = newPatients[0].id;
        console.log('New patient created:', patientId);
        fetchPatients();
      }

      // 2. Create Appointment
      const doctorObj = doctors.find(d => d.name === formData.doctor_name) || doctors[0];
      if (!doctorObj) throw new Error('No doctor selected');

      console.log('Creating appointment for doctor:', doctorObj.name);
      // Calculate end_time
      const [hh, mm] = formData.start_time.split(':').map(Number);
      const dur = parseInt(formData.duration_minutes) || 30;
      const totalMin = mm + dur;
      const endTime = `${String(hh + Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;

      const { error: apptError } = await supabase.from('dental_records').insert([{
        patient_name: formData.patient_name,
        doctor_id: doctorObj.id,
        appointment_date: formData.appointment_date,
        start_time: formData.start_time,
        end_time: endTime,
        procedure_type: formData.procedure_type,
        status: 'SCHEDULED'
      }]);

      if (apptError) throw apptError;
      
      showNotification('Appointment scheduled successfully!');
      setShowModal(false);
      fetchAppointments();
    } catch (err) {
      console.error('SAVE ERROR:', err);
      showNotification('Error: ' + (err.message || 'Database connection error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (!window.confirm('Delete this appointment?')) return;
    try {
      const { error } = await supabase.from('dental_appointments').delete().eq('id', id);
      if (error) throw error;
      showNotification('Appointment deleted', 'success');
      fetchAppointments();
    } catch (err) {
      console.error(err);
      showNotification('Failed to delete', 'error');
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const getLiveIndicatorPos = () => {
    const now = new Date();
    const isToday = now.toDateString() === currentDate.toDateString();
    if (!isToday) return null;

    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Grid starts at 00:00. 1 hour = 80px (2 slots * 40px)
    const top = (hours * 80) + (minutes / 60 * 80);
    return top;
  };

  const liveIndicatorPos = getLiveIndicatorPos();

  if (!timeSlots || !doctors) {
    console.error('Scheduler: Critical data missing');
    return <div className="p-20 text-center">Critical Error: Scheduler Data Missing</div>;
  }

  return (
    <div className={`bg-white rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col font-sans ${isFullPage ? 'h-full' : 'h-[850px]'}`}>
      {/* Premium Header */}
      <div className="p-8 border-b border-gray-100 flex flex-col lg:flex-row items-start lg:items-center justify-between bg-gray-50/50 backdrop-blur-xl z-30 gap-6 rounded-t-[2.5rem]">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/5">
            <CalendarIcon className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: 'numeric' })}
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200/50">
                <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-gray-900 shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 text-[10px] font-black text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors">Today</button>
                <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-gray-900 shadow-sm"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none lg:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search appointments..." 
              className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setFormData({
                ...formData,
                doctor_name: doctors.length > 0 ? doctors[0].name : '',
                appointment_date: currentDate.toISOString().split('T')[0],
                patient_name: '',
                phone: '',
                start_time: '10:00'
              });
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-3 shadow-xl shadow-blue-600/20 active:scale-95">
            <Plus className="w-5 h-5" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="flex-1 flex flex-col min-h-0 overflow-x-auto">
        {/* Fixed Header Row */}
        <div className="flex bg-white/90 backdrop-blur-xl border-b border-gray-100 z-30 min-w-max">
          {/* Time Placeholder */}
          <div className="w-24 shrink-0 border-r border-gray-100 bg-gray-50/50 flex items-center justify-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</span>
          </div>
          {/* Doctor Headers */}
          <div className="flex-1 flex min-w-[1200px]">
            {doctors.map(doctor => (
              <div key={doctor.id} className="flex-1 border-r border-gray-100 p-4 flex items-center justify-start gap-4 h-20 bg-white">
                <div className={`w-12 h-12 rounded-2xl ${doctor.color} ${doctor.glow} flex items-center justify-center text-xs font-black text-white shadow-lg shrink-0 transition-transform hover:scale-105`}>
                  {doctor.avatar}
                </div>
                <div className="flex flex-col items-start justify-center overflow-hidden">
                  <span className="text-sm font-black text-gray-900 tracking-tight leading-tight truncate w-full">{doctor.name}</span>
                  <span className="text-[10px] text-blue-500 font-black uppercase tracking-[0.15em] leading-tight mt-1">{doctor.specialty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Slots Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-gray-50/30 relative min-w-max pb-20">
          <div className="flex min-w-[1200px] h-full">
            {/* Time Gutter */}
            <div className="w-24 shrink-0 border-r border-gray-100 bg-gray-50/50">
              {timeSlots.map((time, index) => (
                <div key={time} className="h-10 flex items-start justify-center pt-1.5 border-b border-gray-50/80">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {time.endsWith(':00') ? time : ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Columns Area */}
            <div className="flex-1 flex relative">
              {doctors.map(doctor => (
                <div key={doctor.id} className="flex-1 border-r border-gray-100 relative">
                  {/* Slots */}
                  {timeSlots.map(time => (
                    <div key={time} className="h-10 border-b border-gray-50 group/slot hover:bg-blue-50/30 transition-colors flex items-center justify-center">
                        <button 
                        onClick={() => {
                          setFormData({
                            ...formData,
                            doctor_name: doctor.name,
                            start_time: time,
                            appointment_date: currentDate.toISOString().split('T')[0],
                            patient_name: '',
                            phone: ''
                          });
                          setShowModal(true);
                        }}
                        className="w-8 h-8 rounded-full bg-white opacity-20 group-hover/slot:opacity-100 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all scale-75 group-hover/slot:scale-100 shadow-sm border border-gray-100 z-20">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Appointments */}
                  <div className="absolute inset-0 pointer-events-none">
                    {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>}
                    {!loading && appointments.filter(app => app.doctorId === doctor.id).map((app, index) => {
                      const timeStr = app.time || '00:00';
                      const startHour = parseInt(timeStr.split(':')[0]) || 0;
                      const startMin = parseInt(timeStr.split(':')[1]) || 0;
                      const top = (startHour * 80) + (startMin / 60 * 80);
                      const height = ((app.duration || 30) / 60) * 80;

                      const statusColors = {
                        CONFIRMED: 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-100/50',
                        IN_PROGRESS: 'bg-blue-50 border-blue-200 text-blue-700 shadow-blue-100/50',
                        SCHEDULED: 'bg-gray-50 border-gray-200 text-gray-700 shadow-gray-100/50',
                      };

                      const isSmall = app.duration <= 20;

                      return (
                        <div 
                          key={app.id}
                          className={`absolute left-1 right-1 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-xl cursor-pointer pointer-events-auto ${statusColors[app.status] || statusColors.SCHEDULED} group/app shadow-sm z-10 overflow-hidden p-4`}
                          style={{ 
                            top: `${top}px`, 
                            height: `${Math.max(height, 60)}px`,
                            marginLeft: index % 2 === 0 ? '0' : '4px'
                          }}
                        >
                          <div className="flex flex-col justify-center h-full relative">
                            <div className="flex flex-col pr-8">
                               <h4 className="text-[13px] font-black tracking-tight truncate text-gray-900 leading-tight mb-0.5">{app.patient}</h4>
                               {app.phone && (
                                 <p className="text-[10px] font-bold text-blue-600/80 truncate flex items-center gap-1.5">
                                   <Phone className="w-3 h-3 shrink-0" /> {app.phone}
                                 </p>
                               )}
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleDeleteAppointment(app.id);
                                 }}
                                 className="opacity-0 group-hover/app:opacity-100 transition-opacity p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg absolute right-0 top-0 pointer-events-auto shadow-sm"
                                 title="Delete"
                               >
                                 <X className="w-3.5 h-3.5" />
                               </button>
                            </div>
                            
                            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto pt-1 ${isSmall ? 'hidden' : ''}`}>
                              <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest opacity-60">
                                <Clock className="w-2.5 h-2.5" /> {app.time}
                              </div>
                              <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest opacity-60 truncate">
                                <Activity className="w-2.5 h-2.5" /> {app.type}
                              </div>
                            </div>
                            {isSmall && (
                              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest opacity-60 mt-auto truncate">
                                <span>{app.time}</span>
                                <span>•</span>
                                <span>{app.type}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Live Indicator */}
              {liveIndicatorPos !== null && (
                <div 
                  className="absolute left-0 right-0 h-[2px] bg-red-500/50 z-20 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all duration-1000"
                  style={{ top: `${liveIndicatorPos}px` }}
                >
                  <div className="absolute -left-1 -top-[4px] w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg border-2 border-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification.show && (
        <div className="fixed top-6 right-6 z-[300] animate-in slide-in-from-top-8 fade-in duration-300">
          <div className={`rounded-2xl shadow-xl border p-4 flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notification.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              <Activity className={`w-4 h-4 ${notification.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`} />
            </div>
            <p className="text-sm font-black tracking-tight">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Add Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <div className="mb-8">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">New Appointment</h3>
              <p className="text-sm font-medium text-gray-500 mt-1">Add a new patient or search existing</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Patient Name</label>
                <div className="relative group/input">
                  <input 
                    type="text" 
                    required 
                    autoComplete="off"
                    value={formData.patient_name} 
                    onFocus={() => setShowPatientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ 
                        ...formData, 
                        patient_name: val
                      });
                      setShowPatientDropdown(true);
                    }} 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-12" 
                    placeholder="Search existing or type new name..." 
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                  {showPatientDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[300] max-h-60 overflow-y-auto no-scrollbar py-2 animate-in fade-in zoom-in-95 duration-200">
                      {patientsList
                        .filter(p => p.name.toLowerCase().includes(formData.patient_name.toLowerCase()))
                        .slice(0, 50)
                        .map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                patient_name: p.name,
                                phone: p.phone || formData.phone
                              });
                              setShowPatientDropdown(false);
                            }}
                            className="w-full px-5 py-3 text-left hover:bg-gray-50 flex items-center justify-between group transition-colors"
                          >
                            <div>
                              <p className="text-sm font-bold text-gray-900">{p.name}</p>
                              {p.phone && <p className="text-[10px] font-medium text-gray-400">{p.phone}</p>}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                          </button>
                        ))
                      }
                      {patientsList.filter(p => p.name.toLowerCase().includes(formData.patient_name.toLowerCase())).length === 0 && (
                        <div className="px-5 py-4 text-center">
                          <p className="text-sm font-bold text-gray-400">New patient will be created</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Phone Number (Optional)</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="+1 234 567 890" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Doctor</label>
                  <select value={formData.doctor_name} onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                    {doctors.map(doc => <option key={doc.id} value={doc.name}>{doc.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Time</label>
                  <input type="time" required value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Duration</label>
                  <select value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Procedure</label>
                  <select value={formData.procedure_type} onChange={(e) => setFormData({ ...formData, procedure_type: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                    <option value="Consultation">Consultation</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Filling">Filling</option>
                    <option value="Extraction">Extraction</option>
                    <option value="Checkup">Checkup</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? 'Saving...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scheduler;
