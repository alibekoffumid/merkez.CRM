import React, { useState } from 'react';
import { Search, UserPlus, Edit2, Trash2, X } from 'lucide-react';

const mockStaff = [
  { id: 1, name: 'Alice Walker', role: 'Head Waiter', shift: 'Morning', status: 'Active' },
  { id: 2, name: 'Bob Harris', role: 'Waiter', shift: 'Morning', status: 'Active' },
  { id: 3, name: 'Charlie Dean', role: 'Chef', shift: 'Evening', status: 'Active' },
  { id: 4, name: 'Diana King', role: 'Waiter', shift: 'Evening', status: 'On Leave' },
  { id: 5, name: 'Evan Cole', role: 'Bartender', shift: 'Morning', status: 'Active' },
];

const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('');
};

const StaffManager = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Apply Search Filter
  const filteredStaff = mockStaff.filter(person => 
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    person.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full overflow-hidden">
      
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
            placeholder="Search staff by name or role..."
          />
        </div>
        
        <button 
           onClick={() => setIsAddModalOpen(true)}
           className="px-4 py-2 bg-merkez-yellow text-gray-900 rounded-lg text-sm font-bold hover:bg-yellow-500 flex items-center transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Add Staff Member
        </button>
      </div>

      <div className="overflow-auto flex-1 border border-gray-100 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase text-gray-500 tracking-wider">
              <th className="font-semibold p-4">Staff Member</th>
              <th className="font-semibold p-4">Role</th>
              <th className="font-semibold p-4">Current Shift</th>
              <th className="font-semibold p-4">Status</th>
              <th className="font-semibold p-4 text-right rounded-tr-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredStaff.length > 0 ? (
              filteredStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-700 flex items-center justify-center mr-3 text-xs font-bold border border-yellow-100">
                      {getInitials(staff.name)}
                    </div>
                    {staff.name}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{staff.role}</td>
                  <td className="p-4 text-sm font-medium text-gray-700">{staff.shift}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      staff.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {staff.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-gray-400 hover:text-merkez-yellow p-1.5 transition-colors mr-1">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-500 p-1.5 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
                <tr>
                   <td colSpan="5" className="p-8 text-center text-gray-400 text-sm">
                     No personnel found matching your search.
                   </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Add New Staff Member</h3>
              <button 
                 onClick={() => setIsAddModalOpen(false)} 
                 className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-5 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Full Name</label>
                  <input type="text" placeholder="e.g. John Doe" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block p-2.5 outline-none transition-colors" />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Role</label>
                    <select className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block p-2.5 outline-none transition-colors cursor-pointer">
                      <option>Waiter</option>
                      <option>Head Waiter</option>
                      <option>Chef</option>
                      <option>Bartender</option>
                      <option>Manager</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Shift</label>
                    <select className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block p-2.5 outline-none transition-colors cursor-pointer">
                      <option>Morning</option>
                      <option>Evening</option>
                      <option>Night</option>
                      <option>Flexible</option>
                    </select>
                 </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Status</label>
                  <select className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-yellow focus:border-merkez-yellow block p-2.5 outline-none transition-colors cursor-pointer">
                    <option>Active</option>
                    <option>On Leave</option>
                  </select>
               </div>
               
               <button 
                 onClick={() => setIsAddModalOpen(false)} 
                 className="w-full bg-merkez-yellow text-gray-900 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-yellow-500 transition-colors mt-2"
               >
                 Save Staff Member
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffManager;
