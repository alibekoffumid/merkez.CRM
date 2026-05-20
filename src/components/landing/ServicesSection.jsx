import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Code2, Cloud, Briefcase, Smartphone, Cpu, Target, ArrowRight, Zap 
} from 'lucide-react';

const ServicesSection = () => {
  const { t, i18n } = useTranslation();

  const getIconForCategory = (id) => {
    switch(id) {
      case 'web': return <Code2 className="w-8 h-8 text-blue-500" />;
      case 'cloud': return <Cloud className="w-8 h-8 text-sky-500" />;
      case 'saas': return <Briefcase className="w-8 h-8 text-indigo-500" />;
      case 'mobile': return <Smartphone className="w-8 h-8 text-violet-500" />;
      case 'iot': return <Cpu className="w-8 h-8 text-emerald-500" />;
      case 'seo': return <Target className="w-8 h-8 text-orange-500" />;
      default: return <Zap className="w-8 h-8 text-yellow-500" />;
    }
  };

  const categories = t('services.categories', { returnObjects: true }) || [];

  return (
    <div id="services" className="bg-slate-50 font-sans text-slate-900">
      {/* Header Section */}
      <section className="pt-24 pb-16 px-6 relative overflow-hidden bg-white">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10" key={i18n.language}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-bold mb-6 animate-text-flip">
            <Zap className="w-4 h-4" />
            digitall.llc
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6 animate-text-flip" style={{ animationDelay: '0.1s' }}>
            {t('services.title')}
          </h2>
          <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed animate-text-flip" style={{ animationDelay: '0.2s' }}>
            {t('services.subtitle')}
          </p>
        </div>
      </section>

      {/* Services List */}
      <section className="py-16 lg:py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div key={i18n.language} className="space-y-16 lg:space-y-24">
            {Array.isArray(categories) && categories.map((category, index) => (
              <div key={index} className="flex flex-col gap-6 lg:gap-10">
                {/* Category Header */}
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center shrink-0">
                    {getIconForCategory(category.id)}
                  </div>
                  <h3 
                    className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight tracking-tight animate-text-flip"
                    style={{ animationDelay: `${index * 0.15}s` }}
                  >
                    {category.title}
                  </h3>
                </div>

                {/* Services Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.items && category.items.map((item, i) => (
                    <div 
                      key={i} 
                      className="relative bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-500 group flex flex-col overflow-hidden cursor-pointer animate-text-flip"
                      style={{ animationDelay: `${(index * 3 + i) * 0.08}s` }}
                    >
                      {/* Decorative background blob */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 to-transparent rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out"></div>
                      
                      {/* Accent line */}
                      <div className="w-10 h-1 bg-blue-500 rounded-full mb-5 group-hover:w-16 group-hover:bg-blue-600 transition-all duration-500 relative z-10"></div>

                      <div className="flex flex-col flex-1">
                        <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors duration-300 relative z-10">
                          {item.title}
                        </h4>
                        <p className="text-slate-500 leading-relaxed font-medium mb-6 flex-1 relative z-10">
                          {item.desc}
                        </p>
                      </div>

                      {/* Hover action link */}
                      <div className="flex items-center text-sm font-bold text-blue-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 relative z-10 mt-auto">
                        {t('services.learnMore', 'Подробнее')} <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServicesSection;
