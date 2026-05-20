import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Building2, Utensils, ShoppingCart, Package, Stethoscope, 
  GraduationCap, Truck, Wallet, PhoneCall, Globe, 
  MessageSquare, Users, CheckCircle2, ChevronRight, Menu, X, 
  ArrowRight, ShieldCheck, Zap, Layers, Smartphone, UserPlus, LayoutDashboard
} from 'lucide-react';
import { useUser } from '../core/UserContext';
import HeroDashboardMockup from '../components/landing/HeroDashboardMockup';
import ModulesShowcaseMockup from '../components/landing/ModulesShowcaseMockup';
import PricingSection from '../components/landing/PricingSection';
const Landing = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile, loading, modulesLoading, needsOnboarding } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeWidget, setActiveWidget] = useState({
    icon: Zap,
    value: '12+',
    label: 'Active Modules',
    color: 'bg-green-500'
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // No auto-redirect so logged in users can view the landing page

  const modules = [
    { id: 'restaurant', icon: Utensils, color: 'blue', emoji: '🍽️' },
    { id: 'retail', icon: ShoppingCart, color: 'green', emoji: '🛒' },
    { id: 'warehouse', icon: Package, color: 'yellow', emoji: '📦' },
    { id: 'dental', icon: Stethoscope, color: 'red', emoji: '🦷' },
    { id: 'education', icon: GraduationCap, color: 'purple', emoji: '🎓' },
    { id: 'fleet', icon: Truck, color: 'teal', emoji: '🚗' },
    { id: 'finance', icon: Wallet, color: 'orange', emoji: '💰' },
    { id: 'callCenter', icon: PhoneCall, color: 'pink', emoji: '📞' },
    { id: 'integrations', icon: MessageSquare, color: 'cyan', emoji: '💬' },
    { id: 'crm', icon: Users, color: 'blue', emoji: '👥' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-gray-100 py-3 shadow-sm' : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Left Side: Logo & Links */}
          <div className="flex items-center gap-12">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="text-2xl font-black tracking-tighter transition-transform group-hover:scale-105"><span className="text-blue-600">digitall</span><span className="text-slate-900">.llc</span></div>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" key={`modules-${i18n.language}`} className="text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors animate-text-flip">
                {t('landing.nav.modules')}
              </a>
              <Link to="/services" key={`services-${i18n.language}`} className="text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors animate-text-flip" style={{ animationDelay: '0.05s' }}>
                {t('services.title') || 'Услуги'}
              </Link>
              <a href="#how" key={`how-${i18n.language}`} className="text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors animate-text-flip" style={{ animationDelay: '0.1s' }}>
                {t('landing.nav.howItWorks')}
              </a>
              <a href="#pricing" key={`pricing-${i18n.language}`} className="text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors animate-text-flip" style={{ animationDelay: '0.15s' }}>
                {t('landing.nav.pricing')}
              </a>
            </div>
          </div>

          {/* Right Side: Lang & Actions */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6">
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
              <div className="h-4 w-px bg-gray-200"></div>
              {!profile ? (
                <div className="flex items-center gap-4">
                  <Link to="/auth" className="text-sm font-bold text-gray-900 hover:text-blue-500 transition-colors">
                    {t('landing.nav.login')}
                  </Link>
                  <Link 
                    to="/auth" 
                    className="bg-blue-500 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-600 hover:-translate-y-0.5 active:scale-95 transition-all"
                  >
                    {t('landing.hero.cta.start')}
                  </Link>
                </div>
              ) : (
                <Link 
                  to={needsOnboarding ? "/modules" : "/dashboard"} 
                  className="bg-blue-500 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-600 hover:-translate-y-0.5 active:scale-95 transition-all"
                >
                  {t('landing.nav.dashboard') || 'Dashboard'}
                </Link>
              )}
            </div>

            <button className="md:hidden text-gray-900" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-50 rounded-full blur-[120px] opacity-60 -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-green-50 rounded-full blur-[100px] opacity-40 translate-y-1/3 -translate-x-1/4"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-black uppercase tracking-widest mb-6 animate-bounce">
                <Zap className="w-3 h-3 fill-blue-600" />
                {t('landing.hero.badge')}
              </div>
              <div key={i18n.language}>
                <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-gray-900 leading-[1.05] mb-8 animate-text-flip">
                  {t('landing.hero.title')} <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-red-500">
                    {t('landing.hero.highlight')}
                  </span>
                </h1>
                <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 mb-10 animate-text-flip" style={{ animationDelay: '0.1s' }}>
                  {t('landing.hero.subtitle')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link 
                  to={profile ? (needsOnboarding ? "/modules" : "/dashboard") : "/auth"} 
                  className="w-full sm:w-auto bg-blue-500 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-blue-200 hover:bg-blue-600 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                >
                  {profile ? (t('landing.nav.dashboard') || 'Dashboard') : t('landing.hero.cta.start')}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
                </Link>
                <a 
                  href="#features" 
                  className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-100 px-10 py-5 rounded-[2rem] font-black text-lg hover:border-blue-500 hover:text-blue-500 transition-all text-center"
                >
                  {t('landing.hero.cta.explore')}
                </a>
              </div>
            </div>

            <div className="flex-1 relative">
              <div className="relative z-10 transform transition-transform duration-700 hover:scale-[1.02]">
                <HeroDashboardMockup onHoverItem={(data) => setActiveWidget(data || {
                  icon: Zap,
                  value: '12+',
                  label: 'Active Modules',
                  color: 'bg-green-500'
                })} />
              </div>
              {/* Floating stats card */}
              <div className="absolute -bottom-10 -left-10 z-20 bg-white p-6 rounded-3xl shadow-2xl border border-gray-50 hidden sm:block animate-float hover:scale-105 transition-transform cursor-pointer shadow-blue-900/5">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${activeWidget.color} flex items-center justify-center text-white transition-colors duration-300`}>
                    <activeWidget.icon className={`w-6 h-6 ${activeWidget.icon === Zap ? 'fill-white' : ''}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900 transition-all">{activeWidget.value}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeWidget.label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="features" className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div key={i18n.language} className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-blue-500 font-black text-xs uppercase tracking-[0.3em] mb-4 block animate-text-flip">
              {t('landing.nav.modules')}
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-gray-900 mb-6 animate-text-flip" style={{ animationDelay: '0.1s' }}>
              {t('landing.features.title')}
            </h2>
            <p className="text-gray-500 font-medium animate-text-flip" style={{ animationDelay: '0.2s' }}>
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {modules.map((module) => (
              <div 
                key={module.id}
                className="bg-white p-8 rounded-[2rem] border border-gray-100 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-100/50 transition-all group cursor-default"
              >
                <div className={`relative w-16 h-16 rounded-2xl mb-8 flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500 ${
                  module.color === 'blue' ? 'text-blue-500' :
                  module.color === 'green' ? 'text-green-500' :
                  module.color === 'yellow' ? 'text-amber-500' :
                  module.color === 'red' ? 'text-red-500' :
                  module.color === 'purple' ? 'text-purple-500' :
                  module.color === 'teal' ? 'text-teal-500' :
                  module.color === 'orange' ? 'text-orange-500' :
                  module.color === 'pink' ? 'text-pink-500' :
                  module.color === 'cyan' ? 'text-cyan-500' :
                  'text-gray-500'
                }`}>
                  {/* Glowing background blur */}
                  <div className={`absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 blur-md ${
                    module.color === 'blue' ? 'bg-blue-500' :
                    module.color === 'green' ? 'bg-green-500' :
                    module.color === 'yellow' ? 'bg-amber-500' :
                    module.color === 'red' ? 'bg-red-500' :
                    module.color === 'purple' ? 'bg-purple-500' :
                    module.color === 'teal' ? 'bg-teal-500' :
                    module.color === 'orange' ? 'bg-orange-500' :
                    module.color === 'pink' ? 'bg-pink-500' :
                    module.color === 'cyan' ? 'bg-cyan-500' :
                    'bg-gray-500'
                  }`}></div>
                  
                  {/* Glassy border and surface */}
                  <div className={`absolute inset-0 rounded-2xl border bg-white/60 backdrop-blur-xl transition-all duration-500 overflow-hidden ${
                    module.color === 'blue' ? 'border-blue-500/20 group-hover:border-blue-500/50 shadow-[0_8px_30px_rgba(59,130,246,0.12)] group-hover:shadow-[0_8px_30px_rgba(59,130,246,0.25)]' :
                    module.color === 'green' ? 'border-green-500/20 group-hover:border-green-500/50 shadow-[0_8px_30px_rgba(34,197,94,0.12)] group-hover:shadow-[0_8px_30px_rgba(34,197,94,0.25)]' :
                    module.color === 'yellow' ? 'border-amber-500/20 group-hover:border-amber-500/50 shadow-[0_8px_30px_rgba(245,158,11,0.12)] group-hover:shadow-[0_8px_30px_rgba(245,158,11,0.25)]' :
                    module.color === 'red' ? 'border-red-500/20 group-hover:border-red-500/50 shadow-[0_8px_30px_rgba(239,68,68,0.12)] group-hover:shadow-[0_8px_30px_rgba(239,68,68,0.25)]' :
                    module.color === 'purple' ? 'border-purple-500/20 group-hover:border-purple-500/50 shadow-[0_8px_30px_rgba(168,85,247,0.12)] group-hover:shadow-[0_8px_30px_rgba(168,85,247,0.25)]' :
                    module.color === 'teal' ? 'border-teal-500/20 group-hover:border-teal-500/50 shadow-[0_8px_30px_rgba(20,184,166,0.12)] group-hover:shadow-[0_8px_30px_rgba(20,184,166,0.25)]' :
                    module.color === 'orange' ? 'border-orange-500/20 group-hover:border-orange-500/50 shadow-[0_8px_30px_rgba(249,115,22,0.12)] group-hover:shadow-[0_8px_30px_rgba(249,115,22,0.25)]' :
                    module.color === 'pink' ? 'border-pink-500/20 group-hover:border-pink-500/50 shadow-[0_8px_30px_rgba(236,72,153,0.12)] group-hover:shadow-[0_8px_30px_rgba(236,72,153,0.25)]' :
                    module.color === 'cyan' ? 'border-cyan-500/20 group-hover:border-cyan-500/50 shadow-[0_8px_30px_rgba(6,182,212,0.12)] group-hover:shadow-[0_8px_30px_rgba(6,182,212,0.25)]' :
                    'border-gray-500/20 group-hover:border-gray-500/50 shadow-[0_8px_30px_rgba(107,114,128,0.12)] group-hover:shadow-[0_8px_30px_rgba(107,114,128,0.25)]'
                  }`}>
                    {/* Top glass shine */}
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80"></div>
                  </div>

                  {/* Icon */}
                  <module.icon className="relative w-8 h-8 z-10 transition-transform duration-500" strokeWidth={1.5} />
                </div>
                <div key={i18n.language} className="animate-text-flip">
                  <h3 className="text-lg font-black text-gray-900 mb-2">{t(`${module.id}.title`)}</h3>
                  <p className="text-sm text-gray-400 font-medium leading-relaxed">
                    {t(`${module.id}.subtitle`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1">
              <div className="relative z-10 transform transition-transform duration-700 hover:scale-[1.02]">
                <ModulesShowcaseMockup />
              </div>
            </div>
            <div className="flex-1" key={i18n.language}>
              <span className="text-blue-500 font-black text-xs uppercase tracking-[0.3em] mb-4 block animate-text-flip">
                {t('landing.why.title')}
              </span>
              <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-10 leading-tight animate-text-flip" style={{ animationDelay: '0.1s' }}>
                {t('landing.why.subtitle')}
              </h2>

              <div className="space-y-8">
                {[
                  { id: 'modular', icon: Layers, color: 'blue' },
                  { id: 'multilingual', icon: Globe, color: 'green' },
                  { id: 'mobile', icon: Smartphone, color: 'orange' },
                ].map((item) => (
                  <div key={item.id} className="flex gap-6">
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div className="animate-text-flip" style={{ animationDelay: `${0.2 + (['modular', 'multilingual', 'mobile'].indexOf(item.id) * 0.1)}s` }}>
                      <h4 className="text-xl font-black text-gray-900 mb-2">{t(`landing.why.${item.id}.title`)}</h4>
                      <p className="text-gray-500 font-medium text-sm leading-relaxed">
                        {t(`landing.why.${item.id}.desc`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section id="how" className="py-24 bg-gray-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20" key={i18n.language}>
            <h2 className="text-4xl font-black tracking-tight mb-4 animate-text-flip">{t('landing.how.title')}</h2>
            <div className="w-20 h-1 bg-blue-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { num: 1, icon: <UserPlus className="w-8 h-8 text-blue-500" />, bg: "bg-blue-500/10", border: "border-blue-500/20" },
              { num: 2, icon: <Layers className="w-8 h-8 text-emerald-500" />, bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              { num: 3, icon: <LayoutDashboard className="w-8 h-8 text-purple-500" />, bg: "bg-purple-500/10", border: "border-purple-500/20" }
            ].map((step) => (
              <div key={step.num} className="relative group">
                <div className="text-[120px] font-black text-white/5 absolute -top-16 -left-4 group-hover:text-blue-500/10 transition-colors pointer-events-none">
                  0{step.num}
                </div>
                <div className="relative z-10 pt-10" key={i18n.language}>
                  <div className={`mb-6 w-16 h-16 rounded-2xl ${step.bg} ${step.border} border flex items-center justify-center shadow-lg transition-transform group-hover:-translate-y-2 group-hover:scale-110 duration-300`}>
                    {step.icon}
                  </div>
                  <div className="animate-text-flip" style={{ animationDelay: `${0.1 * step.num}s` }}>
                    <h3 className="text-2xl font-black mb-4">{t(`landing.how.step${step.num}.title`)}</h3>
                    <p className="text-gray-400 font-medium">
                      {t(`landing.how.step${step.num}.desc`)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* CTA Section */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-600 to-blue-700 rounded-[3rem] p-16 relative overflow-hidden shadow-2xl shadow-blue-200">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
          
          <div className="relative z-10" key={i18n.language}>
            <h2 className="text-4xl font-black text-white mb-6 animate-text-flip">
              {t('landing.cta.title')}
            </h2>
            <p className="text-blue-100 text-lg font-medium mb-10 animate-text-flip" style={{ animationDelay: '0.1s' }}>
              {t('landing.cta.subtitle')}
            </p>
            <div className="animate-text-flip" style={{ animationDelay: '0.2s' }}>
              <Link 
                to={profile ? (needsOnboarding ? "/modules" : "/dashboard") : "/auth"} 
                className="inline-flex items-center gap-3 bg-white text-blue-600 px-12 py-5 rounded-[2rem] font-black text-xl hover:bg-gray-50 active:scale-95 transition-all shadow-xl"
              >
                {profile ? (t('landing.nav.dashboard') || 'Dashboard') : t('landing.hero.cta.start')}
                <ChevronRight className="w-6 h-6" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="max-w-sm" key={i18n.language}>
              <Link to="/" className="flex items-center gap-3 mb-6 group">
                <div className="text-2xl font-black tracking-tighter"><span className="text-blue-600">digitall</span><span className="text-slate-900">.llc</span></div>
              </Link>
              <p className="text-gray-400 font-medium text-sm leading-relaxed animate-text-flip">
                {t('landing.footer.desc')}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div key={`platform-${i18n.language}`}>
                <h5 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 animate-text-flip">{t('landing.footer.platform', 'Platforma')}</h5>
                <ul className="space-y-4 animate-text-flip" style={{ animationDelay: '0.1s' }}>
                  <li><a href="#features" className="text-sm font-bold text-gray-600 hover:text-blue-500 transition-colors">{t('landing.nav.modules')}</a></li>
                  <li><a href="#how" className="text-sm font-bold text-gray-600 hover:text-blue-500 transition-colors">{t('landing.nav.howItWorks')}</a></li>
                  <li><a href="#pricing" className="text-sm font-bold text-gray-600 hover:text-blue-500 transition-colors">{t('landing.nav.pricing')}</a></li>
                </ul>
              </div>
              <div key={`contact-${i18n.language}`}>
                <h5 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6 animate-text-flip">{t('landing.footer.contact', 'Əlaqə')}</h5>
                <ul className="space-y-4 animate-text-flip" style={{ animationDelay: '0.1s' }}>
                  <li><a href="mailto:info@merkez-crm.com" className="text-sm font-bold text-gray-600 hover:text-blue-500 transition-colors">info@merkez-crm.com</a></li>
                  <li><a href="#" className="text-sm font-bold text-gray-600 hover:text-blue-500 transition-colors">WhatsApp</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4" key={i18n.language}>
            <div className="text-gray-400 text-sm font-medium animate-text-flip">
              © {new Date().getFullYear()} Merkez CRM. {t('landing.footer.rights', 'Все права защищены.')}
            </div>
            <div className="flex gap-6 animate-text-flip" style={{ animationDelay: '0.1s' }}>
              <a href="#" className="text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors">{t('landing.footer.privacy', 'Privacy Policy')}</a>
              <a href="#" className="text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors">{t('landing.footer.terms', 'Terms of Service')}</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Styles for animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        html { scroll-behavior: smooth; }
      `}} />
    </div>
  );
};

export default Landing;
