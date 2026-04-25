import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  Activity, 
  Calendar as CalendarIcon,
  Search,
  Filter,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DentalService } from '../../../services/DentalService';

export const doctors = [
  { id: 1, name: 'Dr. Sarah Wilson', specialty: 'Orthodontist', color: 'bg-blue-500', glow: 'shadow-blue-500/20', avatar: 'SW' },
  { id: 2, name: 'Dr. James Chen', specialty: 'General Dentist', color: 'bg-emerald-500', glow: 'shadow-emerald-500/20', avatar: 'JC' },
  { id: 3, name: 'Dr. Elena Rossi', specialty: 'Oral Surgeon', color: 'bg-purple-500', glow: 'shadow-purple-500/20', avatar: 'ER' },
];

const timeSlots = Array.from({ length: 11 }, (_, i) => `${9 + i}:00`);

const Scheduler = () => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [currentDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const dateString = currentDate.toISOString().split('T')[0];
      const data = await DentalService.getAppointments(dateString);
      
      // Map doctor_name to doctorId for UI matching
      const mappedAppointments = data.map(app => {
        const doc = doctors.find(d => d.name === app.doctor_name);
        return {
          id: app.id,
          doctorId: doc ? doc.id : 1, // Fallback to 1
          patient: app.patient?.name || 'Unknown',
          time: app.start_time.substring(0, 5), // "09:00:00" -> "09:00"
          duration: app.duration_minutes,
          type: app.procedure_type,
          status: app.status
        };
      });
      
      setAppointments(mappedAppointments);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + days);
    setCurrentDate(newDate);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col h-[850px] font-sans">
      {/* Premium Header */}
      <div className="p-8 border-b border-gray-100 flex flex-col lg:flex-row items-start lg:items-center justify-between bg-gray-50/50 backdrop-blur-xl sticky top-0 z-30 gap-6">
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
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-3 shadow-xl shadow-blue-600/20 active:scale-95">
            <Plus className="w-5 h-5" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Fixed Header Row */}
        <div className="flex bg-white/90 backdrop-blur-xl border-b border-gray-100 z-30 sticky top-0">
          {/* Time Placeholder */}
          <div className="w-24 shrink-0 border-r border-gray-100 bg-gray-50/50 flex items-center justify-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</span>
          </div>
          {/* Doctor Headers */}
          <div className="flex-1 flex min-w-[1200px]">
            {doctors.map(doctor => (
              <div key={doctor.id} className="flex-1 border-r border-gray-100 p-5 flex flex-col items-center justify-center h-[140px]">
                <div className={`w-12 h-12 rounded-2xl ${doctor.color} ${doctor.glow} flex items-center justify-center text-xs font-black text-white shadow-lg mb-3`}>
                  {doctor.avatar}
                </div>
                <span className="text-sm font-black text-gray-900 tracking-tight">{doctor.name}</span>
                <span className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1">{doctor.specialty}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Slots Area */}
        <div className="flex-1 overflow-auto no-scrollbar bg-gray-50/30 relative">
          <div className="flex min-w-[1200px] h-full">
            {/* Time Gutter */}
            <div className="w-24 shrink-0 border-r border-gray-100 bg-gray-50/50">
              {timeSlots.map(time => (
                <div key={time} className="h-24 flex items-start justify-center pt-2 border-b border-gray-50">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{time}</span>
                </div>
              ))}
            </div>

            {/* Columns Area */}
            <div className="flex-1 flex relative">
              {doctors.map(doctor => (
                <div key={doctor.id} className="flex-1 border-r border-gray-100 relative">
                  {/* Slots */}
                  {timeSlots.map(time => (
                    <div key={time} className="h-24 border-b border-gray-50 group/slot hover:bg-blue-50/30 transition-colors flex items-center justify-center">
                      <button className="w-10 h-10 rounded-full bg-white opacity-0 group-hover/slot:opacity-100 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all scale-75 group-hover/slot:scale-100 shadow-sm border border-gray-100">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  {/* Appointments */}
                  <div className="absolute inset-0 pointer-events-none">
                    {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>}
                    {!loading && appointments.filter(app => app.doctorId === doctor.id).map(app => {
                      const startHour = parseInt(app.time.split(':')[0]);
                      const startMin = parseInt(app.time.split(':')[1]);
                      const top = ((startHour - 9) * 96) + (startMin / 60 * 96);
                      const height = (app.duration / 60) * 96;

                      const statusColors = {
                        CONFIRMED: 'from-emerald-50 to-emerald-100/30 border-emerald-200 text-emerald-700 shadow-emerald-100/50',
                        IN_PROGRESS: 'from-blue-50 to-blue-100/30 border-blue-200 text-blue-700 shadow-blue-100/50',
                        SCHEDULED: 'from-gray-50 to-gray-100/30 border-gray-200 text-gray-700 shadow-gray-100/50',
                      };

                      return (
                        <div 
                          key={app.id}
                          className={`absolute left-3 right-3 rounded-2xl p-4 border transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer pointer-events-auto bg-gradient-to-br ${statusColors[app.status] || statusColors.SCHEDULED} group/app shadow-sm z-10`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="text-sm font-black tracking-tight truncate">{app.patient}</h4>
                              <button className="opacity-0 group-hover/app:opacity-100 transition-opacity p-1 hover:bg-black/5 rounded-lg">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-auto">
                              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest opacity-70">
                                <Clock className="w-3 h-3" /> {app.time}
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest opacity-70">
                                <Activity className="w-3 h-3" /> {app.type}
                              </div>
                            </div>
                            {app.status === 'IN_PROGRESS' && (
                              <div className="absolute top-4 right-4 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
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
              <div className="absolute top-[350px] left-0 right-0 h-[2px] bg-red-500/50 z-20 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                <div className="absolute -left-1 -top-[4px] w-2.5 h-2.5 rounded-full bg-red-500 shadow-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
