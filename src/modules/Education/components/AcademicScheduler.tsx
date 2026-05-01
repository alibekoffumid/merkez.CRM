import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Users, MapPin, Plus, X, Loader2, Book, CheckCircle2 } from 'lucide-react';
import { useEducation } from '../hooks/useEducation';
import { supabase } from '../../../supabaseClient';

const AcademicScheduler = () => {
  const { t } = useTranslation();
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
    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm min-h-[500px] relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">{t('education.academicSchedule')}</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">{t('education.manageClasses')}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors border border-gray-200">{t('education.today')}</button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> {t('education.newLesson')}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Placeholder for calendar/scheduler view */}
        <div className="lg:col-span-3 bg-gray-50 rounded-[2rem] border border-gray-100 p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">{t('education.schedulerPlaceholder')}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-black text-gray-900 text-lg">{t('education.upcomingToday')}</h3>
          
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
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
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
