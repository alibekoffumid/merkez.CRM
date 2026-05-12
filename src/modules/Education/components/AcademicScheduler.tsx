import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Users, MapPin, Plus, X, Loader2, Book, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { useEducation } from '../hooks/useEducation';
import { supabase } from '../../../supabaseClient';
import TimePicker from '../../../components/Common/TimePicker';
import DatePicker from '../../../components/Common/DatePicker';
import ConfirmModal from '../../../components/Common/ConfirmModal';

const AcademicScheduler = () => {
  const { t, i18n } = useTranslation();
  const { courses, students, lessons, refreshAll, rooms, teachers, tenantId } = useEducation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    courseId: '',
    teacherId: '',
    teacherName: '',
    room: '',
    date: getLocalDateString(new Date()),
    startTime: '10:00',
    endTime: '11:00'
  });

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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



  const dayLessons = lessons?.filter(l => isSameDay(new Date(l.start_time), selectedDate)) || [];
  const START_HOUR = 0;
  const TOTAL_HOURS = 24; // 24-hour view

  const getRoomName = (roomValue: string) => {
    if (!roomValue) return '—';
    const room = rooms?.find(r => r.id === roomValue);
    return room ? room.name : roomValue;
  };

  const isTeacherAvailable = (teacherId: string, date: string, start: string, end: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher || !teacher.working_hours) return true;
    
    const d = new Date(date);
    const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()];
    const config = teacher.working_hours[dayName];
    
    if (!config || !config.active) return false;
    
    // Compare times HH:mm
    return start >= config.start && end <= config.end;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId || !formData.teacherName || !formData.room) return;
    
    setIsSubmitting(true);
    setError('');
    try {
      // Combine date and time
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

      if (!isTeacherAvailable(formData.teacherId, formData.date, formData.startTime, formData.endTime)) {
        if (!window.confirm(t('education.teacherOutsideHours') || 'Müəllim bu saatlarda işləmir. Yenə də davam edilsin?')) {
          setIsSubmitting(false);
          return;
        }
      }

      const lessonData = {
        tenant_id: tenantId || '00000000-0000-0000-0000-000000000000',
        course_id: formData.courseId,
        teacher_id: formData.teacherId,
        teacher_name: formData.teacherName,
        room: formData.room,
        start_time: startDateTime,
        end_time: endDateTime
      };


      let res;
      if (editingLessonId) {
        res = await supabase
          .from('education_lessons')
          .update(lessonData)
          .eq('id', editingLessonId);
      } else {
        res = await supabase
          .from('education_lessons')
          .insert([lessonData]);
      }

      if (res.error) throw res.error;
      
      setSuccess(true);
      refreshAll();
      
      setTimeout(() => {
        setSuccess(false);
        setIsModalOpen(false);
        setEditingLessonId(null);
        setFormData({
          courseId: '',
          teacherId: '',
          teacherName: '',
          room: '',
          date: getLocalDateString(new Date()),
          startTime: '10:00',
          endTime: '11:00'
        });

      }, 2000);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error saving lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingLessonId) return;
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!editingLessonId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('education_lessons')
        .delete()
        .eq('id', editingLessonId);

      if (error) throw error;

      refreshAll();
      setIsModalOpen(false);
      setEditingLessonId(null);
    } catch (err: any) {
      setError(err.message || 'Error deleting lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (lesson: any) => {
    const start = new Date(lesson.start_time);
    const end = new Date(lesson.end_time);
    
    setFormData({
      courseId: lesson.course_id,
      teacherId: lesson.teacher_id || '',
      teacherName: lesson.teacher_name,
      room: lesson.room,
      date: getLocalDateString(start),
      startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      endTime: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    });

    setEditingLessonId(lesson.id);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-[500px] relative">
      <div className="sticky top-20 z-30 bg-gray-50/95 backdrop-blur-md -mx-4 px-4 py-4 mb-8 border-b border-gray-200/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-2 mr-4 shrink-0">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">{t('education.upcomingToday')}</h3>
          </div>
          
          <div className="flex items-center gap-3">
            {lessons?.filter((l: any) => isSameDay(new Date(l.start_time), new Date())).length > 0 ? (
              lessons.filter((l: any) => isSameDay(new Date(l.start_time), new Date())).map((lesson: any, index: number) => {
                const startDate = new Date(lesson.start_time);
                const timeString = `${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-orange-600'];
                const colorClass = colors[index % colors.length];
                
                return (
                  <div 
                    key={lesson.id} 
                    onClick={() => handleEdit(lesson)}
                    className="group flex items-center gap-3 bg-white pl-1.5 pr-4 py-1.5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer h-[40px] shrink-0"
                  >
                    <div className={`w-1 h-6 rounded-full ${colorClass}`} />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-900 leading-none">{timeString}</span>
                        <span className="text-xs font-bold text-gray-700 truncate leading-none max-w-[120px]">{lesson.education_courses?.title}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-gray-100/50 px-4 py-2 rounded-xl border border-dashed border-gray-200 shrink-0">
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{t('education.noLessonsToday')}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
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
                      {t(`common.months.${['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'][calendarViewDate.getMonth()]}`)} {calendarViewDate.getFullYear()}
                    </span>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const d = new Date(calendarViewDate);
                      d.setMonth(d.getMonth() + 1);
                      setCalendarViewDate(d);
                    }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {[
                      t('education.weekdays.mon'),
                      t('education.weekdays.tue'),
                      t('education.weekdays.wed'),
                      t('education.weekdays.thu'),
                      t('education.weekdays.fri'),
                      t('education.weekdays.sat'),
                      t('education.weekdays.sun')
                    ].map(d => (
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
          <div className="relative">
            <select
              value={selectedTeacherFilter || ''}
              onChange={(e) => setSelectedTeacherFilter(e.target.value || null)}
              className="appearance-none px-4 py-2 pl-10 pr-8 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">{t('education.allTeachers', 'Bütün müəllimlər')}</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <button 
            onClick={() => setSelectedDate(new Date())}
            className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors border border-gray-200"
          >
            {t('education.today')}
          </button>
          <button 
            onClick={() => {
              setEditingLessonId(null);
              setFormData({
                courseId: '',
                teacherId: '',
                teacherName: '',
                room: '',
                date: getLocalDateString(selectedDate),
                startTime: '10:00',
                endTime: '11:00'
              });

              setIsModalOpen(true);
            }}
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
                    {t(`education.weekdays.${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()]}`)}
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
                              date: getLocalDateString(selectedDate)
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
                    {`${(START_HOUR + TOTAL_HOURS) % 24}:00`}
                  </span>
                </div>

                {/* Render Teacher Availability Blocks (if a teacher is selected) */}
                {(() => {
                  if (!selectedTeacherFilter) return null;
                  const teacher = teachers.find(t => t.id === selectedTeacherFilter);
                  if (!teacher || !teacher.working_hours) return null;
                  
                  const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][selectedDate.getDay()];
                  const config = teacher.working_hours[dayName];
                  
                  const blocks = [];
                  if (!config || !config.active) {
                    blocks.push({ top: 0, height: TOTAL_HOURS * 80 });
                  } else {
                    const startDec = parseInt(config.start.split(':')[0]) + parseInt(config.start.split(':')[1]) / 60;
                    const endDec = parseInt(config.end.split(':')[0]) + parseInt(config.end.split(':')[1]) / 60;
                    
                    if (startDec > START_HOUR) {
                      blocks.push({ top: 0, height: (startDec - START_HOUR) * 80 });
                    }
                    if (endDec < START_HOUR + TOTAL_HOURS) {
                      const top = (endDec - START_HOUR) * 80;
                      blocks.push({ top, height: ((START_HOUR + TOTAL_HOURS) - endDec) * 80 });
                    }
                  }
                  
                  return (
                    <>
                      {/* Working Shift Background */}
                      {!(!config || !config.active) && (
                        <div 
                          className="absolute left-0 right-0 bg-blue-50/30 border-y border-blue-100/50 pointer-events-none"
                          style={{ 
                            top: `${(parseInt(config.start.split(':')[0]) + parseInt(config.start.split(':')[1]) / 60 - START_HOUR) * 80}px`, 
                            height: `${(parseInt(config.end.split(':')[0]) + parseInt(config.end.split(':')[1]) / 60 - (parseInt(config.start.split(':')[0]) + parseInt(config.start.split(':')[1]) / 60)) * 80}px`, 
                            zIndex: 0 
                          }}
                        >
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 opacity-40">
                            <div className="w-1 h-1 rounded-full bg-blue-500" />
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t('education.workingShift', 'İş Saatları')}</span>
                          </div>
                        </div>
                      )}
                      
                      {blocks.map((b, i) => (
                        <div 
                          key={i} 
                          className="absolute left-0 right-0 bg-gray-100/60 pointer-events-none opacity-50 repeating-linear-gradient" 
                          style={{ 
                            top: `${b.top}px`, 
                            height: `${b.height}px`, 
                            zIndex: 0,
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 20px)'
                          }} 
                        />
                      ))}
                    </>
                  );
                })()}

                {/* Render Lessons */}
                {(() => {
                  const filteredLessons = selectedTeacherFilter 
                    ? dayLessons.filter((l: any) => l.teacher_id === selectedTeacherFilter) 
                    : dayLessons;
                  const sortedDayLessons = [...filteredLessons].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                  const columns: any[][] = [];
                  
                  sortedDayLessons.forEach(lesson => {
                    let placed = false;
                    for (let i = 0; i < columns.length; i++) {
                      const lastInCol = columns[i][columns[i].length - 1];
                      if (new Date(lesson.start_time).getTime() >= new Date(lastInCol.end_time).getTime()) {
                        columns[i].push(lesson);
                        placed = true;
                        break;
                      }
                    }
                    if (!placed) columns.push([lesson]);
                  });

                  const lessonToLayout = new Map();
                  columns.forEach((col, colIdx) => {
                    col.forEach(lesson => {
                      lessonToLayout.set(lesson.id, { colIdx, totalCols: columns.length });
                    });
                  });

                  return sortedDayLessons.map((lesson: any, i: number) => {
                    const startDate = new Date(lesson.start_time);
                    const endDate = new Date(lesson.end_time);
                    
                    const startDec = startDate.getHours() + startDate.getMinutes() / 60;
                    const endDec = endDate.getHours() + endDate.getMinutes() / 60;
                    
                    const top = Math.max(0, (startDec - START_HOUR) * 80);
                    const height = Math.max(20, (endDec - startDec) * 80);
                    
                    const layout = lessonToLayout.get(lesson.id) || { colIdx: 0, totalCols: 1 };
                    const widthPercent = 100 / layout.totalCols;
                    const leftPercent = layout.colIdx * widthPercent;

                    const colors = ['bg-blue-50 border-blue-200 text-blue-700', 'bg-emerald-50 border-emerald-200 text-emerald-700', 'bg-purple-50 border-purple-200 text-purple-700', 'bg-orange-50 border-orange-200 text-orange-700'];
                    const colorClass = colors[i % colors.length];

                    return (
                      <div 
                        key={lesson.id} 
                        onClick={() => handleEdit(lesson)}
                        className={`absolute rounded-xl border p-3 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden ${colorClass}`}
                        style={{ 
                          top: `${top}px`, 
                          height: `${height}px`,
                          left: `${leftPercent}%`,
                          width: `calc(${widthPercent}% - ${layout.totalCols > 1 ? '4px' : '0px'})`,
                          marginLeft: layout.colIdx > 0 ? '4px' : '4px',
                          marginRight: '4px'
                        }}
                      >
                        <h4 className="font-bold text-xs sm:text-sm truncate">{lesson.education_courses?.title}</h4>
                        <p className="text-[10px] opacity-80 mt-0.5 truncate">{lesson.teacher_name} • {getRoomName(lesson.room)}</p>
                      </div>
                    );
                  });
                })()}
                
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

      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl relative z-10 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col">
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
                <h2 className="text-2xl font-black text-gray-900">{editingLessonId ? t('education.editLesson') : t('education.newLesson')}</h2>
                <p className="text-gray-500 text-sm mt-1">{t('education.manageClasses')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.programOrCourse')}</label>
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setShowProgramDropdown(!showProgramDropdown)}
                      className="w-full p-4 pl-12 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900 text-left flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        < Book className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <span>{courses?.find((c: any) => c.id === formData.courseId)?.title || t('education.selectProgram')}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showProgramDropdown ? 'rotate-90' : ''}`} />
                    </button>

                    {showProgramDropdown && (
                      <>
                        <div className="fixed inset-0 z-[490]" onClick={() => setShowProgramDropdown(false)} />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[500] py-2 max-h-60 overflow-y-auto no-scrollbar animate-in zoom-in-95 fade-in duration-200 origin-top">
                          {courses?.map((c: any) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, courseId: c.id});
                                setShowProgramDropdown(false);
                              }}
                              className={`w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 ${formData.courseId === c.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 ${formData.courseId === c.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                <Book className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-bold">{c.title}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.teacherName')}</label>
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setShowTeacherDropdown(!showTeacherDropdown)}
                        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900 flex items-center justify-between"
                      >
                        <span className={formData.teacherName ? 'text-gray-900' : 'text-gray-400'}>
                          {formData.teacherName || t('education.selectTeacher')}
                        </span>
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showTeacherDropdown ? 'rotate-90' : ''}`} />
                      </button>

                      {showTeacherDropdown && (
                        <>
                          <div className="fixed inset-0 z-[490]" onClick={() => setShowTeacherDropdown(false)} />
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[500] py-2 max-h-48 overflow-y-auto no-scrollbar animate-in zoom-in-95 fade-in duration-200 origin-top">
                            {teachers?.length > 0 ? (
                              teachers.map((teacher: any) => (
                                <button
                                  key={teacher.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData, 
                                      teacherId: teacher.id,
                                      teacherName: `${teacher.first_name} ${teacher.last_name}`
                                    });
                                    setShowTeacherDropdown(false);
                                  }}
                                  className={`w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 ${formData.teacherId === teacher.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 ${formData.teacherId === teacher.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                    <Users className="w-4 h-4" />
                                  </div>
                                  <span className="text-sm font-bold">{teacher.first_name} {teacher.last_name}</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-5 py-3 text-xs text-gray-400 italic">{t('education.noTeachersAvailable')}</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.room')}</label>
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900 flex items-center justify-between"
                      >
                        <span className={formData.room ? 'text-gray-900' : 'text-gray-400'}>
                          {formData.room ? rooms?.find(r => r.id === formData.room)?.name || formData.room : t('education.selectRoom')}
                        </span>
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showRoomDropdown ? 'rotate-90' : ''}`} />
                      </button>

                      {showRoomDropdown && (
                        <>
                          <div className="fixed inset-0 z-[490]" onClick={() => setShowRoomDropdown(false)} />
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[500] py-2 max-h-48 overflow-y-auto no-scrollbar animate-in zoom-in-95 fade-in duration-200 origin-top">
                            {rooms?.length > 0 ? (
                              rooms.map((room: any) => (
                                <button
                                  key={room.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({...formData, room: room.id});
                                    setShowRoomDropdown(false);
                                  }}
                                  className={`w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 ${formData.room === room.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 ${formData.room === room.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                    <MapPin className="w-4 h-4" />
                                  </div>
                                  <span className="text-sm font-bold">{room.name}</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-5 py-3 text-xs text-gray-400 italic">{t('education.noRoomsAvailable')}</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DatePicker 
                    label={t('restaurant.date') || 'Date'}
                    value={formData.date}
                    onChange={(val) => setFormData({...formData, date: val})}
                    position="top"
                  />
                  <TimePicker 
                    label={t('education.startTime')}
                    value={formData.startTime}
                    onChange={(val) => setFormData({...formData, startTime: val})}
                    position="top"
                  />
                  <TimePicker 
                    label={t('education.endTime')}
                    value={formData.endTime}
                    onChange={(val) => setFormData({...formData, endTime: val})}
                    position="top"
                  />
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
                    className={`flex-1 py-4 px-8 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3
                      ${success ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}
                      ${isSubmitting ? 'opacity-80 cursor-not-allowed' : ''}
                    `}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> {t('education.processing')}</>
                    ) : success ? (
                      <><CheckCircle2 className="w-5 h-5" /> {t('education.savedSuccessfully')}</>
                    ) : (
                      t('common.save')
                    )}
                  </button>
                </div>

                {editingLessonId && (
                  <div className="pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full py-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> {t('common.delete') || 'Delete Lesson'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title={t('education.deleteLesson', 'Dərsi Sil')}
        message={t('education.confirmDeleteLesson', 'Bu dərsi silmək istədiyinizdən əminsiniz?')}
        confirmText={t('common.delete', 'Sil')}
        cancelText={t('common.cancel', 'Ləğv et')}
        isDanger={true}
      />
    </div>
  );
};

export default AcademicScheduler;
