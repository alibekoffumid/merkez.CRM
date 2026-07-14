import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { useTranslation } from 'react-i18next';
import { 
  Users, Plus, Trash2, Edit3, Search, 
  Loader2, CheckCircle, AlertCircle, Save, X 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';
import Dropdown from '../../components/Common/Dropdown';

const WarehouseStaffManager = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('Active');
  
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('warehouse-top-bar-portal-target'));
  }, []);

  useEffect(() => {
    if (profile?.id) {
      fetchStaff();
    }
  }, [profile]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', profile.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setStaffList(data || []);
    } catch (err) {
      toast.error('Error fetching staff: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setRole('Staff');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setName(staff.name);
    setRole(staff.role || 'Staff');
    setStatus(staff.status || 'Active');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(i18n.language === 'az' ? 'Ad daxil edilməlidir' : 'Имя обязательно');
      return;
    }

    setSubmitting(true);
    try {
      const staffData = {
        name: name.trim(),
        role,
        status,
        user_id: profile.id
      };

      if (editingStaff) {
        const { error } = await supabase
          .from('staff')
          .update(staffData)
          .eq('id', editingStaff.id);
        if (error) throw error;
        toast.success(i18n.language === 'az' ? 'Məlumat yeniləndi' : 'Сотрудник обновлен');
      } else {
        const { error } = await supabase
          .from('staff')
          .insert([staffData]);
        if (error) throw error;
        toast.success(i18n.language === 'az' ? 'İşçi əlavə olundu' : 'Сотрудник добавлен');
      }

      setIsModalOpen(false);
      fetchStaff();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', confirmDelete.id);
      if (error) throw error;

      toast.success(i18n.language === 'az' ? 'İşçi silindi' : 'Сотрудник удален');
      setConfirmDelete(null);
      fetchStaff();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topBarContent = (
    <>
      <div className="relative flex-1 w-full max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder={i18n.language === 'az' ? 'İşçi axtar...' : 'Поиск сотрудников...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:bg-white focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors outline-none"
        />
      </div>

      <button
        onClick={handleOpenAdd}
        className="bg-merkez-blue text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors flex items-center justify-center shadow-md shadow-blue-600/10 whitespace-nowrap shrink-0 border border-transparent"
      >
        <Plus className="w-3.5 h-3.5 mr-1.5 shrink-0" />
        {i18n.language === 'az' ? 'Yeni İşçi' : 'Новый сотрудник'}
      </button>
    </>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {portalTarget && createPortal(topBarContent, portalTarget)}

      {/* Grid List */}
      <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-merkez-blue" />
            <p className="font-bold uppercase tracking-widest text-[10px]">{t('common.loading')}</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Users className="w-10 h-10 text-gray-200" />
            <p className="text-xs font-bold">{i18n.language === 'az' ? 'Heç bir işçi tapılmadı.' : 'Сотрудники не найдены.'}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'AD SOYAD' : 'ФИО'}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'VƏZİFƏ' : 'ДОЛЖНОСТЬ'}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'STATUS' : 'СТАТУС'}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{i18n.language === 'az' ? 'ƏMƏLİYYATLAR' : 'ДЕЙСТВИЯ'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStaff.map(staff => (
                  <tr key={staff.id} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">{staff.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                        {staff.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        staff.status === 'Active' ? 'bg-green-50 text-merkez-green' : 'bg-red-50 text-red-500'
                      }`}>
                        {staff.status === 'Active' ? (i18n.language === 'az' ? 'Aktiv' : 'Активен') : (i18n.language === 'az' ? 'Deaktiv' : 'Неактивен')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenEdit(staff)} 
                          className="p-1.5 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setConfirmDelete(staff)} 
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
            <div 
              className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">
                  {editingStaff ? (i18n.language === 'az' ? 'İşçini redaktə et' : 'Редактировать сотрудника') : (i18n.language === 'az' ? 'Yeni İşçi Əlavə Et' : 'Добавить сотрудника')}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{i18n.language === 'az' ? 'Ad Soyad' : 'ФИО'} *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-bold"
                    placeholder="Məsələn: Cəfər Əliyev"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{i18n.language === 'az' ? 'Vəzifə' : 'Должность'}</label>
                  <input
                    type="text"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-bold"
                    placeholder="Məsələn: Anbardar"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{i18n.language === 'az' ? 'Status' : 'Статус'}</label>
                  <Dropdown 
                    value={status}
                    onChange={setStatus}
                    options={[
                      { value: 'Active', label: i18n.language === 'az' ? 'Aktiv' : 'Активен' },
                      { value: 'Inactive', label: i18n.language === 'az' ? 'Deaktiv' : 'Неактивен' }
                    ]}
                    buttonClassName="rounded-lg px-4 py-2.5 text-sm font-bold"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-lg font-bold hover:bg-gray-50 transition-all text-xs"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-merkez-blue text-white rounded-lg font-bold hover:bg-blue-600 transition-all text-xs flex items-center justify-center"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {t('common.save') || 'Yadda saxla'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="p-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {i18n.language === 'az' ? 'İşçini silmək' : 'Удалить сотрудника'}
                </h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  {i18n.language === 'az' 
                    ? `"${confirmDelete.name}" adlı işçini silmək istədiyinizdən əminsiniz?`
                    : `Вы уверены, что хотите удалить сотрудника "${confirmDelete.name}"?`}
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-2.5 border border-gray-150 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors flex items-center justify-center"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    {i18n.language === 'az' ? 'Sil' : 'Удалить'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default WarehouseStaffManager;
