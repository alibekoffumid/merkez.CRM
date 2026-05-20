import React from 'react';
import { Utensils, ShoppingCart, Package, Car, Briefcase } from 'lucide-react';

const ModulesShowcaseMockup = () => {
  const modules = [
    { 
      id: 'restaurant', 
      title: 'Restaurant', 
      icon: Utensils, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]',
      delay: '0s'
    },
    { 
      id: 'retail', 
      title: 'Retail', 
      icon: ShoppingCart, 
      color: 'text-orange-500', 
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      shadow: 'shadow-[0_0_30px_rgba(249,115,22,0.2)]',
      delay: '1.5s'
    },
    { 
      id: 'warehouse', 
      title: 'Warehouse', 
      icon: Package, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      shadow: 'shadow-[0_0_30px_rgba(59,130,246,0.2)]',
      delay: '3s'
    },
    { 
      id: 'fleet', 
      title: 'Fleet', 
      icon: Car, 
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      shadow: 'shadow-[0_0_30px_rgba(168,85,247,0.2)]',
      delay: '4.5s'
    }
  ];

  return (
    <div className="relative w-full min-h-[400px] md:min-h-[500px] rounded-[3rem] bg-[#0b1121] shadow-2xl overflow-hidden flex items-center justify-center p-6 md:p-12 group border-[8px] md:border-[12px] border-white">
      
      {/* Background Grid & Glows */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiPjxwYXRoIGQ9Ik0wIDQwbDQwIDBNNDAgMGwwIDQwIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>
      
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Modules Grid */}
      <div className="grid grid-cols-2 gap-4 md:gap-6 relative z-10 w-full max-w-md">
        {modules.map((mod, i) => (
          <div 
            key={mod.id}
            className={`
              relative aspect-square rounded-3xl ${mod.bg} ${mod.border} border backdrop-blur-xl 
              flex flex-col items-center justify-center gap-3 md:gap-5 transition-all duration-500
              hover:scale-105 hover:-translate-y-2 cursor-pointer ${mod.shadow} animate-float
            `}
            style={{ animationDelay: mod.delay, animationDuration: '6s' }}
          >
            {/* Top Shine */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>
            
            <div className={`p-4 md:p-5 rounded-2xl bg-[#0f172a]/50 shadow-inner ${mod.color}`}>
              <mod.icon className="w-8 h-8 md:w-12 md:h-12" strokeWidth={1.5} />
            </div>
            
            <div className="text-center">
              <h4 className={`font-black uppercase tracking-widest text-[10px] md:text-sm ${mod.color}`}>
                {mod.title}
              </h4>
              <p className="text-[8px] md:text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">Module</p>
            </div>
          </div>
        ))}
        
        {/* Central Hub Connector (Visual only) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-[#0f172a] rounded-full border-4 border-[#0b1121] flex items-center justify-center shadow-2xl z-20">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Briefcase className="w-3 h-3 md:w-4 md:h-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModulesShowcaseMockup;
