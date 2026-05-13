import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Mail, Phone, Book, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useEducation } from '../hooks/useEducation';
import DatePicker from '../../../components/Common/DatePicker';

const EnrollmentForm = () => {
  const { t } = useTranslation();
  const { refreshAll, courses, tenantId } = useEducation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    monthlyPayment: '',
    courseId: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create student record
      const { data: student, error: studentError } = await supabase
        .from('education_students')
        .insert([{
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.dateOfBirth ? formData.dateOfBirth : null,
          status: 'active',
          tenant_id: tenantId
        }])
        .select()
        .single();
        
      if (studentError) {
        console.error('Student Error:', studentError);
        throw studentError;
      }
      
      if (student && formData.courseId) {
        // Create enrollment record
        await supabase
          .from('enrollments')
          .insert([{
            student_id: student.id,
            course_id: formData.courseId,
            status: 'active',
            progress_level: 'Beginner',
            monthly_payment: formData.monthlyPayment ? parseFloat(formData.monthlyPayment) : 0,
            tenant_id: tenantId
          }]);
      }
      
      setSuccess(true);
      refreshAll(); // Refresh the list of students
      
      setTimeout(() => {
        setSuccess(false);
        setFormData({ firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', monthlyPayment: '', courseId: '' });
      }, 2000);
      
    } catch (err: any) {
      console.error('Enrollment error:', err);
      alert('Error: ' + (err.message || 'Failed to enroll student'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-6xl mx-auto bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-sm">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('education.newEnrollment')}</h2>
        <p className="text-gray-500 text-sm mt-2 font-medium">{t('education.registerStudent')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.firstName')}</label>
            <input 
              type="text" 
              required
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
              placeholder="e.g. Aysel" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.lastName')}</label>
            <input 
              type="text" 
              required
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
              placeholder="e.g. Jafarova" 
            />
          </div>
          <DatePicker 
            label={t('profile.dateOfBirth', 'Doğum tarixi')}
            value={formData.dateOfBirth}
            onChange={(val) => setFormData({...formData, dateOfBirth: val})}
            position="bottom"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.emailAddress')}</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-4 pl-14 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
                placeholder="e.g. aysel@example.com" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.phoneNumber')}</label>
            <div className="relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="tel" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-4 pl-14 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
                placeholder="+994" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.monthlyPayment', 'Aylıq ödəniş (₼)')}</label>
            <input 
              type="number" 
              min="0"
              step="0.01"
              value={formData.monthlyPayment}
              onChange={(e) => setFormData({...formData, monthlyPayment: e.target.value})}
              className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
              placeholder="e.g. 50" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.selectProgram')}</label>
            <div className="relative">
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full p-4 pl-14 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 cursor-pointer transition-all flex items-center justify-between group"
              >
                <Book className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  {formData.courseId ? courses?.find((c: any) => c.id === formData.courseId)?.title : t('education.selectCourse')}
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[250px] overflow-y-auto no-scrollbar">
                    {courses?.map((course: any) => (
                      <div 
                        key={course.id}
                        onClick={() => {
                          setFormData({...formData, courseId: course.id});
                          setIsDropdownOpen(false);
                        }}
                        className={`px-5 py-4 cursor-pointer text-sm font-bold transition-colors border-b border-gray-50 last:border-0 ${formData.courseId === course.id ? 'bg-blue-50 text-blue-600' : 'text-gray-900 hover:bg-gray-50'}`}
                      >
                        {course.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-2 flex flex-col justify-end">
            <button 
              type="submit" 
              disabled={loading || success}
              className={`w-full py-4 h-[56px] text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2
                ${success ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}
                ${loading ? 'opacity-80 cursor-not-allowed' : ''}
              `}>
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {t('education.processing')}</>
              ) : success ? (
                <><CheckCircle2 className="w-5 h-5" /> {t('education.enrolledSuccessfully')}</>
              ) : (
                t('education.completeEnrollment')
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EnrollmentForm;
