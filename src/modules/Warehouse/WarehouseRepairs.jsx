import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Hammer, RefreshCw, CheckCircle2, User, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';

import SendToRepairModal from './SendToRepairModal';
import ReturnFromRepairModal from './ReturnFromRepairModal';
import MastersModal from './MastersModal';

const WarehouseRepairs = ({ activeTab }) => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isMastersModalOpen, setIsMastersModalOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);

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

  const getStatusBadge = (status) => {
    switch(status) {
      case 'SENT_TO_MASTER': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-lg border border-yellow-200 flex items-center gap-1"><Clock className="w-3 h-3"/> {i18n.language === 'az' ? 'Ustadadır' : 'У мастера'}</span>;
      case 'READY': return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-lg border border-green-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {i18n.language === 'az' ? 'Hazırdır' : 'Готово'}</span>;
      case 'RETURNED_TO_STOCK': return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-lg border border-gray-200 flex items-center gap-1"><RefreshCw className="w-3 h-3"/> {i18n.language === 'az' ? 'Anbara qaytarıldı' : 'Возвращен'}</span>;
      default: return null;
    }
  };

  return (
    <div className="flex-1 bg-gray-50/50 p-4 lg:p-6 overflow-hidden flex flex-col h-full relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
            <Hammer className="w-6 h-6 text-orange-500" />
            {i18n.language === 'az' ? 'Təmir və Emalatxana' : 'Ремонт и Мастерская'}
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {i18n.language === 'az' ? 'Təmirə verilmiş alətlər və emalatxana idarəetməsi' : 'Управление инструментами в ремонте и мастерами'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsMastersModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95"
          >
            <User className="w-4 h-4" />
            {i18n.language === 'az' ? 'Ustalar' : 'Мастера'}
          </button>
          <button 
            onClick={() => setIsSendModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {i18n.language === 'az' ? 'Təmirə Göndər' : 'Передать в ремонт'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 p-4 flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={i18n.language === 'az' ? 'Axtarış (ad, kod, usta)...' : 'Поиск (название, код, мастер)...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {['ALL', 'SENT_TO_MASTER', 'READY', 'RETURNED_TO_STOCK'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-sm'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {status === 'ALL' ? (i18n.language === 'az' ? 'Bütün' : 'Все') :
               status === 'SENT_TO_MASTER' ? (i18n.language === 'az' ? 'Ustadadır' : 'У мастера') :
               status === 'READY' ? (i18n.language === 'az' ? 'Hazırdır' : 'Готово') :
               (i18n.language === 'az' ? 'Qaytarıldı' : 'Возвращены')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-white border border-gray-100 rounded-2xl shadow-sm">
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
              {i18n.language === 'az' ? 'Təmir qeydi tapılmadı' : 'Записей о ремонте не найдено'}
            </p>
            <p className="text-sm text-gray-400 font-medium">
              {i18n.language === 'az' ? 'Yeni təmir qeydi yaratmaq üçün yuxarıdakı düymədən istifadə edin' : 'Используйте кнопку выше, чтобы создать новую запись'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">{i18n.language === 'az' ? 'Kod' : 'Код'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">{i18n.language === 'az' ? 'Alət / Məhsul' : 'Инструмент / Товар'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">{i18n.language === 'az' ? 'Usta' : 'Мастер'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">{i18n.language === 'az' ? 'Status' : 'Статус'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">{i18n.language === 'az' ? 'Tarix' : 'Дата'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100"></th>
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
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      {repair.type === 'INTERNAL_STOCK' ? (
                        <span className="text-orange-600 font-bold text-[10px] px-1.5 py-0.5 bg-orange-100 rounded">{i18n.language === 'az' ? 'Anbar' : 'Склад'}</span>
                      ) : (
                        <span className="text-purple-600 font-bold text-[10px] px-1.5 py-0.5 bg-purple-100 rounded">{i18n.language === 'az' ? 'Müştəri' : 'Клиент'}</span>
                      )}
                      {repair.serial_number && <span>S/N: {repair.serial_number}</span>}
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
                    {getStatusBadge(repair.status)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-sm font-bold text-gray-700">
                      {new Date(repair.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    {repair.status !== 'RETURNED_TO_STOCK' && (
                      <button
                        onClick={() => {
                          setSelectedRepair(repair);
                          setIsReturnModalOpen(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 bg-white border border-gray-200 hover:border-orange-500 hover:text-orange-600 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                      >
                        {i18n.language === 'az' ? 'Qəbul Et' : 'Принять'}
                      </button>
                    )}
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
  );
};

export default WarehouseRepairs;
