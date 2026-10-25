import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  RotateCcw, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  DollarSign, 
  CreditCard, 
  User, 
  Tag, 
  Calendar, 
  FileText, 
  Search, 
  Printer, 
  ShieldCheck, 
  ChevronDown, 
  Check, 
  Coins, 
  Banknote, 
  Repeat,
  Loader2,
  Sparkles,
  Info,
  Camera
} from 'lucide-react';
import ModalPortal from '../../components/Common/ModalPortal';
import CameraScannerModal from '../../components/Common/CameraScannerModal';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import { parseSaleNote, formatUnitName } from './SaleDetailModal';
import { printThermalReturnReceipt57mm } from './thermalReceiptService';

const RETURN_REASONS = [
  { id: 'wrong_product', labelAz: 'Müştəri səhv mal seçib / Yanlış alınıb', labelRu: 'Клиент ошибся с выбором / Куплен не тот товар' },
  { id: 'not_suitable', labelAz: 'Məhsul uyğun gəlmədi (ölçü, model, rəng)', labelRu: 'Не подошло (размер, модель, цвет)' },
  { id: 'defective', labelAz: 'Qüsur / Zavod defekti aşkarlandı', labelRu: 'Брак / Заводской дефект' },
  { id: 'changed_mind', labelAz: 'Müştəri imtina etdi / Fikrini dəyişdi', labelRu: 'Клиент отказался / Передумал' },
  { id: 'other', labelAz: 'Digər səbəb (qeyd edin)', labelRu: 'Другая причина (укажите вручную)' }
];

