import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Mail, Phone, Book } from 'lucide-react';

const EnrollmentForm = () => {
  const { t } = useTranslation();
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
            <Book className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select className="w-full p-4 pl-14 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none text-sm font-bold text-gray-900">
              <option value="" className="text-gray-400">{t('education.selectCourse')}</option>
              <option value="piano">{t('education.classicalPiano')}</option>
              <option value="vocal">{t('education.vocalTraining')}</option>
              <option value="art">{t('education.fineArts')}</option>
            </select>
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
