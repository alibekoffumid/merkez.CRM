import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Users, MapPin, Plus, X, Loader2, Book, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { useEducation } from '../hooks/useEducation';
import { supabase } from '../../../supabaseClient';
import TimePicker from '../../../components/Common/TimePicker';
import DatePicker from '../../../components/Common/DatePicker';
import ModalPortal from '../../../components/Common/ModalPortal';
import ConfirmModal from '../../../components/Common/ConfirmModal';

interface AcademicSchedulerProps {
  initialTeacherId?: string | null;
}

const AcademicScheduler: React.FC<AcademicSchedulerProps> = ({ initialTeacherId = null }) => {
  const { t, i18n } = useTranslation();
  const { courses, students, lessons, refreshAll, rooms, teachers, groups, groupStudents, tenantId, enrollments } = useEducation();
  
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

  const getDayName = (date: Date) => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return days[date.getDay()];
  };

  const hexToRgba = (hex: string, alpha: number) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const [formData, setFormData] = useState({
    courseId: '',
    teacherId: '',
    teacherName: '',
    room: '',
    date: getLocalDateString(new Date()),
    startTime: '10:00',
    endTime: '11:00',
    groupId: ''
  });

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string | null>(initialTeacherId);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [is24Hour, setIs24Hour] = useState(() => {
    const saved = localStorage.getItem('timeFormat');
    return saved ? saved === '24h' : true;
  });

  const toggleTimeFormat = () => {
    const newVal = !is24Hour;
    setIs24Hour(newVal);
    localStorage.setItem('timeFormat', newVal ? '24h' : '12h');
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (is24Hour) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

    // Unified Event Calculation for Selected Date
    const dayEvents = React.useMemo(() => {
      const selectedDateStr = getLocalDateString(selectedDate);
      
      // 1. Lessons
      const dayLessons = lessons.filter(l => {
        const lessonDate = new Date(l.start_time);
        return getLocalDateString(lessonDate) === selectedDateStr;
      });
      
      // 2. Virtual Shifts
    const virtualShifts: any[] = [];
    const dayName = getDayName(selectedDate);
    
    teachers.forEach(teacher => {
      if (selectedTeacherFilter && teacher.id !== selectedTeacherFilter) return;
      
      const config = teacher.working_hours?.[dayName];
      if (config?.active && config.start && config.end) {
        const start = new Date(`${getLocalDateString(selectedDate)}T${config.start}:00`);
        const end = new Date(`${getLocalDateString(selectedDate)}T${config.end}:00`);
        
        virtualShifts.push({
          id: `shift-${teacher.id}`,
          isShift: true,
          teacher_id: teacher.id,
          teacher_name: `${teacher.first_name} ${teacher.last_name}`,
          title: teacher.specialization || t('education.workingShift', 'İş Saatları'),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          room: teacher.room_id || '',
          students_count: enrollments.filter((e: any) => e.teacher_id === teacher.id).length // Approximate for shifts
        });
      }
    });

    const dayEventsWithMetadata = dayLessons.map(l => {
      const group = groups?.find(g => g.id === l.group_id);
      const groupStuds = groupStudents?.filter(gs => gs.group_id === l.group_id) || [];
      return {
        ...l,
        title: group ? group.name : (l.education_courses?.title || l.title),
        students_count: l.group_id ? groupStuds.length : (enrollments?.filter((e: any) => e.course_id === l.course_id).length || 0)
      };
    });

    const allItems = [...dayEventsWithMetadata, ...virtualShifts].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Apply teacher filter here so it's consistent
    return selectedTeacherFilter 
      ? allItems.filter(item => {
          const tId = item.isShift ? item.teacher_id : item.teacher_id;
          return tId === selectedTeacherFilter;
        })
      : allItems;
  }, [lessons, teachers, selectedDate, selectedTeacherFilter, enrollments, groups, groupStudents, t]);

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
        end_time: endDateTime,
        group_id: formData.groupId || null
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
          endTime: '11:00',
          groupId: ''
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
    
    const formatToHHmm = (date: Date) => {
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };

    setFormData({
      courseId: lesson.course_id,
      teacherId: lesson.teacher_id || '',
      teacherName: lesson.teacher_name,
      room: lesson.room,
      date: getLocalDateString(start),
      startTime: formatToHHmm(start),
      endTime: formatToHHmm(end),
      groupId: lesson.group_id || ''
    });

    setEditingLessonId(lesson.id);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-[500px] relative">
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
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.group', 'Qrup')}</label>
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setShowProgramDropdown(!showProgramDropdown)}
                      className="w-full p-4 pl-12 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900 text-left flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <span>{groups?.find((g: any) => g.id === formData.groupId)?.name || t('education.selectGroup', 'Qrup seçin')}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showProgramDropdown ? 'rotate-90' : ''}`} />
                    </button>

                    {showProgramDropdown && (
                      <>
                        <div className="fixed inset-0 z-[490]" onClick={() => setShowProgramDropdown(false)} />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[500] py-2 max-h-60 overflow-y-auto no-scrollbar animate-in zoom-in-95 fade-in duration-200 origin-top">
                          {groups?.map((g: any) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData, 
                                  groupId: g.id,
                                  courseId: g.course_id,
                                  teacherId: g.teacher_id || formData.teacherId,
                                  teacherName: g.teacher_id ? `${teachers.find(t => t.id === g.teacher_id)?.first_name} ${teachers.find(t => t.id === g.teacher_id)?.last_name}` : formData.teacherName
                                });
                                setShowProgramDropdown(false);
                              }}
                              className={`w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 ${formData.groupId === g.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 ${formData.groupId === g.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                <Users className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">{g.name}</span>
                                <span className="text-[10px] text-gray-400">{g.education_courses?.title}</span>
                              </div>
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
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold">{teacher.first_name} {teacher.last_name}</span>
                                    <span className="text-[10px] text-gray-400">{teacher.specialization}</span>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-400 text-xs">{t('education.noTeachersAvailable')}</div>
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
                          {rooms?.find(r => r.id === formData.room)?.name || formData.room || t('education.selectRoom')}
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
                                    setFormData({
                                      ...formData, 
                                      room: room.id
                                    });
                                    setShowRoomDropdown(false);
                                  }}
                                  className={`w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 ${formData.room === room.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 ${formData.room === room.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                    <MapPin className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold">{room.name}</span>
                                    <span className="text-[10px] text-gray-400">{room.capacity} {t('education.seats')}</span>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-400 text-xs">{t('education.noRoomsAvailable')}</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.date')}</label>
                    <DatePicker
                      value={formData.date}
                      onChange={(date) => setFormData({ ...formData, date })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.startTime')}</label>
                      <TimePicker
                        value={formData.startTime}
                        onChange={(startTime) => setFormData({ ...formData, startTime })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.endTime')}</label>
                      <TimePicker
                        value={formData.endTime}
                        onChange={(endTime) => setFormData({ ...formData, endTime })}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold animate-in slide-in-from-top-2">
                    {error}
                  </div>
                )}

                <div className="pt-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-gray-50 text-gray-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || success}
                    className={`flex-1 py-4 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2
                      ${success ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}
                      ${isSubmitting ? 'opacity-80 cursor-not-allowed' : 'active:scale-95'}
                    `}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : success ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      t('common.save')
                    )}
                  </button>
                </div>

                {editingLessonId && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full py-4 text-red-500 text-xs font-black uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-all"
                  >
                    {t('common.delete')}
                  </button>
                )}
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <div className="sticky top-20 z-[200] bg-gray-50/95 backdrop-blur-md -mx-4 px-4 py-4 mb-8 border-b border-gray-200/50 flex flex-col sm:flex-row justify-between items-center gap-4 isolate">
        <div className="flex-1 flex flex-wrap items-center gap-3 py-1">
          <div className="flex items-center gap-2 mr-4 shrink-0">
            <div className={`w-2 h-2 rounded-full ${isSameDay(selectedDate, new Date()) ? 'bg-blue-600 animate-pulse' : 'bg-gray-400'}`} />
            <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">
              {isSameDay(selectedDate, new Date()) ? t('education.upcomingToday') : t('education.daySchedule', 'Günün Cədvəli')}
            </h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {dayEvents.filter(item => !item.isShift).length > 0 ? (
              dayEvents.filter(item => !item.isShift).map((item: any, index: number) => {
                const timeString = formatTime(item.start_time);
                
                // Get Teacher Color
                const teacherId = item.isShift ? item.id.replace('shift-', '') : item.teacher_id;
                const teacher = teachers.find(t => t.id === teacherId);
                const teacherColor = teacher?.color || '#3b82f6';
                
                return (
                  <div 
                    key={item.id} 
                    onClick={() => !item.isShift && handleEdit(item)}
                    className={`group relative flex items-center gap-3 bg-white pl-1.5 pr-4 py-1.5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-95 h-[40px] shrink-0 ${!item.isShift ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                  >
                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: teacherColor }} />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-900 leading-none">{timeString}</span>
                        <span className="text-xs font-bold text-gray-700 truncate leading-none max-w-[120px]">
                          {item.title}
                        </span>
                      </div>
                    </div>

                    {/* Premium Popup Card on Hover */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[1000] pointer-events-none scale-90 group-hover:scale-100 origin-top p-5 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] border border-gray-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black" style={{ backgroundColor: hexToRgba(teacherColor, 0.1), color: teacherColor }}>
                          {item.teacher_name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black uppercase tracking-widest text-gray-400 mb-0.5">
                            {item.isShift ? t('education.workingShift', 'İş Saatları') : t('education.lesson', 'Dərs')}
                          </span>
                          <h4 className="text-xs font-black text-gray-900 truncate">
                            {item.group_id ? groups.find(g => g.id === item.group_id)?.name : item.title}
                          </h4>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('education.teacher', 'Müəllim')}</span>
                            <span className="text-xs font-bold text-gray-900">{item.teacher_name}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-gray-50 rounded-2xl flex flex-col justify-between min-h-[60px]">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Users className="w-3 h-3 text-gray-400" />
                              <span className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">{t('education.students', 'Tələbələr')}</span>
                            </div>
                            <div className="text-xs font-bold text-gray-900 leading-none">
                              {item.group_id ? (
                                <div className="flex flex-col gap-0.5">
                                  {groupStudents.filter(gs => gs.group_id === item.group_id).slice(0, 2).map((gs, idx) => (
                                    <div key={idx} className="truncate">{gs.education_students?.first_name} {gs.education_students?.last_name[0]}.</div>
                                  ))}
                                  {groupStudents.filter(gs => gs.group_id === item.group_id).length > 2 && (
                                    <div className="text-[9px] text-gray-400">+{groupStudents.filter(gs => gs.group_id === item.group_id).length - 2} daha</div>
                                  )}
                                </div>
                              ) : (
                                `${item.students_count || 0} ${t('education.people', 'nəfər')}`
                              )}
                            </div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-2xl flex flex-col justify-between min-h-[60px]">
                            <div className="flex items-center gap-2 mb-1.5">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">{t('education.room', 'Otaq')}</span>
                            </div>
                            <div className="text-xs font-bold text-gray-900 truncate leading-none">{rooms?.find((r: any) => r.id === (item.room || teacher?.room_id))?.name || item.room || t('education.notAssigned', 'Yoxdur')}</div>
                          </div>
                        </div>

                        <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-blue-400 uppercase tracking-widest">{t('education.time', 'Vaxt')}</span>
                          </div>
                          <p className="text-xs font-black text-blue-600">{formatTime(item.start_time)} - {formatTime(item.end_time)}</p>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-0.5 w-4 h-4 bg-white border-l border-t border-gray-100 rotate-45" />
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
          <button 
            onClick={toggleTimeFormat}
            className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors border border-gray-200"
          >
            {is24Hour ? '24H' : '12H'}
          </button>
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
            <button
              onClick={() => setShowTeacherDropdown(!showTeacherDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all border border-gray-200 outline-none hover:shadow-sm group"
            >
              <Users className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span>
                {selectedTeacherFilter 
                  ? teachers.find(t => t.id === selectedTeacherFilter)?.first_name + ' ' + teachers.find(t => t.id === selectedTeacherFilter)?.last_name
                  : t('education.allTeachers', 'Bütün müəllimlər')}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showTeacherDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showTeacherDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTeacherDropdown(false)} />
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 max-h-64 overflow-y-auto no-scrollbar">
                    <button
                      onClick={() => {
                        setSelectedTeacherFilter(null);
                        setShowTeacherDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${!selectedTeacherFilter ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold">{t('education.allTeachers', 'Bütün müəllimlər')}</span>
                    </button>

                    {teachers.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTeacherFilter(t.id);
                          setShowTeacherDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${selectedTeacherFilter === t.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px] uppercase">
                          {t.first_name[0]}{t.last_name[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{t.first_name} {t.last_name}</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{t.specialization}</span>
                        </div>
                      </button>
                    ))}
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
            onClick={() => {
              setEditingLessonId(null);
              setFormData({
                courseId: '',
                teacherId: '',
                teacherName: '',
                room: '',
                date: getLocalDateString(selectedDate),
                startTime: '10:00',
                endTime: '11:00',
                groupId: ''
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
                  let hourLabel = `${hour}:00`;
                  if (!is24Hour) {
                    const h12 = hour % 12 || 12;
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    hourLabel = `${h12} ${ampm}`;
                  }
                  return (
                    <div key={i} className="absolute w-full group/slot" style={{ top: `${i * 80}px`, height: '80px' }}>
                      {/* Hour Line */}
                      <div className="absolute top-0 left-0 right-0 border-t border-gray-50">
                        <span className="absolute -left-12 -top-2.5 text-[10px] font-black text-gray-400 w-10 text-right">
                          {hourLabel}
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
                              date: getLocalDateString(selectedDate),
                              groupId: ''
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
                  <span className="absolute -left-12 -top-2.5 text-[10px] font-black text-gray-400 w-10 text-right">
                    {(() => {
                      const hour = (START_HOUR + TOTAL_HOURS) % 24;
                      if (is24Hour) return `${hour}:00`;
                      const h12 = hour % 12 || 12;
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      return `${h12} ${ampm}`;
                    })()}
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

                {/* Render Lessons & Working Shifts */}
                {(() => {
                  // Use the pre-calculated and filtered dayEvents from useMemo
                  const items = dayEvents;

                  // 4. Calculate Columns for Layout (overlapping items)
                  const columns: any[][] = [];
                  items.forEach(item => {
                    let placed = false;
                    for (let i = 0; i < columns.length; i++) {
                      const lastInCol = columns[i][columns[i].length - 1];
                      if (new Date(item.start_time).getTime() >= new Date(lastInCol.end_time).getTime()) {
                        columns[i].push(item);
                        placed = true;
                        break;
                      }
                    }
                    if (!placed) columns.push([item]);
                  });

                  const itemToLayout = new Map();
                  columns.forEach((col, colIdx) => {
                    col.forEach(item => {
                      itemToLayout.set(item.id, { colIdx, totalCols: columns.length });
                    });
                  });

                  return items.map((item: any, i: number) => {
                    const startDate = new Date(item.start_time);
                    const endDate = new Date(item.end_time);
                    
                    const startDec = startDate.getHours() + startDate.getMinutes() / 60;
                    const endDec = endDate.getHours() + endDate.getMinutes() / 60;
                    
                    const top = Math.max(0, (startDec - START_HOUR) * 80);
                    const height = Math.max(20, (endDec - startDec) * 80);
                    
                    const layout = itemToLayout.get(item.id) || { colIdx: 0, totalCols: 1 };
                    const widthPercent = 100 / layout.totalCols;
                    const leftPercent = layout.colIdx * widthPercent;

                    // Get Teacher Color
                    const teacherId = item.isShift ? item.id.replace('shift-', '') : item.teacher_id;
                    const teacher = teachers.find(t => t.id === teacherId);
                    const teacherColor = teacher?.color || '#3b82f6';

                    const formatItemTime = (date: Date) => {
                      if (is24Hour) {
                        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                      }
                      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                    };

                    if (item.isShift) {
                      return (
                        <div 
                          key={item.id} 
                          className="absolute rounded-xl border p-3 shadow-sm transition-all overflow-hidden z-0"
                          style={{ 
                            top: `${top}px`, 
                            height: `${height}px`,
                            left: `${leftPercent}%`,
                            width: `calc(${widthPercent}% - 4px)`,
                            marginLeft: '2px',
                            marginRight: '2px',
                            borderStyle: 'dashed',
                            borderColor: hexToRgba(teacherColor, 0.4),
                            backgroundColor: hexToRgba(teacherColor, 0.05)
                          }}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: teacherColor }} />
                              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: teacherColor }}>{item.title}</span>
                            </div>
                            <span className="text-[9px] font-black opacity-60" style={{ color: teacherColor }}>
                              {formatItemTime(startDate)} - {formatItemTime(endDate)}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs truncate" style={{ color: teacherColor }}>{item.teacher_name}</h4>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={item.id} 
                        onClick={() => handleEdit(item)}
                        className="absolute rounded-xl border p-3 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer overflow-hidden z-[20] bg-white"
                        style={{ 
                          top: `${top}px`, 
                          height: `${height}px`,
                          left: `${leftPercent}%`,
                          width: `calc(${widthPercent}% - 4px)`,
                          marginLeft: '2px',
                          marginRight: '2px',
                          borderLeft: `4px solid ${teacherColor}`,
                          borderColor: hexToRgba(teacherColor, 0.2),
                          backgroundColor: hexToRgba(teacherColor, 0.02)
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: teacherColor }}>
                              {item.education_courses?.title || item.title}
                            </span>
                            <span className="text-[9px] font-bold text-gray-500">
                              {formatItemTime(startDate)} - {formatItemTime(endDate)}
                            </span>
                          </div>
                          <div className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center border border-gray-50 shrink-0">
                             <Book className="w-3 h-3" style={{ color: teacherColor }} />
                          </div>
                        </div>
                        <h4 className="font-bold text-xs truncate text-gray-900 mb-1">{item.teacher_name}</h4>
                        <div className="flex items-center gap-1.5 mt-auto">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] font-bold text-gray-500 truncate">{item.room || t('education.noRoom', 'Otaq qeyd olunmayıb')}</span>
                        </div>
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
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.group', 'Qrup')}</label>
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setShowProgramDropdown(!showProgramDropdown)}
                      className="w-full p-4 pl-12 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900 text-left flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <span>{groups?.find((g: any) => g.id === formData.groupId)?.name || t('education.selectGroup', 'Qrup seçin')}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showProgramDropdown ? 'rotate-90' : ''}`} />
                    </button>

                    {showProgramDropdown && (
                      <>
                        <div className="fixed inset-0 z-[490]" onClick={() => setShowProgramDropdown(false)} />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[500] py-2 max-h-60 overflow-y-auto no-scrollbar animate-in zoom-in-95 fade-in duration-200 origin-top">
                          {groups?.map((g: any) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData, 
                                  groupId: g.id,
                                  courseId: g.course_id,
                                  teacherId: g.teacher_id || formData.teacherId,
                                  teacherName: g.teacher_id ? `${teachers.find(t => t.id === g.teacher_id)?.first_name} ${teachers.find(t => t.id === g.teacher_id)?.last_name}` : formData.teacherName
                                });
                                setShowProgramDropdown(false);
                              }}
                              className={`w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 ${formData.groupId === g.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 ${formData.groupId === g.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                <Users className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">{g.name}</span>
                                <span className="text-[10px] text-gray-400">{g.education_courses?.title}</span>
                              </div>
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
                    is24Hour={is24Hour}
                  />
                  <TimePicker 
                    label={t('education.endTime')}
                    value={formData.endTime}
                    onChange={(val) => setFormData({...formData, endTime: val})}
                    position="top"
                    is24Hour={is24Hour}
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
    </div>
  );
};

export default AcademicScheduler;
