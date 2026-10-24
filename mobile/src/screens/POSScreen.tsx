import React, { useState, useMemo, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';
import { POSCartItem } from '../types';
import { salesService, POSPaymentMethod } from '../services/salesService';
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
}

export const POSScreen: React.FC<POSScreenProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenScanner,
  onUpdateItemPrice,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<POSPaymentMethod>('CASH');
  const [selectedBank, setSelectedBank] = useState<CreditBank>('ABB Kredit');
  const [installmentMonths, setInstallmentMonths] = useState<number>(12);

  // Global Cart Discount State
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [discountInput, setDiscountInput] = useState('');

  // Client info for Credit sales
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [advanceAmountInput, setAdvanceAmountInput] = useState('');
  const [advanceRecipientInput, setAdvanceRecipientInput] = useState('');
  const [processing, setProcessing] = useState(false);

  // Printer & Checkout Success Modals
  const [printerModalVisible, setPrinterModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [completedReceiptData, setCompletedReceiptData] = useState<SaleReceiptData | null>(null);

  // Item Price / Discount Editing Modal State
  const [editingItem, setEditingItem] = useState<POSCartItem | null>(null);
  const [itemCustomPriceInput, setItemCustomPriceInput] = useState('');
  const [itemDiscountPercentInput, setItemDiscountPercentInput] = useState('');

  // Calculate effective price for each item
  const getItemEffectivePrice = (item: POSCartItem): number => {
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

  const total =
    paymentMethod === 'CREDIT'
      ? creditResult.contractTotal
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
          creditDetails,
          depositDetails: paymentMethod === 'DEPOSIT' ? {
            advanceAmount: parseFloat(advanceAmountInput) || 0,
            advanceRecipient: advanceRecipientInput.trim(),
          } : undefined,
        }
      );

      const methodLabel =
        paymentMethod === 'CASH'
          ? 'Nağd'
          : paymentMethod === 'CARD'
          ? 'Kartdan karta(Hesab)'
          : paymentMethod === 'TRANSFER'
          ? 'Köçürmə'
          : paymentMethod === 'DEPOSIT'
          ? 'Beh (Avans)'
          : 'Kredit';

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
        })),
        subtotal,
        discountAmount,
        discountType,
        discountValue: discountVal,
        total: res.total,
        paymentMethod: methodLabel,
        cashierName: 'Kassir',
        warehouseName: 'DÜKKAN - ƏHMƏDLİ',
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
        depositDetails:
          paymentMethod === 'DEPOSIT'
            ? {
                advanceAmount: parseFloat(advanceAmountInput) || 0,
                advanceRecipient: advanceRecipientInput.trim(),
                remainingBalance: Math.max(0, res.total - (parseFloat(advanceAmountInput) || 0)),
              }
            : undefined,
        clientName: formattedClient,
        clientPhone: clientPhone.trim() || undefined,
      };

      // Auto-print if enabled in printer config
      receiptService.getConfig().then((cfg) => {
        if (cfg.autoPrint) {
          receiptService.printReceipt(receiptData, cfg).catch((printErr) => {
            console.warn('Auto-print error:', printErr);
          });
        }
      });

      setCompletedReceiptData(receiptData);
      setSuccessModalVisible(true);
      onClearCart();
      setDiscountInput('');
      setClientName('');
      setClientPhone('');
      setAdvanceAmountInput('');
      setAdvanceRecipientInput('');
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
    <SafeAreaView style={styles.safeArea}>
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

        {/* Cart items list */}
        <FlatList
          data={cart}
          keyExtractor={(item) => item.product.id}
          renderItem={({ item }) => {
            const effectivePrice = getItemEffectivePrice(item);
            const basePrice = item.product.sale_price ?? item.product.price ?? 0;
            const itemTotal = effectivePrice * item.quantity;
            const hasCustomDiscount =
              item.customPrice !== undefined ||
              (item.discount && item.discount > 0) ||
              (item.product.discount_value && item.product.discount_value > 0);

            return (
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  
                  {/* Price display with edit tap */}
                  <TouchableOpacity
                    style={styles.itemPriceRow}
                    onPress={() => handleOpenItemModal(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.itemPrice}>
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
                  </TouchableOpacity>
                </View>

                {/* Counter */}
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => onUpdateQuantity(item.product.id, -1)}
                  >
                    <Minus size={16} color="#6B7280" />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => onUpdateQuantity(item.product.id, 1)}
                  >
                    <Plus size={16} color="#111827" />
                  </TouchableOpacity>
                </View>

                <View style={styles.itemTotalCol}>
                  <Text style={styles.itemTotal}>{itemTotal.toFixed(2)} ₼</Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => onRemoveItem(item.product.id)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
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
          contentContainerStyle={styles.listContent}
        />

        {/* Footer Checkout Panel */}
        {cart.length > 0 && (
          <View style={styles.footer}>
            {/* 5 Payment Methods: Nəğd | Kartdan karta | Beh | Köçürmə | Kredit */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodTabs}>
              <TouchableOpacity
                style={[styles.methodTab, paymentMethod === 'CASH' && styles.methodTabActive]}
                onPress={() => setPaymentMethod('CASH')}
              >
                <Banknote size={15} color={paymentMethod === 'CASH' ? '#10B981' : '#6B7280'} />
                <Text
                  style={[
                    styles.methodTabText,
                    paymentMethod === 'CASH' && styles.methodTabTextActive,
                  ]}
                >
                  Nəğd
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodTab, paymentMethod === 'CARD' && styles.methodTabActive]}
                onPress={() => setPaymentMethod('CARD')}
              >
                <CreditCard size={15} color={paymentMethod === 'CARD' ? '#10B981' : '#6B7280'} />
                <Text
                  style={[
                    styles.methodTabText,
                    paymentMethod === 'CARD' && styles.methodTabTextActive,
                  ]}
                >
                  Kartdan karta
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodTab, paymentMethod === 'DEPOSIT' && styles.methodTabActiveAmber]}
                onPress={() => setPaymentMethod('DEPOSIT')}
              >
                <Tag size={15} color={paymentMethod === 'DEPOSIT' ? '#D97706' : '#6B7280'} />
                <Text
                  style={[
                    styles.methodTabText,
                    paymentMethod === 'DEPOSIT' && styles.methodTabTextActiveAmber,
                  ]}
                >
                  Beh (Avans)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodTab, paymentMethod === 'TRANSFER' && styles.methodTabActive]}
                onPress={() => setPaymentMethod('TRANSFER')}
              >
                <Smartphone size={15} color={paymentMethod === 'TRANSFER' ? '#10B981' : '#6B7280'} />
                <Text
                  style={[
                    styles.methodTabText,
                    paymentMethod === 'TRANSFER' && styles.methodTabTextActive,
                  ]}
                >
                  Köçürmə
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodTab, paymentMethod === 'CREDIT' && styles.methodTabActiveBlue]}
                onPress={() => setPaymentMethod('CREDIT')}
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
            </ScrollView>

            {/* If CREDIT: Render live Credit Calculator */}
            {paymentMethod === 'CREDIT' && (
              <View style={styles.creditCalcBox}>
                {/* Bank selector */}
                <Text style={styles.creditSectionLabel}>Bank seçimi:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
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
                    <Text style={styles.metricLabel}>Kredit məbləği (Endirimlə):</Text>
                    <Text style={styles.metricValBold}>{discountedBase.toFixed(2)} ₼</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Bank faizi:</Text>
                    <Text style={styles.metricValOrange}>
                      +{creditResult.interestAmount.toFixed(2)} ₼ ({creditResult.markupPercent.toFixed(1)}%)
                    </Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Kredit müqavilə cəmi:</Text>
                    <Text style={styles.metricValBold}>{creditResult.contractTotal.toFixed(2)} ₼</Text>
                  </View>

                  {/* Monthly payment highlighted */}
                  <View style={styles.monthlyHighlightBox}>
                    <Text style={styles.monthlyHighlightLabel}>Aylıq ödəniş:</Text>
                    <Text style={styles.monthlyHighlightVal}>
                      {creditResult.monthlyPayment.toFixed(2)} ₼ / ay
                    </Text>
                  </View>
                </View>

                {/* Customer Information Form */}
                <View style={styles.clientForm}>
                  <View style={styles.clientInputWrapper}>
                    <User size={14} color="#9CA3AF" />
                    <TextInput
                      style={styles.clientInput}
                      placeholder="Müştəri adı *"
                      placeholderTextColor="#9CA3AF"
                      value={clientName}
                      onChangeText={setClientName}
                    />
                  </View>

                  <View style={styles.clientInputWrapper}>
                    <Phone size={14} color="#9CA3AF" />
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

            {/* Checkout Action Button */}
            <TouchableOpacity
              style={[styles.checkoutBtn, paymentMethod === 'CREDIT' && styles.checkoutBtnBlue]}
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
                      : `Ödənişi təsdiqlə (${total.toFixed(2)} ₼)`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
    padding: 16,
    paddingBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
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
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
  },
  stepBtn: {
    padding: 6,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    minWidth: 18,
    textAlign: 'center',
  },
  itemTotalCol: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  deleteBtn: {
    marginTop: 4,
    padding: 4,
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
  footer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 6,
  },
  methodTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
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
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  creditSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  bankChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bankChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  bankChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  bankChipTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  monthChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  monthChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  monthChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  monthChipTextActive: {
    color: '#fff',
  },
  monthSubText: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  monthSubTextActive: {
    color: '#DBEAFE',
  },
  creditMetricsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 4,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metricVal: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '600',
  },
  metricValOrange: {
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '700',
  },
  metricValBold: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  monthlyHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 2,
  },
  monthlyHighlightLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '800',
  },
  monthlyHighlightVal: {
    fontSize: 15,
    color: '#1D4ED8',
    fontWeight: '900',
  },
  clientForm: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  clientInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    gap: 6,
    height: 36,
  },
  clientInput: {
    flex: 1,
    paddingVertical: 2,
    fontSize: 12,
    color: '#111827',
  },

  // Discount Container Styles
  discountContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
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
    marginBottom: 10,
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
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryVal: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
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
    paddingVertical: 11,
    borderRadius: 12,
  },
  checkoutBtnBlue: {
    backgroundColor: '#2563EB',
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
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
});
