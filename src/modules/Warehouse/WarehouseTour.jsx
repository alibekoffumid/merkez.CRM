import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WarehouseTour = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const steps = [
    {
      targetId: 'tour-warehouse-selector',
      title: t('tour.warehouseSelectorTitle') || 'Выбор склада',
      content: t('tour.warehouseSelectorDesc') || 'Выберите склад, которым хотите управлять. У каждого склада свой независимый остаток товаров.',
      position: 'bottom'
    },
    {
      targetId: 'tour-main-tabs',
      title: t('tour.tabsTitle') || 'Навигация',
      content: t('tour.tabsDesc') || 'Переключайтесь между списком товаров, базой поставщиков и подробной историей операций.',
      position: 'bottom'
    },
    {
      targetId: 'tour-receive-btn',
      title: t('tour.receiveTitle') || 'Приёмка товара',
      content: t('tour.receiveDesc') || 'Нажмите сюда, когда получаете новую партию товара от поставщика.',
      position: 'bottom'
    },
    {
      targetId: 'tour-dispatch-btn',
      title: t('tour.dispatchTitle') || 'Списание товара',
      content: t('tour.dispatchDesc') || 'Используйте это для фиксации продаж или списания испорченного товара.',
      position: 'bottom'
    },
    {
      targetId: 'tour-transfer-btn',
      title: t('tour.transferTitle') || 'Перемещение между складами',
      content: t('tour.transferDesc') || 'Новинка! Переносите товары с одного своего склада на другой в пару кликов.',
      position: 'bottom'
    }
  ];

  const updateCoords = useCallback(() => {
    const target = document.getElementById(steps[currentStep].targetId);
    if (target) {
      const rect = target.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep]);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      document.body.style.overflow = 'auto';
    };
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

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dimmed backdrop with hole */}
      <div className="absolute inset-0 bg-black/50 pointer-events-auto" style={{
        clipPath: `polygon(
          0% 0%, 
          0% 100%, 
          ${coords.left}px 100%, 
          ${coords.left}px ${coords.top}px, 
          ${coords.left + coords.width}px ${coords.top}px, 
          ${coords.left + coords.width}px ${coords.top + coords.height}px, 
          ${coords.left}px ${coords.top + coords.height}px, 
          ${coords.left}px 100%, 
          100% 100%, 
          100% 0%
        )`
      }} />

      {/* Tooltip */}
      <div 
        className="absolute p-6 bg-white rounded-2xl shadow-2xl pointer-events-auto transition-all duration-300 w-[320px]"
        style={{
          top: `${coords.top + coords.height + 20}px`,
          left: `${Math.min(window.innerWidth - 340, Math.max(20, coords.left + (coords.width / 2) - 160))}px`
        }}
      >
        {/* Progress indicator */}
        <div className="flex gap-1 mb-4">
          {steps.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1 flex-1 rounded-full transition-all ${idx <= currentStep ? 'bg-merkez-blue' : 'bg-gray-100'}`}
            />
          ))}
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center justify-between">
          {steps[currentStep].title}
          <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </h3>
        
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {steps[currentStep].content}
        </p>

        <div className="flex items-center justify-between">
          <button 
            onClick={handleSkip}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t('common.skip') || 'Пропустить обучение'}
          </button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button 
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="p-2 rounded-xl border border-gray-100 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="bg-merkez-blue text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                {t('common.next') || 'Далее'}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                className="bg-merkez-green text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-green-600/20 hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                {t('common.finish') || 'Понятно!'}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Pointer arrow */}
        <div 
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45"
          style={{ left: `${Math.max(20, Math.min(300, coords.left + (coords.width / 2) - (coords.left + (coords.width / 2) - 160)))}px` }}
        />
      </div>
    </div>
  );
};

export default WarehouseTour;
