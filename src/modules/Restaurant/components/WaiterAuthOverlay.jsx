import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabaseClient';
import { X, User, ShieldCheck, Clock } from 'lucide-react';
import PatternLock from '../../../components/PatternLock/PatternLock';

const WaiterAuthOverlay = ({ isOpen, onClose, onSuccess, actionTitle }) => {
  const { t } = useTranslation();
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
      setSelectedStaff(null);
      setError(false);
    }
  }, [isOpen]);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('status', 'Active')
      .order('name');
    setStaffList(data || []);
    setLoading(false);
  };

  const verifyAttendance = async (staffId) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Check if already logged in today
        const { data: existing } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('staff_id', staffId)
            .eq('date', today)
            .single();

        if (existing) return;

        // new attendance entry
        const now = new Date();
        const staff = staffList.find(s => s.id === staffId);
        
        // Calculate lateness
        let isLate = false;
        if (staff?.shift_start_time) {
            const [h, m] = staff.shift_start_time.split(':');
            const shiftStart = new Date();
            shiftStart.setHours(parseInt(h), parseInt(m), 0, 0);
            if (now > shiftStart) {
                isLate = true;
            }
        }

        const { data: { user } } = await supabase.auth.getUser();

        await supabase.from('attendance_logs').insert([{
            staff_id: staffId,
            user_id: user?.id,
            clock_in_time: now.toISOString(),
            is_late: isLate,
            date: today
        }]);
    } catch (e) {
        console.error("Attendance tracking error:", e);
    }
  };

  const handlePatternComplete = async (pattern) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setError(false);

    if (selectedStaff.pin_pattern === pattern) {
      // Success!
      await verifyAttendance(selectedStaff.id);
      setIsVerifying(false);
      onSuccess(selectedStaff);
      onClose();
    } else {
      setError(true);
      setIsVerifying(false);
      // provide haptic feedback or sound if needed? For now just visual.
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-8 relative flex flex-col items-center overflow-hidden">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-8 text-center mt-4">
            <div className={`w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center transition-colors duration-500 ${selectedStaff ? 'bg-merkez-blue text-white' : 'bg-gray-100 text-gray-400'}`}>
                {selectedStaff ? <ShieldCheck className="w-10 h-10" /> : <User className="w-10 h-10" />}
            </div>
            <h2 className="text-2xl font-black text-gray-900">{actionTitle || t('restaurant.authorizeAction')}</h2>
            <p className="text-gray-500 mt-2 font-medium">
                {selectedStaff ? t('restaurant.drawPatternToVerify') : t('restaurant.selectStaffToBegin')}
            </p>
        </div>

        {!selectedStaff ? (
          <div className="w-full grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto no-scrollbar p-2">
            {loading ? (
              <div className="col-span-2 text-center py-12 text-gray-400 font-bold">{t('common.loading')}...</div>
            ) : staffList.map(person => (
              <button 
                key={person.id}
                onClick={() => setSelectedStaff(person)}
                className="flex items-center p-4 bg-gray-50 rounded-2xl hover:bg-merkez-blue/5 border border-transparent hover:border-merkez-blue/20 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-merkez-blue/10 text-merkez-blue flex items-center justify-center font-black mr-3 text-sm">
                  {person.name?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{person.name}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-black">{t('restaurant.' + person.role.toLowerCase())}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="mb-6 flex items-center gap-3">
                <button 
                    onClick={() => setSelectedStaff(null)} 
                    className="text-xs font-bold text-merkez-blue hover:underline p-2 bg-blue-50 rounded-lg px-4"
                >
                    ← {t('restaurant.changeWaiter')}
                </button>
                <span className="text-lg font-black text-gray-900">{selectedStaff.name}</span>
            </div>

            <PatternLock 
              onComplete={handlePatternComplete} 
              onStart={() => setError(false)}
              error={error} 
            />

            {error && (
              <p className="text-red-500 mt-6 font-bold text-sm animate-bounce">
                {t('restaurant.incorrectPattern')}
              </p>
            )}
            
            <div className="mt-8 flex items-center gap-2 text-gray-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-widest leading-none">Security Protocol Active</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaiterAuthOverlay;
