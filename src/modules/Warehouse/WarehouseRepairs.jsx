import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Hammer, RefreshCw, CheckCircle2, User, Clock, AlertCircle, Eye, Trash2, Minus, PackageCheck, Edit3, Banknote, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';

import SendToRepairModal from './SendToRepairModal';
import ReturnFromRepairModal from './ReturnFromRepairModal';
import MastersModal from './MastersModal';
import Dropdown from '../../components/Common/Dropdown';
import ConfirmModal from '../../components/Common/ConfirmModal';
import ModalPortal from '../../components/Common/ModalPortal';

const WarehouseRepairs = ({ activeTab }) => {
  const { t, i18n } = useTranslation();
  const { profile, currentStaff } = useUser();
  
  const [repairs, setRepairs] = useState([]);
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [masterFilter, setMasterFilter] = useState('ALL');
  
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isMastersModalOpen, setIsMastersModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [selectedReturnQty, setSelectedReturnQty] = useState(null);

  // Quick decrease and direct quantity edit states
  const [decreaseModalRepair, setDecreaseModalRepair] = useState(null);
  const [decreaseCount, setDecreaseCount] = useState(1);
  const [decreaseFee, setDecreaseFee] = useState('');

  const [directEditRepair, setDirectEditRepair] = useState(null);
  const [directEditQty, setDirectEditQty] = useState('1');

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

  const STATUSES = {
    RECEIVED_FROM_CUSTOMER: { az: 'Müştəridən təhvil alındı', ru: 'Получено от клиента', en: 'Received from customer', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    SENT_TO_WORKSHOP: { az: 'Emalatxanaya göndərildi', ru: 'Отправлено в мастерскую', en: 'Sent to workshop', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    BEING_REPAIRED: { az: 'Təmir edilir', ru: 'Ремонтируется', en: 'Being repaired', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    READY: { az: 'Hazır', ru: 'Готово', en: 'Ready', color: 'bg-green-100 text-green-800 border-green-200' },
    RECEIVED_FROM_WORKSHOP: { az: 'Emalatxanadan təhvil alındı', ru: 'Получено из мастерской', en: 'Received from workshop', color: 'bg-teal-100 text-teal-800 border-teal-200' },
    DELIVERED_TO_CUSTOMER: { az: 'Müştəriyə təhvil verildi', ru: 'Выдано клиенту', en: 'Delivered to customer', color: 'bg-gray-100 text-gray-800 border-gray-200' }
  };

  const getStatusOptions = (type) => {
    if (type === 'INTERNAL_STOCK') {
      return ['SENT_TO_WORKSHOP', 'BEING_REPAIRED', 'READY', 'RECEIVED_FROM_WORKSHOP'];
    }
    return ['RECEIVED_FROM_CUSTOMER', 'SENT_TO_WORKSHOP', 'BEING_REPAIRED', 'READY', 'RECEIVED_FROM_WORKSHOP', 'DELIVERED_TO_CUSTOMER'];
  };

  const handleOpenReturnModal = (repair, qty = null) => {
    setSelectedRepair({ ...repair, targetStatus: 'RECEIVED_FROM_WORKSHOP' });
    setSelectedReturnQty(qty);
    setIsReturnModalOpen(true);
  };

  const handleOpenQuickDecrease = (repair) => {
    setDecreaseModalRepair(repair);
    setDecreaseCount(1);
    setDecreaseFee('');
  };

  const handleExecuteQuickDecrease = async () => {
    if (!decreaseModalRepair) return;
    const repair = decreaseModalRepair;
    const totalQty = getRepairQuantity(repair);
    const count = Math.min(totalQty, Math.max(1, parseInt(decreaseCount, 10) || 1));
    const fee = parseFloat(decreaseFee) || 0;
    const cleanName = getCleanItemName(repair);
    const remainingQty = totalQty - count;
    
    const loadingToast = toast.loading(i18n.language === 'az' ? 'Yenilənir...' : 'Обновление...');
    try {
      // 1. If master fee entered, update master balance
      if (fee > 0 && repair.master_id) {
        const { data: masterData } = await supabase
          .from('warehouse_masters')
          .select('balance')
          .eq('id', repair.master_id)
          .single();
        const newBalance = (parseFloat(masterData?.balance || 0) + fee);
        await supabase
          .from('warehouse_masters')
          .update({ balance: newBalance })
          .eq('id', repair.master_id);
      }

      // 2. If partial return (remainingQty > 0)
      if (remainingQty > 0) {
        const returnCode = `${repair.repair_code}-R${Date.now().toString().slice(-4)}`;
        const returnedName = count > 1 ? `${cleanName} (x${count})` : cleanName;
        
        const insertPayload = {
          user_id: profile.id,
          repair_code: returnCode,
          type: repair.type,
          product_id: repair.product_id || null,
          item_name: returnedName,
          quantity: count,
          serial_number: repair.serial_number || null,
          master_id: repair.master_id || null,
          issue_description: `${repair.issue_description || ''}\n[${new Date().toLocaleDateString()}: ${count} ədəd təhvil alındı]`.trim(),
          status: 'RECEIVED_FROM_WORKSHOP',
          master_fee: fee,
          parts_cost: 0,
          photo_before: repair.photo_before || null
        };

        const insertRes = await supabase.from('warehouse_repairs').insert([insertPayload]);
        if (insertRes.error && (insertRes.error.code === '42703' || insertRes.error.message?.includes('quantity'))) {
          delete insertPayload.quantity;
          await supabase.from('warehouse_repairs').insert([insertPayload]);
        }

        // Update remaining items on original record
        const remainingName = remainingQty > 1 ? `${cleanName} (x${remainingQty})` : cleanName;
        const updatePayload = {
          quantity: remainingQty,
          item_name: remainingName,
          issue_description: `${repair.issue_description || ''}\n[${new Date().toLocaleDateString()}: ${count} ədəd təhvil alındı, qaldı: ${remainingQty} ədəd]`.trim()
        };

        let updateRes = await supabase.from('warehouse_repairs').update(updatePayload).eq('id', repair.id);
        if (updateRes.error && (updateRes.error.code === '42703' || updateRes.error.message?.includes('quantity'))) {
          delete updatePayload.quantity;
          await supabase.from('warehouse_repairs').update(updatePayload).eq('id', repair.id);
        }

        toast.success(
          i18n.language === 'az'
            ? `${count} ədəd təhvil alındı. Təmirdə ${remainingQty} ədəd qaldı.`
            : i18n.language === 'ru'
            ? `Принято ${count} шт. В ремонте осталось ${remainingQty} шт.`
            : `Received ${count} pcs. ${remainingQty} pcs remain in repair.`,
          { id: loadingToast }
        );
      } else {
        // All items returned
        const updatePayload = {
          status: 'RECEIVED_FROM_WORKSHOP',
          master_fee: (parseFloat(repair.master_fee) || 0) + fee
        };
        await supabase.from('warehouse_repairs').update(updatePayload).eq('id', repair.id);
        toast.success(
          i18n.language === 'az' ? 'Bütün alətlər təhvil alındı və təmir tamamlandı!' : 'Все инструменты приняты, ремонт закрыт!',
          { id: loadingToast }
        );
      }

      setDecreaseModalRepair(null);
      fetchRepairs();
    } catch (err) {
      console.error(err);
      toast.error(err.message, { id: loadingToast });
    }
  };

  const handleQuickIncrease = async (repair) => {
    const totalQty = getRepairQuantity(repair);
    const newQty = totalQty + 1;
    const cleanName = getCleanItemName(repair);
    const newName = formatItemNameWithQty(cleanName, newQty);
    
    const loadingToast = toast.loading(i18n.language === 'az' ? 'Artırılır...' : 'Увеличение...');
    try {
      const payload = {
        quantity: newQty,
        item_name: newName
      };
      let { error } = await supabase.from('warehouse_repairs').update(payload).eq('id', repair.id);
      if (error && (error.code === '42703' || error.message?.includes('quantity'))) {
        delete payload.quantity;
        await supabase.from('warehouse_repairs').update(payload).eq('id', repair.id);
      }
      toast.success(
        i18n.language === 'az' ? `Say artırıldı: ${newQty} ədəd` : `Количество увеличено: ${newQty} шт.`,
        { id: loadingToast }
      );
      fetchRepairs();
    } catch (err) {
      console.error(err);
      toast.error(err.message, { id: loadingToast });
    }
  };

  const handleOpenDirectEdit = (repair) => {
    setDirectEditRepair(repair);
    setDirectEditQty(String(getRepairQuantity(repair)));
  };

  const handleSaveDirectEdit = async () => {
    if (!directEditRepair) return;
    const newQty = parseInt(directEditQty, 10);
    if (isNaN(newQty) || newQty <= 0) {
      toast.error(i18n.language === 'az' ? 'Düzgün say daxil edin' : 'Введите корректное число');
      return;
    }
    const cleanName = getCleanItemName(directEditRepair);
    const newName = formatItemNameWithQty(cleanName, newQty);

    const loadingToast = toast.loading(i18n.language === 'az' ? 'Yenilənir...' : 'Сохранение...');
    try {
      const payload = {
        quantity: newQty,
        item_name: newName
      };
      let { error } = await supabase.from('warehouse_repairs').update(payload).eq('id', directEditRepair.id);
      if (error && (error.code === '42703' || error.message?.includes('quantity'))) {
        delete payload.quantity;
        await supabase.from('warehouse_repairs').update(payload).eq('id', directEditRepair.id);
      }
      toast.success(
        i18n.language === 'az' ? `Say yeniləndi: ${newQty} ədəd` : `Количество обновлено: ${newQty} шт.`,
        { id: loadingToast }
      );
      setDirectEditRepair(null);
      fetchRepairs();
    } catch (err) {
      console.error(err);
      toast.error(err.message, { id: loadingToast });
    }
  };

  const handleStatusChange = async (repair, newStatus) => {
    // If it requires master fee computation or return receipt
    if (newStatus === 'RECEIVED_FROM_WORKSHOP') {
      handleOpenReturnModal(repair);
      return;
    }

    // Otherwise, just update directly
    const loadingToast = toast.loading(i18n.language === 'az' ? 'Yenilənir...' : i18n.language === 'ru' ? 'Обновление...' : 'Updating...');
    try {
      const { error } = await supabase
        .from('warehouse_repairs')
        .update({ status: newStatus })
        .eq('id', repair.id);
        
      if (error) throw error;
      toast.success(i18n.language === 'az' ? 'Status dəyişdirildi' : 'Статус изменен', { id: loadingToast });
      fetchRepairs();
    } catch (err) {
      console.error(err);
      toast.error(err.message, { id: loadingToast });
    }
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
          product:products(name, stock_quantity)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
          console.warn("warehouse_repairs table doesn't exist yet.");
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

  const handleDeleteRepair = async (id) => {
    if (currentStaff && currentStaff?.role !== 'Admin') {
      toast.error(i18n.language === 'az' ? 'Yalnız admin silə bilər' : 'Только администратор имеет право удалять');
      return;
    }
    const loadingToast = toast.loading(i18n.language === 'az' ? 'Silinir...' : 'Удаление...');
    try {
      const { error } = await supabase
        .from('warehouse_repairs')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success(i18n.language === 'az' ? 'Təmir silindi' : 'Ремонт удален', { id: loadingToast });
      setRepairs(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      toast.error(err.message, { id: loadingToast });
    }
  };

  const fetchMasters = async () => {
    if (!profile) return;
    try {
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

  const masterOptions = React.useMemo(() => {
    const counts = {};
    const masterMap = new Map();

    masters.forEach(m => {
      masterMap.set(m.id, m.name);
    });

    repairs.forEach(r => {
      if (r.master_id && r.master?.name) {
        masterMap.set(r.master_id, r.master.name);
      }
      const isActive = r.status !== 'RECEIVED_FROM_WORKSHOP' && r.status !== 'DELIVERED_TO_CUSTOMER';
      if (isActive && (r.master_id || r.master?.name)) {
        const key = r.master_id || r.master?.name;
        const qty = getRepairQuantity(r);
        counts[key] = (counts[key] || 0) + qty;
      }
    });

    return Array.from(masterMap.entries()).map(([id, name]) => {
      const activeCount = counts[id] || counts[name] || 0;
      const countLabel = activeCount > 0 
        ? ` (${activeCount} ${i18n.language === 'az' ? 'alət' : i18n.language === 'ru' ? 'инстр.' : 'tools'})` 
        : '';
      return {
        id,
        name,
        activeCount,
        label: `${name}${countLabel}`
      };
    }).sort((a, b) => b.activeCount - a.activeCount || a.name.localeCompare(b.name));
  }, [repairs, masters, i18n.language]);

  const filteredRepairs = repairs.filter(r => {
    const matchesSearch = 
      (r.item_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.repair_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.master?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesMaster = masterFilter === 'ALL' || r.master_id === masterFilter || r.master?.name === masterFilter;
    
    return matchesSearch && matchesStatus && matchesMaster;
  });

  const topBarContent = (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="relative w-44 shrink-0 hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder={i18n.language === 'az' ? 'Axtarış...' : i18n.language === 'ru' ? 'Поиск...' : 'Search...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-[38px] pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all outline-none"
        />
      </div>
      
      <div className="shrink-0 min-w-[150px]">
        <Dropdown
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          options={[
            { value: 'ALL', label: i18n.language === 'az' ? 'Bütün Statuslar' : i18n.language === 'ru' ? 'Все статусы' : 'All Statuses' },
            ...Object.keys(STATUSES).map(opt => ({
              value: opt,
              label: STATUSES[opt]?.[i18n.language === 'az' ? 'az' : i18n.language === 'ru' ? 'ru' : 'en']
            }))
          ]}
          buttonClassName={`h-[38px] px-3 py-2 text-xs font-bold rounded-lg border focus:outline-none focus:ring-1 focus:ring-merkez-blue cursor-pointer shadow-sm w-full ${
            statusFilter === 'ALL' 
              ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50' 
              : (STATUSES[statusFilter]?.color || 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')
          }`}
        />
      </div>

      {/* Master Filter Dropdown */}
      <div className="shrink-0 min-w-[170px]">
        <Dropdown
          value={masterFilter}
          onChange={(val) => setMasterFilter(val)}
          searchable={true}
          options={[
            { 
              value: 'ALL', 
              label: i18n.language === 'az' ? 'Bütün Ustalar' : i18n.language === 'ru' ? 'Все Мастера' : 'All Masters' 
            },
            ...masterOptions.map(m => ({
              value: m.id,
              label: m.label
            }))
          ]}
          buttonClassName={`h-[38px] px-3 py-2 text-xs font-bold rounded-lg border focus:outline-none focus:ring-1 focus:ring-merkez-blue cursor-pointer shadow-sm w-full ${
            masterFilter === 'ALL'
              ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              : 'bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100 font-black'
          }`}
        />
      </div>
    </div>
  );

  const actionButtons = currentStaff?.role?.toLowerCase() !== 'master' && (
    <div className="flex items-center gap-2 shrink-0">
      <button 
        onClick={() => setIsMastersModalOpen(true)}
        className="flex items-center justify-center gap-2 h-[38px] bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-bold text-xs transition-all shadow-sm active:scale-95"
      >
        <User className="w-3.5 h-3.5" />
        {i18n.language === 'az' ? 'Ustalar' : i18n.language === 'ru' ? 'Мастера' : 'Masters'}
      </button>
      <button 
        onClick={() => setIsSendModalOpen(true)}
        className="flex items-center justify-center gap-2 h-[38px] btn-gradient-primary px-3 py-2 rounded-lg font-bold text-xs uppercase active:scale-95"
      >
        <Plus className="w-3.5 h-3.5" />
        {i18n.language === 'az' ? 'Təmirə Göndər' : i18n.language === 'ru' ? 'Передать в ремонт' : 'Send to repair'}
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
      {(!topBarTarget || !actionTarget) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 mb-3 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex-1 w-full flex items-center gap-4">
            {topBarContent}
          </div>
          {actionButtons && (
            <div className="shrink-0">
              {actionButtons}
            </div>
          )}
        </div>
      )}
      {topBarTarget && createPortal(topBarContent, topBarTarget)}
      {actionTarget && createPortal(actionButtons, actionTarget)}
      <div className="flex-1 bg-white rounded-lg border border-gray-100 p-4 lg:p-6 flex flex-col min-h-0">
        
        {/* Active master filter indicator banner */}
        {masterFilter !== 'ALL' && (
          <div className="mb-3 px-3.5 py-2.5 bg-orange-50 border border-orange-200/90 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="font-bold text-orange-950">
                {i18n.language === 'az' ? 'Seçilmiş Usta:' : i18n.language === 'ru' ? 'Выбранный Мастер:' : 'Selected Master:'}{' '}
                <span className="font-black underline">{masterOptions.find(m => m.id === masterFilter)?.name || masterFilter}</span>
              </span>
              <span className="text-orange-700 font-medium hidden sm:inline">
                • {filteredRepairs.reduce((sum, r) => sum + getRepairQuantity(r), 0)} {i18n.language === 'az' ? 'alət tapıldı' : i18n.language === 'ru' ? 'инструментов найдено' : 'tools found'}
              </span>
            </div>
            <button
              onClick={() => setMasterFilter('ALL')}
              className="text-orange-700 hover:text-orange-950 font-bold hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              {i18n.language === 'az' ? 'Filteri sıfırla' : i18n.language === 'ru' ? 'Сбросить фильтр' : 'Reset'}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
          </div>
        ) : filteredRepairs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
              <Hammer className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-bold mb-1">
              {i18n.language === 'az' ? 'Təmir qeydi tapılmadı' : i18n.language === 'ru' ? 'Записей о ремонте не найдено' : 'No repair records found'}
            </p>
            <p className="text-sm text-gray-400 font-medium">
              {i18n.language === 'az' ? 'Yeni təmir qeydi yaratmaq üçün yuxarıdakı düymədən istifadə edin' : i18n.language === 'ru' ? 'Используйте кнопку выше, чтобы создать новую запись' : 'Use the button above to create a new record'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">{i18n.language === 'az' ? 'Kod' : i18n.language === 'ru' ? 'Код' : 'Code'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">{i18n.language === 'az' ? 'Alət / Məhsul' : i18n.language === 'ru' ? 'Инструмент / Товар' : 'Tool / Product'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">{i18n.language === 'az' ? 'Usta' : i18n.language === 'ru' ? 'Мастер' : 'Master'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">{i18n.language === 'az' ? 'Status' : i18n.language === 'ru' ? 'Статус' : 'Status'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">{i18n.language === 'az' ? 'Tarix' : i18n.language === 'ru' ? 'Дата' : 'Date'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRepairs.map((repair) => {
                const totalQty = getRepairQuantity(repair);
                const cleanName = getCleanItemName(repair);
                const isCompleted = repair.status === 'RECEIVED_FROM_WORKSHOP' || repair.status === 'DELIVERED_TO_CUSTOMER';

                return (
                  <tr key={repair.id} className="hover:bg-orange-50/30 transition-colors group">
                    <td className="p-4">
                      <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                        {repair.repair_code}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-2 flex-wrap">
                        <span>{cleanName}</span>
                        
                        {/* Interactive Quantity Control Pill */}
                        <div className="inline-flex items-center bg-orange-50 border border-orange-200/90 rounded-lg p-0.5 shadow-2xs">
                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenQuickDecrease(repair);
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-orange-200/80 text-orange-900 font-black text-xs transition-colors active:scale-90"
                              title={i18n.language === 'az' ? 'Sayı azalt / Təmirdən təhvil al' : i18n.language === 'ru' ? 'Уменьшить количество / Принять из ремонта' : 'Decrease quantity / Return from repair'}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          )}
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isCompleted) handleOpenDirectEdit(repair);
                            }}
                            className={`px-1.5 text-xs font-black text-orange-950 ${!isCompleted ? 'hover:underline cursor-pointer' : ''}`}
                            title={!isCompleted ? (i18n.language === 'az' ? 'Sayı birbaşa redaktə etmək üçün klikləyin' : i18n.language === 'ru' ? 'Нажмите, чтобы ввести точное количество' : 'Click to edit quantity') : ''}
                          >
                            {totalQty} {i18n.language === 'az' ? 'ədəd' : i18n.language === 'ru' ? 'шт.' : 'pcs'}
                          </button>

                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickIncrease(repair);
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-orange-200/80 text-orange-900 font-black text-xs transition-colors active:scale-90"
                              title={i18n.language === 'az' ? 'Sayı 1 ədəd artır' : i18n.language === 'ru' ? 'Увеличить на 1' : 'Increase quantity by 1'}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-1">
                          {repair.type === 'INTERNAL_STOCK' ? (
                            <span className="text-orange-600 font-bold text-[10px] px-1.5 py-0.5 bg-orange-100 rounded">{i18n.language === 'az' ? 'Anbar' : i18n.language === 'ru' ? 'Склад' : 'Stock'}</span>
                          ) : (
                            <span className="text-purple-600 font-bold text-[10px] px-1.5 py-0.5 bg-purple-100 rounded">{i18n.language === 'az' ? 'Müştəri' : i18n.language === 'ru' ? 'Клиент' : 'Client'}</span>
                          )}
                          {repair.serial_number && <span>S/N: {repair.serial_number}</span>}
                        </div>
                        
                        {/* Extract client info from issue_description if exists */}
                        {(() => {
                          const clientNameMatch = repair.issue_description?.match(/Müştəri:\s*(.+)/);
                          const clientPhoneMatch = repair.issue_description?.match(/Telefon:\s*(.+)/);
                          const cName = clientNameMatch ? clientNameMatch[1].trim() : null;
                          const cPhone = clientPhoneMatch ? clientPhoneMatch[1].trim() : null;
                          
                          if (cName || cPhone) {
                            return (
                              <div className="mt-1 text-gray-600">
                                {cName && <span className="font-semibold text-gray-800">{cName}</span>}
                                {cName && cPhone && <span> • </span>}
                                {cPhone && <span>{cPhone}</span>}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-500" />
                        </div>
                        <span className="text-sm font-bold text-gray-700">{repair.master?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Dropdown
                        value={repair.status}
                        onChange={(val) => handleStatusChange(repair, val)}
                        options={getStatusOptions(repair.type).map(opt => ({
                          value: opt,
                          label: STATUSES[opt]?.[i18n.language === 'az' ? 'az' : i18n.language === 'ru' ? 'ru' : 'en']
                        }))}
                        buttonClassName={`px-3 py-1.5 text-xs font-bold rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer ${STATUSES[repair.status]?.color || 'bg-gray-100 text-gray-800 border-gray-200'}`}
                      />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-3 flex-wrap">
                        <div className="text-sm font-bold text-gray-700">
                          {new Date(repair.created_at).toLocaleDateString()}
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {/* Dedicated Receive / Return button for active repairs */}
                          {!isCompleted && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenQuickDecrease(repair);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-all text-xs font-bold shadow-2xs active:scale-95 border border-emerald-200/60"
                              title={i18n.language === 'az' ? 'Təmirdən təhvil al / Qaytar' : i18n.language === 'ru' ? 'Принять из ремонта' : 'Receive from repair'}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">
                                {i18n.language === 'az' ? 'Təhvil al' : i18n.language === 'ru' ? 'Принять' : 'Receive'}
                              </span>
                            </button>
                          )}

                          {(!currentStaff || currentStaff?.role === 'Admin') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(repair.id);
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors text-xs font-bold"
                              title={i18n.language === 'az' ? 'Sil' : 'Удалить'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/repair-receipt/${repair.id}`, '_blank');
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors text-xs font-bold"
                            title={i18n.language === 'az' ? 'Çekə bax' : 'Посмотреть чек'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{i18n.language === 'az' ? 'Çek' : 'Чек'}</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              
                              // Extract phone
                              const clientPhoneMatch = repair.issue_description?.match(/Telefon:\s*(.+)/);
                              let cPhone = clientPhoneMatch ? clientPhoneMatch[1].trim() : '';
                              if (cPhone) {
                                cPhone = cPhone.replace(/\D/g, '');
                              }
                              
                              const receiptUrl = `${window.location.origin}/repair-receipt/${repair.id}`;
                              const text = i18n.language === 'az' 
                                ? `Salam! Təmir üçün kvitansiyanız və foto hesabatınız buradadır: ${receiptUrl}`
                                : `Здравствуйте! Ваш чек за ремонт и фотоотчет здесь: ${receiptUrl}`;
                              
                              const waUrl = cPhone 
                                ? `https://wa.me/${cPhone}?text=${encodeURIComponent(text)}`
                                : `https://wa.me/?text=${encodeURIComponent(text)}`;
                                
                              window.open(waUrl, '_blank');
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-lg transition-colors text-xs font-bold"
                            title="WhatsApp ilə paylaş"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                            </svg>
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {isSendModalOpen && (
        <SendToRepairModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
          onSuccess={() => {
            setIsSendModalOpen(false);
            fetchRepairs();
          }}
        />
      )}

      {isReturnModalOpen && selectedRepair && (
        <ReturnFromRepairModal
          isOpen={isReturnModalOpen}
          repair={selectedRepair}
          initialReturnQty={selectedReturnQty}
          onClose={() => {
            setIsReturnModalOpen(false);
            setSelectedRepair(null);
            setSelectedReturnQty(null);
          }}
          onSuccess={() => {
            setIsReturnModalOpen(false);
            setSelectedRepair(null);
            setSelectedReturnQty(null);
            fetchRepairs();
          }}
        />
      )}

      {/* Quick Decrease / Partial Return Modal */}
      {decreaseModalRepair && (() => {
        const total = getRepairQuantity(decreaseModalRepair);
        const cleanName = getCleanItemName(decreaseModalRepair);
        const count = Math.min(total, Math.max(1, parseInt(decreaseCount, 10) || 1));
        const remaining = total - count;

        return (
          <ModalPortal>
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                      <PackageCheck className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">
                        {i18n.language === 'az' ? 'Təmirdən Aləti Təhvil Al / Sayı Azalt' : 'Прием инструмента / Уменьшение количества'}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        {decreaseModalRepair.repair_code} • {cleanName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDecreaseModalRepair(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Summary badge */}
                  <div className="bg-orange-50 border border-orange-200/80 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">
                        {i18n.language === 'az' ? 'Hal-hazırda təmirdə:' : 'Сейчас в ремонте:'}
                      </div>
                      <div className="text-lg font-black text-orange-950">
                        {cleanName} <span className="text-orange-700 text-sm font-bold">({total} {i18n.language === 'az' ? 'ədəd' : 'шт.'})</span>
                      </div>
                    </div>
                    {decreaseModalRepair.master?.name && (
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {i18n.language === 'az' ? 'Usta' : 'Мастер'}
                        </div>
                        <div className="text-xs font-bold text-gray-800">
                          {decreaseModalRepair.master.name}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantity selector */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                      {i18n.language === 'az' ? 'Usta neçə ədəd qaytardı?' : 'Сколько штук вернул мастер?'}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-inner">
                        <button
                          type="button"
                          onClick={() => setDecreaseCount(prev => Math.max(1, prev - 1))}
                          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-700 font-black text-base transition-all"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={total}
                          value={decreaseCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (isNaN(val)) setDecreaseCount(1);
                            else setDecreaseCount(Math.min(total, Math.max(1, val)));
                          }}
                          className="w-16 text-center font-black text-lg text-gray-900 bg-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setDecreaseCount(prev => Math.min(total, prev + 1))}
                          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-700 font-black text-base transition-all"
                        >
                          +
                        </button>
                      </div>

                      {/* Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 flex-1">
                        {Array.from({ length: total }, (_, i) => i + 1).map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setDecreaseCount(num)}
                            className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                              count === num
                                ? 'bg-orange-600 text-white shadow-sm'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                          >
                            {num === total 
                              ? (i18n.language === 'az' ? `Hamısı (${num})` : `Все (${num})`)
                              : `${num} ${i18n.language === 'az' ? 'ədəd' : 'шт.'}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Informational preview note */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    {remaining > 0 ? (
                      <span className="font-bold text-amber-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                        <span>
                          {i18n.language === 'az'
                            ? `Usta ${count} ədəd qaytarır. Təmirdə hələ ${remaining} ədəd qalacaq.`
                            : `Мастер возвращает ${count} шт. В ремонте останется еще ${remaining} шт.`}
                        </span>
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>
                          {i18n.language === 'az'
                            ? `Bütün ${total} alət təhvil alınır və təmir tamamlanır!`
                            : `Все ${total} инструмента принимаются, ремонт завершается!`}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Optional master fee */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                      {i18n.language === 'az' ? 'Usta haqqı (İxtiyari / ₼)' : 'Оплата мастеру (Необязательно / ₼)'}
                    </label>
                    <div className="relative">
                      <Banknote className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={decreaseFee}
                        onChange={(e) => setDecreaseFee(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row gap-2 justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const rep = decreaseModalRepair;
                      const c = count;
                      setDecreaseModalRepair(null);
                      handleOpenReturnModal(rep, c);
                    }}
                    className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs transition-all shadow-xs"
                  >
                    {i18n.language === 'az' ? 'Ətraflı Qəbul (Ehtiyat hissəsi ilə)' : 'Подробный прием (с запчастями)'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDecreaseModalRepair(null)}
                      className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100"
                    >
                      {i18n.language === 'az' ? 'Ləğv et' : 'Отмена'}
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteQuickDecrease}
                      className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-orange-600/20 active:scale-95 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {i18n.language === 'az' ? 'Tez Təhvil Al (Sayı Azalt)' : 'Принять (Уменьшить)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ModalPortal>
        );
      })()}

      {/* Direct Quantity Edit Modal */}
      {directEditRepair && (
        <ModalPortal>
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-gray-900">
                  {i18n.language === 'az' ? 'Alət Sayını Dəyişdir' : 'Изменить количество инструмента'}
                </h3>
                <button
                  onClick={() => setDirectEditRepair(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  {getCleanItemName(directEditRepair)}
                </label>
                <input
                  type="number"
                  min="1"
                  value={directEditQty}
                  onChange={(e) => setDirectEditQty(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDirectEditRepair(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200"
                >
                  {i18n.language === 'az' ? 'Ləğv et' : 'Отмена'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveDirectEdit}
                  className="px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl hover:bg-orange-700 shadow-sm"
                >
                  {i18n.language === 'az' ? 'Yadda Saxla' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {isMastersModalOpen && (
        <MastersModal
          isOpen={isMastersModalOpen}
          onClose={() => setIsMastersModalOpen(false)}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleDeleteRepair(deleteConfirmId);
        }}
        title={i18n.language === 'az' ? 'Təmiri Sil' : 'Удалить Ремонт'}
        message={i18n.language === 'az' ? 'Bu təmiri silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.' : 'Вы уверены, что хотите удалить этот ремонт? Это действие нельзя отменить.'}
        confirmText={i18n.language === 'az' ? 'Sil' : 'Удалить'}
        cancelText={i18n.language === 'az' ? 'Ləğv et' : 'Отмена'}
        isDanger={true}
      />
    </div>
    </div>
  );
};

export default WarehouseRepairs;

