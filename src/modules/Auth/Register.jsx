import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building, ArrowRight, CheckCircle2 } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    businessName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulating API call
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }, 1500);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-12 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-merkez-green" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-500 mb-8">Welcome to Merkez. Redirecting you to your dashboard...</p>
          <div className="flex justify-center flex-col items-center">
             <div className="w-8 h-8 border-4 border-merkez-blue border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
      <div className="mb-10 flex items-center space-x-3">
        <div className="flex space-x-1.5">
          <div className="w-4 h-4 rounded-full bg-merkez-blue"></div>
          <div className="w-4 h-4 rounded-full bg-merkez-red"></div>
          <div className="w-4 h-4 rounded-full bg-merkez-yellow"></div>
          <div className="w-4 h-4 rounded-full bg-merkez-green"></div>
        </div>
        <span className="text-3xl font-black tracking-tight text-gray-900 italic">Merkez</span>
      </div>

      <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/60 p-10 md:p-14 border border-gray-100">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Get Started</h1>
          <p className="text-gray-500">Create a centralized workspace for your business</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Business Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                  <Building className="w-5 h-5" />
                </div>
                <input
                  required
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400 font-medium"
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input
                  required
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400 font-medium"
                  placeholder="Alex Johnson"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Work Email</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400 font-medium"
                placeholder="alex@acme.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  required
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Confirm Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-merkez-blue transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  required
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-merkez-blue text-white py-5 rounded-[2rem] font-bold text-lg hover:bg-blue-600 active:scale-[0.98] transition-all flex items-center justify-center group shadow-xl shadow-blue-200"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Create Account
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <p className="text-center text-gray-500 font-medium">
            Already have an account?{' '}
            <Link to="/" className="text-merkez-blue hover:underline font-bold">Login here</Link>
          </p>
        </form>

        <div className="mt-12 pt-8 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between text-[13px] text-gray-400 font-medium space-y-4 md:space-y-0">
          <p>© 2024 Merkez Unified CRM</p>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-gray-600">Privacy Policy</a>
            <a href="#" className="hover:text-gray-600">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
