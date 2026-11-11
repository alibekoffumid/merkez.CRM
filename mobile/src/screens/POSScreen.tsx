import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Keyboard,
  Animated,
  PanResponder,
} from 'react-native';
import {
  ShoppingBag,
  Barcode,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  CreditCard,
  Banknote,
  Smartphone,
  Calculator,
  User,
  Phone,
  Tag,
  Percent,
  X,
  Edit2,
  Check,
  RotateCcw,
  Printer,
  Gift,
  Layers,
  Store,
  Share2,
  ChevronDown,
  ChevronUp,
  KeyRound,
} from 'lucide-react-native';
import { POSCartItem } from '../types';
import { productService } from '../services/productService';
import { salesService, POSPaymentMethod } from '../services/salesService';
import { salesChannelService, DEFAULT_SALES_CHANNELS } from '../services/salesChannelService';
import { SalesChannelPickerModal } from '../components/SalesChannelPickerModal';
import { RentProductModal } from '../components/RentProductModal';
import {
  CREDIT_BANKS,
  CreditBank,
  calculateCredit,
  getAvailableMonths,
} from '../utils/creditCalculator';
import { PrinterSettingsModal } from '../components/PrinterSettingsModal';
import { SaleSuccessModal } from '../components/SaleSuccessModal';
import { receiptService, SaleReceiptData } from '../services/receiptService';

interface POSScreenProps {
  cart: POSCartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onOpenScanner: (mode: 'pos') => void;
  onUpdateItemPrice?: (
    productId: string,
    customPrice?: number,
    discount?: number,
    discountType?: 'percent' | 'fixed'
  ) => void;
  onToggleItemGift?: (productId: string) => void;
}

