import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, MoreVertical, Mail, Phone } from 'lucide-react';

const mockClients = [
  { id: 1, name: 'Google LLC', contact: 'Sundar Pichai', email: 'contact@google.com', phone: '+1 650-253-0000', status: 'Active' },
  { id: 2, name: 'Acme Corp', contact: 'John Doe', email: 'john@acme.com', phone: '+1 555-0198', status: 'Lead' },
  { id: 3, name: 'Global Tech', contact: 'Jane Smith', email: 'jane@globaltech.io', phone: '+44 20 7123 4567', status: 'Active' },
  { id: 4, name: 'StartUp Inc', contact: 'Mike Johnson', email: 'mike@startup.co', phone: '+1 415-555-2671', status: 'Inactive' },
  { id: 5, name: 'Local Bank', contact: 'Sarah Williams', email: 'sarah@localbank.com', phone: '+1 212-555-0192', status: 'Active' },
];

const CRMModule = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-merkez-green';
      case 'lead': return 'bg-blue-100 text-merkez-blue';
      case 'inactive': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch(status.toLowerCase()) {
      case 'active': return t('crm.active');
      case 'lead': return t('crm.lead');
      case 'inactive': return t('crm.inactive');
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('sidebar.crm')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('crm.subtitle')}</p>
        </div>
        <button className="bg-merkez-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          {t('crm.addClient')}
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder={t('crm.searchClients')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select className="bg-gray-50 border border-gray-100 text-gray-700 text-sm rounded-lg px-3 py-2 w-full sm:w-auto focus:outline-none focus:border-merkez-blue">
            <option>{t('crm.allStatuses')}</option>
            <option>{t('crm.active')}</option>
            <option>{t('crm.lead')}</option>
            <option>{t('crm.inactive')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                <th className="font-medium p-4">{t('crm.company')}</th>
                <th className="font-medium p-4">{t('crm.contact')}</th>
                <th className="font-medium p-4">{t('crm.contactInfo')}</th>
                <th className="font-medium p-4">{t('common.status')}</th>
                <th className="font-medium p-4 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 overflow-hidden">
              {mockClients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{client.name}</div>
                  </td>
                  <td className="p-4 text-gray-600 text-sm">{client.contact}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-xs text-gray-500">
                        <Mail className="w-3 h-3 mr-1.5" /> {client.email}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Phone className="w-3 h-3 mr-1.5" /> {client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                      {getStatusText(client.status)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-gray-400 hover:text-merkez-blue transition-colors p-1 rounded-md hover:bg-blue-50">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination placeholder */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>{t('crm.showing')}</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded text-gray-400 cursor-not-allowed">{t('common.prev')}</button>
            <button className="px-3 py-1 bg-merkez-blue text-white rounded">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded text-gray-400 cursor-not-allowed">{t('common.next')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMModule;
