import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Plus, 
  Search,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';
import { useUser } from '../../core/UserContext';

const SuppliersList = ({ suppliers, loading, onEdit, onDelete, onAdd, onViewHistory }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  const filteredSuppliers = (suppliers || []).filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && (!suppliers || suppliers.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-medium">{t('common.loading')}</p>
      </div>
    );
  }

  const topBarTarget = document.getElementById('warehouse-top-bar-portal-target');

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-lg overflow-hidden">
      {topBarTarget && createPortal(
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder={t('warehouse.searchSuppliers') || 'Поиск поставщиков...'} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:border-merkez-blue transition-colors" 
          />
        </div>,
        topBarTarget
      )}

      <div className="flex-1 overflow-auto">
        {filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <User className="w-12 h-12 text-gray-100" />
            <p className="font-medium">{t('warehouse.noSuppliersFound') || 'Поставщики не найдены'}</p>
          </div>
        ) : (
          <div className="p-6 overflow-x-auto">
            <table className="hidden md:table w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                  <th className="px-6 py-4.5 rounded-l-2xl">{t('warehouse.supplierName') || 'Поставщик'}</th>
                  <th className="px-6 py-4.5">{t('warehouse.contactPerson') || 'Контактное лицо'}</th>
                  <th className="px-6 py-4.5">{t('warehouse.supplierPhone') || 'Телефон'}</th>
                  <th className="px-6 py-4.5">{t('warehouse.supplierEmail') || 'Email'}</th>
                  <th className="px-6 py-4.5">{t('warehouse.supplierAddress') || 'Адрес'}</th>
                  <th className="px-6 py-4.5">{t('warehouse.addedDate') || 'Дата добавления'}</th>
                  <th className="px-6 py-4.5 text-right rounded-r-2xl">{t('common.actions') || 'Действия'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-merkez-blue/5 text-merkez-blue flex items-center justify-center font-black group-hover:bg-merkez-blue group-hover:text-white transition-all duration-300">
                          {supplier.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900 text-sm group-hover:text-merkez-blue transition-colors">{supplier.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-700">{supplier.contact_person || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {supplier.phone || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {supplier.email || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5 max-w-[200px] truncate" title={supplier.address}>
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {supplier.address || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-400">{new Date(supplier.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => onViewHistory(supplier.id)}
                          className="p-2 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-all"
                          title={t('warehouse.viewHistory') || 'Смотреть историю'}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onEdit(supplier)}
                          className="p-2 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-all"
                          title={t('common.edit') || 'Изменить'}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDelete(supplier.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title={t('common.delete') || 'Удалить'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Suppliers Cards Grid */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredSuppliers.map(supplier => (
                <div key={supplier.id} className="py-4 flex flex-col gap-2.5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-merkez-blue/5 text-merkez-blue flex items-center justify-center font-black">
                        {supplier.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{supplier.name}</p>
                        <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                          {supplier.contact_person || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => onViewHistory(supplier.id)}
                        className="p-1.5 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-all"
                        title={t('warehouse.viewHistory') || 'Смотреть историю'}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onEdit(supplier)}
                        className="p-1.5 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-all"
                        title={t('common.edit') || 'Изменить'}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(supplier.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title={t('common.delete') || 'Удалить'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50 mt-1">
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">{t('warehouse.supplierPhone') || 'Telefon'}</span>
                      <span className="text-xs font-bold text-gray-700 block truncate">{supplier.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">{t('warehouse.supplierEmail') || 'Email'}</span>
                      <span className="text-xs font-bold text-gray-700 block truncate">{supplier.email || '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">{t('warehouse.supplierAddress') || 'Адрес'}</span>
                      <span className="text-xs font-bold text-gray-700 block truncate">{supplier.address || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuppliersList;
