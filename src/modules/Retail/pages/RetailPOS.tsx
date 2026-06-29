import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote,
  Search,
  Package,
  ArrowRight,
  AlertCircle,
  Delete,
  CheckCircle2,
  History as HistoryIcon,
  Smartphone,
  PauseCircle,
  Play,
  Tag,
  Percent
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import { toast } from 'react-hot-toast';
import { RetailProduct, CartItem } from '../../../types/retail';
import { UserProfile } from '../../../types/auth';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ScannerQRWidget from '../components/ScannerQRWidget';
import { useSyncStatus } from '../../../hooks/useSyncStatus';
import { isElectron, initSyncManager } from '../../../services/syncManager';
import { searchLocalProducts, getLocalProductByBarcode, syncProductsToLocal } from '../../../services/productCache';
import { db } from '../../../services/offlineDB';
import { Cloud, CloudOff, CloudCog } from 'lucide-react';

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  activeModules: string[];
  // ... other properties if needed
}

// Local interfaces removed as they are now imported

const RetailPOS: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useUser() as UserContextType;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
  const [splitCash, setSplitCash] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RetailProduct[]>([]);
  const [showScannerQR, setShowScannerQR] = useState(false);
  const [parkedTransactions, setParkedTransactions] = useState<{id: string, items: CartItem[], total: number, timestamp: number}[]>([]);
  const [showParkedList, setShowParkedList] = useState(false);
  const [globalDiscountType, setGlobalDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null); // For item level discount
  const [expiredProduct, setExpiredProduct] = useState<any | null>(null);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input
  useEffect(() => {
    const focusTimer = setInterval(() => {
      if (document.activeElement?.tagName !== 'INPUT' && barcodeRef.current) {
        barcodeRef.current.focus();
      }
    }, 500);
    return () => clearInterval(focusTimer);
  }, []);

  // Load persisted data on mount
  useEffect(() => {
    const savedParked = localStorage.getItem('retail_parked_transactions');
    if (savedParked) {
      try {
        setParkedTransactions(JSON.parse(savedParked));
      } catch (e) {
        console.error('Failed to parse parked transactions');
      }
    }

    const savedCart = localStorage.getItem('retail_current_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart');
      }
    }
  }, []);

  // Initialize Sync Manager & Cache for Electron
  useEffect(() => {
    if (isElectron() && profile?.id) {
      initSyncManager();
      syncProductsToLocal(profile.id);
    }
  }, [profile?.id]);

  const { isOnline, pendingCount } = useSyncStatus();

  // Persist data on change
  useEffect(() => {
    localStorage.setItem('retail_parked_transactions', JSON.stringify(parkedTransactions));
  }, [parkedTransactions]);

  useEffect(() => {
    localStorage.setItem('retail_current_cart', JSON.stringify(cart));
  }, [cart]);

  // Realtime: Listen for barcode scans from Mobile Scanner
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel('scanner-pos-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'scanner_cart_events',
        filter: `user_id=eq.${profile.id}`,
      }, async (payload: { new: Record<string, unknown> }) => {
        const event = payload.new;
        if (event.status === 'pending' && event.product_id) {
          handleProductSelection({
            id: event.product_id as string,
            name: event.product_name as string,
            price: event.price as number,
            sale_price: event.price as number,
            barcode: event.barcode as string,
            expiry_date: event.expiry_date as string,
          });
          // Mark event as processed
          await supabase.from('scanner_cart_events')
            .update({ status: 'added' })
            .eq('id', event.id as string);
          toast.success(`📱 ${event.product_name}`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const addToCart = (product: any) => {
    // Ensure we have a valid price before adding to cart
    const finalPrice = Number(product.price || product.sale_price || 0);
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1, sale_price: finalPrice } : item
        );
      }
      return [...prev, { ...product, quantity: 1, sale_price: finalPrice }];
    });
    setBarcodeInput('');
    setSearchQuery('');
    setSearchResults([]);
    setShowExpiredModal(false);
    setExpiredProduct(null);
  };

  const handleProductSelection = (product: any) => {
    if (product.expiry_date) {
      const expiry = new Date(product.expiry_date);
      const today = new Date();
      today.setHours(0,0,0,0);
      
      if (expiry < today) {
        setExpiredProduct(product);
        setShowExpiredModal(true);
        return;
      }
    }
    addToCart(product);
  };

  const handleBarcodeSubmitRef = useRef(async (e?: React.FormEvent, barcodeOverride?: string) => {
    if (e) e.preventDefault();
    const barcode = barcodeOverride || barcodeInput.trim();
    if (!barcode) return;

    if (!profile?.id) {
      toast.error(t('common.unauthorized'));
      return;
    }

    try {
      let productData = null;

      if (isElectron() || !isOnline) {
        // Search locally
        productData = await getLocalProductByBarcode(barcode);
      } else {
        // Search Supabase
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', profile.id)
          .eq('barcode', barcode)
          .eq('is_deleted', false)
          .single();
        if (!error && data) productData = data;
      }

      if (productData) {
        handleProductSelection(productData);
      } else {
        toast.error(t('retail.barcodeNotFound'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('retail.barcodeNotFound'));
    }
    setBarcodeInput('');
  });

  // Global Hardware Scanner Listener
  useEffect(() => {
    let barcodeString = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in another input (like search or discount)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target.id !== 'main-barcode-input') {
        return;
      }

      const currentTime = Date.now();
      
      // Hardware scanners type very fast (usually < 30ms per char)
      // Human typing is slower. If gap is > 50ms, reset the string.
      if (currentTime - lastKeyTime > 50) {
        barcodeString = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (barcodeString.length > 3) {
          e.preventDefault();
          handleBarcodeSubmitRef.current(undefined, barcodeString);
          barcodeString = '';
        }
        return;
      }

      // Accumulate characters
      if (e.key.length === 1) {
        barcodeString += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      let results: RetailProduct[] = [];

      if (isElectron() || !isOnline) {
        results = await searchLocalProducts(query);
      } else {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', profile?.id || '')
          .eq('is_deleted', false)
          .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
          .not('barcode', 'is', null)
          .neq('barcode', '')
          .limit(5);

        if (error) {
          console.error('Search error:', error);
          return;
        }
        if (data) results = data as RetailProduct[];
      }

      setSearchResults(results);
    } catch (err) {
      console.error('Search crash prevented:', err);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleParkTransaction = () => {
    if (cart.length === 0) return;
    
    const currentTotal = cart.reduce((sum, item) => sum + ((item.sale_price || 0) * item.quantity), 0);
    const newParked = {
      id: Math.random().toString(36).substr(2, 9),
      items: [...cart],
      total: currentTotal,
      timestamp: Date.now()
    };
    
    setParkedTransactions(prev => [newParked, ...prev]);
    setCart([]);
    toast.success(t('retail.receiptParked'));
  };

  const handleResumeTransaction = (parked: any) => {
    setCart(parked.items);
    setParkedTransactions(prev => prev.filter(p => p.id !== parked.id));
    setShowParkedList(false);
    toast.success(t('retail.receiptRestored'));
  };

  const updateItemDiscount = (id: string, type: 'percent' | 'fixed', value: number) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, discount_type: type, discount_value: value } : item
    ));
    setEditingDiscountId(null);
  };

  const calculateItemPrice = (item: CartItem) => {
    const basePrice = Number(item.sale_price || item.price || 0);
    if (!item.discount_value) return basePrice;
    
    if (item.discount_type === 'percent') {
      return basePrice * (1 - item.discount_value / 100);
    } else {
      return Math.max(0, basePrice - item.discount_value);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (calculateItemPrice(item) * item.quantity), 0);
  
  const calculateGlobalDiscount = (base: number) => {
    if (!globalDiscountValue) return 0;
    if (globalDiscountType === 'percent') {
      return base * (globalDiscountValue / 100);
    } else {
      return Math.min(base, globalDiscountValue);
    }
  };

  const discountAmount = calculateGlobalDiscount(subtotal);
  const total = subtotal - discountAmount;
  const tax = total * 0.18;
  const change = parseFloat(cashReceived) ? parseFloat(cashReceived) - total : 0;

  const handleProcessSale = async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      if (!profile?.id) throw new Error(t('common.unauthorized'));

      const saleData = {
        p_user_id: profile.id,
        p_total_amount: total,
        p_tax_amount: tax,
        p_payment_method: paymentMethod,
        p_discount_amount: discountAmount,
        p_discount_type: globalDiscountType,
        p_split_cash: paymentMethod === 'split' ? (parseFloat(splitCash) || 0) : (paymentMethod === 'cash' ? total : 0),
        p_split_card: paymentMethod === 'split' ? Math.max(0, total - (parseFloat(splitCash) || 0)) : (paymentMethod === 'card' ? total : 0),
        p_items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price_at_sale: calculateItemPrice(item),
          base_price: Number(item.sale_price || item.price || 0),
          discount_amount: item.discount_value || 0,
          discount_type: item.discount_type || 'percent',
          excise_stamp: item.excise_stamp || null
        }))
      };

      if (isElectron() || !isOnline) {
        // Offline / Electron mode - save to local DB
        await db.pendingSales.add({
          user_id: saleData.p_user_id,
          total_amount: saleData.p_total_amount,
          tax_amount: saleData.p_tax_amount,
          payment_method: saleData.p_payment_method,
          discount_amount: saleData.p_discount_amount,
          discount_type: saleData.p_discount_type,
          split_cash: saleData.p_split_cash,
          split_card: saleData.p_split_card,
          items: saleData.p_items,
          created_at: new Date().toISOString(),
          synced: false
        });
        toast.success(isOnline ? t('retail.saleSuccess') : t('retail.offlineSaved'));
      } else {
        // Standard Web mode - save to Supabase directly
        const { error } = await supabase.rpc('process_retail_sale', saleData);
        if (error) throw error;
        toast.success(t('retail.saleSuccess'));
      }

      setCart([]);
      setCashReceived('');
      setSplitCash('');
      // Trigger background sync if online in Electron
      if (isElectron() && isOnline) {
        // Slight delay to allow UI to update
        setTimeout(() => {
          window.dispatchEvent(new Event('online'));
        }, 500);
      }
    } catch (err: any) {
      toast.error(t('common.error') + ': ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickProducts = [
    { id: '00000000-0000-0000-0000-000000000001', name: t('retail.pkgSmall'), price: 0.10, barcode: '000001' },
    { id: '00000000-0000-0000-0000-000000000002', name: t('retail.pkgLarge'), price: 0.20, barcode: '000002' },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header / Top Bar */}
      <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-merkez-blue/10 p-2 rounded-lg">
            <ShoppingCart className="w-6 h-6 text-merkez-blue" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{t('retail.posTitle')}</h1>
            <p className="text-xs text-gray-500 font-medium">{t('retail.cashier')}: {profile?.full_name || 'Admin'}</p>
          </div>
          
          {/* Offline Sync Indicator */}
          {isElectron() && (
            <div className="ml-4 flex items-center bg-gray-50 rounded-full px-3 py-1.5 border border-gray-100 shadow-inner">
              {isOnline ? (
                pendingCount > 0 ? (
                  <div className="flex items-center gap-1.5 text-yellow-600" title="Syncing...">
                    <CloudCog className="w-4 h-4 animate-pulse" />
                    <span className="text-xs font-bold">{pendingCount}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-green-500" title="Synced">
                    <Cloud className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">Online</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-1.5 text-red-500" title="Offline Mode">
                  <CloudOff className="w-4 h-4" />
                  <span className="text-xs font-bold">{pendingCount > 0 && pendingCount}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-1 max-w-xl mx-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder={t('retail.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-merkez-blue/20 transition-all"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              {searchResults.map(p => (
                <button 
                  key={p.id}
                  onClick={() => handleProductSelection(p)}
                  className="w-full flex items-center justify-between p-4 hover:bg-merkez-blue/5 border-b border-gray-50 transition-colors group"
                >
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-gray-800">{p.name}</span>
                    <span className="text-xs text-gray-500">{p.barcode}</span>
                  </div>
                  <span className="font-bold text-merkez-blue">
                    {Number(p.price || p.sale_price || 0).toFixed(2)} ₼
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
            <NavLink to="/retail/inventory" className="p-2 text-gray-500 hover:text-merkez-blue hover:bg-white rounded-lg transition-all" title={t('retail.inventory.title')}>
              <Package className="w-5 h-5" />
            </NavLink>
            <NavLink to="/retail/history" className="p-2 text-gray-500 hover:text-merkez-blue hover:bg-white rounded-lg transition-all" title={t('retail.history.title')}>
              <HistoryIcon className="w-5 h-5" />
            </NavLink>
            <button 
              onClick={() => setShowScannerQR(true)}
              className="p-2 text-gray-500 hover:text-merkez-blue hover:bg-white rounded-lg transition-all" 
              title={t('retail.connectScanner')}
            >
              <Smartphone className="w-5 h-5" />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowParkedList(!showParkedList)}
                className={`p-2 rounded-lg transition-all relative ${parkedTransactions.length > 0 ? 'text-orange-500 hover:bg-orange-50' : 'text-gray-400 hover:text-merkez-blue hover:bg-white'}`}
                title={t('retail.parkedReceipts')}
              >
                <PauseCircle className="w-5 h-5" />
                {parkedTransactions.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {parkedTransactions.length}
                  </span>
                )}
              </button>

              {showParkedList && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] w-72 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 text-sm">{t('retail.parkedReceipts')}</h3>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {parkedTransactions.length === 0 ? (
                      <div className="p-8 text-center">
                        <PauseCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">{t('retail.history.empty')}</p>
                      </div>
                    ) : (
                      parkedTransactions.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => handleResumeTransaction(p)}
                          className="w-full p-4 border-b border-gray-50 hover:bg-merkez-blue/5 flex items-center justify-between transition-colors text-left"
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-800">{p.total.toFixed(2)} ₼</p>
                            <p className="text-[10px] text-gray-400">{new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {p.items.length} {t('retail.positions')}</p>
                          </div>
                          <Play className="w-4 h-4 text-merkez-blue" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {!isElectron() && (
            <div className={`px-4 py-2 rounded-lg flex items-center gap-2 border ${isOnline ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                {isOnline ? t('retail.online') : 'OFFLINE'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Cart & Quick Buttons */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Barcode Scanner Input (Hidden or Small) */}
          <form onSubmit={(e) => handleBarcodeSubmitRef.current(e)} className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Barcode className="w-4 h-4 text-merkez-blue" />
              <span className="h-3 w-[1px] bg-gray-300 mx-1" />
            </div>
            <input 
              id="main-barcode-input"
              ref={barcodeRef}
              type="text"
              className="w-full pl-14 pr-4 py-3 bg-white border-2 border-transparent focus:border-merkez-blue rounded-2xl shadow-sm text-lg font-mono tracking-widest transition-all outline-none"
              placeholder={t('retail.scanBarcode')}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button 
                type="button"
                onClick={handleParkTransaction}
                disabled={cart.length === 0}
                className="p-2.5 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed group flex items-center gap-2"
                title={t('retail.receiptParked')}
              >
                <PauseCircle className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">{t('retail.park')}</span>
              </button>
            </div>
          </form>

          {/* Cart Table */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('retail.currentCheck')}</span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{cart.length} {t('retail.positions')}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-50">
                  <div className="p-6 bg-gray-100 rounded-full">
                    <Package className="w-12 h-12" />
                  </div>
                  <p className="font-medium">{t('retail.emptyCart')}</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr className="text-left text-xs font-bold text-gray-400 border-b border-gray-50">
                      <th className="px-6 py-4 uppercase">{t('retail.itemName')}</th>
                      <th className="px-6 py-4 uppercase text-center">{t('retail.quantity')}</th>
                      <th className="px-6 py-4 uppercase text-right">{t('retail.price')}</th>
                      <th className="px-6 py-4 uppercase text-right">{t('retail.total')}</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cart.map((item) => (
                      <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800">{item.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{item.barcode}</span>
                            {item.excise_stamp_required && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full w-fit border border-amber-100">
                                <AlertCircle className="w-3 h-3" />
                                {t('retail.exciseRequiredMsg')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                            >
                              <Minus className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="font-bold text-lg min-w-[20px] text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                            >
                              <Plus className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            {item.discount_value && item.discount_value > 0 ? (
                              <span className="text-xs text-gray-400 line-through">{(item.sale_price || 0).toFixed(2)} ₼</span>
                            ) : null}
                            <div className="flex items-center justify-end gap-2">
                              {item.discount_value && item.discount_value > 0 ? (
                                <span className="font-bold text-green-600">{calculateItemPrice(item).toFixed(2)} ₼</span>
                              ) : (
                                <span className="font-medium text-gray-600">{(item.sale_price || 0).toFixed(2)} ₼</span>
                              )}
                              <button 
                                onClick={() => setEditingDiscountId(editingDiscountId === item.id ? null : item.id)}
                                className={`p-1 rounded-md transition-all ${item.discount_value ? 'bg-green-50 text-green-600' : 'text-gray-300 hover:text-merkez-blue hover:bg-blue-50'}`}
                              >
                                <Tag className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          {editingDiscountId === item.id && (
                            <div className="absolute mt-2 right-12 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-50 animate-in zoom-in-95">
                              <div className="flex items-center gap-2 mb-2">
                                <button 
                                  onClick={() => updateItemDiscount(item.id, 'percent', item.discount_value || 0)}
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold ${item.discount_type === 'percent' ? 'bg-merkez-blue text-white' : 'bg-gray-100 text-gray-500'}`}
                                >%</button>
                                <button 
                                  onClick={() => updateItemDiscount(item.id, 'fixed', item.discount_value || 0)}
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold ${item.discount_type === 'fixed' ? 'bg-merkez-blue text-white' : 'bg-gray-100 text-gray-500'}`}
                                >₼</button>
                              </div>
                              <input 
                                type="number" 
                                autoFocus
                                className="w-20 px-3 py-1 bg-gray-50 border-none rounded-md text-xs font-bold focus:ring-2 focus:ring-merkez-blue/20 outline-none no-spinner text-center"
                                value={item.discount_value || ''}
                                onChange={(e) => updateItemDiscount(item.id, item.discount_type || 'percent', parseFloat(e.target.value) || 0)}
                                onBlur={() => setEditingDiscountId(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingDiscountId(null)}
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          {(calculateItemPrice(item) * item.quantity).toFixed(2)} ₼
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Quick Access Buttons */}
          <div className="grid grid-cols-4 gap-4 shrink-0">
            {quickProducts.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart({ 
                  id: p.id, 
                  user_id: profile?.id || '',
                  name: p.name, 
                  barcode: p.barcode, 
                  sale_price: p.price, 
                  purchase_price: 0,
                  stock_quantity: 999, 
                  critical_stock: 0,
                  category: 'Service', 
                  excise_stamp_required: false 
                })}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-merkez-blue/30 transition-all flex flex-col items-center gap-2 group"
              >
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-merkez-blue/5 transition-colors">
                  <Package className="w-5 h-5 text-gray-400 group-hover:text-merkez-blue" />
                </div>
                <span className="text-xs font-bold text-gray-700 text-center">{p.name}</span>
                <span className="text-xs font-black text-merkez-blue">{(p.price || 0).toFixed(2)} ₼</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Checkout Panel */}
        <div className="w-[400px] bg-white border-l border-gray-100 flex flex-col shadow-2xl z-10">
          <div className="p-8 flex-1 flex flex-col gap-8">
            {/* Payment Method */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('retail.paymentMethod')}</h3>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'cash' 
                    ? 'border-merkez-blue bg-blue-50/50' 
                    : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <Banknote className={`w-5 h-5 ${paymentMethod === 'cash' ? 'text-merkez-blue' : 'text-gray-400'}`} />
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${paymentMethod === 'cash' ? 'text-merkez-blue' : 'text-gray-500'}`}>{t('retail.cash')}</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'card' 
                    ? 'border-merkez-blue bg-blue-50/50' 
                    : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <CreditCard className={`w-5 h-5 ${paymentMethod === 'card' ? 'text-merkez-blue' : 'text-gray-400'}`} />
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${paymentMethod === 'card' ? 'text-merkez-blue' : 'text-gray-500'}`}>{t('retail.card')}</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('split')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'split' 
                    ? 'border-merkez-blue bg-blue-50/50' 
                    : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center -space-x-2">
                    <Banknote className={`w-5 h-5 z-10 bg-white rounded-full ${paymentMethod === 'split' ? 'text-merkez-blue' : 'text-gray-400'}`} />
                    <CreditCard className={`w-5 h-5 ${paymentMethod === 'split' ? 'text-merkez-blue' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${paymentMethod === 'split' ? 'text-merkez-blue' : 'text-gray-500'}`}>Split</span>
                </button>
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>{t('retail.subtotal')}</span>
                  <span>{(subtotal || 0).toFixed(2)} ₼</span>
                </div>
                <div className="flex justify-between items-center text-gray-500 font-medium">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-orange-500" />
                    <span>{t('retail.discount')}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-xl border border-gray-100">
                    <div className="flex gap-1 border-r border-gray-200 pr-1 mr-1">
                      <button 
                        onClick={() => setGlobalDiscountType('percent')}
                        className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold transition-all ${globalDiscountType === 'percent' ? 'bg-merkez-blue text-white shadow-sm' : 'text-gray-400'}`}
                      >%</button>
                      <button 
                        onClick={() => setGlobalDiscountType('fixed')}
                        className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold transition-all ${globalDiscountType === 'fixed' ? 'bg-merkez-blue text-white shadow-sm' : 'text-gray-400'}`}
                      >₼</button>
                    </div>
                    <input 
                      type="number"
                      className="w-16 bg-transparent border-none text-right font-bold text-gray-800 text-sm focus:ring-0 px-2 no-spinner"
                      value={globalDiscountValue || ''}
                      onChange={(e) => setGlobalDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="h-[1px] bg-gray-100 w-full" />
                <div className="flex justify-between items-end pt-2">
                  <span className="text-lg font-bold text-gray-900">{t('retail.totalToPay')}</span>
                  <span className="text-4xl font-black text-merkez-blue">{(total || 0).toFixed(2)} ₼</span>
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('retail.received')}</span>
                    <input 
                      type="number"
                      className="w-32 text-right text-2xl font-bold bg-transparent border-b-2 border-gray-100 focus:border-merkez-blue transition-all outline-none no-spinner px-2"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-between items-center py-4 px-6 bg-orange-50 rounded-2xl border border-orange-100">
                    <span className="font-bold text-orange-700">{t('retail.change')}</span>
                    <span className="text-2xl font-black text-orange-700">
                      {change > 0 ? change.toFixed(2) : '0.00'} ₼
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'split' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('retail.splitCash') || 'Наличными'}</span>
                    <input 
                      type="number"
                      className="w-32 text-right text-2xl font-bold text-green-600 bg-transparent border-b-2 border-gray-100 focus:border-merkez-blue transition-all outline-none no-spinner px-2"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-between items-center py-4 px-6 bg-blue-50 rounded-2xl border border-blue-100">
                    <span className="font-bold text-blue-700">{t('retail.splitCard') || 'Картой (остаток)'}</span>
                    <span className="text-2xl font-black text-blue-700">
                      {(total - (parseFloat(splitCash) || 0) > 0 ? total - (parseFloat(splitCash) || 0) : 0).toFixed(2)} ₼
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="p-6 bg-gray-50 border-t border-gray-100">
            <button 
              onClick={handleProcessSale}
              disabled={isProcessing || cart.length === 0}
              className={`
                w-full py-6 rounded-2xl flex items-center justify-center gap-3 text-xl font-bold shadow-xl transition-all
                ${isProcessing || cart.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-merkez-blue text-white hover:bg-blue-600 hover:-translate-y-1 active:translate-y-0 shadow-blue-500/20'
                }
              `}
            >
              {isProcessing ? (
                <>
                  <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  {t('retail.processing')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-7 h-7" />
                  {t('retail.processSale')}
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
            <p className="text-center mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
              F10 - {t('retail.quickSale')} | F2 - {t('retail.newCheck')}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Scanner QR Modal */}
      {showScannerQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <ScannerQRWidget onClose={() => setShowScannerQR(false)} />
        </div>
      )}

      {/* Expiry Warning Modal */}
      {showExpiredModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/40 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-red-100 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-2">{t('retail.productExpired')}</h2>
              <p className="text-sm text-gray-500 font-medium">
                <span className="font-bold text-red-600">"{expiredProduct?.name}"</span> {t('retail.exciseRequiredMsg')}
              </p>
              <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">
                {t('retail.expiryDate')}: {new Date(expiredProduct?.expiry_date).toLocaleDateString()}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button 
                onClick={() => { setShowExpiredModal(false); setExpiredProduct(null); }}
                className="py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
              >
                {t('retail.cancel')}
              </button>
              <button 
                onClick={() => addToCart(expiredProduct)}
                className="py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
              >
                {t('retail.sellAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailPOS;
