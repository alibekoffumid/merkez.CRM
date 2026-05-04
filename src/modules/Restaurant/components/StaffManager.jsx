import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, UserPlus, Edit2, Trash2, X, Lock, Clock, Calendar } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import PatternLock from '../../../components/PatternLock/PatternLock';
import TimePicker from '../../../components/Common/TimePicker';
import Dropdown from '../../../components/Common/Dropdown';

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
    status: 'Active',
    salary_amount: 0,
    shift_start_time: '09:00',
    pin_pattern: ''
  });

  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'attendance'
  const [attendance, setAttendance] = useState([]);
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [tempPattern, setTempPattern] = useState('');

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
    if (activeTab === 'attendance') fetchAttendance();
  };

  const fetchAttendance = async () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    
    const { data } = await supabase
      .from('attendance_logs')
      .select('*, staff(name, role)')
      .gte('date', firstDay.split('T')[0])
      .order('date', { ascending: false });
    
    if (data) setAttendance(data);
  };

  const handleAddStaff = async () => {
    if (!formData.name) return;
    setLoading(true);
    const { error } = await supabase.from('staff').insert([{
      ...formData,
      user_id: (await supabase.auth.getUser()).data.user?.id
    }]);
    
    if (error) {
      alert("Error adding staff: " + error.message);
      setLoading(false);
    } else {
      setIsAddModalOpen(false);
      setFormData({ 
        name: '', 
        role: 'Waiter', 
        shift: 'Morning', 
        status: 'Active',
        salary_amount: 0,
        shift_start_time: '09:00',
        pin_pattern: ''
      });
      setLoading(false);
      fetchStaff();
    }
  };

  const handleEditStaff = async () => {
    if (!editingStaff.name) {
      console.error("Cannot edit staff: name is empty", editingStaff);
      return;
    }
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('staff')
      .update({
        name: editingStaff.name,
        role: editingStaff.role,
        shift: editingStaff.shift,
        status: editingStaff.status,
        salary_amount: editingStaff.salary_amount,
        shift_start_time: editingStaff.shift_start_time,
        pin_pattern: editingStaff.pin_pattern,
        user_id: user?.id // Explicitly set user_id to ensure RLS compliance
      })
      .eq('id', editingStaff.id);
    
    if (error) {
      console.error("Error updating staff:", error);
      alert("Error updating staff: " + error.message);
      setLoading(false);
    } else {
      setEditingStaff(null);
      setLoading(false);
      fetchStaff();
    }
  };

  const handlePaySalary = async (person) => {
    const amount = person.salary_amount || 0;
    if (amount <= 0) {
      window.alert('Please set a salary amount for this staff member first.');
      return;
    }

    if (!window.confirm(`Confirm salary payment of $${amount} to ${person.name}?`)) return;

    const { error } = await supabase.from('staff_payments').insert([{
      staff_id: person.id,
      amount: amount,
      payment_date: new Date().toISOString().split('T')[0]
    }]);

    if (error) {
      window.alert('Error processing payment: ' + error.message);
    } else {
      window.alert(`Payment of $${amount} for ${person.name} recorded successfully.`);
    }
  };

  const handleDeleteStaff = async (id) => {
    setLoading(true);
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) {
      alert("Error deleting staff: " + error.message);
      setLoading(false);
    } else {
      setConfirmDeleteId(null);
      setLoading(false);
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

      <div className="flex gap-4 mb-4 border-b border-gray-100">
        <button 
          onClick={() => { setActiveTab('list'); fetchStaff(); }}
          className={`pb-2 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'list' ? 'border-merkez-yellow text-gray-900' : 'border-transparent text-gray-400'}`}
        >
          {t('restaurant.staff')}
        </button>
        <button 
          onClick={() => { setActiveTab('attendance'); fetchAttendance(); }}
          className={`pb-2 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'attendance' ? 'border-merkez-yellow text-gray-900' : 'border-transparent text-gray-400'}`}
        >
          {t('restaurant.attendance')}
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto border border-gray-100 rounded-xl relative" style={{ maxHeight: 'calc(100vh - 350px)' }}>
        {activeTab === 'list' ? (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase text-gray-500 tracking-wider">
              <th className="font-semibold p-4">{t('restaurant.staffMember')}</th>
              <th className="font-semibold p-4">{t('restaurant.role')}</th>
              <th className="font-semibold p-4">{t('restaurant.shift')}</th>
              <th className="font-semibold p-4">{t('restaurant.salary')}</th>
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
                  <td className="p-4 text-sm font-bold text-gray-900">${(person.salary_amount || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      person.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {t('restaurant.' + person.status.toLowerCase().replace(' ', ''))}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handlePaySalary(person)}
                      className="text-merkez-blue hover:text-blue-700 p-1.5 transition-colors mr-1 font-bold text-[10px] uppercase border border-blue-100 rounded bg-blue-50"
                    >
                      {t('restaurant.checkout')}
                    </button>
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
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase text-gray-500 tracking-wider">
                <th className="font-semibold p-4">{t('common.name')}</th>
                <th className="font-semibold p-4">{t('common.status')}</th>
                <th className="font-semibold p-4">{t('restaurant.time')}</th>
                <th className="font-semibold p-4">{t('restaurant.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {attendance.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-gray-400">{t('restaurant.noData')}</td></tr>
              ) : attendance.map(log => (
                <tr key={log.id}>
                  <td className="p-4 font-bold text-gray-900">{log.staff?.name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${log.is_late ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      {log.is_late ? t('restaurant.late') : t('restaurant.ontime')}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs">{new Date(log.clock_in_time).toLocaleTimeString()}</td>
                  <td className="p-4 text-xs text-gray-500">{log.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setIsAddModalOpen(false)}
          />
          <div 
            className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-md h-full sm:h-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10"
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
                    <Dropdown 
                      value={formData.role}
                      onChange={(val) => setFormData({...formData, role: val})}
                      options={[
                        { value: 'Waiter', label: t('restaurant.waiter') },
                        { value: 'Head Waiter', label: t('restaurant.headwaiter') },
                        { value: 'Chef', label: t('restaurant.chef') },
                        { value: 'Bartender', label: t('restaurant.bartender') },
                        { value: 'Manager', label: t('restaurant.manager') }
                      ]}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('restaurant.shift')}</label>
                    <Dropdown 
                      value={formData.shift}
                      onChange={(val) => setFormData({...formData, shift: val})}
                      options={[
                        { value: 'Morning', label: t('restaurant.morning') },
                        { value: 'Evening', label: t('restaurant.evening') },
                        { value: 'Night', label: t('restaurant.night') },
                        { value: 'Flexible', label: t('restaurant.flexible') }
                      ]}
                    />
                 </div>
               </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('restaurant.salary')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input 
                      type="number" 
                      value={formData.salary_amount}
                      onChange={(e) => setFormData({...formData, salary_amount: parseFloat(e.target.value) || 0})}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block pl-8 p-2.5 outline-none transition-colors" 
                    />
                  </div>
               </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('common.status')}</label>
                  <Dropdown 
                    value={formData.status}
                    onChange={(val) => setFormData({...formData, status: val})}
                    options={[
                      { value: 'Active', label: t('restaurant.active') },
                      { value: 'On Leave', label: t('restaurant.onleave') }
                    ]}
                  />
               </div>

                <div className="pt-4 border-t border-gray-100 mt-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('restaurant.securityAttendance')}</label>
                    <div className="flex gap-4">
                        <div className="flex-1">
                             <TimePicker 
                                 label={t('restaurant.shiftStartTime')}
                                 value={formData.shift_start_time || '09:00'}
                                 onChange={(val) => setFormData({...formData, shift_start_time: val})}
                             />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] text-gray-400 uppercase mb-1">{t('restaurant.patternPassword')}</label>
                            <button 
                                onClick={() => setIsPatternModalOpen(true)}
                                className={`w-full py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${formData.pin_pattern ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-merkez-blue/10 text-merkez-blue border border-blue-100'}`}
                            >
                                <Lock className="w-3 h-3" />
                                {formData.pin_pattern ? t('restaurant.changePattern') : t('restaurant.setPattern')}
                            </button>
                        </div>
                    </div>
                </div>
               
               <button 
                 onClick={handleAddStaff} 
                 className="w-full bg-merkez-yellow text-gray-900 py-3 rounded-lg text-sm font-bold shadow-md hover:bg-yellow-500 transition-colors mt-2"
               >
                 {t('restaurant.saveStaff')}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setEditingStaff(null)}
          />
          <div 
            className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-md h-full sm:h-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10"
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
                    <Dropdown 
                      value={editingStaff.role}
                      onChange={(val) => setEditingStaff({...editingStaff, role: val})}
                      options={[
                        { value: 'Waiter', label: t('restaurant.waiter') },
                        { value: 'Head Waiter', label: t('restaurant.headwaiter') },
                        { value: 'Chef', label: t('restaurant.chef') },
                        { value: 'Bartender', label: t('restaurant.bartender') },
                        { value: 'Manager', label: t('restaurant.manager') }
                      ]}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('restaurant.shift')}</label>
                    <Dropdown 
                      value={editingStaff.shift}
                      onChange={(val) => setEditingStaff({...editingStaff, shift: val})}
                      options={[
                        { value: 'Morning', label: t('restaurant.morning') },
                        { value: 'Evening', label: t('restaurant.evening') },
                        { value: 'Night', label: t('restaurant.night') },
                        { value: 'Flexible', label: t('restaurant.flexible') }
                      ]}
                    />
                 </div>
               </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('restaurant.salary')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input 
                      type="number" 
                      value={editingStaff.salary_amount}
                      onChange={(e) => setEditingStaff({...editingStaff, salary_amount: parseFloat(e.target.value) || 0})}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block pl-8 p-2.5 outline-none transition-colors" 
                    />
                  </div>
               </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('common.status')}</label>
                  <Dropdown 
                    value={editingStaff.status}
                    onChange={(val) => setEditingStaff({...editingStaff, status: val})}
                    options={[
                      { value: 'Active', label: t('restaurant.active') },
                      { value: 'On Leave', label: t('restaurant.onleave') }
                    ]}
                  />
               </div>

                <div className="pt-4 border-t border-gray-100 mt-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('restaurant.securityAttendance')}</label>
                    <div className="flex gap-4">
                        <div className="flex-1">
                             <TimePicker 
                                 label={t('restaurant.shiftStartTime')}
                                 value={editingStaff.shift_start_time || '09:00'}
                                 onChange={(val) => setEditingStaff({...editingStaff, shift_start_time: val})}
                             />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] text-gray-400 uppercase mb-1">{t('restaurant.patternPassword')}</label>
                            <button 
                                onClick={() => setIsPatternModalOpen(true)}
                                className={`w-full py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${editingStaff.pin_pattern ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-merkez-blue/10 text-merkez-blue border border-blue-100'}`}
                            >
                                <Lock className="w-3 h-3" />
                                {editingStaff.pin_pattern ? t('restaurant.changePattern') : t('restaurant.setPattern')}
                            </button>
                        </div>
                    </div>
                </div>
               
               <button 
                 onClick={handleEditStaff} 
                 className="w-full bg-merkez-yellow text-gray-900 py-3 rounded-lg text-sm font-bold shadow-md hover:bg-yellow-500 transition-colors mt-2"
               >
                 {t('restaurant.saveChanges')}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Pattern Set Modal */}
      {isPatternModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] p-8 w-full max-w-sm flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 text-merkez-blue rounded-2xl flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">{t('restaurant.setStaffPattern')}</h3>
                <p className="text-gray-500 text-sm text-center mb-8">{t('restaurant.drawPatternInstructions')}</p>
                
                <PatternLock 
                    onComplete={(p) => {
                        if (editingStaff) {
                            setEditingStaff({...editingStaff, pin_pattern: p});
                        } else {
                            setFormData({...formData, pin_pattern: p});
                        }
                        setTimeout(() => setIsPatternModalOpen(false), 500);
                    }}
                />

                <button 
                    onClick={() => setIsPatternModalOpen(false)}
                    className="mt-8 text-gray-400 text-sm font-bold hover:text-gray-600"
                >
                    {t('common.cancel')}
                </button>
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
