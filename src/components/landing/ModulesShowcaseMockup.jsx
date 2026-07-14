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
    <div className="relative w-full min-h-[400px] md:min-h-[500px] flex items-center justify-center p-4 md:p-12 group">
      
      {/* Background Glows (optimized for light mode) */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Modules Grid */}
      <div className="grid grid-cols-2 gap-6 md:gap-8 relative z-10 w-full max-w-lg">
        {modules.map((mod, i) => (
          <div 
            key={mod.id}
            className={`
              relative aspect-square rounded-xl ${mod.bg} ${mod.border} border backdrop-blur-xl 
              flex flex-col items-center justify-center gap-3 md:gap-5 transition-all duration-500
              hover:scale-105 cursor-pointer ${mod.shadow} animate-float-gentle
            `}
            style={{ animationDelay: mod.delay, animationDuration: '6s' }}
          >
            {/* Top Shine */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-50"></div>
            
            <div className={`p-5 md:p-6 rounded-lg ${mod.color}`}>
              <mod.icon className="w-10 h-10 md:w-14 md:h-14" strokeWidth={1.5} />
            </div>
            
            <div className="text-center">
              <h4 className={`font-black uppercase tracking-widest text-xs md:text-sm ${mod.color}`}>
                {mod.title}
              </h4>
              <p className="text-[9px] md:text-[11px] text-slate-500 font-bold tracking-widest uppercase mt-1">Module</p>
            </div>
          </div>
        ))}
        

      </div>

      {/* Gentle float animation — smaller amplitude so cards don't overlap */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatGentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float-gentle {
          animation: floatGentle 6s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};

export default ModulesShowcaseMockup;
