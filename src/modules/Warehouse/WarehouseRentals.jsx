import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyRound,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Phone,
  User,
  ShieldCheck,
  Calendar,
  RotateCcw,
  Printer,
  Trash2,
  ExternalLink,
  Eye,
  X,
  FileText,
  DollarSign,
  Package,
  Layers,
  ChevronRight,
  RefreshCw,
  Video
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { rentalService } from '../../services/rentalService';
import ReturnRentalModal from './ReturnRentalModal';
import RentalAgreementPrint from './RentalAgreementPrint';

const WarehouseRentals = ({ warehouseId }) => {
  const { t, i18n } = useTranslation();

  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED'

  // Modals
  const [selectedRentalForReturn, setSelectedRentalForReturn] = useState(null);
  const [selectedRentalForPrint, setSelectedRentalForPrint] = useState(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchRentals = async () => {
    try {
      setLoading(true);
      const data = await rentalService.getRentals(warehouseId);
      setRentals(data || []);
    } catch (err) {
      console.error('Fetch rentals error:', err);
      toast.error('İcarə məlumatlarını yükləmək mümkün olmadı');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, [warehouseId]);

  // Statistics calculation
  const stats = useMemo(() => {
    let total = rentals.length;
    let active = 0;
    let overdue = 0;
    let returned = 0;
    let totalDeposit = 0;

    const now = new Date();

    rentals.forEach((r) => {
      const isAct = r.status === 'ACTIVE';
      const isOver = isAct && r.due_date && new Date(r.due_date) < now;

      if (isAct) {
        active++;
        totalDeposit += Number(r.deposit_amount || 0);
      }
      if (isOver) overdue++;
      if (r.status === 'RETURNED') returned++;
    });

    return { total, active, overdue, returned, totalDeposit };
  }, [rentals]);

  // Filtering
  const filteredRentals = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const now = new Date();

    return rentals.filter((r) => {
      // Filter status
      const isAct = r.status === 'ACTIVE';
      const isOver = isAct && r.due_date && new Date(r.due_date) < now;

      if (activeFilter === 'ACTIVE' && (!isAct || isOver)) return false;
      if (activeFilter === 'OVERDUE' && !isOver) return false;
      if (activeFilter === 'RETURNED' && r.status !== 'RETURNED') return false;

      // Filter query
      if (!q) return true;
      return (
        r.rental_code?.toLowerCase().includes(q) ||
        r.client_name?.toLowerCase().includes(q) ||
        r.client_phone?.toLowerCase().includes(q) ||
        r.client_fin?.toLowerCase().includes(q) ||
        r.product_name?.toLowerCase().includes(q) ||
        r.product_barcode?.toLowerCase().includes(q)
      );
    });
  }, [rentals, searchQuery, activeFilter]);

  // Handle delete
  const handleDelete = async (r) => {
    if (!window.confirm(`${r.client_name} - ${r.product_name} icarəsini silmək istədiyinizdən əminsiniz?`)) {
      return;
    }
    try {
      setDeletingId(r.id);
      await rentalService.deleteRental(r.id, r.product_id, r.quantity, warehouseId);
      toast.success('İcarə qeydi silindi');
      fetchRentals();
    } catch (err) {
      toast.error('Silinmə zamanı xəta');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Header & KPI Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>{i18n.language === 'az' ? 'Alətlər və Malların İcarəsi' : 'Аренда инструментов и товаров'}</span>
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            {i18n.language === 'az' ? 'Müştərilərə verilən alətlərin, depozitlərin və vaxtların idarə edilməsi' : 'Учет выданных товаров, депозитов и сроков возврата'}
          </p>
        </div>

        <button
          onClick={fetchRentals}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{i18n.language === 'az' ? 'Yenilə' : 'Обновить'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">{i18n.language === 'az' ? 'Cəmi İcarələr' : 'Всего аренд'}</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</p>
        </div>

        {/* Active */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-blue-200 dark:border-blue-900/40 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">{i18n.language === 'az' ? 'Aktiv İcarədə' : 'Активно в аренде'}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.active}</p>
        </div>

        {/* Overdue */}
        <div className={`p-4 rounded-2xl border shadow-sm transition-all ${
          stats.overdue > 0
            ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800 animate-pulse'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">{i18n.language === 'az' ? 'Müddəti Bitən / Gecikən' : 'Просрочено'}</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-red-600 dark:text-red-400">{stats.overdue}</p>
        </div>

        {/* Total Deposit Held */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">{i18n.language === 'az' ? 'Saxlanan Girov Fondu' : 'Фонд залогов'}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₼{stats.totalDeposit.toFixed(2)}</p>
        </div>
      </div>

      {/* 2. Controls & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={i18n.language === 'az' ? 'Müştəri adı, FİN, telefon, alət və ya kod ilə axtar...' : 'Поиск по имени, FIN, телефону, товару...'}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl shrink-0 overflow-x-auto">
          {[
            { id: 'ALL', label: i18n.language === 'az' ? 'Hamısı' : 'Все', count: stats.total },
            { id: 'ACTIVE', label: i18n.language === 'az' ? 'Aktiv' : 'Активные', count: stats.active },
            { id: 'OVERDUE', label: i18n.language === 'az' ? 'Gecikənlər' : 'Просроченные', count: stats.overdue, isAlert: stats.overdue > 0 },
            { id: 'RETURNED', label: i18n.language === 'az' ? 'Qaytarılmış' : 'Возвращенные', count: stats.returned },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                tab.isAlert ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Rentals Table / List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider">{i18n.language === 'az' ? 'İcarələr yüklənir...' : 'Загрузка аренд...'}</p>
          </div>
        ) : filteredRentals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <KeyRound className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3 stroke-[1.5]" />
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
              {i18n.language === 'az' ? 'Heç bir icarə qeydi tapılmadı' : 'Записей об аренде не найдено'}
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm text-center">
              {i18n.language === 'az' 
                ? 'Məhsullar siyahısından məhsul seçərək yuxarı paneldəki «İcarəyə Ver» düyməsi ilə yeni icarə rəsmiləşdirə bilərsiniz.'
                : 'Выберите товары галочками в общем списке и нажмите кнопку «В аренду» в верхней панели.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 font-bold uppercase border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-4">Kod / Tarix</th>
                  <th className="py-3 px-4">Müştəri (İcarədar)</th>
                  <th className="py-3 px-4">Alət / Məhsul</th>
                  <th className="py-3 px-4">Sənəd & Şəkillər</th>
                  <th className="py-3 px-4">Müddət & Status</th>
                  <th className="py-3 px-4 text-right">Girov (Depozit)</th>
                  <th className="py-3 px-4 text-center">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                {filteredRentals.map((r) => {
                  const isAct = r.status === 'ACTIVE';
                  const now = new Date();
                  const due = r.due_date ? new Date(r.due_date) : null;
                  const isOver = isAct && due && due < now;

                  // Days left or overdue
                  let diffDays = 0;
                  if (due) {
                    const diffTime = due.getTime() - now.getTime();
                    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  }

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors ${
                        isOver ? 'bg-red-50/40 dark:bg-red-950/10' : ''
                      }`}
                    >
                      {/* Code / Date */}
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-indigo-600 dark:text-indigo-400 font-black">{r.rental_code}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block font-normal">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString('az-AZ') : '—'}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span>{r.client_name}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                          <a
                            href={`tel:${r.client_phone}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-mono"
                          >
                            <Phone className="w-3 h-3" />
                            {r.client_phone}
                          </a>
                          {r.client_fin && (
                            <span className="bg-gray-100 dark:bg-gray-700 px-1 py-0.2 rounded font-mono text-[10px] uppercase font-bold">
                              FİN: {r.client_fin}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tool/Product */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900 dark:text-white max-w-xs truncate" title={r.product_name}>
                          {r.product_name}
                        </p>
                        <span className="text-[11px] text-gray-400 font-mono block">
                          {r.product_barcode || 'Barkodsuz'}
                        </span>
                      </td>

                      {/* Photos Thumbnail Preview */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {/* Passport Photo */}
                          {r.client_id_photo_front ? (
                            <button
                              type="button"
                              onClick={() => setPreviewMediaUrl(r.client_id_photo_front)}
                              className="relative group w-9 h-9 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-100 hover:scale-105 transition-transform"
                              title="Şəxsiyyət vəsiqəsi"
                            >
                              <img src={r.client_id_photo_front} alt="ID" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-300">—</span>
                          )}

                          {/* Instrument Photo */}
                          {r.instrument_photo_before ? (
                            <button
                              type="button"
                              onClick={() => setPreviewMediaUrl(r.instrument_photo_before)}
                              className="relative group w-9 h-9 rounded-lg overflow-hidden border border-amber-300 dark:border-amber-700 bg-amber-50 hover:scale-105 transition-transform"
                              title="Alətin ilkin vəziyyəti"
                            >
                              {r.instrument_photo_before.includes('.mp4') ? (
                                <div className="w-full h-full bg-black flex items-center justify-center text-white">
                                  <Video className="w-4 h-4 text-amber-400" />
                                </div>
                              ) : (
                                <img src={r.instrument_photo_before} alt="Tool" className="w-full h-full object-cover" />
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </button>
                          ) : null}
                        </div>
                      </td>

                      {/* Duration & Status Countdown */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {r.due_date ? new Date(r.due_date).toLocaleDateString('az-AZ') : '—'}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-1">
                          {r.status === 'RETURNED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              {i18n.language === 'az' ? 'Qaytarılıb' : 'Возвращен'}
                            </span>
                          ) : isOver ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              {i18n.language === 'az' ? `Gecikir (${Math.abs(diffDays)} gün)` : `Просрочено (${Math.abs(diffDays)} дн.)`}
                            </span>
                          ) : diffDays === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                              <Clock className="w-3 h-3" />
                              {i18n.language === 'az' ? 'Bu gün bitir!' : 'Сегодня!'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              <Clock className="w-3 h-3" />
                              {i18n.language === 'az' ? `Qalıb: ${diffDays} gün` : `Осталось: ${diffDays} дн.`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Deposit Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-gray-900 dark:text-white text-sm block">
                          ₼{Number(r.deposit_amount || 0).toFixed(2)}
                        </span>
                        {Number(r.rental_fee) > 0 && (
                          <span className="text-[10px] text-gray-400 block">
                            Haqq: ₼{Number(r.rental_fee).toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Return Button */}
                          {r.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => setSelectedRentalForReturn(r)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                              title={i18n.language === 'az' ? 'Aləti təhvil al və depoziti qaytar' : 'Принять возврат'}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{i18n.language === 'az' ? 'Təhvil Al' : 'Принять'}</span>
                            </button>
                          )}

                          {/* Print Agreement */}
                          <button
                            type="button"
                            onClick={() => setSelectedRentalForPrint(r)}
                            className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-gray-600 dark:text-gray-300 hover:text-indigo-600 rounded-lg transition-all"
                            title={i18n.language === 'az' ? 'Müqaviləni çap et' : 'Печать договора'}
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            disabled={deletingId === r.id}
                            onClick={() => handleDelete(r)}
                            className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 rounded-lg transition-all"
                            title={i18n.language === 'az' ? 'Sil' : 'Удалить'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Media Lightbox */}
      {previewMediaUrl && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewMediaUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-black rounded-2xl overflow-hidden p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewMediaUrl(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            {previewMediaUrl.includes('.mp4') || previewMediaUrl.includes('.mov') ? (
              <video src={previewMediaUrl} controls autoPlay className="max-h-[80vh] w-auto rounded-xl" />
            ) : (
              <img src={previewMediaUrl} alt="Preview" className="max-h-[80vh] w-auto rounded-xl object-contain" />
            )}
          </div>
        </div>
      )}

      {/* Return Modal */}
      {selectedRentalForReturn && (
        <ReturnRentalModal
          isOpen={Boolean(selectedRentalForReturn)}
          rental={selectedRentalForReturn}
          warehouseId={warehouseId}
          onClose={() => setSelectedRentalForReturn(null)}
          onSuccess={() => {
            fetchRentals();
            setSelectedRentalForReturn(null);
          }}
        />
      )}

      {/* Print Modal */}
      {selectedRentalForPrint && (
        <RentalAgreementPrint
          isOpen={Boolean(selectedRentalForPrint)}
          rental={selectedRentalForPrint}
          warehouseName="MERKEZ CRM"
          onClose={() => setSelectedRentalForPrint(null)}
        />
      )}
    </div>
  );
};

export default WarehouseRentals;

