import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Minus,
  Search,
  Hammer,
  RefreshCw,
  CheckCircle2,
  User,
  Users,
  Phone,
  Clock,
  AlertCircle,
  Trash2,
  PackageCheck,
  Edit3,
  X,
  ArrowLeft,
  ChevronRight,
  Package,
  Wrench,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';

import SendToRepairModal from './SendToRepairModal';
import MastersModal from './MastersModal';
import ConfirmModal from '../../components/Common/ConfirmModal';
import ModalPortal from '../../components/Common/ModalPortal';

const WarehouseRepairs = ({ activeTab }) => {
  const { t, i18n } = useTranslation();
  const { profile, currentStaff } = useUser();

  const [repairs, setRepairs] = useState([]);
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected master: if null, show master cards; if selected, show that master's tools
  const [selectedMaster, setSelectedMaster] = useState(null);

  // Modals
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendModalDefaultMasterId, setSendModalDefaultMasterId] = useState(null);
  const [isMastersModalOpen, setIsMastersModalOpen] = useState(false);
  const [isNewMasterModalOpen, setIsNewMasterModalOpen] = useState(false);
  const [newMasterName, setNewMasterName] = useState('');
  const [newMasterPhone, setNewMasterPhone] = useState('');
  const [savingNewMaster, setSavingNewMaster] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Direct quantity edit modal
  const [directEditRepair, setDirectEditRepair] = useState(null);
  const [directEditQty, setDirectEditQty] = useState('1');

  // Archive / History view toggle for selected master
  const [showArchive, setShowArchive] = useState(false);

  // Portals
  const [topBarTarget, setTopBarTarget] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);

  useEffect(() => {
    setTopBarTarget(document.getElementById('warehouse-top-bar-portal-target'));
    setActionTarget(document.getElementById('warehouse-actions-portal-target'));
  }, [activeTab]);

  const getRepairQuantity = (repair) => {
    if (repair?.quantity != null && Number(repair.quantity) > 0) {
      return Math.floor(Number(repair.quantity));
    }
    const match = repair?.item_name?.match(/\(x(\d+)\)/);
    if (match) return parseInt(match[1], 10);
    return 1;
  };

  const getCleanItemName = (repair) => {
    if (!repair?.item_name) return '';
    return repair.item_name.replace(/\s*\(x\d+\)\s*/g, '').trim();
  };

  const formatItemNameWithQty = (baseName, qty) => {
    const clean = (baseName || '').replace(/\s*\(x\d+\)\s*/g, '').trim();
    return qty > 1 ? `${clean} (x${qty})` : clean;
  };

  const isRepairActive = (r) => {
    return (
      r.status !== 'RECEIVED_FROM_WORKSHOP' &&
      r.status !== 'DELIVERED_TO_CUSTOMER' &&
      getRepairQuantity(r) > 0
    );
  };

  const fetchRepairs = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warehouse_repairs')
        .select(`
          *,
          master:warehouse_masters(name),
          product:products(name, stock_quantity, barcode)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
          setRepairs([]);
        } else {
          throw error;
        }
      } else {
        setRepairs(data || []);
      }
    } catch (err) {
      console.error('Error fetching repairs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    if (!profile) return;
    try {
      // 1. Sync masters from staff table
      const { data: staffMasters } = await supabase
        .from('staff')
        .select('name, phone')
        .eq('user_id', profile.id)
        .eq('role', 'Master');

      const { data: existingMastersRaw } = await supabase
        .from('warehouse_masters')
        .select('name')
        .eq('user_id', profile.id);

      const existingNames = new Set((existingMastersRaw || []).map((m) => m.name));
      const newMasters = (staffMasters || [])
        .filter((m) => !existingNames.has(m.name))
        .map((m) => ({ user_id: profile.id, name: m.name, phone: m.phone || null }));

      if (newMasters.length > 0) {
        await supabase.from('warehouse_masters').insert(newMasters);
      }

      const { data, error } = await supabase
        .from('warehouse_masters')
        .select('id, name, phone, balance')
        .eq('user_id', profile.id)
        .order('name');

      if (!error && data) {
        setMasters(data);
      }
    } catch (err) {
      console.error('Error fetching masters:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'repairs') {
      fetchRepairs();
      fetchMasters();
    }
  }, [activeTab, profile]);

  // Combined masters list ensuring any master mentioned in repairs is also available
  const allMastersWithStats = useMemo(() => {
    const masterMap = new Map();

    // From warehouse_masters table
    masters.forEach((m) => {
      masterMap.set(m.id, {
        id: m.id,
        name: m.name,
        phone: m.phone || '',
        balance: m.balance || 0,
        activeToolsCount: 0,
        activeRepairs: [],
        completedRepairs: [],
      });
    });

    // Match repairs to masters
    repairs.forEach((r) => {
      const active = isRepairActive(r);
      const qty = getRepairQuantity(r);

      let masterKey = r.master_id;
      if (!masterKey && (r.master?.name || r.master_name)) {
        const found = masters.find(
          (m) => m.name === (r.master?.name || r.master_name)
        );
        masterKey = found ? found.id : r.master?.name || r.master_name;
      }

      if (!masterKey) masterKey = 'UNKNOWN';

      if (!masterMap.has(masterKey)) {
        masterMap.set(masterKey, {
          id: masterKey,
          name: r.master?.name || r.master_name || (i18n.language === 'az' ? 'Təyin edilməmiş usta' : 'Не указан'),
          phone: '',
          balance: 0,
          activeToolsCount: 0,
          activeRepairs: [],
          completedRepairs: [],
        });
      }

      const mObj = masterMap.get(masterKey);
      if (active) {
        mObj.activeToolsCount += qty;
        mObj.activeRepairs.push(r);
      } else {
        mObj.completedRepairs.push(r);
      }
    });

    return Array.from(masterMap.values());
  }, [masters, repairs, i18n.language]);

  // Filter masters for the search bar
  const filteredMasters = useMemo(() => {
    if (!searchQuery.trim()) return allMastersWithStats;
    const q = searchQuery.toLowerCase().trim();

    return allMastersWithStats.filter((m) => {
      const nameMatch = (m.name || '').toLowerCase().includes(q);
      const phoneMatch = (m.phone || '').toLowerCase().includes(q);
      const toolMatch = m.activeRepairs.some((r) =>
        (r.item_name || '').toLowerCase().includes(q)
      );
      return nameMatch || phoneMatch || toolMatch;
    });
  }, [allMastersWithStats, searchQuery]);

  // Total system metrics
  const totalStats = useMemo(() => {
    const totalMastersCount = allMastersWithStats.length;
    let totalActiveTools = 0;
    let mastersWithToolsCount = 0;

    allMastersWithStats.forEach((m) => {
      totalActiveTools += m.activeToolsCount;
      if (m.activeToolsCount > 0) mastersWithToolsCount += 1;
    });

    return {
      totalMastersCount,
      totalActiveTools,
      mastersWithToolsCount,
    };
  }, [allMastersWithStats]);

  // Handle +1 / -1 for any repair record
  const handleStepQuantity = async (repair, delta) => {
    const currentQty = getRepairQuantity(repair);
    const nextQty = currentQty + delta;
    const cleanName = getCleanItemName(repair);

    if (nextQty <= 0) {
      // Returned completely!
      const loadingToast = toast.loading(
        i18n.language === 'az'
          ? 'Alət təhvil alınır...'
          : i18n.language === 'ru'
          ? 'Приём инструмента...'
          : 'Returning tool...'
      );
      try {
        const updatePayload = {
          status: 'RECEIVED_FROM_WORKSHOP',
          quantity: 0,
          item_name: cleanName,
        };
        await supabase
          .from('warehouse_repairs')
          .update(updatePayload)
          .eq('id', repair.id);

        toast.success(
          i18n.language === 'az'
            ? `«${cleanName}» tam təhvil alındı!`
            : i18n.language === 'ru'
            ? `«${cleanName}» полностью принят из ремонта!`
            : `«${cleanName}» returned completely!`,
          { id: loadingToast }
        );
        fetchRepairs();
      } catch (err) {
        console.error(err);
        toast.error(err.message, { id: loadingToast });
      }
      return;
    }

    // Step quantity updated
    const loadingToast = toast.loading(
      i18n.language === 'az' ? 'Yenilənir...' : i18n.language === 'ru' ? 'Обновление...' : 'Updating...'
    );
    try {
      const newName = formatItemNameWithQty(cleanName, nextQty);
      const updatePayload = {
        quantity: nextQty,
        item_name: newName,
        status: 'BEING_REPAIRED',
      };
      let { error } = await supabase
        .from('warehouse_repairs')
        .update(updatePayload)
        .eq('id', repair.id);

      if (error && (error.code === '42703' || error.message?.includes('quantity'))) {
        delete updatePayload.quantity;
        await supabase.from('warehouse_repairs').update(updatePayload).eq('id', repair.id);
      }

      toast.success(
        delta > 0
          ? i18n.language === 'az'
            ? `Say artırıldı: ${nextQty} ədəd`
            : i18n.language === 'ru'
            ? `Количество увеличено: ${nextQty} шт.`
            : `Increased to ${nextQty} pcs`
          : i18n.language === 'az'
          ? `1 ədəd təhvil alındı (Qaldı: ${nextQty} ədəd)`
          : i18n.language === 'ru'
          ? `1 шт. принята (Осталось: ${nextQty} шт.)`
          : `Returned 1 pc (${nextQty} remain)`,
        { id: loadingToast }
      );
      fetchRepairs();
    } catch (err) {
      console.error(err);
      toast.error(err.message, { id: loadingToast });
    }
  };

  // Direct edit quantity save
  const handleSaveDirectEdit = async () => {
    if (!directEditRepair) return;
    const newQty = parseInt(directEditQty, 10);
    if (isNaN(newQty) || newQty < 0) {
      toast.error(
        i18n.language === 'az' ? 'Düzgün say daxil edin' : 'Введите корректное число'
      );
      return;
    }

    const cleanName = getCleanItemName(directEditRepair);

    if (newQty === 0) {
      // Returned completely
      const loadingToast = toast.loading(i18n.language === 'az' ? 'Yenilənir...' : 'Сохранение...');
      try {
        await supabase
          .from('warehouse_repairs')
          .update({
            status: 'RECEIVED_FROM_WORKSHOP',
            quantity: 0,
            item_name: cleanName,
          })
          .eq('id', directEditRepair.id);

        toast.success(
          i18n.language === 'az'
            ? `«${cleanName}» tam təhvil alındı!`
            : `«${cleanName}» полностью принят!`,
          { id: loadingToast }
        );
        setDirectEditRepair(null);
        fetchRepairs();
      } catch (err) {
        toast.error(err.message, { id: loadingToast });
      }
      return;
    }

    const newName = formatItemNameWithQty(cleanName, newQty);
    const loadingToast = toast.loading(i18n.language === 'az' ? 'Yenilənir...' : 'Сохранение...');
    try {
      const updatePayload = {
        quantity: newQty,
        item_name: newName,
        status: 'BEING_REPAIRED',
      };
      let { error } = await supabase
        .from('warehouse_repairs')
        .update(updatePayload)
        .eq('id', directEditRepair.id);

      if (error && (error.code === '42703' || error.message?.includes('quantity'))) {
        delete updatePayload.quantity;
        await supabase.from('warehouse_repairs').update(updatePayload).eq('id', directEditRepair.id);
      }

      toast.success(
        i18n.language === 'az'
          ? `Say yeniləndi: ${newQty} ədəd`
          : `Количество обновлено: ${newQty} шт.`,
        { id: loadingToast }
      );
      setDirectEditRepair(null);
      fetchRepairs();
    } catch (err) {
      toast.error(err.message, { id: loadingToast });
    }
  };

  // Quick Add Master
  const handleSaveNewMaster = async (e) => {
    e?.preventDefault();
    if (!newMasterName.trim()) {
      toast.error(i18n.language === 'az' ? 'Ustanın adını daxil edin' : 'Введите имя мастера');
      return;
    }
    setSavingNewMaster(true);
    const toastId = toast.loading(i18n.language === 'az' ? 'Usta əlavə edilir...' : 'Добавление мастера...');
    try {
      const { data, error } = await supabase
        .from('warehouse_masters')
        .insert([
          {
            user_id: profile.id,
            name: newMasterName.trim(),
            phone: newMasterPhone.trim() || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success(
        i18n.language === 'az' ? 'Usta uğurla əlavə edildi!' : 'Мастер успешно добавлен!',
        { id: toastId }
      );
      setNewMasterName('');
      setNewMasterPhone('');
      setIsNewMasterModalOpen(false);
      await fetchMasters();
      if (data) {
        setSelectedMaster(data);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Xəta baş verdi', { id: toastId });
    } finally {
      setSavingNewMaster(false);
    }
  };

  // Delete repair entry
  const handleDeleteRepair = async (id) => {
    const loadingToast = toast.loading(i18n.language === 'az' ? 'Silinir...' : 'Удаление...');
    try {
      const { error } = await supabase
        .from('warehouse_repairs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(i18n.language === 'az' ? 'Təmir silindi' : 'Ремонт удален', { id: loadingToast });
      setRepairs((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message, { id: loadingToast });
    }
  };

  // Helper: Initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Top bar search and action buttons (portaled or inline)
  const topBarContent = (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="relative w-full max-w-xs shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder={
            selectedMaster
              ? i18n.language === 'az'
                ? `${selectedMaster.name} alətləri üzrə axtarış...`
                : 'Поиск инструмента...'
              : i18n.language === 'az'
              ? 'Usta və ya alət axtar...'
              : 'Поиск мастера или инструмента...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-[38px] pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {selectedMaster && (
        <button
          onClick={() => {
            setSelectedMaster(null);
            setShowArchive(false);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {i18n.language === 'az' ? 'Bütün Ustalar' : 'Все мастера'}
        </button>
      )}
    </div>
  );

  const actionButtons = currentStaff?.role?.toLowerCase() !== 'master' && (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => setIsNewMasterModalOpen(true)}
        className="flex items-center justify-center gap-1.5 h-[38px] bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
      >
        <User className="w-3.5 h-3.5 text-blue-600" />
        {i18n.language === 'az' ? '+ Yeni Usta' : '+ Новый мастер'}
      </button>

      <button
        onClick={() => {
          setSendModalDefaultMasterId(selectedMaster ? selectedMaster.id : null);
          setIsSendModalOpen(true);
        }}
        className="flex items-center justify-center gap-1.5 h-[38px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        {i18n.language === 'az' ? 'Təmirə Göndər' : 'Передать в ремонт'}
      </button>

      <button
        onClick={() => setIsMastersModalOpen(true)}
        className="flex items-center justify-center gap-1.5 h-[38px] bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-2.5 py-2 rounded-lg font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
        title={i18n.language === 'az' ? 'Ustaların İdarəsi və Balanslar' : 'Управление мастерами и балансы'}
      >
        <Users className="w-3.5 h-3.5 text-gray-500" />
      </button>
    </div>
  );

  // Tools of currently selected master
  const currentMasterActiveRepairs = useMemo(() => {
    if (!selectedMaster) return [];
    const masterObj = allMastersWithStats.find((m) => m.id === selectedMaster.id);
    const list = masterObj ? masterObj.activeRepairs : [];

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((r) =>
      (r.item_name || '').toLowerCase().includes(q) ||
      (r.repair_code || '').toLowerCase().includes(q)
    );
  }, [selectedMaster, allMastersWithStats, searchQuery]);

  const currentMasterCompletedRepairs = useMemo(() => {
    if (!selectedMaster) return [];
    const masterObj = allMastersWithStats.find((m) => m.id === selectedMaster.id);
    const list = masterObj ? masterObj.completedRepairs : [];

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((r) =>
      (r.item_name || '').toLowerCase().includes(q) ||
      (r.repair_code || '').toLowerCase().includes(q)
    );
  }, [selectedMaster, allMastersWithStats, searchQuery]);

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
      {/* Top Header Controls (if portals not found, rendered inline) */}
      {(!topBarTarget || !actionTarget) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 mb-3 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex-1 w-full flex items-center gap-4">{topBarContent}</div>
          {actionButtons && <div className="shrink-0">{actionButtons}</div>}
        </div>
      )}
      {topBarTarget && createPortal(topBarContent, topBarTarget)}
      {actionTarget && createPortal(actionButtons, actionTarget)}

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-50/50 rounded-xl p-3 sm:p-4 lg:p-5 flex flex-col min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-12">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-bold text-gray-500">
              {i18n.language === 'az' ? 'Məlumatlar yüklənir...' : 'Загрузка данных...'}
            </p>
          </div>
        ) : selectedMaster === null ? (
          /* ========================================================================= */
          /* 1. MASTERS CARDS VIEW (DEFAULT AS REQUESTED)                               */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 shrink-0">
              <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {i18n.language === 'az' ? 'Cəmi Ustalar' : 'Всего мастеров'}
                  </div>
                  <div className="text-xl font-black text-gray-900 mt-0.5">
                    {totalStats.totalMastersCount} {i18n.language === 'az' ? 'nəfər' : 'маст.'}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <Hammer className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {i18n.language === 'az' ? 'Təmirdə Olan Alətlər' : 'Инструментов в ремонте'}
                  </div>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">
                    {totalStats.totalActiveTools} {i18n.language === 'az' ? 'ədəd' : 'шт.'}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {i18n.language === 'az' ? 'Aləti Olan Ustalar' : 'Мастера с инструментами'}
                  </div>
                  <div className="text-xl font-black text-amber-800 mt-0.5">
                    {totalStats.mastersWithToolsCount} {i18n.language === 'az' ? 'usta aktiv' : 'активны'}
                  </div>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredMasters.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-gray-200/80 my-auto">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
                  <Users className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-base font-black text-gray-800 mb-1">
                  {i18n.language === 'az' ? 'Heç bir usta tapılmadı' : 'Мастера не найдены'}
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mb-4">
                  {i18n.language === 'az'
                    ? 'Axtarış sorğusunu dəyişin və ya «+ Yeni Usta» düyməsi ilə yeni usta əlavə edin.'
                    : 'Измените запрос или добавьте нового мастера кнопкой «+ Новый мастер».'}
                </p>
                <button
                  onClick={() => setIsNewMasterModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all"
                >
                  {i18n.language === 'az' ? '+ Yeni Usta Əlavə Et' : '+ Добавить мастера'}
                </button>
              </div>
            ) : (
              /* Grid of Master Cards */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                {filteredMasters.map((master) => {
                  const hasTools = master.activeToolsCount > 0;
                  const initials = getInitials(master.name);

                  return (
                    <div
                      key={master.id}
                      onClick={() => setSelectedMaster(master)}
                      className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between cursor-pointer group shadow-xs hover:shadow-md ${
                        hasTools
                          ? 'border-emerald-200/90 hover:border-emerald-400 bg-gradient-to-b from-white to-emerald-50/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Master Header */}
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-xs tracking-wider shrink-0 ${
                                hasTools
                                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                                  : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 border border-gray-300'
                              }`}
                            >
                              {initials}
                            </div>
                            <div>
                              <h3 className="font-black text-base text-gray-900 group-hover:text-emerald-700 transition-colors leading-tight">
                                {master.name}
                              </h3>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mt-1">
                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                <span>{master.phone || (i18n.language === 'az' ? 'Nömrə qeyd edilməyib' : 'Номер не указан')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="w-7 h-7 rounded-lg bg-gray-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors text-gray-400 group-hover:text-emerald-700 shrink-0">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Tool Count Badge */}
                        <div
                          className={`rounded-xl p-3 mb-3.5 flex items-center justify-between border ${
                            hasTools
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                              : 'bg-gray-50 border-gray-100 text-gray-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Hammer
                              className={`w-4 h-4 ${hasTools ? 'text-emerald-600' : 'text-gray-400'}`}
                            />
                            <span className="text-xs font-bold uppercase tracking-wide">
                              {i18n.language === 'az' ? 'Hazırda ustada:' : 'Сейчас у мастера:'}
                            </span>
                          </div>
                          <div
                            className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                              hasTools
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {master.activeToolsCount} {i18n.language === 'az' ? 'ədəd' : 'шт.'}
                          </div>
                        </div>

                        {/* Active Tools Preview Chips */}
                        {hasTools && (
                          <div className="mb-4">
                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                              {i18n.language === 'az' ? 'Təmirdəki alətlər:' : 'Инструменты:'}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {master.activeRepairs.slice(0, 4).map((r) => {
                                const qty = getRepairQuantity(r);
                                const clean = getCleanItemName(r);
                                return (
                                  <span
                                    key={r.id}
                                    className="inline-flex items-center gap-1 bg-white border border-emerald-200 text-emerald-900 text-xs font-bold px-2 py-1 rounded-lg shadow-2xs"
                                  >
                                    <span className="truncate max-w-[150px]">{clean}</span>
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                                      {qty}
                                    </span>
                                  </span>
                                );
                              })}
                              {master.activeRepairs.length > 4 && (
                                <span className="inline-flex items-center text-xs font-bold text-gray-400 px-1 py-0.5">
                                  +{master.activeRepairs.length - 4} {i18n.language === 'az' ? 'daha' : 'еще'}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMaster(master);
                          }}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            hasTools
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }`}
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>
                            {hasTools
                              ? i18n.language === 'az'
                                ? `Alətlərə bax (${master.activeToolsCount})`
                                : `Смотреть инструменты (${master.activeToolsCount})`
                              : i18n.language === 'az'
                              ? 'Alətlərə bax'
                              : 'Смотреть список'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSendModalDefaultMasterId(master.id);
                            setIsSendModalOpen(true);
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer shrink-0"
                          title={i18n.language === 'az' ? 'Bu ustaya alət ver' : 'Выдать инструмент мастеру'}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. MASTER DETAILED TOOLS VIEW (NO COMPLEX STATUSES, JUST + AND -)         */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top Back & Master Profile Bar */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-4 mb-4 shadow-xs shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => {
                    setSelectedMaster(null);
                    setShowArchive(false);
                  }}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
                  title={i18n.language === 'az' ? 'Geri (Bütün Ustalar)' : 'Назад (Все мастера)'}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-sm tracking-wider shrink-0 shadow-xs">
                  {getInitials(selectedMaster.name)}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-gray-900 leading-tight">
                      {selectedMaster.name}
                    </h2>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full">
                      {currentMasterActiveRepairs.reduce(
                        (sum, r) => sum + getRepairQuantity(r),
                        0
                      )}{' '}
                      {i18n.language === 'az' ? 'alət aktiv' : 'активно'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    {selectedMaster.phone && (
                      <span className="flex items-center gap-1 font-medium">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {selectedMaster.phone}
                      </span>
                    )}
                    <span>•</span>
                    <span className="text-gray-400">
                      {i18n.language === 'az' ? 'Hazırda bu ustanın əlində olan alətlər' : 'Инструменты у данного мастера'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons on master header */}
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setShowArchive(!showArchive)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    showArchive
                      ? 'bg-gray-800 text-white border-gray-800 shadow-xs'
                      : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  {showArchive
                    ? i18n.language === 'az'
                      ? 'Aktiv Alətlərə Qayıt'
                      : 'К активным'
                    : i18n.language === 'az'
                    ? `Tarixçə (${currentMasterCompletedRepairs.length})`
                    : `История (${currentMasterCompletedRepairs.length})`}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSendModalDefaultMasterId(selectedMaster.id);
                    setIsSendModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {i18n.language === 'az' ? '+ Bu Ustaya Alət Ver' : '+ Выдать инструмент'}
                </button>
              </div>
            </div>

            {/* List of Tools */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {showArchive ? (
                /* Archive / Completed Repairs View */
                <div>
                  <div className="mb-3 px-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {i18n.language === 'az'
                      ? 'Əvvəl təhvil verilmiş və tamamlanmış alətlər:'
                      : 'Ранее принятые и закрытые ремонты:'}
                  </div>

                  {currentMasterCompletedRepairs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 font-bold text-sm">
                      {i18n.language === 'az' ? 'Tarixçədə alət yoxdur' : 'В истории пока нет записей'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                      {currentMasterCompletedRepairs.map((repair) => (
                        <div
                          key={repair.id}
                          className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3 opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <div>
                            <div className="font-bold text-sm text-gray-800">
                              {getCleanItemName(repair)}
                            </div>
                            <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                                {repair.repair_code}
                              </span>
                              <span>•</span>
                              <span>
                                {repair.created_at ? new Date(repair.created_at).toLocaleDateString() : '—'}
                              </span>
                            </div>
                          </div>
                          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-lg">
                            ✓ {i18n.language === 'az' ? 'Təhvil alınıb' : 'Принято'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : currentMasterActiveRepairs.length === 0 ? (
                /* No Active Tools for this master */
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center flex flex-col items-center justify-center my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-black text-gray-900 mb-1">
                    {i18n.language === 'az'
                      ? 'Bu ustanın əlində hazırda heç bir alət yoxdur'
                      : 'У этого мастера сейчас нет инструментов в ремонте'}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mb-4">
                    {i18n.language === 'az'
                      ? 'Usta bütün alətləri təhvil verib. Yeni alət vermək üçün aşağıdakı düyməni sıxın.'
                      : 'Все инструменты возвращены. Чтобы передать новый инструмент, нажмите кнопку ниже.'}
                  </p>
                  <button
                    onClick={() => {
                      setSendModalDefaultMasterId(selectedMaster.id);
                      setIsSendModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    {i18n.language === 'az' ? '+ Bu Ustaya Alət Ver' : '+ Выдать инструмент мастеру'}
                  </button>
                </div>
              ) : (
                /* Active Tools Grid with large Plus / Minus Buttons */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pb-4">
                  {currentMasterActiveRepairs.map((repair) => {
                    const totalQty = getRepairQuantity(repair);
                    const cleanName = getCleanItemName(repair);

                    return (
                      <div
                        key={repair.id}
                        className="bg-white rounded-2xl border border-gray-200/90 hover:border-emerald-300 p-4 shadow-xs transition-all flex flex-col justify-between"
                      >
                        {/* Top: Tool Info */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-mono text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                              {repair.repair_code}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {repair.type === 'INTERNAL_STOCK' ? (
                                <span className="text-orange-700 font-black text-[10px] px-2 py-0.5 bg-orange-100 rounded-md">
                                  {i18n.language === 'az' ? 'Anbar' : 'Склад'}
                                </span>
                              ) : (
                                <span className="text-purple-700 font-black text-[10px] px-2 py-0.5 bg-purple-100 rounded-md">
                                  {i18n.language === 'az' ? 'Müştəri' : 'Клиент'}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(repair.id)}
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                                title={i18n.language === 'az' ? 'Sil' : 'Удалить'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h3 className="font-black text-base text-gray-900 leading-snug mb-2">
                            {cleanName}
                          </h3>

                          {repair.issue_description && (
                            <div className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-2 mb-3">
                              <span className="font-bold text-gray-700 block text-[10px] uppercase tracking-wider mb-0.5">
                                {i18n.language === 'az' ? 'Qeyd / Nasazlıq:' : 'Примечание:'}
                              </span>
                              <span className="line-clamp-2">{repair.issue_description}</span>
                            </div>
                          )}

                          <div className="text-[11px] text-gray-400 font-medium mb-3 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              {repair.created_at
                                ? new Date(repair.created_at).toLocaleDateString()
                                : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Bottom: The requested PLUS and MINUS buttons */}
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/60 -mx-4 -mb-4 p-3.5 rounded-b-2xl">
                          <div className="text-xs font-bold text-gray-600">
                            {i18n.language === 'az' ? 'Ustada olan say:' : 'Количество:'}
                          </div>

                          {/* Plus and Minus Quantity Controller */}
                          <div className="inline-flex items-center bg-white border border-emerald-300 rounded-xl p-1 shadow-xs">
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(repair, -1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-600 font-black text-sm active:scale-90 transition-all cursor-pointer"
                              title={
                                totalQty === 1
                                  ? i18n.language === 'az'
                                    ? 'Tam təhvil al (0 ədəd)'
                                    : 'Принять полностью (0 шт.)'
                                  : i18n.language === 'az'
                                  ? '1 ədəd azalt / Təhvil al'
                                  : 'Уменьшить на 1'
                              }
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDirectEditRepair(repair);
                                setDirectEditQty(String(totalQty));
                              }}
                              className="px-3 text-sm font-black text-emerald-950 hover:underline cursor-pointer"
                              title={
                                i18n.language === 'az'
                                  ? 'Dəqiq sayı daxil etmək üçün klikləyin'
                                  : 'Нажмите, чтобы ввести число вручную'
                              }
                            >
                              {totalQty} {i18n.language === 'az' ? 'ədəd' : 'шт.'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStepQuantity(repair, 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm active:scale-90 transition-all cursor-pointer shadow-2xs"
                              title={
                                i18n.language === 'az'
                                  ? '1 ədəd artır (Ustaya daha bir alət verildi)'
                                  : 'Увеличить на 1'
                              }
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* 1. Quick Add New Master Modal */}
      {isNewMasterModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-black">
                    <User className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-gray-900">
                    {i18n.language === 'az' ? 'Yeni Usta Əlavə Et' : 'Добавить нового мастера'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsNewMasterModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNewMaster} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                    {i18n.language === 'az' ? 'Ustanın Adı və Soyadı *' : 'Имя мастера *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      i18n.language === 'az'
                        ? 'Məs: QARMON USTA RACİ'
                        : 'Напр: МАСТЕР АЛИ'
                    }
                    value={newMasterName}
                    onChange={(e) => setNewMasterName(e.target.value)}
                    className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                    {i18n.language === 'az' ? 'Əlaqə Nömrəsi' : 'Телефон'}
                  </label>
                  <input
                    type="text"
                    placeholder="+994 50 123 45 67"
                    value={newMasterPhone}
                    onChange={(e) => setNewMasterPhone(e.target.value)}
                    className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewMasterModalOpen(false)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    {i18n.language === 'az' ? 'Ləğv et' : 'Отмена'}
                  </button>

                  <button
                    type="submit"
                    disabled={savingNewMaster || !newMasterName.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    {savingNewMaster
                      ? i18n.language === 'az'
                        ? 'Yadda saxlanılır...'
                        : 'Сохранение...'
                      : i18n.language === 'az'
                      ? 'Yadda Saxla'
                      : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* 2. Direct Quantity Edit Modal */}
      {directEditRepair && (
        <ModalPortal>
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <h3 className="font-black text-sm text-gray-900">
                  {i18n.language === 'az' ? 'Sayı birbaşa redaktə et' : 'Изменить количество'}
                </h3>
                <button
                  onClick={() => setDirectEditRepair(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <div className="text-xs text-gray-500 font-medium mb-1">
                  {getCleanItemName(directEditRepair)}
                </div>
                <div className="text-[11px] text-gray-400 mb-3">
                  {i18n.language === 'az'
                    ? '0 daxil etsəniz, alət tam təhvil alınmış sayılacaq.'
                    : 'Если ввести 0, инструмент будет закрыт как принятый.'}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={directEditQty}
                    onChange={(e) => setDirectEditQty(e.target.value)}
                    className="flex-1 h-12 text-center text-xl font-black bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                    autoFocus
                  />
                  <span className="font-bold text-gray-600 text-sm">
                    {i18n.language === 'az' ? 'ədəd' : 'шт.'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDirectEditRepair(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  {i18n.language === 'az' ? 'Ləğv et' : 'Отмена'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveDirectEdit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                >
                  {i18n.language === 'az' ? 'Təsdiqlə' : 'Применить'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* 3. Send To Repair Modal */}
      {isSendModalOpen && (
        <SendToRepairModal
          isOpen={isSendModalOpen}
          defaultMasterId={sendModalDefaultMasterId}
          onClose={() => {
            setIsSendModalOpen(false);
            setSendModalDefaultMasterId(null);
          }}
          onSuccess={() => {
            setIsSendModalOpen(false);
            setSendModalDefaultMasterId(null);
            fetchRepairs();
            fetchMasters();
          }}
        />
      )}

      {/* 4. Full Masters Management Modal */}
      {isMastersModalOpen && (
        <MastersModal
          isOpen={isMastersModalOpen}
          onClose={() => {
            setIsMastersModalOpen(false);
            fetchMasters();
            fetchRepairs();
          }}
        />
      )}

      {/* 5. Delete Confirm Modal */}
      {deleteConfirmId && (
        <ConfirmModal
          isOpen={!!deleteConfirmId}
          title={i18n.language === 'az' ? 'Təmiri silmək' : 'Удалить ремонт'}
          message={
            i18n.language === 'az'
              ? 'Bu alət qeydini silmək istədiyinizə əminsiniz?'
              : 'Вы уверены, что хотите удалить эту запись?'
          }
          onConfirm={() => handleDeleteRepair(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
};

export default WarehouseRepairs;
