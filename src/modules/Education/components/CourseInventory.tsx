import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Plus, Tag, X, Loader2, CheckCircle2, Trash2, Edit2 } from 'lucide-react';
import { useEducation } from '../hooks/useEducation';
import { supabase } from '../../../supabaseClient';
import ModalPortal from '../../../components/Common/ModalPortal';
import ConfirmModal from '../../../components/Common/ConfirmModal';

const CourseInventory = () => {
  const { t } = useTranslation();
  const { courses, loading, tenantId, refreshAll } = useEducation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    price: '',
    capacity: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price) {
      setError(t('common.error') || 'Fill required fields');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      if (selectedCourse) {
        // Update existing course
        const { error: updateError } = await supabase
          .from('education_courses')
          .update({
            title: formData.title,
            category: formData.category,
            price: parseFloat(formData.price) || 0,
            capacity: parseInt(formData.capacity) || null,
            description: formData.description
          })
          .eq('id', selectedCourse.id);
          
        if (updateError) throw updateError;
      } else {
        // Insert new course
        const { error: insertError } = await supabase
          .from('education_courses')
          .insert([{
            tenant_id: tenantId || '00000000-0000-0000-0000-000000000000',
            title: formData.title,
            category: formData.category,
            price: parseFloat(formData.price) || 0,
            capacity: parseInt(formData.capacity) || null,
            description: formData.description
          }]);
          
        if (insertError) throw insertError;
      }
      
      refreshAll();
      setIsModalOpen(false);
      setSelectedCourse(null);
      setFormData({ title: '', category: '', price: '', capacity: '', description: '' });
    } catch (err: any) {
      console.error('Course save error:', err);
      setError(err.message || 'Failed to save program');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (course: any) => {
    setSelectedCourse(course);
    setFormData({
      title: course.title || '',
      category: course.category || '',
      price: course.price?.toString() || '',
      capacity: course.capacity?.toString() || '',
      description: course.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (course: any) => {
    setCourseToDelete(course);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;
    
    try {
      const { error: deleteError } = await supabase
        .from('education_courses')
        .delete()
        .eq('id', courseToDelete.id);
        
      if (deleteError) throw deleteError;
      
      refreshAll();
      setIsConfirmOpen(false);
      setCourseToDelete(null);
    } catch (err: any) {
      console.error('Delete course error:', err);
      alert('Failed to delete program: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-20 z-30 bg-gray-50/95 backdrop-blur-md -mx-4 px-4 py-4 mb-6 border-b border-gray-200/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('education.tabPrograms')}</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setSelectedCourse(null);
              setFormData({ title: '', category: '', price: '', capacity: '', description: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> {t('education.addProgram')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-10 text-center text-gray-500 font-bold">{t('education.loadingPrograms')}</div>
        ) : courses?.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-[2.5rem] border border-gray-100 border-dashed">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="font-bold text-lg text-gray-900">{t('education.noPrograms')}</p>
            <p className="text-sm">{t('education.createFirstProgram')}</p>
          </div>
        ) : (
          courses?.map((course: any) => (
            <div key={course.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:border-blue-200 transition-all group flex flex-col h-full">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all text-blue-600">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">{course.title}</h3>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2 flex-1 font-medium">{course.description || t('education.noDescription')}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                <div className="flex items-center gap-1 text-emerald-600 font-black text-lg">
                  <Tag className="w-4 h-4" /> ₼{course.price}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(course)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(course)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg ml-2">
                    {course.category || t('education.general')}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">{selectedCourse ? t('common.edit') : t('education.addProgram')}</h2>
              <p className="text-gray-500 text-sm mt-1">{t('education.managePrograms')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('common.name')}</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
                    placeholder={t('education.placeholders.programName')} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('common.category')}</label>
                  <input 
                    type="text" 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
                    placeholder={t('education.placeholders.category')} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('common.price')} (₼)</label>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('restaurant.maxCapacity')} ({t('common.optional')})</label>
                  <input 
                    type="number" 
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900" 
                    placeholder={t('education.placeholders.capacity')} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('common.description')}</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-medium text-gray-900 resize-none" 
                  placeholder={t('education.placeholders.description')} 
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
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-blue-500 shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
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
          setCourseToDelete(null);
        }}
        onConfirm={confirmDelete}
        title={t('education.deleteProgram', 'Proqramı Sil')}
        message={t('education.confirmDeleteProgram', 'Bu proqramı silmək istədiyinizdən əminsiniz?')}
        confirmText={t('common.delete', 'Sil')}
        cancelText={t('common.cancel', 'Ləğv et')}
        isDanger={true}
      />
    </div>
  );
};

export default CourseInventory;
