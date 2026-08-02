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
import StaffSalaryModal from './StaffSalaryModal';

const WarehouseStaffManager = () => {
  const { t, i18n } = useTranslation();
  const { profile, currentStaff } = useUser();
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
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryType, setSalaryType] = useState('monthly');
  const [autoSalary, setAutoSalary] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [selectedStaffForSalary, setSelectedStaffForSalary] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('staff'); // 'staff' or 'salaries'
  
  const isAdmin = !currentStaff;
  
  const [portalTarget, setPortalTarget] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('warehouse-top-bar-portal-target'));
    setActionTarget(document.getElementById('warehouse-actions-portal-target'));
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
      
      // Process automatic salaries if admin
      if (isAdmin && data) {
        checkAndAccrueSalaries(data);
      }
    } catch (err) {
      toast.error('Error fetching staff: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAndAccrueSalaries = async (staffData) => {
    const now = new Date();
    
    for (const staff of staffData) {
      if (!staff.auto_salary || !staff.salary_amount || staff.salary_amount <= 0) continue;
      
      let lastAccrual = staff.last_accrual_date ? new Date(staff.last_accrual_date) : null;
      let shouldAccrue = false;
      
      if (!lastAccrual) {
        // If it's the first time, we don't retroactively accrue for years. 
        // We just set the last_accrual_date to now so it starts counting from today.
        await supabase.from('staff').update({ last_accrual_date: now.toISOString() }).eq('id', staff.id);
        continue;
      }
      
      const diffTime = Math.abs(now - lastAccrual);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let intervalsToAccrue = 0;
      
      if (staff.salary_type === 'daily' && diffDays >= 1) {
        intervalsToAccrue = diffDays;
      } else if (staff.salary_type === 'weekly' && diffDays >= 7) {
        intervalsToAccrue = Math.floor(diffDays / 7);
      } else if (staff.salary_type === 'monthly' && diffDays >= 30) {
        // Simple 30-day month approximation
        intervalsToAccrue = Math.floor(diffDays / 30);
      }
      
      if (intervalsToAccrue > 0) {
        try {
          const totalAmount = staff.salary_amount * intervalsToAccrue;
          
          // 1. Insert transaction
          await supabase.from('staff_transactions').insert([{
            staff_id: staff.id,
            user_id: profile.id,
            type: 'salary',
            amount: totalAmount,
            description: `Avtomatik maaş (${intervalsToAccrue} ${staff.salary_type})`
          }]);
          
          // 2. Update last accrual date (pushing it forward by exactly the intervals to not lose remainder days)
          let newDate = new Date(lastAccrual);
          if (staff.salary_type === 'daily') newDate.setDate(newDate.getDate() + intervalsToAccrue);
          if (staff.salary_type === 'weekly') newDate.setDate(newDate.getDate() + (intervalsToAccrue * 7));
          if (staff.salary_type === 'monthly') newDate.setDate(newDate.getDate() + (intervalsToAccrue * 30));
          
          await supabase.from('staff').update({ last_accrual_date: newDate.toISOString() }).eq('id', staff.id);
          
        } catch (e) {
          console.error('Error auto accruing salary for staff', staff.id, e);
        }
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setRole('Staff');
    setStatus('Active');
    setPin('');
    setPhone('');
    setSalaryAmount('');
    setSalaryType('monthly');
    setAutoSalary(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setName(staff.name);
    setRole(staff.role || 'Staff');
    setStatus(staff.status || 'Active');
    setPin(staff.pin || '');
    setPhone(staff.phone || '');
    setSalaryAmount(staff.salary_amount || '');
    setSalaryType(staff.salary_type || 'monthly');
    setAutoSalary(staff.auto_salary || false);
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
        pin: pin.trim() || null,
        phone: phone.trim() || null,
        user_id: profile.id,
        salary_amount: salaryAmount ? parseFloat(salaryAmount) : 0,
        salary_type: salaryType,
        auto_salary: autoSalary
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
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      {isAdmin && (
        <div className="flex bg-gray-100 p-1 rounded-lg w-max shrink-0">
          <button 
            onClick={() => setActiveSubTab('staff')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSubTab === 'staff' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {i18n.language === 'az' ? 'İşçilər' : 'Сотрудники'}
          </button>
          <button 
            onClick={() => setActiveSubTab('salaries')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeSubTab === 'salaries' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {i18n.language === 'az' ? 'Məvaciblər' : 'Зарплаты'}
          </button>
        </div>
      )}
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
    </div>
  );

  const actionContent = (
    <button
      onClick={handleOpenAdd}
      className="bg-merkez-green text-white px-3.5 py-2 h-[38px] rounded-lg text-xs font-bold hover:bg-green-600 transition-colors flex items-center justify-center shadow-md shadow-green-600/10 whitespace-nowrap shrink-0 border border-transparent uppercase"
    >
      <Plus className="w-3.5 h-3.5 mr-1.5 shrink-0" />
      {i18n.language === 'az' ? 'Yeni İşçi' : 'Новый сотрудник'}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {portalTarget && createPortal(topBarContent, portalTarget)}
      {actionTarget && createPortal(actionContent, actionTarget)}

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
                  {activeSubTab === 'staff' && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'TELEFON' : 'ТЕЛЕФОН'}</th>}
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'VƏZİFƏ' : 'ДОЛЖНОСТЬ'}</th>
                  {activeSubTab === 'staff' && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'STATUS' : 'СТАТУС'}</th>}
                  {(isAdmin && activeSubTab === 'salaries') && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{i18n.language === 'az' ? 'BALANS' : 'БАЛАНС'}</th>}
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{i18n.language === 'az' ? 'ƏMƏLİYYATLAR' : 'ДЕЙСТВИЯ'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStaff.map(staff => (
                  <tr key={staff.id} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">{staff.name}</span>
                    </td>
                    {activeSubTab === 'staff' && (
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-500">{staff.phone || '—'}</span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                        {staff.role === 'Manager' ? (i18n.language === 'az' ? 'Menecer' : 'Менеджер') :
                         staff.role === 'Storeman' ? (i18n.language === 'az' ? 'Anbardar' : 'Кладовщик') :
                         staff.role === 'Cashier' ? (i18n.language === 'az' ? 'Kassir' : 'Кассир') :
                         staff.role === 'Staff' ? (i18n.language === 'az' ? 'İşçi' : 'Сотрудник') :
                         staff.role === 'Master' ? (i18n.language === 'az' ? 'Usta' : 'Мастер') :
                         staff.role}
                      </span>
                    </td>
                    {activeSubTab === 'staff' && (
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          staff.status === 'Active' ? 'bg-green-50 text-merkez-green' : 'bg-red-50 text-red-500'
                        }`}>
                          {staff.status === 'Active' ? (i18n.language === 'az' ? 'Aktiv' : 'Активен') : (i18n.language === 'az' ? 'Deaktiv' : 'Неактивен')}
                        </span>
                      </td>
                    )}
                    {(isAdmin && activeSubTab === 'salaries') && (
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-black ${staff.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {staff.balance ? parseFloat(staff.balance).toFixed(2) : '0.00'} ₼
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        {(isAdmin && activeSubTab === 'salaries') && (
                          <button 
                            onClick={() => { setSelectedStaffForSalary(staff); setIsSalaryModalOpen(true); }}
                            className="px-3 py-1.5 bg-merkez-blue text-white hover:bg-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center whitespace-nowrap shadow-sm"
                          >
                            {i18n.language === 'az' ? 'İdarə et' : 'Управление'}
                          </button>
                        )}
                        {activeSubTab === 'staff' && (
                          <>
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
                          </>
                        )}
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
          <div className="fixed inset-0 bg-gray-950/60 z-[9999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
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
                  <Dropdown 
                    value={role}
                    onChange={setRole}
                    options={[
                      { value: 'Manager', label: i18n.language === 'az' ? 'Menecer' : 'Менеджер' },
                      { value: 'Storeman', label: i18n.language === 'az' ? 'Anbardar' : 'Кладовщик' },
                      { value: 'Cashier', label: i18n.language === 'az' ? 'Kassir' : 'Кассир' },
                      { value: 'Staff', label: i18n.language === 'az' ? 'İşçi' : 'Сотрудник' },
                      { value: 'Master', label: i18n.language === 'az' ? 'Usta' : 'Мастер' },
                    ]}
                    buttonClassName="rounded-lg px-4 py-2.5 text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{i18n.language === 'az' ? 'Telefon' : 'Телефон'}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-bold"
                    placeholder="+994"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">PIN (4 {i18n.language === 'az' ? 'rəqəm' : 'цифры'})</label>
                  <input
                    type="text"
                    maxLength={4}
                    pattern="\d{4}"
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-bold"
                    placeholder="0000"
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

                {isAdmin && (
                  <div className="pt-2 mt-2 border-t border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">{i18n.language === 'az' ? 'Maaş Parametrləri' : 'Настройки зарплаты'}</h4>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{i18n.language === 'az' ? 'Məbləğ' : 'Сумма'} (₼)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={salaryAmount}
                          onChange={e => setSalaryAmount(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-bold"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{i18n.language === 'az' ? 'Növü' : 'Тип'}</label>
                        <Dropdown 
                          value={salaryType}
                          onChange={setSalaryType}
                          options={[
                            { value: 'daily', label: i18n.language === 'az' ? 'Günlük' : 'Ежедневно' },
                            { value: 'weekly', label: i18n.language === 'az' ? 'Həftəlik' : 'Еженедельно' },
                            { value: 'monthly', label: i18n.language === 'az' ? 'Aylıq' : 'Ежемесячно' }
                          ]}
                          buttonClassName="rounded-lg px-4 py-2.5 text-sm font-bold w-full"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group px-1">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          checked={autoSalary}
                          onChange={(e) => setAutoSalary(e.target.checked)}
                          className="sr-only" 
                        />
                        <div className={`w-10 h-5 rounded-full transition-colors ${autoSalary ? 'bg-merkez-blue' : 'bg-gray-200'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${autoSalary ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                      <span className="text-xs font-bold text-gray-700 group-hover:text-gray-900 transition-colors">
                        {i18n.language === 'az' ? 'Avtomatik hesablansın' : 'Автоматически начислять'}
                      </span>
                    </label>
                  </div>
                )}

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

      {/* Salary Management Modal */}
      <StaffSalaryModal 
        isOpen={isSalaryModalOpen}
        onClose={() => {
          setIsSalaryModalOpen(false);
          setSelectedStaffForSalary(null);
        }}
        staff={selectedStaffForSalary}
        onUpdate={fetchStaff}
      />
    </div>
  );
};

export default WarehouseStaffManager;
