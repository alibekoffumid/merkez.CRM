import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Hammer, RefreshCw, CheckCircle2, User, Clock, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';

import SendToRepairModal from './SendToRepairModal';
import ReturnFromRepairModal from './ReturnFromRepairModal';
import MastersModal from './MastersModal';
import Dropdown from '../../components/Common/Dropdown';

const WarehouseRepairs = ({ activeTab }) => {
  const { t, i18n } = useTranslation();
  const { profile, currentStaff } = useUser();
  
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isMastersModalOpen, setIsMastersModalOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);

  const [topBarTarget, setTopBarTarget] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);

  useEffect(() => {
    setTopBarTarget(document.getElementById('warehouse-top-bar-portal-target'));
    setActionTarget(document.getElementById('warehouse-actions-portal-target'));
  }, [activeTab]);

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

  const handleStatusChange = async (repair, newStatus) => {
    // If it requires master fee computation
    if (newStatus === 'RECEIVED_FROM_WORKSHOP') {
      setSelectedRepair({ ...repair, targetStatus: newStatus });
      setIsReturnModalOpen(true);
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
      // Note: Make sure the SQL tables have been created before this runs
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

  useEffect(() => {
    if (activeTab === 'repairs') {
      fetchRepairs();
    }
  }, [activeTab, profile]);

  const filteredRepairs = repairs.filter(r => {
    const matchesSearch = 
      (r.item_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.repair_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.master?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });


  const topBarContent = (
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <div className="relative w-48 shrink-0 hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder={i18n.language === 'az' ? 'Axtarış...' : i18n.language === 'ru' ? 'Поиск...' : 'Search...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-[38px] pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all outline-none"
        />
      </div>
      
      <div className="shrink-0 min-w-[160px]">
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
    </div>
  );

  const actionButtons = currentStaff?.role !== 'Master' && (
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
        className="flex items-center justify-center gap-2 h-[38px] bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg font-bold text-xs transition-all shadow-sm shadow-orange-500/20 active:scale-95 border border-transparent"
      >
        <Plus className="w-3.5 h-3.5" />
        {i18n.language === 'az' ? 'Təmirə Göndər' : i18n.language === 'ru' ? 'Передать в ремонт' : 'Send to repair'}
      </button>
    </div>
  );

  return (
    <>
      {topBarTarget && createPortal(topBarContent, topBarTarget)}
      {actionTarget && createPortal(actionButtons, actionTarget)}
      <div className="flex-1 bg-white rounded-lg border border-gray-100 p-4 lg:p-6 flex flex-col min-h-0">
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
              {filteredRepairs.map((repair) => (
                <tr key={repair.id} className="hover:bg-orange-50/30 transition-colors group">
                  <td className="p-4">
                    <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                      {repair.repair_code}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-sm text-gray-900">{repair.item_name}</div>
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
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm font-bold text-gray-700">
                        {new Date(repair.created_at).toLocaleDateString()}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/repair-receipt/${repair.id}`, '_blank');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors text-xs font-bold"
                          title={i18n.language === 'az' ? 'Çekə bax' : 'Посмотреть чек'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{i18n.language === 'az' ? 'Çek' : 'Чек'}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            
                            // Extract phone
                            const clientPhoneMatch = repair.issue_description?.match(/Telefon:\s*(.+)/);
                            let cPhone = clientPhoneMatch ? clientPhoneMatch[1].trim() : '';
                            if (cPhone) {
                              cPhone = cPhone.replace(/\D/g, ''); // keep ONLY digits for wa.me
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
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-lg transition-colors text-xs font-bold"
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
              ))}
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
          onClose={() => {
            setIsReturnModalOpen(false);
            setSelectedRepair(null);
          }}
          onSuccess={() => {
            setIsReturnModalOpen(false);
            setSelectedRepair(null);
            fetchRepairs();
          }}
        />
      )}
      {isMastersModalOpen && (
        <MastersModal
          isOpen={isMastersModalOpen}
          onClose={() => setIsMastersModalOpen(false)}
        />
      )}
    </div>
    </>
  );
};

export default WarehouseRepairs;
