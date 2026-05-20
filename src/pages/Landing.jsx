import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Building2, Utensils, ShoppingCart, Package, Stethoscope, 
  GraduationCap, Truck, Wallet, PhoneCall, Globe, 
  MessageSquare, Users, CheckCircle2, ChevronRight, Menu, X, 
  ArrowRight, ShieldCheck, Zap, Layers, Smartphone
} from 'lucide-react';
import { useUser } from '../core/UserContext';
import HeroDashboardMockup from '../components/landing/HeroDashboardMockup';
import ModulesShowcaseMockup from '../components/landing/ModulesShowcaseMockup';
const Landing = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile, loading, modulesLoading, needsOnboarding } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logo.svg" alt="Merkez Logo" className="h-10 w-auto object-contain transition-transform group-hover:scale-105" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors">
              {t('landing.nav.modules')}
            </a>
            <a href="#how" className="text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors">
              {t('landing.nav.howItWorks')}
            </a>
            <a href="#pricing" className="text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors">
              {t('landing.nav.pricing')}
            </a>
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
              <>
                <Link to="/auth" className="text-sm font-bold text-gray-900 hover:text-blue-500 transition-colors">
                  {t('landing.nav.login')}
                </Link>
                <Link 
                  to="/auth" 
                  className="bg-blue-500 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-600 hover:-translate-y-0.5 active:scale-95 transition-all"
                >
                  {t('landing.hero.cta.start')}
                </Link>
              </>
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
                14 gün pulsuz sınaq
              </div>
              <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-gray-900 leading-[1.05] mb-8">
                {t('landing.hero.title')} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-red-500">
                  Bir Platformada
                </span>
              </h1>
              <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 mb-10">
                {t('landing.hero.subtitle')}
              </p>
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
                <HeroDashboardMockup />
              </div>
              {/* Floating stats card */}
              <div className="absolute -bottom-10 -left-10 z-20 bg-white p-6 rounded-3xl shadow-2xl border border-gray-50 hidden sm:block animate-float">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center text-white">
                    <Zap className="w-6 h-6 fill-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900">12+</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Modules</div>
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
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-blue-500 font-black text-xs uppercase tracking-[0.3em] mb-4 block">
              {t('landing.nav.modules')}
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-gray-900 mb-6">
              {t('landing.features.title')}
            </h2>
            <p className="text-gray-500 font-medium">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {modules.map((module) => (
              <div 
                key={module.id}
                className="bg-white p-8 rounded-[2rem] border border-gray-100 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-100/50 transition-all group cursor-default"
              >
                <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform bg-opacity-10 ${
                  module.color === 'blue' ? 'bg-blue-500 text-blue-500' :
                  module.color === 'green' ? 'bg-green-500 text-green-500' :
                  module.color === 'yellow' ? 'bg-yellow-500 text-yellow-500' :
                  module.color === 'red' ? 'bg-red-500 text-red-500' :
                  module.color === 'purple' ? 'bg-purple-500 text-purple-500' :
                  'bg-gray-500 text-gray-500'
                }`}>
                  <module.icon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">{t(`${module.id}.title`)}</h3>
                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                  {t(`${module.id}.subtitle`)}
                </p>
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
            <div className="flex-1">
              <span className="text-blue-500 font-black text-xs uppercase tracking-[0.3em] mb-4 block">
                {t('landing.why.title')}
              </span>
              <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-10 leading-tight">
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
                    <div>
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
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black tracking-tight mb-4">{t('landing.how.title')}</h2>
            <div className="w-20 h-1 bg-blue-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[1, 2, 3].map((num) => (
              <div key={num} className="relative group">
                <div className="text-[120px] font-black text-white/5 absolute -top-16 -left-4 group-hover:text-blue-500/10 transition-colors">
                  0{num}
                </div>
                <div className="relative z-10 pt-10">
                  <h3 className="text-2xl font-black mb-4">{t(`landing.how.step${num}.title`)}</h3>
                  <p className="text-gray-400 font-medium">
                    {t(`landing.how.step${num}.desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-600 to-blue-700 rounded-[3rem] p-16 relative overflow-hidden shadow-2xl shadow-blue-200">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl font-black text-white mb-6">
              {t('landing.cta.title')}
            </h2>
            <p className="text-blue-100 text-lg font-medium mb-10">
              {t('landing.cta.subtitle')}
            </p>
            <Link 
              to={profile ? (needsOnboarding ? "/modules" : "/dashboard") : "/auth"} 
              className="inline-flex items-center gap-3 bg-white text-blue-600 px-12 py-5 rounded-[2rem] font-black text-xl hover:bg-gray-50 active:scale-95 transition-all shadow-xl"
            >
              {profile ? (t('landing.nav.dashboard') || 'Dashboard') : t('landing.hero.cta.start')}
              <ChevronRight className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="max-w-sm">
              <Link to="/" className="flex items-center gap-3 mb-6 group">
                <img src="/logo.svg" alt="Merkez Logo" className="h-8 w-auto object-contain" />
              </Link>
              <p className="text-gray-400 font-medium text-sm leading-relaxed">
                {t('landing.footer.desc')}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div>
                <h5 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6">Platform</h5>
                <ul className="space-y-4">
                  <li><a href="#features" className="text-sm font-bold text-gray-600 hover:text-blue-500 transition-colors">Modullar</a></li>
                  <li><a href="#how" className="text-sm font-bold text-gray-600 hover:text-blue-500 transition-colors">Necə İşləyir</a></li>
                  <li><a href="#pricing" className="text-sm font-bold text-gray-600 hover:text-blue-500 transition-colors">Qiymətlər</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-6">Əlaqə</h5>
                <ul className="space-y-4">
                  <li><a href="mailto:info@merkez-crm.com" className="text-sm font-bold text-gray-600 hover:text-blue-500 transition-colors">info@merkez-crm.com</a></li>
                  <li><a href="#" className="text-sm font-bold text-gray-600 hover:text-blue-500 transition-colors">WhatsApp</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-xs font-bold">© 2026 Merkez CRM. Bütün hüquqlar qorunur.</p>
            <div className="flex gap-6">
              <a href="#" className="text-xs font-bold text-gray-400 hover:text-blue-500">Privacy Policy</a>
              <a href="#" className="text-xs font-bold text-gray-400 hover:text-blue-500">Terms of Service</a>
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
