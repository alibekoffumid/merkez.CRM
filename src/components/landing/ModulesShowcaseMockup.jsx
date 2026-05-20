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
    <div className="relative w-full min-h-[400px] md:min-h-[500px] flex items-center justify-center p-6 md:p-12 group">
      
      {/* Background Glows (optimized for light mode) */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-[80px] pointer-events-none"></div>

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
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-50"></div>
            
            <div className={`p-4 md:p-5 rounded-2xl bg-white shadow-sm ${mod.color}`}>
              <mod.icon className="w-8 h-8 md:w-12 md:h-12" strokeWidth={1.5} />
            </div>
            
            <div className="text-center">
              <h4 className={`font-black uppercase tracking-widest text-[10px] md:text-sm ${mod.color}`}>
                {mod.title}
              </h4>
              <p className="text-[8px] md:text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">Module</p>
            </div>
          </div>
        ))}
        

      </div>
    </div>
  );
};

export default ModulesShowcaseMockup;
