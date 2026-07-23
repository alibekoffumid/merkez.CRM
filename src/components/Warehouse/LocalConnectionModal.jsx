import React, { useState } from 'react';
import { Database, Link2, Key, Save, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const LocalConnectionModal = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(() => localStorage.getItem('merkez_supabase_url') || '');
  const [key, setKey] = useState(() => localStorage.getItem('merkez_supabase_key') || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const testUrl = url.trim();
    const testKey = key.trim();

    if (!testUrl || !testKey) {
      setTestResult({ success: false, message: 'Zəhmət olmasa URL və Anon Key daxil edin' });
      setTesting(false);
      return;
    }

    try {
      // Create a temporary client to test the connection
      const tempClient = createClient(testUrl, testKey);
      
      // Perform a minimal query to verify connection
      const { error } = await tempClient.from('categories').select('id').limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is just "no rows found", which is a successful connection!
        throw error;
      }

      setTestResult({ success: true, message: 'Məlumat bazası ilə əlaqə uğurla quruldu!' });
    } catch (err) {
      console.error('Test connection error:', err);
      setTestResult({ 
        success: false, 
        message: `Qoşulma xətası: ${err.message || 'Zəhmət olmasa ünvanı və açarı yoxlayın'}` 
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (url.trim() && key.trim()) {
      localStorage.setItem('merkez_supabase_url', url.trim());
      localStorage.setItem('merkez_supabase_key', key.trim());
    } else {
      localStorage.removeItem('merkez_supabase_url');
      localStorage.removeItem('merkez_supabase_key');
    }
    
    // Dispatch toggled event to refresh client instance
    window.dispatchEvent(new Event('merkez_supabase_client_changed'));
    window.location.reload();
  };

  const handleReset = () => {
    localStorage.removeItem('merkez_supabase_url');
    localStorage.removeItem('merkez_supabase_key');
    window.dispatchEvent(new Event('merkez_supabase_client_changed'));
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 leading-tight">Məlumat bazasına qoşulma</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Lokal Server / Bulud</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Server URL-i (Supabase URL)
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:54321 və ya https://xyz.supabase.co"
              className="block w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Keçid açarı (Anon Key)
            </label>
            <textarea
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Məlumat bazası üçün ictimai anon key daxil edin..."
              rows={3}
              className="block w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm text-sm resize-none"
            />
          </div>

          {testResult && (
            <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
              testResult.success 
                ? 'bg-green-50 border-green-100 text-green-700' 
                : 'bg-red-50 border-red-100 text-red-700'
            }`}>
              {testResult.success 
                ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> 
                : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              }
              <span className="text-xs font-bold leading-normal">{testResult.message}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {testing ? 'Yoxlanılır...' : 'Əlaqəni yoxla'}
            </button>
            
            <button
              onClick={handleSave}
              className="flex-1 py-4 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4 shrink-0" /> 
              <span className="text-center leading-snug">Yadda saxla və yenidən yüklə</span>
            </button>
          </div>

          <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Varsayılan buluda sıfırla
            </button>
            <button
              onClick={onClose}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Ləğv et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalConnectionModal;
