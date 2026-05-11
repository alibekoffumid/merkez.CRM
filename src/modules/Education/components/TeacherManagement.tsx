import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, X, Trash2, Edit2, Mail, Phone, GraduationCap, CheckCircle2, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useEducation } from '../hooks/useEducation';
import ModalPortal from '../../../components/Common/ModalPortal';

const TeacherManagement = () => {
  const { t } = useTranslation();
  const { teachers, courses, refreshAll, tenantId } = useEducation();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
    specialization: courses?.[0]?.title || 'Piano',
    salaryType: 'hourly',
    salaryAmount: 20,
    workingHours: {
      mon: { active: true, start: '09:00', end: '18:00' },
      tue: { active: true, start: '09:00', end: '18:00' },
      wed: { active: true, start: '09:00', end: '18:00' },
      thu: { active: true, start: '09:00', end: '18:00' },
      fri: { active: true, start: '09:00', end: '18:00' },
      sat: { active: false, start: '09:00', end: '18:00' },
      sun: { active: false, start: '09:00', end: '18:00' }
    }
  });

  const [showSalaryDropdown, setShowSalaryDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'schedule' | 'finance'>('info');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);


  const [showSpecDropdown, setShowSpecDropdown] = useState(false);
  
  // Use unique titles from courses or fallback to defaults
  const specializations = courses?.length > 0 
    ? Array.from(new Set(courses.map(c => c.title)))
    : ['Piano', 'Vocal', 'Fine Arts', 'Theory', 'Guitar', 'Violin'];

  useEffect(() => {
    if (courses?.length > 0 && !formData.specialization) {
      setFormData(prev => ({ ...prev, specialization: courses[0].title }));
    }
  }, [courses]);

  const getTeacherStats = (teacher: any) => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthLessons = lessons?.filter(l => 
      (l.teacher_id === teacher.id || l.teacher_name === `${teacher.first_name} ${teacher.last_name}`) &&
      new Date(l.start_time) >= firstDay
    ) || [];

    let estimatedEarnings = 0;
    if (teacher.salary_type === 'hourly') {
      const totalHours = monthLessons.reduce((acc, l) => {
        const start = new Date(l.start_time);
        const end = new Date(l.end_time);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);
      estimatedEarnings = totalHours * (teacher.salary_amount || 0);
    } else if (teacher.salary_type === 'fixed') {
      estimatedEarnings = teacher.salary_amount || 0;
    }

    return {
      monthLessonsCount: monthLessons.length,
      estimatedEarnings
    };
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const { error: insertError } = await supabase
        .from('education_teachers')
        .insert([{
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          specialization: formData.specialization,
          tenant_id: tenantId || '00000000-0000-0000-0000-000000000000'
        }]);

      if (insertError) throw insertError;
      
      setSuccess(true);
      refreshAll();
      setTimeout(() => {
        setSuccess(false);
        setIsModalOpen(false);
        setFormData({ 
          firstName: '', 
          lastName: '', 
          email: '', 
          phone: '', 
          specialization: courses?.[0]?.title || 'Piano',
          salaryType: 'hourly',
          salaryAmount: 20,
          workingHours: {
            mon: { active: true, start: '09:00', end: '18:00' },
            tue: { active: true, start: '09:00', end: '18:00' },
            wed: { active: true, start: '09:00', end: '18:00' },
            thu: { active: true, start: '09:00', end: '18:00' },
            fri: { active: true, start: '09:00', end: '18:00' },
            sat: { active: false, start: '09:00', end: '18:00' },
            sun: { active: false, start: '09:00', end: '18:00' }
          }
        });
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    setError('');
    
    try {
      const { error: updateError } = await supabase
        .from('education_teachers')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          specialization: formData.specialization,
          salary_type: formData.salaryType,
          salary_amount: formData.salaryAmount,
          working_hours: formData.workingHours
        })
        .eq('id', selectedTeacher.id);

      if (updateError) throw updateError;
      
      setSuccess(true);
      refreshAll();
      setTimeout(() => {
        setSuccess(false);
        setIsModalOpen(false);
        setSelectedTeacher(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (teacher: any) => {
    setSelectedTeacher(teacher);
    setFormData({
      firstName: teacher.first_name,
      lastName: teacher.last_name,
      email: teacher.email || '',
      phone: teacher.phone || '',
      specialization: teacher.specialization,
      salaryType: teacher.salary_type || 'hourly',
      salaryAmount: teacher.salary_amount || 0,
      workingHours: teacher.working_hours || {
        mon: { active: true, start: '09:00', end: '18:00' },
        tue: { active: true, start: '09:00', end: '18:00' },
        wed: { active: true, start: '09:00', end: '18:00' },
        thu: { active: true, start: '09:00', end: '18:00' },
        fri: { active: true, start: '09:00', end: '18:00' },
        sat: { active: false, start: '09:00', end: '18:00' },
        sun: { active: false, start: '09:00', end: '18:00' }
      }
    });
    setIsModalOpen(true);
  };


  const deleteTeacher = async (id: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    try {
      const { error } = await supabase.from('education_teachers').delete().eq('id', id);
      if (error) throw error;
      refreshAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-20 z-30 bg-gray-50/95 backdrop-blur-md -mx-4 px-4 py-4 mb-6 border-b border-gray-200/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('education.tabTeachers')}</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> {t('education.addTeacher')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.length > 0 ? (
          teachers.map(teacher => {
            const stats = getTeacherStats(teacher);
            return (
              <div key={teacher.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button 
                    onClick={() => openEditModal(teacher)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteTeacher(teacher.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-lg group-hover:scale-110 transition-transform duration-500">
                    {teacher.first_name[0]}{teacher.last_name[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{teacher.first_name} {teacher.last_name}</h3>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {teacher.specialization}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {teacher.email || 'No email'}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {teacher.phone || 'No phone'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                  <div className="bg-gray-50 p-3 rounded-2xl">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('education.lessonsThisMonth')}</p>
                    <p className="text-sm font-black text-gray-900">{stats.monthLessonsCount}</p>
                  </div>
                  <div className="bg-blue-50/50 p-3 rounded-2xl">
                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">{t('education.estimatedPayout')}</p>
                    <p className="text-sm font-black text-blue-600">{stats.estimatedEarnings.toFixed(2)} ₼</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('education.active')}
                  </div>
                  <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                    {t('education.viewSchedule')}
                  </button>
                </div>
              </div>
            );
          })

        ) : (
          <div className="col-span-full bg-gray-50 p-12 rounded-[2.5rem] border border-dashed border-gray-200 text-center">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-500">{t('education.noTeachers')}</h3>
            <p className="text-gray-400 text-sm mt-1">{t('education.createFirstTeacher')}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg relative z-10 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-50 text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <GraduationCap className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">{selectedTeacher ? t('common.edit') : t('education.addTeacher')}</h2>
              <p className="text-gray-500 text-sm mt-1">{t('education.registerTeacher')}</p>
            </div>

            <div className="flex gap-4 mb-8 border-b border-gray-50">
              <button 
                onClick={() => setActiveTab('info')}
                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'info' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t('profile.tabs.general')}
                {activeTab === 'info' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('schedule')}
                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'schedule' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t('education.workingHours')}
                {activeTab === 'schedule' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('finance')}
                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'finance' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t('education.salary')}
                {activeTab === 'finance' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
              </button>
            </div>

            <form onSubmit={selectedTeacher ? handleUpdate : handleSubmit} className="space-y-6">
              {activeTab === 'info' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.firstName')}</label>
                      <input 
                        type="text" 
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold" 
                        placeholder={t('education.placeholders.firstName')} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.lastName')}</label>
                      <input 
                        type="text" 
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold" 
                        placeholder={t('education.placeholders.lastName')} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.emailAddress')}</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold" 
                      placeholder={t('education.placeholders.email')} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.phoneNumber')}</label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold" 
                        placeholder={t('education.placeholders.phone')} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.specialization')}</label>
                      <div className="relative">
                        <button 
                          type="button"
                          onClick={() => setShowSpecDropdown(!showSpecDropdown)}
                          className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-900 flex items-center justify-between"
                        >
                          <span>{formData.specialization}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSpecDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showSpecDropdown && (
                          <>
                            <div className="fixed inset-0 z-[490]" onClick={() => setShowSpecDropdown(false)} />
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-[500] py-2 overflow-hidden animate-in zoom-in-95 fade-in duration-200 origin-bottom">
                              {specializations.map(spec => (
                                <button
                                  key={spec}
                                  type="button"
                                  onClick={() => {
                                    setFormData({...formData, specialization: spec});
                                    setShowSpecDropdown(false);
                                  }}
                                  className={`w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors text-sm font-bold ${formData.specialization === spec ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                >
                                  {spec}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {Object.entries(formData.workingHours).map(([day, config]: [string, any]) => (
                    <div key={day} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            workingHours: {
                              ...formData.workingHours,
                              [day]: { ...config, active: !config.active }
                            }
                          })}
                          className={`w-10 h-6 rounded-full transition-all relative ${config.active ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.active ? 'left-5' : 'left-1'}`} />
                        </button>
                        <span className="text-xs font-black uppercase tracking-widest text-gray-900 w-12">
                          {t(`common.weekdays.${day}`)}
                        </span>
                      </div>
                      
                      {config.active && (
                        <div className="flex items-center gap-2">
                          <input 
                            type="time" 
                            value={config.start}
                            onChange={(e) => setFormData({
                              ...formData,
                              workingHours: {
                                ...formData.workingHours,
                                [day]: { ...config, start: e.target.value }
                              }
                            })}
                            className="bg-white px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:border-blue-500"
                          />
                          <span className="text-gray-400 text-xs">—</span>
                          <input 
                            type="time" 
                            value={config.end}
                            onChange={(e) => setFormData({
                              ...formData,
                              workingHours: {
                                ...formData.workingHours,
                                [day]: { ...config, end: e.target.value }
                              }
                            })}
                            className="bg-white px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-bold outline-none focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.salaryType')}</label>
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setShowSalaryDropdown(!showSalaryDropdown)}
                        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-900 flex items-center justify-between"
                      >
                        <span>{t(`education.${formData.salaryType}`)}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSalaryDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showSalaryDropdown && (
                        <>
                          <div className="fixed inset-0 z-[490]" onClick={() => setShowSalaryDropdown(false)} />
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-[500] py-2 overflow-hidden animate-in zoom-in-95 fade-in duration-200 origin-top">
                            {['hourly', 'fixed', 'percentage'].map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => {
                                  setFormData({...formData, salaryType: type});
                                  setShowSalaryDropdown(false);
                                }}
                                className={`w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors text-sm font-bold ${formData.salaryType === type ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                              >
                                {t(`education.${type}`)}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                      {formData.salaryType === 'percentage' ? t('education.percentage') : t('education.salaryAmount')}
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={formData.salaryAmount}
                        onChange={(e) => setFormData({...formData, salaryAmount: parseFloat(e.target.value) || 0})}
                        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold" 
                        placeholder="0.00" 
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">
                        {formData.salaryType === 'percentage' ? '%' : '₼'}
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold">{error}</div>}

              <button 
                type="submit" 
                disabled={isSubmitting || success}
                className={`w-full py-4 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2
                  ${success ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}
                  ${isSubmitting ? 'opacity-80' : ''}
                `}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : success ? <CheckCircle2 className="w-5 h-5" /> : t('education.saveTeacher')}
              </button>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default TeacherManagement;
