import React, { useState } from 'react';
import { Plus, Edit, Trash2, ShieldCheck, DoorOpen, X } from 'lucide-react';

const mockConfigs = [
  { id: 1, type: 'Table', name: 'T1', capacity: 2, hasDeposit: false, depositAmount: 0 },
  { id: 2, type: 'Table', name: 'T2', capacity: 4, hasDeposit: false, depositAmount: 0 },
  { id: 3, type: 'Table', name: 'T6', capacity: 8, hasDeposit: true, depositAmount: 50 },
  { id: 4, type: 'VIP Cabin', name: 'V1', capacity: 4, hasDeposit: true, depositAmount: 150 },
  { id: 5, type: 'VIP Cabin', name: 'V2', capacity: 8, hasDeposit: true, depositAmount: 300 },
];

const TableSettings = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTableType, setNewTableType] = useState('Table');
  const [hasDeposit, setHasDeposit] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[500px] relative">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-lg font-bold text-gray-900">Tables & Cabins configuration</h2>
           <p className="text-sm text-gray-500 mt-1">Manage physical spaces, seats, and their deposit rules.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-merkez-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Table / Cabin
        </button>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
              <th className="font-medium p-4">Type</th>
              <th className="font-medium p-4">Name/Number</th>
              <th className="font-medium p-4">Capacity</th>
              <th className="font-medium p-4">Deposit Required</th>
              <th className="font-medium p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mockConfigs.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4 font-medium text-gray-900 flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${item.type === 'VIP Cabin' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                    {item.type === 'VIP Cabin' ? <ShieldCheck className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />}
                  </div>
                  {item.type}
                </td>
                <td className="p-4 text-sm font-bold text-gray-900">{item.name}</td>
                <td className="p-4 text-sm text-gray-600">{item.capacity} Persons</td>
                <td className="p-4">
                  {item.hasDeposit ? (
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-merkez-green">
                       Yes (${item.depositAmount})
                     </span>
                  ) : (
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                       No
                     </span>
                  )}
                </td>
                <td className="p-4 text-right flex items-center justify-end gap-2">
                  <button className="text-gray-400 hover:text-merkez-blue transition-colors p-1.5 rounded-md hover:bg-blue-50">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-gray-400 hover:text-merkez-red transition-colors p-1.5 rounded-md hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add New Layout Entity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Add New Place/Zone</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-1 rounded-md border border-gray-200 shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              
              <div className="space-y-1">
                 <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Type</label>
                 <select 
                   className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all"
                   value={newTableType}
                   onChange={(e) => setNewTableType(e.target.value)}
                 >
                    <option>Table</option>
                    <option>VIP Cabin</option>
                    <option>Bar Stool</option>
                 </select>
              </div>

              <div className="flex gap-4">
                 <div className="space-y-1 flex-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Name / ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. T7 or V3"
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all"
                    />
                 </div>
                 <div className="space-y-1 w-32">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Capacity</label>
                    <input 
                      type="number" 
                      defaultValue={4}
                      min={1}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all"
                    />
                 </div>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-4 shadow-sm">
                 <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="hasDeposit" 
                      className="w-4 h-4 text-merkez-blue rounded border-gray-300 focus:ring-merkez-blue cursor-pointer"
                      checked={hasDeposit}
                      onChange={(e) => setHasDeposit(e.target.checked)}
                    />
                    <label htmlFor="hasDeposit" className="ml-2 text-sm font-medium text-gray-900 cursor-pointer">
                      Requires Deposit? (Usually for VIPs)
                    </label>
                 </div>

                 {hasDeposit && (
                   <div className="space-y-1 pt-2 border-t border-gray-200/50">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Minimum Deposit Amount ($)</label>
                      <input 
                        type="number" 
                        placeholder="100"
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all"
                      />
                   </div>
                 )}
              </div>

              <button className="w-full bg-merkez-blue text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors shadow-sm mt-2">
                 Create Place
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TableSettings;
