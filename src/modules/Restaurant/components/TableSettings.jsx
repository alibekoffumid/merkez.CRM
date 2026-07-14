import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, ShieldCheck, DoorOpen, X, CreditCard } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import Dropdown from '../../../components/Common/Dropdown';

const TableSettings = () => {
  const { t } = useTranslation();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    number: '',
    capacity: 4,
    type: 'Table',
    has_deposit: false,
    deposit_amount: 0
  });

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .order('number');
    
    if (data) setTables(data);
    setLoading(false);
  };

  const handleAddTable = async () => {
    if (!formData.number) return;
    const { error } = await supabase.from('restaurant_tables').insert([formData]);
    if (!error) {
      setIsModalOpen(false);
      setFormData({ number: '', capacity: 4, type: 'Table', has_deposit: false, deposit_amount: 0 });
      fetchTables();
    }
  };

  const handleEditTable = async () => {
    if (!editingTable.number) return;
    const { error } = await supabase
      .from('restaurant_tables')
      .update({
        number: editingTable.number,
        capacity: editingTable.capacity,
        type: editingTable.type,
        has_deposit: editingTable.has_deposit,
        deposit_amount: editingTable.deposit_amount
      })
      .eq('id', editingTable.id);
    
    if (!error) {
      setEditingTable(null);
      fetchTables();
    }
  };

  const handleDeleteTable = async (id) => {
    const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
    if (!error) {
      setConfirmDeleteId(null);
      fetchTables();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-lg font-bold text-gray-900">{t('restaurant.tableConfig')}</h2>
           <p className="text-sm text-gray-500 mt-1">{t('restaurant.tableConfigDesc')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-merkez-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('restaurant.addTable')}
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
              <th className="font-medium p-4">{t('restaurant.type')}</th>
              <th className="font-medium p-4">{t('restaurant.nameNumber')}</th>
              <th className="font-medium p-4">{t('restaurant.capacity')}</th>
              <th className="font-medium p-4">{t('restaurant.depositRequired')}</th>
              <th className="font-medium p-4 text-right">{t('restaurant.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-400">{t('common.loading')}</td></tr>
            ) : tables.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4 font-medium text-gray-900 flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${item.type === 'VIP Cabin' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                    {item.type === 'VIP Cabin' ? <ShieldCheck className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />}
                  </div>
                  {item.type || 'Table'}
                </td>
                <td className="p-4 text-sm font-bold text-gray-900">{item.number}</td>
                <td className="p-4 text-sm text-gray-600">{item.capacity} {t('restaurant.persons')}</td>
                <td className="p-4">
                  {item.has_deposit ? (
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                       {t('common.yes')} (${item.deposit_amount})
                     </span>
                  ) : (
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                       {t('common.no')}
                     </span>
                  )}
                </td>
                <td className="p-4 text-right flex items-center justify-end gap-2">
                  <button 
                    onClick={() => setEditingTable({...item})}
                    className="text-gray-400 hover:text-merkez-blue transition-colors p-1.5 rounded-md hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteId(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4">
          <div 
            className="absolute -inset-10 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setIsModalOpen(false)}
          />
          <div 
            className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full max-w-md h-full sm:h-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{t('restaurant.addPlace')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-1 rounded-md border border-gray-200 shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-1">
                 <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('restaurant.type')}</label>
                  <Dropdown 
                    value={formData.type}
                    onChange={(val) => setFormData({...formData, type: val})}
                    options={[
                      { value: 'Table', label: t('restaurant.table') },
                      { value: 'VIP Cabin', label: t('restaurant.vipCabin') },
                      { value: 'Bar Stool', label: t('restaurant.barStool') }
                    ]}
                  />
              </div>
              <div className="flex gap-4">
                 <div className="space-y-1 flex-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('restaurant.nameNumber')}</label>
                    <input 
                      type="text" 
                      value={formData.number}
                      onChange={(e) => setFormData({...formData, number: e.target.value})}
                      placeholder={t('restaurant.tablePlaceholder')}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all"
                    />
                 </div>
                 <div className="space-y-1 w-32">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('restaurant.capacity')}</label>
                    <input 
                      type="number" 
                      value={formData.capacity}
                      onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                      min={1}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all"
                    />
                 </div>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg space-y-4 shadow-sm">
                 <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="hasDepositAdd" 
                      className="w-4 h-4 text-merkez-blue rounded border-gray-300 focus:ring-merkez-blue cursor-pointer"
                      checked={formData.has_deposit}
                      onChange={(e) => setFormData({...formData, has_deposit: e.target.checked})}
                    />
                    <label htmlFor="hasDepositAdd" className="ml-2 text-sm font-medium text-gray-900 cursor-pointer">
                      {t('restaurant.requiresDeposit')}
                    </label>
                 </div>
                 {formData.has_deposit && (
                   <div className="space-y-1 pt-2 border-t border-gray-200/50">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">{t('restaurant.amount')}</label>
                      <input 
                        type="number" 
                        value={formData.deposit_amount}
                        onChange={(e) => setFormData({...formData, deposit_amount: parseFloat(e.target.value)})}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all"
                      />
                   </div>
                 )}
              </div>
              <button 
                onClick={handleAddTable}
                className="w-full bg-merkez-blue text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors shadow-sm mt-2"
              >
                 {t('restaurant.createPlace')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {editingTable && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4">
          <div 
            className="absolute -inset-10 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setEditingTable(null)}
          />
          <div 
            className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full max-w-md h-full sm:h-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{t('restaurant.editPlace')}</h3>
              <button onClick={() => setEditingTable(null)} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-1 rounded-md border border-gray-200 shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-1">
                 <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('restaurant.type')}</label>
                  <Dropdown 
                    value={editingTable.type}
                    onChange={(val) => setEditingTable({...editingTable, type: val})}
                    options={[
                      { value: 'Table', label: t('restaurant.table') },
                      { value: 'VIP Cabin', label: t('restaurant.vipCabin') },
                      { value: 'Bar Stool', label: t('restaurant.barStool') }
                    ]}
                  />
              </div>
              <div className="flex gap-4">
                 <div className="space-y-1 flex-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('restaurant.nameNumber')}</label>
                    <input 
                      type="text" 
                      value={editingTable.number}
                      onChange={(e) => setEditingTable({...editingTable, number: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all"
                    />
                 </div>
                 <div className="space-y-1 w-32">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('restaurant.capacity')}</label>
                    <input 
                      type="number" 
                      value={editingTable.capacity}
                      onChange={(e) => setEditingTable({...editingTable, capacity: parseInt(e.target.value)})}
                      min={1}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all"
                    />
                 </div>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg space-y-4 shadow-sm">
                 <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="hasDepositEdit" 
                      className="w-4 h-4 text-merkez-blue rounded border-gray-300 focus:ring-merkez-blue cursor-pointer"
                      checked={editingTable.has_deposit}
                      onChange={(e) => setEditingTable({...editingTable, has_deposit: e.target.checked})}
                    />
                    <label htmlFor="hasDepositEdit" className="ml-2 text-sm font-medium text-gray-900 cursor-pointer">
                      {t('restaurant.requiresDeposit')}
                    </label>
                 </div>
                 {editingTable.has_deposit && (
                   <div className="space-y-1 pt-2 border-t border-gray-200/50">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">{t('restaurant.amount')}</label>
                      <input 
                        type="number" 
                        value={editingTable.deposit_amount}
                        onChange={(e) => setEditingTable({...editingTable, deposit_amount: parseFloat(e.target.value)})}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all"
                      />
                   </div>
                 )}
              </div>
              <button 
                onClick={handleEditTable}
                className="w-full bg-merkez-blue text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors shadow-sm mt-2"
              >
                 {t('common.saveChanges')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('restaurant.deletePlace')}</h3>
            <p className="text-gray-500 text-sm mb-6">{t('restaurant.deletePlaceConfirm')}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={() => handleDeleteTable(confirmDeleteId)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors shadow-sm"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TableSettings;
