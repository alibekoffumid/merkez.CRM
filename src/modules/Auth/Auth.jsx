import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Building, ArrowRight, CheckCircle2, ChevronRight, Grape } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import TelegramLoginButton from './TelegramLoginButton';
import { useTranslation } from 'react-i18next';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, needsOnboarding, loading: userLoading, modulesLoading } = useUser();
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    businessName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (!userLoading && profile && !modulesLoading) {
      if (needsOnboarding) {
        navigate('/modules', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [profile, userLoading, modulesLoading, needsOnboarding, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        if (error) throw error;
        navigate(from, { replace: true });
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              business_name: formData.businessName
            }
          }
        });
        if (error) throw error;
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    // Dynamically import Capacitor to check platform
    let isNative = false;
    try {
      const { Capacitor } = await import('@capacitor/core');
      isNative = Capacitor.isNativePlatform();
    } catch (e) {
      // Ignore if not found
    }

    if (isNative) {
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        GoogleAuth.initialize({
          clientId: '1023780426995-cf4l1e22s69kdroatndm4qf617sj8giv.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });

        const googleUser = await GoogleAuth.signIn();
        
        if (googleUser?.authentication?.idToken) {
          const { error: supaError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: googleUser.authentication.idToken,
          });
          if (supaError) throw supaError;
          
          // Force navigate to scanner after successful native login
          navigate('/scanner', { replace: true });
        } else {
          throw new Error('Google Sign-In failed to return an ID token.');
        }
      } catch (err) {
        console.error('Native Google Login Error:', err);
        setError('Google Login Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Web Version
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + (from === '/' ? '' : from),
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      if (error) setError(error.message);
      setLoading(false);
    }
  };

  const handleTelegramAuth = async (telegramUser) => {
    setLoading(true);
    setError(null);
    try {
      // Call our Edge Function to verify hash and get/create user
      const { data, error: functionError } = await supabase.functions.invoke('telegram-auth', {
        body: { user: telegramUser }
      });

      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error);

      // Sign in with the credentials returned by the Edge Function
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (authError) throw authError;

      // Force navigate to dashboard
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Telegram Auth Error:', err);
      setError('Telegram Login Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-12 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-merkez-green" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.checkEmail') || 'Check your email!'}</h2>
          <p className="text-gray-500 mb-8">{t('auth.verifyDesc') || "We've sent a confirmation link to "} <span className="font-bold text-gray-900">{formData.email}</span>{t('auth.verifyDescEnd') || ". Please verify your account to continue."}</p>
          <button 
            onClick={() => setIsLogin(true)}
            className="text-merkez-blue font-bold hover:underline"
          >
            {t('auth.backLogin') || 'Back to Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] relative">
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-gray-100 z-10">
        {[
          { code: 'ru', label: 'RU' },
          { code: 'en', label: 'EN' },
          { code: 'az', label: 'AZ' }
        ].map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              i18n.language === lang.code 
                ? 'bg-merkez-blue text-white shadow-md shadow-blue-500/20' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl shadow-gray-200/60 p-8 md:p-10 border border-gray-100 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col md:flex-row gap-10 items-stretch">
          
          {/* Left Side: Brand & Social */}
          <div className="flex-1 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-100 pb-8 md:pb-0 md:pr-10">
            <div className="mb-6">
              <div className="text-4xl sm:text-5xl font-black tracking-tighter mb-6"><span className="text-blue-600">digitall</span><span className="text-slate-900">.llc</span></div>
              <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">
                {isLogin ? (t('auth.welcomeBack') || 'Welcome Back.') : (t('auth.join') || 'Join Merkez.')}
              </h1>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                {isLogin 
                  ? (t('auth.descLogin') || 'Access your centralized restaurant management workspace.') 
                  : (t('auth.descRegister') || 'Start centralizing your business operations with our unified CRM.')}
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full max-w-[240px] mx-auto flex items-center justify-center space-x-3 py-4 bg-white border border-gray-200 rounded-2xl text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98] shadow-sm mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{t('auth.continueGoogle') || 'Continue with Google'}</span>
            </button>
            
            {/* Telegram login temporarily hidden — domain propagation pending
            <div className="mb-4">
               <TelegramLoginButton 
                 botName="merkezcrmbot" 
                 onAuth={handleTelegramAuth} 
                 buttonSize="large" 
                 cornerRadius={16}
               />
            </div>
            */}
            
            <div className="mt-auto pt-6 text-[11px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-between">
              <span>© 2024 Merkez</span>
              <div className="flex space-x-3">
                <a href="#" className="hover:text-merkez-blue transition-colors">Privacy</a>
                <a href="#" className="hover:text-merkez-blue transition-colors">Terms</a>
              </div>
            </div>
          </div>

          {/* Right Side: Email Auth */}
          <div className="flex-[1.2] pt-2">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-start animate-in fade-in slide-in-from-top-2">
                 <div className="mr-3">⚠️</div>
                 {error}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isLogin && (
                <>
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">{t('auth.businessName') || 'Business Name'}</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                        <Building className="w-4 h-4" />
                      </div>
                      <input required name="businessName" value={formData.businessName} onChange={handleChange} className="block w-full pl-10 pr-3 py-3.5 bg-gray-50/50 border border-transparent rounded-2xl text-sm text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100/50 outline-none transition-all placeholder:text-gray-300 font-medium" placeholder="Restaurant Name" />
                    </div>
                  </div>

                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">{t('auth.fullName') || 'Full Name'}</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                        <User className="w-4 h-4" />
                      </div>
                      <input required name="fullName" value={formData.fullName} onChange={handleChange} className="block w-full pl-10 pr-3 py-3.5 bg-gray-50/50 border border-transparent rounded-2xl text-sm text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100/50 outline-none transition-all placeholder:text-gray-300 font-medium" placeholder="John Doe" />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5 col-span-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">{t('auth.workEmail') || 'Work Email'}</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} className="block w-full pl-10 pr-3 py-3.5 bg-gray-50/50 border border-transparent rounded-2xl text-sm text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-50/50 outline-none transition-all placeholder:text-gray-300 font-medium" placeholder="name@work.com" />
                </div>
              </div>

              <div className={`space-y-1.5 ${isLogin ? 'col-span-2' : 'col-span-2 md:col-span-1'}`}>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">{t('auth.password') || 'Password'}</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input required type="password" name="password" value={formData.password} onChange={handleChange} className="block w-full pl-10 pr-3 py-3.5 bg-gray-50/50 border border-transparent rounded-2xl text-sm text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-50/50 outline-none transition-all placeholder:text-gray-300 font-medium" placeholder="••••••••" />
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">{t('auth.confirmPassword') || 'Confirm'}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input required type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="block w-full pl-10 pr-3 py-3.5 bg-gray-50/50 border border-transparent rounded-2xl text-sm text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-50/50 outline-none transition-all placeholder:text-gray-300 font-medium" placeholder="••••••••" />
                  </div>
                </div>
              )}

              <div className="col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-merkez-blue text-white py-4 rounded-2xl font-bold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all flex items-center justify-center group shadow-xl shadow-blue-100"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{isLogin ? (t('auth.signIn') || 'Sign In to Workspace') : (t('auth.createAccount') || 'Create Business Account')}</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>

              <p className="col-span-2 text-center text-gray-400 font-bold text-[10px] uppercase tracking-widest pt-2">
                {isLogin ? (t('auth.noAccount') || 'No account?') : (t('auth.alreadyJoined') || 'Already joined?')} {' '}
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-merkez-blue hover:underline">
                  {isLogin ? (t('auth.register') || 'Register') : (t('auth.login') || 'Login')}
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
