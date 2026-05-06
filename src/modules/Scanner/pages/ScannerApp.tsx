import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import { useTranslation } from 'react-i18next';
import BarcodeCamera from '../components/BarcodeCamera';
import type { ScannerMode, ScanFeedback, ScannedProduct, NewProductForm } from '../types/scanner';

interface UserProfile {
  id: string;
  full_name?: string;
  business_id?: string;
}

const ScannerApp: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useUser() as { profile: UserProfile | null };
  const [mode, setMode] = useState<ScannerMode>('pos');
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<ScannedProduct | null>(null);
  const [stockValue, setStockValue] = useState('');
  const [scanCount, setScanCount] = useState(0);

  const [newProduct, setNewProduct] = useState<NewProductForm>({
    name: '', barcode: '', category: 'Grocery',
    purchase_price: 0, sale_price: 0, stock_quantity: 0, critical_stock: 5
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Category suggestion based on barcode
  const suggestCategory = (barcode: string): string => {
    if (barcode.startsWith('20') || barcode.startsWith('21')) return 'Fruits/Veg';
    if (barcode.startsWith('50') || barcode.startsWith('46')) return 'Grocery';
    if (barcode.startsWith('869')) return 'Turkish Goods';
    return 'Other';
  };

  // Clear feedback after 3 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Realtime: Listen for status updates from POS (added/processed)
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel('scanner-status-sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'scanner_cart_events',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        const event = payload.new;
        if (event.status === 'added') {
          if (navigator.vibrate) navigator.vibrate([50, 30, 50]); // Success pattern
          setFeedback({ 
            type: 'success', 
            title: t('retail.scanConfirmed') || '✓ Принято кассой', 
            subtitle: event.product_name || '' 
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, t]);

  const lookupProduct = async (barcode: string): Promise<ScannedProduct | null> => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();
    if (!data) return null;
    return {
      ...data,
      sale_price: data.price || data.sale_price || 0,
      purchase_price: data.purchase_price || 0,
      stock_quantity: data.stock_quantity || 0,
      critical_stock: data.critical_stock || 5,
      excise_stamp_required: data.excise_stamp_required || false,
    } as ScannedProduct;
  };

  const handlePOSScan = async (barcode: string) => {
    if (!profile?.id) return;
    const product = await lookupProduct(barcode);
    
    if (product) {
      await supabase.from('scanner_cart_events').insert({
        user_id: profile.id,
        business_id: profile.business_id || profile.id,
        barcode,
        product_id: product.id,
        product_name: product.name,
        price: product.sale_price,
        quantity: 1,
        status: 'pending',
      });
      setScanCount(prev => prev + 1);
      setFeedback({ 
        type: 'info', 
        title: t('retail.sendingToPos') || 'Отправка на кассу...', 
        subtitle: product.name 
      });
    } else {
      await supabase.from('scanner_cart_events').insert({
        user_id: profile.id,
        business_id: profile.business_id || profile.id,
        barcode,
        status: 'not_found',
      });
      setFeedback({ 
        type: 'error', 
        title: t('retail.productNotFound') || 'Товар не найден', 
        subtitle: barcode 
      });
    }
  };

  const handleInventoryScan = async (barcode: string) => {
    const product = await lookupProduct(barcode);
    if (product) {
      setEditProduct(product);
      setStockValue(String(product.stock_quantity));
      setCameraActive(false);
    } else {
      setNewProduct(prev => ({ ...prev, barcode, category: suggestCategory(barcode) }));
      setShowProductForm(true);
      setCameraActive(false);
    }
  };

  const handleScan = useCallback((barcode: string) => {
    if (mode === 'pos') handlePOSScan(barcode);
    else handleInventoryScan(barcode);
  }, [mode, profile]);

  const saveNewProduct = async () => {
    if (!profile?.id || !newProduct.name) return;
    const { error } = await supabase.from('products').insert({
      ...newProduct,
      price: newProduct.sale_price,
      user_id: profile.id,
      business_id: profile.business_id || profile.id
    });
    if (!error) {
      setFeedback({ type: 'success', title: t('retail.productAdded') || '✓ Товар добавлен', subtitle: newProduct.name });
      setShowProductForm(false);
      setCameraActive(true);
      setNewProduct({ name: '', barcode: '', category: 'Grocery', purchase_price: 0, sale_price: 0, stock_quantity: 0, critical_stock: 5 });
    }
  };

  const updateStock = async () => {
    if (!editProduct) return;
    const { error } = await supabase.from('products')
      .update({ stock_quantity: parseInt(stockValue) || 0 })
      .eq('id', editProduct.id);
    if (!error) {
      setFeedback({ type: 'success', title: t('retail.stockUpdated') || '✓ Остаток обновлён', subtitle: `${editProduct.name}: ${stockValue}` });
      setEditProduct(null);
      setCameraActive(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col text-white select-none" style={{ touchAction: 'manipulation' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 backdrop-blur-xl z-20 safe-area-top">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-merkez-blue rounded-xl flex items-center justify-center relative">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
            </svg>
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          <div>
            <p className="text-xs font-black tracking-wider text-white/60">MƏRKƏZ</p>
            <p className="text-sm font-bold -mt-0.5">{profile?.full_name || 'Scanner'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'pos' && (
            <div className="px-3 py-1 bg-green-500/20 rounded-full text-[10px] font-black text-green-400 uppercase tracking-widest">
              {scanCount} {t('retail.sent') || 'sent'}
            </div>
          )}
          <button onClick={handleLogout} className="p-2 text-white/40 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/50">
        <button onClick={() => setMode('pos')} className={`flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${mode === 'pos' ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-white/40'}`}>
          📦 {t('retail.pos') || 'POS'}
        </button>
        <button onClick={() => setMode('inventory')} className={`flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${mode === 'inventory' ? 'bg-merkez-blue text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-white/40'}`}>
          📋 {t('retail.inventory') || 'Inventory'}
        </button>
      </div>

      {/* Camera viewport */}
      <div className="flex-1 relative overflow-hidden">
        <BarcodeCamera onScan={handleScan} isActive={cameraActive} />
      </div>

      {/* Scan feedback overlay */}
      {feedback && (
        <div className={`absolute bottom-24 left-4 right-4 z-30 p-5 rounded-3xl backdrop-blur-xl border animate-in slide-in-from-bottom duration-300 ${
          feedback.type === 'success' ? 'bg-green-500/20 border-green-500/30' :
          feedback.type === 'error' ? 'bg-red-500/20 border-red-500/30' :
          'bg-blue-500/20 border-blue-500/30'
        }`}>
          <p className="text-lg font-black">{feedback.title}</p>
          <p className="text-sm text-white/60 font-bold mt-0.5">{feedback.subtitle}</p>
        </div>
      )}

      {/* Bottom info */}
      <div className="px-4 py-4 bg-gray-900/80 backdrop-blur-xl safe-area-bottom">
        <p className="text-center text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
          {mode === 'pos' ? 'Наведите камеру на штрих-код товара' : 'Сканируйте товар для проверки/добавления'}
        </p>
      </div>

      {/* Inventory: Edit stock modal */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gray-900 rounded-t-[2rem] p-6 space-y-5 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />
            <h2 className="text-xl font-black">{editProduct.name}</h2>
            <p className="text-sm text-white/50 font-mono">{editProduct.barcode}</p>
            <div className="flex items-center gap-4">
              <label className="text-xs font-black text-white/40 uppercase tracking-widest">Остаток</label>
              <input type="number" value={stockValue} onChange={(e) => setStockValue(e.target.value)}
                className="flex-1 bg-white/10 rounded-2xl px-5 py-4 text-2xl font-black text-center border border-white/10 focus:border-merkez-blue outline-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setEditProduct(null); setCameraActive(true); }} className="flex-1 py-4 bg-white/10 rounded-2xl font-bold">Отмена</button>
              <button onClick={updateStock} className="flex-1 py-4 bg-merkez-blue rounded-2xl font-bold shadow-lg shadow-blue-500/30">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory: New product form */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gray-900 rounded-t-[2rem] p-6 space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />
            <h2 className="text-xl font-black">Новый товар</h2>
            <p className="text-xs font-mono text-white/40">{newProduct.barcode}</p>
            <input placeholder="Название товара" value={newProduct.name} onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-white/10 rounded-2xl px-5 py-4 font-bold border border-white/10 focus:border-merkez-blue outline-none" />
            <select value={newProduct.category} onChange={(e) => setNewProduct(p => ({ ...p, category: e.target.value }))}
              className="w-full bg-white/10 rounded-2xl px-5 py-4 font-bold border border-white/10 outline-none appearance-none">
              <option value="Grocery">Grocery</option>
              <option value="Alcohol">Alcohol</option>
              <option value="Tobacco">Tobacco</option>
              <option value="Dairy">Dairy</option>
              <option value="Other">Other</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase mb-1 block">Закупка ₼</label>
                <input type="number" value={newProduct.purchase_price || ''} onChange={(e) => setNewProduct(p => ({ ...p, purchase_price: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white/10 rounded-xl px-4 py-3 font-bold border border-white/10 focus:border-merkez-blue outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase mb-1 block">Продажа ₼</label>
                <input type="number" value={newProduct.sale_price || ''} onChange={(e) => setNewProduct(p => ({ ...p, sale_price: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white/10 rounded-xl px-4 py-3 font-bold border border-white/10 focus:border-merkez-blue outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-white/40 uppercase mb-1 block">Начальный остаток</label>
              <input type="number" value={newProduct.stock_quantity || ''} onChange={(e) => setNewProduct(p => ({ ...p, stock_quantity: parseInt(e.target.value) || 0 }))}
                className="w-full bg-white/10 rounded-xl px-4 py-3 font-bold border border-white/10 focus:border-merkez-blue outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowProductForm(false); setCameraActive(true); }} className="flex-1 py-4 bg-white/10 rounded-2xl font-bold">Отмена</button>
              <button onClick={saveNewProduct} className="flex-1 py-4 bg-merkez-blue rounded-2xl font-bold shadow-lg shadow-blue-500/30">Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerApp;
