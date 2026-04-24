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
          { label: 'Total Items', value: '842', icon: Box, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Low Stock Alerts', value: '12', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Consumed (30d)', value: '1.2k', icon: ArrowDownRight, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Restocked (30d)', value: '840', icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm group hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center border border-transparent`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live View</span>
            </div>
            <h4 className="text-3xl font-black text-gray-900 mb-1">{stat.value}</h4>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Header / Actions */}
        <div className="p-8 border-b border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search inventory..." 
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-all shadow-sm">
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-gray-50 rounded-2xl border border-gray-100 text-sm font-black text-gray-700 hover:bg-gray-100 transition-all uppercase tracking-widest">
              <History className="w-5 h-5 text-purple-600" />
              Transaction Log
            </button>
            <button className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 uppercase tracking-widest active:scale-95">
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('common.name')}</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('common.category')}</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Quantity</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('common.status')}</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockInventory.map((item) => (
                <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:scale-110 transition-transform">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-md border border-gray-100">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{item.quantity} {item.unit}</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mt-1">Min threshold: {item.min}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        item.status === 'IN_STOCK' ? 'bg-emerald-500' :
                        item.status === 'LOW_STOCK' ? 'bg-amber-500' :
                        'bg-rose-500 animate-pulse'
                      }`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        item.status === 'IN_STOCK' ? 'text-emerald-600' :
                        item.status === 'LOW_STOCK' ? 'text-amber-600' :
                        'text-rose-600'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Placeholder */}
        <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Showing 1-5 of 128 Items</p>
          <div className="flex items-center gap-2">
             <button className="px-4 py-2 bg-gray-100 rounded-xl text-[10px] font-black text-gray-500 hover:text-gray-900 transition-all uppercase tracking-widest shadow-sm">Prev</button>
             <button className="px-4 py-2 bg-blue-600 rounded-xl text-[10px] font-black text-white hover:bg-blue-500 transition-all uppercase tracking-widest shadow-md">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DentalInventory;
