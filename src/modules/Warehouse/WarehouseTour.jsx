import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ModalPortal from '../../components/Common/ModalPortal';

const WarehouseTour = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0, radius: 12 });

  const steps = [
    { targetId: 'tour-warehouse-selector', radius: 16 },
    { targetId: 'tour-main-tabs', radius: 16 },
    { targetId: 'tour-categories', radius: 16 },
    { targetId: 'tour-search', radius: 12 },
    { targetId: 'tour-add-product-btn', radius: 12 },
    { targetId: 'tour-import-btn', radius: 12 },
    { targetId: 'tour-receive-btn', radius: 12 },
    { targetId: 'tour-dispatch-btn', radius: 12 },
    { targetId: 'tour-transfer-btn', radius: 12 },
    { targetId: 'tour-history-tab', radius: 12 }
  ];

  const updateCoords = useCallback(() => {
    const step = steps[currentStep];
    const target = document.getElementById(step.targetId);
    if (target) {
      const rect = target.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        radius: step.radius || 12
      });
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep]);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const handleUpdate = () => updateCoords();
      window.addEventListener('resize', handleUpdate);
      window.addEventListener('scroll', handleUpdate);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('resize', handleUpdate);
        window.removeEventListener('scroll', handleUpdate);
        document.body.style.overflow = 'auto';
      };
    }
  }, [isOpen, updateCoords]);

  if (!isOpen) return null;

  const handleFinish = () => {
    localStorage.setItem('warehouse_tour_seen', 'true');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('warehouse_tour_seen', 'true');
    onClose();
  };

  const getTranslationKey = (id, suffix) => {
    const base = id.replace('tour-', '').replace('-btn', '').replace('-tab', '');
    const camelBase = base.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    return `warehouse.tour.${camelBase}${suffix}`;
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[10000] pointer-events-none overflow-hidden">
        {/* Rounded highlight using box-shadow */}
        <div 
          className="absolute transition-all duration-500 ease-in-out pointer-events-none"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            height: `${coords.height}px`,
            borderRadius: `${coords.radius}px`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
            zIndex: 10001
          }}
        />

        {/* Tooltip */}
        <div 
          className="absolute p-6 bg-white rounded-3xl shadow-2xl pointer-events-auto transition-all duration-500 ease-in-out w-[350px]"
          style={{
            top: `${Math.min(window.innerHeight - 340, Math.max(20, coords.top + coords.height + 24))}px`,
            left: `${Math.min(window.innerWidth - 370, Math.max(20, coords.left + (coords.width / 2) - 175))}px`,
            zIndex: 10002
          }}
        >
          {/* Progress dots */}
          <div className="flex gap-1.5 mb-5">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${idx === currentStep ? 'bg-merkez-blue scale-110' : idx < currentStep ? 'bg-blue-200' : 'bg-gray-100'}`}
              />
            ))}
          </div>

          <h3 className="text-xl font-black text-gray-900 mb-2.5 flex items-center justify-between">
            {t(getTranslationKey(steps[currentStep].targetId, 'Title'))}
            <button onClick={handleSkip} className="text-gray-300 hover:text-gray-500 transition-colors p-1 hover:bg-gray-50 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </h3>
          
          <p className="text-sm text-gray-600 leading-relaxed mb-8">
            {t(getTranslationKey(steps[currentStep].targetId, 'Desc'))}
          </p>

          <div className="flex items-center justify-between">
            <button 
              onClick={handleSkip}
              className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('common.skip')}
            </button>

            <div className="flex gap-2.5">
              {currentStep > 0 && (
                <button 
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="p-2.5 rounded-2xl border border-gray-100 text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <button 
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="bg-merkez-blue text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg shadow-blue-600/30 hover:bg-blue-600 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                >
                  {t('common.next')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={handleFinish}
                  className="bg-merkez-green text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg shadow-green-600/30 hover:bg-green-600 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                >
                  {t('common.finish')}
                  <Check className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Pointer arrow */}
          <div 
            className="absolute -top-2 w-4 h-4 bg-white rotate-45 transition-all duration-500"
            style={{ 
              left: `${Math.max(30, Math.min(300, coords.left + (coords.width / 2) - (Math.min(window.innerWidth - 370, Math.max(20, coords.left + (coords.width / 2) - 175)))))}px`,
              opacity: (coords.top + coords.height + 24) > window.innerHeight - 340 ? 0 : 1
            }}
          />
        </div>
      </div>
    </ModalPortal>
  );
};

export default WarehouseTour;
