import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, X, KeyRound, ChevronLeft, User, Users, Loader2 } from 'lucide-react';
import { useUser } from '../core/UserContext';
import { useNavigate } from 'react-router-dom';
import ModalPortal from './Common/ModalPortal';
import { supabase } from '../supabaseClient';

const PinGuard = ({ children, moduleId }) => {
  const { t, i18n } = useTranslation();
  const { profile, setCurrentStaff } = useUser();
  const navigate = useNavigate();
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null); // 'owner' or staff object

  useEffect(() => {
    if (profile?.id) {
      fetchStaff();
    }
  }, [profile]);

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'Active')
        .order('name', { ascending: true });

      if (!error && data) {
        setStaffList(data);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const getCorrectPin = () => {
    if (selectedUser === 'owner') {
      return profile?.admin_pin || '0000';
    }
    if (selectedUser?.pin) {
      return selectedUser.pin;
    }
    return '0000'; // Fallback if staff has no PIN
  };

  const handlePinSubmit = (e) => {
    if (e) e.preventDefault();
    if (pin === getCorrectPin()) {
      setCurrentStaff(selectedUser === 'owner' ? null : selectedUser);
      setIsLocked(false);
      setError(false);
    } else {
      setError(true);
      setPin('');
    }
  };

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      // Auto-submit when 4 digits are entered
      if (newPin.length === 4 && newPin === getCorrectPin()) {
        setCurrentStaff(selectedUser === 'owner' ? null : selectedUser);
        setIsLocked(false);
      } else if (newPin.length === 4) {
         setError(true);
         setTimeout(() => setPin(''), 500);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (!isLocked) {
    return children;
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {!selectedUser ? (
            <div className="p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mb-4 ring-1 ring-blue-100">
                  <Users className="w-8 h-8 text-merkez-blue" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">
                  {i18n.language === 'az' ? 'Kim işləyir?' : 'Кто работает?'}
                </h2>
                <p className="text-sm text-gray-500 font-medium">
                  {i18n.language === 'az' ? 'Giriş etmək üçün profilinizi seçin' : 'Выберите свой профиль для входа'}
                </p>
              </div>

              {loadingStaff ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-merkez-blue" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Owner Option */}
                  <button
                    onClick={() => setSelectedUser('owner')}
                    className="w-full p-4 flex items-center gap-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-transparent hover:border-gray-200 active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 rounded-full bg-merkez-blue/10 text-merkez-blue flex items-center justify-center">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-gray-900">
                        {i18n.language === 'az' ? 'Sahib / İdarəçi' : 'Владелец / Администратор'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {i18n.language === 'az' ? 'Tam giriş' : 'Полный доступ'}
                      </p>
                    </div>
                  </button>

                  {/* Staff Options */}
                  {staffList.map(staff => (
                    <button
                      key={staff.id}
                      onClick={() => setSelectedUser(staff)}
                      className="w-full p-4 flex items-center gap-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-transparent hover:border-gray-200 active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="font-bold text-gray-900">{staff.name}</h3>
                        <p className="text-xs text-gray-500">
                          {staff.role === 'Manager' ? (i18n.language === 'az' ? 'Menecer' : 'Менеджер') :
                           staff.role === 'Storeman' ? (i18n.language === 'az' ? 'Anbardar' : 'Кладовщик') :
                           staff.role === 'Cashier' ? (i18n.language === 'az' ? 'Kassir' : 'Кассир') :
                           staff.role === 'Staff' ? (i18n.language === 'az' ? 'İşçi' : 'Сотрудник') :
                           staff.role}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center mt-4">
               <button 
                onClick={() => { setSelectedUser(null); setPin(''); setError(false); }}
                className="absolute top-6 left-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all flex items-center gap-2 z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="mx-auto w-16 h-16 bg-amber-50 rounded-xl flex items-center justify-center mb-6 ring-1 ring-amber-100">
                <Lock className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-1">
                {selectedUser === 'owner' ? (i18n.language === 'az' ? 'Sahib' : 'Владелец') : selectedUser.name}
              </h2>
              <p className="text-sm text-gray-500 font-medium mb-8">
                {i18n.language === 'az' ? 'Giriş etmək üçün 4 rəqəmli PIN kodu daxil edin' : 'Введите 4-значный PIN-код для доступа'}
              </p>

              <form onSubmit={handlePinSubmit}>
                {/* PIN Dots */}
                <div className="flex justify-center gap-4 mb-8">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        pin.length > i 
                          ? 'bg-amber-500 scale-125 shadow-[0_0_12px_rgba(245,158,11,0.4)]' 
                          : 'bg-gray-200'
                      } ${error ? 'animate-bounce bg-red-400' : ''}`}
                    />
                  ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumberClick(num.toString())}
                      className="h-16 rounded-lg bg-gray-50 text-xl font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="h-16 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberClick('0')}
                    className="h-16 rounded-lg bg-gray-50 text-xl font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
                  >
                    0
                  </button>
                  <button
                    type="submit"
                    disabled={pin.length !== 4}
                    className={`h-16 rounded-lg flex items-center justify-center transition-all ${
                      pin.length === 4 
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' 
                        : 'bg-gray-100 text-gray-300'
                    }`}
                  >
                    <KeyRound className="w-6 h-6" />
                  </button>
                </div>

                {error && (
                  <p className="text-sm font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                    {t('common.wrongPin') || 'Неверный код. Попробуйте снова.'}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};

export default PinGuard;