export const POSScreen: React.FC<POSScreenProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenScanner,
  onUpdateItemPrice,
  onToggleItemGift,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<POSPaymentMethod>('CASH');
  const [selectedBank, setSelectedBank] = useState<CreditBank>('ABB Kredit');
  const [installmentMonths, setInstallmentMonths] = useState<number>(12);

  // Split payment state
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [splitTerminal, setSplitTerminal] = useState('');
  const [splitCredit, setSplitCredit] = useState('');
  const [splitCreditBank, setSplitCreditBank] = useState<CreditBank>('ABB Kredit');
  const [splitCreditMonths, setSplitCreditMonths] = useState<number>(12);

  // Global Cart Discount State
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [discountInput, setDiscountInput] = useState('');

  // Client info for Credit sales
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [advanceAmountInput, setAdvanceAmountInput] = useState('');
  const [advanceRecipientInput, setAdvanceRecipientInput] = useState('');
  const [birmarketCategory, setBirmarketCategory] = useState<'Alətlər' | 'Aksesuarlar'>('Alətlər');
  const [processing, setProcessing] = useState(false);

  // Printer & Checkout Success Modals
  const [printerModalVisible, setPrinterModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [completedReceiptData, setCompletedReceiptData] = useState<SaleReceiptData | null>(null);

  // Item Price / Discount Editing Modal State
  const [editingItem, setEditingItem] = useState<POSCartItem | null>(null);
  const [itemCustomPriceInput, setItemCustomPriceInput] = useState('');

  // Sales Channel State
  const [salesChannel, setSalesChannel] = useState('Mağaza');
  const [channels, setChannels] = useState<string[]>(DEFAULT_SALES_CHANNELS);
  const [customChannels, setCustomChannels] = useState<string[]>([]);
  const [channelPickerVisible, setChannelPickerVisible] = useState(false);
  const [rentModalVisible, setRentModalVisible] = useState(false);

  const handleOpenRentModal = () => {
    if (cart.length === 0) {
      Alert.alert('Səbət boşdur', 'İcarəyə vermək üçün əvvəlcə səbətə məhsul əlavə edin');
      return;
    }
    setRentModalVisible(true);
  };

  useEffect(() => {
    loadSalesChannels();
  }, []);

  const loadSalesChannels = async () => {
    try {
      const res = await salesChannelService.getChannels();
      setChannels(res.allChannels);
      setCustomChannels(res.customChannels);
    } catch (e) {
      console.warn('Failed to load sales channels:', e);
    }
  };

  const handleAddCustomChannel = async (name: string) => {
    const res = await salesChannelService.addChannel(name);
    setChannels(res.allChannels);
    setCustomChannels(res.customChannels);
  };

  const handleDeleteCustomChannel = async (name: string) => {
    const res = await salesChannelService.deleteChannel(name);
    setChannels(res.allChannels);
    setCustomChannels(res.customChannels);
    if (salesChannel === name) {
      setSalesChannel('Mağaza');
    }
  };

  // Keyboard avoidance height tracking
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const [itemDiscountPercentInput, setItemDiscountPercentInput] = useState('');

  // Swipeable Bottom Checkout Sheet State & Gesture (100% Native Driver, no mount/unmount jump)
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [bottomBarHeight, setBottomBarHeight] = useState(58);
  const isSheetCollapsedRef = useRef(false);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const currentTranslateYRef = useRef(0);
  const dragStartYRef = useRef(0);
  const sheetBodyHeightRef = useRef(360);
  const footerScrollRef = useRef<ScrollView>(null);
  const footerScrollOffsetRef = useRef(0);

  useEffect(() => {
    const subId = sheetTranslateY.addListener(({ value }) => {
      currentTranslateYRef.current = value;
    });
    return () => {
      sheetTranslateY.removeListener(subId);
    };
  }, [sheetTranslateY]);

  const snapToCollapsed = (velocity = 0) => {
    Keyboard.dismiss();
    const target = Math.max(0, sheetBodyHeightRef.current);
    isSheetCollapsedRef.current = true;
    Animated.spring(sheetTranslateY, {
      toValue: target,
      velocity: Math.max(0, velocity),
      useNativeDriver: true,
      damping: 28,
      stiffness: 280,
      mass: 0.8,
      overshootClamping: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsSheetCollapsed(true);
      }
    });
  };

  const snapToExpanded = (velocity = 0) => {
    isSheetCollapsedRef.current = false;
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      velocity: Math.min(0, velocity),
      useNativeDriver: true,
      damping: 28,
      stiffness: 280,
      mass: 0.8,
      overshootClamping: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsSheetCollapsed(false);
      }
    });
  };

  const toggleSheetCollapsed = () => {
    if (isSheetCollapsedRef.current) {
      snapToExpanded();
    } else {
      snapToCollapsed();
    }
  };

  const handleSelectPaymentMethod = (method: POSPaymentMethod) => {
    setPaymentMethod(method);
    footerScrollRef.current?.scrollTo({ y: 0, animated: false });
    footerScrollOffsetRef.current = 0;
    if (isSheetCollapsedRef.current) {
      snapToExpanded();
    }
  };

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const dy = gestureState.dy;
        const dx = gestureState.dx;
        if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx) * 1.35) {
          return false;
        }
        if (isSheetCollapsedRef.current) {
          return dy < -8;
        }
        if (dy > 8 && footerScrollOffsetRef.current <= 4) {
          return true;
        }
        return false;
      },
      onPanResponderGrant: () => {
        sheetTranslateY.stopAnimation((val) => {
          currentTranslateYRef.current = val;
          dragStartYRef.current = val;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const maxOffset = Math.max(0, sheetBodyHeightRef.current);
        const nextY = Math.max(0, Math.min(maxOffset, dragStartYRef.current + gestureState.dy));
        sheetTranslateY.setValue(nextY);
      },
      onPanResponderRelease: (_, gestureState) => {
        const dy = gestureState.dy;
        const vy = gestureState.vy;
        const maxOffset = Math.max(0, sheetBodyHeightRef.current);
        const currentY = currentTranslateYRef.current;

        if (isSheetCollapsedRef.current) {
          if (dy < -28 || vy < -0.25 || currentY < maxOffset * 0.72) {
            snapToExpanded(vy);
          } else {
            snapToCollapsed(vy);
          }
        } else {
          if (dy > 32 || vy > 0.25 || currentY > maxOffset * 0.25) {
            snapToCollapsed(vy);
          } else {
            snapToExpanded(vy);
          }
        }
      },
      onPanResponderTerminate: () => {
        if (isSheetCollapsedRef.current) {
          snapToCollapsed();
        } else {
          snapToExpanded();
        }
      },
    })
  ).current;

  // Calculate effective price for each item
  const getItemEffectivePrice = (item: POSCartItem): number => {
    if (item.isGift) {
      return 0;
    }
    if (item.customPrice !== undefined && item.customPrice !== null) {
      return item.customPrice;
    }
    const base = item.product.sale_price ?? item.product.price ?? 0;
    if (item.discount && item.discount > 0) {
      if (item.discountType === 'percent') {
        return Math.max(0, base * (1 - item.discount / 100));
      }
      return Math.max(0, base - item.discount);
    }
    if (item.product.discount_value && item.product.discount_value > 0) {
      if (item.product.discount_type === 'percent') {
        return Math.max(0, base * (1 - item.product.discount_value / 100));
      } else if (item.product.discount_type === 'fixed') {
        return Math.max(0, base - item.product.discount_value);
      }
    }
    return base;
  };

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      return acc + getItemEffectivePrice(item) * item.quantity;
    }, 0);
  }, [cart]);

  // Calculate total global discount
  const discountVal = parseFloat(discountInput) || 0;
  const discountAmount = useMemo(() => {
    if (discountVal <= 0 || subtotal <= 0) return 0;
    if (discountType === 'percent') {
      return (subtotal * Math.min(100, Math.max(0, discountVal))) / 100;
    }
    return Math.min(subtotal, Math.max(0, discountVal));
  }, [subtotal, discountVal, discountType]);

  const discountedBase = Math.max(0, subtotal - discountAmount);

  const availableMonths = useMemo(() => getAvailableMonths(selectedBank), [selectedBank]);

  useEffect(() => {
    if (!availableMonths.includes(installmentMonths)) {
      setInstallmentMonths(availableMonths[availableMonths.length - 1] || 12);
    }
  }, [selectedBank, availableMonths]);

  // Credit calculator takes into account the discounted product value
  const creditResult = useMemo(() => {
    return calculateCredit(discountedBase, selectedBank, installmentMonths);
  }, [discountedBase, selectedBank, installmentMonths]);

  // Split calculations
  const numSplitCash = parseFloat(splitCash) || 0;
  const numSplitCard = parseFloat(splitCard) || 0;
  const numSplitTerminal = parseFloat(splitTerminal) || 0;
  const numSplitCredit = parseFloat(splitCredit) || 0;
  const currentSplitSum = Number((numSplitCash + numSplitCard + numSplitTerminal + numSplitCredit).toFixed(2));
  const remainingSplit = Number((discountedBase - currentSplitSum).toFixed(2));

  const splitAvailableMonths = useMemo(() => getAvailableMonths(splitCreditBank), [splitCreditBank]);

  useEffect(() => {
    if (!splitAvailableMonths.includes(splitCreditMonths)) {
      setSplitCreditMonths(splitAvailableMonths[splitAvailableMonths.length - 1] || 12);
    }
  }, [splitCreditBank, splitAvailableMonths]);

  const splitCreditResult = useMemo(() => {
    return calculateCredit(numSplitCredit, splitCreditBank, splitCreditMonths);
  }, [numSplitCredit, splitCreditBank, splitCreditMonths]);

  const fillRemainingSplit = (type: 'cash' | 'card' | 'terminal' | 'credit') => {
    const otherSum = (type !== 'cash' ? numSplitCash : 0) +
                     (type !== 'card' ? numSplitCard : 0) +
                     (type !== 'terminal' ? numSplitTerminal : 0) +
                     (type !== 'credit' ? numSplitCredit : 0);
    const rem = Math.max(0, Number((discountedBase - otherSum).toFixed(2)));
    if (type === 'cash') setSplitCash(rem > 0 ? rem.toString() : '');
    else if (type === 'card') setSplitCard(rem > 0 ? rem.toString() : '');
    else if (type === 'terminal') setSplitTerminal(rem > 0 ? rem.toString() : '');
    else if (type === 'credit') setSplitCredit(rem > 0 ? rem.toString() : '');
  };

  const birmarketResult = useMemo(() => {
    const net = discountedBase;
    const gross = birmarketCategory === 'Alətlər'
      ? Math.floor(net * 1.1751 * 100) / 100
      : Number((net * 1.245).toFixed(2));
    const markupRate = birmarketCategory === 'Alətlər' ? 17.51 : 24.5;
    const siteCommissionRate = birmarketCategory === 'Alətlər' ? 10 : 15;
    return {
      gross,
      profit: net,
      markupRate,
      siteCommissionRate,
    };
  }, [discountedBase, birmarketCategory]);

  const total =
    paymentMethod === 'CREDIT'
      ? creditResult.contractTotal
      : paymentMethod === 'BIRMARKET'
      ? birmarketResult.gross
      : discountedBase;

  // Checkout Handler
  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Səbət boşdur', 'Skanerlə və ya kataloqdan çəkə məhsul əlavə edin');
      return;
    }

    if (paymentMethod === 'CREDIT' && !clientName.trim()) {
      Alert.alert(
        'Müştəri məlumatı vacibdir',
        'Kredit satışı üçün zəhmət olmasa müştərinin adını və əlaqə nömrəsini qeyd edin'
      );
      return;
    }

    if (paymentMethod === 'SPLIT') {
      if (Math.abs(remainingSplit) >= 0.01) {
        Alert.alert(
          'Məbləğ tam bölünməyib',
          `Qarışıq ödəniş məbləğləri yekun məbləğə (₼${discountedBase.toFixed(2)}) bərabər olmalıdır. Qalıq: ₼${remainingSplit.toFixed(2)}`
        );
        return;
      }
      if (numSplitCredit > 0 && !clientName.trim()) {
        Alert.alert(
          'Müştəri məlumatı vacibdir',
          'Kredit hissəsi üçün zəhmət olmasa müştərinin adını və əlaqə nömrəsini qeyd edin'
        );
        return;
      }
    }

    if (paymentMethod === 'DEPOSIT') {
      const advNum = parseFloat(advanceAmountInput);
      if (!advanceAmountInput || isNaN(advNum) || advNum <= 0) {
        Alert.alert('Avans məbləği daxil edilməlidir', 'Zəhmət olmasa ödənilən avans məbləğini qeyd edin');
        return;
      }
      if (advNum > total) {
        Alert.alert('Xəta', 'Avans məbləği ümumi satış məbləğindən çox ola bilməz');
        return;
      }
      if (!advanceRecipientInput.trim()) {
        Alert.alert('Avans alan şəxs qeyd edilməlidir', 'Avansın kimə verildiyini (işçi və ya usta) qeyd edin');
        return;
      }
    }

    try {
      setProcessing(true);
      const creditDetails =
        paymentMethod === 'CREDIT'
          ? {
              bank: selectedBank,
              months: installmentMonths,
              contractTotal: creditResult.contractTotal,
              monthlyPayment: creditResult.monthlyPayment,
              markupPercent: creditResult.markupPercent,
            }
          : undefined;

      const formattedClient = clientPhone.trim()
        ? `${clientName.trim()} (${clientPhone.trim()})`
        : clientName.trim() || undefined;

      const res = await salesService.processSale(
        cart,
        paymentMethod,
        {
          discountAmount,
          discountType,
          discountValue: discountVal,
          clientName: formattedClient,
          clientPhone: clientPhone.trim() || undefined,
          salesChannel,
          creditDetails,
          depositDetails: paymentMethod === 'DEPOSIT' ? {
            advanceAmount: parseFloat(advanceAmountInput) || 0,
            advanceRecipient: advanceRecipientInput.trim(),
          } : undefined,
          splitDetails: paymentMethod === 'SPLIT' ? {
            cash: numSplitCash,
            card: numSplitCard,
            terminal: numSplitTerminal,
            credit: numSplitCredit,
            creditBank: splitCreditBank,
            creditMonths: splitCreditMonths,
            creditContract: splitCreditResult.contractTotal,
            creditMonthlyPayment: splitCreditResult.monthlyPayment,
            creditGross: splitCreditResult.grossAmount,
            creditMarkupPercent: splitCreditResult.markupPercent,
          } : undefined,
          birmarketDetails: paymentMethod === 'BIRMARKET' ? {
            category: birmarketCategory,
            grossAmount: birmarketResult.gross,
            pureProfit: birmarketResult.profit,
          } : undefined,
        }
      );

      const methodLabel =
        paymentMethod === 'CASH'
          ? 'Nağd'
          : paymentMethod === 'CARD'
          ? 'Kart'
          : paymentMethod === 'TERMINAL'
          ? 'Terminal'
          : paymentMethod === 'SPLIT'
          ? 'Qarışıq (Bölünmüş)'
          : paymentMethod === 'CREDIT'
          ? 'Kredit (Hissə-hissə)'
          : paymentMethod === 'BIRMARKET'
          ? 'Birmarket'
          : paymentMethod === 'DEPOSIT'
          ? 'Beh (Avans)'
          : 'Köçürmə';

      const receiptData: SaleReceiptData = {
        saleId: res.saleId,
        receiptNumber: res.receiptNumber,
        transactionId: res.transactionId || res.saleId,
        date: new Date(),
        items: cart.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          price: getItemEffectivePrice(i),
          total: getItemEffectivePrice(i) * i.quantity,
          unit: i.product.unit || 'əd.',
          isGift: Boolean(i.isGift),
          originalPrice: i.originalPrice ?? (i.product.sale_price ?? i.product.price ?? 0),
        })),
        subtotal,
        discountAmount,
        discountType,
        discountValue: discountVal,
        total: res.total,
        paymentMethod: methodLabel,
        cashierName: 'Kassir',
        warehouseName: (cart[0]?.product as any)?.warehouse_name || 'DÜKKAN - ƏHMƏDLİ',
        notes: `POS Satış #${res.receiptNumber || res.saleId} (Ödəniş: ${methodLabel})`,
        creditDetails:
          paymentMethod === 'CREDIT'
            ? {
                bank: selectedBank,
                months: installmentMonths,
                contractTotal: creditResult.contractTotal,
                monthlyPayment: creditResult.monthlyPayment,
                markupPercent: creditResult.markupPercent,
              }
            : undefined,
        splitDetails:
          paymentMethod === 'SPLIT'
            ? {
                cash: numSplitCash,
                card: numSplitCard,
                terminal: numSplitTerminal,
                credit: numSplitCredit,
                creditBank: splitCreditBank,
                creditMonths: splitCreditMonths,
                creditContract: splitCreditResult.contractTotal,
                creditMonthlyPayment: splitCreditResult.monthlyPayment,
              }
            : undefined,
        depositDetails:
          paymentMethod === 'DEPOSIT'
            ? {
                advanceAmount: parseFloat(advanceAmountInput) || 0,
                advanceRecipient: advanceRecipientInput.trim(),
                remainingBalance: Math.max(0, res.total - (parseFloat(advanceAmountInput) || 0)),
              }
            : undefined,
        birmarketDetails:
          paymentMethod === 'BIRMARKET'
            ? {
                category: birmarketCategory,
                grossAmount: birmarketResult.gross,
                pureProfit: birmarketResult.profit,
              }
            : undefined,
        clientName: formattedClient,
        clientPhone: clientPhone.trim() || undefined,
        salesChannel,
      };

      setCompletedReceiptData(receiptData);
      setSuccessModalVisible(true);
      onClearCart();
      setDiscountInput('');
      setClientName('');
      setClientPhone('');
      setAdvanceAmountInput('');
      setAdvanceRecipientInput('');
      setSplitCash('');
      setSplitCard('');
      setSplitTerminal('');
      setSplitCredit('');
    } catch (e: any) {
      Alert.alert('Rəsmiləşdirmə xətası', e.message);
    } finally {
      setProcessing(false);
    }
  };

  // Item modal handlers
  const handleOpenItemModal = (item: POSCartItem) => {
    setEditingItem(item);
    setItemCustomPriceInput(
      item.customPrice !== undefined && item.customPrice !== null
        ? String(item.customPrice)
        : ''
    );
    setItemDiscountPercentInput(
      item.discount && item.discountType === 'percent' ? String(item.discount) : ''
    );
  };

  const handleApplyItemPrice = () => {
    if (!editingItem) return;
    const customP = parseFloat(itemCustomPriceInput);
    const discPct = parseFloat(itemDiscountPercentInput);

    if (!isNaN(customP) && customP >= 0) {
      onUpdateItemPrice?.(editingItem.product.id, customP, undefined, undefined);
    } else if (!isNaN(discPct) && discPct > 0) {
      const base = editingItem.product.sale_price ?? editingItem.product.price ?? 0;
      const discounted = Math.max(0, base * (1 - discPct / 100));
      onUpdateItemPrice?.(editingItem.product.id, discounted, discPct, 'percent');
    } else {
      onUpdateItemPrice?.(editingItem.product.id, undefined, undefined, undefined);
    }
    setEditingItem(null);
  };

  const handleResetItemPrice = () => {
    if (!editingItem) return;
    onUpdateItemPrice?.(editingItem.product.id, undefined, undefined, undefined);
    setEditingItem(null);
  };

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Kassa / Satış</Text>
            <Text style={styles.sub}>Cari çekdə {cart.length} məhsul</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.printerBtn}
              onPress={() => setPrinterModalVisible(true)}
              activeOpacity={0.8}
            >
              <Printer size={18} color="#0F172A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => onOpenScanner('pos')}
              activeOpacity={0.8}
            >
              <Barcode size={18} color="#fff" />
              <Text style={styles.scanBtnText}>SKAN ET</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cart items list (always rendered behind/above the swipeable bottom checkout sheet) */}
        <FlatList
          data={cart}
          style={styles.cartList}
          keyExtractor={(item) => item.product.id}
          renderItem={({ item }) => {
            const effectivePrice = getItemEffectivePrice(item);
            const basePrice = item.product.sale_price ?? item.product.price ?? 0;
            const itemTotal = effectivePrice * item.quantity;
            const hasCustomDiscount =
              (item.customPrice !== undefined && Math.abs(item.customPrice - basePrice) > 0.005) ||
              (item.discount && item.discount > 0) ||
              (item.product.discount_value && item.product.discount_value > 0);

            return (
              <View style={[styles.itemRow, item.isGift && styles.itemRowGift]}>
                {/* Top Row: Product Name & Gift Badge */}
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.product.name}
                  </Text>
                  {item.isGift && (
                    <View style={styles.giftBadge}>
                      <Gift size={11} color="#7C3AED" />
                      <Text style={styles.giftBadgeText}>HƏDİYYƏ</Text>
                    </View>
                  )}
                </View>

                {/* Bottom Row: Price on left, Quantity + Gift + Delete on right */}
                <View style={styles.itemBottomRow}>
                  {/* Left: Total price for this item & unit price */}
                  <TouchableOpacity
                    style={styles.itemPriceCol}
                    onPress={() => handleOpenItemModal(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.itemTotal, item.isGift && styles.itemTotalGift]}>
                      {item.isGift ? '0.00 ₼' : `${itemTotal.toFixed(2)} ₼`}
                    </Text>

                    {item.isGift ? (
                      <View style={styles.giftPriceContainer}>
                        <Text style={styles.originalPriceStrikethrough}>
                          {(item.originalPrice ?? basePrice).toFixed(2)} ₼
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.itemUnitPriceRow}>
                        <Text style={styles.itemUnitPriceText}>
                          {effectivePrice.toFixed(2)} ₼ / {item.product.unit || 'əd.'}
                        </Text>

                        {hasCustomDiscount ? (
                          <View style={styles.itemDiscountBadge}>
                            <Tag size={10} color="#059669" />
                            <Text style={styles.itemDiscountBadgeText}>
                              {item.customPrice !== undefined
                                ? `${item.customPrice.toFixed(2)} ₼`
                                : item.discount
                                ? `-${item.discount}%`
                                : `-${item.product.discount_value}${item.product.discount_type === 'percent' ? '%' : '₼'}`}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.itemPriceEditBtn}>
                            <Edit2 size={11} color="#9CA3AF" />
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Right: Quantity Selector + Gift Button + Delete Button on ONE line */}
                  <View style={styles.itemControlsRow}>
                    {/* Counter */}
                    <View style={styles.counterRow}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => onUpdateQuantity(item.product.id, -1)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      >
                        <Minus size={15} color="#4B5563" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => onUpdateQuantity(item.product.id, 1)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      >
                        <Plus size={15} color="#111827" />
                      </TouchableOpacity>
                    </View>

                    {/* Gift button */}
                    <TouchableOpacity
                      style={[styles.giftBtn, item.isGift && styles.giftBtnActive]}
                      onPress={() => onToggleItemGift?.(item.product.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Gift size={16} color={item.isGift ? "#7C3AED" : "#6B7280"} />
                    </TouchableOpacity>

                    {/* Delete button */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => onRemoveItem(item.product.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyCart}>
              <ShoppingBag size={54} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Səbət boşdur</Text>
              <Text style={styles.emptySub}>
                Malların barkodunu skan edin və ya anbar bölməsindən səbətə əlavə edin
              </Text>
              <TouchableOpacity
                style={styles.emptyScanBtn}
                onPress={() => onOpenScanner('pos')}
              >
                <Barcode size={18} color="#fff" />
                <Text style={styles.emptyScanBtnText}>Barkod Skanerini Aç</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            cart.length > 0 && {
              paddingBottom: 340,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />

        {/* Swipeable Footer Checkout Panel */}
        {cart.length > 0 && (
          <>
          <Animated.View
            {...sheetPanResponder.panHandlers}
            style={[
              styles.footer,
              {
                bottom: bottomBarHeight,
                transform: [{ translateY: sheetTranslateY }],
              },
              keyboardHeight > 0 && {
                marginBottom: Platform.OS === 'android' ? keyboardHeight : 0,
              },
            ]}
          >
            <View style={styles.sheetTopHeader}>
              {/* Swipe Handle Bar */}
              <TouchableOpacity
                style={styles.sheetHandleArea}
                onPress={toggleSheetCollapsed}
                activeOpacity={0.8}
              >
                <View style={styles.sheetHandlePill} />
                <View style={styles.sheetHandleSubRow}>
                  <Text style={styles.sheetHandleHintText}>
                    {isSheetCollapsed
                      ? `Ödəniş panelini aç (${cart.length} məhsul)`
                      : `Səbətə baxmaq üçün aşağı sürüşdürün (${cart.length} məhsul)`}
                  </Text>
                  {isSheetCollapsed ? (
                    <ChevronUp size={15} color="#64748B" />
                  ) : (
                    <ChevronDown size={15} color="#64748B" />
                  )}
                </View>
              </TouchableOpacity>

              {/* Payment Methods: Nağd | Kart | Terminal | Qarışıq | Kredit | Birmarket */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.methodTabsScroll}
                contentContainerStyle={styles.methodTabs}
              >
                <TouchableOpacity
                  style={[styles.methodTab, paymentMethod === 'CASH' && styles.methodTabActive]}
                  onPress={() => handleSelectPaymentMethod('CASH')}
                >
                  <Banknote size={15} color={paymentMethod === 'CASH' ? '#10B981' : '#6B7280'} />
                  <Text
                    style={[
                      styles.methodTabText,
                      paymentMethod === 'CASH' && styles.methodTabTextActive,
                    ]}
                  >
                    Nağd
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTab, paymentMethod === 'CARD' && styles.methodTabActive]}
                  onPress={() => handleSelectPaymentMethod('CARD')}
                >
                  <CreditCard size={15} color={paymentMethod === 'CARD' ? '#10B981' : '#6B7280'} />
                  <Text
                    style={[
                      styles.methodTabText,
                      paymentMethod === 'CARD' && styles.methodTabTextActive,
                    ]}
                  >
                    Kart
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTab, paymentMethod === 'TERMINAL' && styles.methodTabActive]}
                  onPress={() => handleSelectPaymentMethod('TERMINAL')}
                >
                  <CreditCard size={15} color={paymentMethod === 'TERMINAL' ? '#10B981' : '#6B7280'} />
                  <Text
                    style={[
                      styles.methodTabText,
                      paymentMethod === 'TERMINAL' && styles.methodTabTextActive,
                    ]}
                  >
                    Terminal
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTab, paymentMethod === 'SPLIT' && styles.methodTabActivePurple]}
                  onPress={() => handleSelectPaymentMethod('SPLIT')}
                >
                  <Layers size={15} color={paymentMethod === 'SPLIT' ? '#7C3AED' : '#6B7280'} />
                  <Text
                    style={[
                      styles.methodTabText,
                      paymentMethod === 'SPLIT' && styles.methodTabTextActivePurple,
                    ]}
                  >
                    Qarışıq
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTab, paymentMethod === 'CREDIT' && styles.methodTabActiveBlue]}
                  onPress={() => handleSelectPaymentMethod('CREDIT')}
                >
                  <Calculator size={15} color={paymentMethod === 'CREDIT' ? '#2563EB' : '#6B7280'} />
                  <Text
                    style={[
                      styles.methodTabText,
                      paymentMethod === 'CREDIT' && styles.methodTabTextActiveBlue,
                    ]}
                  >
                    Kredit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTab, paymentMethod === 'BIRMARKET' && styles.methodTabActiveRose]}
                  onPress={() => handleSelectPaymentMethod('BIRMARKET')}
                >
                  <Store size={15} color={paymentMethod === 'BIRMARKET' ? '#E11D48' : '#6B7280'} />
                  <Text
                    style={[
                      styles.methodTabText,
                      paymentMethod === 'BIRMARKET' && styles.methodTabTextActiveRose,
                    ]}
                  >
                    Birmarket
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTab, styles.methodTabIndigo]}
                  onPress={handleOpenRentModal}
                >
                  <KeyRound size={15} color="#4F46E5" />
                  <Text style={[styles.methodTabText, styles.methodTabTextIndigo]}>
                    İcarə
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            <ScrollView
              ref={footerScrollRef}
              style={styles.footerScroll}
              contentContainerStyle={styles.footerScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              scrollEnabled={true}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (h > 0) {
                  sheetBodyHeightRef.current = h;
                  if (isSheetCollapsedRef.current) {
                    sheetTranslateY.setValue(h);
                    currentTranslateYRef.current = h;
                  }
                }
              }}
              onScroll={(e) => {
                footerScrollOffsetRef.current = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            >

            {/* If CREDIT: Render live Credit Calculator */}
            {paymentMethod === 'CREDIT' && (
              <View style={styles.creditCalcBox}>
                {/* Bank selector */}
                <Text style={styles.creditSectionLabel}>Bank seçimi:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                  nestedScrollEnabled={true}
                >
                  {CREDIT_BANKS.map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.bankChip, selectedBank === b && styles.bankChipActive]}
                      onPress={() => setSelectedBank(b)}
                    >
                      <Text style={[styles.bankChipText, selectedBank === b && styles.bankChipTextActive]}>
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Months selector */}
                <Text style={styles.creditSectionLabel}>Kredit müddəti (Aylar):</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                  nestedScrollEnabled={true}
                >
                  {availableMonths.map((m) => {
                    const mRes = calculateCredit(discountedBase, selectedBank, m);
                    const isSelected = installmentMonths === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.monthChip, isSelected && styles.monthChipActive]}
                        onPress={() => setInstallmentMonths(m)}
                      >
                        <Text style={[styles.monthChipText, isSelected && styles.monthChipTextActive]}>
                          {m} ay
                        </Text>
                        <Text style={[styles.monthSubText, isSelected && styles.monthSubTextActive]}>
                          +{mRes.markupPercent.toFixed(1)}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Live Calculation Summary Card */}
                <View style={styles.creditMetricsCard}>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Məhsulun ilkin cəmi:</Text>
                    <Text style={styles.metricVal}>{subtotal.toFixed(2)} ₼</Text>
                  </View>
                  {discountAmount > 0 && (
                    <View style={styles.metricRow}>
                      <Text style={styles.discountLabelGreen}>
                        Endirim {discountType === 'percent' ? `(${discountInput}%)` : ''}:
                      </Text>
                      <Text style={styles.discountValGreen}>
                        -{discountAmount.toFixed(2)} ₼
                      </Text>
                    </View>
                  )}
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Məhsulun dəyəri:</Text>
                    <Text style={styles.metricValBold}>{discountedBase.toFixed(2)} ₼</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Faiz dərəcəsi:</Text>
                    <Text style={styles.metricValOrange}>
                      {creditResult.markupPercent.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Cəmi:</Text>
                    <Text style={styles.metricValBold}>{creditResult.contractTotal.toFixed(2)} ₼</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Faiz məbləği (Manatla):</Text>
                    <Text style={styles.metricValOrange}>
                      +{creditResult.interestAmount.toFixed(2)} ₼
                    </Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Kredit şöbəsinə göndərilən məbləğ:</Text>
                    <Text style={styles.metricValBold}>{creditResult.bankSentAmount.toFixed(2)} ₼</Text>
                  </View>

                  {/* Monthly payment highlighted */}
                  <View style={styles.monthlyHighlightBox}>
                    <Text style={styles.monthlyHighlightLabel}>Aylıq ödəniş:</Text>
                    <Text style={styles.monthlyHighlightVal}>
                      {creditResult.monthlyPayment.toFixed(2)} ₼ / ay
                    </Text>
                  </View>

                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Kassaya vurulan məbləğ:</Text>
                    <Text style={styles.metricValBold}>{creditResult.grossAmount.toFixed(2)} ₼</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Alver cədvəlinə yazılan məbləğ:</Text>
                    <Text style={styles.metricValBold}>{creditResult.alverAmount.toFixed(2)} ₼</Text>
                  </View>
                </View>

                {/* Customer Information Form */}
                <View style={styles.clientForm}>
                  <View style={styles.clientInputWrapper}>
                    <User size={16} color="#64748B" />
                    <TextInput
                      style={styles.clientInput}
                      placeholder="Müştəri adı *"
                      placeholderTextColor="#9CA3AF"
                      value={clientName}
                      onChangeText={setClientName}
                    />
                  </View>

                  <View style={styles.clientInputWrapper}>
                    <Phone size={16} color="#64748B" />
                    <TextInput
                      style={styles.clientInput}
                      placeholder="Əlaqə nömrəsi"
                      placeholderTextColor="#9CA3AF"
                      value={clientPhone}
                      onChangeText={setClientPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* If SPLIT: Render Split payment inputs */}
            {paymentMethod === 'SPLIT' && (
              <View style={styles.splitCalcBox}>
                <View style={styles.splitHeaderRow}>
                  <Text style={styles.splitSectionTitle}>Qarışıq Ödəniş Bölgüsü</Text>
                  <Text style={styles.splitTotalHeader}>Yekun: {discountedBase.toFixed(2)} ₼</Text>
                </View>

                {/* 2x2 Grid for Split Methods: Row 1 (Nağd, Kart), Row 2 (Terminal, Kredit) */}
                <View style={styles.splitGrid}>
                  {/* Row 1: Nağd & Kart */}
                  <View style={styles.splitGridRow}>
                    {/* 1. Nağd */}
                    <View style={styles.splitGridCol}>
                      <View style={styles.splitInputHeader}>
                        <View style={styles.splitLabelWithDot}>
                          <View style={[styles.splitColorDot, { backgroundColor: '#10B981' }]} />
                          <Text style={styles.splitFieldLabel} numberOfLines={1}>Nağd</Text>
                        </View>
                        {remainingSplit > 0 && numSplitCash === 0 && (
                          <TouchableOpacity
                            style={styles.splitFillBtn}
                            onPress={() => fillRemainingSplit('cash')}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Text style={styles.splitFillBtnText}>
                              + Qalıq (₼{remainingSplit.toFixed(remainingSplit % 1 === 0 ? 0 : 2)})
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.splitInputWrapper}>
                        <Text style={styles.splitCurrencyPrefix}>₼</Text>
                        <TextInput
                          style={styles.splitTextInput}
                          placeholder="0.00"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                          value={splitCash}
                          onChangeText={setSplitCash}
                        />
                      </View>
                    </View>

                    {/* 2. Kart */}
                    <View style={styles.splitGridCol}>
                      <View style={styles.splitInputHeader}>
                        <View style={styles.splitLabelWithDot}>
                          <View style={[styles.splitColorDot, { backgroundColor: '#3B82F6' }]} />
                          <Text style={styles.splitFieldLabel} numberOfLines={1}>Kart</Text>
                        </View>
                        {remainingSplit > 0 && numSplitCard === 0 && (
                          <TouchableOpacity
                            style={styles.splitFillBtn}
                            onPress={() => fillRemainingSplit('card')}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Text style={styles.splitFillBtnText}>
                              + Qalıq (₼{remainingSplit.toFixed(remainingSplit % 1 === 0 ? 0 : 2)})
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.splitInputWrapper}>
                        <Text style={styles.splitCurrencyPrefix}>₼</Text>
                        <TextInput
                          style={styles.splitTextInput}
                          placeholder="0.00"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                          value={splitCard}
                          onChangeText={setSplitCard}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Row 2: Terminal & Kredit */}
                  <View style={styles.splitGridRow}>
                    {/* 3. Terminal */}
                    <View style={styles.splitGridCol}>
                      <View style={styles.splitInputHeader}>
                        <View style={styles.splitLabelWithDot}>
                          <View style={[styles.splitColorDot, { backgroundColor: '#06B6D4' }]} />
                          <Text style={styles.splitFieldLabel} numberOfLines={1}>Terminal</Text>
                        </View>
                        {remainingSplit > 0 && numSplitTerminal === 0 && (
                          <TouchableOpacity
                            style={styles.splitFillBtn}
                            onPress={() => fillRemainingSplit('terminal')}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Text style={styles.splitFillBtnText}>
                              + Qalıq (₼{remainingSplit.toFixed(remainingSplit % 1 === 0 ? 0 : 2)})
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.splitInputWrapper}>
                        <Text style={styles.splitCurrencyPrefix}>₼</Text>
                        <TextInput
                          style={styles.splitTextInput}
                          placeholder="0.00"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                          value={splitTerminal}
                          onChangeText={setSplitTerminal}
                        />
                      </View>
                    </View>

                    {/* 4. Kredit Payı */}
                    <View style={styles.splitGridCol}>
                      <View style={styles.splitInputHeader}>
                        <View style={styles.splitLabelWithDot}>
                          <View style={[styles.splitColorDot, { backgroundColor: '#8B5CF6' }]} />
                          <Text style={styles.splitFieldLabel} numberOfLines={1}>Kredit payı</Text>
                        </View>
                        {remainingSplit > 0 && numSplitCredit === 0 && (
                          <TouchableOpacity
                            style={styles.splitFillBtn}
                            onPress={() => fillRemainingSplit('credit')}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Text style={styles.splitFillBtnText}>
                              + Qalıq (₼{remainingSplit.toFixed(remainingSplit % 1 === 0 ? 0 : 2)})
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.splitInputWrapper}>
                        <Text style={styles.splitCurrencyPrefix}>₼</Text>
                        <TextInput
                          style={styles.splitTextInput}
                          placeholder="0.00"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                          value={splitCredit}
                          onChangeText={setSplitCredit}
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* If Kredit Payı > 0, show Bank selector, Months selector, and Full Details Panel */}
                {numSplitCredit > 0 && (
                  <View style={styles.splitCreditSubBox}>
                    <Text style={styles.creditSectionLabel}>Kredit Bankı:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipsRow}
                      nestedScrollEnabled={true}
                    >
                      {CREDIT_BANKS.map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={[styles.bankChip, splitCreditBank === b && styles.bankChipActive]}
                          onPress={() => setSplitCreditBank(b)}
                        >
                          <Text style={[styles.bankChipText, splitCreditBank === b && styles.bankChipTextActive]}>
                            {b}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.creditSectionLabel}>Müddət (Aylar):</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipsRow}
                      nestedScrollEnabled={true}
                    >
                      {splitAvailableMonths.map((m) => {
                        const isSel = splitCreditMonths === m;
                        const mRes = calculateCredit(numSplitCredit, splitCreditBank, m);
                        return (
                          <TouchableOpacity
                            key={m}
                            style={[styles.monthChip, isSel && styles.monthChipActive]}
                            onPress={() => setSplitCreditMonths(m)}
                          >
                            <Text style={[styles.monthChipText, isSel && styles.monthChipTextActive]}>
                              {m} ay
                            </Text>
                            <Text style={[styles.monthSubText, isSel && styles.monthSubTextActive]}>
                              +{mRes.markupPercent.toFixed(1)}%
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Detailed Credit Calculation Metrics for Split */}
                    <View style={styles.creditMetricsCard}>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Məhsulun dəyəri (Kredit payı):</Text>
                        <Text style={styles.metricValBold}>{numSplitCredit.toFixed(2)} ₼</Text>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Faiz dərəcəsi:</Text>
                        <Text style={styles.metricValOrange}>
                          {splitCreditResult.markupPercent.toFixed(1)}%
                        </Text>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Cəmi:</Text>
                        <Text style={styles.metricValBold}>{splitCreditResult.contractTotal.toFixed(2)} ₼</Text>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Faiz məbləği (Manatla):</Text>
                        <Text style={styles.metricValOrange}>
                          +{splitCreditResult.interestAmount.toFixed(2)} ₼
                        </Text>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Kredit şöbəsinə göndərilən məbləğ:</Text>
                        <Text style={styles.metricValBold}>{splitCreditResult.bankSentAmount.toFixed(2)} ₼</Text>
                      </View>

                      {/* Monthly payment highlighted */}
                      <View style={styles.monthlyHighlightBox}>
                        <Text style={styles.monthlyHighlightLabel}>Aylıq ödəniş:</Text>
                        <Text style={styles.monthlyHighlightVal}>
                          {splitCreditResult.monthlyPayment.toFixed(2)} ₼ / ay
                        </Text>
                      </View>

                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Kassaya vurulan məbləğ:</Text>
                        <Text style={styles.metricValBold}>{splitCreditResult.grossAmount.toFixed(2)} ₼</Text>
                      </View>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Alver cədvəlinə yazılan məbləğ:</Text>
                        <Text style={styles.metricValBold}>{splitCreditResult.alverAmount.toFixed(2)} ₼</Text>
                      </View>
                    </View>

                    {/* Client info required for credit */}
                    <View style={styles.clientForm}>
                      <View style={styles.clientInputWrapper}>
                        <User size={16} color="#64748B" />
                        <TextInput
                          style={styles.clientInput}
                          placeholder="Müştəri adı *"
                          placeholderTextColor="#9CA3AF"
                          value={clientName}
                          onChangeText={setClientName}
                        />
                      </View>
                      <View style={styles.clientInputWrapper}>
                        <Phone size={16} color="#64748B" />
                        <TextInput
                          style={styles.clientInput}
                          placeholder="Əlaqə nömrəsi"
                          placeholderTextColor="#9CA3AF"
                          value={clientPhone}
                          onChangeText={setClientPhone}
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Live Split Status indicator */}
                <View style={[
                  styles.splitStatusBox,
                  Math.abs(remainingSplit) < 0.01
                    ? styles.splitStatusSuccess
                    : remainingSplit > 0
                    ? styles.splitStatusWarning
                    : styles.splitStatusDanger
                ]}>
                  {Math.abs(remainingSplit) < 0.01 ? (
                    <Text style={styles.splitStatusTextSuccess}>✓ Məbləğ tam bölüşdürüldü ({discountedBase.toFixed(2)} ₼)</Text>
                  ) : remainingSplit > 0 ? (
                    <Text style={styles.splitStatusTextWarning}>⚠ Çatışmayan qalıq: ₼{remainingSplit.toFixed(2)}</Text>
                  ) : (
                    <Text style={styles.splitStatusTextDanger}>✕ Artıq məbləğ: ₼{Math.abs(remainingSplit).toFixed(2)}</Text>
                  )}
                </View>
              </View>
            )}

            {/* If DEPOSIT: Render Advance inputs */}
            {paymentMethod === 'DEPOSIT' && (
              <View style={styles.depositCalcBox}>
                <Text style={styles.depositSectionLabel}>Avans / Beh Parametrləri:</Text>

                <View style={styles.clientInputWrapper}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#B45309', paddingLeft: 4 }}>₼</Text>
                  <TextInput
                    style={styles.clientInput}
                    placeholder="Avans məbləği (₼) *"
                    placeholderTextColor="#9CA3AF"
                    value={advanceAmountInput}
                    onChangeText={setAdvanceAmountInput}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.clientInputWrapper, { marginTop: 8 }]}>
                  <User size={14} color="#9CA3AF" />
                  <TextInput
                    style={styles.clientInput}
                    placeholder="Avans kimə verilir (İşçi / Usta) *"
                    placeholderTextColor="#9CA3AF"
                    value={advanceRecipientInput}
                    onChangeText={setAdvanceRecipientInput}
                  />
                </View>

                {/* Balance display */}
                <View style={styles.depositSummaryBox}>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Ümumi satış:</Text>
                    <Text style={styles.metricValBold}>{total.toFixed(2)} ₼</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>Ödənilən avans:</Text>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#D97706' }}>
                      {(parseFloat(advanceAmountInput) || 0).toFixed(2)} ₼
                    </Text>
                  </View>
                  <View style={[styles.metricRow, { borderTopWidth: 1, borderTopColor: '#FEF3C7', paddingTop: 4, marginTop: 2 }]}>
                    <Text style={styles.metricLabel}>Qalıq borc:</Text>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#2563EB' }}>
                      {Math.max(0, total - (parseFloat(advanceAmountInput) || 0)).toFixed(2)} ₼
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* If BIRMARKET: Render Category picker and breakdown */}
            {paymentMethod === 'BIRMARKET' && (
              <View style={styles.birmarketCalcBox}>
                <Text style={styles.birmarketSectionLabel}>Birmarket Kateqoriyası:</Text>
                <View style={styles.chipsRow}>
                  <TouchableOpacity
                    style={[styles.birmarketChip, birmarketCategory === 'Alətlər' && styles.birmarketChipActive]}
                    onPress={() => setBirmarketCategory('Alətlər')}
                  >
                    <Text style={[styles.birmarketChipText, birmarketCategory === 'Alətlər' && styles.birmarketChipTextActive]}>
                      Alətlər (10% komissiya)
                    </Text>
                    <Text style={[styles.birmarketChipSubText, birmarketCategory === 'Alətlər' && styles.birmarketChipSubTextActive]}>
                      +17.51% artım
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.birmarketChip, birmarketCategory === 'Aksesuarlar' && styles.birmarketChipActive]}
                    onPress={() => setBirmarketCategory('Aksesuarlar')}
                  >
                    <Text style={[styles.birmarketChipText, birmarketCategory === 'Aksesuarlar' && styles.birmarketChipTextActive]}>
                      Aksesuarlar (15% komissiya)
                    </Text>
                    <Text style={[styles.birmarketChipSubText, birmarketCategory === 'Aksesuarlar' && styles.birmarketChipSubTextActive]}>
                      +24.5% artım
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Calculation breakdown */}
                <View style={styles.birmarketSummaryBox}>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Məhsulun ilkin cəmi:</Text>
                    <Text style={styles.metricVal}>{discountedBase.toFixed(2)} ₼</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Sayt üçün artım (Markup):</Text>
                    <Text style={[styles.metricVal, { color: '#E11D48', fontWeight: '700' }]}>+{birmarketResult.markupRate}%</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Saytda / Kassaya məbləğ:</Text>
                    <Text style={[styles.metricVal, { color: '#E11D48', fontWeight: '900', fontSize: 13 }]}>
                      {birmarketResult.gross.toFixed(2)} ₼
                    </Text>
                  </View>
                  <View style={[styles.metricRow, { borderTopWidth: 1, borderTopColor: '#FECDD3', paddingTop: 4, marginTop: 2 }]}>
                    <Text style={[styles.metricLabel, { fontWeight: '700', color: '#059669' }]}>
                      Mağazanın xalis mənfəəti:
                    </Text>
                    <Text style={[styles.metricVal, { color: '#059669', fontWeight: '900', fontSize: 13 }]}>
                      {birmarketResult.profit.toFixed(2)} ₼
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Satış Kanalı Selector */}
            <View style={styles.channelContainer}>
              <View style={styles.channelHeaderRow}>
                <Text style={styles.channelSectionLabel}>SATIŞ KANALI</Text>
                <TouchableOpacity
                  style={styles.addChannelQuickBtn}
                  onPress={() => setChannelPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Plus size={13} color="#2563EB" />
                  <Text style={styles.addChannelQuickBtnText}>Yeni kanal</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.channelPickerBtn}
                onPress={() => setChannelPickerVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.channelPickerLeft}>
                  <Share2 size={16} color="#2563EB" />
                  <Text style={styles.channelPickerText}>{salesChannel}</Text>
                </View>
                <ChevronDown size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Discount Panel (Always available and interactive) */}
            <View style={styles.discountContainer}>
              <View style={styles.discountHeaderRow}>
                <View style={styles.discountLeftGroup}>
                  <Tag size={15} color="#059669" />
                  <Text style={styles.discountSectionTitle}>Endirim:</Text>
                </View>

                <View style={styles.discountRightControls}>
                  {/* Switcher: ₼ vs % */}
                  <View style={styles.discountTypeToggle}>
                    <TouchableOpacity
                      style={[
                        styles.discountTypeBtn,
                        discountType === 'fixed' && styles.discountTypeBtnActive,
                      ]}
                      onPress={() => setDiscountType('fixed')}
                    >
                      <Text
                        style={[
                          styles.discountTypeBtnText,
                          discountType === 'fixed' && styles.discountTypeBtnTextActive,
                        ]}
                      >
                        ₼
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.discountTypeBtn,
                        discountType === 'percent' && styles.discountTypeBtnActive,
                      ]}
                      onPress={() => setDiscountType('percent')}
                    >
                      <Text
                        style={[
                          styles.discountTypeBtnText,
                          discountType === 'percent' && styles.discountTypeBtnTextActive,
                        ]}
                      >
                        %
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Input field */}
                  <View style={styles.discountInputWrapper}>
                    <TextInput
                      style={styles.discountInput}
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={discountInput}
                      onChangeText={setDiscountInput}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    <Text style={styles.discountInputUnit}>
                      {discountType === 'percent' ? '%' : '₼'}
                    </Text>
                    {discountInput ? (
                      <TouchableOpacity
                        onPress={() => setDiscountInput('')}
                        style={styles.discountClearBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <X size={13} color="#9CA3AF" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>

            {/* Standard Summary Row (when not credit) */}
            {paymentMethod !== 'CREDIT' && (
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Məbləğ:</Text>
                  <Text style={styles.summaryVal}>{subtotal.toFixed(2)} ₼</Text>
                </View>

                {discountAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryDiscountRow}>
                      <Tag size={13} color="#059669" />
                      <Text style={styles.discountLabelGreen}>
                        Endirim {discountType === 'percent' ? `(${discountInput}%)` : ''}:
                      </Text>
                    </View>
                    <Text style={styles.discountValGreen}>
                      -{discountAmount.toFixed(2)} ₼
                    </Text>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Yekun ödəniş:</Text>
                  <Text style={styles.finalTotal}>{total.toFixed(2)} ₼</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* Fixed Bottom Checkout Action Bar (stays pinned at bottom while sheet slides smoothly behind it) */}
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - bottomBarHeight) > 1) {
              setBottomBarHeight(h);
            }
          }}
          style={[
            styles.bottomCheckoutBar,
            keyboardHeight > 0 && {
              marginBottom: Platform.OS === 'android' ? keyboardHeight : 0,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.checkoutBtn,
              paymentMethod === 'CREDIT' && styles.checkoutBtnBlue,
              paymentMethod === 'SPLIT' && styles.checkoutBtnPurple,
            ]}
            onPress={handleCheckout}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <CheckCircle2 size={20} color="#fff" />
                <Text style={styles.checkoutBtnText}>
                  {paymentMethod === 'CREDIT'
                    ? `Kreditlə təsdiqlə (${creditResult.monthlyPayment.toFixed(2)} ₼ / ay)`
                    : paymentMethod === 'SPLIT'
                    ? `Bölgünü təsdiqlə (${discountedBase.toFixed(2)} ₼)`
                    : `Ödənişi təsdiqlə (${total.toFixed(2)} ₼)`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </>
      )}
      </KeyboardAvoidingView>

      {/* Item Custom Price & Discount Modal */}
      <Modal
        visible={editingItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.itemModalCard}>
            <View style={styles.itemModalHeader}>
              <View style={styles.itemModalTitleRow}>
                <Tag size={18} color="#059669" />
                <Text style={styles.itemModalTitle}>Məhsul Qiyməti / Endirim</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditingItem(null)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {editingItem && (
              <View style={styles.itemModalBody}>
                <Text style={styles.modalProductName} numberOfLines={2}>
                  {editingItem.product.name}
                </Text>
                <Text style={styles.modalStandardPrice}>
                  Standart qiymət:{' '}
                  <Text style={{ fontWeight: '800', color: '#111827' }}>
                    {(
                      editingItem.product.sale_price ??
                      editingItem.product.price ??
                      0
                    ).toFixed(2)}{' '}
                    ₼
                  </Text>
                </Text>

                {/* Option 1: Custom Price */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Xüsusi vahid qiymət (₼):</Text>
                  <View style={styles.modalInputWrapper}>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Məs. 8.50"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={itemCustomPriceInput}
                      onChangeText={(val) => {
                        setItemCustomPriceInput(val);
                        if (val) setItemDiscountPercentInput('');
                      }}
                    />
                    <Text style={styles.modalInputSuffix}>₼</Text>
                  </View>
                </View>

                {/* Option 2: Discount Percent */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Və ya məhsula faiz endirimi (%):</Text>
                  <View style={styles.modalInputWrapper}>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Məs. 10"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={itemDiscountPercentInput}
                      onChangeText={(val) => {
                        setItemDiscountPercentInput(val);
                        if (val) setItemCustomPriceInput('');
                      }}
                    />
                    <Text style={styles.modalInputSuffix}>%</Text>
                  </View>
                  <View style={styles.quickPctRow}>
                    {[5, 10, 15, 20, 30].map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.quickPctChip,
                          itemDiscountPercentInput === String(p) && styles.quickPctChipActive,
                        ]}
                        onPress={() => {
                          setItemDiscountPercentInput(String(p));
                          setItemCustomPriceInput('');
                        }}
                      >
                        <Text
                          style={[
                            styles.quickPctChipText,
                            itemDiscountPercentInput === String(p) &&
                              styles.quickPctChipTextActive,
                          ]}
                        >
                          {p}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Option 3: Gift Toggle Button */}
                <TouchableOpacity
                  style={[styles.modalGiftToggleBtn, editingItem.isGift && styles.modalGiftToggleBtnActive]}
                  onPress={() => {
                    onToggleItemGift?.(editingItem.product.id);
                    setEditingItem(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Gift size={18} color={editingItem.isGift ? '#fff' : '#7C3AED'} />
                  <Text style={[styles.modalGiftToggleText, editingItem.isGift && styles.modalGiftToggleTextActive]}>
                    {editingItem.isGift ? 'Hədiyyəni ləğv et (Satışa qaytar)' : '🎁 Hədiyyə kimi qeyd et (0.00 ₼)'}
                  </Text>
                </TouchableOpacity>

                {/* Action Buttons */}
                <View style={styles.modalActionButtons}>
                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={handleResetItemPrice}
                  >
                    <RotateCcw size={14} color="#6B7280" />
                    <Text style={styles.resetBtnText}>Sıfırla</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={handleApplyItemPrice}
                  >
                    <Check size={16} color="#fff" />
                    <Text style={styles.applyBtnText}>Tətbiq et</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Printer Settings Modal */}
      <PrinterSettingsModal
        visible={printerModalVisible}
        onClose={() => setPrinterModalVisible(false)}
      />

      {/* Sale Completed & Receipt Print Modal */}
      <SaleSuccessModal
        visible={successModalVisible}
        receiptData={completedReceiptData}
        onClose={() => setSuccessModalVisible(false)}
        onOpenPrinterSettings={() => setPrinterModalVisible(true)}
      />
      {/* Sales Channel Picker Modal */}
      <SalesChannelPickerModal
        visible={channelPickerVisible}
        onClose={() => setChannelPickerVisible(false)}
        selectedChannel={salesChannel}
        onSelectChannel={(ch) => setSalesChannel(ch)}
        channels={channels}
        customChannels={customChannels}
        onAddChannel={handleAddCustomChannel}
        onDeleteChannel={handleDeleteCustomChannel}
      />
      {/* Rent / Lease Product Modal (Girovla İcarəyə Ver) */}
      <RentProductModal
        visible={rentModalVisible}
        onClose={() => setRentModalVisible(false)}
        products={cart.map((item) => ({
          ...item.product,
          price: getItemEffectivePrice(item),
          sale_price: getItemEffectivePrice(item),
        }))}
        onSuccess={() => {
          setRentModalVisible(false);
          onClearCart();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  printerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  sub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  scanBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 20,
  },
  itemRow: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemPriceCol: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  itemUnitPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemUnitPriceText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemPrice: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  itemDiscountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  itemDiscountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  itemPriceEditBtn: {
    padding: 2,
  },
  itemControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 4,
    height: 38,
    gap: 2,
  },
  stepBtn: {
    width: 28,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    minWidth: 22,
    textAlign: 'center',
  },
  itemTotalCol: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  giftBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  giftBtnActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#DDD6FE',
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyScanBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cartList: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 58,
    zIndex: 20,
    elevation: 14,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 5,
    paddingBottom: 2,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    maxHeight: '89%',
  },
  bottomCheckoutBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
    elevation: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 10 : 6,
  },
  sheetTopHeader: {
    flexShrink: 0,
    flexGrow: 0,
    backgroundColor: '#fff',
    zIndex: 5,
    paddingBottom: 6,
  },
  sheetHandleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    paddingBottom: 4,
  },
  sheetHandlePill: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 3,
  },
  sheetHandleSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sheetHandleHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  footerScroll: {
    flexGrow: 0,
    flexShrink: 1,
    overflow: 'hidden',
  },
  footerScrollContent: {
    paddingTop: 2,
    paddingBottom: 24,
  },
  methodTabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 42,
    minHeight: 42,
    maxHeight: 42,
  },
  methodTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
    height: 42,
  },
  methodTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    minHeight: 38,
    maxHeight: 38,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  methodTabActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  methodTabActiveBlue: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  methodTabActiveAmber: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  methodTabActivePurple: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  methodTabActiveRose: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#E11D48',
  },
  methodTabIndigo: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  methodTabTextActive: {
    color: '#10B981',
    fontWeight: '800',
  },
  methodTabTextActiveBlue: {
    color: '#2563EB',
    fontWeight: '800',
  },
  methodTabTextActiveAmber: {
    color: '#D97706',
    fontWeight: '800',
  },
  methodTabTextActivePurple: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  methodTabTextActiveRose: {
    color: '#E11D48',
    fontWeight: '800',
  },
  methodTabTextIndigo: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  birmarketCalcBox: {
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  birmarketSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9F1239',
    marginBottom: 6,
  },
  birmarketChip: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birmarketChipActive: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
  },
  birmarketChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  birmarketChipTextActive: {
    color: '#fff',
  },
  birmarketChipSubText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E11D48',
    marginTop: 2,
  },
  birmarketChipSubTextActive: {
    color: '#FFE4E6',
  },
  birmarketSummaryBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginTop: 6,
    gap: 4,
  },
  depositCalcBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  depositSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 6,
  },
  depositSummaryBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 8,
    gap: 4,
  },
  creditCalcBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 8,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  creditSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 5,
  },
  bankChip: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 38,
  },
  bankChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bankChipText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  bankChipTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  monthChip: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 45,
    minWidth: 58,
  },
  monthChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  monthChipText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#334155',
  },
  monthChipTextActive: {
    color: '#fff',
  },
  monthSubText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
  },
  monthSubTextActive: {
    color: '#DBEAFE',
  },
  creditMetricsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
    gap: 2,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 1,
  },
  metricLabel: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  metricVal: {
    fontSize: 13.5,
    color: '#1E293B',
    fontWeight: '700',
  },
  metricValOrange: {
    fontSize: 13.5,
    color: '#EA580C',
    fontWeight: '800',
  },
  metricValBold: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '800',
  },
  monthlyHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginVertical: 2,
  },
  monthlyHighlightLabel: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '800',
  },
  monthlyHighlightVal: {
    fontSize: 16.5,
    color: '#1D4ED8',
    fontWeight: '900',
  },
  clientForm: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  clientInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 6,
    height: 42,
  },
  clientInput: {
    flex: 1,
    paddingVertical: 2,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#111827',
  },

  // Sales Channel Styles
  channelContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  channelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  channelSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  addChannelQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  addChannelQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  channelPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  channelPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelPickerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Discount Container Styles
  discountContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  discountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  discountLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discountSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  discountRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 2,
    height: 36,
    width: 82,
    alignItems: 'stretch',
  },
  discountTypeBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  discountTypeBtnActive: {
    backgroundColor: '#10B981',
  },
  discountTypeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  discountTypeBtnTextActive: {
    color: '#fff',
    fontWeight: '900',
  },
  discountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 36,
    minWidth: 82,
  },
  discountInput: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    paddingVertical: 0,
    textAlign: 'right',
    flex: 1,
  },
  discountInputUnit: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 3,
  },
  discountClearBtn: {
    marginLeft: 4,
    padding: 2,
  },

  // Summary box styles
  summaryBox: {
    marginBottom: 6,
    gap: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  summaryDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '700',
  },
  discountLabelGreen: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
  },
  discountValGreen: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '800',
  },
  finalTotal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  checkoutBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 2,
  },
  checkoutBtnBlue: {
    backgroundColor: '#2563EB',
  },
  checkoutBtnPurple: {
    backgroundColor: '#7C3AED',
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  // Split Payment Styles
  splitCalcBox: {
    backgroundColor: '#FAFAFE',
    borderRadius: 14,
    padding: 9,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  splitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
  splitSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#4338CA',
  },
  splitTotalHeader: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E1B4B',
  },
  splitGrid: {
    gap: 6,
    marginBottom: 6,
  },
  splitGridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  splitGridCol: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  splitInputCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 5,
  },
  splitInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  splitLabelWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  splitColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  splitFieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    flexShrink: 1,
  },
  splitFillBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    flexShrink: 0,
  },
  splitFillBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4F46E5',
  },
  splitInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  splitCurrencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginRight: 4,
  },
  splitTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    paddingVertical: 4,
  },
  splitCreditSubBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  splitStatusBox: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
  },
  splitStatusSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  splitStatusWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  splitStatusDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  splitStatusTextSuccess: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'center',
  },
  splitStatusTextWarning: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#92400E',
    textAlign: 'center',
  },
  splitStatusTextDanger: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#991B1B',
    textAlign: 'center',
  },

  // Item Price Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  itemModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  itemModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  modalCloseBtn: {
    padding: 4,
  },
  itemModalBody: {
    gap: 12,
  },
  modalProductName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalStandardPrice: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalInputGroup: {
    gap: 4,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  modalInputSuffix: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 6,
  },
  quickPctRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  quickPctChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 6,
  },
  quickPctChipActive: {
    backgroundColor: '#10B981',
  },
  quickPctChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  quickPctChipTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 11,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  applyBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 11,
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  itemRowGift: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  giftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  giftBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#7C3AED',
  },
  giftPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  originalPriceStrikethrough: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  giftZeroPrice: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7C3AED',
  },
  itemTotalGift: {
    color: '#7C3AED',
  },
  itemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalGiftToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  modalGiftToggleBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#6D28D9',
  },
  modalGiftToggleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7C3AED',
  },
  modalGiftToggleTextActive: {
    color: '#fff',
  },
});
