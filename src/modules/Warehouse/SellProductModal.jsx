import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Minus, Plus, Save, Package, User, Calendar, AlertCircle, Loader2, Trash2, ShoppingCart, Search, CreditCard, DollarSign } from 'lucide-react'; 
import { supabase } from '../../supabaseClient';
import ModalPortal from '../../components/Common/ModalPortal';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import Dropdown from '../../components/Common/Dropdown';
import DatePicker from '../../components/Common/DatePicker';
import QuickAddCustomerModal from './QuickAddCustomerModal';

const BANK_RATES = {
  'ABB Kredit': { 1: 0.0, 2: 0.02, 3: 0.03, 6: 0.055, 9: 0.08, 12: 0.10, 18: 0.17, 24: 0.23 },
  'Birkart': { 2: 0.032, 3: 0.043, 6: 0.074, 9: 0.10, 12: 0.13, 18: 0.17 },
  'Tamkart': { 2: 0.03, 3: 0.041, 6: 0.072, 9: 0.098, 12: 0.128, 18: 0.171, 24: 0.178 },
  'Kapital Kredit 35': { 2: 0.04, 3: 0.055, 6: 0.085, 12: 0.155, 18: 0.24, 24: 0.30, 35: 0.46 },
  'Ferrum Standart': { 3: 0.10, 6: 0.15, 9: 0.19, 12: 0.24 },
  'Ferrum Fast': { 3: 0.18, 6: 0.22 },
  'Ferrum DTI': { 3: 0.08, 6: 0.12, 9: 0.16, 12: 0.19 }
};

