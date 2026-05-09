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
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: courses?.[0]?.title || 'Piano'
  });

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
        setFormData({ firstName: '', lastName: '', email: '', phone: '', specialization: 'Piano' });
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900">{t('education.tabTeachers')}</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">{t('education.manageTeachers')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> {t('education.addTeacher')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.length > 0 ? (
          teachers.map(teacher => (
            <div key={teacher.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {teacher.email || 'No email'}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {teacher.phone || 'No phone'}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t('education.active')}
                </div>
                <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                  {t('education.viewSchedule')}
                </button>
              </div>
            </div>
          ))
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
              <h2 className="text-2xl font-black text-gray-900">{t('education.addTeacher')}</h2>
              <p className="text-gray-500 text-sm mt-1">{t('education.registerTeacher')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
