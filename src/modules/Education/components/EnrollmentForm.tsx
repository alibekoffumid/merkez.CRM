import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Mail, Phone, Book, ChevronDown } from 'lucide-react';

const EnrollmentForm = () => {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');

  const courses = [
    { id: 'piano', name: t('education.classicalPiano') },
    { id: 'vocal', name: t('education.vocalTraining') },
    { id: 'art', name: t('education.fineArts') },
  ];
  return (
    <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-sm">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
          <UserPlus className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">{t('education.newEnrollment')}</h2>
        <p className="text-gray-500 text-sm mt-2 font-medium">{t('education.registerStudent')}</p>
      </div>

      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.firstName')}</label>
            <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" placeholder="e.g. Aysel" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.lastName')}</label>
            <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" placeholder="e.g. Jafarova" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.contactInfo')}</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="email" className="w-full p-4 pl-14 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" placeholder={t('education.emailAddress')} />
            </div>
            <div className="relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="tel" className="w-full p-4 pl-14 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" placeholder={t('education.phoneNumber')} />
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-4">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.selectProgram')}</label>
          <div className="relative">
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full p-4 pl-14 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 cursor-pointer transition-all flex items-center justify-between group"
            >
              <Book className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className={`text-sm font-bold ${selectedCourse ? 'text-gray-900' : 'text-gray-400'}`}>
                {selectedCourse ? courses.find(c => c.id === selectedCourse)?.name : t('education.selectCourse')}
              </span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  {courses.map(course => (
                    <div 
                      key={course.id}
                      onClick={() => {
                        setSelectedCourse(course.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`px-5 py-4 cursor-pointer text-sm font-bold transition-colors border-b border-gray-50 last:border-0 ${selectedCourse === course.id ? 'bg-blue-50 text-blue-600' : 'text-gray-900 hover:bg-gray-50'}`}
                    >
                      {course.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="pt-8">
          <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-blue-500 shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all">
            {t('education.completeEnrollment')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EnrollmentForm;
