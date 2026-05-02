import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, MoreVertical, Mail, Phone, Loader2, UserPlus, Filter } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const CRMModule = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    switch(status.toLowerCase()) {
      case 'active': 
      case 'активный': return 'bg-emerald-100 text-emerald-700';
      case 'lead': 
      case 'лид': return 'bg-blue-100 text-merkez-blue';
      case 'inactive': 
      case 'неактивный': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('sidebar.crm')}</h1>
          <p className="text-gray-500 mt-1 font-medium">{t('crm.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center shadow-lg shadow-gray-900/20 active:scale-95"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('crm.addClient')}
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder={t('crm.searchClients')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-900/5 transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-2xl border border-transparent w-full lg:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select className="bg-transparent text-gray-900 text-sm font-bold focus:outline-none cursor-pointer w-full">
              <option>{t('crm.allStatuses')}</option>
              <option>{t('crm.active')}</option>
              <option>{t('crm.lead')}</option>
              <option>{t('crm.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="font-bold uppercase tracking-widest text-xs">{t('common.loading') || 'Загрузка...'}</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12">
            <UserPlus className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-black text-lg text-gray-300">{t('crm.noClients') || 'Клиенты не найдены'}</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-4 text-merkez-blue font-bold hover:underline"
            >
              {t('crm.addFirstClient') || 'Добавить первого клиента'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
                  <th className="p-6">{t('crm.company')}</th>
                  <th className="p-6">{t('crm.contactInfo')}</th>
                  <th className="p-6">{t('crm.type') || 'Тип'}</th>
                  <th className="p-6">{t('common.status')}</th>
                  <th className="p-6 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-6">
                      <div className="font-black text-gray-900 text-lg">{client.name}</div>
                      <div className="text-xs font-bold text-gray-400 mt-0.5">{client.address || 'Нет адреса'}</div>
                    </td>
                    <td className="p-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center text-sm font-bold text-gray-600">
                          <Mail className="w-4 h-4 mr-2 text-gray-300" /> {client.email || '—'}
                        </div>
                        <div className="flex items-center text-sm font-bold text-gray-600">
                          <Phone className="w-4 h-4 mr-2 text-gray-300" /> {client.phone || '—'}
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-sm font-bold text-gray-500 italic">
                      {client.type || t('crm.client')}
                    </td>
                    <td className="p-6">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${getStatusColor(client.status)}`}>
                        {client.status || t('crm.active')}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <button className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('crm.addClient')}</h2>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">{t('crm.newClientDetails') || 'Детали нового клиента'}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-2xl transition-all"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                status: 'Active',
                type: formData.get('type') || 'Client'
              };

              try {
                const { error } = await supabase.from('customers').insert([data]);
                if (error) throw error;
                setIsModalOpen(false);
                fetchClients();
              } catch (err) {
                console.error(err);
                alert('Error adding client');
              }
            }} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('crm.companyName') || 'Название компании'}</label>
                  <input 
                    name="name"
                    required
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-900/5 transition-all outline-none" 
                    placeholder="Google LLC"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('crm.clientType') || 'Тип клиента'}</label>
                  <select 
                    name="type"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-900/5 transition-all outline-none"
                  >
                    <option value="Client">{t('crm.client') || 'Клиент'}</option>
                    <option value="Lead">{t('crm.lead') || 'Лид'}</option>
                    <option value="Partner">{t('crm.partner') || 'Партнер'}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('crm.emailAddress') || 'Email адрес'}</label>
                  <input 
                    name="email"
                    type="email"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-900/5 transition-all outline-none" 
                    placeholder="contact@google.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('crm.phoneNumber') || 'Номер телефона'}</label>
                  <input 
                    name="phone"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-900/5 transition-all outline-none" 
                    placeholder="+994 50 000 00 00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('crm.address') || 'Адрес'}</label>
                <textarea 
                  name="address"
                  className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-900/5 transition-all outline-none resize-none h-24" 
                  placeholder="Mountain View, CA"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-gray-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-800 shadow-xl shadow-gray-900/20 transition-all active:scale-95"
                >
                  {t('crm.saveClient') || 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMModule;
