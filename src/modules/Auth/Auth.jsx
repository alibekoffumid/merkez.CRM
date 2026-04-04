import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Building, ArrowRight, CheckCircle2, ChevronRight, Grape } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(from, { replace: true });
    });
  }, [navigate, from]);

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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-12 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-merkez-green" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email!</h2>
          <p className="text-gray-500 mb-8">We've sent a confirmation link to {formData.email}. Please verify your account to continue.</p>
          <button 
            onClick={() => setIsLogin(true)}
            className="text-merkez-blue font-bold hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
      <div className="mb-10 flex flex-col items-center space-y-4">
        <img src="/merkez-logo.svg" alt="Merkez Logo" className="w-24 h-24 object-contain" />
        <span className="text-3xl font-black tracking-tighter text-gray-900 uppercase">Merkez CRM</span>
      </div>

      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl shadow-gray-200/60 p-8 md:p-10 border border-gray-100 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col md:flex-row gap-10 items-stretch">
          
          {/* Left Side: Brand & Social */}
          <div className="flex-1 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-100 pb-8 md:pb-0 md:pr-10">
            <div className="mb-8">
              <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">
                {isLogin ? 'Welcome Back.' : 'Join Merkez.'}
              </h1>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                {isLogin 
                  ? 'Access your centralized restaurant management workspace.' 
                  : 'Start centralizing your business operations with our unified CRM.'}
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center space-x-3 py-4 bg-white border border-gray-200 rounded-2xl text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98] shadow-sm mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            
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
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">Business</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                        <Building className="w-4 h-4" />
                      </div>
                      <input required name="businessName" value={formData.businessName} onChange={handleChange} className="block w-full pl-10 pr-3 py-3.5 bg-gray-50/50 border border-transparent rounded-2xl text-sm text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100/50 outline-none transition-all placeholder:text-gray-300 font-medium" placeholder="Restaurant Name" />
                    </div>
                  </div>

                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
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
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">Work Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} className="block w-full pl-10 pr-3 py-3.5 bg-gray-50/50 border border-transparent rounded-2xl text-sm text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-50/50 outline-none transition-all placeholder:text-gray-300 font-medium" placeholder="name@work.com" />
                </div>
              </div>

              <div className={`space-y-1.5 ${isLogin ? 'col-span-2' : 'col-span-2 md:col-span-1'}`}>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input required type="password" name="password" value={formData.password} onChange={handleChange} className="block w-full pl-10 pr-3 py-3.5 bg-gray-50/50 border border-transparent rounded-2xl text-sm text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-50/50 outline-none transition-all placeholder:text-gray-300 font-medium" placeholder="••••••••" />
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-1">Confirm</label>
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
                      <span>{isLogin ? 'Sign In to Workspace' : 'Create Business Account'}</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>

              <p className="col-span-2 text-center text-gray-400 font-bold text-[10px] uppercase tracking-widest pt-2">
                {isLogin ? "No account?" : "Already joined?"}{' '}
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-merkez-blue hover:underline">
                  {isLogin ? 'Register' : 'Login'}
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
