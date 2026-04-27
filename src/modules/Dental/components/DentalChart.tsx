import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertCircle, 
  CheckCircle2, 
  Circle, 
  Info, 
  ShieldAlert,
  History,
  Clock,
  User as UserIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  Plus,
  Save,
  Stethoscope,
  Trash2
} from 'lucide-react';
import { DentalService } from '../../../services/DentalService';
import { useUser } from '../../../core/UserContext';

// Define Tooth Conditions aligned with Prisma Schema
type ToothCondition = 
  | 'HEALTHY' 
  | 'CARIES' 
  | 'MISSING' 
  | 'CROWN' 
  | 'IMPLANT' 
  | 'FILLING' 
  | 'ROOT_CANAL'
  | 'EXTRACTION_REQUIRED'
  | 'BRIDGE';

interface DentalChartProps {
  patientId?: string;
}

const DentalChart: React.FC<DentalChartProps> = ({ patientId }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [teethData, setTeethData] = useState<Record<number, ToothData>>({});
  const [loading, setLoading] = useState(false);
  
  const upperRowRef = React.useRef<HTMLDivElement>(null);
  const lowerRowRef = React.useRef<HTMLDivElement>(null);

  const scrollRow = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 300;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  
  interface ToothData {
    status: ToothCondition;
    updatedBy: string;
    updatedAt: string;
    notes?: string;
  }

  const CONDITION_CONFIG: Record<ToothCondition, { label: string; color: string; bg: string; icon: any }> = {
    HEALTHY: { label: t('dental.healthy'), color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
    CARIES: { label: t('dental.caries'), color: 'text-amber-400', bg: 'bg-amber-500/10', icon: AlertCircle },
    MISSING: { label: t('dental.missing'), color: 'text-slate-600', bg: 'bg-slate-600/10', icon: Circle },
    CROWN: { label: t('dental.crown'), color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Info },
    IMPLANT: { label: t('dental.implant'), color: 'text-purple-400', bg: 'bg-purple-500/10', icon: ShieldAlert },
    FILLING: { label: t('dental.filling'), color: 'text-sky-400', bg: 'bg-sky-500/10', icon: Info },
    ROOT_CANAL: { label: t('dental.rootCanal'), color: 'text-rose-400', bg: 'bg-rose-500/10', icon: Activity },
    EXTRACTION_REQUIRED: { label: t('dental.extraction'), color: 'text-red-500', bg: 'bg-red-500/10', icon: Trash2 },
    BRIDGE: { label: t('dental.bridge'), color: 'text-indigo-400', bg: 'bg-indigo-500/10', icon: ChevronDown },
  };

  // Role-Based Access Control (RBAC) - More permissive for the clinical staff
  const userRole = (profile as any)?.role?.toUpperCase() || 'USER';
  const hasAccess = ['ADMIN', 'MANAGER', 'USER', 'DENTIST'].includes(userRole);

  // Tooth layout: 1-16 upper, 17-32 lower
  const upperTeeth = useMemo(() => Array.from({ length: 16 }, (_, i) => i + 1), []);
  const lowerTeeth = useMemo(() => Array.from({ length: 16 }, (_, i) => 32 - i), []);

  if (!hasAccess) {
    return (
      <div className="bg-white rounded-[2.5rem] p-16 border border-gray-100 flex flex-col items-center justify-center text-center shadow-xl">
        <div className="w-24 h-24 rounded-3xl bg-rose-50 flex items-center justify-center border border-rose-100 mb-8">
          <ShieldAlert className="w-12 h-12 text-rose-500" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">{t('dental.accessRestricted')}</h2>
        <p className="text-gray-500 max-w-sm leading-relaxed">
          {t('dental.accessRestrictedDesc')}
        </p>
      </div>
    );
  }

  React.useEffect(() => {
    if (patientId) {
      loadToothHistory();
    }
  }, [patientId]);

  const loadToothHistory = async () => {
    try {
      setLoading(true);
      const history = await DentalService.getToothHistory(patientId);
      const parsedData: Record<number, ToothData> = {};
      
      // Since it's ordered by created_at descending, we process from bottom up to get the latest per tooth
      // Wait, if it's descending, the first one encountered is the latest.
      history.forEach(record => {
        if (!parsedData[record.tooth_number]) {
          parsedData[record.tooth_number] = {
            status: record.condition as ToothCondition,
            updatedBy: record.updated_by || 'Unknown',
            updatedAt: record.created_at,
            notes: record.notes
          };
        }
      });
      setTeethData(parsedData);
    } catch (err) {
      console.error('Error loading tooth history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToothClick = (num: number) => {
    setSelectedTooth(num === selectedTooth ? null : num);
  };

  const updateStatus = async (status: ToothCondition) => {
    if (!selectedTooth || !patientId) return;

    try {
      const doctorName = (profile as any)?.fullName || (profile as any)?.full_name || 'Dr. Unknown';
      console.log('DentalChart: Updating tooth status...', { patientId, selectedTooth, status, doctorName });
      const record = await DentalService.updateToothCondition(
        patientId,
        selectedTooth,
        status,
        '',
        doctorName
      );
      console.log('DentalChart: Update successful!', record);

      setTeethData(prev => ({
        ...prev,
        [selectedTooth]: {
          status,
          updatedBy: doctorName,
          updatedAt: record.created_at || new Date().toISOString(),
        }
      }));
      // Optional: Add a small visual feedback if possible, or just log
    } catch (err) {
      console.error('Error updating tooth status:', err);
      alert('Failed to save tooth status: ' + ((err as any).message || 'Unknown error'));
    }
  };

  const renderToothSVG = (num: number, status: ToothCondition, isSelected: boolean) => {
    const config = CONDITION_CONFIG[status];
    
    return (
      <svg 
        viewBox="0 0 100 120" 
        className={`w-full h-full ${config.color} fill-current transition-all duration-500 filter drop-shadow-sm`}
      >
        <path 
          d="M50 5C35 5 20 15 15 35C10 55 15 85 25 105C30 115 40 118 50 118C60 118 70 115 75 105C85 85 90 55 85 35C80 15 65 5 50 5Z" 
          className={`${isSelected ? 'stroke-2 stroke-blue-500' : 'stroke-0'}`}
        />
        {status === 'CARIES' && <circle cx="50" cy="40" r="12" fill="#0f172a" fillOpacity="0.8" className="animate-pulse" />}
        {status === 'FILLING' && <rect x="35" y="30" width="30" height="25" rx="4" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />}
        {status === 'IMPLANT' && (
          <g transform="translate(35, 75)">
            <rect width="30" height="35" rx="4" fill="#0f172a" fillOpacity="0.9" />
            <path d="M5 8H25M5 16H25M5 24H25" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
        {status === 'ROOT_CANAL' && <path d="M50 40V100M40 90L50 100L60 90" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" opacity="0.7" />}
        {status === 'MISSING' && <line x1="20" y1="20" x2="80" y2="100" stroke="#0f172a" strokeWidth="8" strokeLinecap="round" opacity="0.6" />}
      </svg>
    );
  };

  const ToothBox = ({ num }: { num: number }) => {
    const data = teethData[num];
    const status = data?.status || 'HEALTHY';
    const config = CONDITION_CONFIG[status];
    const isSelected = selectedTooth === num;

    return (
      <div 
        onClick={() => handleToothClick(num)}
        className={`
          relative flex flex-col items-center justify-center p-2 md:p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300
          ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 shadow-md z-10 scale-110' : 'hover:bg-gray-50'}
          ${data && !isSelected ? config.bg : 'bg-transparent'}
          group w-14 h-24 md:w-20 md:h-32
        `}
      >
        <span className={`text-[10px] md:text-xs font-black mb-1 md:mb-2 transition-colors ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
          {num}
        </span>
        <div className="w-8 h-12 md:w-12 md:h-16 relative">
          {renderToothSVG(num, status, isSelected)}
        </div>
        {data && (
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border border-gray-100 shadow-sm">
            <config.icon className={`w-3 h-3 md:w-4 md:h-4 ${config.color}`} />
          </div>
        )}
      </div>
    );
  };

  const StatusPicker = () => {
    if (!selectedTooth) return null;
    return (
      <div className="flex items-center gap-2 p-4 bg-blue-50/50 rounded-[2rem] border border-blue-100 shadow-xl shadow-blue-600/5 animate-in slide-in-from-top-4 duration-500 max-w-fit mx-auto mb-6">
        <div className="flex items-center gap-3 pr-6 border-r border-blue-100">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black shadow-lg">
            {selectedTooth}
          </div>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t('dental.assignTooth')}:</span>
        </div>
        <div className="flex flex-wrap gap-1.5 px-4">
          {(Object.keys(CONDITION_CONFIG) as ToothCondition[]).map((key) => (
            <button
              key={key}
              onClick={() => updateStatus(key)}
              className={`
                px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-tighter
                ${CONDITION_CONFIG[key].bg} ${CONDITION_CONFIG[key].color}
                hover:scale-105 active:scale-95 border border-transparent hover:border-current/20
              `}
            >
              {CONDITION_CONFIG[key].label}
            </button>
          ))}
        </div>
        <button onClick={() => setSelectedTooth(null)} className="ml-2 p-2 hover:bg-white rounded-full text-gray-400 transition-colors shadow-sm">
          <Plus className="w-5 h-5 rotate-45" />
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-6 md:p-12 font-sans">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.75rem] bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('dental.chartTitle')}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">{t('dental.chartSubtitle')}</p>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-gray-500 text-sm bg-gray-50 px-8 py-4 rounded-2xl border border-gray-100 shadow-sm">
          <Info className="w-5 h-5 text-blue-600" />
          <span className="font-medium">{t('dental.chartSubtitle')}</span>
        </div>
      </div>

      <div className="relative space-y-8 py-12">
        {/* Upper Teeth Picker */}
        {selectedTooth && selectedTooth <= 16 && <StatusPicker />}

        {/* Upper Teeth Row */}
        <div className="relative group">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => scrollRow(upperRowRef, 'left')}
              className="w-10 h-10 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-gray-600 hover:text-blue-600 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
          
          <div 
            ref={upperRowRef}
            className="flex items-center gap-2 md:gap-4 lg:gap-6 overflow-x-auto no-scrollbar scroll-smooth px-12 py-8"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {upperTeeth.map(num => (
              <div key={num} style={{ scrollSnapAlign: 'start', zIndex: selectedTooth === num ? 50 : 1 }} className="relative">
                <ToothBox num={num} />
              </div>
            ))}
          </div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => scrollRow(upperRowRef, 'right')}
              className="w-10 h-10 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-gray-600 hover:text-blue-600 active:scale-95 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Occlusal Separator */}
        <div className="relative flex items-center justify-center py-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          </div>
          <div className="relative bg-white px-10 border border-gray-100 rounded-full py-1 shadow-sm">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.6em]">Occlusal Mapping Area</span>
          </div>
        </div>

        {/* Lower Teeth Picker */}
        {selectedTooth && selectedTooth > 16 && <StatusPicker />}

        {/* Lower Teeth Row */}
        <div className="relative group">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => scrollRow(lowerRowRef, 'left')}
              className="w-10 h-10 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-gray-600 hover:text-blue-600 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>

          <div 
            ref={lowerRowRef}
            className="flex items-center gap-2 md:gap-4 lg:gap-6 overflow-x-auto no-scrollbar scroll-smooth px-12 py-8"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {lowerTeeth.map(num => (
              <div key={num} style={{ scrollSnapAlign: 'start', zIndex: selectedTooth === num ? 50 : 1 }} className="relative">
                <ToothBox num={num} />
              </div>
            ))}
          </div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => scrollRow(lowerRowRef, 'right')}
              className="w-10 h-10 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-gray-600 hover:text-blue-600 active:scale-95 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">{t('dental.legend')}</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-y-8 gap-x-4">
            {(Object.keys(CONDITION_CONFIG) as ToothCondition[]).map((key) => (
              <div key={key} className="flex items-center gap-4 group cursor-default">
                <div className={`w-3 h-3 rounded-full ${CONDITION_CONFIG[key].color.replace('text-', 'bg-')} shadow-sm group-hover:scale-125 transition-transform`} />
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider group-hover:text-gray-900 transition-colors">{CONDITION_CONFIG[key].label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">{t('dental.auditTrail')}</h3>
            </div>
            <button className="text-gray-400 hover:text-gray-900 transition-colors">
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-6">
            {Object.keys(teethData).length > 0 ? (
              Object.entries(teethData).slice(-4).reverse().map(([num, data]) => (
                <div key={num} className="group flex items-start gap-5 p-4 rounded-2xl hover:bg-white transition-all border border-transparent hover:border-gray-200 shadow-sm">
                  <div className={`mt-1.5 w-3 h-3 rounded-full ${CONDITION_CONFIG[data.status].color.replace('text-', 'bg-')} shrink-0`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-black text-gray-900 uppercase">Tooth #{num}</p>
                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-tighter">{CONDITION_CONFIG[data.status].label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        <UserIcon className="w-3 h-3" /> {data.updatedBy}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        <Clock className="w-3 h-3" /> {new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest">No Recent Records</p>
              </div>
            )}
          </div>
          {Object.keys(teethData).length > 0 && (
            <button className="w-full mt-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-3">
              <Save className="w-4 h-4" />
              {t('dental.syncChart')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DentalChart;
