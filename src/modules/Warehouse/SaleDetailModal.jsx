import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Calendar, 
  Clock, 
  CreditCard, 
  User, 
  Phone, 
  Warehouse as WarehouseIcon, 
  Tag, 
  Barcode as BarcodeIcon, 
  DollarSign, 
  Package, 
  CheckCircle2, 
  Printer, 
  Trash2, 
  Copy, 
  Check, 
  TrendingUp, 
  Layers, 
  FileText,
  Building,
  Coins,
  ArrowUpRight,
  ShieldCheck,
  Receipt,
  RotateCcw,
  ArrowLeftRight
} from 'lucide-react';
import ModalPortal from '../../components/Common/ModalPortal';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { printThermalReceipt57mm } from './thermalReceiptService';

export const formatUnitName = (rawUnit, lang = 'az') => {
  if (!rawUnit) return lang === 'az' ? 'əd' : lang === 'ru' ? 'шт.' : 'pcs';

  const u = String(rawUnit).trim().toLowerCase();

  if (['pcs', 'piece', 'pieces', 'ədəd', 'əd', 'əd.', 'ед', 'ед.', 'шт', 'шт.', 'штука'].includes(u)) {
    return lang === 'az' ? 'əd' : lang === 'ru' ? 'шт.' : 'pcs';
  }
  if (['pack', 'paket', 'пакет', 'пачка', 'упаковка', 'упак', 'уп', 'bağlama', 'baglama'].includes(u)) {
    return lang === 'az' ? 'Paket' : lang === 'ru' ? 'Пачка' : 'pack';
  }
  if (['kg', 'kiloqram', 'килограмм', 'кг', 'kq'].includes(u)) {
    return lang === 'az' ? 'Kq' : lang === 'ru' ? 'Кг' : 'kg';
  }
  if (['g', 'q', 'gram', 'qram', 'грамм', 'гр', 'г'].includes(u)) {
    return lang === 'az' ? 'Qram' : lang === 'ru' ? 'Грамм' : 'g';
  }
  if (['liter', 'litr', 'литр', 'л', 'l'].includes(u)) {
    return lang === 'az' ? 'Litr' : lang === 'ru' ? 'Литр' : 'liter';
  }
  if (['ml', 'millilitr', 'миллилитр', 'мл'].includes(u)) {
    return lang === 'az' ? 'Ml' : lang === 'ru' ? 'Мл' : 'ml';
  }
  if (['bottle', 'şüşə', 'suse', 'бутылка', 'бут'].includes(u)) {
    return lang === 'az' ? 'Şüşə' : lang === 'ru' ? 'Бутылка' : 'bottle';
  }
  if (['m', 'metr', 'метр', 'м'].includes(u)) {
    return lang === 'az' ? 'Metr' : lang === 'ru' ? 'Метр' : 'm';
  }
  if (['m2', 'm²', 'kv.m', 'кв.м'].includes(u)) {
    return 'm²';
  }

  return rawUnit.charAt(0).toUpperCase() + rawUnit.slice(1);
};

