import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, ArrowRight, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { MODULE_REGISTRY } from '../config/moduleRegistry';
import { useUser } from '../core/UserContext';

const accentMap = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', shadow: 'shadow-blue-600/20', btn: 'bg-blue-600 hover:bg-blue-500', ring: 'ring-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', shadow: 'shadow-purple-600/20', btn: 'bg-purple-600 hover:bg-purple-500', ring: 'ring-purple-600' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', shadow: 'shadow-red-600/20', btn: 'bg-red-600 hover:bg-red-500', ring: 'ring-red-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', shadow: 'shadow-amber-600/20', btn: 'bg-amber-600 hover:bg-amber-500', ring: 'ring-amber-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', shadow: 'shadow-emerald-600/20', btn: 'bg-emerald-600 hover:bg-emerald-500', ring: 'ring-emerald-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', shadow: 'shadow-green-600/20', btn: 'bg-green-600 hover:bg-green-500', ring: 'ring-green-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', shadow: 'shadow-indigo-600/20', btn: 'bg-indigo-600 hover:bg-indigo-500', ring: 'ring-indigo-600' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-600', shadow: 'shadow-sky-600/20', btn: 'bg-sky-600 hover:bg-sky-500', ring: 'ring-sky-600' },
};

const ModuleStore = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activateMultipleModules, deactivateModule, activeModules, needsOnboarding } = useUser();
  
  const [selected, setSelected] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, moduleId: null });

  const isFirstVisit = needsOnboarding || activeModules.length === 0;

  const modules = Object.values(MODULE_REGISTRY).filter(m => !m.isCore);

  const toggleModule = async (id) => {
    // If module is already active, show custom confirm modal
    if (activeModules.includes(id)) {
      setConfirmModal({ isOpen: true, moduleId: id });
      return;
    }
    
    // Otherwise toggle selection for activation
    setSelected(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeactivate = async () => {
    const id = confirmModal.moduleId;
    if (!id) return;
    
    setConfirmModal({ isOpen: false, moduleId: null });
    setDeactivatingId(id);
    try {
      await deactivateModule(id);
    } finally {
      setDeactivatingId(null);
    }
  };

  const selectAll = () => {
    const newModules = modules
      .filter(m => !activeModules.includes(m.id))
      .map(m => m.id);
    setSelected(newModules);
  };

  const totalPrice = [...selected, ...activeModules]
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .reduce((sum, id) => {
      const mod = MODULE_REGISTRY[id];
      return sum + (mod?.price || 0);
    }, 0);

  const newPrice = selected.reduce((sum, id) => {
    const mod = MODULE_REGISTRY[id];
    return sum + (mod?.price || 0);
  }, 0);

  const handleActivate = async () => {
    if (selected.length === 0) return;
    setIsSubmitting(true);
    try {
      const success = await activateMultipleModules(selected, 'trial');
      if (success) {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Back button when not first visit */}
        {!isFirstVisit && (
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold text-sm mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t('common.back') || 'Назад'}
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest mb-6">
            <Sparkles className="w-4 h-4" />
            {t('modules.trialBadge')}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight mb-4">
            {isFirstVisit 
              ? (t('modules.storeTitle') || 'Выберите модули')
              : (t('modules.manageModules') || 'Управление модулями')
            }
          </h1>
          <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto font-medium">
            {t('modules.storeSubtitle')}
          </p>
          
          {/* Quick stats for returning users */}
          {!isFirstVisit && activeModules.length > 0 && (
            <div className="mt-6 inline-flex items-center gap-3 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-bold border border-emerald-200">
              <Check className="w-4 h-4" />
              {activeModules.length} {activeModules.length === 1 ? 'модуль активен' : 'модулей активно'} · {totalPrice - newPrice} AZN/{t('modules.month') || 'мес'}
            </div>
          )}

          <div className="mt-6">
            <button 
              onClick={selectAll}
              className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-900/20"
            >
              {t('modules.selectAll') || 'Выбрать всё'}
            </button>
          </div>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-32">
          {modules.map(mod => {
            const isActive = activeModules.includes(mod.id);
            const isSelected = selected.includes(mod.id);
            const accent = accentMap[mod.accentColor] || accentMap.blue;
            const Icon = mod.icon;

            return (
              <button
                key={mod.id}
                onClick={() => toggleModule(mod.id)}
                disabled={deactivatingId === mod.id}
                className={`relative text-left p-6 rounded-[2rem] border-2 transition-all duration-300 group ${
                  isActive
                    ? 'border-emerald-200 bg-emerald-50/50 hover:border-red-200 hover:bg-red-50/30 cursor-pointer'
                    : isSelected
                      ? `${accent.border} ${accent.bg} ring-2 ${accent.ring} ring-offset-2 scale-[1.02] shadow-xl ${accent.shadow}`
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-lg hover:scale-[1.01] cursor-pointer'
                } ${deactivatingId === mod.id ? 'opacity-50 grayscale' : ''}`}
              >
                {/* Checkmark */}
                {(isSelected || isActive) && (
                  <div className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-emerald-500' : accent.btn.split(' ')[0]
                  } text-white shadow-lg`}>
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </div>
                )}

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                  isActive ? 'bg-emerald-100' :
                  isSelected ? accent.bg : 'bg-gray-50 group-hover:bg-gray-100'
                }`}>
                  <Icon className={`w-7 h-7 ${
                    isActive ? 'text-emerald-600' :
                    isSelected ? accent.text : 'text-gray-400 group-hover:text-gray-600'
                  }`} />
                </div>

                {/* Title */}
                <h3 className="text-lg font-black text-gray-900 mb-1">
                  {t(mod.nameKey) || mod.id}
                </h3>
                <p className="text-xs text-gray-500 font-medium mb-4 line-clamp-2 min-h-[2rem]">
                  {t(mod.descriptionKey) || ''}
                </p>

                {/* Price / Status */}
                <div className="flex items-baseline gap-1">
                  {deactivatingId === mod.id ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm font-bold">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('common.processing') || 'Обработка...'}
                    </div>
                  ) : isActive ? (
                    <span className="text-sm font-bold text-emerald-600 group-hover:text-red-500 transition-colors">
                      <span className="group-hover:hidden">{t('modules.active') || 'Активен'} ✓</span>
                      <span className="hidden group-hover:inline">{t('modules.deactivate') || 'Деактивировать'} ?</span>
                    </span>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-gray-900">{mod.price}</span>
                      <span className="text-sm font-bold text-gray-400">AZN / {t('modules.month') || 'мес'}</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Floating Bar */}
        {selected.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
            <div className="max-w-3xl mx-auto bg-gray-900 rounded-[2rem] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl shadow-gray-900/30 border border-gray-800">
              <div className="text-center sm:text-left">
                <p className="text-white font-black text-lg">
                  {selected.length} {t('modules.modulesSelected') || 'модулей выбрано'}
                </p>
                <p className="text-gray-400 text-sm font-medium">
                  +{newPrice} AZN / {t('modules.month') || 'мес'} · <span className="text-emerald-400 font-bold">{t('modules.trialBadge')}</span>
                </p>
              </div>
              <button 
                onClick={handleActivate}
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {t('modules.activate') || 'Активировать'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Deactivation Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-600/10">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
                {t('modules.deactivate') || 'Деактивировать?'}
              </h2>
              <p className="text-gray-500 font-medium mb-8">
                {t('modules.confirmDeactivate')}
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmModal({ isOpen: false, moduleId: null })}
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={handleDeactivate}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all active:scale-95"
                >
                  {t('common.confirm') || 'Да, отключить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleStore;