const ProductReturnModal = ({
  isOpen,
  onClose,
  sale,
  warehouseId,
  currentStaff,
  onReturnComplete,
  availableProducts = []
}) => {
  const { t, i18n } = useTranslation();

  // Operation Type: 'refund' (Pulu qaytarmaq) | 'exchange' (Məhsulu dəyişdirmək)
  const [operationType, setOperationType] = useState('refund');
  
  // Return details
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [selectedReasonId, setSelectedReasonId] = useState('wrong_product');
  const [customReasonText, setCustomReasonText] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash'); // 'cash' | 'card' | 'debt'
  const [restoreStock, setRestoreStock] = useState(true);
  const [markAsDamaged, setMarkAsDamaged] = useState(false);
  const [staffNote, setStaffNote] = useState('');

  // Exchange details
  const [exchangeSearch, setExchangeSearch] = useState('');
  const [warehouseProducts, setWarehouseProducts] = useState(availableProducts);
  const [selectedNewProduct, setSelectedNewProduct] = useState(null);
  const [exchangeQuantity, setExchangeQuantity] = useState(1);
  const [diffPaymentMethod, setDiffPaymentMethod] = useState('cash'); // when customer pays extra
  const [diffRefundMethod, setDiffRefundMethod] = useState('cash');   // when customer receives change

  // Customer info & debts
  const [customerData, setCustomerData] = useState(null);

  // States
  const [loading, setLoading] = useState(false);
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Barcode Scanner Mode State & Refs
  const barcodeInputRef = useRef(null);
  const [barcodeMode, setBarcodeMode] = useState(() => {
    try {
      return localStorage.getItem('crm_exchange_scanner_mode') !== 'false';
    } catch (e) {
      return true;
    }
  });
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // POS Beep sound on successful scan
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  // Barcode scan handler for replacement product
  const handleBarcodeScan = async (scannedCode) => {
    const code = String(scannedCode || '').trim();
    if (!code) return;

    // 1. Search in local warehouseProducts
    let matched = warehouseProducts.find(p => 
      String(p.barcode || '').trim().toLowerCase() === code.toLowerCase()
    );

    // 2. Direct Supabase query fallback if product is beyond initial 300
    if (!matched) {
      try {
        setSearchingProducts(true);
        const targetWId = warehouseId || sale?.warehouse_id;
        let q = supabase
          .from('products')
          .select('id, name, barcode, price, purchase_price, stock_quantity, unit, category_id, is_deleted')
          .eq('is_deleted', false)
          .eq('barcode', code);
        if (targetWId) q = q.eq('warehouse_id', targetWId);

        const { data: dbMatches } = await q.limit(1);
        if (dbMatches && dbMatches.length > 0) {
          matched = dbMatches[0];
          setWarehouseProducts(prev => [matched, ...prev.filter(p => p.id !== matched.id)]);
        }
      } catch (err) {
        console.warn('Barcode DB lookup error:', err);
      } finally {
        setSearchingProducts(false);
      }
    }

    if (matched) {
      playBeep();
      setSelectedNewProduct(matched);
      setExchangeQuantity(1);
      setExchangeSearch('');
      toast.success(
        i18n.language === 'az' 
          ? `Məhsul seçildi: ${matched.name}` 
          : `Товар выбран: ${matched.name}`
      );
    } else {
      toast.error(
        i18n.language === 'az'
          ? `Barkod tapılmadı: ${code}`
          : `Штрихкод не найден: ${code}`
      );
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (exchangeSearch.trim()) {
      handleBarcodeScan(exchangeSearch.trim());
    }
  };

  // Focus barcode input when in exchange mode
  useEffect(() => {
    if (operationType === 'exchange' && barcodeMode && !selectedNewProduct) {
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    }
  }, [operationType, barcodeMode, selectedNewProduct]);

  // Parse original sale
  const prod = sale?.products;
  const soldQty = Math.max(1, Math.abs(parseFloat(sale?.quantity) || 1));
  const saleInfo = useMemo(() => {
    return parseSaleNote(sale?.notes || '', prod, soldQty, true);
  }, [sale, prod, soldQty]);

  // Unit price and net amount paid per piece
  const unitPrice = saleInfo.unitPrice || Number(prod?.price) || 0;
  const itemDiscount = (saleInfo.discount || 0) / soldQty;
  const netPaidPerUnit = Math.max(0, unitPrice - itemDiscount);

  // Return value based on chosen returnQuantity
  const returnValue = Math.max(0, returnQuantity * netPaidPerUnit);

  // Initialize or reset when sale changes
  useEffect(() => {
    if (isOpen && sale) {
      setReturnQuantity(soldQty);
      setOperationType('refund');
      setSelectedReasonId('wrong_product');
      setCustomReasonText('');
      setRefundMethod(saleInfo.paymentMethod === 'Kart' || saleInfo.paymentMethod === 'Kartdan karta(Hesab)' ? 'card' : 'cash');
      setRestoreStock(true);
      setMarkAsDamaged(false);
      setStaffNote('');
      setSelectedNewProduct(null);
      setExchangeQuantity(1);
      setExchangeSearch('');

      // Fetch warehouse products if needed
      fetchWarehouseProducts();

      // Check customer info from note or DB
      if (saleInfo.customerName || saleInfo.customerPhone) {
        fetchCustomerDetails();
      }
    }
  }, [isOpen, sale]);

  const fetchWarehouseProducts = async () => {
    const targetWId = warehouseId || sale?.warehouse_id;
    if (!targetWId) return;
    try {
      setSearchingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, barcode, price, purchase_price, stock_quantity, unit, category_id, is_deleted')
        .eq('warehouse_id', targetWId)
        .eq('is_deleted', false)
        .order('name', { ascending: true })
        .limit(300);

      if (!error && data) {
        setWarehouseProducts(data);
      }
    } catch (err) {
      console.warn('Error fetching products for exchange:', err);
    } finally {
      setSearchingProducts(false);
    }
  };

  const fetchCustomerDetails = async () => {
    try {
      if (!saleInfo.customerPhone && !saleInfo.customerName) return;
      let query = supabase.from('customers').select('*');
      if (saleInfo.customerPhone) {
        query = query.eq('phone', saleInfo.customerPhone);
      } else {
        query = query.ilike('name', `%${saleInfo.customerName}%`);
      }
      const { data } = await query.maybeSingle();
      if (data) {
        setCustomerData(data);
      }
    } catch (err) {
      console.warn('Error fetching customer details:', err);
    }
  };

  // Filter products for exchange
  const filteredNewProducts = useMemo(() => {
    if (!exchangeSearch.trim()) return warehouseProducts.slice(0, 15);
    const q = exchangeSearch.toLowerCase().trim();
    return warehouseProducts.filter(p => 
      (p.name || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    ).slice(0, 25);
  }, [warehouseProducts, exchangeSearch]);

  // Financial calculations for exchange
  const newProductPrice = Number(selectedNewProduct?.price || 0);
  const newProductTotal = newProductPrice * exchangeQuantity;
  const priceDifference = newProductTotal - returnValue; // positive = customer pays extra, negative = refund to customer

  // Reason text
  const getReasonText = () => {
    if (selectedReasonId === 'other') {
      return customReasonText.trim() || (i18n.language === 'az' ? 'Digər səbəb' : 'Другая причина');
    }
    const found = RETURN_REASONS.find(r => r.id === selectedReasonId);
    return i18n.language === 'az' ? found?.labelAz : found?.labelRu || found?.labelAz || '';
  };

  if (!isOpen || !sale) return null;

  // Execute Return or Exchange
  const handleConfirmSubmit = async () => {
    if (operationType === 'exchange' && !selectedNewProduct) {
      toast.error(i18n.language === 'az' ? 'Zəhmət olmasa dəyişdiriləcək yeni məhsulu seçin' : 'Пожалуйста, выберите новый товар для обмена');
      return;
    }

    if (returnQuantity <= 0 || returnQuantity > soldQty) {
      toast.error(i18n.language === 'az' ? 'Qaytarılan miqdar düzgün deyil' : 'Некорректное количество возвращаемого товара');
      return;
    }

    if (operationType === 'exchange' && exchangeQuantity <= 0) {
      toast.error(i18n.language === 'az' ? 'Yeni məhsulun miqdarı düzgün deyil' : 'Некорректное количество нового товара');
      return;
    }

    setLoading(true);

    try {
      const reasonText = getReasonText();
      const nowIso = new Date().toISOString();
      const currentUserId = sale.user_id || (await supabase.auth.getUser()).data?.user?.id;
      const targetWarehouseId = warehouseId || sale.warehouse_id;
      const cashierIdentifier = currentStaff?.name || currentStaff?.username || 'Kassir';

      // ==========================================
      // FLOW 1: REFUND (Pulu Geri Qaytarmaq)
      // ==========================================
      if (operationType === 'refund') {
        // 1. Restore product stock in warehouse (if restoreStock is checked and not marked as damaged)
        if (restoreStock && !markAsDamaged && sale.product_id) {
          const { data: currentP } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', sale.product_id)
            .single();

          const currentStock = currentP ? Number(currentP.stock_quantity || 0) : Number(prod?.stock_quantity || 0);
          const updatedStock = currentStock + returnQuantity;

          await supabase
            .from('products')
            .update({ stock_quantity: updatedStock })
            .eq('id', sale.product_id);
        }

        // 2. Log Inbound Receipt (stock_receipts) for accounting audit
        const receiptNote = `[Müştəri Qaytarışı / Возврат от клиента] Səbəb: ${reasonText} | Qaytarılan məbləğ: ₼${returnValue.toFixed(2)} (${refundMethod === 'cash' ? 'Nağd' : refundMethod === 'card' ? 'Kart' : 'Nisyə/Borc'}) | Satıcı: ${cashierIdentifier} | Əlaqəli satış: #${sale.id.slice(0, 8).toUpperCase()}` + (staffNote ? ` | Qeyd: ${staffNote}` : '');

        await supabase
          .from('stock_receipts')
          .insert([{
            product_id: sale.product_id,
            quantity: returnQuantity,
            unit_price: netPaidPerUnit,
            received_at: nowIso,
            notes: receiptNote,
            user_id: currentUserId,
            warehouse_id: targetWarehouseId
          }]);

        // 3. If marked as damaged/defective, record damaged dispatch write-off
        if (markAsDamaged && sale.product_id) {
          await supabase
            .from('stock_dispatches')
            .insert([{
              product_id: sale.product_id,
              quantity: returnQuantity,
              issued_at: nowIso,
              reason: 'damaged',
              notes: `[Zədəli/Qüsurlu Qaytarış] Müştəridən qəbul edilib və zədələrə yazıldı. Səbəb: ${reasonText} | Satış: #${sale.id.slice(0, 8).toUpperCase()}`,
              user_id: currentUserId,
              warehouse_id: targetWarehouseId
            }]);
        }

        // 4. Update the original sale dispatch record in stock_dispatches
        let updatedNotes = sale.notes || '';
        const isFullReturn = returnQuantity === soldQty;

        const refundMethodLabel = refundMethod === 'cash' ? 'Nağd' : refundMethod === 'card' ? 'Kart' : 'Nisyə/Borc';
        const returnMeta = `[STATUS: REFUNDED] [Qaytarıldı: ${returnQuantity} əd, ₼${returnValue.toFixed(2)}] [Qaytarılan Məhsul: ${prod?.name || 'Məhsul'} (${prod?.barcode || 'Barkodsuz'})] [Qaytarılan Miqdar: ${returnQuantity}] [Qaytarılan Məbləğ: ₼${returnValue.toFixed(2)}] [Səbəb: ${reasonText}] [Üsul: ${refundMethodLabel}] [Qaytarılma Tarixi: ${nowIso}] [Kassir: ${cashierIdentifier}]`;

        if (isFullReturn) {
          updatedNotes = `${updatedNotes} ${returnMeta}`.trim();
          await supabase
            .from('stock_dispatches')
            .update({ notes: updatedNotes })
            .eq('id', sale.id);
        } else {
          // Partial return
          const newSaleQty = soldQty - returnQuantity;
          const newTotalAmount = Math.max(0, newSaleQty * netPaidPerUnit);
          const partialMeta = `[Qismən Qaytarıldı: ${returnQuantity} əd, ₼${returnValue.toFixed(2)}] [Qaytarılan Məhsul: ${prod?.name || 'Məhsul'}] [Səbəb: ${reasonText}] [Üsul: ${refundMethodLabel}] [Tarix: ${nowIso}] [Kassir: ${cashierIdentifier}]`;
          if (/\[Məbləğ:\s*₼?[0-9.,]+\]/i.test(updatedNotes)) {
            updatedNotes = updatedNotes.replace(/\[Məbləğ:\s*₼?[0-9.,]+\]/i, `[Məbləğ: ₼${newTotalAmount.toFixed(2)}]`);
          }
          updatedNotes = `${updatedNotes} ${partialMeta}`.trim();

          await supabase
            .from('stock_dispatches')
            .update({ 
              quantity: newSaleQty,
              notes: updatedNotes 
            })
            .eq('id', sale.id);
        }

        // 5. If linked retail_sales exists, update status
        try {
          const saleIdMatch = (sale.notes || '').match(/\[SaleID:\s*([a-zA-Z0-9_-]+)\]/i);
          if (saleIdMatch && saleIdMatch[1]) {
            await supabase
              .from('retail_sales')
              .update({ status: isFullReturn ? 'refunded' : 'partially_refunded' })
              .eq('id', saleIdMatch[1]);
          }
        } catch (rErr) {
          console.warn('Could not update retail_sales status:', rErr);
        }

        // 6. If refundMethod is customer debt deduction, reduce debt
        if (refundMethod === 'debt' && customerData?.id) {
          const currentDebt = Number(customerData.debt_balance || 0);
          const newDebt = Math.max(0, currentDebt - returnValue);

          await supabase
            .from('customers')
            .update({ debt_balance: newDebt })
            .eq('id', customerData.id);

          await supabase
            .from('customer_debts')
            .insert([{
              user_id: currentUserId,
              customer_id: customerData.id,
              type: 'payment',
              amount: returnValue,
              description: `Məhsul qaytarışı (${prod?.name || 'Məhsul'} - ${returnQuantity} əd): Borcdan silindi. Səbəb: ${reasonText}`
            }]);
        }

        toast.success(
          i18n.language === 'az' 
            ? `Məhsul uğurla qaytarıldı (₼${returnValue.toFixed(2)} qaytarıldı)` 
            : `Товар успешно возвращен (возвращено ₼${returnValue.toFixed(2)})`
        );

        // Print thermal receipt for refund
        printThermalReturnReceipt57mm({
          receiptNumber: Date.now().toString().slice(-6),
          originalReceiptNumber: sale.id,
          date: new Date(),
          storeName: 'Rast musiqi alətləri mağazası',
          customerName: saleInfo.customerName || customerData?.name || '',
          customerPhone: saleInfo.customerPhone || customerData?.phone || '',
          cashierName: cashierIdentifier,
          operationType: 'refund',
          reason: reasonText,
          returnedItem: {
            name: prod?.name || 'Məhsul',
            barcode: prod?.barcode || '',
            quantity: returnQuantity,
            unit: formatUnitName(prod?.unit, i18n.language),
            price: netPaidPerUnit,
            total: returnValue
          },
          refundAmount: returnValue,
          refundMethod: refundMethod === 'cash' ? 'Nağd' : refundMethod === 'card' ? 'Kart' : 'Borcdan silinmə',
          notes: staffNote,
          transactionId: sale.id
        });
      }

      // ==========================================
      // FLOW 2: EXCHANGE (Məhsulu Dəyişdirmək)
      // ==========================================
      if (operationType === 'exchange') {
        // 1. Return old product stock to warehouse
        if (sale.product_id) {
          const { data: currentOldP } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', sale.product_id)
            .single();

          const curOldStock = currentOldP ? Number(currentOldP.stock_quantity || 0) : Number(prod?.stock_quantity || 0);
          await supabase
            .from('products')
            .update({ stock_quantity: curOldStock + returnQuantity })
            .eq('id', sale.product_id);
        }

        // 2. Decrement replacement product stock in warehouse
        const { data: currentNewP } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', selectedNewProduct.id)
          .single();

        const curNewStock = currentNewP ? Number(currentNewP.stock_quantity || 0) : Number(selectedNewProduct.stock_quantity || 0);
        await supabase
          .from('products')
          .update({ stock_quantity: curNewStock - exchangeQuantity })
          .eq('id', selectedNewProduct.id);

        // 3. Log Inbound Receipt (stock_receipts) for the returned item
        const exchangeReceiptNote = `[Dəyişdirmə - Geri qəbul] Səbəb: ${reasonText} | Əvəzinə verilən məhsul: ${selectedNewProduct.name} (${exchangeQuantity} əd) | Fərq: ₼${priceDifference.toFixed(2)} | Əlaqəli satış: #${sale.id.slice(0, 8).toUpperCase()}`;

        await supabase
          .from('stock_receipts')
          .insert([{
            product_id: sale.product_id,
            quantity: returnQuantity,
            unit_price: netPaidPerUnit,
            received_at: nowIso,
            notes: exchangeReceiptNote,
            user_id: currentUserId,
            warehouse_id: targetWarehouseId
          }]);

        // 4. Update the SAME original ticket (sale.id) in stock_dispatches
        // NO NEW DISPATCH INSERT! Everything stays inside this ONE main ticket!
        const payLabel = priceDifference > 0 
          ? (diffPaymentMethod === 'cash' ? 'Nağd' : diffPaymentMethod === 'card' ? 'Kart' : 'Nisyə')
          : (diffRefundMethod === 'cash' ? 'Nağd' : diffRefundMethod === 'card' ? 'Kart' : 'Borc');

        const diffText = priceDifference > 0
          ? `+₼${priceDifference.toFixed(2)} (Müştəri əlavə ödədi - ${payLabel})`
          : priceDifference < 0
          ? `-₼${Math.abs(priceDifference).toFixed(2)} (Müştəriyə qaytarıldı - ${payLabel})`
          : `₼0.00 (Fərqsiz)`;

        const singleTicketExchangeNote = `[Kanal: ${saleInfo.channel || 'Mağaza'}] Məhsul Satışı (Ödəniş: ${payLabel}) [Qiymət: ₼${newProductPrice.toFixed(2)}] [Məbləğ: ₼${newProductTotal.toFixed(2)}] [STATUS: EXCHANGED] [Dəyişdirilib: ${prod?.name || 'Məhsul'} ➔ ${selectedNewProduct.name}] [Köhnə Məhsul: ${prod?.name || 'Məhsul'} (${prod?.barcode || 'Barkodsuz'})] [Köhnə Qiymət: ₼${unitPrice.toFixed(2)}] [Köhnə Miqdar: ${returnQuantity}] [Köhnə Məbləğ: ₼${returnValue.toFixed(2)}] [Yeni Məhsul: ${selectedNewProduct.name} (${selectedNewProduct.barcode || 'Barkodsuz'})] [Yeni Qiymət: ₼${newProductPrice.toFixed(2)}] [Yeni Miqdar: ${exchangeQuantity}] [Yeni Məbləğ: ₼${newProductTotal.toFixed(2)}] [Fərq: ₼${priceDifference.toFixed(2)}] [Fərq İzahı: ${diffText}] [Səbəb: ${reasonText}] [Dəyişdirilmə Tarixi: ${nowIso}] [Kassir: ${cashierIdentifier}]` + (saleInfo.customerName ? ` [Müştəri: ${saleInfo.customerName}${saleInfo.customerPhone ? ` (${saleInfo.customerPhone})` : ''}]` : '') + (staffNote ? ` | Qeyd: ${staffNote}` : '');

        await supabase
          .from('stock_dispatches')
          .update({
            product_id: selectedNewProduct.id,
            quantity: exchangeQuantity,
            notes: singleTicketExchangeNote
          })
          .eq('id', sale.id);

        // 5. If linked retail_sales exists, update it to the new product total and notes
        try {
          const saleIdMatch = (sale.notes || '').match(/\[SaleID:\s*([a-zA-Z0-9_-]+)\]/i);
          if (saleIdMatch && saleIdMatch[1]) {
            await supabase
              .from('retail_sales')
              .update({
                total_amount: newProductTotal,
                notes: `[STATUS: EXCHANGED] Dəyişdirildi: ${prod?.name || 'Məhsul'} ➔ ${selectedNewProduct.name} (Fərq: ₼${priceDifference.toFixed(2)})`
              })
              .eq('id', saleIdMatch[1]);
          }
        } catch (rErr) {
          console.warn('Could not update retail_sales exchange status:', rErr);
        }

        // 6. Handle Debt if priceDifference !== 0 and customer is involved
        if (customerData?.id) {
          if (priceDifference > 0 && diffPaymentMethod === 'debt') {
            const currentDebt = Number(customerData.debt_balance || 0);
            await supabase
              .from('customers')
              .update({ debt_balance: currentDebt + priceDifference })
              .eq('id', customerData.id);

            await supabase
              .from('customer_debts')
              .insert([{
                user_id: currentUserId,
                customer_id: customerData.id,
                type: 'debt',
                amount: priceDifference,
                description: `Məhsul dəyişdirmə fərqi (${prod?.name} -> ${selectedNewProduct.name}): Borca əlavə edildi`
              }]);
          } else if (priceDifference < 0 && diffRefundMethod === 'debt') {
            const currentDebt = Number(customerData.debt_balance || 0);
            const deductAmt = Math.abs(priceDifference);
            await supabase
              .from('customers')
              .update({ debt_balance: Math.max(0, currentDebt - deductAmt) })
              .eq('id', customerData.id);

            await supabase
              .from('customer_debts')
              .insert([{
                user_id: currentUserId,
                customer_id: customerData.id,
                type: 'payment',
                amount: deductAmt,
                description: `Məhsul dəyişdirmə qalığı: Borcdan silindi`
              }]);
          }
        }

        toast.success(
          i18n.language === 'az' 
            ? `Məhsul uğurla dəyişdirildi! (Yeni: ${selectedNewProduct.name})` 
            : `Товар успешно обменен! (Новый: ${selectedNewProduct.name})`
        );

        // Print thermal receipt for exchange
        printThermalReturnReceipt57mm({
          receiptNumber: Date.now().toString().slice(-6),
          originalReceiptNumber: sale.id,
          date: new Date(),
          storeName: 'Rast musiqi alətləri mağazası',
          customerName: saleInfo.customerName || customerData?.name || '',
          customerPhone: saleInfo.customerPhone || customerData?.phone || '',
          cashierName: cashierIdentifier,
          operationType: 'exchange',
          reason: reasonText,
          returnedItem: {
            name: prod?.name || 'Məhsul',
            barcode: prod?.barcode || '',
            quantity: returnQuantity,
            unit: formatUnitName(prod?.unit, i18n.language),
            price: netPaidPerUnit,
            total: returnValue
          },
          exchangeItem: {
            name: selectedNewProduct.name,
            barcode: selectedNewProduct.barcode || '',
            quantity: exchangeQuantity,
            unit: formatUnitName(selectedNewProduct.unit, i18n.language),
            price: newProductPrice,
            total: newProductTotal
          },
          priceDifference: priceDifference,
          diffPaymentMethod: priceDifference > 0 
            ? (diffPaymentMethod === 'cash' ? 'Nağd' : diffPaymentMethod === 'card' ? 'Kart' : 'Borc')
            : (diffRefundMethod === 'cash' ? 'Nağd' : diffRefundMethod === 'card' ? 'Kart' : 'Borcdan silinmə'),
          notes: staffNote,
          transactionId: sale.id
        });
      }

      onReturnComplete?.();
      onClose();
    } catch (err) {
      console.error('Error during product return / exchange:', err);
      toast.error(err.message || (i18n.language === 'az' ? 'Əməliyyat zamanı xəta baş verdi' : 'Произошла ошибка при выполнении операции'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget && !loading) onClose();
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200 max-h-[94vh]">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0d1326] via-[#161f3d] to-[#1e2a52] text-white p-5 sm:p-6 relative shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                      {i18n.language === 'az' ? 'Məhsulun Qaytarılması və Dəyişdirilməsi' : 
                       i18n.language === 'ru' ? 'Возврат и обмен товара' : 
                       'Product Return & Exchange'}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      #{sale.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-300 font-medium flex-wrap">
                    <span>
                      {i18n.language === 'az' ? 'İlkin Satış Tarixi' : 'Дата продажи'}: {new Date(sale.issued_at || sale.created_at || Date.now()).toLocaleDateString()}
                    </span>
                    {saleInfo.customerName && (
                      <>
                        <span>•</span>
                        <span className="text-amber-200 font-bold">{saleInfo.customerName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            
            {/* 1. Operation Mode Selection Cards */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-2 block">
                {i18n.language === 'az' ? '1. Əməliyyat Növünü Seçin' : '1. Выберите тип операции'}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode A: Refund */}
                <button
                  type="button"
                  onClick={() => setOperationType('refund')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 relative ${
                    operationType === 'refund'
                      ? 'border-amber-500 bg-amber-50/60 shadow-md shadow-amber-500/10'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    operationType === 'refund' ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-gray-900">
                        {i18n.language === 'az' ? 'Pulu Geri Qaytarmaq' : 'Возврат денег (Refund)'}
                      </span>
                      {operationType === 'refund' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">
                      {i18n.language === 'az' 
                        ? 'Müştəri məhsulu qaytarır və pulunu nağd/kart/borcdan geri alır' 
                        : 'Клиент возвращает товар и забирает деньги'}
                    </p>
                  </div>
                </button>

                {/* Mode B: Exchange */}
                <button
                  type="button"
                  onClick={() => setOperationType('exchange')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 relative ${
                    operationType === 'exchange'
                      ? 'border-blue-600 bg-blue-50/60 shadow-md shadow-blue-500/10'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    operationType === 'exchange' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-gray-900">
                        {i18n.language === 'az' ? 'Məhsulu Dəyişdirmək' : 'Обмен на другой товар'}
                      </span>
                      {operationType === 'exchange' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">
                      {i18n.language === 'az' 
                        ? 'Müştəri səhv mal götürüb və yerinə anbardakı başqa məhsulu götürür' 
                        : 'Клиент ошибся и меняет товар на нужный со склада'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Original Sold Product Card & Return Quantity */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-gray-400" />
                  {i18n.language === 'az' ? 'Qaytarılan Məhsul Məlumatı' : 'Возвращаемый товар'}
                </span>
                <span className="text-xs font-bold text-gray-600">
                  {i18n.language === 'az' ? 'Satış qiyməti' : 'Цена продажи'}: <strong>₼{netPaidPerUnit.toFixed(2)}</strong> / {formatUnitName(prod?.unit, i18n.language)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-gray-200/80">
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{prod?.name || 'Məhsul'}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-mono">
                    <span>Barkod: {prod?.barcode || '—'}</span>
                    <span>•</span>
                    <span>Satılıb: {soldQty} {formatUnitName(prod?.unit, i18n.language)}</span>
                    {saleInfo.discount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-rose-600 font-sans font-bold">Endirim: -₼{saleInfo.discount.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {i18n.language === 'az' ? 'Qaytarılan say' : 'Кол-во возврата'}
                    </span>
                    {soldQty > 1 ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <button
                          type="button"
                          onClick={() => setReturnQuantity(Math.max(1, returnQuantity - 1))}
                          className="w-7 h-7 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 font-bold text-sm flex items-center justify-center"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={soldQty}
                          value={returnQuantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              setReturnQuantity(Math.max(1, Math.min(soldQty, val)));
                            }
                          }}
                          className="w-12 h-7 text-center font-black text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setReturnQuantity(Math.min(soldQty, returnQuantity + 1))}
                          className="w-7 h-7 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 font-bold text-sm flex items-center justify-center"
                        >
                          +
                        </button>
                        <span className="text-xs text-gray-500 ml-1">{formatUnitName(prod?.unit, i18n.language)}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-black text-gray-800">
                        1 {formatUnitName(prod?.unit, i18n.language)}
                      </span>
                    )}
                  </div>

                  <div className="pl-3 border-l border-gray-200 text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {i18n.language === 'az' ? 'Qaytarılan Dəyər' : 'Сумма к возврату'}
                    </span>
                    <div className="text-base font-black text-amber-700">
                      ₼{returnValue.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Reason Selection */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-2 block">
                {i18n.language === 'az' ? '2. Qaytarılma Səbəbini Seçin' : '2. Причина возврата / обмена'}
              </label>

              <div className="space-y-1.5">
                {RETURN_REASONS.map((r) => (
                  <label 
                    key={r.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-xs font-bold ${
                      selectedReasonId === r.id 
                        ? 'bg-amber-50/70 border-amber-400 text-amber-950 shadow-sm' 
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="returnReason"
                      value={r.id}
                      checked={selectedReasonId === r.id}
                      onChange={() => setSelectedReasonId(r.id)}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>{i18n.language === 'az' ? r.labelAz : r.labelRu}</span>
                  </label>
                ))}
              </div>

              {selectedReasonId === 'other' && (
                <div className="mt-2.5 animate-in fade-in duration-200">
                  <input
                    type="text"
                    placeholder={i18n.language === 'az' ? 'Səbəbi dəqiq qeyd edin...' : 'Укажите точную причину...'}
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-amber-300 rounded-xl text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-medium"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* 4. DYNAMIC SECTION: Refund Options vs Exchange Options */}
            {operationType === 'refund' ? (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">
                  {i18n.language === 'az' ? '3. Pulun Qaytarılma Üsulu və Anbar Hərəkəti' : '3. Способ возврата денег и склад'}
                </label>

                {/* Refund Method Radio Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                    refundMethod === 'cash' ? 'border-amber-500 bg-amber-50 font-bold text-amber-900 shadow-sm' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="refundMethod"
                      value="cash"
                      checked={refundMethod === 'cash'}
                      onChange={() => setRefundMethod('cash')}
                      className="sr-only"
                    />
                    <Coins className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                    <span className="text-xs">{i18n.language === 'az' ? 'Nağd Kassa' : 'Наличные из кассы'}</span>
                  </label>

                  <label className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                    refundMethod === 'card' ? 'border-amber-500 bg-amber-50 font-bold text-amber-900 shadow-sm' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="refundMethod"
                      value="card"
                      checked={refundMethod === 'card'}
                      onChange={() => setRefundMethod('card')}
                      className="sr-only"
                    />
                    <CreditCard className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                    <span className="text-xs">{i18n.language === 'az' ? 'Kart / Hesab' : 'Карта / Счет'}</span>
                  </label>

                  <label className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                    refundMethod === 'debt' ? 'border-amber-500 bg-amber-50 font-bold text-amber-900 shadow-sm' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="refundMethod"
                      value="debt"
                      checked={refundMethod === 'debt'}
                      onChange={() => setRefundMethod('debt')}
                      className="sr-only"
                    />
                    <User className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                    <span className="text-xs">{i18n.language === 'az' ? 'Müştəri Borcundan' : 'Списать с долга'}</span>
                  </label>
                </div>

                {/* Warehouse Stock Checkboxes */}
                <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-200/60 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={restoreStock}
                      onChange={(e) => setRestoreStock(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span>
                      {i18n.language === 'az' 
                        ? `Məhsulu yenidən anbar qalığına qaytar (+${returnQuantity} ${formatUnitName(prod?.unit, i18n.language)})` 
                        : `Вернуть товар на склад (+${returnQuantity} ${formatUnitName(prod?.unit, i18n.language)})`}
                    </span>
                  </label>

                  {selectedReasonId === 'defective' && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-red-700 pt-1 border-t border-amber-200/50">
                      <input
                        type="checkbox"
                        checked={markAsDamaged}
                        onChange={(e) => setMarkAsDamaged(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                      />
                      <span>
                        {i18n.language === 'az' 
                          ? 'Məhsulu zədəli/yararsız kimi qeyd et və silinmələrə yaz (Damaged write-off)' 
                          : 'Списать как дефектный/бракованный товар (Damaged)'}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            ) : (
              /* EXCHANGE INTERFACE */
              <div className="space-y-4 pt-2 border-t border-gray-100">
                {/* Section Header with Scanner Mode Toggle & Mobile Camera */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-blue-100/60">
                  <label className="text-[11px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-blue-600" />
                    <span>{i18n.language === 'az' ? '3. Əvəzinə Götürüləcək Yeni Məhsulu Seçin' : '3. Выберите новый товар взамен'}</span>
                  </label>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    {/* Mobile Camera Scan Button */}
                    <button
                      type="button"
                      onClick={() => setShowCameraScanner(true)}
                      className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs"
                      title={i18n.language === 'az' ? 'Kamera ilə skan et' : 'Сканировать камерой'}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{i18n.language === 'az' ? 'Kamera' : 'Камера'}</span>
                    </button>

                    {/* Skaner rejimi toggle switch */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-xs font-bold text-gray-600">
                        {i18n.language === 'az' ? 'Skaner rejimi' : 'Режим сканера'}
                      </span>
                      <div className="relative">
                        <input 
                          type="checkbox"
                          checked={barcodeMode}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setBarcodeMode(isChecked);
                            try {
                              localStorage.setItem('crm_exchange_scanner_mode', String(isChecked));
                            } catch (err) {}
                            if (isChecked) {
                              const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
                              if (isMobile) {
                                setShowCameraScanner(true);
                              }
                              setTimeout(() => barcodeInputRef.current?.focus(), 100);
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Search / Scan Bar for Exchange */}
                {barcodeMode ? (
                  <form onSubmit={handleBarcodeSubmit} className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-blue-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={exchangeSearch}
                        onChange={(e) => setExchangeSearch(e.target.value)}
                        placeholder={i18n.language === 'az' ? 'Skan edin və ya barkodu yazın (Enter)...' : 'Отсканируйте штрихкод (Enter)...'}
                        className="w-full pl-10 pr-10 py-3 bg-blue-50/50 border-2 border-blue-400 focus:border-blue-600 rounded-xl text-xs font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white shadow-2xs transition-all"
                        autoFocus
                      />
                      {searchingProducts && (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <p className="text-[11px] text-blue-700 font-medium text-center flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <span>{i18n.language === 'az' ? 'Skaneri məhsula yönəldin və oxudun. O, avtomatik seçiləcək.' : 'Направьте сканер на штрихкод. Товар автоматически выберется на обмен.'}</span>
                    </p>
                  </form>
                ) : (
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={i18n.language === 'az' ? 'Yeni məhsulun adı və ya barkodu ilə axtarın...' : 'Поиск нового товара по названию или штрихкоду...'}
                      value={exchangeSearch}
                      onChange={(e) => setExchangeSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                    />
                    {searchingProducts && (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                )}

                {/* Product Search Results Dropdown List */}
                {!selectedNewProduct && (
                  <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100 bg-white shadow-inner">
                    {filteredNewProducts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400 font-medium">
                        {i18n.language === 'az' ? 'Məhsul tapılmadı' : 'Товары не найдены'}
                      </div>
                    ) : (
                      filteredNewProducts.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedNewProduct(p);
                            setExchangeQuantity(1);
                            setExchangeSearch('');
                          }}
                          className="p-2.5 px-3.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors group"
                        >
                          <div>
                            <div className="font-bold text-xs text-gray-900 group-hover:text-blue-700">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                              <span>Barkod: {p.barcode || '—'}</span>
                              <span>•</span>
                              <span>Qalıq: {Number(p.stock_quantity || 0).toFixed(0)} {formatUnitName(p.unit, i18n.language)}</span>
                            </div>
                          </div>
                          <div className="text-right font-black text-xs text-gray-900 group-hover:text-blue-700">
                            ₼{Number(p.price || 0).toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Selected Replacement Product Card */}
                {selectedNewProduct && (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 relative animate-in fade-in duration-200">
                    <div className="absolute right-3 top-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNewProduct(null);
                          if (barcodeMode) {
                            setTimeout(() => barcodeInputRef.current?.focus(), 100);
                          }
                        }}
                        className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 hover:bg-blue-100/50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <Repeat className="w-3 h-3" />
                        <span>{i18n.language === 'az' ? 'Yenidən skan et' : 'Пересканировать'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedNewProduct(null)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-md"
                        title={i18n.language === 'az' ? 'Ləğv et' : 'Отменить выбор'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-[10px] font-black text-blue-700 uppercase tracking-wider mb-1">
                      {i18n.language === 'az' ? 'Seçilmiş Yeni Məhsul' : 'Выбранный товар для обмена'}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-black text-sm text-gray-900">{selectedNewProduct.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          Barkod: {selectedNewProduct.barcode || '—'} • Qalıq: {Number(selectedNewProduct.stock_quantity || 0).toFixed(0)} {formatUnitName(selectedNewProduct.unit, i18n.language)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-bold text-gray-500 uppercase">
                            {i18n.language === 'az' ? 'Miqdar' : 'Кол-во'}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <button
                              type="button"
                              onClick={() => setExchangeQuantity(Math.max(1, exchangeQuantity - 1))}
                              className="w-6 h-6 rounded border border-blue-300 bg-white hover:bg-blue-100 font-bold text-xs flex items-center justify-center"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={exchangeQuantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 1) setExchangeQuantity(val);
                              }}
                              className="w-10 h-6 text-center font-black text-xs border border-blue-300 rounded bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setExchangeQuantity(exchangeQuantity + 1)}
                              className="w-6 h-6 rounded border border-blue-300 bg-white hover:bg-blue-100 font-bold text-xs flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="pl-3 border-l border-blue-200 text-right">
                          <span className="text-[9px] font-bold text-gray-500 uppercase">
                            {i18n.language === 'az' ? 'Yeni Cəmi' : 'Новая сумма'}
                          </span>
                          <div className="text-sm font-black text-blue-900">
                            ₼{newProductTotal.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real-Time Price Difference & Settlement Card */}
                {selectedNewProduct && (
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-600 pb-2 border-b border-gray-200">
                      <span>{i18n.language === 'az' ? 'Qaytarılan məhsulun dəyəri:' : 'Сумма возвращаемого товара:'}</span>
                      <span className="text-gray-900 font-black">₼{returnValue.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-gray-600 pb-2 border-b border-gray-200">
                      <span>{i18n.language === 'az' ? 'Yeni məhsulun dəyəri:' : 'Сумма нового товара:'}</span>
                      <span className="text-gray-900 font-black">₼{newProductTotal.toFixed(2)}</span>
                    </div>

                    {/* DIFFERENCE DISPLAY */}
                    {priceDifference > 0 ? (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-amber-600" />
                            {i18n.language === 'az' ? 'Müştəri Əlavə Ödəməlidir (Fərq):' : 'Клиент должен доплатить:'}
                          </div>
                          <span className="text-[11px] text-amber-700 font-medium">Yeni məhsul daha bahadır</span>
                        </div>
                        <div className="text-lg font-black text-amber-800">
                          +₼{priceDifference.toFixed(2)}
                        </div>
                      </div>
                    ) : priceDifference < 0 ? (
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                            <Banknote className="w-4 h-4 text-emerald-600" />
                            {i18n.language === 'az' ? 'Müştəriyə Qaytarılacaq Qalıq (Fərq):' : 'Магазин возвращает сдачу:'}
                          </div>
                          <span className="text-[11px] text-emerald-700 font-medium">Yeni məhsul daha ucuzdur</span>
                        </div>
                        <div className="text-lg font-black text-emerald-800">
                          -₼{Math.abs(priceDifference).toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center justify-between">
                        <span className="text-xs font-black text-blue-900">
                          {i18n.language === 'az' ? 'Qiymətlər bərabərdir (Əlavə ödəniş yoxdur)' : 'Цены равны (Доплата 0)'}
                        </span>
                        <span className="text-base font-black text-blue-800">₼0.00</span>
                      </div>
                    )}

                    {/* Payment / Refund Method for Price Difference */}
                    {priceDifference !== 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">
                          {priceDifference > 0 
                            ? (i18n.language === 'az' ? 'Fərqin ödənilmə üsulu:' : 'Способ доплаты разницы:')
                            : (i18n.language === 'az' ? 'Qalığın qaytarılma üsulu:' : 'Способ возврата сдачи:')}
                        </span>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {['cash', 'card', 'debt'].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                if (priceDifference > 0) setDiffPaymentMethod(m);
                                else setDiffRefundMethod(m);
                              }}
                              className={`py-2 px-2.5 rounded-lg border font-bold text-center transition-all ${
                                (priceDifference > 0 ? diffPaymentMethod === m : diffRefundMethod === m)
                                  ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm'
                                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                              }`}
                            >
                              {m === 'cash' ? (i18n.language === 'az' ? 'Nağd' : 'Наличные') :
                               m === 'card' ? (i18n.language === 'az' ? 'Kart' : 'Карта') :
                               (i18n.language === 'az' ? 'Nisyə/Borc' : 'Долг')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. Additional Staff Notes */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {i18n.language === 'az' ? 'Əlavə qeyd və ya şərh (isteğe bağlı)' : 'Примечание (необязательно)'}
              </label>
              <textarea
                rows={2}
                value={staffNote}
                onChange={(e) => setStaffNote(e.target.value)}
                placeholder={i18n.language === 'az' ? 'Qaytarılma ilə bağlı daxili qeydlər...' : 'Внутренние заметки к возврату...'}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
              />
            </div>

          </div>

          {/* Modal Footer */}
          <div className="bg-gray-50 border-t border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
            >
              {i18n.language === 'az' ? 'Ləğv et' : 'Отмена'}
            </button>

            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={loading || (operationType === 'exchange' && !selectedNewProduct)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                operationType === 'exchange'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{i18n.language === 'az' ? 'İcra olunur...' : 'Выполняется...'}</span>
                </>
              ) : (
                <>
                  {operationType === 'exchange' ? (
                    <ArrowLeftRight className="w-4 h-4" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  <span>
                    {operationType === 'exchange' 
                      ? (i18n.language === 'az' ? 'Dəyişdirməni Təsdiqlə və Çap Et' : 'Подтвердить обмен и распечатать чек')
                      : (i18n.language === 'az' ? 'Qaytarışı Təsdiqlə və Çap Et' : 'Подтвердить возврат и распечатать чек')}
                  </span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      <CameraScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={(barcode) => {
          handleBarcodeScan(barcode);
          setShowCameraScanner(false);
        }}
      />
    </ModalPortal>
  );
};

export default ProductReturnModal;
