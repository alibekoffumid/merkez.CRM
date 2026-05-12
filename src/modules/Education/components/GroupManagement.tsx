import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, X, Trash2, Edit2, Book, GraduationCap, CheckCircle2, Loader2, ChevronDown, UserPlus, Search } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useEducation } from '../hooks/useEducation';
import ModalPortal from '../../../components/Common/ModalPortal';
import ConfirmModal from '../../../components/Common/ConfirmModal';

const GroupManagement = () => {
  const { t } = useTranslation();
  const { groups, groupStudents, courses, students, teachers, refreshAll, tenantId } = useEducation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'students'>('general');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    courseId: '',
    teacherId: '',
    type: 'group' as 'individual' | 'group',
    studentIds: [] as string[]
  });

  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.courseId) {
      setError(t('common.error') || 'Fill required fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let groupId = selectedGroup?.id;

      if (selectedGroup) {
        // Update existing group
        const { error: updateError } = await supabase
          .from('education_groups')
          .update({
            name: formData.name,
            course_id: formData.courseId,
            teacher_id: formData.teacherId || null,
            type: formData.type
          })
          .eq('id', selectedGroup.id);
          
        if (updateError) throw updateError;
      } else {
        // Insert new group
        const { data, error: insertError } = await supabase
          .from('education_groups')
          .insert([{
            tenant_id: tenantId || '00000000-0000-0000-0000-000000000000',
            name: formData.name,
            course_id: formData.courseId,
            teacher_id: formData.teacherId || null,
            type: formData.type
          }])
          .select()
          .single();
          
        if (insertError) throw insertError;
        groupId = data.id;
      }

      // Sync students
      // 1. Remove existing
      if (selectedGroup) {
        await supabase.from('education_group_students').delete().eq('group_id', groupId);
      }
      
      // 2. Add new ones
      if (formData.studentIds.length > 0) {
        const studentLinks = formData.studentIds.map(sid => ({
          group_id: groupId,
          student_id: sid
        }));
        const { error: linkError } = await supabase.from('education_group_students').insert(studentLinks);
        if (linkError) throw linkError;
      }

      setSuccess(true);
      refreshAll();
      setTimeout(() => {
        setSuccess(false);
        setIsModalOpen(false);
        setSelectedGroup(null);
        resetForm();
      }, 1500);
    } catch (err: any) {
      console.error('Group save error:', err);
      setError(err.message || 'Failed to save group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      courseId: '',
      teacherId: '',
      type: 'group',
      studentIds: []
    });
    setActiveTab('general');
  };

  const handleEdit = (group: any) => {
    setSelectedGroup(group);
    const currentStudentIds = groupStudents
      .filter(gs => gs.group_id === group.id)
      .map(gs => gs.student_id);
      
    setFormData({
      name: group.name,
      courseId: group.course_id,
      teacherId: group.teacher_id || '',
      type: group.type,
      studentIds: currentStudentIds
    });
    setIsModalOpen(true);
  };

  const toggleStudent = (studentId: string) => {
    setFormData(prev => {
      if (prev.type === 'individual') {
        // Only one student for individual type
        return { ...prev, studentIds: [studentId] };
      }
      
      const isSelected = prev.studentIds.includes(studentId);
      if (isSelected) {
        return { ...prev, studentIds: prev.studentIds.filter(id => id !== studentId) };
      } else {
        return { ...prev, studentIds: [...prev.studentIds, studentId] };
      }
    });
  };

  const handleDeleteClick = (group: any) => {
    setGroupToDelete(group);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!groupToDelete) return;
    try {
      const { error: deleteError } = await supabase
        .from('education_groups')
        .delete()
        .eq('id', groupToDelete.id);
      if (deleteError) throw deleteError;
      refreshAll();
      setIsConfirmOpen(false);
      setGroupToDelete(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.phone?.includes(studentSearch)
  );

  return (
    <div className="space-y-6">
      <div className="sticky top-20 z-30 bg-gray-50/95 backdrop-blur-md -mx-4 px-4 py-4 mb-6 border-b border-gray-200/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('education.tabGroups', 'Qruplar')}</h3>
        <button 
          onClick={() => {
            setSelectedGroup(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> {t('education.addGroup', 'Yeni Qrup')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups?.map(group => {
          const groupMemberCount = groupStudents.filter(gs => gs.group_id === group.id).length;
          const teacher = teachers.find(t => t.id === group.teacher_id);
          const course = courses.find(c => c.id === group.course_id);

          return (
            <div key={group.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:border-blue-200 transition-all group relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {group.type === 'individual' ? <GraduationCap className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${group.type === 'individual' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {group.type === 'individual' ? t('education.individual', 'Fərdi') : t('education.group', 'Qrup')}
                </div>
              </div>

              <h3 className="text-lg font-black text-gray-900 mb-1">{group.name}</h3>
              <p className="text-xs font-bold text-gray-400 mb-4">{course?.title || 'Proqram yoxdur'}</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-gray-500">
                  <GraduationCap className="w-4 h-4" />
                  <span className="text-xs font-bold">{teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Müəllim təyin edilməyib'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-bold">{groupMemberCount} {t('education.studentsCount', 'tələbə')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                <button 
                  onClick={() => handleEdit(group)}
                  className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-blue-50 hover:text-blue-600 transition-all"
                >
                  {t('common.edit')}
                </button>
                <button 
                  onClick={() => handleDeleteClick(group)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl relative z-10 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-gray-50 text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900">{selectedGroup ? t('common.edit') : t('education.addGroup')}</h2>
                <p className="text-gray-500 text-sm mt-1">{t('education.manageGroupsDesc', 'Qrup və ya fərdi dərsləri idarə edin')}</p>
              </div>

              <div className="flex gap-4 mb-6 border-b border-gray-50">
                <button 
                  onClick={() => setActiveTab('general')}
                  className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'general' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {t('profile.tabs.general')}
                  {activeTab === 'general' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
                </button>
                <button 
                  onClick={() => setActiveTab('students')}
                  className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'students' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {t('education.tabStudents')} ({formData.studentIds.length})
                  {activeTab === 'students' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
                {activeTab === 'general' ? (
                  <form className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.groupName', 'Ad')}</label>
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-900" 
                        placeholder="məs. Piano Qrup A" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.type', 'Növ')}</label>
                        <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, type: 'group'})}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${formData.type === 'group' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                          >
                            {t('education.group', 'Qrup')}
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              setFormData({...formData, type: 'individual', studentIds: formData.studentIds.slice(0, 1)});
                            }}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${formData.type === 'individual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                          >
                            {t('education.individual', 'Fərdi')}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.program', 'Proqram')}</label>
                        <div className="relative">
                          <button 
                            type="button"
                            onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                            className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-sm font-bold text-gray-900"
                          >
                            <span>{courses.find(c => c.id === formData.courseId)?.title || 'Seçin'}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showCourseDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          {showCourseDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-48 overflow-y-auto no-scrollbar p-2">
                              {courses.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({...formData, courseId: c.id});
                                    setShowCourseDropdown(false);
                                  }}
                                  className="w-full p-3 text-left hover:bg-blue-50 rounded-xl text-sm font-bold text-gray-700 transition-all"
                                >
                                  {c.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('education.teacher', 'Müəllim')}</label>
                      <div className="relative">
                        <button 
                          type="button"
                          onClick={() => setShowTeacherDropdown(!showTeacherDropdown)}
                          className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-sm font-bold text-gray-900"
                        >
                          <span>{teachers.find(t => t.id === formData.teacherId) ? `${teachers.find(t => t.id === formData.teacherId).first_name} ${teachers.find(t => t.id === formData.teacherId).last_name}` : 'Məcburi deyil'}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showTeacherDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showTeacherDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-48 overflow-y-auto no-scrollbar p-2">
                            <button
                                type="button"
                                onClick={() => {
                                  setFormData({...formData, teacherId: ''});
                                  setShowTeacherDropdown(false);
                                }}
                                className="w-full p-3 text-left hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-400 italic"
                              >
                                Təyin edilməsin
                              </button>
                            {teachers.map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setFormData({...formData, teacherId: t.id});
                                  setShowTeacherDropdown(false);
                                }}
                                className="w-full p-3 text-left hover:bg-blue-50 rounded-xl text-sm font-bold text-gray-700 transition-all"
                              >
                                {t.first_name} {t.last_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder={t('common.search')}
                        className="w-full p-4 pl-11 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {filteredStudents.map(student => {
                        const isSelected = formData.studentIds.includes(student.id);
                        return (
                          <button
                            key={student.id}
                            onClick={() => toggleStudent(student.id)}
                            className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-blue-200'}`}
                          >
                            <div className="flex items-center gap-3 text-left">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {student.first_name[0]}{student.last_name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{student.first_name} {student.last_name}</p>
                                <p className="text-[10px] text-gray-400">{student.phone || student.email}</p>
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-200 group-hover:border-blue-400'}`}>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 mt-6 border-t border-gray-50 flex gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-gray-500 font-bold bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || success}
                  className={`flex-1 py-4 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2
                    ${success ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}
                    ${isSubmitting ? 'opacity-80 cursor-not-allowed' : ''}
                  `}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : success ? <CheckCircle2 className="w-5 h-5" /> : t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title={t('education.deleteGroup', 'Qrupu sil')}
        message={t('education.confirmDeleteGroup', 'Bu qrupu silmək istədiyinizdən əminsiniz? Bütün tələbə əlaqələri kəsiləcək.')}
        isDanger={true}
      />
    </div>
  );
};

export default GroupManagement;
