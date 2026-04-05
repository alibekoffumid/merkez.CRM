import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, UserPlus, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const getInitials = (name) => {
  return name ? name.split(' ').map(n => n[0]).join('') : '?';
};

const StaffManager = () => {
  const { t } = useTranslation();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    role: 'Waiter',
    shift: 'Morning',
    status: 'Active'
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name');
    
    if (data) setStaff(data);
    setLoading(false);
  };

  const handleAddStaff = async () => {
    if (!formData.name) return;
    const { error } = await supabase.from('staff').insert([formData]);
    if (!error) {
      setIsAddModalOpen(false);
      setFormData({ name: '', role: 'Waiter', shift: 'Morning', status: 'Active' });
      fetchStaff();
    }
  };

  const handleEditStaff = async () => {
    if (!editingStaff.name) return;
    const { error } = await supabase
      .from('staff')
      .update({
        name: editingStaff.name,
        role: editingStaff.role,
        shift: editingStaff.shift,
        status: editingStaff.status
      })
      .eq('id', editingStaff.id);
    
    if (!error) {
      setEditingStaff(null);
      fetchStaff();
    }
  };

  const handleDeleteStaff = async (id) => {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (!error) {
      setConfirmDeleteId(null);
      fetchStaff();
    }
  };

  const filteredStaff = staff.filter(person => 
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    person.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col relative">
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-50 border border-gray-100 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block w-full pl-10 p-2.5 transition-colors outline-none" 
            placeholder={t('restaurant.searchStaff')}
          />
        </div>
        
        <button 
           onClick={() => setIsAddModalOpen(true)}
           className="px-4 py-2 bg-merkez-yellow text-gray-900 rounded-lg text-sm font-bold hover:bg-yellow-500 flex items-center transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4 mr-2" /> {t('restaurant.addStaff')}
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto border border-gray-100 rounded-xl relative" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase text-gray-500 tracking-wider">
              <th className="font-semibold p-4">{t('restaurant.staffMember')}</th>
              <th className="font-semibold p-4">{t('restaurant.role')}</th>
              <th className="font-semibold p-4">{t('restaurant.shift')}</th>
              <th className="font-semibold p-4">{t('common.status')}</th>
              <th className="font-semibold p-4 text-right rounded-tr-xl">{t('restaurant.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-400">{t('restaurant.loadingPersonnel')}</td></tr>
            ) : filteredStaff.length > 0 ? (
              filteredStaff.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-700 flex items-center justify-center mr-3 text-xs font-bold border border-yellow-100">
                      {getInitials(person.name)}
                    </div>
                    {person.name}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{t('restaurant.' + person.role.toLowerCase().replace(' ', ''))}</td>
                  <td className="p-4 text-sm font-medium text-gray-700">{t('restaurant.' + person.shift.toLowerCase())}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      person.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {t('restaurant.' + person.status.toLowerCase().replace(' ', ''))}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setEditingStaff({...person})}
                      className="text-gray-400 hover:text-merkez-yellow p-1.5 transition-colors mr-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteId(person.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
                <tr>
                   <td colSpan="5" className="p-8 text-center text-gray-400 text-sm">
                     {t('restaurant.noPersonnel')}
                   </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4" onClick={() => setIsAddModalOpen(false)}>
          <div 
            className="bg-white rounded-none sm:rounded-2xl shadow-xl w-full max-w-md h-full sm:h-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{t('restaurant.addNewStaff')}</h3>
              <button 
                 onClick={() => setIsAddModalOpen(false)} 
                 className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-5 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('restaurant.fullName')}</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder={t('restaurant.staffPlaceholder')} 
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block p-2.5 outline-none transition-colors" 
                  />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('restaurant.role')}</label>
                     <select 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block p-2.5 outline-none transition-colors cursor-pointer"
                    >
                      <option value="Waiter">{t('restaurant.waiter')}</option>
                      <option value="Head Waiter">{t('restaurant.headwaiter')}</option>
                      <option value="Chef">{t('restaurant.chef')}</option>
                      <option value="Bartender">{t('restaurant.bartender')}</option>
                      <option value="Manager">{t('restaurant.manager')}</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('restaurant.shift')}</label>
                     <select 
                      value={formData.shift}
                      onChange={(e) => setFormData({...formData, shift: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block p-2.5 outline-none transition-colors cursor-pointer"
                    >
                      <option value="Morning">{t('restaurant.morning')}</option>
                      <option value="Evening">{t('restaurant.evening')}</option>
                      <option value="Night">{t('restaurant.night')}</option>
                      <option value="Flexible">{t('restaurant.flexible')}</option>
                    </select>
                 </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('common.status')}</label>
                   <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block p-2.5 outline-none transition-colors cursor-pointer"
                  >
                    <option value="Active">{t('restaurant.active')}</option>
                    <option value="On Leave">{t('restaurant.onleave')}</option>
                  </select>
               </div>
               
               <button 
                 onClick={handleAddStaff} 
                 className="w-full bg-merkez-yellow text-gray-900 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-yellow-500 transition-colors mt-2"
               >
                 {t('restaurant.saveStaff')}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4" onClick={() => setEditingStaff(null)}>
          <div 
            className="bg-white rounded-none sm:rounded-2xl shadow-xl w-full max-w-md h-full sm:h-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{t('restaurant.editStaff')}</h3>
              <button 
                 onClick={() => setEditingStaff(null)} 
                 className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-5 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('restaurant.fullName')}</label>
                  <input 
                    type="text" 
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block p-2.5 outline-none transition-colors" 
                  />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('restaurant.role')}</label>
                    <select 
                      value={editingStaff.role}
                      onChange={(e) => setEditingStaff({...editingStaff, role: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block p-2.5 outline-none transition-colors cursor-pointer"
                    >
                      <option value="Waiter">{t('restaurant.waiter')}</option>
                      <option value="Head Waiter">{t('restaurant.headwaiter')}</option>
                      <option value="Chef">{t('restaurant.chef')}</option>
                      <option value="Bartender">{t('restaurant.bartender')}</option>
                      <option value="Manager">{t('restaurant.manager')}</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('restaurant.shift')}</label>
                    <select 
                      value={editingStaff.shift}
                      onChange={(e) => setEditingStaff({...editingStaff, shift: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block p-2.5 outline-none transition-colors cursor-pointer"
                    >
                      <option value="Morning">{t('restaurant.morning')}</option>
                      <option value="Evening">{t('restaurant.evening')}</option>
                      <option value="Night">{t('restaurant.night')}</option>
                      <option value="Flexible">{t('restaurant.flexible')}</option>
                    </select>
                 </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('common.status')}</label>
                  <select 
                    value={editingStaff.status}
                    onChange={(e) => setEditingStaff({...editingStaff, status: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block p-2.5 outline-none transition-colors cursor-pointer"
                  >
                    <option value="Active">{t('restaurant.active')}</option>
                    <option value="On Leave">{t('restaurant.onleave')}</option>
                  </select>
               </div>
               
               <button 
                 onClick={handleEditStaff} 
                 className="w-full bg-merkez-yellow text-gray-900 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-yellow-500 transition-colors mt-2"
               >
                 {t('restaurant.saveChanges')}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('restaurant.removeStaff')}</h3>
            <p className="text-gray-500 text-sm mb-6">{t('restaurant.removeStaffConfirm')}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={() => handleDeleteStaff(confirmDeleteId)}
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

export default StaffManager;
