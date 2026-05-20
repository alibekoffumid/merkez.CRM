import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Code2, Cloud, Briefcase, Smartphone, Cpu, Target, ArrowRight,
  Database, Network, Bot, Zap
} from 'lucide-react';
import { useUser } from '../core/UserContext';

const Services = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-gray-100 py-3 shadow-sm' : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="text-2xl font-black tracking-tighter transition-transform group-hover:scale-105">
              <span className="text-blue-600">digitall</span>
              <span className="text-slate-900">.llc</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link key={`home-${i18n.language}`} to="/" className="text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors animate-text-flip">
              {t('landing.nav.home', 'Главная')}
            </Link>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2">
              {['az', 'ru', 'en'].map(lang => (
                <button
                  key={lang}
                  onClick={() => i18n.changeLanguage(lang)}
                  className={`text-xs font-black uppercase w-8 h-8 rounded-lg transition-all ${
                    i18n.language === lang ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
            {!profile ? (
              <Link 
                to="/auth" 
                className="bg-blue-500 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-600 hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                {t('landing.hero.cta.start') || 'Start Free'}
              </Link>
            ) : (
              <Link 
                to="/dashboard" 
                className="bg-blue-500 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-600 hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24 px-6 relative overflow-hidden bg-white">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-bold mb-6">
            <Zap className="w-4 h-4" />
            digitall.llc
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
            {t('services.title')}
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
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
                  <h2 
                    className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight tracking-tight animate-text-flip"
                    style={{ animationDelay: `${index * 0.15}s` }}
                  >
                    {category.title}
                  </h2>
                </div>

                {/* Services Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.items && category.items.map((item, i) => (
                    <div 
                      key={i} 
                      className="relative bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-500 group flex flex-col overflow-hidden cursor-pointer"
                    >
                      {/* Decorative background blob */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 to-transparent rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out"></div>
                      
                      {/* Accent line */}
                      <div className="w-10 h-1 bg-blue-500 rounded-full mb-5 group-hover:w-16 group-hover:bg-blue-600 transition-all duration-500 relative z-10"></div>

                      <div className="flex flex-col flex-1 animate-flip" style={{ animationDelay: `${(index * 3 + i) * 0.08}s` }}>
                        <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors duration-300 relative z-10">
                          {item.title}
                        </h3>
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

      {/* CTA Section */}
      <section className="py-24 px-6 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 to-transparent"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
            {t('services.cta.title', 'Готовы начать проект?')}
          </h2>
          <p className="text-lg md:text-xl text-slate-300 font-medium mb-10 max-w-2xl mx-auto">
            {t('services.cta.desc', 'Свяжитесь с нами, и мы обсудим, как наши решения могут помочь вашему бизнесу расти быстрее.')}
          </p>
          <a href="mailto:contact@digitall.llc" className="inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-lg hover:-translate-y-1 transition-transform shadow-2xl shadow-blue-900/50">
            {t('services.cta.button', 'Связаться с нами')}
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-slate-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-2xl font-black tracking-tighter">
            <span className="text-blue-600">digitall</span><span className="text-slate-900">.llc</span>
          </div>
          <p className="text-slate-400 font-medium text-sm">
            © {new Date().getFullYear()} digitall.llc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Services;