const SellProductModal = ({ isOpen, onClose, onSaleComplete, warehouseId }) => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const barcodeInputRef = useRef(null);

  // Sale metadata
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(''); // Empty string = Walk-in guest
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'card' | 'debt'
  const [notes, setNotes] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [installmentMonths, setInstallmentMonths] = useState(12);
  const [basePriceInput, setBasePriceInput] = useState(0);
  const [extraMarkup, setExtraMarkup] = useState(0);
  const [selectedBank, setSelectedBank] = useState('Birkart');
  const [bankSettings, setBankSettings] = useState([]);
  const [activeTariff, setActiveTariff] = useState(null);
  const [birmarketCategory, setBirmarketCategory] = useState('Alətlər'); // 'Alətlər' | 'Aksesuarlar'
  const [salesChannel, setSalesChannel] = useState('Mağaza'); // 'Mağaza' | 'Sosial şəbəkə'

  const handleCustomerAdded = (newCust) => {
    setCustomers(prev => [newCust, ...prev]);
    setSelectedCustomerId(newCust.id);
  };

  // Cart items
  const [cart, setCart] = useState([]);

  // Current item selectors
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: '1'
  });

  const playBeep = (success = true) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = success ? 880 : 220;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen && warehouseId) {
      fetchCategories();
      fetchProducts();
      fetchCustomers();
      fetchBankSettings();
      setCart([]);
      setSelectedCategoryId('');
      setBarcodeMode(false);
      setBarcodeBuffer('');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setSelectedCustomerId('');
      setPaymentMethod('cash');
      setNotes('');
      setBirmarketCategory('Alətlər');
      setSalesChannel('Mağaza');
      setCurrentItem({
        product_id: '',
        quantity: '1'
      });
    }
  }, [isOpen, warehouseId]);

  useEffect(() => {
    if (isOpen) {
      fetchActiveTariff();
    }
  }, [selectedBank, installmentMonths, isOpen]);

  useEffect(() => {
    const months = bankSettings.length > 0
      ? Array.from(new Set(bankSettings.filter(s => s.bank_name.toLowerCase() === selectedBank.toLowerCase()).map(s => s.months))).sort((a, b) => a - b)
      : Object.keys(BANK_RATES[selectedBank] || {}).map(Number).sort((a, b) => a - b);

    if (months.length > 0 && !months.includes(installmentMonths)) {
      setInstallmentMonths(months[0]);
    }
  }, [selectedBank, bankSettings]);

  const fetchCategories = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('categories')
      .select('id, name, parent_id')
      .eq('user_id', profile.id)
      .order('name');
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    if (!profile?.id || !warehouseId) return;
    const { data } = await supabase
      .from('products')
      .select('id, name, barcode, stock_quantity, price, category_id')
      .eq('user_id', profile.id)
      .eq('warehouse_id', warehouseId)
      .eq('is_deleted', false)
      .order('name');
    if (data) setProducts(data);
  };

  const fetchCustomers = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, debt_balance')
      .order('name');
    if (data) setCustomers(data);
  };

  const fetchBankSettings = async () => {
    const { data } = await supabase
      .from('bank_credit_tariffs')
      .select('bank_name, months, bank_percent');
    if (data) setBankSettings(data);
  };

  const fetchActiveTariff = async () => {
    const { data } = await supabase
      .from('bank_credit_tariffs')
      .select('bank_percent, tax_percent, store_percent')
      .eq('bank_name', selectedBank)
      .eq('months', installmentMonths)
      .maybeSingle();
    if (data) {
      setActiveTariff(data);
    } else {
      setActiveTariff(null);
    }
  };

  const handleCategoryChange = (val) => {
    setSelectedCategoryId(val);
    setCurrentItem(prev => ({ ...prev, product_id: '' }));
  };

  const handleProductChange = (productId) => {
    setCurrentItem(prev => ({
      ...prev,
      product_id: productId
    }));
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const barcode = barcodeBuffer.trim();
    if (!barcode) return;

    const product = products.find(p => p.barcode === barcode);
    if (product) {
      const existingItem = cart.find(item => item.product_id === product.id);
      const currentQtyInCart = existingItem ? existingItem.quantity : 0;
      
      if (currentQtyInCart + 1 > (product.stock_quantity || 0)) {
        playBeep(false);
        toast.error(`${t('warehouse.insufficientStock') || 'Məhsul anbarda kifayət deyil'}: ${product.stock_quantity || 0}`);
        setBarcodeBuffer('');
        return;
      }

      setCart(prevCart => {
        const existingIndex = prevCart.findIndex(item => item.product_id === product.id);
        if (existingIndex > -1) {
          const newCart = [...prevCart];
          newCart[existingIndex].quantity += 1;
          return newCart;
        } else {
          return [...prevCart, {
            product_id: product.id,
            quantity: 1,
            productName: product.name,
            price: Number(product.price || 0),
            currentStock: product.stock_quantity
          }];
        }
      });
      playBeep(true);
      toast.success(`${product.name} (+1)`);
    } else {
      playBeep(false);
      toast.error(t('warehouse.productNotFoundByBarcode') || 'Məhsul tapılmadı');
    }
    setBarcodeBuffer('');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  const filteredProducts = products.filter(p => {
    if (!selectedCategoryId) return true;
    if (p.category_id === selectedCategoryId) return true;
    const subIds = categories.filter(c => c.parent_id === selectedCategoryId).map(c => c.id);
    return subIds.includes(p.category_id);
  });

  const addToCart = () => {
    if (!currentItem.product_id || !currentItem.quantity) {
      toast.error(t('warehouse.selectProductAndQty') || 'Məhsulu və sayı seçin');
      return;
    }
    
    const qty = parseFloat(currentItem.quantity);
    if (qty <= 0) {
      toast.error(t('warehouse.invalidQuantity') || 'Düzgün say daxil edin');
      return;
    }

    const product = products.find(p => p.id === currentItem.product_id);
    if (!product) return;

    const existingItem = cart.find(item => item.product_id === currentItem.product_id);
    const newTotal = (existingItem ? existingItem.quantity : 0) + qty;

    if (newTotal > (product.stock_quantity || 0)) {
      toast.error(`${t('warehouse.insufficientStock') || 'Недостаточно товара на складе'}: ${product.stock_quantity || 0}`);
      return;
    }

    const existingIndex = cart.findIndex(item => item.product_id === currentItem.product_id);
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity = newTotal;
      setCart(newCart);
    } else {
      setCart([...cart, {
        product_id: product.id,
        quantity: qty,
        productName: product.name,
        price: Number(product.price || 0),
        currentStock: product.stock_quantity
      }]);
    }

    setCurrentItem({
      product_id: '',
      quantity: '1'
    });
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  useEffect(() => {
    setBasePriceInput(calculateTotal());
  }, [cart]);

  const getBankPercentForMonth = (m) => {
    const setting = bankSettings.find(
      s => s.bank_name.toLowerCase() === selectedBank.toLowerCase() && s.months === m
    );
    if (setting) return Number(setting.bank_percent);
    return (BANK_RATES[selectedBank]?.[m] || 0) * 100;
  };

  const selectedBankSettings = bankSettings.filter(s => s.bank_name.toLowerCase() === selectedBank.toLowerCase());
  const activeMonths = selectedBankSettings.length > 0
    ? Array.from(new Set(selectedBankSettings.map(s => s.months))).sort((a, b) => a - b)
    : Object.keys(BANK_RATES[selectedBank] || {}).map(Number).sort((a, b) => a - b);

  const netAmount = (Number(basePriceInput) || 0) + (Number(extraMarkup) || 0);

  // Retrieve rates dynamically from dynamic activeTariff query or Birmarket category commission
  let bankPercent = 0;
  let taxPercent = 4.0;
  let storePercent = 0;

  if (paymentMethod === 'birmarket') {
    const siteCommission = birmarketCategory === 'Alətlər' ? 10 : 15;
    bankPercent = siteCommission;
    taxPercent = 4.0;
    storePercent = 0;
  } else {
    bankPercent = activeTariff ? Number(activeTariff.bank_percent) : ((BANK_RATES[selectedBank]?.[installmentMonths] || 0) * 100);
    taxPercent = activeTariff ? Number(activeTariff.tax_percent) : 4.0;
    // Ferrum Standart, Ferrum Fast, Ferrum DTI have default_shop = 1.65%, others have 1.5%
    const defaultShop = selectedBank.toLowerCase().includes('ferrum') ? 1.65 : 1.5;
    storePercent = activeTariff ? Number(activeTariff.store_percent) : defaultShop;
  }

  // Parallel vs Successive subtraction of percentages formula:
  const dBank = bankPercent / 100;
  const dTax = taxPercent / 100;
  const dStore = storePercent / 100;

  const isFeeDeductedFromGross = paymentMethod === 'credit' && (selectedBank.toLowerCase().includes('ferrum') || selectedBank.toLowerCase().includes('abb'));

  const denominator = isFeeDeductedFromGross
    ? (1 - dBank) * (1 - dTax - dStore)
    : (1 - dBank - dTax - dStore);

  const rawGross = denominator > 0 ? (netAmount / denominator) : netAmount;

  const MARKUP_RATES = {
    'ABB Kredit': { 1: 0.0, 2: 0.079, 3: 0.09, 6: 0.119, 9: 0.1495, 12: 0.175, 18: 0.274, 24: 0.3735 },
    'Birkart': { 2: 0.0925, 3: 0.105, 6: 0.142, 9: 0.175, 12: 0.216, 18: 0.274 },
    'Tamkart': { 2: 0.09, 3: 0.1025, 6: 0.14, 9: 0.1725, 12: 0.213, 18: 0.276, 24: 0.2865 },
    'Kapital Kredit 35': { 2: 0.101, 3: 0.1159, 6: 0.148, 12: 0.222, 18: 0.312, 24: 0.3751, 35: 0.545 },
    'Ferrum Standart': { 3: 0.177, 6: 0.246, 9: 0.308, 12: 0.3935 },
    'Ferrum Fast': { 3: 0.29, 6: 0.36 },
    'Ferrum DTI': { 3: 0.151, 6: 0.204, 9: 0.261, 12: 0.308 }
  };

  const exactMarkup = paymentMethod === 'credit' ? MARKUP_RATES[selectedBank]?.[installmentMonths] : undefined;

  const contractTotal = exactMarkup !== undefined 
    ? Number((netAmount * (1 + exactMarkup)).toFixed(2))
    : (isFeeDeductedFromGross 
      ? Math.ceil(rawGross)
      : (paymentMethod === 'credit' ? Math.ceil(rawGross) : rawGross));

  const grossAmount = isFeeDeductedFromGross
    ? contractTotal * (1 - dBank)
    : contractTotal;

  const calculatedNet = isFeeDeductedFromGross
    ? grossAmount * (1 - dTax - dStore)
    : contractTotal * (1 - dBank - dTax - dStore);

  const pureProfit = isFeeDeductedFromGross
    ? netAmount
    : ((paymentMethod === 'credit' || paymentMethod === 'birmarket') ? Math.max(netAmount, calculatedNet) : netAmount);

  const monthlyPayment = installmentMonths > 0 
    ? (paymentMethod === 'credit' ? contractTotal / installmentMonths : grossAmount / installmentMonths) 
    : grossAmount;

  const commissionRateDisplay = netAmount > 0 ? (((contractTotal - netAmount) / netAmount) * 100) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error(t('warehouse.noItemsToDispatch') || 'Siyahı boşdur');
      return;
    }

    if ((paymentMethod === 'debt' || paymentMethod === 'credit') && !selectedCustomerId) {
      toast.error(i18n.language === 'az' ? 'Nisyə/Kredit satışı üçün müştəri seçilməlidir' : 'Для продажи в долг/кредит необходимо выбрать клиента');
      return;
    }

    setLoading(true);

    try {
      const totalAmount = calculateTotal();

      // 1. Process each item in database
      for (const item of cart) {
        // Log dispatch transaction (with reason 'sale')
        let channelPrefix = '';
        if (paymentMethod === 'birmarket') {
          channelPrefix = '[Kanal: Birmarket] ';
        } else if (paymentMethod === 'credit') {
          channelPrefix = `[Kanal: Kredit - ${selectedBank}] `;
        } else {
          channelPrefix = `[Kanal: ${salesChannel}] `;
        }

        let dispatchNote = notes;
        if (!dispatchNote) {
          if (paymentMethod === 'birmarket') {
            dispatchNote = `Satış (${birmarketCategory}): Kassaya/Saytda: ₼${grossAmount.toFixed(2)}, Mənfəət: ₼${pureProfit.toFixed(2)}`;
          } else if (paymentMethod === 'credit') {
            dispatchNote = `Kredit Satışı (${installmentMonths} ay): Kassaya: ₼${grossAmount.toFixed(2)}, Mənfəət: ₼${pureProfit.toFixed(2)}`;
          } else {
            dispatchNote = `Məhsul Satışı (Ödəniş: ${paymentMethod === 'cash' ? 'Nəqd' : paymentMethod === 'card' ? 'Kart' : 'Nisyə'})`;
          }
        }

        // Append customer info if selected
        if (selectedCustomerId) {
          const customerObj = customers.find(c => c.id === selectedCustomerId);
          if (customerObj) {
            dispatchNote += ` [Müştəri: ${customerObj.name}${customerObj.phone ? ` (${customerObj.phone})` : ''}]`;
          }
        }

        dispatchNote = channelPrefix + dispatchNote;

        const { error: dispatchError } = await supabase
          .from('stock_dispatches')
          .insert([{ 
            product_id: item.product_id,
            quantity: item.quantity,
            issued_at: saleDate,
            reason: 'sale',
            notes: dispatchNote,
            user_id: profile?.id,
            warehouse_id: warehouseId
          }]);

        if (dispatchError) throw dispatchError;

        // Update product stock quantity
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock_quantity: Number(item.currentStock || 0) - item.quantity })
          .eq('id', item.product_id);

        if (updateError) throw updateError;
      }

      // 2. If payment method is Debt or Credit, update customer balance & log debt transaction
      if (paymentMethod === 'debt' || paymentMethod === 'credit') {
        const customer = customers.find(c => c.id === selectedCustomerId);
        const currentDebt = Number(customer?.debt_balance || 0);
        
        const amountToLog = paymentMethod === 'credit' ? contractTotal : totalAmount;
        const newDebt = currentDebt + amountToLog;

        let descriptionText = `Məhsul satışı (Anbar terminalı). Borc yazıldı.`;
        if (paymentMethod === 'credit') {
          descriptionText = isFerrum 
            ? `Kredit satışı (${selectedBank} - ${installmentMonths} ay): Müqavilə: ₼${contractTotal}, Kassaya: ₼${grossAmount.toFixed(2)}, Mənfəət: ₼${pureProfit.toFixed(2)}, Faiz: ${commissionRateDisplay.toFixed(3).replace(/\.?0+$/, '')}%`
            : `Kredit satışı (${selectedBank} - ${installmentMonths} ay): Kassaya: ₼${grossAmount.toFixed(2)}, Mənfəət: ₼${pureProfit.toFixed(2)}, Faiz: ${commissionRateDisplay.toFixed(3).replace(/\.?0+$/, '')}%`;
        }

        // Log to customer_debts
        const { error: debtLogError } = await supabase
          .from('customer_debts')
          .insert([{
            user_id: profile?.id,
            customer_id: selectedCustomerId,
            type: 'debt',
            amount: amountToLog,
            description: descriptionText
          }]);

        if (debtLogError) throw debtLogError;

        // Update customer balance
        const { error: custUpdateError } = await supabase
          .from('customers')
          .update({ debt_balance: newDebt })
          .eq('id', selectedCustomerId);

        if (custUpdateError) throw custUpdateError;

        // Create credit contract & installments in DB
        if (paymentMethod === 'credit') {
          const { data: creditData, error: creditError } = await supabase
            .from('customer_credits')
            .insert([{
              user_id: profile?.id,
              customer_id: selectedCustomerId,
              total_amount: contractTotal,
              months: installmentMonths,
              monthly_payment: monthlyPayment,
              remaining_months: installmentMonths,
              notes: notes || (isFerrum 
                ? `Bank: ${selectedBank}, Müqavilə: ₼${contractTotal}, Mənfəət: ₼${pureProfit.toFixed(2)}, Faiz: ${commissionRateDisplay.toFixed(3).replace(/\.?0+$/, '')}%`
                : `Bank: ${selectedBank}, Mənfəət: ₼${pureProfit.toFixed(2)}, Faiz: ${commissionRateDisplay.toFixed(3).replace(/\.?0+$/, '')}%`),
              status: 'active'
            }])
            .select()
            .single();

          if (creditError) throw creditError;

          const installmentsToInsert = [];
          for (let i = 1; i <= installmentMonths; i++) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (30 * i));
            installmentsToInsert.push({
              credit_id: creditData.id,
              month_number: i,
              amount: monthlyPayment,
              due_date: dueDate.toISOString().split('T')[0],
              status: 'unpaid'
            });
          }

          const { error: instError } = await supabase
            .from('customer_credit_installments')
            .insert(installmentsToInsert);

          if (instError) throw instError;
        }
      }

      toast.success(t('retail.saleSuccess') || 'Satış uğurla başa çatdı');
      onSaleComplete();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { value: 'cash', label: i18n.language === 'az' ? 'Nəqd' : i18n.language === 'ru' ? 'Наличные' : 'Cash' },
    { value: 'card', label: i18n.language === 'az' ? 'Kart' : i18n.language === 'ru' ? 'Карта' : 'Card' },
    { value: 'debt', label: i18n.language === 'az' ? 'Nisyə / Borc' : i18n.language === 'ru' ? 'В долг' : 'Debt' },
    { value: 'credit', label: i18n.language === 'az' ? 'Hissə-hissə (Kredit)' : i18n.language === 'ru' ? 'В кредит (Рассрочка)' : 'Credit (Installments)' },
    { value: 'birmarket', label: 'Birmarket' }
  ];

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center" onClick={onClose}>
        <div 
          className="bg-white w-screen h-screen overflow-hidden animate-in fade-in flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-merkez-blue flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{i18n.language === 'az' ? 'Məhsul Satışı' : i18n.language === 'ru' ? 'Продажа товара' : 'Sell Product'}</h3>
                <p className="text-xs text-gray-500 font-medium">{i18n.language === 'az' ? 'Məhsul satışını rəsmiləşdirin və anbardan çıxarın' : i18n.language === 'ru' ? 'Оформите продажу товаров со склада' : 'Register warehouse product sale'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4 lg:p-8 pt-6 flex flex-col">
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 flex-1 min-h-0">
              {/* Sidebar Info (Sale Parameters) */}
              <div className="lg:col-span-5 space-y-6 lg:overflow-y-auto pr-2 pb-6 lg:max-h-full shrink-0 lg:shrink">
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{i18n.language === 'az' ? 'Satış Parametrləri' : i18n.language === 'ru' ? 'Параметры продажи' : 'Sale Parameters'}</h4>
                  
                  <DatePicker 
                    label={i18n.language === 'az' ? 'Satış Tarixi' : i18n.language === 'ru' ? 'Дата продажи' : 'Sale Date'}
                    value={saleDate}
                    onChange={val => setSaleDate(val)}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'Müştəri' : i18n.language === 'ru' ? 'Клиент' : 'Customer'}</label>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomer(true)}
                        className="text-[10px] font-black text-merkez-blue hover:text-blue-700 uppercase tracking-widest"
                      >
                        + {i18n.language === 'az' ? 'Yeni Müştəri' : i18n.language === 'ru' ? 'Новый клиент' : 'New Customer'}
                      </button>
                    </div>
                    <Dropdown 
                      value={selectedCustomerId}
                      onChange={val => setSelectedCustomerId(val)}
                      buttonClassName="rounded-xl px-5 py-3"
                      options={[
                        { value: '', label: i18n.language === 'az' ? 'Anonim Müştəri' : i18n.language === 'ru' ? 'Анонимный клиент' : 'Walk-in Guest' },
                        ...customers.map(c => ({ 
                          value: c.id, 
                          label: `${c.name} (${c.phone || '—'}) — Borc: ₼${Number(c.debt_balance || 0).toFixed(2)}` 
                        }))
                      ]}
                      searchable={true}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{i18n.language === 'az' ? 'Ödəniş növü' : i18n.language === 'ru' ? 'Способ оплаты' : 'Payment Method'}</label>
                    <Dropdown 
                      value={paymentMethod}
                      onChange={val => setPaymentMethod(val)}
                      buttonClassName="rounded-xl px-5 py-3"
                      options={paymentMethods}
                    />
                  </div>

                  {(paymentMethod === 'cash' || paymentMethod === 'card' || paymentMethod === 'debt') && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                        {i18n.language === 'az' ? 'Satış kanalı' : 'Канал продажи'}
                      </label>
                      <Dropdown 
                        value={salesChannel}
                        onChange={val => setSalesChannel(val)}
                        buttonClassName="rounded-xl px-5 py-3"
                        options={[
                          { value: 'Mağaza', label: i18n.language === 'az' ? 'Mağaza' : 'Магазин' },
                          { value: 'Sosial şəbəkə', label: i18n.language === 'az' ? 'Sosial şəbəkə' : 'Социальные сети' }
                        ]}
                      />
                    </div>
                  )}

                  {paymentMethod === 'credit' && (
                    <div className="bg-blue-50/40 border border-blue-100/50 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                            {i18n.language === 'az' ? 'Məhsulun ana dəyəri' : 'Базовая цена'}
                          </label>
                          <input
                            type="number"
                            value={basePriceInput}
                            onChange={(e) => setBasePriceInput(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-merkez-blue shadow-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                            {i18n.language === 'az' ? 'Əlavə qiymət' : 'Доп. наценка'}
                          </label>
                          <input
                            type="number"
                            value={extraMarkup}
                            onChange={(e) => setExtraMarkup(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-merkez-blue shadow-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                          {i18n.language === 'az' ? 'Seçilən Bank' : 'Выбор Банка'}
                        </label>
                        <Dropdown
                          value={selectedBank}
                          onChange={(val) => setSelectedBank(val)}
                          buttonClassName="w-full rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-100 hover:border-merkez-blue shadow-sm"
                          options={[
                            { value: 'ABB Kredit', label: 'ABB Kredit' },
                            { value: 'Birkart', label: 'Birkart' },
                            { value: 'Tamkart', label: 'Tamkart' },
                            { value: 'Kapital Kredit 35', label: 'Kapital Kredit 35' },
                            { value: 'Ferrum Standart', label: 'Ferrum Standart' },
                            { value: 'Ferrum Fast', label: 'Ferrum Fast' },
                            { value: 'Ferrum DTI', label: 'Ferrum DTI' }
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                          {i18n.language === 'az' ? 'Kredit müddəti' : 'Срок кредита'}
                        </label>
                        <Dropdown
                          value={installmentMonths}
                          onChange={(val) => setInstallmentMonths(Number(val))}
                          buttonClassName="w-full rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-100 hover:border-merkez-blue shadow-sm"
                          options={activeMonths.map(m => {
                            const pct = getBankPercentForMonth(m);
                            const pctStr = pct > 0 ? ` (${pct.toFixed(2).replace(/\.?0+$/, '')}%)` : '';
                            return {
                              value: m,
                              label: (i18n.language === 'az' ? `${m} ay` : `${m} ${m === 1 ? 'месяц' : m >= 2 && m <= 4 ? 'месяца' : 'месяцев'}`) + pctStr
                            };
                          })}
                        />
                      </div>

                      {/* Calculations Panel */}
                      <div className="bg-white/80 border border-blue-100/30 p-4 rounded-xl space-y-3 text-sm font-bold text-gray-500">
                        <div className="flex justify-between items-center">
                          <span>{i18n.language === 'az' ? 'Məhsulun dəyəri:' : 'Стоимость товара:'}</span>
                          <span className="text-gray-900 font-black text-sm">₼{netAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>{i18n.language === 'az' ? 'Faiz dərəcəsi:' : 'Процентная ставка:'}</span>
                          <span className="text-orange-500 font-black text-sm">{commissionRateDisplay.toFixed(3).replace(/\.?0+$/, '')}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>{i18n.language === 'az' ? 'Cəmi:' : 'İтого (Цена + Процент):'}</span>
                          <span className="text-gray-900 font-black text-sm">₼{contractTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>{i18n.language === 'az' ? 'Faiz məbləği (Manatla):' : 'Сумма процента (В манатах):'}</span>
                          <span className="text-orange-500 font-black text-sm">₼{(contractTotal - netAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-100 pt-2.5">
                          <span className="text-gray-900 font-black text-sm">{i18n.language === 'az' ? 'Aylıq ödəniş:' : 'Ежемесячный платеж:'}</span>
                          <span className="text-merkez-blue font-black text-lg">₼{monthlyPayment.toFixed(2)} / {i18n.language === 'az' ? 'ay' : 'мес'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-900 font-black text-sm">{i18n.language === 'az' ? 'Kredit şöbəsinə göndərilən məbləğ:' : 'Сумма отправленная в кредит. отдел:'}</span>
                          <span className="text-gray-900 font-black text-base">₼{contractTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-900 font-black text-sm">{i18n.language === 'az' ? 'Kassaya vurulan məbləğ:' : 'Сумма в кассу:'}</span>
                          <span className="text-gray-900 font-black text-base">₼{grossAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-955 font-black text-sm">{i18n.language === 'az' ? 'Alver cədvəlinə yazılan məbləğ:' : 'Сумма записи в торговлю:'}</span>
                          <span className="text-gray-900 font-black text-base">₼{netAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'birmarket' && (
                    <div className="bg-blue-50/40 border border-blue-100/50 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                            {i18n.language === 'az' ? 'Məhsulun ana dəyəri' : 'Базовая цена'}
                          </label>
                          <input
                            type="number"
                            value={basePriceInput}
                            onChange={(e) => setBasePriceInput(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-merkez-blue shadow-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                            {i18n.language === 'az' ? 'Əlavə qiymət' : 'Доп. наценка'}
                          </label>
                          <input
                            type="number"
                            value={extraMarkup}
                            onChange={(e) => setExtraMarkup(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-merkez-blue shadow-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                          {i18n.language === 'az' ? 'Məhsul Kateqoriyası' : 'Категория товара'}
                        </label>
                        <Dropdown
                          value={birmarketCategory}
                          onChange={(val) => setBirmarketCategory(val)}
                          buttonClassName="w-full rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-100 hover:border-merkez-blue shadow-sm"
                          options={[
                            { value: 'Alətlər', label: 'Alətlər (10%)' },
                            { value: 'Aksesuarlar', label: 'Aksesuarlar (15%)' }
                          ]}
                        />
                      </div>

                      {/* Birmarket Calculations Panel */}
                      <div className="bg-white/80 border border-blue-100/30 p-4 rounded-xl space-y-3 text-sm font-bold text-gray-500">
                        <div className="flex justify-between items-center">
                          <span>{i18n.language === 'az' ? 'Məhsulun dəyəri:' : 'Стоимость товара:'}</span>
                          <span className="text-gray-900 font-black text-sm">₼{netAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>{i18n.language === 'az' ? 'Saytın komissiyası:' : 'Комиссия сайта:'}</span>
                          <span className="text-orange-500 font-black text-sm">{birmarketCategory === 'Alətlər' ? '10%' : '15%'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>{i18n.language === 'az' ? 'Vergi:' : 'Налог:'}</span>
                          <span className="text-orange-500 font-black text-sm">4.0%</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-100 pt-2.5">
                          <span className="text-gray-900 font-black text-sm">{i18n.language === 'az' ? 'Saytda satılan məbləğ:' : 'Сумма продажи на сайте:'}</span>
                          <span className="text-gray-900 font-black text-base">₼{grossAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('common.notes')}</label>
                    <textarea 
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full bg-white border border-gray-100 rounded-xl px-5 py-3 outline-none transition-all font-medium resize-none h-20 text-sm focus:border-merkez-blue shadow-sm"
                      placeholder={t('warehouse.notesPlaceholder')}
                    />
                  </div>
                </div>

                <div className="bg-blue-50/70 p-6 rounded-2xl border border-blue-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-500">{i18n.language === 'az' ? 'Məhsul sayı' : i18n.language === 'ru' ? 'Количество товаров' : 'Items count'}:</span>
                    <span className="font-black text-merkez-blue">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500">{i18n.language === 'az' ? 'Toplam məbləğ' : i18n.language === 'ru' ? 'Toplam сумма' : 'Total Amount'}:</span>
                    <span className="text-xl font-black text-merkez-blue">₼{(paymentMethod === 'credit' ? contractTotal : (paymentMethod === 'birmarket' ? grossAmount : calculateTotal())).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Cart / Products Panel */}
              <div className="lg:col-span-7 space-y-6 flex flex-col lg:h-full lg:overflow-hidden mt-6 lg:mt-0">
                {/* Add Item Form */}
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'Məhsul əlavə edin' : i18n.language === 'ru' ? 'Добавьте товар в корзину' : 'Add product to sale'}</span>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-xs font-bold text-gray-500">{t('warehouse.barcodeMode') || 'Skaner rejimi'}</span>
                      <div className="relative">
                        <input 
                          type="checkbox"
                          checked={barcodeMode}
                          onChange={(e) => {
                            setBarcodeMode(e.target.checked);
                            if (e.target.checked) {
                              setTimeout(() => barcodeInputRef.current?.focus(), 100);
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-merkez-blue after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                      </div>
                    </label>
                  </div>
                  
                  {barcodeMode ? (
                    <form onSubmit={handleBarcodeSubmit} className="space-y-4">
                      <div className="relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          ref={barcodeInputRef}
                          type="text"
                          value={barcodeBuffer}
                          onChange={(e) => setBarcodeBuffer(e.target.value)}
                          placeholder={t('warehouse.scanBarcodePlaceholder') || 'Skan edin...'}
                          className="w-full bg-gray-50 border-2 border-merkez-blue/30 rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:bg-white focus:border-merkez-blue outline-none transition-all"
                          autoFocus
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium text-center">
                        {t('warehouse.scanBarcodeHint') || 'Skaneri məhsula yönəldin və oxudun. O, siyahıya avtomatik əlavə olunacaq.'}
                      </p>
                    </form>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5 flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('common.category') || 'Категория'}</label>
                          <Dropdown 
                            value={selectedCategoryId}
                            onChange={handleCategoryChange}
                            buttonClassName="rounded-xl px-5 py-3"
                            options={[
                              { value: '', label: t('warehouse.allCategories') },
                              ...categories.filter(c => !c.parent_id).flatMap(cat => [
                                { value: cat.id, label: cat.name },
                                ...categories.filter(sub => sub.parent_id === cat.id).map(sub => ({
                                  value: sub.id,
                                  label: `  ↳ ${sub.name}`
                                }))
                              ])
                            ]}
                          />
                        </div>
                        <div className="md:col-span-5 flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('warehouse.product') || 'Товар'}</label>
                          <Dropdown 
                            value={currentItem.product_id}
                            onChange={handleProductChange}
                            buttonClassName="rounded-xl px-5 py-3"
                            options={[
                              { value: '', label: t('warehouse.selectProduct') },
                              ...filteredProducts.map(p => ({ 
                                value: p.id, 
                                label: `${p.name} (₼${Number(p.price).toFixed(2)}) — Stok: ${p.stock_quantity}`
                              }))
                            ]}
                            searchable={true}
                          />
                        </div>
                        <div className="md:col-span-2 flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('warehouse.quantity') || 'Количество'}</label>
                          <input 
                            type="number" 
                            value={currentItem.quantity}
                            onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})}
                            placeholder="1"
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-merkez-blue outline-none transition-all font-bold"
                        />
                      </div>
                    </div>
                      
                    {currentItem.product_id && (() => {
                        const prod = products.find(p => p.id === currentItem.product_id);
                        if (!prod) return null;
                        return (
                          <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-3 flex justify-between items-center animate-in fade-in slide-in-from-top-1">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('warehouse.price') || 'Qiymət'}</span>
                              <span className="text-sm font-black text-gray-900">₼{Number(prod.price || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('warehouse.stock') || 'Stok'}</span>
                              <span className={`text-xs font-bold ${prod.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {prod.stock_quantity} {i18n.language === 'az' ? 'ədəd' : 'шт'}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      
                      <button 
                        type="button"
                        onClick={addToCart}
                        className="w-full mt-4 bg-gray-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                      >
                        <Plus className="w-4 h-4" /> {i18n.language === 'az' ? 'Səbətə əlavə et' : i18n.language === 'ru' ? 'Добавить в корзину' : 'Add to Cart'}
                      </button>
                    </>
                  )}
                </div>

                {/* Cart list table */}
                <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto border border-gray-100 rounded-2xl">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400 gap-3 bg-gray-50/20">
                      <ShoppingCart className="w-10 h-10 text-gray-200" />
                      <p className="text-sm font-medium">{i18n.language === 'az' ? 'Səbət boşdur' : i18n.language === 'ru' ? 'Корзина пуста' : 'Cart is empty'}</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('warehouse.thName')}</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">{t('warehouse.thPrice')}</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">{t('warehouse.quantity')}</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{t('common.total') || 'Total'}</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {cart.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/30">
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-gray-900">{item.productName}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-medium text-gray-600">₼{item.price.toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-black text-gray-950">{item.quantity}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-black text-gray-900">₼{(item.price * item.quantity).toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all">
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
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold hover:bg-gray-50 transition-all text-sm shadow-sm"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="button"
              disabled={loading || cart.length === 0}
              onClick={handleSubmit}
              className="px-8 py-3 bg-merkez-blue text-white rounded-xl font-bold shadow-lg shadow-blue-600/10 hover:bg-blue-600 disabled:opacity-50 transition-all text-sm flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {i18n.language === 'az' ? 'Satışı Tamamla' : i18n.language === 'ru' ? 'Завершить продажу' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>

      <QuickAddCustomerModal 
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onCustomerAdded={handleCustomerAdded}
      />
    </ModalPortal>
  );
};

export default SellProductModal;
