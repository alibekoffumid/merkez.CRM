import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, X, KeyRound, ChevronLeft } from 'lucide-react';
import { useUser } from '../core/UserContext';
import { useNavigate } from 'react-router-dom';
import ModalPortal from './Common/ModalPortal';

const PinGuard = ({ children, moduleId }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const navigate = useNavigate();
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  // Default PIN is "0000" if not set in profile
  const correctPin = profile?.admin_pin || '0000';

  const handlePinSubmit = (e) => {
    if (e) e.preventDefault();
    if (pin === correctPin) {
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
      if (newPin.length === 4 && newPin === correctPin) {
        setIsLocked(false);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClose = () => {
    navigate('/modules');
  };

  if (!isLocked) {
    return children;
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 relative">
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="p-8 text-center mt-4">
            <div className="mx-auto w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center mb-6 ring-1 ring-amber-100">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {t('common.adminLock') || 'Admin Lock'}
            </h2>
            <p className="text-sm text-gray-500 font-medium mb-8">
              {t('common.enterPinToAccess') || 'Введите 4-значный PIN-код для доступа'}
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
                    className="h-16 rounded-2xl bg-gray-50 text-xl font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleDelete}
                  className="h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNumberClick('0')}
                  className="h-16 rounded-2xl bg-gray-50 text-xl font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
                >
                  0
                </button>
                <button
                  type="submit"
                  disabled={pin.length !== 4}
                  className={`h-16 rounded-2xl flex items-center justify-center transition-all ${
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
        </div>
      </div>
    </ModalPortal>
  );
};

export default PinGuard;
