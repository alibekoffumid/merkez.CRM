import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Users, BookOpen, TrendingUp, UserPlus, GraduationCap, Settings, Maximize2, Minimize2, MapPin, ClipboardList, Loader2 } from 'lucide-react';
import { EducationProvider, useEducation } from './hooks/useEducation';
import AcademicScheduler from './components/AcademicScheduler';
import CourseInventory from './components/CourseInventory';
import StudentCard from './components/StudentCard';
import AcademicJournal from './components/AcademicJournal';
import EnrollmentForm from './components/EnrollmentForm';
import RoomManagement from './components/RoomManagement';
import TeacherManagement from './components/TeacherManagement';
import ConfirmModal from '../../components/Common/ConfirmModal';
import ModalPortal from '../../components/Common/ModalPortal';
import { supabase } from '../../supabaseClient';
import DatePicker from '../../components/Common/DatePicker';

const EducationModuleContent = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('scheduler');
  const [isFullPage, setIsFullPage] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const { students, loading, refreshAll } = useEducation();
  
  // Student Management State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<any>(null);
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    status: 'active'
  });

  const tabs = [
    { id: 'scheduler', label: t('education.tabSchedule'), icon: Calendar },
    { id: 'students', label: t('education.tabStudents'), icon: Users },
    { id: 'teachers', label: t('education.tabTeachers'), icon: GraduationCap },
    { id: 'courses', label: t('education.tabPrograms'), icon: BookOpen },
    { id: 'progress', label: t('education.tabJournal'), icon: ClipboardList },
    { id: 'rooms', label: t('education.tabRooms'), icon: MapPin },
    { id: 'enrollment', label: t('education.tabEnrollment'), icon: UserPlus },
  ];

  const handleEditClick = (student: any) => {
    setStudentToEdit(student);
    setEditFormData({
      firstName: student.first_name,
      lastName: student.last_name,
      email: student.email || '',
      phone: student.phone || '',
      dateOfBirth: student.date_of_birth || '',
      status: student.status || 'active'
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (student: any) => {
    setStudentToDelete(student);
    setIsConfirmOpen(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('education_students')
        .update({
          first_name: editFormData.firstName,
          last_name: editFormData.lastName,
          email: editFormData.email,
          phone: editFormData.phone,
          date_of_birth: editFormData.dateOfBirth || null,
          status: editFormData.status
        })
        .eq('id', studentToEdit.id);

      if (updateError) throw updateError;
      refreshAll();
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Update student error:', err);
      alert('Failed to update student: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      const { error: deleteError } = await supabase
        .from('education_students')
        .delete()
        .eq('id', studentToDelete.id);

      if (deleteError) throw deleteError;
      refreshAll();
      setIsConfirmOpen(false);
    } catch (err: any) {
      console.error('Delete student error:', err);
      alert('Failed to delete student: ' + err.message);
    }
  };

  return (
    <div className={`
      flex flex-col min-h-full transition-all duration-500
      ${isFullPage 
        ? `fixed inset-0 z-[100] bg-gray-50 p-0 rounded-0 overflow-y-auto` 
        : `bg-transparent p-0 rounded-0 border-0 space-y-6`}
    `}>
      {!isFullPage && (
        <div className="sticky top-0 z-40 flex justify-start lg:justify-center w-full pointer-events-none pb-4 bg-gray-50/80 backdrop-blur-md pt-2 px-4 sm:px-0">
          <div className="pointer-events-auto flex p-1.5 bg-white/90 backdrop-blur-xl rounded-[2rem] border border-gray-100 shadow-2xl shadow-blue-900/5 overflow-x-auto no-scrollbar max-w-full mx-auto w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-[1.5rem] text-[11px] sm:text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                `}
              >
                <tab.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
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



      <div className={`flex-1 transition-all duration-500 ${!isFullPage ? 'mt-2 px-4' : 'p-6 md:p-12'}`}>
        <div>
          {activeTab === 'scheduler' && <AcademicScheduler initialTeacherId={selectedTeacherId} />}
          {activeTab === 'courses' && <CourseInventory />}
          {activeTab === 'progress' && <AcademicJournal />}
          {activeTab === 'rooms' && <RoomManagement />}
          {activeTab === 'teachers' && (
            <TeacherManagement 
              onViewSchedule={(id) => {
                setSelectedTeacherId(id);
                setActiveTab('scheduler');
              }} 
            />
          )}
          {activeTab === 'enrollment' && <EnrollmentForm />}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-900">{t('education.studentDirectory')}</h2>
              {loading ? (
                <p className="text-gray-500 font-bold">{t('education.loadingStudents')}</p>
              ) : students?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {students.map((student: any) => (
                    <StudentCard 
                      key={student.id} 
                      student={student} 
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                    />
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

      {/* Edit Student Modal */}
      {isEditModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)}></div>
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl relative z-10 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-900">{t('common.edit')}</h2>
                <p className="text-gray-500 text-sm mt-1">{t('education.manageStudents', 'Tələbə məlumatlarını idarə edin')}</p>
              </div>

              <form onSubmit={handleUpdateStudent} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.firstName')}</label>
                    <input 
                      type="text" 
                      required
                      value={editFormData.firstName}
                      onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.lastName')}</label>
                    <input 
                      type="text" 
                      required
                      value={editFormData.lastName}
                      onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.emailAddress')}</label>
                    <input 
                      type="email" 
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.phoneNumber')}</label>
                    <input 
                      type="tel" 
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <DatePicker 
                    label={t('profile.dateOfBirth', 'Doğum tarixi')}
                    value={editFormData.dateOfBirth}
                    onChange={(val) => setEditFormData({...editFormData, dateOfBirth: val})}
                    position="top"
                  />
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('common.status', 'Status')}</label>
                    <select 
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold"
                    >
                      <option value="active">{t('common.active', 'Aktiv')}</option>
                      <option value="inactive">{t('common.inactive', 'Deaktiv')}</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-blue-500 shadow-xl transition-all flex items-center justify-center"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setStudentToDelete(null);
        }}
        onConfirm={confirmDeleteStudent}
        title={t('education.deleteStudent', 'Tələbəni Sil')}
        message={t('education.confirmDeleteStudent', 'Bu tələbəni silmək istədiyinizdən əminsiniz?')}
        confirmText={t('common.delete', 'Sil')}
        cancelText={t('common.cancel', 'Ləğv et')}
        isDanger={true}
      />
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
