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
  Phone,
  Edit2
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

const Scheduler = ({ isFullPage, doctors = [], refreshTrigger, onViewChart }) => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('all');
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', notes: '' });
  const [formData, setFormData] = useState({
    patient_name: '',
    phone: '',
    doctor_name: '',
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    duration_minutes: 30,
    procedure_type: 'Consultation',
    notes: ''
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
      
      // Fetch patients to map names to phones if record is missing phone
      const patientsData = await DentalService.getPatients();
      const phoneMap = patientsData.reduce((acc, p) => {
        acc[p.name] = { phone: p.phone, id: p.id };
        return acc;
      }, {});
      
      if (data) {
        const formatted = data.map(app => ({
          id: app.id,
          patient: app.patient_name || 'New Patient',
          phone: app.phone || phoneMap[app.patient_name]?.phone || '',
          customerId: phoneMap[app.patient_name]?.id,
          doctorName: app.doctor_name,
          time: (app.start_time || '00:00').substring(0, 5),
          duration: app.duration_minutes || (() => {
            if (app.end_time && app.start_time) {
              const [sh, sm] = app.start_time.split(':').map(Number);
              const [eh, em] = app.end_time.split(':').map(Number);
              return (eh * 60 + em) - (sh * 60 + sm);
            }
            return 30;
          })(),
          type: (app.procedure_type || '').split('|')[0].trim() || 'Consultation',
          status: app.status || 'SCHEDULED',
          doctorId: app.doctor_id,
          date: app.appointment_date,
          notes: (app.procedure_type || '').split('|')[1]?.trim() || ''
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
        procedure_type: formData.notes ? `${formData.procedure_type} | ${formData.notes}` : formData.procedure_type,
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

  const handleUpdateClient = async () => {
    try {
      setIsSubmitting(true);
      let customerId = selectedClient.customerId;

      // 1. If no customerId, try to find by name first
      if (!customerId) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('name', selectedClient.name)
          .limit(1);
        
        if (existing && existing.length > 0) {
          customerId = existing[0].id;
        } else {
          // Create new customer if truly missing
          const { data: newCust, error: createError } = await supabase
            .from('customers')
            .insert([{ name: editData.name, phone: editData.phone, type: 'Regular' }])
            .select();
          if (!createError && newCust) customerId = newCust[0].id;
        }
      }

      // 2. Update customer record if we have an ID now
      if (customerId) {
        const { error: custError } = await supabase
          .from('customers')
          .update({
            name: editData.name,
            phone: editData.phone
          })
          .eq('id', customerId);
        
        if (custError) throw custError;
      }

      // 3. Update the appointment record itself (Bypass phone/notes columns due to cache error)
      const { error: recordError } = await supabase
        .from('dental_records')
        .update({
          patient_name: editData.name,
          procedure_type: editData.notes ? `${selectedClient.type} | ${editData.notes}` : selectedClient.type
        })
        .eq('id', selectedClient.id);

      if (recordError) throw recordError;

      showNotification('Changes saved successfully');
      setIsEditingClient(false);
      
      // Update local state immediately for better UX
      setAppointments(prev => prev.map(app => 
        app.id === selectedClient.id 
          ? { ...app, patient: editData.name, phone: editData.phone, notes: editData.notes }
          : app
      ));

      setSelectedClient(null);
      await fetchAppointments(); // Full sync
    } catch (err) {
      console.error('Update error detail:', err);
      showNotification(err.message || 'Failed to save changes', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex flex-col font-sans ${isFullPage ? 'h-full' : 'flex-1'}`}>
      {/* Premium Header */}
      <div className="p-8 border-b border-gray-100 flex flex-col lg:flex-row items-start lg:items-center justify-between bg-gray-50/50 backdrop-blur-xl z-[100] gap-6">
        <div className="flex items-center gap-6">
          <div 
            className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/5 cursor-pointer hover:bg-blue-500/20 transition-all"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <CalendarIcon className="w-7 h-7 text-blue-400" />
          </div>
          <div className="relative">
            <h2 
              className="text-2xl font-black text-gray-900 tracking-tight cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: 'numeric' })}
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200/50">
                <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-gray-900 shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                {currentDate.toDateString() === new Date().toDateString() ? (
                  <span className="px-4 text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center">Today</span>
                ) : (
                  <button onClick={() => setCurrentDate(new Date())} className="px-4 text-[10px] font-black text-gray-500 hover:text-blue-600 uppercase tracking-widest transition-colors">Today</button>
                )}
                <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-gray-900 shadow-sm"><ChevronRight className="w-4 h-4" /></button>
              </div>

              {/* Doctor Dropdown */}
              <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200/50">
                <div className="flex items-center gap-2 px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200">
                  <User className="w-3 h-3" /> Staff
                </div>
                <select 
                  value={selectedDoctorId} 
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="bg-transparent px-4 py-1 text-xs font-bold text-gray-700 outline-none cursor-pointer"
                >
                  <option value="all">All Doctors</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calendar Popup */}
            {showCalendar && (
              <div className="absolute top-full left-0 mt-2 z-[500] bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => {
                    const d = new Date(currentDate);
                    d.setMonth(d.getMonth() - 1);
                    setCurrentDate(d);
                  }} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm font-black text-gray-900">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => {
                    const d = new Date(currentDate);
                    d.setMonth(d.getMonth() + 1);
                    setCurrentDate(d);
                  }} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                    <span key={d} className="text-[9px] font-black text-gray-400 uppercase">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth();
                    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const today = new Date();
                    const cells = [];
                    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
                    for (let day = 1; day <= daysInMonth; day++) {
                      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                      const isSelected = day === currentDate.getDate();
                      cells.push(
                        <button
                          key={day}
                          onClick={() => {
                            setCurrentDate(new Date(year, month, day));
                            setShowCalendar(false);
                          }}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                            isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' :
                            isToday ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                            'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </div>
            )}
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
                start_time: '10:00',
                notes: ''
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
        {/* Doctor Headers Row - Only show if 'All Doctors' selected to distinguish columns */}
        {selectedDoctorId === 'all' && (
          <div className="flex bg-gray-50/50 border-b border-gray-100 min-w-max sticky top-0 z-30">
            <div className="w-24 shrink-0 border-r border-gray-100 flex items-center justify-center bg-gray-50/50">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</span>
            </div>
            {/* Doctor Headers */}
            <div className="flex-1 flex min-w-full">
              {doctors.map(doctor => (
                <div key={doctor.id} className="flex-1 border-r border-gray-100 p-3 flex items-center justify-start gap-3 h-14 bg-white/80 backdrop-blur-md">
                  <div className={`w-8 h-8 rounded-xl ${doctor.color} flex items-center justify-center text-[10px] font-black text-white shadow-sm shrink-0`}>
                    {doctor.avatar}
                  </div>
                  <div className="flex flex-col items-start justify-center overflow-hidden">
                    <span className="text-xs font-black text-gray-900 tracking-tight leading-none truncate w-full">{doctor.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Slots Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-gray-50/30 relative min-w-max pb-20">
          <div className="flex min-w-full h-full">
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
              {doctors.filter(d => selectedDoctorId === 'all' || d.id === selectedDoctorId).map(doctor => (
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
                            phone: '',
                            notes: ''
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

                      // Color by procedure type
                      const procedureColors = {
                        'Consultation': 'bg-blue-50 border-blue-300 text-blue-800',
                        'Cleaning': 'bg-emerald-50 border-emerald-300 text-emerald-800',
                        'Extraction': 'bg-rose-50 border-rose-300 text-rose-800',
                        'Filling': 'bg-amber-50 border-amber-300 text-amber-800',
                        'Root Canal': 'bg-purple-50 border-purple-300 text-purple-800',
                        'Crown': 'bg-orange-50 border-orange-300 text-orange-800',
                        'Implant': 'bg-cyan-50 border-cyan-300 text-cyan-800',
                        'Whitening': 'bg-yellow-50 border-yellow-300 text-yellow-800',
                        'Orthodontics': 'bg-indigo-50 border-indigo-300 text-indigo-800',
                        'X-Ray': 'bg-slate-50 border-slate-300 text-slate-800',
                        'пломбирование': 'bg-amber-50 border-amber-300 text-amber-800',
                        'удаление': 'bg-rose-50 border-rose-300 text-rose-800',
                        'чистка': 'bg-emerald-50 border-emerald-300 text-emerald-800',
                        'консультация': 'bg-blue-50 border-blue-300 text-blue-800',
                        'отбеливание': 'bg-yellow-50 border-yellow-300 text-yellow-800',
                        'имплантация': 'bg-cyan-50 border-cyan-300 text-cyan-800',
                        'ортодонтия': 'bg-indigo-50 border-indigo-300 text-indigo-800',
                        'протезирование': 'bg-orange-50 border-orange-300 text-orange-800',
                        'лечение каналов': 'bg-purple-50 border-purple-300 text-purple-800',
                      };

                      // Match procedure (case-insensitive)
                      const procKey = Object.keys(procedureColors).find(
                        k => app.type?.toLowerCase().includes(k.toLowerCase())
                      );
                      const cardColor = procKey 
                        ? procedureColors[procKey] 
                        : 'bg-gray-50 border-gray-300 text-gray-800';

                      // Accent dot color for the left border stripe
                      const accentColors = {
                        'Consultation': 'bg-blue-500',
                        'Cleaning': 'bg-emerald-500',
                        'Extraction': 'bg-rose-500',
                        'Filling': 'bg-amber-500',
                        'Root Canal': 'bg-purple-500',
                        'пломбирование': 'bg-amber-500',
                        'удаление': 'bg-rose-500',
                        'чистка': 'bg-emerald-500',
                        'консультация': 'bg-blue-500',
                      };
                      const accentKey = Object.keys(accentColors).find(
                        k => app.type?.toLowerCase().includes(k.toLowerCase())
                      );
                      const accent = accentKey ? accentColors[accentKey] : 'bg-gray-400';

                      const isSmall = app.duration <= 20;

                      return (
                        <div 
                          key={app.id}
                          onClick={() => {
                            setSelectedClient({
                              id: app.id,
                              customerId: app.customerId,
                              name: app.patient,
                              phone: app.phone,
                              type: app.type,
                              time: app.time,
                              date: app.date,
                              notes: app.notes
                            });
                            setEditData({ name: app.patient, phone: app.phone, notes: app.notes });
                            setIsEditingClient(false);
                          }}
                          className={`absolute left-1 right-1 rounded-2xl border-2 transition-all hover:shadow-xl hover:brightness-95 cursor-pointer pointer-events-auto ${cardColor} group/app shadow-sm z-10 overflow-hidden p-4`}
                          style={{ 
                            top: `${top}px`, 
                            height: `${Math.max(height, 60)}px`,
                            marginLeft: index % 2 === 0 ? '0' : '4px'
                          }}
                        >
                          {/* Color accent stripe */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accent}`} />
                          
                          <div className="flex items-center h-full relative pl-6 pr-8 gap-8">
                            {/* 1. Name Section */}
                            <div className="min-w-[140px]">
                               <h4 className="text-[14px] font-black tracking-tight text-gray-900 truncate leading-none mb-1">{app.patient}</h4>
                               <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
                                 <Clock className="w-3 h-3" /> {app.time}
                               </div>
                            </div>

                            <div className="w-px h-8 bg-gray-100 shrink-0" />

                            {/* 2. Phone Section */}
                            <div className="min-w-[120px]">
                               {app.phone ? (
                                 <p className="text-[11px] font-bold text-blue-500 flex items-center gap-2">
                                   <Phone className="w-3.5 h-3.5 shrink-0" /> {app.phone}
                                 </p>
                               ) : (
                                 <span className="text-[10px] text-gray-300 font-bold italic">No phone</span>
                               )}
                            </div>

                            <div className="w-px h-8 bg-gray-100 shrink-0" />

                            {/* 3. Procedure & Note Section */}
                            <div className="flex flex-1 items-center gap-6 overflow-hidden">
                               <div className="flex items-center gap-2 bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100 shrink-0">
                                 <Activity className="w-3 h-3 text-blue-500" />
                                 <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">{app.type}</span>
                               </div>
                               
                               {app.notes && (
                                 <div className="flex items-center gap-2 text-gray-500 italic truncate max-w-md">
                                   <div className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                                   <p className="text-[11px] font-medium truncate leading-none">
                                      {app.notes}
                                   </p>
                                 </div>
                               )}
                            </div>

                            {/* Delete Button */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAppointment(app.id);
                              }}
                              className="absolute top-1 right-1 p-2 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-xl opacity-0 group-hover/app:opacity-100 transition-all pointer-events-auto"
                              title="Delete"
                            >
                              <X className="w-4 h-4" />
                            </button>
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
                <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Time</label>
                  <button 
                    type="button"
                    onClick={() => setShowTimePicker(!showTimePicker)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all flex items-center justify-between"
                  >
                    <span>{formData.start_time}</span>
                    <Clock className="w-4 h-4 text-gray-400" />
                  </button>

                  {showTimePicker && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-gray-100 z-[1000] p-4 animate-in zoom-in-95 duration-200">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Hours */}
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center mb-2">Hours</p>
                          <div className="h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {Array.from({ length: 15 }, (_, i) => i + 7).map(h => {
                              const hourStr = h.toString().padStart(2, '0');
                              const currentHour = formData.start_time.split(':')[0];
                              return (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => {
                                    const mins = formData.start_time.split(':')[1];
                                    setFormData({ ...formData, start_time: `${hourStr}:${mins}` });
                                  }}
                                  className={`w-full py-2 rounded-xl text-sm font-bold transition-all ${currentHour === hourStr ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                  {hourStr}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {/* Minutes */}
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center mb-2">Minutes</p>
                          <div className="h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {['00', '15', '30', '45'].map(m => {
                              const currentMin = formData.start_time.split(':')[1];
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => {
                                    const hour = formData.start_time.split(':')[0];
                                    setFormData({ ...formData, start_time: `${hour}:${m}` });
                                    setShowTimePicker(false);
                                  }}
                                  className={`w-full py-2 rounded-xl text-sm font-bold transition-all ${currentMin === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                  {m}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowTimePicker(false)}
                        className="w-full py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                      >
                        Done
                      </button>
                    </div>
                  )}
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

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Appointment Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Patient has slight tooth sensitivity..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[100px] resize-none"
                />
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
      {/* Client Detail Card Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="relative h-32 bg-gradient-to-br from-blue-600 to-indigo-700 p-8">
              <button 
                onClick={() => setSelectedClient(null)}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute -bottom-12 left-8 w-24 h-24 rounded-3xl bg-white p-1 shadow-xl">
                <div className="w-full h-full rounded-[1.25rem] bg-blue-50 flex items-center justify-center text-blue-600 font-black text-3xl">
                  {selectedClient.name.charAt(0)}
                </div>
              </div>
            </div>
            
            <div className="pt-16 px-8 pb-8">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {isEditingClient ? (
                    <input 
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                      className="text-2xl font-black text-gray-900 tracking-tight bg-gray-50 border-b-2 border-blue-500 outline-none w-full"
                    />
                  ) : (
                    <>
                      <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedClient.name}</h3>
                      <p className="text-blue-600 font-bold text-sm">Regular Patient</p>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isEditingClient && (
                    <button 
                      onClick={() => setIsEditingClient(true)}
                      className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                  <a href={`tel:${selectedClient.phone}`} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all">
                    <Phone className="w-5 h-5" />
                  </a>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone Number</p>
                  {isEditingClient ? (
                    <input 
                      type="text"
                      value={editData.phone}
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                      className="text-gray-900 font-bold bg-transparent border-b border-blue-200 outline-none w-full"
                    />
                  ) : (
                    <p className="text-gray-900 font-bold">{selectedClient.phone || 'Not provided'}</p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Comments / Clinical Notes</p>
                  {isEditingClient ? (
                    <textarea 
                      value={editData.notes}
                      onChange={(e) => setEditData({...editData, notes: e.target.value})}
                      placeholder="Add clinical notes..."
                      className="text-gray-900 font-medium bg-transparent border-b border-blue-200 outline-none w-full min-h-[80px] resize-none py-1"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium text-sm leading-relaxed italic">
                      {selectedClient.notes || 'No notes added...'}
                    </p>
                  )}
                </div>

                {!isEditingClient && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Appointment</p>
                      <p className="text-gray-900 font-bold">{selectedClient.time}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Procedure</p>
                      <p className="text-gray-900 font-bold truncate">{selectedClient.type}</p>
                    </div>
                  </div>
                )}
              </div>

              {isEditingClient ? (
                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setIsEditingClient(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUpdateClient}
                    disabled={isSubmitting}
                    className="flex-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mt-8">
                  <button 
                    onClick={() => {
                      if (onViewChart && selectedClient.customerId) {
                        onViewChart({
                          id: selectedClient.customerId,
                          name: selectedClient.name
                        });
                        setSelectedClient(null);
                      } else {
                        showNotification('Patient profile not linked', 'error');
                      }
                    }}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Activity className="w-5 h-5" />
                    Open Medical Chart
                  </button>
                  <button 
                    onClick={() => setSelectedClient(null)}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/10 active:scale-95"
                  >
                    Close Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scheduler;
