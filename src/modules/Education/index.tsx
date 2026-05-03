import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Users, BookOpen, TrendingUp, UserPlus, GraduationCap, Settings, Maximize2, Minimize2, MapPin, ClipboardList } from 'lucide-react';
import { EducationProvider, useEducation } from './hooks/useEducation';
import AcademicScheduler from './components/AcademicScheduler';
import CourseInventory from './components/CourseInventory';
import StudentCard from './components/StudentCard';
import AcademicJournal from './components/AcademicJournal';
import EnrollmentForm from './components/EnrollmentForm';
import RoomManagement from './components/RoomManagement';

const EducationModuleContent = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('scheduler');
  const [isFullPage, setIsFullPage] = useState(false);
  const { students, loading } = useEducation();

  const tabs = [
    { id: 'scheduler', label: t('education.tabSchedule'), icon: Calendar },
    { id: 'students', label: t('education.tabStudents'), icon: Users },
    { id: 'courses', label: t('education.tabPrograms'), icon: BookOpen },
    { id: 'progress', label: t('education.tabJournal'), icon: ClipboardList },
    { id: 'rooms', label: t('education.tabRooms'), icon: MapPin },
    { id: 'enrollment', label: t('education.tabEnrollment'), icon: UserPlus },
  ];

  return (
    <div className={`
      flex flex-col min-h-full transition-all duration-500
      ${isFullPage 
        ? `fixed inset-0 z-[100] bg-gray-50 p-0 rounded-0 overflow-y-auto` 
        : `bg-transparent p-0 rounded-0 border-0 space-y-6`}
    `}>
      {!isFullPage && (
        <div className="sticky top-0 z-[150] flex justify-center w-full pointer-events-none pb-4 bg-gray-50/80 backdrop-blur-md pt-2">
          <div className="pointer-events-auto flex p-1.5 bg-white/90 backdrop-blur-xl rounded-[2rem] border border-gray-100 shadow-2xl shadow-blue-900/5 overflow-x-auto no-scrollbar max-w-full mx-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-3 px-8 py-3 rounded-[1.5rem] text-sm font-bold transition-all duration-300 whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                `}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isFullPage && (
        <button 
          onClick={() => setIsFullPage(false)}
          className="fixed bottom-6 right-6 lg:top-6 lg:bottom-auto z-[200] w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-2xl shadow-gray-900/20 active:scale-95"
        >
          <Minimize2 className="w-6 h-6" />
        </button>
      )}

      {!isFullPage && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('education.title')}</h1>
              <p className="text-gray-500 text-sm mt-1 font-medium">{t('education.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsFullPage(!isFullPage)}
               className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-gray-900 bg-gray-50 border border-gray-100 rounded-2xl transition-all"
               title="Maximize"
             >
               <Maximize2 className="w-5 h-5" />
             </button>
             <button className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-gray-900 bg-gray-50 border border-gray-100 rounded-2xl transition-all">
               <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      )}

      <div className={`flex-1 transition-all duration-500 ${!isFullPage ? 'mt-6 px-4' : 'p-6 md:p-12'}`}>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {activeTab === 'scheduler' && <AcademicScheduler />}
          {activeTab === 'courses' && <CourseInventory />}
          {activeTab === 'progress' && <AcademicJournal />}
          {activeTab === 'rooms' && <RoomManagement />}
          {activeTab === 'enrollment' && <EnrollmentForm />}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-900">{t('education.studentDirectory')}</h2>
              {loading ? (
                <p className="text-gray-500 font-bold">{t('education.loadingStudents')}</p>
              ) : students?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {students.map(student => (
                    <StudentCard key={student.id} student={student} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-[2.5rem] p-16 text-center border border-gray-100 shadow-sm">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-xl font-black text-gray-900 mb-2">{t('education.noStudents')}</p>
                  <p className="text-sm text-gray-500 font-medium">{t('education.enrollStudentStart')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EducationModule = () => {
  return (
    <EducationProvider initialTenantId="00000000-0000-0000-0000-000000000000">
      <EducationModuleContent />
    </EducationProvider>
  );
};

export default EducationModule;
