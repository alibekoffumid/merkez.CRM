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
  Activity,
  Plus,
  Save,
  Trash2,
  Stethoscope
} from 'lucide-react';
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

const DentalChart: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [teethData, setTeethData] = useState<Record<number, ToothData>>({});
  
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

  // Role-Based Access Control (RBAC)
  const isDentist = profile?.role?.toUpperCase() === 'DENTIST';
  const isAdmin = profile?.role?.toUpperCase() === 'ADMIN';
  const hasAccess = isDentist || isAdmin;

  // Tooth layout: 1-16 upper, 17-32 lower
  const upperTeeth = useMemo(() => Array.from({ length: 16 }, (_, i) => i + 1), []);
  const lowerTeeth = useMemo(() => Array.from({ length: 16 }, (_, i) => 32 - i), []);

  if (!hasAccess) {
    return (
      <div className="bg-slate-950 rounded-[2.5rem] p-16 border border-slate-900 flex flex-col items-center justify-center text-center shadow-2xl">
        <div className="w-24 h-24 rounded-3xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 mb-8 animate-pulse">
          <ShieldAlert className="w-12 h-12 text-rose-500" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">{t('dental.accessRestricted')}</h2>
        <p className="text-slate-400 max-w-sm leading-relaxed">
          {t('dental.accessRestrictedDesc')}
        </p>
      </div>
    );
  }

  const handleToothClick = (num: number) => {
    setSelectedTooth(num === selectedTooth ? null : num);
  };

  const updateStatus = (status: ToothCondition) => {
    if (selectedTooth) {
      setTeethData(prev => ({
        ...prev,
        [selectedTooth]: {
          status,
          updatedBy: profile?.fullName || 'Dr. Unknown',
          updatedAt: new Date().toISOString(),
        }
      }));
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
          ${isSelected ? 'bg-slate-800 ring-2 ring-blue-500 shadow-lg shadow-blue-500/20 z-10 scale-110' : 'hover:bg-slate-800/40'}
          ${data && !isSelected ? config.bg : 'bg-transparent'}
          group w-14 h-24 md:w-20 md:h-32
        `}
      >
        <span className={`text-[10px] md:text-xs font-black mb-1 md:mb-2 transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-600'}`}>
          {num}
        </span>
        <div className="w-8 h-12 md:w-12 md:h-16 relative">
          {renderToothSVG(num, status, isSelected)}
        </div>
        {data && (
          <div className="absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-1 border border-slate-800 shadow-xl">
            <config.icon className={`w-3 h-3 md:w-4 md:h-4 ${config.color}`} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#080B14] rounded-[3rem] shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] border border-slate-800/40 p-6 md:p-12 overflow-hidden font-sans">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.75rem] bg-gradient-to-br from-blue-500 to-indigo-600 p-[1px] shadow-lg shadow-blue-500/20">
            <div className="w-full h-full rounded-[1.75rem] bg-slate-950 flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">{t('dental.chartTitle')}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">{t('dental.chartSubtitle')}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {selectedTooth ? (
            <div className="flex items-center gap-2 p-3 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-blue-500/20 animate-in slide-in-from-right-4 duration-500">
              <span className="text-xs font-black text-blue-400 uppercase tracking-widest px-4 border-r border-slate-800">{t('dental.assignTooth')} {selectedTooth}:</span>
              <div className="flex flex-wrap gap-1.5 px-2">
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
              <button onClick={() => setSelectedTooth(null)} className="ml-2 p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-slate-500 text-sm bg-slate-900/40 backdrop-blur-md px-8 py-4 rounded-2xl border border-slate-800/50">
              <Info className="w-5 h-5 text-blue-500" />
              <span className="font-medium">{t('dental.chartSubtitle')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative space-y-12 md:space-y-24 py-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-8 gap-1 md:flex md:justify-center md:gap-4 lg:gap-6">
          {upperTeeth.map(num => <ToothBox key={num} num={num} />)}
        </div>
        <div className="relative flex items-center justify-center py-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
          </div>
          <div className="relative bg-[#080B14] px-10 border border-slate-800/50 rounded-full py-1">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.6em]">Occlusal Mapping Area</span>
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1 md:flex md:justify-center md:gap-4 lg:gap-6">
          {lowerTeeth.map(num => <ToothBox key={num} num={num} />)}
        </div>
      </div>

      <div className="mt-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-slate-900/30 backdrop-blur-sm rounded-[2.5rem] p-10 border border-slate-800/40">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">{t('dental.legend')}</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-y-8 gap-x-4">
            {(Object.keys(CONDITION_CONFIG) as ToothCondition[]).map((key) => (
              <div key={key} className="flex items-center gap-4 group cursor-default">
                <div className={`w-3 h-3 rounded-full ${CONDITION_CONFIG[key].color.replace('text-', 'bg-')} shadow-[0_0_10px_rgba(0,0,0,0.5)] group-hover:scale-125 transition-transform`} />
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider group-hover:text-slate-200 transition-colors">{CONDITION_CONFIG[key].label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-gradient-to-b from-slate-900/60 to-slate-900/20 rounded-[2.5rem] p-10 border border-slate-800/40 shadow-inner">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">{t('dental.auditTrail')}</h3>
            </div>
            <button className="text-slate-500 hover:text-white transition-colors">
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-6">
            {Object.keys(teethData).length > 0 ? (
              Object.entries(teethData).slice(-4).reverse().map(([num, data]) => (
                <div key={num} className="group flex items-start gap-5 p-4 rounded-2xl hover:bg-slate-800/30 transition-all border border-transparent hover:border-slate-800">
                  <div className={`mt-1.5 w-3 h-3 rounded-full ${CONDITION_CONFIG[data.status].color.replace('text-', 'bg-')} shrink-0`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-black text-white uppercase">Tooth #{num}</p>
                      <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md uppercase tracking-tighter">{CONDITION_CONFIG[data.status].label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                        <UserIcon className="w-3 h-3" /> {data.updatedBy}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                        <Clock className="w-3 h-3" /> {new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-xs text-slate-600 font-black uppercase tracking-widest">No Recent Records</p>
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
