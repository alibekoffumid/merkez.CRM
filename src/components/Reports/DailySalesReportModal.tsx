import React, { useState, useEffect, useMemo } from 'react';
import ModalPortal from '../Common/ModalPortal';
import { 
  Printer, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  RefreshCw, 
  X, 
  DollarSign, 
  CreditCard, 
  Banknote, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  Clock, 
  CheckCircle2, 
  Receipt, 
  Percent, 
  Layers,
  Search,
  Eye,
  ArrowRight,
  ShieldCheck,
  Building2,
  CalendarDays,
  SlidersHorizontal,
  CheckSquare,
  Square,
  ClipboardList,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import {
  fetchDailySalesReportData,
  printDailySalesReport,
  downloadDailySalesReportPDF,
  downloadDailySalesReportExcel,
  generateDailySalesReportHTML,
  DEFAULT_REPORT_OPTIONS
} from '../../services/dailySalesReportService.js';

interface DailySalesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string; // YYYY-MM-DD
}

const DailySalesReportModal: React.FC<DailySalesReportModalProps> = ({
  isOpen,
  onClose,
  initialDate
}) => {
  const { profile } = useUser() as any;
  
  // Format today as YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayStr());
  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'products' | 'transactions' | 'preview'>('summary');
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Report Mode: 'products_only' vs 'detailed'
  const [reportMode, setReportMode] = useState<'detailed' | 'products_only'>('detailed');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);

  // Granular section options
  const [customSections, setCustomSections] = useState({
    showPrices: true,
    showFinancialSummary: true,
    showPaymentBreakdown: true,
    showReceipts: true,
    showProfit: true,
    showBarcodes: true,
    showCategories: true,
    showSignatures: true,
    showNotesColumn: true
  });

  // Switch report mode preset
  const handleModeChange = (mode: 'detailed' | 'products_only') => {
    setReportMode(mode);
    if (mode === 'products_only') {
      setCustomSections({
        showPrices: false,
        showFinancialSummary: false,
        showPaymentBreakdown: false,
        showReceipts: false,
        showProfit: false,
        showBarcodes: true,
        showCategories: true,
        showSignatures: true,
        showNotesColumn: true
      });
      // Switch active tab to products list or preview
      if (activeTab === 'summary' || activeTab === 'transactions') {
        setActiveTab('products');
      }
    } else {
      setCustomSections({
        showPrices: true,
        showFinancialSummary: true,
        showPaymentBreakdown: true,
        showReceipts: true,
        showProfit: true,
        showBarcodes: true,
        showCategories: true,
        showSignatures: true,
        showNotesColumn: true
      });
    }
  };

  // Toggle individual option
  const toggleSection = (key: keyof typeof customSections) => {
    setCustomSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // Sync reportMode state
      if (!next.showPrices && !next.showFinancialSummary && !next.showReceipts) {
        setReportMode('products_only');
      } else if (next.showPrices) {
        setReportMode('detailed');
      }
      return next;
    });
  };

  // Active options combined
  const activeOptions = useMemo(() => {
    return {
      mode: reportMode,
      ...customSections
    };
  }, [reportMode, customSections]);

  // Business info extracted from profile
  const businessInfo = useMemo(() => {
    return {
      businessName: profile?.business_name || profile?.company_name || 'Mərkəz CRM Satış Məntəqəsi',
      voen: profile?.voen || profile?.tax_id || '',
      address: profile?.address || 'Baş Filial',
      phone: profile?.phone || '',
      cashierName: profile?.full_name || profile?.name || 'Məsul Şəxs'
    };
  }, [profile]);

  useEffect(() => {
    if (isOpen && profile?.id) {
      loadReport();
    }
  }, [isOpen, selectedDate, profile?.id]);

  const loadReport = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const data = await fetchDailySalesReportData(supabase, profile.id, selectedDate);
      setReportData(data);
    } catch (err: any) {
      console.error('Hesabat yüklənərkən xəta:', err);
      toast.error('Günlük hesabat məlumatları yüklənə bilmədi: ' + (err.message || 'Xəta'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!reportData) return;
    try {
      printDailySalesReport(reportData, businessInfo, printFormat, activeOptions);
      toast.success(
        reportMode === 'products_only'
          ? 'Satılan məhsullar siyahısı (qiymətsiz) çap pəncərəsi açıldı'
          : 'Ətraflı satış hesabatı çap / PDF pəncərəsi açıldı'
      );
    } catch (err: any) {
      toast.error('Çap zamanı xəta: ' + err.message);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    setIsExportingPDF(true);
    try {
      await downloadDailySalesReportPDF(reportData, businessInfo, activeOptions);
      toast.success(
        reportMode === 'products_only'
          ? 'Satılan məhsullar siyahısı PDF uğurla yükləndi!'
          : 'Ətraflı maliyyə hesabatı PDF uğurla yükləndi!'
      );
    } catch (err: any) {
      toast.error('PDF hazırlanarkən xəta: ' + err.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!reportData) return;
    setIsExportingExcel(true);
    try {
      downloadDailySalesReportExcel(reportData, businessInfo, activeOptions);
      toast.success('Excel (.xlsx) faylı uğurla yükləndi!');
    } catch (err: any) {
      toast.error('Excel hazırlanarkən xəta: ' + err.message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Filtered products by search
  const filteredProducts = useMemo(() => {
    if (!reportData?.products) return [];
    if (!searchProductQuery.trim()) return reportData.products;
    const q = searchProductQuery.toLowerCase();
    return reportData.products.filter(
      (p: any) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [reportData?.products, searchProductQuery]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-5xl w-full flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
          
          {/* Header Bar */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
                  {reportMode === 'products_only' ? (
                    <ClipboardList className="w-6 h-6 text-sky-400" />
                  ) : (
                    <Receipt className="w-6 h-6 text-blue-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      {reportMode === 'products_only' 
                        ? 'Satılan Məhsullar Siyahısı' 
                        : 'Gün Sonu Satış Hesabatı'}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                      reportMode === 'products_only'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-400/30'
                        : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                    }`}>
                      {reportMode === 'products_only' ? 'Anbar & Sayım' : 'Z-Hesabat'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>{businessInfo.businessName}</span>
                    <span className="text-slate-500">•</span>
                    <span>100% Azərbaycan Dilində</span>
                  </p>
                </div>
              </div>

              {/* Date Selector & Close Button */}
              <div className="flex items-center gap-2.5 self-end sm:self-center">
                <div className="flex items-center bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 shadow-sm">
                  <button
                    onClick={() => setSelectedDate(getTodayStr())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedDate === getTodayStr()
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    Bugün
                  </button>
                  <button
                    onClick={() => setSelectedDate(getYesterdayStr())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedDate === getYesterdayStr()
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    Dünən
                  </button>
                  <div className="relative flex items-center pl-1.5 pr-2 py-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                      className="pl-7 pr-2 py-1 bg-slate-900/80 text-white text-xs font-bold rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={loadReport}
                  disabled={loading}
                  className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all"
                  title="Yenilə"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                </button>

                <button
                  onClick={onClose}
                  className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2 VARIANT MODE SELECTOR (User Requirement) */}
            <div className="mt-5 p-1.5 bg-slate-950/70 rounded-2xl border border-slate-700/60 flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={() => handleModeChange('products_only')}
                className={`flex-1 w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2.5 ${
                  reportMode === 'products_only'
                    ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-500/25 ring-2 ring-sky-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <div className="flex flex-col text-left">
                  <span className="leading-tight">Variant 1: Yalnız Satılan Məhsullar və Sayı (Qiymətsiz)</span>
                  <span className="text-[10px] font-medium opacity-80 leading-none mt-0.5">Anbar sayımı və təhvil-təslim üçün çıxarış</span>
                </div>
              </button>

              <button
                onClick={() => handleModeChange('detailed')}
                className={`flex-1 w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2.5 ${
                  reportMode === 'detailed'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <div className="flex flex-col text-left">
                  <span className="leading-tight">Variant 2: Ətraflı Maliyyə Hesabatı (Tam)</span>
                  <span className="text-[10px] font-medium opacity-80 leading-none mt-0.5">Dövriyyə, kassa, nağd/kart, qiymətlər və mənfəət</span>
                </div>
              </button>
            </div>

            {/* Navigation Tabs, Format Switcher & Options Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-700/50">
              <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-2xl border border-slate-700/40">
                {reportMode === 'detailed' && (
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'summary'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Maliyyə Xülasəsi
                  </button>
                )}
                
                <button
                  onClick={() => setActiveTab('products')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'products'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Satılan Məhsullar
                  {reportData?.products && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                      {reportData.products.length}
                    </span>
                  )}
                </button>

                {reportMode === 'detailed' && (
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'transactions'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    Çeklərin Reyestri
                    {reportData?.transactions && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                        {reportData.transactions.length}
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'preview'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Çap Önbaxışı
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Custom Sections Settings Button */}
                <button
                  onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    showSettingsDrawer
                      ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                      : 'bg-slate-800/60 border-slate-700/40 text-slate-300 hover:text-white'
                  }`}
                  title="Çap olunacaq sahələri fərdi seçin"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                  <span>Bölmələri Seçin</span>
                  {showSettingsDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Print Format Toggle */}
                <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-2xl border border-slate-700/40">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1.5">Format:</span>
                  <button
                    onClick={() => setPrintFormat('a4')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      printFormat === 'a4'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title="A4 Standart Sənəd (Mühasibat və Anbar üçün)"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    A4
                  </button>
                  <button
                    onClick={() => setPrintFormat('thermal')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      printFormat === 'thermal'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title="80mm Kassa Çeki (POS Termal Printer üçün)"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    80mm Çek
                  </button>
                </div>
              </div>
            </div>

            {/* EXPANDABLE FINE-GRAINED SETTINGS DRAWER */}
            {showSettingsDrawer && (
              <div className="mt-3 p-4 bg-slate-950/80 rounded-2xl border border-slate-700/70 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                    Çap və PDF üçün göstəriləcək məlumatları seçin:
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">İstədiyiniz bəndləri aktivləşdirin və ya gizlədin</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={customSections.showPrices}
                      onChange={() => toggleSection('showPrices')}
                      className="rounded accent-blue-600 cursor-pointer"
                    />
                    <span className={customSections.showPrices ? 'font-bold text-white' : ''}>Qiymətlər və Məbləğlər</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={customSections.showFinancialSummary}
                      onChange={() => toggleSection('showFinancialSummary')}
                      className="rounded accent-blue-600 cursor-pointer"
                    />
                    <span className={customSections.showFinancialSummary ? 'font-bold text-white' : ''}>Maliyyə Xülasəsi</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={customSections.showPaymentBreakdown}
                      onChange={() => toggleSection('showPaymentBreakdown')}
                      className="rounded accent-blue-600 cursor-pointer"
                    />
                    <span className={customSections.showPaymentBreakdown ? 'font-bold text-white' : ''}>Nağd / Kart Bölgüsü</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={customSections.showReceipts}
                      onChange={() => toggleSection('showReceipts')}
                      className="rounded accent-blue-600 cursor-pointer"
                    />
                    <span className={customSections.showReceipts ? 'font-bold text-white' : ''}>Çeklərin Reyestri</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={customSections.showProfit}
                      onChange={() => toggleSection('showProfit')}
                      className="rounded accent-blue-600 cursor-pointer"
                    />
                    <span className={customSections.showProfit ? 'font-bold text-white' : ''}>Maya Dəyəri və Qazanc</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={customSections.showBarcodes}
                      onChange={() => toggleSection('showBarcodes')}
                      className="rounded accent-blue-600 cursor-pointer"
                    />
                    <span className={customSections.showBarcodes ? 'font-bold text-white' : ''}>Barkodlar</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={customSections.showCategories}
                      onChange={() => toggleSection('showCategories')}
                      className="rounded accent-blue-600 cursor-pointer"
                    />
                    <span className={customSections.showCategories ? 'font-bold text-white' : ''}>Kateqoriyalar</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={customSections.showSignatures}
                      onChange={() => toggleSection('showSignatures')}
                      className="rounded accent-blue-600 cursor-pointer"
                    />
                    <span className={customSections.showSignatures ? 'font-bold text-white' : ''}>İmza və Təsdiq Bölməsi</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/70 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <h4 className="text-base font-bold text-gray-800">Məlumatlar toplanır...</h4>
                <p className="text-xs text-gray-400 mt-1">Günün satışları və məhsul sayları hesablanır</p>
              </div>
            ) : !reportData ? (
              <div className="text-center py-20">
                <p className="text-gray-500 font-bold">Məlumat tapılmadı</p>
              </div>
            ) : (
              <>
                {/* Top Quick Status Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      reportMode === 'products_only' ? 'bg-sky-50 text-sky-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Hesabat Tarixi</div>
                      <div className="text-sm font-black text-gray-900 leading-none">
                        {reportData.formattedDate} ({selectedDate})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Dövr (İş Saatları)</div>
                      <div className="text-xs font-black text-gray-800 leading-none">
                        {reportData.shiftStartTime} — {reportData.shiftEndTime}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Tərtib Edildi</div>
                      <div className="text-xs font-black text-gray-800 leading-none">
                        {reportData.generatedAt}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Məsul Şəxs</div>
                      <div className="text-xs font-black text-gray-800 leading-none">
                        {businessInfo.cashierName}
                      </div>
                    </div>
                  </div>
                </div>

                {/* VARIANT 1: PRODUCTS ONLY SUMMARY (No Prices) */}
                {reportMode === 'products_only' && (
                  <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800">
                          Sadələşdirilmiş Anbar və Sayım Çıxarışı
                        </span>
                        <h3 className="text-lg font-black text-slate-900 mt-1">
                          Yalnız Satılan Məhsullar və Onların Sayı (Qiymətlərsiz)
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Bu rejimdə maliyyə məbləğləri, qiymətlər və kassa qalıqları gizlədilir. Yalnız fiziki məhsul təhvili üçün nəzərdə tutulub.
                        </p>
                      </div>

                      <div className="flex items-center gap-4 bg-white/80 p-3 rounded-2xl border border-sky-100 shadow-sm shrink-0">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-sky-800">Cəmi Çeşid</div>
                          <div className="text-xl font-black text-slate-900">{reportData.products.length} çeşid</div>
                        </div>
                        <div className="h-8 w-px bg-sky-200" />
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-sky-800">Cəmi Satılan Miqdar</div>
                          <div className="text-xl font-black text-sky-700">{reportData.totalItemsCount} ədəd</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 1: SUMMARY & FINANCIAL METRICS (Only in detailed mode) */}
                {activeTab === 'summary' && reportMode === 'detailed' && (
                  <div className="space-y-6">
                    {/* Primary KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Total Revenue */}
                      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-3xl shadow-lg shadow-blue-500/15 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-black uppercase tracking-wider text-blue-100">
                            Cəmi Dövriyyə
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black tracking-tight">
                          {reportData.totalRevenue.toFixed(2)} ₼
                        </div>
                        <p className="text-[11px] text-blue-100/90 font-medium mt-1">
                          Günün ümumi satış həcmi
                        </p>
                      </div>

                      {/* Cash Payments */}
                      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                            Nağd Kassa
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <Banknote className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                          {reportData.totalCash.toFixed(2)} ₼
                        </div>
                        <p className="text-[11px] text-emerald-600 font-bold mt-1">
                          {reportData.totalRevenue > 0 ? ((reportData.totalCash / reportData.totalRevenue) * 100).toFixed(0) : 0}% pay
                        </p>
                      </div>

                      {/* Card Payments */}
                      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                            Kart / Nağdsız
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            <CreditCard className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                          {reportData.totalCard.toFixed(2)} ₼
                        </div>
                        <p className="text-[11px] text-purple-600 font-bold mt-1">
                          {reportData.totalRevenue > 0 ? ((reportData.totalCard / reportData.totalRevenue) * 100).toFixed(0) : 0}% pay
                        </p>
                      </div>

                      {/* Receipts & Avg Check */}
                      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                            Çek Sayı & Səbət
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <ShoppingCart className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                          {reportData.salesCount} <span className="text-sm font-bold text-gray-400">çek</span>
                        </div>
                        <p className="text-[11px] text-amber-600 font-bold mt-1">
                          Orta çek: {reportData.averageTicket.toFixed(2)} ₼
                        </p>
                      </div>
                    </div>

                    {/* Secondary Metrics Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Bölünmüş Satış</div>
                          <div className="text-base font-black text-gray-900 mt-0.5">{reportData.totalSplit.toFixed(2)} ₼</div>
                        </div>
                        <Layers className="w-5 h-5 text-gray-300" />
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Nisyə / Kredit</div>
                          <div className="text-base font-black text-gray-900 mt-0.5">{reportData.totalCredit.toFixed(2)} ₼</div>
                        </div>
                        <CreditCard className="w-5 h-5 text-gray-300" />
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Verilən Endirim</div>
                          <div className="text-base font-black text-red-500 mt-0.5">-{reportData.totalDiscounts.toFixed(2)} ₼</div>
                        </div>
                        <Percent className="w-5 h-5 text-red-300" />
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Məhsul Sayı</div>
                          <div className="text-base font-black text-gray-900 mt-0.5">{reportData.totalItemsCount} vahid</div>
                        </div>
                        <Package className="w-5 h-5 text-gray-300" />
                      </div>
                    </div>

                    {/* Cost & Profit Section (if cost available) */}
                    {customSections.showProfit && reportData.totalCostPrice > 0 && (
                      <div className="bg-emerald-50/70 border border-emerald-100 rounded-3xl p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                              Mənfəət Göstəriciləri
                            </span>
                            <h3 className="text-lg font-black text-emerald-950 mt-1">
                              Təxmini Xalis Qazanc: {reportData.grossProfit.toFixed(2)} ₼
                            </h3>
                            <p className="text-xs text-emerald-700 mt-0.5">
                              Məhsul maya dəyəri çıxıldıqdan sonra qalan ümumi gəlir (Rentabellik: {reportData.marginPercent}%)
                            </p>
                          </div>
                          <div className="flex items-center gap-6 self-start sm:self-auto">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Ümumi Maya</div>
                              <div className="text-base font-black text-emerald-900">{reportData.totalCostPrice.toFixed(2)} ₼</div>
                            </div>
                            <div className="h-8 w-px bg-emerald-200" />
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Xalis Marja</div>
                              <div className="text-base font-black text-emerald-900">{reportData.marginPercent}%</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Breakdown Bar & Visuals */}
                    {customSections.showPaymentBreakdown && (
                      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 mb-4 flex items-center justify-between">
                          <span>Ödəniş Metodları Üzrə Dövriyyə Bölgüsü</span>
                          <span className="text-gray-400 font-bold">Cəmi: {reportData.totalRevenue.toFixed(2)} ₼</span>
                        </h4>

                        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex mb-4">
                          {reportData.totalCash > 0 && (
                            <div 
                              style={{ width: `${(reportData.totalCash / reportData.totalRevenue) * 100}%` }}
                              className="bg-emerald-500 h-full transition-all"
                              title={`Nağd: ${reportData.totalCash.toFixed(2)} ₼`}
                            />
                          )}
                          {reportData.totalCard > 0 && (
                            <div 
                              style={{ width: `${(reportData.totalCard / reportData.totalRevenue) * 100}%` }}
                              className="bg-purple-600 h-full transition-all"
                              title={`Kart: ${reportData.totalCard.toFixed(2)} ₼`}
                            />
                          )}
                          {reportData.totalCredit > 0 && (
                            <div 
                              style={{ width: `${(reportData.totalCredit / reportData.totalRevenue) * 100}%` }}
                              className="bg-amber-500 h-full transition-all"
                              title={`Nisyə: ${reportData.totalCredit.toFixed(2)} ₼`}
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                            <div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase">Nağd Satış</div>
                              <div className="text-sm font-black text-gray-900">{reportData.totalCash.toFixed(2)} ₼</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-full bg-purple-600 shrink-0" />
                            <div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase">Kart (POS-Terminal)</div>
                              <div className="text-sm font-black text-gray-900">{reportData.totalCard.toFixed(2)} ₼</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                            <div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase">Nisyə / Kredit</div>
                              <div className="text-sm font-black text-gray-900">{reportData.totalCredit.toFixed(2)} ₼</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-full bg-red-400 shrink-0" />
                            <div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase">Endirimlər</div>
                              <div className="text-sm font-black text-red-500">-{reportData.totalDiscounts.toFixed(2)} ₼</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: SOLD PRODUCTS LIST (Adapts to reportMode) */}
                {activeTab === 'products' && (
                  <div className="space-y-4">
                    {/* Search & Stats Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100">
                      <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Məhsul adı və ya barkod ilə axtarış..."
                          value={searchProductQuery}
                          onChange={(e) => setSearchProductQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="text-xs font-bold text-gray-500 flex items-center gap-2">
                        <span>Cəmi {filteredProducts.length} çeşid məhsul</span>
                        {reportMode === 'products_only' && (
                          <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-black uppercase">
                            Qiymətsiz Sayım Rejimi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Products Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="py-3 px-4 text-center w-12">№</th>
                              <th className="py-3 px-4">Məhsulun Adı</th>
                              {customSections.showBarcodes && <th className="py-3 px-4">Barkod</th>}
                              {customSections.showCategories && <th className="py-3 px-4">Kateqoriya</th>}
                              <th className="py-3 px-4 text-center">Satılan Miqdar</th>
                              
                              {/* Price columns only in detailed mode or if showPrices is true */}
                              {customSections.showPrices && (
                                <>
                                  <th className="py-3 px-4 text-right">Orta Qiymət</th>
                                  <th className="py-3 px-4 text-right">Cəmi Məbləğ</th>
                                </>
                              )}

                              {reportMode === 'products_only' && (
                                <th className="py-3 px-4 text-center w-20">Yoxlama [✓]</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredProducts.length === 0 ? (
                              <tr>
                                <td colSpan={customSections.showPrices ? 7 : 5} className="py-12 text-center text-gray-400 font-medium">
                                  Heç bir satılan məhsul tapılmadı.
                                </td>
                              </tr>
                            ) : (
                              filteredProducts.map((p: any, idx: number) => (
                                <tr key={p.id || idx} className="hover:bg-blue-50/30 transition-colors">
                                  <td className="py-3 px-4 text-center font-bold text-gray-400">{idx + 1}</td>
                                  <td className="py-3 px-4 font-bold text-gray-900">{p.name}</td>
                                  {customSections.showBarcodes && (
                                    <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">{p.barcode || '-'}</td>
                                  )}
                                  {customSections.showCategories && (
                                    <td className="py-3 px-4 text-gray-500">
                                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold">
                                        {p.category}
                                      </span>
                                    </td>
                                  )}
                                  <td className="py-3 px-4 text-center font-black text-gray-900 text-sm">
                                    {p.quantity} <span className="text-xs font-normal text-gray-500">{p.unit || ''}</span>
                                  </td>

                                  {customSections.showPrices && (
                                    <>
                                      <td className="py-3 px-4 text-right font-medium text-gray-600">
                                        {p.avgPrice.toFixed(2)} ₼
                                      </td>
                                      <td className="py-3 px-4 text-right font-black text-blue-600">
                                        {p.totalRevenue.toFixed(2)} ₼
                                      </td>
                                    </>
                                  )}

                                  {reportMode === 'products_only' && (
                                    <td className="py-3 px-4 text-center">
                                      <span className="inline-block w-4 h-4 border border-gray-300 rounded" />
                                    </td>
                                  )}
                                </tr>
                              ))
                            )}
                          </tbody>
                          {filteredProducts.length > 0 && (
                            <tfoot className="bg-gray-50/80 border-t border-gray-200 font-black text-gray-900">
                              <tr>
                                <td colSpan={(customSections.showBarcodes ? 1 : 0) + (customSections.showCategories ? 1 : 0) + 2} className="py-3.5 px-4 text-right uppercase text-[10px] tracking-wider text-gray-500">
                                  Yekun Cəmi Miqdar:
                                </td>
                                <td className="py-3.5 px-4 text-center text-gray-900 text-sm">
                                  {reportData.totalItemsCount}
                                </td>
                                {customSections.showPrices && (
                                  <>
                                    <td className="py-3.5 px-4"></td>
                                    <td className="py-3.5 px-4 text-right text-sm text-blue-600">
                                      {reportData.totalRevenue.toFixed(2)} ₼
                                    </td>
                                  </>
                                )}
                                {reportMode === 'products_only' && <td></td>}
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: TRANSACTIONS / RECEIPTS (Only in detailed mode) */}
                {activeTab === 'transactions' && reportMode === 'detailed' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="py-3 px-4 text-center">Çek №</th>
                              <th className="py-3 px-4">Saat</th>
                              <th className="py-3 px-4">Məhsullar</th>
                              <th className="py-3 px-4">Ödəniş Növü</th>
                              <th className="py-3 px-4 text-center">Məhsul Sayı</th>
                              <th className="py-3 px-4 text-right">Endirim</th>
                              <th className="py-3 px-4 text-right">Yekun Məbləğ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {reportData.transactions.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                                  Bu gün heç bir çek qeydə alınmayıb.
                                </td>
                              </tr>
                            ) : (
                              reportData.transactions.map((t: any) => (
                                <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                                  <td className="py-3 px-4 text-center font-bold text-blue-600 font-mono">
                                    {t.receiptNumber}
                                  </td>
                                  <td className="py-3 px-4 text-gray-500 font-medium">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                                      {t.time}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-gray-700 max-w-xs truncate" title={t.itemsSummary}>
                                    {t.itemsSummary || '-'}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                                      {t.paymentMethod}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center font-bold text-gray-800">
                                    {t.itemsCount}
                                  </td>
                                  <td className="py-3 px-4 text-right text-red-500 font-bold">
                                    {t.discount > 0 ? `-${t.discount.toFixed(2)} ₼` : '-'}
                                  </td>
                                  <td className="py-3 px-4 text-right font-black text-gray-900">
                                    {t.total.toFixed(2)} ₼
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: LIVE PRINT PREVIEW */}
                {activeTab === 'preview' && (
                  <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
                    <div className="w-full flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                        <Eye className="w-4 h-4 text-blue-600" />
                        <span>
                          {reportMode === 'products_only' 
                            ? 'Önbaxış: Yalnız Satılan Məhsullar və Sayı (Qiymətsiz)' 
                            : 'Önbaxış: Ətraflı Maliyyə Hesabatı'}
                          {' • '}{printFormat === 'a4' ? 'A4 Sənəd' : '80mm Termal Çek'}
                        </span>
                      </div>
                      <button
                        onClick={handlePrint}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Bu Hesabatı Çap Et
                      </button>
                    </div>

                    <div className="w-full overflow-x-auto flex justify-center bg-gray-100/70 p-4 rounded-2xl border border-gray-200">
                      <iframe
                        srcDoc={generateDailySalesReportHTML(reportData, businessInfo, printFormat, activeOptions)}
                        className={`bg-white shadow-xl rounded-xl border border-gray-200 ${
                          printFormat === 'a4' ? 'w-[794px] h-[900px]' : 'w-[360px] h-[750px]'
                        }`}
                        title="Print Preview"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 sm:p-5 bg-white border-t border-gray-100 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {reportMode === 'products_only' 
                  ? 'Rejim: Yalnız satılmış məhsullar və onların sayı (Qiymətsiz anbar siyahısı)' 
                  : 'Rejim: Bütün kassa məbləğləri və dövriyyə ilə ətraflı maliyyə hesabatı'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              {/* Excel Download */}
              <button
                onClick={handleDownloadExcel}
                disabled={loading || !reportData || isExportingExcel}
                className="px-4 py-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isExportingExcel ? 'Yüklənir...' : 'Excel (.xlsx)'}</span>
              </button>

              {/* PDF Download */}
              <button
                onClick={handleDownloadPDF}
                disabled={loading || !reportData || isExportingPDF}
                className="px-4 py-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>{isExportingPDF ? 'Yüklənir...' : 'PDF Yüklə (.pdf)'}</span>
              </button>

              {/* Print / Save to PDF Primary CTA */}
              <button
                onClick={handlePrint}
                disabled={loading || !reportData}
                className={`px-6 py-2.5 rounded-2xl text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 ${
                  reportMode === 'products_only'
                    ? 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-sky-500/25'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>
                  {reportMode === 'products_only' ? 'Siyahını Çap Et / PDF' : 'Hesabatı Çap Et / PDF'}
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
};

export default DailySalesReportModal;
