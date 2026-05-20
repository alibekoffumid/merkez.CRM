import React, { useState, useEffect } from 'react';
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
  Stethoscope,
  Zap
} from 'lucide-react';

const HeroDashboardMockup = ({ onHoverItem }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', color: 'bg-blue-600', activeBg: 'bg-blue-50', activeText: 'text-blue-600', hex: '#2563eb' },
    { icon: Utensils, label: 'Restaurant', color: 'bg-orange-500', activeBg: 'bg-orange-50', activeText: 'text-orange-600', hex: '#ea580c' },
    { icon: ShoppingCart, label: 'Retail', color: 'bg-emerald-500', activeBg: 'bg-emerald-50', activeText: 'text-emerald-600', hex: '#059669' },
    { icon: Stethoscope, label: 'Healthcare', color: 'bg-rose-500', activeBg: 'bg-rose-50', activeText: 'text-rose-600', hex: '#e11d48' },
    { icon: Users, label: 'Customers', color: 'bg-indigo-500', activeBg: 'bg-indigo-50', activeText: 'text-indigo-600', hex: '#4f46e5' },
    { icon: Settings, label: 'Settings', color: 'bg-slate-600', activeBg: 'bg-slate-50', activeText: 'text-slate-700', hex: '#334155' }
  ];

  const activeColorHex = sidebarItems.find(i => i.label === activeTab)?.hex || '#2563eb';

  const restoreActiveTabWidget = () => {
    const currentItem = sidebarItems.find(i => i.label === activeTab);
    if (currentItem && onHoverItem) {
      onHoverItem({
        icon: currentItem.label === 'Dashboard' ? Zap : currentItem.icon,
        value: currentItem.label === 'Dashboard' ? '12+' : currentItem.label,
        label: currentItem.label === 'Dashboard' ? 'Active Modules' : 'Active Module',
        color: currentItem.label === 'Dashboard' ? 'bg-green-500' : currentItem.color
      });
    }
  };

  useEffect(() => {
    restoreActiveTabWidget();
  }, [activeTab]);

  const tabData = {
    'Dashboard': {
      title: 'Overview',
      subtitle: 'Real-time platform metrics',
      stats: [
        { label: 'Total Revenue', value: '$124,500', trend: '+14%', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-100', hoverColor: 'bg-blue-600' },
        { label: 'Active Users', value: '8,432', trend: '+22%', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100', hoverColor: 'bg-emerald-600' },
        { label: 'Transactions', value: '1,240', trend: '+5%', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-100', hideOnMobile: true, hoverColor: 'bg-purple-600' }
      ]
    },
    'Restaurant': {
      title: 'Restaurant',
      subtitle: 'Today\'s performance',
      stats: [
        { label: 'Orders', value: '342', trend: '+12%', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-100', hoverColor: 'bg-orange-600' },
        { label: 'Avg Ticket', value: '$45.20', trend: '+3%', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-100', hoverColor: 'bg-emerald-600' },
        { label: 'Tables', value: '24/30', trend: '80%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', hideOnMobile: true, hoverColor: 'bg-blue-600' }
      ]
    },
    'Retail': {
      title: 'Retail Store',
      subtitle: 'Sales & Inventory',
      stats: [
        { label: 'Sales', value: '$8,240', trend: '+18%', icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-100', hoverColor: 'bg-emerald-600' },
        { label: 'Visitors', value: '1,420', trend: '+5%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', hoverColor: 'bg-blue-600' },
        { label: 'Alerts', value: '12', trend: '-2', icon: Bell, color: 'text-rose-600', bg: 'bg-rose-100', hideOnMobile: true, hoverColor: 'bg-rose-600' }
      ]
    },
    'Healthcare': {
      title: 'Clinic Hub',
      subtitle: 'Patient flow & appointments',
      stats: [
        { label: 'Patients', value: '84', trend: '+10%', icon: Users, color: 'text-rose-600', bg: 'bg-rose-100', hoverColor: 'bg-rose-600' },
        { label: 'Appts', value: '12', trend: 'Next 10:30', icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-100', hoverColor: 'bg-blue-600' },
        { label: 'Revenue', value: '$4,200', trend: '+8%', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-100', hideOnMobile: true, hoverColor: 'bg-emerald-600' }
      ]
    },
    'Customers': {
      title: 'CRM',
      subtitle: 'Customer relationships',
      stats: [
        { label: 'New Leads', value: '45', trend: '+20%', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100', hoverColor: 'bg-indigo-600' },
        { label: 'Conversion', value: '12.4%', trend: '+2.1%', icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-100', hoverColor: 'bg-emerald-600' },
        { label: 'Messages', value: '128', trend: '5 unread', icon: Bell, color: 'text-blue-600', bg: 'bg-blue-100', hideOnMobile: true, hoverColor: 'bg-blue-600' }
      ]
    },
    'Settings': {
      title: 'Settings',
      subtitle: 'System configuration',
      stats: [
        { label: 'Health', value: '100%', trend: 'All good', icon: Settings, color: 'text-emerald-600', bg: 'bg-emerald-100', hoverColor: 'bg-emerald-600' },
        { label: 'Integrations', value: '8/10', trend: 'Active', icon: LayoutDashboard, color: 'text-blue-600', bg: 'bg-blue-100', hoverColor: 'bg-blue-600' },
        { label: 'Users', value: '12', trend: '2 pending', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100', hideOnMobile: true, hoverColor: 'bg-purple-600' }
      ]
    }
  };

  const currentData = tabData[activeTab] || tabData['Dashboard'];

  return (
    <div className="relative w-full h-[500px] md:h-[550px] lg:h-[650px] rounded-[2.5rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden flex font-sans group">
      
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
          {sidebarItems.map((item, i) => {
            const isActive = activeTab === item.label;
            return (
              <div 
                key={i}
                onClick={() => setActiveTab(item.label)}
                onMouseEnter={() => onHoverItem && onHoverItem({
                  icon: item.label === 'Dashboard' ? Zap : item.icon,
                  value: item.label === 'Dashboard' ? '12+' : item.label,
                  label: item.label === 'Dashboard' ? 'Active Modules' : 'Active Module',
                  color: item.label === 'Dashboard' ? 'bg-green-500' : item.color
                })}
                onMouseLeave={restoreActiveTabWidget}
                className={`flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                  isActive 
                    ? `${item.activeBg} ${item.activeText} font-bold` 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="hidden lg:block text-sm">{item.label}</span>
              </div>
            );
          })}
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
        <div className="flex-1 p-3 lg:p-5 z-10 flex flex-col gap-3 lg:gap-4 overflow-hidden">
          <div className="flex justify-between items-end shrink-0">
            <div>
              <h2 className="text-lg lg:text-xl font-black text-slate-900 mb-0.5">{currentData.title}</h2>
              <p className="text-slate-500 text-[10px] lg:text-xs">{currentData.subtitle}</p>
            </div>
            <div className="hidden lg:flex px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-bold rounded-lg items-center gap-2 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Live Sync
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3 shrink-0">
            {currentData.stats.map((stat, i) => (
              <div 
                key={i} 
                onMouseEnter={() => onHoverItem && onHoverItem({
                  icon: stat.icon,
                  value: stat.value,
                  label: stat.label,
                  color: stat.hoverColor
                })}
                onMouseLeave={restoreActiveTabWidget}
                className={`bg-white border border-slate-100 shadow-sm p-3 lg:p-4 rounded-xl transition-transform hover:-translate-y-1 duration-300 cursor-default group/card ${stat.hideOnMobile ? 'hidden lg:block' : ''}`}
              >
                <div className="flex justify-between items-start mb-2 lg:mb-3">
                  <div className={`p-1.5 lg:p-2 rounded-lg ${stat.bg} ${stat.color} group-hover/card:scale-110 transition-transform`}>
                    <stat.icon className="w-4 h-4 lg:w-5 lg:h-5" />
                  </div>
                  <div className="flex items-center gap-0.5 text-emerald-600 text-[9px] lg:text-[10px] font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                    <ArrowUpRight className="w-2.5 h-2.5" />
                    {stat.trend}
                  </div>
                </div>
                <div className="text-slate-500 text-[10px] lg:text-xs font-medium mb-0.5">{stat.label}</div>
                <div className="text-base lg:text-xl font-black text-slate-900">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Chart Area */}
          <div className="flex-1 min-h-[140px] lg:min-h-[180px] bg-white border border-slate-100 shadow-sm p-3 lg:p-5 rounded-xl flex flex-col relative overflow-hidden shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-slate-900 font-bold text-xs lg:text-sm">Revenue Growth</h3>
              <div className="flex gap-2">
                {['1W', '1M', '1Y'].map((t, i) => (
                  <div key={i} className={`text-[10px] lg:text-xs font-bold px-2 lg:px-3 py-1 rounded-md cursor-pointer transition-colors ${i === 1 ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex-1 relative w-full h-full flex items-end pb-2 pt-4">
              {/* Background Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-full h-px bg-slate-100"></div>
                ))}
              </div>

              {/* SVG Animated Chart */}
              <svg key={activeTab} className="w-full h-full absolute inset-0 z-10 overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`gradientArea-${activeTab}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={activeColorHex} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={activeColorHex} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path 
                  d="M0 40 L0 30 C10 30, 10 15, 20 15 C30 15, 30 25, 40 25 C50 25, 50 10, 60 10 C70 10, 70 28, 80 28 C90 28, 90 5, 100 5 L100 40 Z" 
                  fill={`url(#gradientArea-${activeTab})`} 
                />
                <path 
                  d="M0 30 C10 30, 10 15, 20 15 C30 15, 30 25, 40 25 C50 25, 50 10, 60 10 C70 10, 70 28, 80 28 C90 28, 90 5, 100 5" 
                  fill="none" 
                  stroke={activeColorHex} 
                  strokeWidth="0.8" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  style={{
                    strokeDasharray: '200',
                    strokeDashoffset: '200',
                    animation: 'drawChart 1.5s ease-out forwards 0.1s'
                  }}
                />
              </svg>
              
              {/* Floating Data Points */}
              <div 
                key={`point-${activeTab}`}
                className="absolute top-[12.5%] right-0 w-3 h-3 bg-white rounded-full border-2 animate-pulse z-20"
                style={{ borderColor: activeColorHex, boxShadow: `0 0 10px ${activeColorHex}80` }}
              ></div>
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
