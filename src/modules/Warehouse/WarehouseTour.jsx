import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ModalPortal from '../../components/Common/ModalPortal';

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
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep]);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const handleResize = () => updateCoords();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize);
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
    const base = id.replace('tour-', '').replace('-btn', '');
    // Convert kebab-case to camelCase
    const camelBase = base.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    return `warehouse.tour.${camelBase}${suffix}`;
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[10000] pointer-events-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
      {/* Dimmed backdrop with hole */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
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
        className="absolute p-6 bg-white rounded-2xl shadow-2xl pointer-events-auto transition-all duration-300 w-[340px]"
        style={{
          top: `${Math.min(window.innerHeight - 300, Math.max(20, coords.top + coords.height + 20))}px`,
          left: `${Math.min(window.innerWidth - 360, Math.max(20, coords.left + (coords.width / 2) - 170))}px`
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
          {t(getTranslationKey(steps[currentStep].targetId, 'Title'))}
          <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </h3>
        
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {t(getTranslationKey(steps[currentStep].targetId, 'Desc'))}
        </p>

        <div className="flex items-center justify-between">
          <button 
            onClick={handleSkip}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t('common.skip') || 'Пропустить'}
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
                className="bg-merkez-blue text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                {t('common.next') || 'Далее'}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                className="bg-merkez-green text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-green-600/20 hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                {t('common.finish') || 'Готово'}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Pointer arrow */}
        <div 
          className="absolute -top-2 w-4 h-4 bg-white rotate-45"
          style={{ left: `${Math.max(20, Math.min(320, coords.left + (coords.width / 2) - (Math.min(window.innerWidth - 360, Math.max(20, coords.left + (coords.width / 2) - 170)))))}px` }}
        />
      </div>
    </ModalPortal>
  );
};

export default WarehouseTour;
