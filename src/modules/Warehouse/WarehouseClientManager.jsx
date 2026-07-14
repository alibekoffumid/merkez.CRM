import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { useTranslation } from 'react-i18next';
import { 
  Users, Plus, Trash2, Edit3, Search, 
  Loader2, CheckCircle, AlertCircle, Save, X, Phone, MapPin, UserPlus, FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';
import WarehouseCreditManager from './WarehouseCreditManager';

const WarehouseClientManager = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [activeSubTab, setActiveSubTab] = useState('clients'); // 'clients' | 'credits'
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [passportSer, setPassportSer] = useState('');
  const [passportFin, setPassportFin] = useState('');
  const [relativesInfo, setRelativesInfo] = useState('');

  useEffect(() => {
    if (profile?.id) {
      fetchClients();
    }
  }, [profile]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      toast.error('Error fetching clients: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setAddress('');
    setPassportSer('');
    setPassportFin('');
    setRelativesInfo('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setName(client.name || '');
    setPhone(client.phone || '');
    setAddress(client.address || '');
    
    // Parse passport_info
    const passVal = client.passport_info || '';
    if (passVal.includes(' || FIN: ')) {
      const parts = passVal.split(' || FIN: ');
      setPassportSer(parts[0] || '');
      setPassportFin(parts[1] || '');
    } else {
      setPassportSer(passVal);
      setPassportFin('');
    }
    
    setRelativesInfo(client.relatives_info || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(i18n.language === 'az' ? 'Müştəri adı boş ola bilməz' : 'Имя клиента не может быть пустым');
      return;
    }

    setSubmitting(true);
    try {
      const combinedPassport = (passportSer.trim() || passportFin.trim())
        ? `${passportSer.trim()} || FIN: ${passportFin.trim()}`
        : null;

      if (editingClient) {
        // Update client
        const { error } = await supabase
          .from('customers')
          .update({
            name: name.trim(),
            phone: phone.trim() || null,
            address: address.trim() || null,
            passport_info: combinedPassport,
            relatives_info: relativesInfo.trim() || null
          })
          .eq('id', editingClient.id);

        if (error) throw error;
        toast.success(i18n.language === 'az' ? 'Müştəri məlumatları yeniləndi' : 'Данные клиента обновлены');
      } else {
        // Create new client
        const { error } = await supabase
          .from('customers')
          .insert([{
            name: name.trim(),
            phone: phone.trim() || null,
            address: address.trim() || null,
            passport_info: combinedPassport,
            relatives_info: relativesInfo.trim() || null,
            status: 'Active',
            type: 'Client',
            user_id: profile.id
          }]);

        if (error) throw error;
        toast.success(i18n.language === 'az' ? 'Yeni müştəri əlavə edildi' : 'Новый клиент добавлен');
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(i18n.language === 'az' ? 'Müştəri uğurla silindi' : 'Клиент успешно удален');
      setConfirmDelete(null);
      fetchClients();
    } catch (err) {
      toast.error('Silinmə xətası: ' + err.message);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-white rounded-lg border border-gray-100 p-6 flex flex-col min-h-[500px]">
      {/* Tab Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            {activeSubTab === 'clients' 
              ? (i18n.language === 'az' ? 'Müştərilər Siyahısı' : i18n.language === 'ru' ? 'Список клиентов' : 'Clients List')
              : (i18n.language === 'az' ? 'Kredit Müqavilələri (Hissə-hissə Satış)' : i18n.language === 'ru' ? 'Кредитные договора (Рассрочка)' : 'Credit Contracts (Installments)')
            }
          </h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">
            {activeSubTab === 'clients'
              ? (i18n.language === 'az' ? 'Müştəri kartoteki və redaktə edilməsi' : i18n.language === 'ru' ? 'Картотека клиентов и их редактирование' : 'Customer directory and editing')
              : (i18n.language === 'az' ? 'Müştəri kreditlərinin və aylıq ödəniş cədvəllərinin idarə edilməsi' : i18n.language === 'ru' ? 'Управление кредитами клиентов и календарем платежей' : 'Management of customer credits and payment schedules')
            }
          </p>
        </div>
        {activeSubTab === 'clients' && (
          <button
            onClick={handleOpenAdd}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-black transition-all flex items-center shadow-lg shadow-gray-900/10 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            {i18n.language === 'az' ? 'Müştəri əlavə et' : i18n.language === 'ru' ? 'Добавить клиента' : 'Add Client'}
          </button>
        )}
      </div>

      {/* Sub tabs */}
      <div className="flex gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100/50 max-w-max mb-6">
        <button
          onClick={() => setActiveSubTab('clients')}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === 'clients'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50 font-black'
              : 'text-gray-400 hover:text-gray-900 font-bold'
          }`}
        >
          {i18n.language === 'az' ? 'Müştərilər' : i18n.language === 'ru' ? 'Клиенты' : 'Clients'}
        </button>
        <button
          onClick={() => setActiveSubTab('credits')}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === 'credits'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50 font-black'
              : 'text-gray-400 hover:text-gray-900 font-bold'
          }`}
        >
          {i18n.language === 'az' ? 'Kreditlər / Taksitlər' : i18n.language === 'ru' ? 'Кредиты / Рассрочка' : 'Credits'}
        </button>
      </div>

      {activeSubTab === 'clients' ? (
        <>

      {/* Filter and Search */}
      <div className="bg-gray-50/50 p-4 rounded-lg border border-gray-100 flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={i18n.language === 'az' ? 'Müştəri adı, telefon və ya ünvan axtar...' : 'Поиск по имени, телефону или адресу...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-lg text-xs font-medium focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-all outline-none"
          />
        </div>
      </div>

      {/* Main Content List */}
      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-merkez-blue" />
            <p className="text-xs font-bold uppercase tracking-widest">{t('common.loading')}</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3 border-2 border-dashed border-gray-100 rounded-lg">
            <Users className="w-10 h-10 text-gray-200" />
            <p className="text-xs font-bold">
              {i18n.language === 'az' ? 'Müşətəri tapılmadı.' : i18n.language === 'ru' ? 'Клиенты не найдены.' : 'No clients found.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/40">
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'Ad / Şirkət' : 'Имя / Компания'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'Əlaqə məlumatları' : 'Контактные данные'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'Kredit Məlumatları' : 'Кредитные данные'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{i18n.language === 'az' ? 'Borc Balansı' : 'Долговой баланс'}</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{i18n.language === 'az' ? 'Əməliyyatlar' : 'Операции'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-900 text-sm">{client.name}</div>
                  </td>
                  <td className="p-4 text-xs">
                    <div className="space-y-1">
                      {client.phone && (
                        <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-mono">{client.phone}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{client.address}</span>
                        </div>
                      )}
                      {!client.phone && !client.address && (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-xs">
                    <div className="space-y-1">
                      {client.passport_info ? (
                        <div className="flex items-start gap-1.5 text-gray-700">
                          <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">{client.passport_info.split(' || FIN: ')[0]}</span>
                            {client.passport_info.split(' || FIN: ')[1] && (
                              <span className="text-[10px] text-gray-400 font-mono ml-1.5 bg-gray-50 border border-gray-100 px-1 py-0.5 rounded">
                                FIN: {client.passport_info.split(' || FIN: ')[1]}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : null}
                      {client.relatives_info ? (
                        <div className="flex items-start gap-1.5 text-gray-500">
                          <Users className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                          <div className="whitespace-pre-line max-w-[200px] break-words text-[10px] leading-relaxed">
                            {client.relatives_info}
                          </div>
                        </div>
                      ) : null}
                      {!client.passport_info && !client.relatives_info && (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`text-sm font-black ${(client.debt_balance || 0) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      ₼{(client.debt_balance || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"
                        title="Redaktə et"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(client)}
                        disabled={(client.debt_balance || 0) > 0}
                        className={`p-1.5 rounded-lg transition-colors ${
                          (client.debt_balance || 0) > 0 
                            ? 'text-gray-200 cursor-not-allowed' 
                            : 'hover:bg-red-50 text-red-400 hover:text-red-600'
                        }`}
                        title={(client.debt_balance || 0) > 0 ? (i18n.language === 'az' ? 'Borcu olan müştəri silinə bilməz' : 'Нельзя удалить клиента с долгом') : 'Sil'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </>
      ) : (
        <WarehouseCreditManager />
      )}

      {/* Edit/Add Client Modal */}
      {isModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
            <div 
              className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-merkez-blue flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingClient 
                      ? (i18n.language === 'az' ? 'Müştəri Məlumatlarını Yenilə' : 'Редактировать клиента')
                      : (i18n.language === 'az' ? 'Yeni Müştəri Əlavə Et' : 'Добавить нового клиента')
                    }
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                    {i18n.language === 'az' ? 'Ad / Şirkət' : 'Имя / Компания'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-bold"
                    placeholder={i18n.language === 'az' ? 'Məsələn: Əli Məmmədov' : 'Например: Али Мамедов'}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                    {i18n.language === 'az' ? 'Telefon' : 'Телефон'}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-mono"
                    placeholder="+994 (50) 000-00-00"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                    {i18n.language === 'az' ? 'Ünvan' : 'Адрес'}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-medium"
                    placeholder={i18n.language === 'az' ? 'Bakı ş., Nəsimi r.' : 'г. Баку, Насиминский р-н'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                      {i18n.language === 'az' ? 'Ş.V. Seriyası və №' : i18n.language === 'ru' ? 'Серия и № паспорта' : 'Passport Ser & No'}
                    </label>
                    <input
                      type="text"
                      value={passportSer}
                      onChange={(e) => setPassportSer(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-bold uppercase"
                      placeholder="AZE 12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                      {i18n.language === 'az' ? 'FİN Kod' : i18n.language === 'ru' ? 'ФИН код' : 'FIN Code'}
                    </label>
                    <input
                      type="text"
                      value={passportFin}
                      onChange={(e) => setPassportFin(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-bold uppercase"
                      placeholder="7ABC12D"
                      maxLength={7}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                    {i18n.language === 'az' ? 'Qohumların Əlaqə Nömrələri' : i18n.language === 'ru' ? 'Телефоны родственников' : 'Relatives Phone Numbers'}
                  </label>
                  <textarea
                    value={relativesInfo}
                    onChange={(e) => setRelativesInfo(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-medium resize-none h-20"
                    placeholder={i18n.language === 'az' 
                      ? 'Məsələn: Ata (Əli) - 0501234567\nQardaş (Vəli) - 0709876543' 
                      : 'Например: Отец (Али) - 0501234567\nБрат (Вели) - 0709876543'
                    }
                  />
                </div>

                {/* Submit Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-lg font-bold hover:bg-gray-50 transition-all text-xs shadow-sm"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-merkez-blue text-white rounded-lg font-bold shadow-lg shadow-blue-600/10 hover:bg-blue-600 disabled:opacity-50 transition-all text-xs flex items-center justify-center"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <ModalPortal>
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <div 
              className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 flex flex-col p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold text-gray-900">
                  {i18n.language === 'az' ? 'Müştərini silmək istəyirsiniz?' : 'Удалить клиента?'}
                </h3>
              </div>
              <p className="text-xs font-medium text-gray-500 mb-6 leading-relaxed">
                {i18n.language === 'az' 
                  ? `"${confirmDelete.name}" adlı müştəri sistemdən tamamilə silinəcək. Bu əməliyyat geri qaytarıla bilməz.`
                  : `Клиент "${confirmDelete.name}" будет полностью удален из системы. Это действие нельзя отменить.`
                }
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-lg font-bold hover:bg-gray-50 transition-all text-xs shadow-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete.id)}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all text-xs shadow-lg shadow-red-600/10"
                >
                  {i18n.language === 'az' ? 'Sil' : 'Удалить'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default WarehouseClientManager;
