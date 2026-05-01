import React from 'react';
import { Calendar as CalendarIcon, Users, MapPin } from 'lucide-react';

const AcademicScheduler = () => {
  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm min-h-[500px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Academic Schedule</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Manage group classes and individual lessons</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors border border-gray-200">Today</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95">
            + New Lesson
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Placeholder for calendar/scheduler view */}
        <div className="lg:col-span-3 bg-gray-50 rounded-[2rem] border border-gray-100 p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">Scheduler UI will be integrated here.</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-black text-gray-900 text-lg">Upcoming Today</h3>
          {/* Sample Lesson Card */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">10:00 AM - 11:30 AM</p>
            <h4 className="font-bold text-gray-900">Advanced Piano (Group)</h4>
            <div className="flex items-center gap-3 mt-3 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5"/> 5 Students</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> Room A2</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-emerald-500">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">13:00 PM - 14:00 PM</p>
            <h4 className="font-bold text-gray-900">Vocal Training</h4>
            <div className="flex items-center gap-3 mt-3 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5"/> 1 Student</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> Studio 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicScheduler;
