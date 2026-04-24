import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  Plus,
  MoreVertical,
  History,
  Box
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const mockInventory = [
  { id: 1, name: 'Dental Composite (A2)', category: 'Restorative', quantity: 42, unit: 'pcs', status: 'IN_STOCK', min: 10 },
  { id: 2, name: 'Anesthetic Cartridges', category: 'General', quantity: 120, unit: 'pcs', status: 'IN_STOCK', min: 50 },
  { id: 3, name: 'Diamond Burs (Fine)', category: 'Instruments', quantity: 8, unit: 'pcs', status: 'LOW_STOCK', min: 15 },
  { id: 4, name: 'Disposable Syringes', category: 'General', quantity: 300, unit: 'pcs', status: 'IN_STOCK', min: 100 },
  { id: 5, name: 'Impression Material', category: 'Prosthetic', quantity: 3, unit: 'kg', status: 'CRITICAL', min: 5 },
];

const DentalInventory = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Items', value: '842', icon: Box, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Low Stock Alerts', value: '12', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Consumed (30d)', value: '1.2k', icon: ArrowDownRight, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Restocked (30d)', value: '840', icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/40 backdrop-blur-md rounded-[2rem] p-6 border border-slate-800/50 shadow-xl group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center border border-white/5`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live View</span>
            </div>
            <h4 className="text-3xl font-black text-white mb-1">{stat.value}</h4>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Inventory Table */}
      <div className="bg-[#0B0F1A] rounded-[2.5rem] shadow-2xl border border-slate-800/50 overflow-hidden">
        {/* Table Header / Actions */}
        <div className="p-8 border-b border-slate-800/50 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search inventory..." 
                className="w-full bg-slate-800/30 border border-slate-700/50 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-slate-400 hover:text-white transition-all">
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-sm font-black text-white hover:bg-slate-700 transition-all uppercase tracking-widest">
              <History className="w-5 h-5 text-purple-400" />
              Transaction Log
            </button>
            <button className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 uppercase tracking-widest active:scale-95">
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/20">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('common.name')}</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('common.category')}</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Quantity</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('common.status')}</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {mockInventory.map((item) => (
                <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center border border-slate-700/30 group-hover:scale-110 transition-transform">
                        <Package className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-sm font-bold text-white">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-800/30 px-3 py-1 rounded-md border border-slate-700/50">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">{item.quantity} {item.unit}</span>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mt-1">Min threshold: {item.min}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        item.status === 'IN_STOCK' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                        item.status === 'LOW_STOCK' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                        'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                      }`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        item.status === 'IN_STOCK' ? 'text-emerald-400' :
                        item.status === 'LOW_STOCK' ? 'text-amber-400' :
                        'text-rose-400'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-500 hover:text-white">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Placeholder */}
        <div className="p-8 bg-slate-900/20 border-t border-slate-800/50 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Showing 1-5 of 128 Items</p>
          <div className="flex items-center gap-2">
             <button className="px-4 py-2 bg-slate-800 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest">Prev</button>
             <button className="px-4 py-2 bg-blue-600 rounded-xl text-[10px] font-black text-white hover:bg-blue-500 transition-all uppercase tracking-widest">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DentalInventory;
