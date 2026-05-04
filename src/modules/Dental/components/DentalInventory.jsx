import React, { useState, useEffect } from 'react';
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
  Box,
  Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DentalService } from '../../../services/DentalService';
import { supabase } from '../../../supabaseClient';
import Dropdown from '../../../components/Common/Dropdown';

const DentalInventory = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'General',
    quantity: 0,
    unit: 'pcs',
    min_quantity: 10
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [search]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await DentalService.getInventory(search);
      setInventory(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('dental_inventory')
        .insert([newItem]);
      
      if (error) throw error;
      
      setShowAddModal(false);
      setNewItem({ name: '', category: 'General', quantity: 0, unit: 'pcs', min_quantity: 10 });
      fetchInventory();
    } catch (err) {
      console.error('Error adding item:', err);
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateStatus = (item) => {
    if (item.quantity <= item.min_quantity / 2) return 'CRITICAL';
    if (item.quantity <= item.min_quantity) return 'LOW_STOCK';
    return 'IN_STOCK';
  };

  const stats = [
    { label: t('dental.totalItems'), value: inventory.length.toString(), icon: Box, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('dental.lowStockAlerts'), value: inventory.filter(i => i.quantity <= i.min_quantity).length.toString(), icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('dental.consumed'), value: '0', icon: ArrowDownRight, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: t('dental.restocked'), value: '0', icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-8 relative">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
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
                placeholder={t('dental.searchInventory')} 
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
              {t('dental.transactionLog')}
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 uppercase tracking-widest active:scale-95"
            >
              <Plus className="w-5 h-5" />
              {t('dental.addItem')}
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
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('dental.quantity')}</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('common.status')}</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-10 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : inventory.length > 0 ? (
                inventory.map((item) => {
                  const status = calculateStatus(item);
                  return (
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
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mt-1">{t('dental.minThreshold')}: {item.min_quantity}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            status === 'IN_STOCK' ? 'bg-emerald-500' :
                            status === 'LOW_STOCK' ? 'bg-amber-500' :
                            'bg-rose-500 animate-pulse'
                          }`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            status === 'IN_STOCK' ? 'text-emerald-600' :
                            status === 'LOW_STOCK' ? 'text-amber-600' :
                            'text-rose-600'
                          }`}>
                            {status === 'IN_STOCK' ? t('dental.inStock') : status === 'LOW_STOCK' ? t('dental.lowStock') : t('dental.critical')}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="px-8 py-10 text-center text-gray-500 text-sm font-bold">
                    No items found.
                  </td>
                </tr>
              )}
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

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{t('dental.addItem')}</h3>
                <p className="text-gray-500 text-sm font-medium mt-1 uppercase tracking-widest">{t('dental.inventoryManagement')}</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('dental.itemName')}</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="e.g. Disposable Gloves"
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('common.category')}</label>
                    <Dropdown 
                      value={newItem.category}
                      onChange={(val) => setNewItem({...newItem, category: val})}
                      options={[
                        { value: 'General', label: 'General' },
                        { value: 'Restorative', label: 'Restorative' },
                        { value: 'Instruments', label: 'Instruments' },
                        { value: 'Hygiene', label: 'Hygiene' },
                        { value: 'Prosthetic', label: 'Prosthetic' }
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('dental.quantity')}</label>
                    <input 
                      required
                      type="number" 
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="0"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('dental.unit')}</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="pcs, kg, etc."
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('dental.minThreshold')}</label>
                    <input 
                      required
                      type="number" 
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="10"
                      value={newItem.min_quantity}
                      onChange={(e) => setNewItem({...newItem, min_quantity: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  {t('dental.cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('common.save') || 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DentalInventory;
