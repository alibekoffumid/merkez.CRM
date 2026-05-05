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
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import { toast } from 'react-hot-toast';
import { RetailProduct, CartItem } from '../../../types/retail';
import { UserProfile } from '../../../types/auth';

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  activeModules: string[];
  // ... other properties if needed
}

// Local interfaces removed as they are now imported

const RetailPOS: React.FC = () => {
  const { profile } = useUser() as UserContextType;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RetailProduct[]>([]);
  
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

  const addToCart = (product: RetailProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setBarcodeInput('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput) return;

    try {
      const { data, error } = await supabase
        .from('retail_products')
        .select('*')
        .eq('barcode', barcodeInput)
        .single();

      if (error || !data) {
        toast.error('Товар не найден');
      } else {
        addToCart(data);
      }
    } catch (err) {
      console.error(err);
    }
    setBarcodeInput('');
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('retail_products')
      .select('*')
      .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
      .limit(5);

    if (data) setSearchResults(data as RetailProduct[]);
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

  const subtotal = cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
  const tax = subtotal * 0.18; // 18% VAT Azerbaijan
  const total = subtotal; // Assuming VAT included in price for retail
  const change = parseFloat(cashReceived) ? parseFloat(cashReceived) - total : 0;

  const handleProcessSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      if (!profile?.id) throw new Error('Пользователь не авторизован');
      const { data, error } = await supabase.rpc('process_retail_sale', {
        p_user_id: profile.id,
        p_total_amount: total,
        p_tax_amount: tax,
        p_payment_method: paymentMethod,
        p_items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price_at_sale: item.sale_price,
          excise_stamp: item.excise_stamp || null
        }))
      });

      if (error) throw error;

      toast.success('Продажа успешно завершена');
      setCart([]);
      setCashReceived('');
      // In real scenario, here we would trigger fiscal print
    } catch (err: any) {
      toast.error('Ошибка при обработке: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickProducts = [
    { id: 'pkg-1', name: 'Пакет маленький', price: 0.10, barcode: '000001' },
    { id: 'pkg-2', name: 'Пакет большой', price: 0.20, barcode: '000002' },
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
            <h1 className="text-lg font-bold text-gray-900">Mərkəz Retail POS</h1>
            <p className="text-xs text-gray-500 font-medium">Кассир: {profile?.full_name || 'Admin'}</p>
          </div>
        </div>
        
        <div className="flex-1 max-w-xl mx-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Поиск товара по названию или штрих-коду..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-merkez-blue/20 transition-all"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              {searchResults.map(p => (
                <button 
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-none"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-gray-800">{p.name}</span>
                    <span className="text-xs text-gray-500">{p.barcode}</span>
                  </div>
                  <span className="font-bold text-merkez-blue">{p.sale_price.toFixed(2)} ₼</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-green-50 rounded-lg flex items-center gap-2 border border-green-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Online</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Cart & Quick Buttons */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Barcode Scanner Input (Hidden or Small) */}
          <form onSubmit={handleBarcodeSubmit} className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Barcode className="w-5 h-5 text-merkez-blue" />
              <span className="h-4 w-[1px] bg-gray-300 mx-1" />
            </div>
            <input 
              ref={barcodeRef}
              type="text"
              className="w-full pl-16 pr-4 py-4 bg-white border-2 border-transparent focus:border-merkez-blue rounded-2xl shadow-sm text-xl font-mono tracking-[0.2em] transition-all outline-none"
              placeholder="СКАНИРУЙТЕ ШТРИХ-КОД..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
            />
          </form>

          {/* Cart Table */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Текущий чек</span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{cart.length} Позиций</span>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-50">
                  <div className="p-6 bg-gray-100 rounded-full">
                    <Package className="w-12 h-12" />
                  </div>
                  <p className="font-medium">Корзина пуста. Начните сканирование.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr className="text-left text-xs font-bold text-gray-400 border-b border-gray-50">
                      <th className="px-6 py-4 uppercase">Наименование</th>
                      <th className="px-6 py-4 uppercase text-center">Кол-во</th>
                      <th className="px-6 py-4 uppercase text-right">Цена</th>
                      <th className="px-6 py-4 uppercase text-right">Итого</th>
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
                                ТРЕБУЕТСЯ АКЦИЗ
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
                        <td className="px-6 py-4 text-right font-medium text-gray-600">
                          {item.sale_price.toFixed(2)} ₼
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          {(item.sale_price * item.quantity).toFixed(2)} ₼
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
                <span className="text-xs font-black text-merkez-blue">{p.price.toFixed(2)} ₼</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Checkout Panel */}
        <div className="w-[400px] bg-white border-l border-gray-100 flex flex-col shadow-2xl z-10">
          <div className="p-8 flex-1 flex flex-col gap-8">
            {/* Payment Method */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Способ оплаты</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'cash' 
                    ? 'border-merkez-blue bg-blue-50/50' 
                    : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <Banknote className={`w-6 h-6 ${paymentMethod === 'cash' ? 'text-merkez-blue' : 'text-gray-400'}`} />
                  <span className={`text-xs font-bold ${paymentMethod === 'cash' ? 'text-merkez-blue' : 'text-gray-500'}`}>Наличные</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'card' 
                    ? 'border-merkez-blue bg-blue-50/50' 
                    : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-merkez-blue' : 'text-gray-400'}`} />
                  <span className={`text-xs font-bold ${paymentMethod === 'card' ? 'text-merkez-blue' : 'text-gray-500'}`}>Карта</span>
                </button>
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>Подытог:</span>
                  <span>{subtotal.toFixed(2)} ₼</span>
                </div>
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>НДС (18%):</span>
                  <span>{tax.toFixed(2)} ₼</span>
                </div>
                <div className="h-[1px] bg-gray-100 w-full" />
                <div className="flex justify-between items-end pt-2">
                  <span className="text-lg font-bold text-gray-900">ИТОГО К ОПЛАТЕ:</span>
                  <span className="text-4xl font-black text-merkez-blue">{total.toFixed(2)} ₼</span>
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Получено</span>
                    <input 
                      type="number"
                      className="w-32 text-right text-2xl font-bold bg-transparent border-b-2 border-gray-100 focus:border-merkez-blue transition-all outline-none"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-between items-center py-4 px-6 bg-orange-50 rounded-2xl border border-orange-100">
                    <span className="font-bold text-orange-700">СДАЧА:</span>
                    <span className="text-2xl font-black text-orange-700">
                      {change > 0 ? change.toFixed(2) : '0.00'} ₼
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
                  Обработка...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-7 h-7" />
                  ЗАВЕРШИТЬ ПРОДАЖУ
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
            <p className="text-center mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
              F10 - Быстрая оплата | F2 - Новый чек
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailPOS;
