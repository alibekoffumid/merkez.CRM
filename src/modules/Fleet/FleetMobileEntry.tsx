import React, { useState } from 'react';
import { Camera, Send, MapPin, Gauge, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { UserProfile } from '../../types/auth';
import { toast } from 'react-hot-toast';

interface UserContextType {
  profile: UserProfile | null;
}

const FleetMobileEntry: React.FC = () => {
  const { profile } = useUser() as UserContextType;
  const [mileage, setMileage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mileage || !profile?.tenant_id) return;

    setLoading(true);
    try {
      // In a real app, we'd upload the image first
      const { error } = await supabase
        .from('fleet_rent_logs')
        .insert([{
          tenant_id: profile.tenant_id,
          driver_id: profile.id, // Assuming current user is driver
          start_mileage: parseFloat(mileage),
          status: 'open'
        }]);

      if (error) throw error;
      setSubmitted(true);
      toast.success('Данные успешно отправлены!');
    } catch (error: any) {
      toast.error('Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Смена открыта!</h2>
        <p className="text-gray-500 font-medium">Удачной дороги. Данные о пробеге зафиксированы.</p>
        <button 
          onClick={() => setSubmitted(false)}
          className="mt-8 w-full py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold"
        >
          Вернуться
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Mərkəz Fleet</h1>
        <p className="text-gray-500 font-medium">Начало смены: пробег и фото</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6">
        {/* Photo Upload Placeholder */}
        <div 
          className="w-full h-64 bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-gray-400 active:bg-blue-50 active:border-merkez-blue active:text-merkez-blue transition-all"
          onClick={() => {/* Trigger camera */}}
        >
          <div className="p-4 bg-gray-50 rounded-2xl">
            <Camera className="w-8 h-8" />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest">Фото одометра</span>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-merkez-blue">
              <Gauge className="w-5 h-5" />
            </div>
            <input 
              type="number"
              required
              className="w-full pl-12 pr-6 py-5 bg-white border-none rounded-2xl shadow-sm text-xl font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
              placeholder="Текущий пробег..."
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 p-4 bg-blue-50/50 rounded-2xl text-blue-600 text-xs font-bold">
            <MapPin className="w-4 h-4" />
            Местоположение фиксируется автоматически
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="mt-auto w-full py-5 bg-merkez-blue text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          {loading ? (
            <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Отправить отчет
              <Send className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default FleetMobileEntry;
