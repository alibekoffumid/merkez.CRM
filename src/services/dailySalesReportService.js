import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { robotoAzFont } from './robotoAzFont.js';

/**
 * Azerbaijani Month Names
 */
export const AZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];

/**
 * Default Report Customization Options
 */
export const DEFAULT_REPORT_OPTIONS = {
  mode: 'detailed', // 'detailed' (Ətraflı Maliyyə) | 'products_only' (Yalnız Məhsul və Sayı)
  showPrices: true,
  showFinancialSummary: true,
  showPaymentBreakdown: true,
  showReceipts: true,
  showProfit: true,
  showBarcodes: true,
  showCategories: true,
  showSignatures: true,
  showNotesColumn: true
};

/**
 * Format a Date object to Azerbaijani long format (məs: "05 Oktyabr 2026")
 */
export const formatDateAz = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = AZ_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Format a Date object to Azerbaijani short format (məs: "05.10.2026")
 */
export const formatShortDateAz = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

/**
 * Format date and time (məs: "05.10.2026, 18:45")
 */
export const formatDateTimeAz = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year}, ${hours}:${minutes}`;
};

/**
 * Format time only (məs: "18:45")
 */
export const formatTimeAz = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Translate payment method to Azerbaijani
 */
export const translatePaymentMethodAz = (method) => {
  const m = String(method || '').toLowerCase().trim();
  switch (m) {
    case 'cash':
    case 'nağd':
    case 'nagd':
      return 'Nağd';
    case 'card':
    case 'kart':
      return 'Kart';
    case 'pos':
    case 'terminal':
      return 'Terminal';
    case 'split':
      return 'Qarışıq (Bölünmüş)';
    case 'credit':
    case 'kredit':
    case 'installment':
    case 'taksit':
    case 'birmarket':
      return 'Kredit';
    case 'debt':
    case 'nisyə':
    case 'nisye':
    case 'borc':
      return 'Nisyə';
    case 'deposit':
    case 'beh':
    case 'avans':
    case 'advance':
    case 'zalog':
      return 'Beh (Avans)';
    case 'transfer':
    case 'bank':
      return 'Bank Köçürməsi';
    case 'expense':
    case 'xərc':
    case 'xerc':
    case 'rasxod':
    case 'digər':
    case 'diger':
      return 'Digər xərclər';
    default:
      return method || 'Digər';
  }
};

/**
 * Helper to identify if a sale or item has been cancelled, deleted, refunded, or hidden
 */

/**
 * Parse structured sale note to extract prices, discounts, channel, customer and payment method
 * Identical logic with WarehouseEfficiencyCharts and SaleDetailModal
 */
export const parseSaleNote = (note = '', product = null, quantity = 1, isAdmin = true) => {
  const qty = Math.abs(parseFloat(quantity) || 1);
  const prodPrice = product?.price ? Number(product.price) : 0;
  const prodCost = isAdmin && product?.purchase_price ? Number(product.purchase_price) : null;

  let unitPrice = prodPrice;
  const priceMatch = note.match(/\[Qiymət:\s*₼?([0-9.,]+)\]/i);
  if (priceMatch) {
    unitPrice = parseFloat(priceMatch[1].replace(',', '.'));
  }
  const originalGross = unitPrice * qty;
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

  let totalAmount = 0;
  const totalMatch = note.match(/\[Məbləğ:\s*₼?([0-9.,]+)\]/i) || note.match(/\[Cəmi:\s*₼?([0-9.,]+)\]/i);
  if (totalMatch) {
    totalAmount = parseFloat(totalMatch[1].replace(',', '.'));
    if (discountAmount === 0 && totalAmount < originalGross && unitPrice > 0) {
      discountAmount = Math.max(0, originalGross - totalAmount);
    }
  } else {
    totalAmount = Math.max(0, originalGross - discountAmount);
  }

  let paymentMethod = 'Nağd';
  const payMatch = note.match(/\(Ödəniş:\s*([^)]+)\)/i);
  if (payMatch) {
    const raw = payMatch[1].trim();
    const lower = raw.toLowerCase();
    if (lower === 'nəqd' || lower === 'nağd' || lower === 'cash' || lower === 'neqd' || lower === 'nagd') {
      paymentMethod = 'Nağd';
    } else if (lower.includes('terminal')) {
      paymentMethod = 'Terminal';
    } else if (lower.includes('kart') || lower.includes('card')) {
      paymentMethod = 'Kart';
    } else if (lower.includes('qarışıq') || lower.includes('bölünmüş') || lower.includes('split')) {
      paymentMethod = 'Qarışıq (Bölünmüş)';
    } else if (lower.includes('köçürmə') || lower.includes('kocurme') || lower.includes('transfer')) {
      paymentMethod = 'Köçürmə';
    } else if (lower.includes('kredit')) {
      paymentMethod = 'Kredit';
    } else if (lower.includes('nisyə') || lower.includes('nisye') || lower.includes('borc')) {
      paymentMethod = 'Nisyə';
    } else if (lower.includes('beh') || lower.includes('avans')) {
      paymentMethod = 'Beh';
    } else {
      paymentMethod = raw;
    }
  } else if (/qarışıq|bölünmüş|split/i.test(note)) {
    paymentMethod = 'Qarışıq (Bölünmüş)';
  } else if (/xərc|расход|expense/i.test(note)) {
    paymentMethod = 'Digər xərclər';
  } else if (/beh|avans|deposit/i.test(note)) {
    paymentMethod = 'Beh';
  } else if (/birmarket/i.test(note)) {
    paymentMethod = 'Kredit';
  } else if (/kredit/i.test(note)) {
    paymentMethod = 'Kredit';
  } else if (/nisyə|borc/i.test(note)) {
    paymentMethod = 'Nisyə';
  } else if (/terminal/i.test(note)) {
    paymentMethod = 'Terminal';
  } else if (/kart/i.test(note)) {
    paymentMethod = 'Kart';
  } else {
    paymentMethod = 'Nağd';
  }

  let splitCash = 0;
  let splitCard = 0;
  let splitCredit = 0;
  const splitMatch = note.match(/\[Qarışıq:\s*([^\]]+)\]/i);
  if (splitMatch) {
    const cashM = splitMatch[1].match(/Nağd:\s*₼?([0-9.,]+)/i);
    const cardM = splitMatch[1].match(/Kart:\s*₼?([0-9.,]+)/i);
    const termM = splitMatch[1].match(/Terminal:\s*₼?([0-9.,]+)/i);
    const credM = splitMatch[1].match(/Kredit:\s*₼?([0-9.,]+)/i);
    if (cashM) splitCash = parseFloat(cashM[1].replace(',', '.'));
    if (cardM) splitCard += parseFloat(cardM[1].replace(',', '.'));
    if (termM) splitCard += parseFloat(termM[1].replace(',', '.'));
    if (credM) splitCredit = parseFloat(credM[1].replace(',', '.'));
  }

  let customerName = null;
  let customerPhone = null;
  const custMatch = note.match(/\[Müştəri:\s*([^\]]+)\]/i);
  if (custMatch) {
    const custRaw = custMatch[1].trim();
    const phoneMatch = custRaw.match(/\(([^)]+)\)/);
    if (phoneMatch) {
      customerPhone = phoneMatch[1].trim();
      customerName = custRaw.replace(/\([^)]+\)/, '').trim();
    } else {
      customerName = custRaw;
    }
  }

  const avansMatch = note.match(/\[Avans:\s*[^0-9\s]*\s*([\d.,]+)\s*[^\]\d]*\]/i);
  const alanMatch = note.match(/\[Avans Alan:\s*([^\]]+)\]/i);
  const sellerMatch = note.match(/\[Satıcı:\s*([^\]]+)\]/i) || note.match(/\[Kassir:\s*([^\]]+)\]/i) || note.match(/\[Satan:\s*([^\]]+)\]/i);

  return {
    unitPrice,
    totalAmount,
    discount: discountAmount,
    discountPercent,
    paymentMethod,
    customerName,
    customerPhone,
    sellerName: sellerMatch ? sellerMatch[1].trim() : null,
    splitCash,
    splitCard,
    splitCredit,
    advanceAmount: avansMatch ? parseFloat(avansMatch[1].replace(',', '.')) : null,
    advanceRecipient: alanMatch ? alanMatch[1].trim() : null,
    costPrice: prodCost,
    totalCost: prodCost !== null ? prodCost * qty : null
  };
};

export const isCancelledOrDeleted = (record) => {
  if (!record) return false;
  if (record.is_deleted === true) return true;
  if (record.is_hidden === true) return true;
  const status = String(record.status || '').toLowerCase().trim();
  if (['cancelled', 'canceled', 'deleted', 'refunded', 'void', 'silindi', 'ləğv'].includes(status)) return true;
  const notes = String(record.notes || '');
  if (/\[STATUS:\s*(?:REFUNDED|CANCELLED|LƏĞV|QAYTARILIB)\]/i.test(notes)) return true;
  if (/\[STATUS:\s*EXCHANGED\]/i.test(notes) && !/\[Yeni Məhsul:/i.test(notes)) return true;
  return false;
};

/**
 * Fetch and aggregate all sales data for a specific day
 * Security (RBAC):
 * When currentStaff is provided and role is NOT Admin, cost/purchase prices and profit margins
 * are NEVER queried from Supabase and are stripped from the returned DTO to protect business margins.
 */
export const fetchDailySalesReportData = async (supabase, userId, selectedDateInput, includeHidden = false, currentStaff = null) => {
  if (!supabase || !userId) {
    throw new Error('Supabase client və İstifadəçi ID mütləqdir');
  }

  // RBAC Permission Check: Only Owner (!currentStaff) or Admin role can view cost prices & profits
  const isAdmin = !currentStaff || currentStaff?.role === 'Admin' || currentStaff?.role?.toLowerCase() === 'admin' || currentStaff?.role?.toLowerCase() === 'owner';

  // Determine target date YYYY-MM-DD
  let dateStr = '';
  if (typeof selectedDateInput === 'string' && selectedDateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
    dateStr = selectedDateInput;
  } else {
    const d = selectedDateInput ? new Date(selectedDateInput) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
  }

  // Construct start and end of day in local time
  const startOfDay = new Date(`${dateStr}T00:00:00.000`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999`);

  // 1. Fetch sales with items (fetching all daily records so cancelled ones can be audited independently)
  let salesList = [];
  let sFrom = 0;
  const sStep = 1000;
  let sHasMore = true;

  while (sHasMore) {
    const salesQuery = supabase
      .from('retail_sales')
      .select('*, retail_sale_items(*)')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: true })
      .range(sFrom, sFrom + sStep - 1);

    const { data: salesChunk, error: salesError } = await salesQuery;
    if (salesError) {
      console.error('Error fetching retail sales in dailySalesReportService:', salesError);
      throw salesError;
    }

    if (salesChunk && salesChunk.length > 0) {
      salesList.push(...salesChunk);
      if (salesChunk.length < sStep) {
        sHasMore = false;
      } else {
        sFrom += sStep;
      }
    } else {
      sHasMore = false;
    }
  }

  // 2. Fetch products - if !isAdmin, STRICTLY EXCLUDE purchase_price from query to prevent network tab inspection
  let allProducts = [];
  let pFrom = 0;
  const pStep = 1000;
  let pHasMore = true;

  const productSelectFields = isAdmin
    ? 'id, name, barcode, purchase_price, price, category_id, unit'
    : 'id, name, barcode, price, category_id, unit';

  while (pHasMore) {
    let { data: prodsChunk, error: pErr } = await supabase
      .from('products')
      .select(productSelectFields)
      .eq('user_id', userId)
      .range(pFrom, pFrom + pStep - 1);

    if (pErr) {
      const fallbackChunk = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .range(pFrom, pFrom + pStep - 1);
      prodsChunk = fallbackChunk.data;
      pErr = fallbackChunk.error;
    }

    if (pErr) {
      console.warn('Error fetching products chunk in dailySalesReportService:', pErr);
      break;
    }

    if (prodsChunk && prodsChunk.length > 0) {
      if (!isAdmin) {
        prodsChunk.forEach(p => {
          delete p.purchase_price;
          delete p.factory_price;
        });
      }
      allProducts.push(...prodsChunk);
      if (prodsChunk.length < pStep) {
        pHasMore = false;
      } else {
        pFrom += pStep;
      }
    } else {
      pHasMore = false;
    }
  }

  // Multi-key indexed maps for instantaneous product matching
  const productsMap = new Map();
  const productsByName = new Map();
  const productsByBarcode = new Map();

  allProducts.forEach(p => {
    if (p.id) {
      productsMap.set(p.id, p);
    }
    if (p.barcode) {
      const cleanBarcode = String(p.barcode).trim();
      productsMap.set(cleanBarcode, p);
      productsByBarcode.set(cleanBarcode.toLowerCase(), p);
    }
    if (p.name) {
      const normName = String(p.name).trim().toLowerCase().replace(/\s+/g, ' ');
      if (!productsByName.has(normName)) {
        productsByName.set(normName, p);
      }
    }
  });

  // 3. Fetch ALL categories using range pagination
  let allCategories = [];
  let cFrom = 0;
  const cStep = 1000;
  let cHasMore = true;

  while (cHasMore) {
    const { data: catsChunk, error: cErr } = await supabase
      .from('categories')
      .select('id, name, parent_id')
      .eq('user_id', userId)
      .range(cFrom, cFrom + cStep - 1);

    if (cErr) {
      console.warn('Error fetching categories chunk in dailySalesReportService:', cErr);
      break;
    }

    if (catsChunk && catsChunk.length > 0) {
      allCategories.push(...catsChunk);
      if (catsChunk.length < cStep) {
        cHasMore = false;
      } else {
        cFrom += cStep;
      }
    } else {
      cHasMore = false;
    }
  }

  const categoriesMap = new Map();
  allCategories.forEach(c => {
    if (c.id) {
      categoriesMap.set(c.id, c.name);
    }
  });

  // 4. Fetch daily stock dispatches to capture ALL sales (including warehouse direct dispatches, credit contracts, etc.)
  // This unifies Z-Hesabat 100% with Warehouse Satış Dinamikası (WarehouseEfficiencyCharts)
  let allDayDispatches = [];
  const dayDispatchesMap = new Map();
  try {
    let dFrom = 0;
    const dStep = 1000;
    let dHasMore = true;

    while (dHasMore) {
      const { data: dChunk, error: dErr } = await supabase
        .from('stock_dispatches')
        .select(`id, product_id, quantity, issued_at, notes, created_at, reason, warehouse_id, products(${productSelectFields})`)
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: true })
        .range(dFrom, dFrom + dStep - 1);

      if (dErr) {
        console.warn('Error fetching daily stock_dispatches in dailySalesReportService:', dErr);
        break;
      }
      if (dChunk && dChunk.length > 0) {
        allDayDispatches.push(...dChunk);
        if (dChunk.length < dStep) dHasMore = false;
        else dFrom += dStep;
      } else {
        dHasMore = false;
      }
    }

    allDayDispatches.forEach(d => {
      const n = d.notes || '';
      const saleIdMatch = n.match(/\[SaleID:\s*([^\]]+)\]/i);
      const avansMatch = n.match(/\[Avans:\s*[^0-9\s]*\s*([\d.,]+)\s*[^\]\d]*\]/i);
      const alanMatch = n.match(/\[Avans Alan:\s*([^\]]+)\]/i);

      if (saleIdMatch && saleIdMatch[1]) {
        dayDispatchesMap.set(saleIdMatch[1].trim(), {
          advanceAmount: avansMatch ? parseFloat(avansMatch[1].replace(',', '.')) : null,
          advanceRecipient: alanMatch ? alanMatch[1].trim() : null
        });
      }
    });
  } catch (dispErr) {
    console.warn('Error fetching stock_dispatches for advance enrichment:', dispErr);
  }

  // 5. Fetch store operating/personal expenses from business_expenses for the given date
  let storeExpensesList = [];
  let storeCashExpenses = 0;
  let storeBankExpenses = 0;
  try {
    const { data: bExpData } = await supabase
      .from('business_expenses')
      .select('*')
      .eq('user_id', userId)
      .or(`expense_date.eq.${dateStr},and(created_at.gte.${startOfDay.toISOString()},created_at.lte.${endOfDay.toISOString()})`);

    if (bExpData && bExpData.length > 0) {
      storeExpensesList = bExpData;
      bExpData.forEach(exp => {
        const amt = Number(exp.amount || 0);
        const desc = String(exp.description || '');
        if (desc.includes('Bank') || desc.includes('Kart')) {
          storeBankExpenses += amt;
        } else {
          storeCashExpenses += amt;
        }
      });
    }
  } catch (bExpErr) {
    console.warn('Error fetching business_expenses for daily report:', bExpErr);
  }

  // Filter valid and cancelled dispatches matching WarehouseEfficiencyCharts logic
  const validSaleDispatches = allDayDispatches.filter(d => {
    const notes = String(d.notes || '');
    if (/\[STATUS:\s*(?:REFUNDED|CANCELLED|LƏĞV|QAYTARILIB)\]/i.test(notes)) return false;
    if (/\[STATUS:\s*EXCHANGED\]/i.test(notes) && !/\[Yeni Məhsul:/i.test(notes)) return false;
    const isSale = !d.reason || d.reason === 'sale';
    const qty = Math.abs(parseFloat(d.quantity) || 0);
    return isSale && qty > 0;
  });

  const cancelledDispatches = allDayDispatches.filter(d => {
    const notes = String(d.notes || '');
    return /\[STATUS:\s*(?:REFUNDED|CANCELLED|LƏĞV|QAYTARILIB)\]/i.test(notes);
  });

  // Separate valid sales from cancelled / deleted sales
  const validSalesList = [];
  const cancelledSalesList = [];

  if (validSaleDispatches.length > 0) {
    // Group dispatches into distinct transactions (by POS Sale Ref, Credit Customer contract, or unique note)
    const groups = new Map();
    validSaleDispatches.forEach(d => {
      const notes = d.notes || '';
      let groupKey = null;
      const saleIdMatch = notes.match(/\[SaleID:\s*([^\]]+)\]/i);
      const saleRefMatch = notes.match(/#SALE-([0-9A-Za-z]+)/i);
      const custMatch = notes.match(/\[Müştəri:\s*([^\]]+)\]/i);
      const chanMatch = notes.match(/\[Kanal:\s*([^\]]+)\]/i);

      if (saleIdMatch) {
        groupKey = 'ID:' + saleIdMatch[1].trim();
      } else if (saleRefMatch) {
        groupKey = 'REF:' + saleRefMatch[0].toUpperCase();
      } else if (custMatch) {
        groupKey = 'CUST:' + (chanMatch ? chanMatch[1] : '') + '_' + custMatch[1].trim();
      } else {
        const minute = new Date(d.created_at).toISOString().substring(0, 16);
        groupKey = 'NOTE:' + minute + '_' + notes.substring(0, 40);
      }

      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(d);
    });

    const dispatchedSales = [];
    groups.forEach((dispList, gKey) => {
      const first = dispList[0];
      let groupTotal = 0;
      let groupDiscount = 0;
      let groupMethod = 'Nağd';
      let groupSplitCash = 0;
      let groupSplitCard = 0;
      let groupSplitCredit = 0;
      let groupCust = null;
      let groupAdvAmt = null;
      let groupAdvRecip = null;
      let groupSeller = null;

      const groupItems = dispList.map(d => {
        const q = Math.abs(parseFloat(d.quantity) || 1);
        const prodMeta = d.products || productsMap.get(d.product_id) || {};
        const p = parseSaleNote(d.notes || '', prodMeta, q, isAdmin);

        groupTotal += p.totalAmount;
        groupDiscount += p.discount;
        groupMethod = p.paymentMethod;
        if (p.splitCash) groupSplitCash += p.splitCash;
        if (p.splitCard) groupSplitCard += p.splitCard;
        if (p.splitCredit) groupSplitCredit += p.splitCredit;
        if (p.customerName) groupCust = p.customerName;
        if (p.advanceAmount) groupAdvAmt = p.advanceAmount;
        if (p.advanceRecipient) groupAdvRecip = p.advanceRecipient;
        if (p.sellerName) groupSeller = p.sellerName;

        const pKey = prodMeta.id || d.product_id;
        const unit = prodMeta.unit || 'ədəd';
        const barcode = prodMeta.barcode || '-';
        const categoryName = (prodMeta.category_id && categoriesMap.get(prodMeta.category_id)) || 'Ümumi';

        return {
          id: d.id,
          product_id: pKey,
          product_name: prodMeta.name || 'Naməlum Məhsul',
          quantity: q,
          price_at_sale: p.unitPrice,
          base_price: prodMeta.price || p.unitPrice,
          discount_amount: p.discount,
          total: p.totalAmount,
          cost_price: isAdmin ? p.costPrice : null,
          unit: unit,
          barcode: barcode,
          category_name: categoryName,
          created_at: d.created_at
        };
      });

      dispatchedSales.push({
        id: first.id,
        shortId: gKey.replace('REF:', '').replace('CUST:', '').replace('ID:', ''),
        created_at: first.issued_at || first.created_at,
        total_amount: groupTotal,
        discount_amount: groupDiscount,
        payment_method: groupMethod,
        split_cash: groupSplitCash,
        split_card: groupSplitCard,
        split_credit: groupSplitCredit,
        customer_name: groupCust,
        advance_amount: groupAdvAmt,
        advance_recipient: groupAdvRecip,
        seller_name: groupSeller,
        notes: first.notes || '',
        retail_sale_items: groupItems
      });
    });

    // Check if any retail_sales record was not represented in stock_dispatches
    salesList.forEach(sale => {
      if (isCancelledOrDeleted(sale)) {
        cancelledSalesList.push(sale);
        return;
      }
      const sTime = new Date(sale.created_at).getTime();
      const hasMatchingDispatch = validSaleDispatches.some(d => {
        const dTime = new Date(d.created_at).getTime();
        const n = d.notes || '';
        return n.includes(sale.id) || Math.abs(dTime - sTime) <= 15000;
      });
      if (!hasMatchingDispatch) {
        dispatchedSales.push(sale);
      }
    });

    validSalesList.push(...dispatchedSales);
  } else {
    // Fallback: If no dispatches exist for the day, use retail_sales
    salesList.forEach(sale => {
      if (isCancelledOrDeleted(sale)) {
        cancelledSalesList.push(sale);
      } else {
        validSalesList.push(sale);
      }
    });
  }

  // Handle cancelled dispatches if any
  if (cancelledDispatches.length > 0) {
    cancelledDispatches.forEach(d => {
      const q = Math.abs(parseFloat(d.quantity) || 1);
      const prodMeta = d.products || productsMap.get(d.product_id) || {};
      const p = parseSaleNote(d.notes || '', prodMeta, q, isAdmin);
      cancelledSalesList.push({
        id: d.id,
        shortId: d.id.substring(0, 8).toUpperCase(),
        created_at: d.created_at,
        total_amount: p.totalAmount,
        discount_amount: p.discount,
        payment_method: p.paymentMethod,
        status: 'Ləğv edilib',
        retail_sale_items: [{
          id: d.id,
          product_name: prodMeta.name || 'Məhsul',
          quantity: q,
          price_at_sale: p.unitPrice,
          total: p.totalAmount,
          unit: prodMeta.unit || 'ədəd',
          barcode: prodMeta.barcode || '-'
        }]
      });
    });
  }

  // Compute Aggregations strictly for VALID sales
  // Payment Breakdown - 5 Distinct Categories:
  // 1. Nağd (Cash)
  // 2. Karta / POS (Card / POS Terminal / Bank Transfer)
  // 3. Kredit (Credit / Installments / Birmarket)
  // 4. Nisyə (Debt / Consignment)
  // 5. Beh (Deposit / Advance / Zadatak)
  // 6. Digər xərclər (Other Expenses - Taxi, Food, Courier, etc.)
  let totalRevenue = 0;
  let totalCash = 0;
  let totalCard = 0;
  let totalCredit = 0;
  let totalDebt = 0;
  let totalDeposit = 0;
  let totalExpense = 0;
  let totalSplit = 0;
  let totalDiscounts = 0;
  let totalItemsCount = 0;
  let totalCostPrice = 0;

  const productAggregationMap = new Map();
  const categoryAggregationMap = new Map();
  const hourlyAggregationMap = new Map();

  // Initialize hourly slots 00:00 - 23:00
  for (let h = 0; h < 24; h++) {
    const slotKey = `${String(h).padStart(2, '0')}:00`;
    hourlyAggregationMap.set(slotKey, { hour: slotKey, count: 0, revenue: 0 });
  }

  const transactionsList = [];

  validSalesList.forEach((sale, index) => {
    const saleAmount = Number(sale.total_amount || 0);
    const saleDiscount = Number(sale.discount_amount || 0);
    const paymentMethodRaw = String(sale.payment_method || 'cash').toLowerCase().trim();
    const notesRaw = String(sale.notes || '').toLowerCase();
    const saleDate = new Date(sale.created_at);

    totalRevenue += saleAmount;
    totalDiscounts += saleDiscount;

    // Categorize transaction into strictly one of 5 payment categories (or split amongst them)
    if (paymentMethodRaw === 'split' || notesRaw.includes('[qarışıq:')) {
      totalSplit += saleAmount;
      let sCash = Number(sale.split_cash || 0);
      let sCard = Number(sale.split_card || 0);
      let sCredit = Number(sale.split_credit || 0);
      let sDebt = Number(sale.split_debt || 0);
      let sDeposit = Number(sale.split_deposit || sale.split_beh || 0);

      if (sCash === 0 && sCard === 0 && sCredit === 0) {
        const splitMatch = notesRaw.match(/\[Qarışıq:\s*([^\]]+)\]/i);
        if (splitMatch) {
          const cashM = splitMatch[1].match(/Nağd:\s*₼?([0-9.,]+)/i);
          const cardM = splitMatch[1].match(/Kart:\s*₼?([0-9.,]+)/i);
          const termM = splitMatch[1].match(/Terminal:\s*₼?([0-9.,]+)/i);
          const credM = splitMatch[1].match(/Kredit:\s*₼?([0-9.,]+)/i);
          if (cashM) sCash = parseFloat(cashM[1].replace(',', '.'));
          if (cardM) sCard += parseFloat(cardM[1].replace(',', '.'));
          if (termM) sCard += parseFloat(termM[1].replace(',', '.'));
          if (credM) sCredit = parseFloat(credM[1].replace(',', '.'));
        }
      }

      const splitSum = sCash + sCard + sCredit + sDebt + sDeposit;
      if (splitSum === 0) {
        // Fallback: If split without details, allocate to cash
        totalCash += saleAmount;
      } else if (Math.abs(splitSum - saleAmount) > 0.001) {
        // Adjust precision difference into cash or card so total remains strictly balanced
        const diff = saleAmount - splitSum;
        if (sCard > 0 && sCash === 0) {
          sCard += diff;
        } else {
          sCash += diff;
        }
        totalCash += sCash;
        totalCard += sCard;
        totalCredit += sCredit;
        totalDebt += sDebt;
        totalDeposit += sDeposit;
      } else {
        totalCash += sCash;
        totalCard += sCard;
        totalCredit += sCredit;
        totalDebt += sDebt;
        totalDeposit += sDeposit;
      }
    } else if (
      paymentMethodRaw === 'deposit' || 
      paymentMethodRaw === 'beh' || 
      paymentMethodRaw === 'avans' || 
      paymentMethodRaw === 'advance' || 
      paymentMethodRaw === 'zalog' ||
      notesRaw.includes('beh') || 
      notesRaw.includes('avans') ||
      notesRaw.includes('zadatak')
    ) {
      totalDeposit += saleAmount;
    } else if (
      paymentMethodRaw === 'debt' || 
      paymentMethodRaw === 'nisyə' || 
      paymentMethodRaw === 'nisye' || 
      paymentMethodRaw === 'borc' || 
      notesRaw.includes('nisyə') || 
      notesRaw.includes('nisye') || 
      notesRaw.includes('borc') ||
      notesRaw.includes('realizasiya')
    ) {
      totalDebt += saleAmount;
    } else if (
      paymentMethodRaw === 'credit' || 
      paymentMethodRaw === 'kredit' || 
      paymentMethodRaw === 'installment' || 
      paymentMethodRaw === 'taksit' || 
      paymentMethodRaw === 'birmarket' || 
      paymentMethodRaw === 'birkart' || 
      paymentMethodRaw === 'tamkart' || 
      paymentMethodRaw === 'ferrum' || 
      notesRaw.includes('kredit') || 
      notesRaw.includes('taksit') || 
      notesRaw.includes('birmarket')
    ) {
      const downMatch = notesRaw.match(/\[İlkin ödəniş:\s*₼?([0-9.,]+)\s*\(([^)]+)\)\]/i);
      if (downMatch) {
        const dAmt = parseFloat(downMatch[1].replace(',', '.'));
        const dMethod = downMatch[2].toLowerCase();
        if (dAmt > 0) {
          if (dMethod.includes('card') || dMethod.includes('kart') || dMethod.includes('terminal')) {
            totalCard += dAmt;
          } else {
            totalCash += dAmt;
          }
          totalCredit += Math.max(0, saleAmount - dAmt);
        } else {
          totalCredit += saleAmount;
        }
      } else {
        totalCredit += saleAmount;
      }
    } else if (
      paymentMethodRaw === 'card' || 
      paymentMethodRaw === 'kart' || 
      paymentMethodRaw === 'pos' || 
      paymentMethodRaw === 'terminal' || 
      paymentMethodRaw === 'transfer' || 
      paymentMethodRaw === 'bank' || 
      notesRaw.includes('kart') || 
      notesRaw.includes('pos terminal') ||
      notesRaw.includes('köçürmə')
    ) {
      totalCard += saleAmount;
    } else if (
      paymentMethodRaw === 'expense' || 
      paymentMethodRaw === 'xərc' || 
      paymentMethodRaw === 'xerc' || 
      paymentMethodRaw === 'rasxod' || 
      notesRaw.includes('xərc') || 
      notesRaw.includes('xerc') || 
      notesRaw.includes('rasxod') ||
      notesRaw.includes('digər xərc')
    ) {
      totalExpense += saleAmount;
    } else {
      // Default: Nağd (Cash)
      totalCash += saleAmount;
    }

    // Hourly aggregation
    const hour = saleDate.getHours();
    const hourSlotKey = `${String(hour).padStart(2, '0')}:00`;
    const hourData = hourlyAggregationMap.get(hourSlotKey) || { hour: hourSlotKey, count: 0, revenue: 0 };
    hourData.count += 1;
    hourData.revenue += saleAmount;
    hourlyAggregationMap.set(hourSlotKey, hourData);

    // Process Sale Items (skipping any deleted items if flagged individually)
    const items = sale.retail_sale_items || [];
    let saleItemNames = [];
    let saleItemsQuantity = 0;

    items.forEach(item => {
      if (isCancelledOrDeleted(item)) return;

      const qty = Number(item.quantity || 1);
      const price = Number(item.price_at_sale || item.base_price || 0);
      const itemTotal = Number(item.total || qty * price);
      const itemDiscount = Number(item.discount_amount || 0);
      const productName = (item.product_name || 'Naməlum Məhsul').trim();

      totalItemsCount += qty;
      saleItemsQuantity += qty;
      saleItemNames.push(`${productName} (${qty})`);

      // Match product metadata with multiple fallback mechanisms
      let productMeta = null;
      if (item.product_id && productsMap.has(item.product_id)) {
        productMeta = productsMap.get(item.product_id);
      }
      
      const itemBarcode = item.barcode ? String(item.barcode).trim() : '';
      if (!productMeta && itemBarcode) {
        productMeta = productsMap.get(itemBarcode) || productsByBarcode.get(itemBarcode.toLowerCase());
      }

      if (!productMeta && productName) {
        const normItemName = productName.toLowerCase().replace(/\s+/g, ' ');
        productMeta = productsByName.get(normItemName);
      }

      productMeta = productMeta || {};

      const unit = productMeta.unit || item.unit || 'ədəd';
      const barcode = productMeta.barcode || itemBarcode || '-';
      
      // Cost calculation strictly protected by RBAC
      const costPrice = isAdmin ? Number(productMeta.purchase_price || item.cost_price || 0) : null;
      const categoryName = (productMeta.category_id && categoriesMap.get(productMeta.category_id))
        || item.category_name
        || item.category
        || 'Ümumi';

      if (isAdmin && costPrice != null) {
        totalCostPrice += (costPrice * qty);
      }

      // Aggregate Product Sales - group by matching product ID or clean name
      const prodKey = productMeta.id || item.product_id || productName;
      if (!productAggregationMap.has(prodKey)) {
        productAggregationMap.set(prodKey, {
          id: prodKey,
          name: productName,
          barcode: barcode,
          category: categoryName,
          quantity: 0,
          unit: unit,
          totalRevenue: 0,
          totalCost: isAdmin ? 0 : null,
          costPrice: isAdmin ? costPrice : null,
          profit: isAdmin ? 0 : null,
          totalDiscount: 0,
          avgPrice: price
        });
      }
      const pAgg = productAggregationMap.get(prodKey);
      pAgg.quantity += qty;
      pAgg.totalRevenue += itemTotal;
      if (isAdmin && costPrice != null) {
        pAgg.totalCost += (costPrice * qty);
        pAgg.profit = pAgg.totalRevenue - pAgg.totalCost;
        pAgg.costPrice = costPrice;
      }
      pAgg.totalDiscount += itemDiscount;
      pAgg.avgPrice = pAgg.quantity > 0 ? (pAgg.totalRevenue / pAgg.quantity) : price;

      // Ensure barcode and category get enriched if previously unknown
      if ((!pAgg.barcode || pAgg.barcode === '-') && barcode && barcode !== '-') {
        pAgg.barcode = barcode;
      }
      if ((!pAgg.category || pAgg.category === 'Ümumi') && categoryName && categoryName !== 'Ümumi') {
        pAgg.category = categoryName;
      }

      // Aggregate Category Sales
      if (!categoryAggregationMap.has(categoryName)) {
        categoryAggregationMap.set(categoryName, {
          name: categoryName,
          quantity: 0,
          totalRevenue: 0
        });
      }
      const cAgg = categoryAggregationMap.get(categoryName);
      cAgg.quantity += qty;
      cAgg.totalRevenue += itemTotal;
    });

    const dispatchMeta = dayDispatchesMap.get(sale.id);

    transactionsList.push({
      receiptNumber: `№${String(index + 1).padStart(4, '0')}`,
      id: sale.id,
      shortId: sale.id ? sale.id.substring(0, 8).toUpperCase() : `REC-${index + 1}`,
      time: formatTimeAz(sale.created_at),
      dateTime: formatDateTimeAz(sale.created_at),
      itemsCount: saleItemsQuantity,
      itemsSummary: saleItemNames.slice(0, 3).join(', ') + (saleItemNames.length > 3 ? ` və daha ${saleItemNames.length - 3}` : ''),
      paymentMethod: translatePaymentMethodAz(sale.payment_method),
      paymentMethodRaw: sale.payment_method,
      discount: saleDiscount,
      total: saleAmount,
      advanceAmount: dispatchMeta?.advanceAmount ?? null,
      advanceRecipient: dispatchMeta?.advanceRecipient ?? null,
      customerName: sale.customer_name || null,
      customerPhone: sale.customer_phone || null,
      sellerName: sale.seller_name || null,
      saleRef: (sale.notes || '').match(/#SALE-[0-9A-Za-z]+/)?.[0] || null,
      channel: (sale.notes || '').match(/\[Kanal:\s*([^\]]+)\]/)?.[1] || 'Mağaza',
      notes: sale.notes || '',
      splitDetails: {
        cash: Number(sale.split_cash || 0),
        card: Number(sale.split_card || 0),
        credit: Number(sale.split_credit || 0)
      },
      items: items.map(it => ({
        id: it.id,
        name: it.product_name || 'Məhsul',
        quantity: Number(it.quantity || 1),
        price: Number(it.price_at_sale || it.base_price || 0),
        basePrice: Number(it.base_price || it.price_at_sale || 0),
        discount: Number(it.discount_amount || 0),
        total: Number(it.total || (Number(it.quantity || 1) * Number(it.price_at_sale || 0))),
        unit: it.unit || 'ədəd',
        barcode: it.barcode || '-'
      }))
    });
  });

  // Strict Mathematical Check: Total Revenue === Cash + Card + Credit + Debt + Deposit + Expense
  const computedSum = totalCash + totalCard + totalCredit + totalDebt + totalDeposit + totalExpense;
  const balanceDiff = Number((totalRevenue - computedSum).toFixed(2));
  if (balanceDiff !== 0 && totalRevenue > 0) {
    totalCash = Number((totalCash + balanceDiff).toFixed(2));
  }

  // Compute Independent Audit for CANCELLED / DELETED Sales (does NOT affect revenue)
  let cancelledRevenue = 0;
  let cancelledDiscounts = 0;
  let cancelledItemsCount = 0;
  const cancelledTransactionsList = [];
  const cancelledProductMap = new Map();

  cancelledSalesList.forEach((sale, index) => {
    const saleAmount = Number(sale.total_amount || 0);
    const saleDiscount = Number(sale.discount_amount || 0);
    cancelledRevenue += saleAmount;
    cancelledDiscounts += saleDiscount;

    const items = sale.retail_sale_items || [];
    let saleItemNames = [];
    let saleItemsQuantity = 0;

    items.forEach(item => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.price_at_sale || item.base_price || 0);
      const itemTotal = Number(item.total || qty * price);
      const productName = (item.product_name || 'Naməlum Məhsul').trim();

      cancelledItemsCount += qty;
      saleItemsQuantity += qty;
      saleItemNames.push(`${productName} (${qty})`);

      const prodKey = item.product_id || productName;
      if (!cancelledProductMap.has(prodKey)) {
        cancelledProductMap.set(prodKey, {
          id: prodKey,
          name: productName,
          barcode: item.barcode || '-',
          quantity: 0,
          totalRevenue: 0,
          unit: item.unit || 'ədəd'
        });
      }
      const cProd = cancelledProductMap.get(prodKey);
      cProd.quantity += qty;
      cProd.totalRevenue += itemTotal;
    });

    cancelledTransactionsList.push({
      receiptNumber: `№L-${String(index + 1).padStart(4, '0')}`,
      id: sale.id,
      shortId: sale.id ? sale.id.substring(0, 8).toUpperCase() : `CAN-${index + 1}`,
      time: formatTimeAz(sale.created_at),
      dateTime: formatDateTimeAz(sale.created_at),
      itemsCount: saleItemsQuantity,
      itemsSummary: saleItemNames.slice(0, 3).join(', ') + (saleItemNames.length > 3 ? ` və daha ${saleItemNames.length - 3}` : ''),
      paymentMethod: translatePaymentMethodAz(sale.payment_method),
      paymentMethodRaw: sale.payment_method,
      discount: saleDiscount,
      total: saleAmount,
      status: sale.status || 'Ləğv edilib',
      items: items.map(it => ({
        name: it.product_name,
        quantity: it.quantity,
        price: it.price_at_sale || it.base_price,
        total: it.total
      }))
    });
  });

  const grossProfit = isAdmin ? (totalRevenue - totalCostPrice) : null;
  const marginPercent = isAdmin && totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : null;
  const receiptsCount = validSalesList.length;
  const averageTicket = receiptsCount > 0 ? (totalRevenue / receiptsCount) : 0;

  // Sorted product list (highest revenue first, or by quantity)
  const aggregatedProducts = Array.from(productAggregationMap.values()).sort((a, b) => b.quantity - a.quantity || b.totalRevenue - a.totalRevenue);

  // Category breakdown
  const aggregatedCategories = Array.from(categoryAggregationMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Hourly list filtered to hours that had activity
  const activeHours = Array.from(hourlyAggregationMap.values()).filter(h => h.count > 0);

  // Shift working interval (first valid sale to last valid sale)
  let shiftStartTime = '-';
  let shiftEndTime = '-';
  if (validSalesList.length > 0) {
    shiftStartTime = formatTimeAz(validSalesList[0].created_at);
    shiftEndTime = formatTimeAz(validSalesList[validSalesList.length - 1].created_at);
  } else if (cancelledSalesList.length > 0) {
    shiftStartTime = formatTimeAz(cancelledSalesList[0].created_at);
    shiftEndTime = formatTimeAz(cancelledSalesList[cancelledSalesList.length - 1].created_at);
  }

  return {
    dateStr,
    formattedDate: formatDateAz(startOfDay),
    shortDate: formatShortDateAz(startOfDay),
    generatedAt: formatDateTimeAz(new Date()),
    shiftStartTime,
    shiftEndTime,
    salesCount: receiptsCount,
    totalItemsCount: Number(totalItemsCount.toFixed(2)),
    totalRevenue: Number(totalRevenue.toFixed(2)),
    
    // Payment Categories (Airtight Mathematics: totalRevenue === cash + card + credit + debt + deposit + expense)
    totalCash: Number(totalCash.toFixed(2)),
    totalCard: Number(totalCard.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    totalDebt: Number(totalDebt.toFixed(2)),
    totalDeposit: Number(totalDeposit.toFixed(2)),
    totalExpense: Number((totalExpense > 0 ? totalExpense : (storeCashExpenses + storeBankExpenses)).toFixed(2)),
    totalSplit: Number(totalSplit.toFixed(2)),
    totalOther: Number((totalExpense > 0 ? totalExpense : (storeCashExpenses + storeBankExpenses)).toFixed(2)),
    totalDiscounts: Number(totalDiscounts.toFixed(2)),

    // Store Petty Cash Expenses & Net Cash Balance
    storeExpenses: storeExpensesList,
    storeCashExpenses: Number(storeCashExpenses.toFixed(2)),
    storeBankExpenses: Number(storeBankExpenses.toFixed(2)),
    netCashInHand: Number(Math.max(0, totalCash - storeCashExpenses).toFixed(2)),

    // Strict Security RBAC: null for non-admin roles (cashier, seller, manager)
    isAdmin,
    totalCostPrice: isAdmin ? Number(totalCostPrice.toFixed(2)) : null,
    grossProfit: isAdmin ? Number(grossProfit.toFixed(2)) : null,
    marginPercent: isAdmin ? Number(marginPercent.toFixed(1)) : null,
    averageTicket: Number(averageTicket.toFixed(2)),
    products: aggregatedProducts,
    categories: aggregatedCategories,
    activeHours,
    transactions: transactionsList,

    // Dedicated Independent Cancellation Audit Section (does NOT affect financial balance)
    cancelledCount: cancelledSalesList.length,
    cancelledRevenue: Number(cancelledRevenue.toFixed(2)),
    cancelledItemsCount: Number(cancelledItemsCount.toFixed(2)),
    cancelledDiscounts: Number(cancelledDiscounts.toFixed(2)),
    cancelledTransactions: cancelledTransactionsList,
    cancelledProducts: Array.from(cancelledProductMap.values()).sort((a, b) => b.quantity - a.quantity)
  };
};

/**
 * Generate A4 or Thermal Receipt HTML document for Printing or Save to PDF
 * Supports:
 * - options.mode: 'products_only' (Yalnız Məhsullar və Sayı - qiymətsiz)
 * - options.mode: 'detailed' (Tam Ətraflı Maliyyə Hesabatı)
 */
export const generateDailySalesReportHTML = (data, businessInfo = {}, format = 'a4', options = {}) => {
  const mergedOptions = { ...DEFAULT_REPORT_OPTIONS, ...options };
  const isProductsOnly = mergedOptions.mode === 'products_only' || mergedOptions.showPrices === false;

  const companyName = businessInfo.businessName || businessInfo.company_name || 'Mərkəz CRM Satış Məntəqəsi';
  const voen = businessInfo.voen ? `VÖEN: ${businessInfo.voen}` : '';
  const address = businessInfo.address || '';
  const phone = businessInfo.phone ? `Tel: ${businessInfo.phone}` : '';
  const cashierName = businessInfo.cashierName || businessInfo.full_name || 'Kassir / Məsul Şəxs';

  if (format === 'thermal') {
    // ==========================================
    // 80mm POS Thermal Receipt Format
    // ==========================================
    if (isProductsOnly) {
      // Products Only (Thermal 80mm) - No Prices
      return `
        <!DOCTYPE html>
        <html lang="az">
        <head>
          <meta charset="utf-8">
          <title>Satilan_Mehsullar_${data.shortDate}</title>
          <style>
            @page { size: 80mm auto; margin: 4mm 3mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Courier New', Courier, monospace, 'Segoe UI', Arial, sans-serif;
              font-size: 11px;
              color: #000;
              background: #fff;
              width: 74mm;
              margin: 0 auto;
              line-height: 1.35;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .header { margin-bottom: 6px; }
            .title { font-size: 13px; font-weight: bold; margin: 4px 0; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px solid #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            table { width: 100%; border-collapse: collapse; margin: 4px 0; }
            th, td { padding: 3px 0; font-size: 10.5px; }
            th { text-align: left; border-bottom: 1px solid #000; }
            .footer { margin-top: 10px; text-align: center; font-size: 9px; }
            .sig-box { margin-top: 14px; font-size: 10px; }
            @media print { body { width: 100%; margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header text-center">
            <div class="bold" style="font-size: 13px;">${companyName.toUpperCase()}</div>
            ${voen ? `<div>${voen}</div>` : ''}
            <div class="divider"></div>
            <div class="title">SATILAN MƏHSULLARIN SİYAHISI</div>
            <div style="font-size: 10px; font-style: italic;">(Anbar və sayım üçün - Qiymətsiz)</div>
            <div>TARİX: ${data.formattedDate}</div>
            <div>DÖVR: ${data.shiftStartTime} - ${data.shiftEndTime}</div>
            <div>KASSİR: ${cashierName}</div>
          </div>

          <div class="divider"></div>
          <div class="row bold">
            <span>CƏMİ ÇEŞİD SAYI:</span>
            <span>${data.products.length} çeşid</span>
          </div>
          <div class="row bold">
            <span>CƏMİ SATILMIŞ MİQDAR:</span>
            <span>${data.totalItemsCount} ədəd</span>
          </div>
          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th style="width: 15%;">№</th>
                <th style="width: 60%;">Məhsulun Adı</th>
                <th class="text-right" style="width: 25%;">Miqdar</th>
              </tr>
            </thead>
            <tbody>
              ${data.products.map((p, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="word-break: break-all;">
                    <span class="bold">${p.name}</span>
                    ${p.barcode && p.barcode !== '-' ? `<br><span style="font-size: 9px; color: #555;">[${p.barcode}]</span>` : ''}
                  </td>
                  <td class="text-right bold" style="font-size: 11px;">${p.quantity} ${p.unit || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="double-divider"></div>
          <div class="sig-box">
            <div style="margin-bottom: 16px;">Təhvil verdi (Kassir): ______________</div>
            <div>Təhvil aldı (Anbardar): ______________</div>
          </div>

          <div class="footer">
            <div class="divider"></div>
            <div>MƏRKƏZ CRM • ${data.generatedAt}</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `;
    }

    // Full Detailed (Thermal 80mm)
    return `
      <!DOCTYPE html>
      <html lang="az">
      <head>
        <meta charset="utf-8">
        <title>Z-Hesabat_${data.shortDate}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm 3mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Courier New', Courier, monospace, 'Segoe UI', Arial, sans-serif;
            font-size: 11px;
            color: #000;
            background: #fff;
            width: 74mm;
            margin: 0 auto;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .header { margin-bottom: 6px; }
          .title { font-size: 14px; font-weight: bold; margin: 4px 0; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .row-main { font-size: 12px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 4px 0; }
          th, td { padding: 2px 0; font-size: 10px; }
          th { text-align: left; border-bottom: 1px solid #000; }
          .footer { margin-top: 8px; text-align: center; font-size: 9px; }
          .signature-box { margin-top: 10px; padding-top: 5px; font-size: 10px; }
          @media print { body { width: 100%; margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <div class="bold" style="font-size: 13px;">${companyName.toUpperCase()}</div>
          ${voen ? `<div>${voen}</div>` : ''}
          ${address ? `<div>${address}</div>` : ''}
          ${phone ? `<div>${phone}</div>` : ''}
          <div class="divider"></div>
          <div class="title">GÜN SONU Z-HESABAT</div>
          <div>TARİX: ${data.formattedDate}</div>
          <div>DÖVR: ${data.shiftStartTime} - ${data.shiftEndTime}</div>
          <div>ÇAP EDİLDİ: ${data.generatedAt}</div>
          <div>KASSİR: ${cashierName}</div>
        </div>

        <div class="divider"></div>
        <div class="row row-main">
          <span>ÜMUMİ DÖVRİYYƏ:</span>
          <span>${data.totalRevenue.toFixed(2)} AZN</span>
        </div>
        <div class="divider"></div>

        <div class="row">
          <span>Nağd (Kassa):</span>
          <span class="bold">${data.totalCash.toFixed(2)} AZN</span>
        </div>
        <div class="row">
          <span>Kart / Terminal:</span>
          <span class="bold">${data.totalCard.toFixed(2)} AZN</span>
        </div>
        ${data.totalCredit > 0 ? `
        <div class="row">
          <span>Kredit:</span>
          <span class="bold">${data.totalCredit.toFixed(2)} AZN</span>
        </div>
        ` : ''}
        ${data.totalDebt > 0 ? `
        <div class="row">
          <span>Nisyə (Borc):</span>
          <span class="bold">${data.totalDebt.toFixed(2)} AZN</span>
        </div>
        ` : ''}
        ${data.totalDeposit > 0 ? `
        <div class="row">
          <span>Beh (Avans):</span>
          <span class="bold">${data.totalDeposit.toFixed(2)} AZN</span>
        </div>
        ` : ''}
        ${data.totalExpense > 0 ? `
        <div class="row">
          <span>Digər xərclər (Taksi, Yemək və s.):</span>
          <span class="bold">${data.totalExpense.toFixed(2)} AZN</span>
        </div>
        ` : ''}
        ${data.totalDiscounts > 0 ? `
        <div class="row">
          <span>Verilən Endirim:</span>
          <span>-${data.totalDiscounts.toFixed(2)} AZN</span>
        </div>
        ` : ''}
        <div class="row">
          <span>Çek Sayı:</span>
          <span>${data.salesCount} ədəd</span>
        </div>
        <div class="row">
          <span>Satılan Mal Sayı:</span>
          <span>${data.totalItemsCount} ədəd</span>
        </div>
        <div class="row">
          <span>Orta Çek:</span>
          <span>${data.averageTicket.toFixed(2)} AZN</span>
        </div>

        <div class="divider"></div>
        <div class="bold text-center" style="margin-bottom: 3px;">SATILAN MƏHSULLAR</div>
        <table>
          <thead>
            <tr>
              <th style="width: 50%;">Məhsul</th>
              <th class="text-center" style="width: 20%;">Say</th>
              <th class="text-right" style="width: 30%;">Məbləğ</th>
            </tr>
          </thead>
          <tbody>
            ${data.products.map(p => `
              <tr>
                <td style="word-break: break-all;">${p.name}</td>
                <td class="text-center">${p.quantity}</td>
                <td class="text-right">${p.totalRevenue.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${data.cancelledCount > 0 ? `
        <div class="divider"></div>
        <div class="bold text-center" style="margin-bottom: 3px; font-size: 11px;">LƏĞV EDİLMİŞ ÇEKLƏR (AUDİT)</div>
        <div class="row">
          <span>Ləğv Çek Sayı:</span>
          <span class="bold">${data.cancelledCount} ədəd</span>
        </div>
        <div class="row">
          <span>Ləğv Malların Sayı:</span>
          <span>${data.cancelledItemsCount} ədəd</span>
        </div>
        <div class="row">
          <span>Ləğv Edilən Məbləğ:</span>
          <span class="bold">${data.cancelledRevenue.toFixed(2)} AZN</span>
        </div>
        <div style="font-size: 8.5px; color: #444; text-align: center; margin-top: 2px; font-style: italic;">
          * Bu məbləğ kassa dövriyyəsindən tamamilə çıxarılıb
        </div>
        ` : ''}

        <div class="double-divider"></div>
        <div class="signature-box">
          <div style="margin-bottom: 14px;">Kassanı təhvil verdi: ________________</div>
          <div>Kassanı qəbul etdi: ________________</div>
        </div>

        <div class="footer">
          <div class="divider"></div>
          <div>MƏRKƏZ CRM SİSTEMİ İLƏ HAZIRLANIB</div>
          <div>${data.generatedAt}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;
  }

  // ==========================================
  // A4 Standard Formal Accounting Report Format
  // ==========================================

  if (isProductsOnly) {
    // -------------------------------------------------------------
    // VARIANT 1: PRODUCTS ONLY (A4) - NO PRICES, QUANTITY ONLY
    // -------------------------------------------------------------
    return `
      <!DOCTYPE html>
      <html lang="az">
      <head>
        <meta charset="utf-8">
        <title>Gunluk_Satilan_Mehsullar_${data.shortDate}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
            font-size: 11px;
            color: #1f2937;
            background: #fff;
            line-height: 1.45;
            padding: 0;
          }
          .container { max-width: 100%; margin: 0 auto; }
          .header-table {
            width: 100%;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .logo-box {
            font-size: 20px;
            font-weight: 900;
            color: #0369a1;
            letter-spacing: -0.5px;
          }
          .logo-box span { color: #0284c7; }
          .company-name { font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px; }
          .company-info { font-size: 10px; color: #6b7280; margin-top: 2px; }
          .report-badge { text-align: right; }
          .badge-title {
            font-size: 16px;
            font-weight: 900;
            color: #0369a1;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge-sub { font-size: 10px; color: #64748b; font-weight: 600; margin-top: 1px; }
          .badge-date { font-size: 12px; font-weight: 700; color: #374151; margin-top: 4px; }
          .badge-time { font-size: 10px; color: #6b7280; }
          
          /* Summary Banner */
          .summary-banner {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 18px;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 10px;
            padding: 12px 16px;
          }
          .banner-item { display: flex; flex-direction: column; }
          .banner-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0369a1; }
          .banner-value { font-size: 17px; font-weight: 900; color: #0c4a6e; margin-top: 2px; }
          .banner-sub { font-size: 9px; color: #0284c7; margin-top: 1px; }

          /* Tables */
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          table.data-table th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 800;
            font-size: 9.5px;
            text-transform: uppercase;
            text-align: left;
            padding: 7px 10px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1.5px solid #94a3b8;
          }
          table.data-table td {
            padding: 6px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 10.5px;
            color: #1e293b;
          }
          table.data-table tr:nth-child(even) td { background-color: #f8fafc; }
          table.data-table tfoot td {
            font-weight: 800;
            background: #f1f5f9;
            border-top: 1.5px solid #94a3b8;
            border-bottom: 1.5px solid #94a3b8;
            padding: 8px 10px;
          }
          .text-right { text-align: right !important; }
          .text-center { text-align: center !important; }
          .bold { font-weight: 700; }
          .check-box {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 1.5px solid #64748b;
            border-radius: 3px;
          }

          /* Signatures Block */
          .signatures-container {
            margin-top: 30px;
            padding-top: 16px;
            border-top: 1.5px dashed #cbd5e1;
            page-break-inside: avoid;
          }
          .signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .sig-item { font-size: 10.5px; color: #334155; }
          .sig-line {
            border-bottom: 1px solid #64748b;
            height: 28px;
            margin-top: 6px;
            margin-bottom: 6px;
          }

          .report-footer {
            margin-top: 24px;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 8px;
          }

          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-break { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <table class="header-table">
            <tr>
              <td style="vertical-align: top; width: 55%;">
                <div class="logo-box">MƏRKƏZ <span>CRM</span></div>
                <div class="company-name">${companyName}</div>
                <div class="company-info">
                  ${voen ? `${voen} • ` : ''}${address || 'Baş Filial'} ${phone ? ` • ${phone}` : ''}
                </div>
              </td>
              <td class="report-badge" style="vertical-align: top; width: 45%;">
                <div class="badge-title">GÜNLÜK SATILAN MƏHSULLARIN SİYAHISI</div>
                <div class="badge-sub">Anbar sayımı, təhvil-təslim və çeşid yoxlaması üçün (Qiymətsiz)</div>
                <div class="badge-date">Tarix: ${data.formattedDate}</div>
                <div class="badge-time">İş saatı: ${data.shiftStartTime} - ${data.shiftEndTime}</div>
                <div class="badge-time">Çap tarixi: ${data.generatedAt}</div>
              </td>
            </tr>
          </table>

          <!-- Summary Banner (No Prices) -->
          <div class="summary-banner">
            <div class="banner-item">
              <span class="banner-label">Cəmi Satılan Çeşid</span>
              <span class="banner-value">${data.products.length} çeşid</span>
              <span class="banner-sub">Fərqli məhsul pozisiyası</span>
            </div>
            <div class="banner-item">
              <span class="banner-label">Cəmi Satılmış Miqdar</span>
              <span class="banner-value">${data.totalItemsCount} ədəd</span>
              <span class="banner-sub">Günün ümumi fiziki çıxarışı</span>
            </div>
            <div class="banner-item">
              <span class="banner-label">Məsul Şəxs / Kassir</span>
              <span class="banner-value" style="font-size: 14px;">${cashierName}</span>
              <span class="banner-sub">Kassanı təhvil verən şəxs</span>
            </div>
          </div>

          <!-- Products Table -->
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;" class="text-center">№</th>
                <th style="width: 45%;">Məhsulun Adı</th>
                ${mergedOptions.showBarcodes !== false ? '<th style="width: 18%;">Barkod</th>' : ''}
                ${mergedOptions.showCategories !== false ? '<th style="width: 17%;">Kateqoriya</th>' : ''}
                <th class="text-center" style="width: 15%;">Satılan Miqdar</th>
                ${mergedOptions.showNotesColumn !== false ? '<th class="text-center" style="width: 10%;">Sayım [✓]</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${data.products.length === 0 ? `
                <tr>
                  <td colspan="6" class="text-center" style="padding: 24px; color: #94a3b8;">
                    Seçilmiş gün üçün heç bir satış qeydə alınmayıb.
                  </td>
                </tr>
              ` : data.products.map((p, idx) => `
                <tr>
                  <td class="text-center" style="color: #64748b; font-weight: 700;">${idx + 1}</td>
                  <td class="bold" style="font-size: 11px;">${p.name}</td>
                  ${mergedOptions.showBarcodes !== false ? `<td style="color: #64748b; font-family: monospace;">${p.barcode || '-'}</td>` : ''}
                  ${mergedOptions.showCategories !== false ? `<td><span style="background: #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 600;">${p.category || '-'}</span></td>` : ''}
                  <td class="text-center bold" style="font-size: 12px; color: #0f172a;">
                    ${p.quantity} <span style="font-size: 9.5px; font-weight: normal; color: #64748b;">${p.unit || ''}</span>
                  </td>
                  ${mergedOptions.showNotesColumn !== false ? '<td class="text-center"><span class="check-box"></span></td>' : ''}
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="${(mergedOptions.showBarcodes !== false ? 1 : 0) + (mergedOptions.showCategories !== false ? 1 : 0) + 2}" class="bold">
                  YEKUN CƏMİ MİQDAR:
                </td>
                <td class="text-center bold" style="font-size: 13px; color: #0284c7;">
                  ${data.totalItemsCount}
                </td>
                ${mergedOptions.showNotesColumn !== false ? '<td></td>' : ''}
              </tr>
            </tfoot>
          </table>

          <!-- Signatures -->
          ${mergedOptions.showSignatures !== false ? `
          <div class="signatures-container no-break">
            <div class="signatures-grid">
              <div class="sig-item">
                <div><strong>Məhsulları Təhvil Verdi (Kassir):</strong></div>
                <div class="sig-line"></div>
                <div>${cashierName} (İmza və Tarix: ${data.shortDate})</div>
              </div>
              <div class="sig-item">
                <div><strong>Məhsulları Təhvil Aldı (Anbardar / Nəzarətçi):</strong></div>
                <div class="sig-line"></div>
                <div>Ad, Soyad: ___________________________ (İmza)</div>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Footer -->
          <div class="report-footer">
            Mərkəz CRM • Günlük Satılan Məhsullar Siyahısı • ${data.generatedAt} • Səhifə 1
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;
  }

  // -------------------------------------------------------------
  // VARIANT 2: DETAILED REPORT (A4) - COMPLETE FINANCIAL & PRODUCT BREAKDOWN
  // -------------------------------------------------------------
  return `
    <!DOCTYPE html>
    <html lang="az">
    <head>
      <meta charset="utf-8">
      <title>Gün_Sonu_Satış_Hesabatı_${data.shortDate}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 14mm 12mm 14mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
          font-size: 11px;
          color: #1f2937;
          background: #fff;
          line-height: 1.45;
          padding: 0;
        }
        .container { max-width: 100%; margin: 0 auto; }
        .header-table {
          width: 100%;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .logo-box {
          font-size: 20px;
          font-weight: 900;
          color: #1e3a8a;
          letter-spacing: -0.5px;
        }
        .logo-box span { color: #2563eb; }
        .company-name { font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px; }
        .company-info { font-size: 10px; color: #6b7280; margin-top: 2px; }
        .report-badge { text-align: right; }
        .badge-title {
          font-size: 16px;
          font-weight: 900;
          color: #1e3a8a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .badge-date { font-size: 12px; font-weight: 700; color: #374151; margin-top: 3px; }
        .badge-time { font-size: 10px; color: #6b7280; }
        
        /* KPI Cards Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }
        .kpi-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px 12px;
          background: #f9fafb;
        }
        .kpi-card.highlight { background: #eff6ff; border-color: #bfdbfe; }
        .kpi-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 700;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .kpi-card.highlight .kpi-label { color: #1d4ed8; }
        .kpi-value { font-size: 16px; font-weight: 900; color: #111827; }
        .kpi-card.highlight .kpi-value { color: #1e40af; }
        .kpi-sub { font-size: 9px; color: #9ca3af; margin-top: 2px; }

        /* Section Titles */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          color: #1f2937;
          border-bottom: 1.5px solid #e5e7eb;
          padding-bottom: 4px;
          margin-top: 16px;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        /* Tables */
        table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        table.data-table th {
          background: #f3f4f6;
          color: #374151;
          font-weight: 700;
          font-size: 9.5px;
          text-transform: uppercase;
          text-align: left;
          padding: 6px 8px;
          border-top: 1px solid #e5e7eb;
          border-bottom: 1.5px solid #d1d5db;
        }
        table.data-table td {
          padding: 5px 8px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 10px;
          color: #1f2937;
        }
        table.data-table tr:nth-child(even) td { background-color: #fafafa; }
        table.data-table tfoot td {
          font-weight: 800;
          background: #f9fafb;
          border-top: 1.5px solid #d1d5db;
          border-bottom: 1.5px solid #d1d5db;
        }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        .bold { font-weight: 700; }

        /* Payment Breakdown Box */
        .payment-box { display: flex; gap: 10px; margin-bottom: 14px; }
        .payment-item {
          flex: 1;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 8px 10px;
          background: #ffffff;
        }
        .payment-item-title { font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
        .payment-item-val { font-size: 13px; font-weight: 800; color: #111827; margin-top: 2px; }

        /* Signatures Block */
        .signatures-container {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1.5px dashed #d1d5db;
          page-break-inside: avoid;
        }
        .signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
        }
        .sig-item { font-size: 10px; color: #4b5563; }
        .sig-line {
          border-bottom: 1px solid #9ca3af;
          height: 24px;
          margin-top: 4px;
          margin-bottom: 4px;
        }

        .report-footer {
          margin-top: 20px;
          text-align: center;
          font-size: 9px;
          color: #9ca3af;
          border-top: 1px solid #f3f4f6;
          padding-top: 8px;
        }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-break { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <table class="header-table">
          <tr>
            <td style="vertical-align: top; width: 60%;">
              <div class="logo-box">MƏRKƏZ <span>CRM</span></div>
              <div class="company-name">${companyName}</div>
              <div class="company-info">
                ${voen ? `${voen} • ` : ''}${address || 'Baş Filial'} ${phone ? ` • ${phone}` : ''}
              </div>
            </td>
            <td class="report-badge" style="vertical-align: top; width: 40%;">
              <div class="badge-title">GÜN SONU SATIŞ HESABATI</div>
              <div class="badge-date">Tarix: ${data.formattedDate}</div>
              <div class="badge-time">İş saatı: ${data.shiftStartTime} - ${data.shiftEndTime}</div>
              <div class="badge-time">Çap tarixi: ${data.generatedAt}</div>
            </td>
          </tr>
        </table>

        <!-- KPI Summary Cards -->
        ${mergedOptions.showFinancialSummary !== false ? `
        <div class="kpi-grid">
          <div class="kpi-card highlight">
            <div class="kpi-label">Cəmi Dövriyyə</div>
            <div class="kpi-value">${data.totalRevenue.toFixed(2)} AZN</div>
            <div class="kpi-sub">Ümumi günün satışı</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Nağd Kassa</div>
            <div class="kpi-value">${data.totalCash.toFixed(2)} AZN</div>
            <div class="kpi-sub">Nağd ödənişlər</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Kart / Terminal</div>
            <div class="kpi-value">${data.totalCard.toFixed(2)} AZN</div>
            <div class="kpi-sub">Kart və POS Terminal</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Çek / Əməliyyat Sayı</div>
            <div class="kpi-value">${data.salesCount} ədəd</div>
            <div class="kpi-sub">Orta çek: ${data.averageTicket.toFixed(2)} AZN</div>
          </div>
        </div>
        ` : ''}

        <!-- Payment Breakdown Details -->
        ${mergedOptions.showPaymentBreakdown !== false ? `
        <div class="payment-box">
          <div class="payment-item">
            <div class="payment-item-title">Nağd Satış</div>
            <div class="payment-item-val">${data.totalCash.toFixed(2)} AZN</div>
          </div>
          <div class="payment-item">
            <div class="payment-item-title">Kart / Terminal</div>
            <div class="payment-item-val">${data.totalCard.toFixed(2)} AZN</div>
          </div>
          <div class="payment-item">
            <div class="payment-item-title">Kredit</div>
            <div class="payment-item-val">${data.totalCredit.toFixed(2)} AZN</div>
          </div>
          <div class="payment-item">
            <div class="payment-item-title">Nisyə (Borc)</div>
            <div class="payment-item-val">${data.totalDebt.toFixed(2)} AZN</div>
          </div>
          <div class="payment-item">
            <div class="payment-item-title">Beh (Avans)</div>
            <div class="payment-item-val">${data.totalDeposit.toFixed(2)} AZN</div>
          </div>
          ${data.totalExpense > 0 ? `
          <div class="payment-item">
            <div class="payment-item-title">Digər xərclər</div>
            <div class="payment-item-val" style="color: #ea580c;">${data.totalExpense.toFixed(2)} AZN</div>
          </div>
          ` : ''}
          ${data.totalDiscounts > 0 ? `
          <div class="payment-item">
            <div class="payment-item-title">Endirimlər</div>
            <div class="payment-item-val" style="color: #dc2626;">-${data.totalDiscounts.toFixed(2)} AZN</div>
          </div>
          ` : ''}
          ${(data.isAdmin !== false && mergedOptions.showProfit !== false && data.totalCostPrice != null) ? `
          <div class="payment-item">
            <div class="payment-item-title">Xalis Mənfəət</div>
            <div class="payment-item-val" style="color: #059669;">${data.grossProfit.toFixed(2)} AZN (${data.marginPercent}%)</div>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- Sold Products Table -->
        <div class="section-header">
          <span>Satılan Məhsulların Xülasəsi (${data.products.length} çeşid)</span>
          <span style="font-size: 10px; font-weight: normal; color: #6b7280;">Cəmi: ${data.totalItemsCount} ədəd</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 5%;">№</th>
              <th style="width: 35%;">Məhsulun Adı</th>
              <th style="width: 15%;">Barkod</th>
              <th style="width: 15%;">Kateqoriya</th>
              <th class="text-center" style="width: 10%;">Miqdar</th>
              <th class="text-right" style="width: 10%;">Orta Qiymət</th>
              <th class="text-right" style="width: 10%;">Cəmi Məbləğ</th>
            </tr>
          </thead>
          <tbody>
            ${data.products.length === 0 ? `
              <tr>
                <td colspan="7" class="text-center" style="padding: 16px; color: #9ca3af;">
                  Seçilmiş gün üçün heç bir satış qeydə alınmayıb.
                </td>
              </tr>
            ` : data.products.map((p, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td class="bold">${p.name}</td>
                <td style="color: #6b7280;">${p.barcode || '-'}</td>
                <td>${p.category || '-'}</td>
                <td class="text-center bold">${p.quantity} ${p.unit || ''}</td>
                <td class="text-right">${p.avgPrice.toFixed(2)} AZN</td>
                <td class="text-right bold">${p.totalRevenue.toFixed(2)} AZN</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="bold">YEKUN CƏMİ:</td>
              <td class="text-center bold">${data.totalItemsCount}</td>
              <td></td>
              <td class="text-right bold" style="font-size: 11px; color: #1e40af;">${data.totalRevenue.toFixed(2)} AZN</td>
            </tr>
          </tfoot>
        </table>

        <!-- Receipts Register Table -->
        ${mergedOptions.showReceipts !== false ? `
        <div class="section-header" style="margin-top: 18px;">
          <span>Günün Əməliyyatları və Çeklərin Reyestri (${data.transactions.length} çek)</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 8%;">Çek №</th>
              <th style="width: 10%;">Saat</th>
              <th style="width: 42%;">Məhsullar</th>
              <th style="width: 15%;">Ödəniş Üsulu</th>
              <th class="text-center" style="width: 10%;">Say</th>
              <th class="text-right" style="width: 15%;">Yekun Məbləğ</th>
            </tr>
          </thead>
          <tbody>
            ${data.transactions.length === 0 ? `
              <tr>
                <td colspan="6" class="text-center" style="padding: 12px; color: #9ca3af;">
                  Çek tapılmadı.
                </td>
              </tr>
            ` : data.transactions.map(t => `
              <tr>
                <td class="bold text-center">${t.receiptNumber}</td>
                <td style="color: #4b5563;">${t.time}</td>
                <td style="color: #374151; font-size: 9.5px;">${t.itemsSummary || '-'}</td>
                <td>
                  <span style="font-weight: 600;">${t.paymentMethod}</span>
                  ${t.advanceAmount ? `<div style="font-size: 8.5px; color: #b45309; margin-top: 1px; font-weight: 600;">Avans: ₼${Number(t.advanceAmount).toFixed(2)}${t.advanceRecipient ? ` (${t.advanceRecipient})` : ''}</div>` : ''}
                </td>
                <td class="text-center">${t.itemsCount}</td>
                <td class="text-right bold">${t.total.toFixed(2)} AZN</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="bold">BÜTÜN ÇEKLƏR ÜZRƏ CƏMİ:</td>
              <td class="text-center bold">${data.transactions.length}</td>
              <td class="text-right bold" style="font-size: 11px; color: #1e40af;">${data.totalRevenue.toFixed(2)} AZN</td>
            </tr>
          </tfoot>
        </table>
        ` : ''}

        <!-- Cancelled Transactions Independent Audit Section (Does NOT affect shift balance) -->
        ${data.cancelledCount > 0 ? `
        <div class="section-header" style="color: #991b1b; border-bottom: 2px solid #f87171; margin-top: 20px;">
          <span>Ləğv Edilmiş / Silinmiş Əməliyyatlar (Müstəqil Audit Bölməsi — ${data.cancelledCount} çek)</span>
          <span style="font-size: 10px; font-weight: normal; color: #b91c1c;">Ümumi dövriyyəyə daxil deyil • Cəmi: ${data.cancelledRevenue.toFixed(2)} AZN (${data.cancelledItemsCount} məhsul)</span>
        </div>
        <table class="data-table" style="border: 1px solid #fee2e2; margin-bottom: 12px;">
          <thead>
            <tr style="background: #fef2f2;">
              <th style="width: 8%; color: #991b1b;">Çek №</th>
              <th style="width: 10%; color: #991b1b;">Saat</th>
              <th style="width: 42%; color: #991b1b;">Ləğv Edilmiş Məhsullar</th>
              <th style="width: 15%; color: #991b1b;">Ödəniş Üsulu</th>
              <th class="text-center" style="width: 10%; color: #991b1b;">Say</th>
              <th class="text-right" style="width: 15%; color: #991b1b;">Ləğv Məbləği</th>
            </tr>
          </thead>
          <tbody>
            ${data.cancelledTransactions.map(t => `
              <tr style="background: #fffafa;">
                <td class="bold text-center" style="color: #b91c1c;">${t.receiptNumber}</td>
                <td style="color: #64748b;">${t.time}</td>
                <td style="color: #334155; font-size: 9.5px;">${t.itemsSummary || '-'}</td>
                <td style="color: #64748b;">${t.paymentMethod}</td>
                <td class="text-center bold" style="color: #b91c1c;">${t.itemsCount}</td>
                <td class="text-right bold" style="color: #b91c1c;">${t.total.toFixed(2)} AZN</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #fef2f2;">
              <td colspan="4" class="bold" style="color: #991b1b;">CƏMİ LƏĞV EDİLMİŞ ƏMƏLİYYATLAR:</td>
              <td class="text-center bold" style="color: #991b1b;">${data.cancelledItemsCount}</td>
              <td class="text-right bold" style="color: #b91c1c;">${data.cancelledRevenue.toFixed(2)} AZN</td>
            </tr>
          </tfoot>
        </table>
        <div style="font-size: 9.5px; color: #991b1b; background: #fff1f2; border: 1px solid #fecdd3; padding: 6px 10px; border-radius: 6px; margin-bottom: 16px;">
          <strong>Audit Qeydi:</strong> Yuxarıdakı ${data.cancelledCount} əməliyyat kassa və ya anbar arxivindən ləğv edilmiş / silinmişdir. Bu məbləğ kassanın ümumi dövriyyəsinə və yekun maliyyə balansına <strong>qətiyyən təsir etmir</strong>.
        </div>
        ` : ''}

        <!-- Signatures & Verification -->
        ${mergedOptions.showSignatures !== false ? `
        <div class="signatures-container no-break">
          <div class="signatures-grid">
            <div class="sig-item">
              <div><strong>Kassanı Təhvil Verdi (Kassir):</strong></div>
              <div class="sig-line"></div>
              <div>${cashierName} (İmza)</div>
            </div>
            <div class="sig-item">
              <div><strong>Təhvil Aldı (Baş Kassir / Menecer):</strong></div>
              <div class="sig-line"></div>
              <div>Ad, Soyad (İmza)</div>
            </div>
            <div class="sig-item">
              <div><strong>Təsdiq Etdi (Rəhbərlik):</strong></div>
              <div class="sig-line"></div>
              <div>M.Y. (Tarix: ${data.shortDate})</div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="report-footer">
          Bu sənəd Mərkəz CRM sistemi tərəfindən avtomatik formalaşdırılmışdır • ${data.generatedAt} • Səhifə 1
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `;
};

/**
 * Trigger Native Browser Print Dialog (Save to PDF / Print)
 */
export const printDailySalesReport = (data, businessInfo = {}, format = 'a4', options = {}) => {
  const htmlContent = generateDailySalesReportHTML(data, businessInfo, format, options);
  
  // Use a hidden iframe or new popup window for clean isolated print
  const printWindow = window.open('', '_blank', 'width=900,height=750,menubar=no,toolbar=no,location=no,status=no');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    // Fallback using invisible iframe if popup blocker is active
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 2000);
      }, 300);
    }
  }
};

/**
 * Generate and direct-download a structured .pdf file using jsPDF
 * Respects options.mode ('products_only' vs 'detailed')
 */
export const downloadDailySalesReportPDF = async (data, businessInfo = {}, options = {}) => {
  const mergedOptions = { ...DEFAULT_REPORT_OPTIONS, ...options };
  const isProductsOnly = mergedOptions.mode === 'products_only' || mergedOptions.showPrices === false;

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Register Unicode Font for Azerbaijani characters
    doc.addFileToVFS('Roboto-Regular.ttf', robotoAzFont);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'bold');
    doc.setFont('Roboto', 'normal');

    const companyName = businessInfo.businessName || businessInfo.company_name || 'Mərkəz CRM Satış Məntəqəsi';
    const voen = businessInfo.voen ? `VÖEN: ${businessInfo.voen}` : '';
    const address = businessInfo.address || '';
    const cashierName = businessInfo.cashierName || businessInfo.full_name || 'Kassir / Məsul Şəxs';

    if (isProductsOnly) {
      // ==========================================
      // VARIANT 1: PRODUCTS ONLY PDF (No Prices)
      // ==========================================
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(3, 105, 161); // Sky 700
      doc.text('MƏRKƏZ CRM', 14, 18);

      doc.setFontSize(10);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(17, 24, 39);
      doc.text(String(companyName), 14, 25);

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text(`${voen ? voen + ' | ' : ''}${address || 'Əsas Satış Məntəqəsi'}`, 14, 30);

      // Right-aligned report header
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(3, 105, 161);
      doc.text('GÜNLÜK SATILAN MƏHSULLARIN SİYAHISI', 196, 17, { align: 'right' });

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Anbar sayımı və təhvil-təslim üçün (Qiymətsiz)', 196, 22, { align: 'right' });

      doc.setFontSize(8.5);
      doc.setTextColor(55, 65, 81);
      doc.text(`Tarix: ${data.formattedDate}`, 196, 27, { align: 'right' });
      doc.text(`İş saatı: ${data.shiftStartTime} - ${data.shiftEndTime}`, 196, 32, { align: 'right' });
      doc.text(`Çap tarixi: ${data.generatedAt}`, 196, 37, { align: 'right' });

      // Line
      doc.setDrawColor(2, 132, 199);
      doc.setLineWidth(0.8);
      doc.line(14, 41, 196, 41);

      // Summary Ribbon (Count only)
      doc.setDrawColor(186, 230, 253);
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(14, 45, 182, 20, 2, 2, 'FD');

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(3, 105, 161);
      doc.text('CƏMİ SATILAN ÇEŞİD:', 20, 53);
      doc.setFontSize(12);
      doc.setTextColor(12, 74, 110);
      doc.text(`${data.products.length} çeşid`, 20, 60);

      doc.setFontSize(8.5);
      doc.setTextColor(3, 105, 161);
      doc.text('CƏMİ SATILMIŞ MİQDAR:', 85, 53);
      doc.setFontSize(12);
      doc.setTextColor(12, 74, 110);
      doc.text(`${data.totalItemsCount} ədəd / vahid`, 85, 60);

      doc.setFontSize(8.5);
      doc.setTextColor(3, 105, 161);
      doc.text('MƏSUL ŞƏXS / KASSİR:', 150, 53);
      doc.setFontSize(10);
      doc.setTextColor(12, 74, 110);
      doc.text(String(cashierName).substring(0, 22), 150, 60);

      // Table (No prices)
      const tableData = data.products.map((p, idx) => [
        String(idx + 1),
        p.name || 'Məhsul',
        p.barcode || '-',
        p.category || 'Ümumi',
        `${p.quantity} ${p.unit || ''}`,
        '[   ]'
      ]);

      autoTable(doc, {
        startY: 70,
        head: [['№', 'Məhsulun Adı', 'Barkod', 'Kateqoriya', 'Satılan Miqdar', 'Sayım [✓]']],
        body: tableData.length > 0 ? tableData : [['-', 'Gündəlik satış qeydə alınmayıb', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: {
          fillColor: [3, 105, 161],
          textColor: 255,
          font: 'Roboto',
          fontStyle: 'bold',
          fontSize: 8.5
        },
        styles: {
          font: 'Roboto',
          fontStyle: 'normal',
          fontSize: 8.5,
          cellPadding: 2.5
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 80 },
          2: { cellWidth: 35 },
          3: { cellWidth: 27 },
          4: { halign: 'center', cellWidth: 20 },
          5: { halign: 'center', cellWidth: 10 }
        },
        margin: { left: 14, right: 14 }
      });

      let currentY = doc.lastAutoTable?.finalY || 140;
      if (currentY > 240) {
        doc.addPage();
        currentY = 30;
      } else {
        currentY += 18;
      }

      // Signatures
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text('Məhsulları Təhvil Verdi (Kassir):', 14, currentY);
      doc.text('Məhsulları Təhvil Aldı (Anbardar / Nəzarətçi):', 110, currentY);

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.5);
      doc.line(14, currentY + 10, 85, currentY + 10);
      doc.line(110, currentY + 10, 185, currentY + 10);

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${cashierName} (İmza)`, 14, currentY + 14);
      doc.text('Ad, Soyad (İmza)', 110, currentY + 14);

      // Page numbers in footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Səhifə ${i} / ${pageCount} • Mərkəz CRM Satılan Məhsullar Siyahısı • ${data.shortDate}`,
          14,
          doc.internal.pageSize.getHeight() - 8
        );
      }

      const filename = `Gunluk_Satilan_Mehsullar_${data.dateStr}.pdf`;
      doc.save(filename);
      return true;
    }

    // ==========================================
    // VARIANT 2: FULL DETAILED REPORT PDF
    // ==========================================
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138); // Deep Blue
    doc.text('MƏRKƏZ CRM', 14, 18);

    doc.setFontSize(10);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(String(companyName), 14, 25);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    doc.text(`${voen ? voen + ' | ' : ''}${address || 'Əsas Satış Məntəqəsi'}`, 14, 30);

    // Right-aligned report header
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text('GÜN SONU SATIŞ HESABATI', 196, 18, { align: 'right' });

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text(`Tarix: ${data.formattedDate}`, 196, 25, { align: 'right' });
    doc.text(`İş saatı: ${data.shiftStartTime} - ${data.shiftEndTime}`, 196, 30, { align: 'right' });
    doc.text(`Çap tarixi: ${data.generatedAt}`, 196, 35, { align: 'right' });

    // Decorative line
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.8);
    doc.line(14, 40, 196, 40);

    // 2. Financial KPI Summary Box
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, 44, 182, 38, 2, 2, 'FD');

    // Cəmi Satış Box
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235);
    doc.text('CƏMİ DÖVRİYYƏ', 20, 51);
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(`${data.totalRevenue.toFixed(2)} AZN`, 20, 57);
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(`${data.salesCount} ədəd satış çeki`, 20, 62);

    // Nağd Satış
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text('NAĞD KASSA', 68, 51);
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(`${data.totalCash.toFixed(2)} AZN`, 68, 57);
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text('Nağd ödəniş', 68, 62);

    // Kart Satışı
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text('KART / TERMINAL', 114, 51);
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(`${data.totalCard.toFixed(2)} AZN`, 114, 57);
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text('Kart / Terminal', 114, 62);

    // Statistika
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text('ORTA ÇEK', 160, 51);
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(`${data.averageTicket.toFixed(2)} AZN`, 160, 57);
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(`Cəmi ${data.totalItemsCount} ədəd`, 160, 62);

    // Bottom strip of the KPI box: Credit, Debt, Deposit, Discounts
    doc.setDrawColor(229, 231, 235);
    doc.line(18, 66, 192, 66);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    doc.text(`Kredit: ${data.totalCredit.toFixed(2)} AZN  •  Nisyə: ${data.totalDebt.toFixed(2)} AZN  •  Beh: ${data.totalDeposit.toFixed(2)} AZN  •  Xərc: ${(data.totalExpense || 0).toFixed(2)} AZN  •  Endirim: -${data.totalDiscounts.toFixed(2)} AZN`, 20, 74);
    if (data.isAdmin !== false && mergedOptions.showProfit !== false && data.totalCostPrice != null) {
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(`Xalis: ${data.grossProfit.toFixed(2)} AZN (${data.marginPercent}%)`, 146, 74);
    }

    // 3. Products Table
    const tableData = data.products.map((p, idx) => [
      String(idx + 1),
      p.name || 'Məhsul',
      p.barcode || '-',
      p.category || 'Ümumi',
      `${p.quantity} ${p.unit || ''}`,
      `${p.avgPrice.toFixed(2)} AZN`,
      `${p.totalRevenue.toFixed(2)} AZN`
    ]);

    autoTable(doc, {
      startY: 88,
      head: [['№', 'Məhsulun Adı', 'Barkod', 'Kateqoriya', 'Miqdar', 'Qiymət', 'Məbləğ']],
      body: tableData.length > 0 ? tableData : [['-', 'Gündəlik satış qeydə alınmayıb', '-', '-', '-', '-', '0.00 AZN']],
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        font: 'Roboto',
        fontStyle: 'bold',
        fontSize: 8.5
      },
      styles: {
        font: 'Roboto',
        fontStyle: 'normal',
        fontSize: 8,
        cellPadding: 2.2
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 55 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { halign: 'center', cellWidth: 18 },
        5: { halign: 'right', cellWidth: 18 },
        6: { halign: 'right', cellWidth: 21 }
      },
      margin: { left: 14, right: 14 }
    });

    let currentY = doc.lastAutoTable?.finalY || 140;

    // Check if we need a new page for receipts & signatures
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    // Receipts summary table (Top 30)
    if (mergedOptions.showReceipts !== false) {
      const receiptsData = data.transactions.slice(0, 30).map(t => [
        t.receiptNumber,
        t.time,
        t.itemsSummary || '-',
        t.paymentMethod,
        `${t.itemsCount} ədəd`,
        `${t.total.toFixed(2)} AZN`
      ]);

      if (receiptsData.length > 0) {
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        doc.text(`Günün Satış Əməliyyatları (Cəmi: ${data.transactions.length} çek)`, 14, currentY + 8);

        autoTable(doc, {
          startY: currentY + 12,
          head: [['Çek №', 'Saat', 'Məhsullar', 'Ödəniş Üsulu', 'Say', 'Məbləğ']],
          body: receiptsData,
          theme: 'striped',
          headStyles: {
            fillColor: [75, 85, 99],
            textColor: 255,
            font: 'Roboto',
            fontStyle: 'bold',
            fontSize: 8
          },
          styles: {
            font: 'Roboto',
            fontStyle: 'normal',
            fontSize: 7.5,
            cellPadding: 1.8
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 16 },
            1: { halign: 'center', cellWidth: 16 },
            2: { cellWidth: 80 },
            3: { cellWidth: 30 },
            4: { halign: 'center', cellWidth: 18 },
            5: { halign: 'right', cellWidth: 22 }
          },
          margin: { left: 14, right: 14 }
        });

        currentY = doc.lastAutoTable?.finalY || currentY + 30;
      }
    }

    // Cancelled / Deleted Transactions Independent Audit Table (does NOT affect total revenue)
    if (data.cancelledCount > 0) {
      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      }

      const cancelledData = (data.cancelledTransactions || []).slice(0, 30).map(t => [
        t.receiptNumber,
        t.time,
        t.itemsSummary || '-',
        t.paymentMethod,
        `${t.itemsCount} ədəd`,
        `${t.total.toFixed(2)} AZN`
      ]);

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(185, 28, 28); // Red
      doc.text(`Ləğv Edilmiş Əməliyyatlar — Audit Bölməsi (${data.cancelledCount} çek, Cəmi: ${data.cancelledRevenue.toFixed(2)} AZN)`, 14, currentY + 8);
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text('* Bu əməliyyatlar kassa dövriyyəsindən çıxarılıb və yekun balansa təsir etmir', 14, currentY + 12);

      autoTable(doc, {
        startY: currentY + 15,
        head: [['Ləğv №', 'Saat', 'Məhsullar', 'Ödəniş Üsulu', 'Say', 'Ləğv Məbləği']],
        body: cancelledData,
        theme: 'striped',
        headStyles: {
          fillColor: [185, 28, 28],
          textColor: 255,
          font: 'Roboto',
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: {
          font: 'Roboto',
          fontStyle: 'normal',
          fontSize: 7.5,
          cellPadding: 1.8
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 16 },
          1: { halign: 'center', cellWidth: 16 },
          2: { cellWidth: 80 },
          3: { cellWidth: 30 },
          4: { halign: 'center', cellWidth: 18 },
          5: { halign: 'right', cellWidth: 22 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable?.finalY || currentY + 30;
    }

    // Signature Block
    if (currentY > 250) {
      doc.addPage();
      currentY = 30;
    } else {
      currentY += 15;
    }

    if (mergedOptions.showSignatures !== false) {
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(55, 65, 81);
      doc.text('Kassanı Təhvil Verdi (Kassir):', 14, currentY);
      doc.text('Təhvil Aldı (Məsul Şəxs):', 110, currentY);

      doc.setDrawColor(156, 163, 175);
      doc.setLineWidth(0.5);
      doc.line(14, currentY + 10, 85, currentY + 10);
      doc.line(110, currentY + 10, 185, currentY + 10);

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text(`${cashierName} (İmza)`, 14, currentY + 14);
      doc.text('Ad, Soyad (İmza və Möhür)', 110, currentY + 14);
    }

    // Page numbers in footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Səhifə ${i} / ${pageCount} • Mərkəz CRM Gün Sonu Satış Hesabatı • ${data.shortDate}`,
        14,
        doc.internal.pageSize.getHeight() - 8
      );
    }

    // Save and download
    const filename = `Gun_Sonu_Etrafli_Satis_Hesabati_${data.dateStr}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('jsPDF generation error:', err);
    throw err;
  }
};

/**
 * Generate and direct-download an Excel (.xlsx) file
 * Respects options.mode ('products_only' vs 'detailed')
 */
export const downloadDailySalesReportExcel = async (data, businessInfo = {}, options = {}) => {
  const mergedOptions = { ...DEFAULT_REPORT_OPTIONS, ...options };

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Mərkəz CRM';
    wb.created = new Date();

    const companyName = businessInfo.businessName || businessInfo.company_name || 'RAST MUSİC';
    const address = businessInfo.address || 'ƏHMƏDLİ TELNOV KÜÇƏSİ 18A';
    const cashierName = businessInfo.cashierName || businessInfo.full_name || 'Mətanət';
    const dateFormatted = data.formattedDate || data.dateStr;

    const borderThin = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    };

    // ==============================================================
    // 1. PRIMARY SHEET: Kassa Satış Cədvəli (Exact Template from Image)
    // ==============================================================
    const wsLedger = wb.addWorksheet('Kassa Satış Cədvəli', {
      views: [{ showGridLines: true }]
    });

    // 10 Columns: №, MALIN ADI, NAĞD, terminal, KREDİT, kart, BORC USTA, ÇIXILAN, SATICI, SAAT
    wsLedger.columns = [
      { key: 'no', width: 6 },
      { key: 'name', width: 75 }, // Large width so long item names are completely visible!
      { key: 'nagd', width: 14 },
      { key: 'terminal', width: 14 },
      { key: 'kredit', width: 14 },
      { key: 'kart', width: 14 },
      { key: 'borc', width: 14 },
      { key: 'cixilan', width: 14 },
      { key: 'satici', width: 22 }, // Column for seller name
      { key: 'saat', width: 13 } // Column for exact sale/expense time
    ];

    // Row 1: Address (H1:J1 merged for ample room)
    wsLedger.addRow(['', '', '', '', '', '', '', 'ÜNVAN: ' + address, '', '']);
    wsLedger.mergeCells('H1:J1');
    const cellH1 = wsLedger.getCell('H1');
    cellH1.font = { name: 'Arial', size: 10, bold: true };
    cellH1.alignment = { horizontal: 'right', vertical: 'middle' };

    // Row 2: Magaza (A2:F2 merged so "MAĞAZA:" is 100% visible and uncropped)
    wsLedger.addRow(['MAĞAZA: ' + companyName, '', '', '', '', '', '', '', '', '']);
    wsLedger.mergeCells('A2:F2');
    const cellA2 = wsLedger.getCell('A2');
    cellA2.font = { name: 'Arial', size: 10.5, bold: true };
    cellA2.alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 3: Satici (A3:F3 merged so "SATICI:" is 100% visible and uncropped)
    wsLedger.addRow(['SATICI: ' + cashierName, '', '', '', '', '', '', '', '', '']);
    wsLedger.mergeCells('A3:F3');
    const cellA3 = wsLedger.getCell('A3');
    cellA3.font = { name: 'Arial', size: 10 };
    cellA3.alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 4: Vaxt (A4:F4 merged so "VAXT:" is 100% visible and uncropped)
    wsLedger.addRow(['VAXT: ' + dateFormatted, '', '', '', '', '', '', '', '', '']);
    wsLedger.mergeCells('A4:F4');
    const cellA4 = wsLedger.getCell('A4');
    cellA4.font = { name: 'Arial', size: 10 };
    cellA4.alignment = { horizontal: 'left', vertical: 'middle' };

    // Header Row 5: Blue fill, bold white text
    const headerRow = wsLedger.addRow(['№', 'MALIN ADI', 'NAĞD', 'terminal', 'KREDİT', 'kart', 'BORC USTA', 'ÇIXILAN', 'SATICI', 'SAAT']);
    headerRow.height = 26;
    headerRow.eachCell((cell, colNum) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' } // Deep Royal Blue
      };
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: colNum === 2 ? 'left' : 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1D4ED8' } },
        bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
        left: { style: 'thin', color: { argb: 'FF3B82F6' } },
        right: { style: 'thin', color: { argb: 'FF3B82F6' } }
      };
    });

    let runningNagd = 0;
    let runningTerminal = 0;
    let runningKredit = 0;
    let runningKart = 0;
    let runningBorcUsta = 0;
    let runningCixilan = 0;

    let rowSequence = 0;

    // 1. Add all Sales Transactions
    const txList = data.transactions || [];
    txList.forEach((t) => {
      rowSequence++;

      // Compound product names joined with '+'
      let malinAdi = '';
      if (t.items && t.items.length > 0) {
        malinAdi = t.items.map(it => it.quantity > 1 ? `${it.name} (${it.quantity})` : it.name).join('+');
      } else if (t.itemsSummary) {
        malinAdi = t.itemsSummary;
      } else {
        malinAdi = 'Satış';
      }

      let nNagd = 0, nTerminal = 0, nKredit = 0, nKart = 0, nBorcUsta = 0, nCixilan = 0;
      const method = (t.paymentMethod || '').toLowerCase();

      // Determine payment distribution
      if (t.splitDetails && (t.splitDetails.cash > 0 || t.splitDetails.card > 0 || t.splitDetails.credit > 0)) {
        nNagd = Number(t.splitDetails.cash || 0);
        nTerminal = Number(t.splitDetails.card || 0);
        nKredit = Number(t.splitDetails.credit || 0);
      } else if (method.includes('terminal') || method.includes('pos')) {
        nTerminal = Number(t.total || 0);
      } else if (method.includes('kredit') || method.includes('tamkart') || method.includes('birbank') || method.includes('birkart') || method.includes('abb') || method.includes('kapital')) {
        nKredit = Number(t.total || 0);
      } else if (method.includes('kart') || method.includes('card')) {
        nKart = Number(t.total || 0);
      } else if (method.includes('borc') || method.includes('nisyə') || method.includes('usta')) {
        nBorcUsta = Number(t.total || 0);
      } else if (method.includes('avans') || method.includes('beh') || method.includes('deposit')) {
        nNagd = Number(t.total || 0);
      } else {
        nNagd = Number(t.total || 0);
      }

      runningNagd += nNagd;
      runningTerminal += nTerminal;
      runningKredit += nKredit;
      runningKart += nKart;
      runningBorcUsta += nBorcUsta;
      runningCixilan += nCixilan;

      const sellerText = t.sellerName || cashierName || '-';
      const saleTimeText = t.time || (t.createdAt ? formatTimeAz(t.createdAt) : (t.created_at ? formatTimeAz(t.created_at) : ''));

      const row = wsLedger.addRow([
        rowSequence,
        malinAdi,
        nNagd > 0 ? nNagd : null,
        nTerminal > 0 ? nTerminal : null,
        nKredit > 0 ? nKredit : null,
        nKart > 0 ? nKart : null,
        nBorcUsta > 0 ? nBorcUsta : null,
        nCixilan > 0 ? nCixilan : null,
        sellerText,
        saleTimeText
      ]);

      row.height = 20;
      const isOdd = rowSequence % 2 === 1;
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.border = borderThin;
        cell.font = { name: 'Arial', size: 9.5 };
        if (isOdd) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        if (colNum === 1 || colNum === 9 || colNum === 10) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNum === 2) {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        } else {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0.00 "₼"';
          }
        }
      });
    });

    // 2. Add Store Expenses into ÇIXILAN column (from business_expenses modal)
    const storeExpenses = data.storeExpenses || [];
    storeExpenses.forEach((exp) => {
      rowSequence++;
      const expAmt = Number(exp.amount || 0);
      runningCixilan += expAmt;

      const desc = String(exp.description || '');
      const recipientMatch = desc.match(/\[Xərcləyən:\s*([^\]]+)\]/i) || desc.match(/\[Alan:\s*([^\]]+)\]/i);
      const expPerson = recipientMatch ? recipientMatch[1].trim() : (exp.recipient || exp.staff_name || cashierName || '-');
      const expTimeText = exp.created_at ? formatTimeAz(exp.created_at) : '';
      const cleanDesc = desc.replace(/\[.*?\]/g, '').trim();
      const expTitle = `Xərc: ${exp.category || 'Xərc'}${cleanDesc ? ' (' + cleanDesc + ')' : ''}`;

      const expRow = wsLedger.addRow([
        rowSequence,
        expTitle,
        null,
        null,
        null,
        null,
        null,
        expAmt > 0 ? expAmt : null,
        expPerson,
        expTimeText
      ]);

      expRow.height = 20;
      expRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.border = borderThin;
        cell.font = { name: 'Arial', size: 9.5 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } }; // Soft rose highlight for expenses
        if (colNum === 1 || colNum === 9 || colNum === 10) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNum === 2) {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
        } else {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0.00 "₼"';
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
          }
        }
      });
    });

    // 3. Pad with empty numbered rows up to at least 32 rows matching template
    const minRows = Math.max(32, rowSequence);
    for (let r = rowSequence + 1; r <= minRows; r++) {
      const emptyRow = wsLedger.addRow([r, '', null, null, null, null, null, null, '', '']);
      emptyRow.height = 19;
      const isOdd = (r - 1) % 2 === 1;
      emptyRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.border = borderThin;
        cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF94A3B8' } };
        if (isOdd) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        if (colNum === 1 || colNum === 9 || colNum === 10) cell.alignment = { horizontal: 'center' };
      });
    }

    // 4. Totals rows matching Screenshot 2
    const grandTotal = Number((runningNagd + runningTerminal + runningKredit + runningKart + runningBorcUsta).toFixed(2));
    const netCash = Number((runningNagd - runningCixilan).toFixed(2));

    // Summary Row 1: ÜMUMİ MƏBLƏĞ
    const sumRow1 = wsLedger.addRow([
      '',
      'ÜMUMİ MƏBLƏĞ',
      runningNagd > 0 ? runningNagd : 0,
      runningTerminal > 0 ? runningTerminal : 0,
      runningKredit > 0 ? runningKredit : 0,
      runningKart > 0 ? runningKart : 0,
      runningBorcUsta > 0 ? runningBorcUsta : 0,
      runningCixilan > 0 ? runningCixilan : 0,
      '',
      ''
    ]);
    sumRow1.height = 24;
    sumRow1.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }; // Light blue
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF2563EB' } },
        bottom: { style: 'medium', color: { argb: 'FF2563EB' } },
        left: borderThin.left,
        right: borderThin.right
      };
      if (colNum >= 3 && colNum <= 8) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.00 "₼"';
      }
    });

    // Summary Row 2: 2 YEKUN MƏBLƏĞ
    const sumRow2 = wsLedger.addRow([2, 'YEKUN MƏBLƏĞ', '', '', '', '', '', grandTotal, '', '']);
    sumRow2.height = 24;
    sumRow2.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { name: 'Arial', size: 10.5, bold: true };
      cell.border = borderThin;
      if (colNum === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (colNum === 8) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.00 "₼"';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Amber Highlight
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'double', color: { argb: 'FF1F2937' } },
          left: borderThin.left,
          right: borderThin.right
        };
      }
    });

    // Summary Row 3: 3 NƏTİCƏ / NAĞD
    const sumRow3 = wsLedger.addRow([3, 'NƏTİCƏ / NAĞD', '', '', '', '', '', netCash, '', '']);
    sumRow3.height = 24;
    sumRow3.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { name: 'Arial', size: 10.5, bold: true };
      cell.border = borderThin;
      if (colNum === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (colNum === 8) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.00 "₼"';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light Green Highlight
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'medium', color: { argb: 'FF059669' } },
          left: borderThin.left,
          right: borderThin.right
        };
      }
    });

    // ==============================================================
    // 2. SECONDARY SHEET: Satılan Məhsullar (Styled Inventory Detail)
    // ==============================================================
    const canShowProfit = data.isAdmin !== false && mergedOptions.showProfit !== false && data.totalCostPrice != null;
    const wsProducts = wb.addWorksheet('Satılan Məhsullar', {
      views: [{ showGridLines: true }]
    });

    const pCols = [
      { key: 'p_no', width: 6 },
      { key: 'p_name', width: 45 },
      { key: 'p_barcode', width: 18 },
      { key: 'p_category', width: 18 },
      { key: 'p_qty', width: 12 },
      { key: 'p_price', width: 14 },
      { key: 'p_discount', width: 12 },
      { key: 'p_total', width: 16 }
    ];
    if (canShowProfit) {
      pCols.push(
        { key: 'p_cost', width: 14 },
        { key: 'p_profit', width: 14 }
      );
    }
    wsProducts.columns = pCols;

    const pHeaders = ['№', 'Məhsulun Adı', 'Barkod', 'Kateqoriya', 'Miqdar', 'Satış Qiyməti', 'Endirim', 'Cəmi Məbləğ'];
    if (canShowProfit) {
      pHeaders.push('Maya Dəyəri', 'Mənfəət');
    }
    const pHeaderRow = wsProducts.addRow(pHeaders);
    pHeaderRow.height = 24;
    pHeaderRow.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: colNum === 2 ? 'left' : 'center' };
      cell.border = borderThin;
    });

    (data.products || []).forEach((p, idx) => {
      const pRowValues = [
        idx + 1,
        p.name || 'Məhsul',
        p.barcode || '-',
        p.category || 'Ümumi',
        `${p.quantity} ${p.unit || 'ədəd'}`,
        p.avgPrice || 0,
        p.totalDiscount || 0,
        p.totalRevenue || 0
      ];
      if (canShowProfit) {
        const cost = p.totalCost || 0;
        pRowValues.push(cost, Number((p.totalRevenue - cost).toFixed(2)));
      }
      const pRow = wsProducts.addRow(pRowValues);
      pRow.height = 19;
      const isOdd = idx % 2 === 1;
      pRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.border = borderThin;
        cell.font = { name: 'Arial', size: 9.5 };
        if (isOdd) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        if (colNum === 1) cell.alignment = { horizontal: 'center' };
        else if (colNum === 2) cell.alignment = { horizontal: 'left' };
        else if (colNum >= 6) {
          cell.alignment = { horizontal: 'right' };
          if (typeof cell.value === 'number') cell.numFmt = '#,##0.00 "₼"';
        }
      });
    });

    // Write file directly to browser download
    const buffer = await wb.xlsx.writeBuffer();
    const filename = `Gun_Sonu_Satis_Hesabati_${data.dateStr}.xlsx`;
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 200);

    return true;
  } catch (err) {
    console.error('Excel generation error:', err);
    throw err;
  }
};