// Channel badge colors & styles
export const getChannelBadge = (channel) => {
  const ch = (channel || '').toLowerCase();
  if (ch.includes('birmarket')) {
    return { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Birmarket' };
  }
  if (ch.includes('kredit')) {
    return { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: channel };
  }
  if (ch.includes('instagram')) {
    return { bg: 'bg-pink-50 text-pink-700 border-pink-200', label: 'Instagram' };
  }
  if (ch.includes('web site') || ch.includes('website') || ch.includes('sayt')) {
    return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Web site' };
  }
  if (ch.includes('sosial')) {
    return { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Instagram' };
  }
  if (ch.includes('tap.az') || ch.includes('tap')) {
    return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Tap.az' };
  }
  if (ch.includes('lalafo')) {
    return { bg: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Lalafo' };
  }
  if (ch.includes('tiktok')) {
    return { bg: 'bg-slate-900 text-white border-slate-700', label: 'TikTok' };
  }
  return { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: channel || 'Mağaza' };
};

export const parseSaleNote = (note = '', product = null, quantity = 1, isAdmin = true) => {
  const qty = Math.abs(parseFloat(quantity) || 1);
  const prodPrice = product?.price ? Number(product.price) : 0;
  const prodCost = isAdmin && product?.purchase_price ? Number(product.purchase_price) : null;

  const info = {
    channel: 'Mağaza',
    paymentMethod: 'Nağd',
    sellerName: null,
    customerName: null,
    customerPhone: null,
    unitPrice: prodPrice,
    totalAmount: prodPrice * qty,
    costPrice: prodCost,
    totalCost: prodCost !== null ? prodCost * qty : null,
    profit: null,
    kassaAmount: null,
    months: null,
    bank: null,
    birmarketCategory: null,
    advanceAmount: null,
    advanceRecipient: null,
    expenseCategory: null,
    expenseDescription: null,
    expenseRecipient: null,
    rawNotes: note || '',
    cleanNote: ''
  };

  if (!note) {
    if (isAdmin && info.totalCost !== null) {
      info.profit = (info.totalAmount - info.totalCost);
    }
    return info;
  }

  // 1. Channel
  const channelMatch = note.match(/\[Kanal:\s*([^\]]+)\]/i);
  if (channelMatch) {
    info.channel = channelMatch[1].trim();
    if (info.channel.toLowerCase().startsWith('kredit - ')) {
      info.bank = info.channel.replace(/kredit - /i, '').trim();
    }
  }

  // 1.5. Seller / Cashier
  const sellerMatch = note.match(/\[(?:Satıcı|Kassir|Seller):\s*([^\]]+)\]/i);
  if (sellerMatch) {
    info.sellerName = sellerMatch[1].trim();
  }

  // 2. Customer
  const customerMatch = note.match(/\[Müştəri:\s*([^\]]+)\]/i);
  if (customerMatch) {
    const custRaw = customerMatch[1].trim();
    const phoneMatch = custRaw.match(/\(([^)]+)\)/);
    if (phoneMatch) {
      info.customerPhone = phoneMatch[1].trim();
      info.customerName = custRaw.replace(/\([^)]+\)/, '').trim();
    } else {
      info.customerName = custRaw;
    }
  }

  // 3. Payment Method
  const payMatch = note.match(/\(Ödəniş:\s*([^)]+)\)/i);
  if (payMatch) {
    info.paymentMethod = payMatch[1].trim();
  } else if (/xərc|расход|expense/i.test(note)) {
    info.paymentMethod = 'Digər xərclər';
  } else if (/beh|avans|deposit/i.test(note)) {
    info.paymentMethod = 'Beh';
  } else if (/birmarket/i.test(note) || /birmarket/i.test(info.channel)) {
    info.paymentMethod = 'Birmarket';
  } else if (/kredit/i.test(note) || /kredit/i.test(info.channel)) {
    info.paymentMethod = 'Kredit';
  } else if (/nisyə|borc/i.test(note)) {
    info.paymentMethod = 'Nisyə';
  } else if (/kart/i.test(note)) {
    info.paymentMethod = 'Kartdan karta(Hesab)';
  } else if (/nəqd|nağd/i.test(note)) {
    info.paymentMethod = 'Nağd';
  }

  // 4. Stored price / total if saved in note
  const priceMatch = note.match(/\[Qiymət:\s*₼?([0-9.,]+)\]/i);
  if (priceMatch) {
    info.unitPrice = parseFloat(priceMatch[1].replace(',', '.'));
  }
  const originalGross = info.unitPrice * qty;
  info.originalGross = originalGross;

  // 5. Discount detection (supports [Endirim: ₼5.00], [Скидка: 5], [Endirim: 10%], etc.)
  let discountAmount = 0;
  let discountPercent = null;
  const discBracketMatch = note.match(/\[(?:Endirim|Скидка|Discount):\s*₼?([0-9.,]+)%?\]/i);
  if (discBracketMatch) {
    if (discBracketMatch[0].includes('%')) {
      discountPercent = parseFloat(discBracketMatch[1].replace(',', '.'));
      discountAmount = (originalGross * discountPercent) / 100;
    } else {
      discountAmount = parseFloat(discBracketMatch[1].replace(',', '.'));
    }
  } else {
    const looseDiscMatch = note.match(/(?:endirim|скидка|discount)\s*:\s*₼?([0-9.,]+)%?/i);
    if (looseDiscMatch) {
      if (looseDiscMatch[0].includes('%')) {
        discountPercent = parseFloat(looseDiscMatch[1].replace(',', '.'));
        discountAmount = (originalGross * discountPercent) / 100;
      } else {
        discountAmount = parseFloat(looseDiscMatch[1].replace(',', '.'));
      }
    }
  }

  const totalMatch = note.match(/\[Məbləğ:\s*₼?([0-9.,]+)\]/i) || note.match(/\[Cəmi:\s*₼?([0-9.,]+)\]/i);
  if (totalMatch) {
    info.totalAmount = parseFloat(totalMatch[1].replace(',', '.'));
    if (discountAmount === 0 && info.totalAmount < originalGross && info.unitPrice > 0) {
      discountAmount = Math.max(0, originalGross - info.totalAmount);
    }
  } else {
    info.totalAmount = Math.max(0, originalGross - discountAmount);
  }

  info.discount = discountAmount;
  info.discountPercent = discountPercent;

  // 6. Birmarket details
  const birmarketMatch = note.match(/Satış\s*\(([^)]+)\):\s*Kassaya\/Saytda:\s*₼?([0-9.,]+),\s*Mənfəət:\s*₼?([0-9.,]+)/i);
  if (birmarketMatch) {
    info.birmarketCategory = birmarketMatch[1].trim();
    info.kassaAmount = parseFloat(birmarketMatch[2].replace(',', '.'));
    info.profit = parseFloat(birmarketMatch[3].replace(',', '.'));
  }

  // 7. Credit details
  const creditMatch = note.match(/Kredit Satışı\s*\(([0-9]+)\s*ay\):\s*Kassaya:\s*₼?([0-9.,]+),\s*Mənfəət:\s*₼?([0-9.,]+)/i);
  if (creditMatch) {
    info.months = parseInt(creditMatch[1], 10);
    info.kassaAmount = parseFloat(creditMatch[2].replace(',', '.'));
    info.profit = parseFloat(creditMatch[3].replace(',', '.'));
  }

  // 8. Advance / Beh details
  const advMatch = note.match(/\[(?:Avans|Beh):\s*₼?([0-9.,]+)\]/i);
  if (advMatch) {
    info.advanceAmount = parseFloat(advMatch[1].replace(',', '.'));
  }
  const advRecipMatch = note.match(/\[(?:Avans Alan|Usta\/İşçi|Usta|İşçi):\s*([^\]]+)\]/i);
  if (advRecipMatch) {
    info.advanceRecipient = advRecipMatch[1].trim();
  }

  // 8.5. Other Expense (Digər xərclər) details
  const expCatMatch = note.match(/\[Xərc:\s*([^\]]+)\]/i);
  if (expCatMatch) {
    info.expenseCategory = expCatMatch[1].trim();
    if (!info.paymentMethod || info.paymentMethod === 'Nağd') {
      info.paymentMethod = 'Digər xərclər';
    }
  }
  const expDescMatch = note.match(/\[İzah:\s*([^\]]+)\]/i);
  if (expDescMatch) {
    info.expenseDescription = expDescMatch[1].trim();
  }
  const expRecipMatch = note.match(/\[(?:Xərcləyən|Xərc Alan):\s*([^\]]+)\]/i);
  if (expRecipMatch) {
    info.expenseRecipient = expRecipMatch[1].trim();
  }

  // Fallback profit calculation if not parsed
  if (info.profit === null) {
    info.profit = info.totalAmount - info.totalCost;
  }

  // 9. Status & Return / Exchange detection
  info.status = 'completed';
  if (/\[STATUS:\s*REFUNDED\]/i.test(note) || /\[Qaytarıldı:/i.test(note)) {
    info.status = 'refunded';
  } else if (/\[STATUS:\s*EXCHANGED\]/i.test(note) || /\[Dəyişdirildi:/i.test(note)) {
    info.status = 'exchanged';
  } else if (/\[STATUS:\s*CANCELLED\]/i.test(note)) {
    info.status = 'cancelled';
  }

  if (info.status === 'refunded' || info.status === 'exchanged') {
    const reasonMatch = note.match(/\[Səbəb:\s*([^\]]+)\]/i);
    const returnQtyMatch = note.match(/\[Qaytarılan Miqdar:\s*([0-9.,]+)\]/i) || note.match(/\[Qaytarıldı:\s*([0-9.,]+)\s*əd/i);
    const returnAmtMatch = note.match(/\[Qaytarılan Məbləğ:\s*₼?([0-9.,]+)\]/i) || note.match(/\[Qaytarıldı:[^\]]*₼([0-9.,]+)/i);
    const methodMatch = note.match(/\[Üsul:\s*([^\]]+)\]/i) || note.match(/\[Qaytarılma Üsulu:\s*([^\]]+)\]/i);
    const exchangeProdMatch = note.match(/\[Dəyişdirilən Məhsul:\s*([^\]]+)\]/i) || note.match(/\[Dəyişdirildi:\s*([^\]]+)\]/i);
    const diffMatch = note.match(/\[Fərq:\s*₼?([0-9.,+-]+)\]/i);
    const returnDateMatch = note.match(/\[(?:Qaytarılma|Dəyişdirilmə) Tarixi:\s*([^\]]+)\]/i);

    info.returnInfo = {
      type: info.status,
      reason: reasonMatch ? reasonMatch[1].trim() : null,
      returnQuantity: returnQtyMatch ? parseFloat(returnQtyMatch[1].replace(',', '.')) : null,
      refundAmount: returnAmtMatch ? parseFloat(returnAmtMatch[1].replace(',', '.')) : null,
      refundMethod: methodMatch ? methodMatch[1].trim() : null,
      exchangeProductName: exchangeProdMatch ? exchangeProdMatch[1].trim() : null,
      priceDifference: diffMatch ? parseFloat(diffMatch[1].replace(',', '.')) : null,
      returnDate: returnDateMatch ? returnDateMatch[1].trim() : null,
    };
  }

  // Extract clean custom note (strip metadata brackets)
  info.cleanNote = note
    .replace(/\[Kanal:[^\]]+\]/gi, '')
    .replace(/\[Satıcı:[^\]]+\]/gi, '')
    .replace(/\[Kassir:[^\]]+\]/gi, '')
    .replace(/\[Müştəri:[^\]]+\]/gi, '')
    .replace(/\[Qiymət:[^\]]+\]/gi, '')
    .replace(/\[Endirim:[^\]]+\]/gi, '')
    .replace(/\[Скидка:[^\]]+\]/gi, '')
    .replace(/\[Discount:[^\]]+\]/gi, '')
    .replace(/\[Məbləğ:[^\]]+\]/gi, '')
    .replace(/\[Cəmi:[^\]]+\]/gi, '')
    .replace(/\[Avans:[^\]]+\]/gi, '')
    .replace(/\[Beh:[^\]]+\]/gi, '')
    .replace(/\[Avans Alan:[^\]]+\]/gi, '')
    .replace(/\[Usta\/İşçi:[^\]]+\]/gi, '')
    .replace(/\[SaleID:[^\]]+\]/gi, '')
    .replace(/\[STATUS:[^\]]+\]/gi, '')
    .replace(/\[Qaytarıldı:[^\]]+\]/gi, '')
    .replace(/\[Dəyişdirildi:[^\]]+\]/gi, '')
    .replace(/\[Səbəb:[^\]]+\]/gi, '')
    .replace(/\[Qaytarılan Miqdar:[^\]]+\]/gi, '')
    .replace(/\[Qaytarılan Məbləğ:[^\]]+\]/gi, '')
    .replace(/\[Üsul:[^\]]+\]/gi, '')
    .replace(/\[Qaytarılma Üsulu:[^\]]+\]/gi, '')
    .replace(/\[Dəyişdirilən Məhsul:[^\]]+\]/gi, '')
    .replace(/\[Fərq:[^\]]+\]/gi, '')
    .replace(/\[(?:Qaytarılma|Dəyişdirilmə) Tarixi:[^\]]+\]/gi, '')
    .replace(/^Məhsul Satışı\s*\(Ödəniş:[^)]+\)/gi, '')
    .trim();

  return info;
};

