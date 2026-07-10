import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, UserPlus, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';

const QuickAddCustomerModal = ({ isOpen, onClose, onCustomerAdded }) => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    passportSer: '',
    passportFin: '',
    relativesInfo: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(i18n.language === 'az' ? 'Müştəri adı daxil edilməlidir' : 'Имя клиента обязательно');
      return;
    }

    setLoading(true);

    try {
      const combinedPassport = (formData.passportSer.trim() || formData.passportFin.trim())
        ? `${formData.passportSer.trim()} || FIN: ${formData.passportFin.trim()}`
        : null;

      const dataToInsert = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        passport_info: combinedPassport,
        relatives_info: formData.relativesInfo.trim() || null,
        status: 'Active',
        type: 'Client',
        user_id: profile?.id
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([dataToInsert])
        .select('*')
        .single();

      if (error) throw error;

      toast.success(i18n.language === 'az' ? 'Müştəri uğurla əlavə olundu' : 'Клиент успешно добавлен');
      onCustomerAdded(data);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" onClick={onClose}>
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-merkez-blue flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {i18n.language === 'az' ? 'Yeni Müştəri Əlavə Et' : i18n.language === 'ru' ? 'Добавить нового клиента' : 'Add New Customer'}
              </h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                {i18n.language === 'az' ? 'Müştərinin Adı / Şirkət' : i18n.language === 'ru' ? 'Имя клиента / Компания' : 'Customer Name / Company'} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-bold"
                placeholder={i18n.language === 'az' ? 'Məsələn: Əli Məmmədov' : 'Например: Али Мамедов'}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                {i18n.language === 'az' ? 'Telefon' : i18n.language === 'ru' ? 'Телефон' : 'Phone'}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-mono"
                placeholder="+994 (50) 000-00-00"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                {i18n.language === 'az' ? 'Ünvan' : i18n.language === 'ru' ? 'Адрес' : 'Address'}
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-medium"
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
                  value={formData.passportSer}
                  onChange={e => setFormData({ ...formData, passportSer: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-bold uppercase"
                  placeholder="AZE 12345678"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                  {i18n.language === 'az' ? 'FİN Kod' : i18n.language === 'ru' ? 'ФИН код' : 'FIN Code'}
                </label>
                <input
                  type="text"
                  value={formData.passportFin}
                  onChange={e => setFormData({ ...formData, passportFin: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-bold uppercase"
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
                value={formData.relativesInfo}
                onChange={e => setFormData({ ...formData, relativesInfo: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-medium resize-none h-20"
                placeholder={i18n.language === 'az' 
                  ? 'Məsələn: Ata (Əli) - 0501234567\nQardaş (Vəli) - 0709876543' 
                  : 'Например: Отец (Али) - 0501234567\nБрат (Вели) - 0709876543'
                }
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={onClose}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold hover:bg-gray-50 transition-all text-xs shadow-sm"
              >
                {t('common.cancel')}
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-merkez-blue text-white rounded-xl font-bold shadow-lg shadow-blue-600/10 hover:bg-blue-600 disabled:opacity-50 transition-all text-xs flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {t('common.save') || 'Yadda saxla'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default QuickAddCustomerModal;
