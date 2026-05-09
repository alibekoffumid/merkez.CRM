import React, { useState, useEffect } from 'react';
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

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder={t('warehouse.searchSuppliers') || 'Поиск поставщиков...'} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:border-merkez-blue transition-colors" 
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <User className="w-12 h-12 text-gray-100" />
            <p className="font-medium">{t('warehouse.noSuppliersFound') || 'Поставщики не найдены'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredSuppliers.map(supplier => (
              <div key={supplier.id} className="bg-white border border-gray-100 rounded-[2rem] p-7 hover:shadow-2xl hover:shadow-gray-200/50 transition-all group relative border-b-4 border-b-transparent hover:border-b-merkez-blue">
                <div className="absolute right-6 top-7">
                  <button 
                    onClick={() => setOpenMenuId(openMenuId === supplier.id ? null : supplier.id)}
                    className="p-1.5 text-gray-400 hover:text-merkez-blue hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {openMenuId === supplier.id && (
                    <div className="absolute right-0 top-9 z-10 bg-white border border-gray-100 rounded-xl shadow-xl w-40 py-1.5 animate-in fade-in zoom-in-95">
                      <button 
                        onClick={() => { onEdit(supplier); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-merkez-blue" />
                        {t('common.edit')}
                      </button>
                      <button 
                        onClick={() => { onDelete(supplier.id); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('common.delete')}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-5 mb-6">
                  <div className="w-14 h-14 rounded-[1.25rem] bg-merkez-blue/5 flex items-center justify-center text-merkez-blue group-hover:bg-merkez-blue group-hover:text-white transition-all duration-300">
                    <User className="w-7 h-7" />
                  </div>
                  <div className="flex-1 pr-10">
                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-merkez-blue transition-colors leading-tight break-words">{supplier.name}</h3>
                    <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">{supplier.contact_person || t('warehouse.noContactPerson') || 'Контактное лицо не указано'}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-gray-100/50">
                  <div className="flex items-center gap-4 text-sm text-gray-600 group/item">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 group-hover/item:bg-blue-50 transition-colors">
                      <Phone className="w-4 h-4 text-gray-400 group-hover/item:text-merkez-blue" />
                    </div>
                    <span className="font-bold text-gray-700">{supplier.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 group/item">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 group-hover/item:bg-blue-50 transition-colors">
                      <Mail className="w-4 h-4 text-gray-400 group-hover/item:text-merkez-blue" />
                    </div>
                    <span className="font-bold text-gray-700 truncate">{supplier.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 group/item">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 group-hover/item:bg-blue-50 transition-colors">
                      <MapPin className="w-4 h-4 text-gray-400 group-hover/item:text-merkez-blue" />
                    </div>
                    <span className="font-bold text-gray-700 truncate">{supplier.address || '—'}</span>
                  </div>
                </div>

                <div className="mt-7 pt-6 border-t border-gray-100/50 flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">
                    {t('warehouse.addedDate') || 'Добавлен'}: {new Date(supplier.created_at).toLocaleDateString()}
                  </span>
                  <button 
                    onClick={() => onViewHistory(supplier.id)}
                    className="bg-blue-50 text-merkez-blue px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-merkez-blue hover:text-white transition-all"
                  >
                    {t('warehouse.viewHistory') || 'История'} <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuppliersList;
