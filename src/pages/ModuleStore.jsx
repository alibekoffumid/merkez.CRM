import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { MODULE_REGISTRY } from '../config/moduleRegistry';
import { useUser } from '../core/UserContext';

const accentMap = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', shadow: 'shadow-blue-600/20', btnBg: 'bg-blue-600 hover:bg-blue-500', ring: 'ring-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', shadow: 'shadow-purple-600/20', btnBg: 'bg-purple-600 hover:bg-purple-500', ring: 'ring-purple-600' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', shadow: 'shadow-red-600/20', btnBg: 'bg-red-600 hover:bg-red-500', ring: 'ring-red-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', shadow: 'shadow-amber-600/20', btnBg: 'bg-amber-600 hover:bg-amber-500', ring: 'ring-amber-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', shadow: 'shadow-emerald-600/20', btnBg: 'bg-emerald-600 hover:bg-emerald-500', ring: 'ring-emerald-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', shadow: 'shadow-green-600/20', btnBg: 'bg-green-600 hover:bg-green-500', ring: 'ring-green-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', shadow: 'shadow-indigo-600/20', btnBg: 'bg-indigo-600 hover:bg-indigo-500', ring: 'ring-indigo-600' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-600', shadow: 'shadow-sky-600/20', btnBg: 'bg-sky-600 hover:bg-sky-500', ring: 'ring-sky-600' },
};

const ModuleStore = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activateMultipleModules, activeModules } = useUser();
  
  const [selected, setSelected] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modules = Object.values(MODULE_REGISTRY).filter(m => !m.isCore);

  const toggleModule = (id) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelected(modules.map(m => m.id));
  };

  const totalPrice = selected.reduce((sum, id) => {
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest mb-6">
            <Sparkles className="w-4 h-4" />
            {t('modules.trialBadge') || '14 дней бесплатно'}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight mb-4">
            {t('modules.storeTitle') || 'Выберите модули'}
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto font-medium">
            {t('modules.storeSubtitle') || 'Соберите свою платформу из нужных модулей. Каждый модуль можно попробовать бесплатно 14 дней.'}
          </p>
          
          <button 
            onClick={selectAll}
            className="mt-6 px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-900/20"
          >
            {t('modules.selectAll') || 'Выбрать всё'}
          </button>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {modules.map(mod => {
            const isSelected = selected.includes(mod.id);
            const isAlreadyActive = activeModules.includes(mod.id);
            const accent = accentMap[mod.accentColor] || accentMap.blue;
            const Icon = mod.icon;

            return (
              <button
                key={mod.id}
                onClick={() => !isAlreadyActive && toggleModule(mod.id)}
                disabled={isAlreadyActive}
                className={`relative text-left p-6 rounded-[2rem] border-2 transition-all duration-300 group ${
                  isAlreadyActive
                    ? 'border-emerald-200 bg-emerald-50/50 cursor-default'
                    : isSelected
                      ? `${accent.border} ${accent.bg} ring-2 ${accent.ring} ring-offset-2 scale-[1.02] shadow-xl ${accent.shadow}`
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-lg hover:scale-[1.01]'
                }`}
              >
                {/* Checkmark */}
                {(isSelected || isAlreadyActive) && (
                  <div className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center ${
                    isAlreadyActive ? 'bg-emerald-500' : accent.btnBg.split(' ')[0]
                  } text-white shadow-lg`}>
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </div>
                )}

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                  isSelected ? accent.bg : 'bg-gray-50 group-hover:bg-gray-100'
                }`}>
                  <Icon className={`w-7 h-7 ${isSelected ? accent.text : 'text-gray-400 group-hover:text-gray-600'}`} />
                </div>

                {/* Title */}
                <h3 className="text-lg font-black text-gray-900 mb-1">
                  {t(mod.nameKey) || mod.id}
                </h3>
                <p className="text-xs text-gray-500 font-medium mb-4 line-clamp-2">
                  {t(mod.descriptionKey) || ''}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  {isAlreadyActive ? (
                    <span className="text-sm font-bold text-emerald-600">{t('modules.active') || 'Активен'}</span>
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

        {/* Bottom Bar */}
        {selected.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
            <div className="max-w-3xl mx-auto bg-gray-900 rounded-[2rem] p-4 sm:p-6 flex items-center justify-between shadow-2xl shadow-gray-900/30 border border-gray-800">
              <div>
                <p className="text-white font-black text-lg">
                  {selected.length} {selected.length === 1 ? (t('modules.moduleSelected') || 'модуль') : (t('modules.modulesSelected') || 'модулей')}
                </p>
                <p className="text-gray-400 text-sm font-medium">
                  {totalPrice} AZN / {t('modules.month') || 'мес'} · <span className="text-emerald-400 font-bold">{t('modules.trialBadge') || '14 дней бесплатно'}</span>
                </p>
              </div>
              <button 
                onClick={handleActivate}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-4 bg-white text-gray-900 font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-70"
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
    </div>
  );
};

export default ModuleStore;
