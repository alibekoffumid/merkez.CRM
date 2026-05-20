import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';

const PricingSection = () => {
  const { t, i18n } = useTranslation();

  const plans = [
    {
      name: t('landing.pricing.starter.name', 'Starter'),
      desc: t('landing.pricing.starter.desc', 'Для малого бизнеса'),
      price: t('landing.pricing.starter.price', 'Бесплатно'),
      period: t('landing.pricing.starter.period', '14 дней'),
      features: [
        t('landing.pricing.starter.f1', 'До 5 пользователей'),
        t('landing.pricing.starter.f2', 'Базовые модули (Dashboard)'),
        t('landing.pricing.starter.f3', 'Стандартная поддержка'),
        t('landing.pricing.starter.f4', 'Базовая аналитика')
      ],
      popular: false,
      btn: t('landing.pricing.starter.btn', 'Начать бесплатно')
    },
    {
      name: t('landing.pricing.pro.name', 'Pro'),
      desc: t('landing.pricing.pro.desc', 'Для растущих компаний'),
      price: '$49',
      period: t('landing.pricing.pro.period', '/ мес'),
      features: [
        t('landing.pricing.pro.f1', 'До 20 пользователей'),
        t('landing.pricing.pro.f2', 'Все отраслевые модули'),
        t('landing.pricing.pro.f3', 'Приоритетная поддержка 24/7'),
        t('landing.pricing.pro.f4', 'Продвинутая аналитика и отчеты'),
        t('landing.pricing.pro.f5', 'Интеграция по API')
      ],
      popular: true,
      btn: t('landing.pricing.pro.btn', 'Попробовать Pro')
    },
    {
      name: t('landing.pricing.enterprise.name', 'Enterprise'),
      desc: t('landing.pricing.enterprise.desc', 'Для крупных сетей'),
      price: t('landing.pricing.enterprise.price', 'По запросу'),
      period: '',
      features: [
        t('landing.pricing.enterprise.f1', 'Неограниченно пользователей'),
        t('landing.pricing.enterprise.f2', 'Кастомные модули'),
        t('landing.pricing.enterprise.f3', 'Персональный менеджер'),
        t('landing.pricing.enterprise.f4', 'Установка на ваш сервер (On-premise)'),
        t('landing.pricing.enterprise.f5', 'SLA 99.9%')
      ],
      popular: false,
      btn: t('landing.pricing.enterprise.btn', 'Связаться с нами')
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-50 rounded-full blur-[100px] pointer-events-none opacity-50"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20" key={i18n.language}>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4 animate-text-flip">
            {t('landing.pricing.title', 'Простые и прозрачные цены')}
          </h2>
          <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto animate-text-flip" style={{ animationDelay: '0.1s' }}>
            {t('landing.pricing.subtitle', 'Выберите план, который идеально подходит для вашего бизнеса. Все планы включают 14 дней бесплатного периода.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <div 
              key={`${i}-${i18n.language}`}
              className={`relative bg-white rounded-[2rem] p-8 transition-transform duration-300 hover:-translate-y-2 animate-text-flip ${
                plan.popular 
                  ? 'border-2 border-blue-500 shadow-2xl shadow-blue-500/20' 
                  : 'border border-slate-100 shadow-xl shadow-slate-200/50'
              }`}
              style={{ animationDelay: `${0.2 + (i * 0.1)}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase shadow-md">
                  {t('landing.pricing.popular', 'Самый популярный')}
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-slate-500 text-sm">{plan.desc}</p>
              </div>

              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                {plan.period && <span className="text-slate-500 font-medium">{plan.period}</span>}
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600 font-medium text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                className={`w-full py-4 rounded-xl font-bold transition-all ${
                  plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-900'
                }`}
              >
                {plan.btn}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
