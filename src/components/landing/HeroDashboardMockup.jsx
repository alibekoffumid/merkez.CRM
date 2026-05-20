import React from 'react';
import { 
  BarChart3, 
  Users, 
  Wallet, 
  ArrowUpRight, 
  LayoutDashboard, 
  Settings,
  Bell,
  Search,
  ShoppingCart,
  Utensils,
  Stethoscope
} from 'lucide-react';

const HeroDashboardMockup = () => {
  return (
    <div className="relative w-full min-h-[450px] md:min-h-[550px] max-h-[700px] rounded-[2.5rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden flex font-sans group">
      
      {/* Custom Styles for Chart Animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes drawChart {
          0% { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }
      `}} />

      {/* Sidebar */}
      <div className="w-16 md:w-20 lg:w-64 shrink-0 border-r border-slate-100 bg-white/50 backdrop-blur-xl flex flex-col p-2 lg:p-4 z-10 transition-all duration-300">
        <div className="flex items-center justify-center lg:justify-start gap-3 mb-6 lg:mb-10 px-2 mt-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div className="hidden lg:block font-black text-slate-900 text-xl tracking-tight">Merkez</div>
        </div>
        
        <div className="flex flex-col gap-2">
          {[
            { icon: LayoutDashboard, label: 'Dashboard', active: true },
            { icon: Utensils, label: 'Restaurant' },
            { icon: ShoppingCart, label: 'Retail' },
            { icon: Stethoscope, label: 'Healthcare' },
            { icon: Users, label: 'Customers' },
            { icon: Settings, label: 'Settings' }
          ].map((item, i) => (
            <div 
              key={i}
              className={`flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all ${
                item.active 
                  ? 'bg-blue-50 text-blue-600 font-bold' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-slate-50/50 relative overflow-hidden backdrop-blur-sm">
        {/* Glow Effects - Softened for light theme */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        {/* Topbar */}
        <div className="h-16 lg:h-20 shrink-0 border-b border-slate-100 flex items-center justify-between gap-4 lg:gap-8 px-4 lg:px-8 z-10 bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 bg-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg w-32 md:w-40 lg:w-64 border border-slate-200 shadow-sm">
            <Search className="w-4 h-4 shrink-0 text-slate-400" />
            <div className="text-sm truncate">Search modules...</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center relative shadow-sm">
              <Bell className="w-5 h-5 text-slate-400" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-0.5 shadow-sm">
              <div className="w-full h-full rounded-full bg-white border-2 border-white"></div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-4 lg:p-6 z-10 flex flex-col gap-4 lg:gap-6 overflow-y-auto">
          <div className="flex justify-between items-end shrink-0">
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">Overview</h2>
              <p className="text-slate-500 text-xs lg:text-sm">Real-time platform metrics</p>
            </div>
            <div className="hidden lg:flex px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-bold rounded-lg items-center gap-2 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Live Sync
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6 shrink-0">
            {[
              { label: 'Total Revenue', value: '$124,500', trend: '+14%', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-100' },
              { label: 'Active Users', value: '8,432', trend: '+22%', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100' },
              { label: 'Transactions', value: '1,240', trend: '+5%', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-100', hideOnMobile: true }
            ].map((stat, i) => (
              <div key={i} className={`bg-white border border-slate-100 shadow-sm p-4 lg:p-5 rounded-2xl transition-transform hover:-translate-y-1 duration-300 cursor-default group/card ${stat.hideOnMobile ? 'hidden lg:block' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 lg:p-3 rounded-xl ${stat.bg} ${stat.color} group-hover/card:scale-110 transition-transform`}>
                    <stat.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 text-[10px] lg:text-xs font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                    <ArrowUpRight className="w-3 h-3" />
                    {stat.trend}
                  </div>
                </div>
                <div className="text-slate-500 text-xs lg:text-sm font-medium mb-1">{stat.label}</div>
                <div className="text-lg lg:text-2xl font-black text-slate-900">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Chart Area */}
          <div className="flex-1 min-h-[150px] bg-white border border-slate-100 shadow-sm p-4 lg:p-6 rounded-2xl flex flex-col relative overflow-hidden shrink-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-slate-900 font-bold text-sm lg:text-base">Revenue Growth</h3>
              <div className="flex gap-2">
                {['1W', '1M', '1Y'].map((t, i) => (
                  <div key={i} className={`text-[10px] lg:text-xs font-bold px-2 lg:px-3 py-1 rounded-md cursor-pointer transition-colors ${i === 1 ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex-1 relative w-full h-full flex items-end pb-2">
              {/* Background Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-full h-px bg-slate-100"></div>
                ))}
              </div>

              {/* SVG Animated Chart */}
              <svg className="w-full h-full absolute inset-0 z-10" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradientArea" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path 
                  d="M0 40 L0 25 Q10 20 20 30 T40 15 T60 25 T80 10 T100 5 L100 40 Z" 
                  fill="url(#gradientArea)" 
                />
                <path 
                  d="M0 25 Q10 20 20 30 T40 15 T60 25 T80 10 T100 5" 
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="0.8" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  style={{
                    strokeDasharray: '200',
                    strokeDashoffset: '200',
                    animation: 'drawChart 2s ease-out forwards 0.5s'
                  }}
                />
              </svg>
              
              {/* Floating Data Points */}
              <div className="absolute top-[12.5%] right-0 w-3 h-3 bg-white rounded-full border-2 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse z-20"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Interactive overlay on hover */}
      <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>
  );
};

export default HeroDashboardMockup;
