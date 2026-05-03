import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Users, MapPin, Plus, X, Loader2, Book, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEducation } from '../hooks/useEducation';
import { supabase } from '../../../supabaseClient';

const AcademicScheduler = () => {
  const { t, i18n } = useTranslation();
  const { courses, tenantId, lessons, refreshAll } = useEducation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    courseId: '',
    teacherName: '',
    room: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00'
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const getWeekDays = () => {
    const curr = new Date(selectedDate);
    const day = curr.getDay() || 7; // Get current day number, making Sunday (0) into 7
    curr.setHours(0, 0, 0, 0);
    const first = curr.getDate() - day + 1; // First day is the day of the month - the day of the week
    const days = [];
    for (let i = 0; i < 7; i++) {
      const next = new Date(curr.getFullYear(), curr.getMonth(), first + i);
      days.push(next);
    }
    return days;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const dayLessons = lessons?.filter(l => isSameDay(new Date(l.start_time), selectedDate)) || [];
  const START_HOUR = 8;
  const TOTAL_HOURS = 12; // 8 AM to 8 PM

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId || !formData.teacherName || !formData.room) return;
    
    setIsSubmitting(true);
    setError('');
    try {
      // Combine date and time
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

      const { error: insertError } = await supabase.from('education_lessons').insert([{
        tenant_id: tenantId || '00000000-0000-0000-0000-000000000000',
        course_id: formData.courseId,
        teacher_name: formData.teacherName,
        room: formData.room,
        start_time: startDateTime,
        end_time: endDateTime
      }]);

      if (insertError) throw insertError;
      
      setSuccess(true);
      refreshAll();
      
      setTimeout(() => {
        setSuccess(false);
        setIsModalOpen(false);
        setFormData({
          courseId: '',
          teacherName: '',
          room: '',
          date: new Date().toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '11:00'
        });
      }, 2000);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error creating lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[500px] relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">{t('education.academicSchedule')}</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">{t('education.manageClasses')}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button 
              onClick={() => {
                setCalendarViewDate(selectedDate);
                setShowCalendar(!showCalendar);
              }}
              className={`flex items-center justify-center w-10 h-[38px] rounded-xl transition-all border ${showCalendar ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>

            {/* Custom Calendar Popup */}
            {showCalendar && (
              <>
                <div className="fixed inset-0 z-[400]" onClick={() => setShowCalendar(false)}></div>
                <div className="absolute top-full right-0 mt-2 z-[500] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-72 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const d = new Date(calendarViewDate);
                      d.setMonth(d.getMonth() - 1);
                      setCalendarViewDate(d);
                    }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
                    <span className="text-sm font-black text-gray-900 capitalize">
                      {calendarViewDate.toLocaleDateString(i18n.language || 'ru-RU', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const d = new Date(calendarViewDate);
                      d.setMonth(d.getMonth() + 1);
                      setCalendarViewDate(d);
                    }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
                      <span key={d} className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const year = calendarViewDate.getFullYear();
                      const month = calendarViewDate.getMonth();
                      const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const today = new Date();
                      const cells = [];
                      for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} />);
                      for (let day = 1; day <= daysInMonth; day++) {
                        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                        const isSelected = day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
                        cells.push(
                          <button
                            key={day}
                            onClick={() => {
                              setSelectedDate(new Date(year, month, day));
                              setShowCalendar(false);
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                              isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110 z-10' :
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
              </>
            )}
          </div>
          <button 
            onClick={() => setSelectedDate(new Date())}
            className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors border border-gray-200"
          >
            {t('education.today')}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> {t('education.newLesson')}
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-8">
        <div className="w-full flex flex-col h-[800px]">
          {/* Week Navigator */}
          <div className="flex justify-between items-center mb-12">
            {getWeekDays().map((date, i) => {
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center min-w-[3.5rem] py-3 rounded-2xl transition-all ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105' 
                      : isToday 
                        ? 'bg-blue-50 text-blue-600 font-bold' 
                        : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className={`text-[10px] uppercase tracking-widest font-black mb-1 ${isSelected ? 'text-blue-200' : ''}`}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-lg font-black">{date.getDate()}</span>
                </button>
              );
            })}
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto relative no-scrollbar">
            <div className="relative" style={{ height: `${TOTAL_HOURS * 80}px`, marginTop: '10px' }}>
              <div className="absolute top-0 left-12 right-4 bottom-0 border-l border-gray-100">
                {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
                  const hour = START_HOUR + i;
                  return (
                    <div key={i} className="absolute w-full group/slot" style={{ top: `${i * 80}px`, height: '80px' }}>
                      {/* Hour Line */}
                      <div className="absolute top-0 left-0 right-0 border-t border-gray-50">
                        <span className="absolute -left-12 -top-2.5 text-xs font-bold text-gray-400 w-10 text-right">
                          {`${hour}:00`}
                        </span>
                      </div>
                      
                      {/* Hover Interaction & Plus Button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button 
                          onClick={() => {
                            setFormData({
                              ...formData,
                              startTime: `${hour.toString().padStart(2, '0')}:00`,
                              endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                              date: selectedDate.toISOString().split('T')[0]
                            });
                            setIsModalOpen(true);
                          }}
                          className="w-8 h-8 rounded-full bg-white opacity-0 group-hover/slot:opacity-100 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all scale-75 group-hover/slot:scale-100 shadow-sm border border-gray-100 z-20"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Half-hour marker */}
                      <div className="absolute top-10 left-0 right-0 border-t border-gray-50/50 border-dashed" />
                    </div>
                  );
                })}
                
                {/* Final Hour Line */}
                <div className="absolute w-full border-t border-gray-50" style={{ top: `${TOTAL_HOURS * 80}px` }}>
                  <span className="absolute -left-12 -top-2.5 text-xs font-bold text-gray-400 w-10 text-right">
                    {`${START_HOUR + TOTAL_HOURS}:00`}
                  </span>
                </div>

                {/* Render Lessons */}
                {dayLessons.map((lesson: any, i: number) => {
                  const startDate = new Date(lesson.start_time);
                  const endDate = new Date(lesson.end_time);
                  
                  const startDec = startDate.getHours() + startDate.getMinutes() / 60;
                  const endDec = endDate.getHours() + endDate.getMinutes() / 60;
                  
                  const top = Math.max(0, (startDec - START_HOUR) * 80);
                  const height = Math.max(20, (endDec - startDec) * 80);
                  
                  const colors = ['bg-blue-50 border-blue-200 text-blue-700', 'bg-emerald-50 border-emerald-200 text-emerald-700', 'bg-purple-50 border-purple-200 text-purple-700', 'bg-orange-50 border-orange-200 text-orange-700'];
                  const colorClass = colors[i % colors.length];

                  return (
                    <div 
                      key={lesson.id} 
                      className={`absolute left-4 right-4 rounded-xl border p-3 shadow-sm hover:shadow-md transition-shadow overflow-hidden ${colorClass}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <h4 className="font-bold text-sm truncate">{lesson.education_courses?.title}</h4>
                      <p className="text-xs opacity-80 mt-0.5 truncate">{lesson.teacher_name} • {lesson.room}</p>
                    </div>
                  );
                })}
                
                {/* Current Time Indicator (if today) */}
                {isSameDay(selectedDate, new Date()) && (() => {
                  const now = new Date();
                  const nowDec = now.getHours() + now.getMinutes() / 60;
                  if (nowDec >= START_HOUR && nowDec <= START_HOUR + TOTAL_HOURS) {
                    const top = (nowDec - START_HOUR) * 80;
                    return (
                      <div 
                        className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
                        style={{ top: `${top}px` }}
                      >
                        <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <h3 className="col-span-full font-black text-gray-900 text-lg mt-4">{t('education.upcomingToday')}</h3>
          
          {lessons?.length > 0 ? (
            lessons.map((lesson: any, index: number) => {
              const startDate = new Date(lesson.start_time);
              const endDate = new Date(lesson.end_time);
              
              const timeString = `${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
              const colors = ['border-l-blue-500 text-blue-600', 'border-l-emerald-500 text-emerald-600', 'border-l-purple-500 text-purple-600', 'border-l-orange-500 text-orange-600'];
              const colorClass = colors[index % colors.length];
              const textClass = colorClass.split(' ')[1];

              return (
                <div key={lesson.id} className={`bg-white p-4 rounded-2xl border border-gray-100 shadow-sm border-l-4 ${colorClass.split(' ')[0]}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${textClass} mb-1`}>{timeString}</p>
                  <h4 className="font-bold text-gray-900">{lesson.education_courses?.title || 'Course'}</h4>
                  <div className="flex items-center gap-3 mt-3 text-xs font-medium text-gray-500">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5"/> {lesson.teacher_name}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {lesson.room}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
              <p className="text-gray-500 text-sm font-bold">No upcoming lessons today.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl relative z-10 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-50 text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <CalendarIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">{t('education.newLesson')}</h2>
              <p className="text-gray-500 text-sm mt-1">{t('education.manageClasses')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.programOrCourse')}</label>
                <div className="relative">
                  <Book className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select 
                    required
                    value={formData.courseId}
                    onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                    className="w-full p-4 pl-12 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900 appearance-none"
                  >
                    <option value="" disabled>{t('education.selectProgram')}</option>
                    {courses?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.teacherName')}</label>
                  <input 
                    type="text" 
                    required
                    value={formData.teacherName}
                    onChange={(e) => setFormData({...formData, teacherName: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
                    placeholder="e.g. John Doe" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.room')}</label>
                  <input 
                    type="text" 
                    required
                    value={formData.room}
                    onChange={(e) => setFormData({...formData, room: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
                    placeholder="e.g. Studio 1" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('restaurant.date') || 'Date'}</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.startTime')}</label>
                  <input 
                    type="time" 
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.endTime')}</label>
                  <input 
                    type="time" 
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
                  />
                </div>
              </div>

              {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold">{error}</div>}

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-gray-500 font-bold bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || success}
                  className={`flex-1 py-4 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2
                    ${success ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}
                    ${isSubmitting ? 'opacity-80 cursor-not-allowed' : ''}
                  `}
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> {t('education.processing') || 'Processing...'}</>
                  ) : success ? (
                    <><CheckCircle2 className="w-5 h-5" /> {t('education.enrolledSuccessfully') || 'Success!'}</>
                  ) : (
                    t('common.save')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicScheduler;
