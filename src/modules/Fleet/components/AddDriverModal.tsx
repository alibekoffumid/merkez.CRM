import React, { useState } from 'react';
import { X, User, Phone, CreditCard, Hash } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import { toast } from 'react-hot-toast';
import { UserProfile } from '../../../types/auth';

interface UserContextType {
  profile: UserProfile | null;
}

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddDriverModal: React.FC<AddDriverModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { profile } = useUser() as UserContextType;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    license_number: '',
    whatsapp_number: '',
    initial_balance: '0'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('fleet_drivers')
        .insert([{
          tenant_id: profile.tenant_id,
          full_name: formData.full_name,
          license_number: formData.license_number,
          whatsapp_number: formData.whatsapp_number,
          balance: parseFloat(formData.initial_balance),
          status: 'active'
        }]);

      if (error) throw error;
      toast.success('Водитель успешно добавлен!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-xl">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              Новый водитель
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ФИО Водителя</label>
              <div className="relative">
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input 
                  required 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none"
                  placeholder="Алиев Вали..."
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                 />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Номер ВУ</label>
                <div className="relative">
                   <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                    required 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none"
                    placeholder="AA123456"
                    value={formData.license_number}
                    onChange={e => setFormData({...formData, license_number: e.target.value})}
                   />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                <div className="relative">
                   <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                    required 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none"
                    placeholder="99450XXXXXXX"
                    value={formData.whatsapp_number}
                    onChange={e => setFormData({...formData, whatsapp_number: e.target.value})}
                   />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Начальный баланс (Депозит)</label>
              <div className="relative">
                 <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input 
                  required 
                  type="number"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none text-merkez-blue"
                  value={formData.initial_balance}
                  onChange={e => setFormData({...formData, initial_balance: e.target.value})}
                 />
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl shadow-gray-900/20 hover:bg-gray-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Зарегистрировать водителя'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddDriverModal;
