import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { useTranslation } from 'react-i18next';
import { 
  Users, Plus, Trash2, Edit3, Search, 
  Loader2, CheckCircle, AlertCircle, Save, X,
  LayoutGrid, List, Phone, Lock, Wrench, Shield,
  Wallet, UserCheck, Briefcase
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';
import Dropdown from '../../components/Common/Dropdown';
import StaffSalaryModal from './StaffSalaryModal';

const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-600',
  'from-emerald-600 to-teal-700',
  'from-violet-600 to-purple-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-600 to-blue-700',
  'from-teal-600 to-emerald-700',
  'from-fuchsia-600 to-purple-700',
];

const getAvatarGradient = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

const getInitials = (name = '') => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getRoleConfig = (role, lang = 'az') => {
  switch (role) {
    case 'Master':
      return {
        label: lang === 'az' ? 'Usta' : 'Мастер',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        icon: Wrench,
      };
    case 'Manager':
      return {
        label: lang === 'az' ? 'Menecer' : 'Менеджер',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
        icon: Shield,
      };
    case 'Cashier':
      return {
        label: lang === 'az' ? 'Kassir' : 'Кассир',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        icon: Wallet,
      };
    case 'Storeman':
      return {
        label: lang === 'az' ? 'Anbardar' : 'Кладовщик',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80',
        icon: Briefcase,
      };
    case 'Staff':
    default:
      return {
        label: lang === 'az' ? 'İşçi' : 'Сотрудник',
        badgeClass: 'bg-slate-50 text-slate-800 border-slate-200/80',
        icon: UserCheck,
      };
  }
};