const SaleDetailModal = ({ 
  isOpen, 
  onClose, 
  sale, 
  warehouseName, 
  categoryName, 
  onDelete, 
  canDelete = false,
  currentStaff,
  onOpenReturnModal
}) => {
  const { t, i18n } = useTranslation();
  const [copiedField, setCopiedField] = useState(null);

  // Strictly Owner (!currentStaff) or Admin role can view cost prices & profits
  const isAdmin = !currentStaff || currentStaff?.role === 'Admin' || currentStaff?.role?.toLowerCase() === 'admin' || currentStaff?.role?.toLowerCase() === 'owner';

  if (!isOpen || !sale) return null;

  const prod = sale.products;
  const quantity = Math.abs(parseFloat(sale.quantity) || 1);
  const saleInfo = parseSaleNote(sale.notes, prod, quantity, isAdmin);
  const unitLabel = formatUnitName(prod?.unit, i18n.language);
  
  // Format Date and Time
  const dateObj = new Date(sale.issued_at || sale.created_at || Date.now());
  const timeObj = sale.created_at ? new Date(sale.created_at) : (sale.issued_at && sale.issued_at.includes('T') ? new Date(sale.issued_at) : dateObj);
  const formattedDate = dateObj.toLocaleDateString(i18n.language === 'az' ? 'az-AZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(
      i18n.language === 'az' ? `${fieldName} kopyalandı` : 
      i18n.language === 'ru' ? `${fieldName} скопировано` : 
      `${fieldName} copied`
    );
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrintReceipt = () => {
    printThermalReceipt57mm({
      receiptNumber: `№${sale.id ? sale.id.slice(0, 8).toUpperCase() : Date.now().toString().slice(-6)}`,
      transactionId: sale.id,
      storeName: 'Rast musiqi alətləri mağazası',
      date: sale.issued_at || sale.created_at || new Date(),
      warehouseName: warehouseName || 'Əsas Anbar / Mağaza',
      customerName: saleInfo.customerName || '',
      customerPhone: saleInfo.customerPhone || '',
      channel: saleInfo.channel || '',
      paymentMethod: saleInfo.paymentMethod || 'Nəqd',
      items: [
        {
          name: prod?.name || 'Məhsul',
          barcode: prod?.barcode || '',
          quantity,
          unit: unitLabel,
          price: saleInfo.unitPrice || 0,
          total: saleInfo.totalAmount || 0,
          discount: saleInfo.discount || 0
        }
      ],
      subtotal: saleInfo.originalGross || saleInfo.totalAmount || 0,
      discountAmount: saleInfo.discount || 0,
      total: saleInfo.totalAmount || 0,
      creditDetails: saleInfo.months ? {
        bank: saleInfo.bank || 'Birkart',
        months: saleInfo.months,
        monthlyPayment: (saleInfo.totalAmount || 0) / (saleInfo.months || 1),
        contractTotal: saleInfo.totalAmount || 0
      } : null,
      notes: saleInfo.cleanNote || '',
      paperWidth: '57mm'
    });
  };

  const channelBadge = getChannelBadge(saleInfo.channel);

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200 max-h-[92vh]">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#07071a] via-[#0f0f33] to-[#1c1c4f] text-white p-5 sm:p-6 relative shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                      {i18n.language === 'az' ? 'Satış Haqqında Tam Məlumat' : 
                       i18n.language === 'ru' ? 'Полная информация о продаже' : 
                       'Sale Full Details'}
                    </h2>
                    {saleInfo.status === 'refunded' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <RotateCcw className="w-3 h-3" />
                        {i18n.language === 'az' ? 'Qaytarılıb' : i18n.language === 'ru' ? 'Возвращен' : 'Refunded'}
                      </span>
                    ) : saleInfo.status === 'exchanged' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        <ArrowLeftRight className="w-3 h-3" />
                        {i18n.language === 'az' ? 'Dəyişdirilib' : i18n.language === 'ru' ? 'Обменен' : 'Exchanged'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        {i18n.language === 'az' ? 'Tamamlandı' : i18n.language === 'ru' ? 'Завершена' : 'Completed'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 font-medium flex-wrap">
                    <span className="font-mono text-gray-300 font-bold">#{sale.id.slice(0, 8).toUpperCase()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formattedDate} {formattedTime}
                    </span>
                    {saleInfo.sellerName && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 font-bold text-[11px]">
                          <User className="w-3 h-3 text-blue-400" />
                          {i18n.language === 'az' ? 'Satıcı:' : i18n.language === 'ru' ? 'Продавец:' : 'Seller:'} {saleInfo.sellerName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            
            {/* RETURN / EXCHANGE AUDIT BANNER IF APPLICABLE */}
            {saleInfo.status === 'refunded' && (
              <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-amber-900 font-black text-sm mb-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <span>{i18n.language === 'az' ? 'Məhsul Qaytarılıb (Geri Qaytarış Rəsmiləşdirilib)' : 'Товар возвращен (Оформлен возврат)'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/80 p-3 rounded-xl border border-amber-200/60 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">{i18n.language === 'az' ? 'Səbəb' : 'Причина'}:</span>
                    <span className="font-bold text-gray-800">{saleInfo.returnInfo?.reason || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">{i18n.language === 'az' ? 'Qaytarılan Məbləğ' : 'Сумма возврата'}:</span>
                    <span className="font-black text-amber-700">₼{(saleInfo.returnInfo?.refundAmount ?? saleInfo.totalAmount).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">{i18n.language === 'az' ? 'Qaytarılma Üsulu' : 'Способ возврата'}:</span>
                    <span className="font-bold text-gray-800">{saleInfo.returnInfo?.refundMethod || saleInfo.paymentMethod}</span>
                  </div>
                </div>
              </div>
            )}

            {saleInfo.status === 'exchanged' && (
              <div className="bg-blue-50 border border-blue-200/90 rounded-2xl p-4 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-blue-900 font-black text-sm mb-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <span>{i18n.language === 'az' ? 'Məhsul Dəyişdirilib (Mübadilə Rəsmiləşdirilib)' : 'Товар обменен на другой (Оформлен обмен)'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/80 p-3 rounded-xl border border-blue-200/60 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">{i18n.language === 'az' ? 'Yeni Məhsul' : 'Новый товар'}:</span>
                    <span className="font-bold text-blue-900">{saleInfo.returnInfo?.exchangeProductName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">{i18n.language === 'az' ? 'Səbəb' : 'Причина'}:</span>
                    <span className="font-bold text-gray-800">{saleInfo.returnInfo?.reason || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">{i18n.language === 'az' ? 'Qiymət Fərqi' : 'Разница цен'}:</span>
                    <span className={`font-black ${
                      (saleInfo.returnInfo?.priceDifference || 0) > 0 ? 'text-amber-700' : 
                      (saleInfo.returnInfo?.priceDifference || 0) < 0 ? 'text-emerald-700' : 'text-gray-700'
                    }`}>
                      {(saleInfo.returnInfo?.priceDifference || 0) > 0 ? `+₼${saleInfo.returnInfo.priceDifference.toFixed(2)}` :
                       (saleInfo.returnInfo?.priceDifference || 0) < 0 ? `-₼${Math.abs(saleInfo.returnInfo.priceDifference).toFixed(2)}` : '₼0.00'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Top Financial KPI Cards */}
            <div className={`grid grid-cols-2 ${isAdmin && saleInfo.totalCost !== null ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
              {/* Total Sale Amount (Faktiki Satış Məbləği) */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50/40 border border-emerald-100/80 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-600 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {i18n.language === 'az' ? 'Faktiki Satış Məbləği' : i18n.language === 'ru' ? 'Сумма реализации' : 'Total'}
                  </span>
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight flex items-baseline gap-1.5 flex-wrap">
                  <span>₼{saleInfo.totalAmount.toFixed(2)}</span>
                  {saleInfo.discount > 0 && (
                    <span className="text-xs line-through text-gray-400 font-semibold">
                      ₼{saleInfo.originalGross.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600/80 mt-1">
                  <span>₼{saleInfo.unitPrice.toFixed(2)} / {unitLabel}</span>
                  {saleInfo.discount > 0 && (
                    <span className="px-1.5 py-0.5 rounded font-black bg-rose-100 text-rose-700">
                      -{saleInfo.discount.toFixed(2)} ₼
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-100/80 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-blue-600 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {i18n.language === 'az' ? 'Miqdar' : i18n.language === 'ru' ? 'Количество' : 'Quantity'}
                  </span>
                  <Package className="w-4 h-4" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-blue-700 tracking-tight">
                  {quantity} <span className="text-sm font-bold">{unitLabel}</span>
                </div>
                <div className="text-[10px] font-bold text-blue-600/80 mt-1 truncate">
                  {i18n.language === 'az' ? `Qalıq: ${prod?.stock_quantity ?? '—'} ${prod?.stock_quantity != null ? unitLabel : ''}` : `Остаток: ${prod?.stock_quantity ?? '—'} ${prod?.stock_quantity != null ? unitLabel : ''}`}
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50/40 border border-purple-100/80 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-purple-600 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {i18n.language === 'az' ? 'Ödəniş' : i18n.language === 'ru' ? 'Оплата' : 'Payment'}
                  </span>
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="text-base sm:text-lg font-black text-purple-700 truncate tracking-tight">
                  {saleInfo.paymentMethod}
                </div>
                <div className="text-[10px] font-bold text-purple-600/80 mt-1 truncate">
                  {saleInfo.channel}
                </div>
              </div>

              {/* Profit / Cost (strictly Admin/Owner only) */}
              {isAdmin && saleInfo.totalCost !== null && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-100/80 rounded-xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-amber-600 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      {i18n.language === 'az' ? 'Mənfəət' : i18n.language === 'ru' ? 'Прибыль' : 'Profit'}
                    </span>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
                    +₼{saleInfo.profit !== null ? saleInfo.profit.toFixed(2) : (saleInfo.totalAmount - saleInfo.totalCost).toFixed(2)}
                  </div>
                  <div className="text-[10px] font-bold text-amber-600/80 mt-1 truncate">
                    {i18n.language === 'az' ? `Maya: ₼${saleInfo.totalCost.toFixed(2)}` : `Себест.: ₼${saleInfo.totalCost.toFixed(2)}`}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Product Information Card */}
            <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  {i18n.language === 'az' ? 'Satılan Məhsul' : i18n.language === 'ru' ? 'Товар' : 'Product'}
                </span>
                {categoryName && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                    {categoryName}
                  </span>
                )}
              </div>

              <div className="flex items-start gap-4">
                {prod?.image_url ? (
                  <img 
                    src={prod.image_url} 
                    alt={prod.name} 
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-sm shrink-0" 
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center text-gray-400 shrink-0 shadow-sm">
                    <Package className="w-7 h-7 text-gray-300" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-gray-900 leading-snug">
                    {prod?.name || (i18n.language === 'az' ? 'Məhsul adı qeyd edilməyib' : 'Товар')}
                  </h3>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {/* Barcode badge with copy */}
                    {prod?.barcode ? (
                      <button 
                        onClick={() => handleCopy(prod.barcode, 'Barkod')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-700 transition-colors shadow-2xs group"
                        title={i18n.language === 'az' ? 'Barkodu kopyala' : 'Скопировать штрихкод'}
                      >
                        <BarcodeIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                        <span>{prod.barcode}</span>
                        {copiedField === 'Barkod' ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 font-mono">—</span>
                    )}

                    {/* Warehouse badge */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                      <WarehouseIcon className="w-3.5 h-3.5 text-gray-400" />
                      {warehouseName || 'Əsas Anbar'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Transaction Details & Customer Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Customer Box */}
              <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    {i18n.language === 'az' ? 'Müştəri Məlumatı' : i18n.language === 'ru' ? 'Информация о клиенте' : 'Customer'}
                  </span>

                  {saleInfo.customerName ? (
                    <div className="space-y-1.5">
                      <div className="text-sm font-black text-gray-900 flex items-center justify-between">
                        <span>{saleInfo.customerName}</span>
                      </div>
                      {saleInfo.customerPhone && (
                        <div className="flex items-center gap-2">
                          <a 
                            href={`tel:${saleInfo.customerPhone}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {saleInfo.customerPhone}
                          </a>
                          <button 
                            onClick={() => handleCopy(saleInfo.customerPhone, 'Telefon')}
                            className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                            title="Kopyala"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 font-medium py-1">
                      {i18n.language === 'az' ? 'Standart / Qeydiyyatsız alıcı (Anonim)' : 
                       i18n.language === 'ru' ? 'Стандартный / Розничный покупатель' : 
                       'Walk-in / Standard Customer'}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-500 font-medium">
                  <span>{i18n.language === 'az' ? 'Satış Kanalı:' : 'Канал продаж:'}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${channelBadge.bg}`}>
                    {channelBadge.label}
                  </span>
                </div>
                {saleInfo.sellerName && (
                  <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      {i18n.language === 'az' ? 'Məsul Satıcı:' : 'Ответственный продавец:'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {saleInfo.sellerName}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Details Box */}
              <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                    {i18n.language === 'az' ? 'Ödəniş və Maliyyə' : i18n.language === 'ru' ? 'Оплата и финансы' : 'Payment Details'}
                  </span>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">{i18n.language === 'az' ? 'Ödəniş üsulu:' : 'Способ оплаты:'}</span>
                      <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                        {saleInfo.paymentMethod}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">{i18n.language === 'az' ? 'Vahid qiymət:' : 'Цена за ед.:'}</span>
                      <span className="font-bold text-gray-900">₼{saleInfo.unitPrice.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">{i18n.language === 'az' ? 'Miqdar:' : 'Количество:'}</span>
                      <span className="font-bold text-gray-900">{quantity} {unitLabel}</span>
                    </div>

                    {saleInfo.discount > 0 && (
                      <>
                        <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                          <span className="text-gray-500 font-medium">{i18n.language === 'az' ? 'İlkin məbləğ:' : 'Сумма без скидки:'}</span>
                          <span className="font-bold text-gray-500 line-through">₼{saleInfo.originalGross.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center justify-between text-rose-600 bg-rose-50/80 px-2 py-1 rounded-md border border-rose-100 font-bold">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Tag className="w-3.5 h-3.5" />
                            {i18n.language === 'az' ? 'Tətbiq edilmiş endirim:' : 'Скидка:'}
                          </span>
                          <span className="text-xs font-black">-₼{saleInfo.discount.toFixed(2)}</span>
                        </div>
                      </>
                    )}

                    {saleInfo.advanceAmount != null && (
                      <div className="flex items-center justify-between pt-1 border-t border-teal-200/60 bg-teal-50/70 p-2 rounded-lg border border-teal-100 font-bold">
                        <span className="text-teal-800">{i18n.language === 'az' ? 'Ödənilən Avans:' : 'Внесенный аванс:'}</span>
                        <span className="text-xs font-black text-teal-900">₼{saleInfo.advanceAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {saleInfo.advanceRecipient && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                        <span className="text-gray-500 font-medium">{i18n.language === 'az' ? 'Avans alan (İşçi/Usta):' : 'Кому выдан аванс:'}</span>
                        <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {saleInfo.advanceRecipient}
                        </span>
                      </div>
                    )}

                    {saleInfo.expenseCategory && (
                      <div className="flex items-center justify-between pt-1 border-t border-orange-200/60 bg-orange-50/70 p-2 rounded-lg border border-orange-100 font-bold">
                        <span className="text-orange-900">{i18n.language === 'az' ? 'Xərc Kateqoriyası:' : 'Категория расхода:'}</span>
                        <span className="text-xs font-black text-orange-950">{saleInfo.expenseCategory}</span>
                      </div>
                    )}

                    {saleInfo.expenseDescription && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                        <span className="text-gray-500 font-medium">{i18n.language === 'az' ? 'Xərc İzahı:' : 'Описание расхода:'}</span>
                        <span className="font-bold text-gray-800">{saleInfo.expenseDescription}</span>
                      </div>
                    )}

                    {saleInfo.expenseRecipient && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                        <span className="text-gray-500 font-medium">{i18n.language === 'az' ? 'Xərcləyən / Təhvil alan:' : 'Потратил / получил:'}</span>
                        <span className="font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          {saleInfo.expenseRecipient}
                        </span>
                      </div>
                    )}

                    {saleInfo.months && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                        <span className="text-gray-500 font-medium">{i18n.language === 'az' ? 'Kredit müddəti:' : 'Срок кредита:'}</span>
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {saleInfo.months} {i18n.language === 'az' ? 'ay' : 'мес.'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-200/60 flex items-center justify-between text-xs">
                  <span className="font-black text-gray-700">{i18n.language === 'az' ? 'Yekun məbləğ:' : 'Общая сумма:'}</span>
                  <span className="font-black text-emerald-700 text-sm">₼{saleInfo.totalAmount.toFixed(2)}</span>
                </div>
              </div>

            </div>

            {/* 4. Notes Section (if cleanNote exists) */}
            {saleInfo.cleanNote && (
              <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3.5">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <FileText className="w-3 h-3" />
                  {i18n.language === 'az' ? 'Əlavə Qeyd' : i18n.language === 'ru' ? 'Примечание' : 'Notes'}
                </span>
                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  {saleInfo.cleanNote}
                </p>
              </div>
            )}

            {/* Raw System Log note preview */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-[10px] font-mono text-gray-500 break-words">
              <span className="font-bold text-gray-700 uppercase mr-1">Sistem jurnalı:</span>
              {sale.notes || '—'}
            </div>

          </div>

          {/* Modal Footer */}
          <div className="bg-gray-50/80 border-t border-gray-100 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
            <div>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(sale);
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{i18n.language === 'az' ? 'Satışı Sil' : i18n.language === 'ru' ? 'Удалить продажу' : 'Delete Sale'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {saleInfo.status !== 'refunded' && saleInfo.status !== 'exchanged' && onOpenReturnModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenReturnModal(sale);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>{i18n.language === 'az' ? 'Məhsulu Qaytar / Dəyişdir' : i18n.language === 'ru' ? 'Возврат / Обмен товара' : 'Return / Exchange'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{i18n.language === 'az' ? 'Çap Et (57mm)' : i18n.language === 'ru' ? 'Печать чека (57мм)' : 'Print Receipt (57mm)'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                {i18n.language === 'az' ? 'Bağla' : i18n.language === 'ru' ? 'Закрыть' : 'Close'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
};

export default SaleDetailModal;
