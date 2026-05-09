import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, User, Phone, Mail, MapPin, Loader2, Trash2 } from 'lucide-react'; 
import { supabase } from '../../supabaseClient';
import ModalPortal from '../../components/Common/ModalPortal';
import { toast } from 'react-hot-toast';

const EditSupplierModal = ({ isOpen, onClose, supplier, onSupplierUpdated }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false); 
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  }); 

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || ''
      });
    }
  }, [supplier]);

  if (!isOpen || !supplier) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('suppliers')
      .update(formData)
      .eq('id', supplier.id);

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('common.updated'));
      onSupplierUpdated();
      onClose();
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
        <div 
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-8 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-merkez-blue flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('warehouse.editSupplier') || 'Редактировать поставщика'}</h3>
                <p className="text-xs text-gray-500 font-medium">{t('warehouse.supplierDetailsDesc') || 'Измените данные поставщика'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('warehouse.supplierName') || 'Название компании'}</label>
                <div className="relative">
                  <User className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-gray-50 border-transparent border focus:bg-white focus:border-merkez-blue rounded-2xl pl-12 pr-6 py-4 outline-none transition-all font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('warehouse.contactPerson') || 'Контактное лицо'}</label>
                <input 
                  type="text" 
                  value={formData.contact_person}
                  onChange={e => setFormData({...formData, contact_person: e.target.value})}
                  className="w-full bg-gray-50 border-transparent border focus:bg-white focus:border-merkez-blue rounded-2xl px-6 py-4 outline-none transition-all font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('warehouse.supplierPhone') || 'Телефон'}</label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-gray-50 border-transparent border focus:bg-white focus:border-merkez-blue rounded-2xl pl-12 pr-6 py-4 outline-none transition-all font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('warehouse.supplierEmail') || 'Email'}</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-gray-50 border-transparent border focus:bg-white focus:border-merkez-blue rounded-2xl pl-12 pr-6 py-4 outline-none transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('warehouse.supplierAddress') || 'Адрес'}</label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-gray-50 border-transparent border focus:bg-white focus:border-merkez-blue rounded-2xl pl-12 pr-6 py-4 outline-none transition-all font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex gap-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-4 text-sm font-bold text-gray-500 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="flex-[2] py-4 bg-merkez-blue text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default EditSupplierModal;