const WarehouseStaffManager = () => {
  const { t, i18n } = useTranslation();
  const { profile, currentStaff } = useUser();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  
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
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone || '').includes(searchTerm)
  );

  const topBarContent = (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full items-stretch sm:items-center">
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
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:bg-white focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors outline-none font-medium"
        />
      </div>
      <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 items-center">
        <button
          onClick={() => setViewMode('cards')}
          title={i18n.language === 'az' ? 'Kart görünüşü' : 'Вид карточек'}
          className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-merkez-blue font-bold' : 'text-gray-400 hover:text-gray-700'}`}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('table')}
          title={i18n.language === 'az' ? 'Cədvəl görünüşü' : 'Вид таблицы'}
          className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-merkez-blue font-bold' : 'text-gray-400 hover:text-gray-700'}`}
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const actionContent = (
    <button
      onClick={handleOpenAdd}
      className="bg-merkez-green text-white px-3.5 py-2 h-[38px] rounded-lg text-xs font-bold hover:bg-green-600 transition-colors flex items-center justify-center shadow-md shadow-green-600/10 whitespace-nowrap shrink-0 border border-transparent uppercase active:scale-95"
    >
      <Plus className="w-3.5 h-3.5 mr-1.5 shrink-0" />
      {i18n.language === 'az' ? 'Yeni İşçi' : 'Новый сотрудник'}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {(!portalTarget || !actionTarget) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 mb-3 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex-1 w-full">
            {topBarContent}
          </div>
          <div className="shrink-0">
            {actionContent}
          </div>
        </div>
      )}
      {portalTarget && createPortal(topBarContent, portalTarget)}
      {actionTarget && createPortal(actionContent, actionTarget)}

      {/* Main Staff Container */}
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
        ) : viewMode === 'cards' ? (
          /* Cards with Avatars Grid View */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-50/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredStaff.map((staff) => {
                const roleConfig = getRoleConfig(staff.role, i18n.language);
                const RoleIcon = roleConfig.icon;
                const isActive = staff.status === 'Active';

                return (
                  <div
                    key={staff.id}
                    className="bg-white rounded-2xl border border-gray-150 hover:border-merkez-blue/40 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* Top Section: Avatar, Status & Quick Action Buttons */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        {/* Avatar with Status badge */}
                        <div className="relative shrink-0">
                          <div
                            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarGradient(staff.name)} flex items-center justify-center text-white font-black text-lg shadow-sm tracking-wider select-none`}
                          >
                            {getInitials(staff.name)}
                          </div>
                          <span
                            title={isActive ? (i18n.language === 'az' ? 'Aktiv' : 'Активен') : (i18n.language === 'az' ? 'Deaktiv' : 'Неактивен')}
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                              isActive ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          </span>
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            title={i18n.language === 'az' ? 'Redaktə et' : 'Редактировать'}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-merkez-blue hover:bg-blue-50 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(staff)}
                            title={i18n.language === 'az' ? 'Sil' : 'Удалить'}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Staff Name & Role Badges */}
                      <div className="space-y-1.5 mb-3.5">
                        <h3
                          title={staff.name}
                          className="font-bold text-gray-900 text-base leading-snug line-clamp-1 group-hover:text-merkez-blue transition-colors"
                        >
                          {staff.name}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${roleConfig.badgeClass}`}
                          >
                            <RoleIcon className="w-3 h-3 shrink-0" />
                            <span>{roleConfig.label}</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                            }`}
                          >
                            {isActive ? (i18n.language === 'az' ? 'Aktiv' : 'Активен') : (i18n.language === 'az' ? 'Deaktiv' : 'Неактивен')}
                          </span>
                        </div>
                      </div>

                      {/* Contact & Security Info */}
                      <div className="pt-2.5 border-t border-gray-100 space-y-1.5 text-xs text-gray-500 mb-4">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {staff.phone ? (
                            <a
                              href={`tel:${staff.phone}`}
                              className="font-semibold text-gray-700 hover:text-merkez-blue transition-colors font-mono"
                            >
                              {staff.phone}
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">
                              {i18n.language === 'az' ? 'Telefon qeyd edilməyib' : 'Телефон не указан'}
                            </span>
                          )}
                        </div>

                        {staff.pin && (
                          <div className="flex items-center gap-2 text-gray-400 text-[11px]">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>PIN: ••••</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row / Salary & Management Actions */}
                    {activeSubTab === 'salaries' ? (
                      <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5 mt-auto">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            {i18n.language === 'az' ? 'Cari Balans' : 'Баланс'}
                          </span>
                          <span
                            className={`font-black text-sm ${
                              staff.balance < 0 ? 'text-red-600' : 'text-gray-900'
                            }`}
                          >
                            {staff.balance ? parseFloat(staff.balance).toFixed(2) : '0.00'} ₼
                          </span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSelectedStaffForSalary(staff);
                              setIsSalaryModalOpen(true);
                            }}
                            className="w-full py-2 bg-merkez-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>{i18n.language === 'az' ? 'Məvacibi İdarə Et' : 'Управление зарплатой'}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      isAdmin && (
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 mt-auto">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                              {i18n.language === 'az' ? 'Maaş' : 'Оклад'}
                            </div>
                            <div className="font-bold text-xs text-gray-800">
                              {staff.salary_amount && parseFloat(staff.salary_amount) > 0
                                ? `${parseFloat(staff.salary_amount).toFixed(2)} ₼ / ${
                                    staff.salary_type === 'daily'
                                      ? i18n.language === 'az' ? 'gün' : 'день'
                                      : staff.salary_type === 'weekly'
                                      ? i18n.language === 'az' ? 'həftə' : 'нед'
                                      : i18n.language === 'az' ? 'ay' : 'мес'
                                  }`
                                : '—'}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedStaffForSalary(staff);
                              setIsSalaryModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-gray-50 hover:bg-merkez-blue hover:text-white text-gray-700 border border-gray-200 hover:border-transparent rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>{i18n.language === 'az' ? 'Maaş' : 'Зарплата'}</span>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Table View with Mini Avatars */
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
                {filteredStaff.map(staff => {
                  const roleConfig = getRoleConfig(staff.role, i18n.language);
                  const RoleIcon = roleConfig.icon;
                  const isActive = staff.status === 'Active';

                  return (
                    <tr key={staff.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(staff.name)} flex items-center justify-center text-white font-bold text-xs shadow-xs tracking-wider shrink-0 select-none`}>
                            {getInitials(staff.name)}
                          </div>
                          <span className="text-sm font-bold text-gray-900 group-hover:text-merkez-blue transition-colors">{staff.name}</span>
                        </div>
                      </td>
                      {activeSubTab === 'staff' && (
                        <td className="px-6 py-3.5">
                          <span className="text-sm font-medium text-gray-600 font-mono">{staff.phone || '—'}</span>
                        </td>
                      )}
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${roleConfig.badgeClass}`}>
                          <RoleIcon className="w-3 h-3 shrink-0" />
                          <span>{roleConfig.label}</span>
                        </span>
                      </td>
                      {activeSubTab === 'staff' && (
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                          }`}>
                            {isActive ? (i18n.language === 'az' ? 'Aktiv' : 'Активен') : (i18n.language === 'az' ? 'Deaktiv' : 'Неактивен')}
                          </span>
                        </td>
                      )}
                      {(isAdmin && activeSubTab === 'salaries') && (
                        <td className="px-6 py-3.5 text-right">
                          <span className={`text-sm font-black ${staff.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {staff.balance ? parseFloat(staff.balance).toFixed(2) : '0.00'} ₼
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-3.5 text-right">
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
                  );
                })}
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
