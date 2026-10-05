import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
  switch (String(method || '').toLowerCase()) {
    case 'cash':
      return 'Nağd';
    case 'card':
      return 'Kart / Nağdsız';
    case 'split':
      return 'Qarışıq (Bölünmüş)';
    case 'credit':
    case 'debt':
      return 'Nisyə (Kredit)';
    case 'transfer':
      return 'Bank Köçürməsi';
    default:
      return method || 'Digər';
  }
};

/**
 * Fetch and aggregate all sales data for a specific day
 */
export const fetchDailySalesReportData = async (supabase, userId, selectedDateInput, includeHidden = false) => {
  if (!supabase || !userId) {
    throw new Error('Supabase client və İstifadəçi ID mütləqdir');
  }

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

  // 1. Fetch sales with items (with pagination to support busy shifts with >1000 sales)
  let salesList = [];
  let sFrom = 0;
  const sStep = 1000;
  let sHasMore = true;

  while (sHasMore) {
    let salesQuery = supabase
      .from('retail_sales')
      .select('*, retail_sale_items(*)')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: true })
      .range(sFrom, sFrom + sStep - 1);

    if (!includeHidden) {
      salesQuery = salesQuery.or('is_hidden.is.null,is_hidden.eq.false');
    }

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

  // 2. Fetch ALL products for cost price & category mapping using range pagination
  let allProducts = [];
  let pFrom = 0;
  const pStep = 1000;
  let pHasMore = true;

  while (pHasMore) {
    const { data: prodsChunk, error: pErr } = await supabase
      .from('products')
      .select('id, name, barcode, purchase_price, price, category_id, unit')
      .eq('user_id', userId)
      .range(pFrom, pFrom + pStep - 1);

    if (pErr) {
      console.warn('Error fetching products chunk in dailySalesReportService:', pErr);
      break;
    }

    if (prodsChunk && prodsChunk.length > 0) {
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

  // Compute Aggregations
  let totalRevenue = 0;
  let totalCash = 0;
  let totalCard = 0;
  let totalSplit = 0;
  let totalCredit = 0;
  let totalOther = 0;
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

  salesList.forEach((sale, index) => {
    const saleAmount = Number(sale.total_amount || 0);
    const saleDiscount = Number(sale.discount_amount || 0);
    const paymentMethod = String(sale.payment_method || 'cash').toLowerCase();
    const saleDate = new Date(sale.created_at);

    totalRevenue += saleAmount;
    totalDiscounts += saleDiscount;

    // Payment methods breakdown
    if (paymentMethod === 'cash') {
      totalCash += saleAmount;
    } else if (paymentMethod === 'card') {
      totalCard += saleAmount;
    } else if (paymentMethod === 'split') {
      totalSplit += saleAmount;
      const splitCash = Number(sale.split_cash || 0);
      const splitCard = Number(sale.split_card || 0);
      totalCash += splitCash;
      totalCard += splitCard;
    } else if (paymentMethod === 'credit' || paymentMethod === 'debt') {
      totalCredit += saleAmount;
    } else {
      totalOther += saleAmount;
    }

    // Hourly aggregation
    const hour = saleDate.getHours();
    const hourSlotKey = `${String(hour).padStart(2, '0')}:00`;
    const hourData = hourlyAggregationMap.get(hourSlotKey) || { hour: hourSlotKey, count: 0, revenue: 0 };
    hourData.count += 1;
    hourData.revenue += saleAmount;
    hourlyAggregationMap.set(hourSlotKey, hourData);

    // Process Sale Items
    const items = sale.retail_sale_items || [];
    let saleItemNames = [];
    let saleItemsQuantity = 0;

    items.forEach(item => {
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
      const costPrice = Number(productMeta.purchase_price || item.cost_price || 0);
      const categoryName = (productMeta.category_id && categoriesMap.get(productMeta.category_id))
        || item.category_name
        || item.category
        || 'Ümumi';

      totalCostPrice += (costPrice * qty);

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
          totalCost: 0,
          totalDiscount: 0,
          avgPrice: price
        });
      }
      const pAgg = productAggregationMap.get(prodKey);
      pAgg.quantity += qty;
      pAgg.totalRevenue += itemTotal;
      pAgg.totalCost += (costPrice * qty);
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
      total: saleAmount
    });
  });

  const grossProfit = totalRevenue - totalCostPrice;
  const marginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : 0;
  const receiptsCount = salesList.length;
  const averageTicket = receiptsCount > 0 ? (totalRevenue / receiptsCount) : 0;

  // Sorted product list (highest revenue first, or by quantity)
  const aggregatedProducts = Array.from(productAggregationMap.values()).sort((a, b) => b.quantity - a.quantity || b.totalRevenue - a.totalRevenue);

  // Category breakdown
  const aggregatedCategories = Array.from(categoryAggregationMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Hourly list filtered to hours that had activity
  const activeHours = Array.from(hourlyAggregationMap.values()).filter(h => h.count > 0);

  // Shift working interval (first sale to last sale)
  let shiftStartTime = '-';
  let shiftEndTime = '-';
  if (salesList.length > 0) {
    shiftStartTime = formatTimeAz(salesList[0].created_at);
    shiftEndTime = formatTimeAz(salesList[salesList.length - 1].created_at);
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
    totalCash: Number(totalCash.toFixed(2)),
    totalCard: Number(totalCard.toFixed(2)),
    totalSplit: Number(totalSplit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    totalOther: Number(totalOther.toFixed(2)),
    totalDiscounts: Number(totalDiscounts.toFixed(2)),
    totalCostPrice: Number(totalCostPrice.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    marginPercent: Number(marginPercent.toFixed(1)),
    averageTicket: Number(averageTicket.toFixed(2)),
    products: aggregatedProducts,
    categories: aggregatedCategories,
    activeHours,
    transactions: transactionsList
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
          <span>Nağd Satış:</span>
          <span class="bold">${data.totalCash.toFixed(2)} AZN</span>
        </div>
        <div class="row">
          <span>Kart / Nağdsız:</span>
          <span class="bold">${data.totalCard.toFixed(2)} AZN</span>
        </div>
        ${data.totalCredit > 0 ? `
        <div class="row">
          <span>Nisyə / Kredit:</span>
          <span class="bold">${data.totalCredit.toFixed(2)} AZN</span>
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
            <div class="kpi-label">Kart / Nağdsız</div>
            <div class="kpi-value">${data.totalCard.toFixed(2)} AZN</div>
            <div class="kpi-sub">POS-Terminal vasitəsilə</div>
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
            <div class="payment-item-title">Kart / Nağdsız</div>
            <div class="payment-item-val">${data.totalCard.toFixed(2)} AZN</div>
          </div>
          ${data.totalSplit > 0 ? `
          <div class="payment-item">
            <div class="payment-item-title">Bölünmüş (Split)</div>
            <div class="payment-item-val">${data.totalSplit.toFixed(2)} AZN</div>
          </div>
          ` : ''}
          ${data.totalCredit > 0 ? `
          <div class="payment-item">
            <div class="payment-item-title">Nisyə / Kredit</div>
            <div class="payment-item-val">${data.totalCredit.toFixed(2)} AZN</div>
          </div>
          ` : ''}
          <div class="payment-item">
            <div class="payment-item-title">Verilmiş Endirimlər</div>
            <div class="payment-item-val">${data.totalDiscounts > 0 ? `-${data.totalDiscounts.toFixed(2)}` : '0.00'} AZN</div>
          </div>
          ${mergedOptions.showProfit !== false && data.totalCostPrice > 0 ? `
          <div class="payment-item">
            <div class="payment-item-title">Təxmini Xalis Mənfəət</div>
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
    doc.roundedRect(14, 44, 182, 32, 2, 2, 'FD');

    // Cəmi Satış Box
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235);
    doc.text('CƏMİ DÖVRİYYƏ', 20, 51);
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text(`${data.totalRevenue.toFixed(2)} AZN`, 20, 58);
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(`${data.salesCount} ədəd satış çeki`, 20, 64);

    // Nağd Satış
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text('NAĞD KASSA', 70, 51);
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(`${data.totalCash.toFixed(2)} AZN`, 70, 58);
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text('Nağd qəbul edilən', 70, 64);

    // Kart Satışı
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text('KART / NAĞDSIZ', 118, 51);
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(`${data.totalCard.toFixed(2)} AZN`, 118, 58);
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text('POS-Terminal ilə', 118, 64);

    // Statistika
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text('ORTA ÇEK', 162, 51);
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(`${data.averageTicket.toFixed(2)} AZN`, 162, 58);
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(`Cəmi ${data.totalItemsCount} ədəd mal`, 162, 64);

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
      startY: 82,
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
export const downloadDailySalesReportExcel = (data, businessInfo = {}, options = {}) => {
  const mergedOptions = { ...DEFAULT_REPORT_OPTIONS, ...options };
  const isProductsOnly = mergedOptions.mode === 'products_only' || mergedOptions.showPrices === false;

  try {
    const wb = XLSX.utils.book_new();

    if (isProductsOnly) {
      // Products Only (No Prices)
      const productsAoa = [
        ['MƏRKƏZ CRM - GÜNLÜK SATILAN MƏHSULLARIN SİYAHISI'],
        ['Müəssisə:', businessInfo.businessName || businessInfo.company_name || 'Mərkəz CRM'],
        ['Hesabat Tarixi:', data.formattedDate],
        ['Çap Tarixi:', data.generatedAt],
        ['Cəmi Satılan Çeşid:', data.products.length],
        ['Cəmi Satılmış Miqdar:', data.totalItemsCount],
        [],
        ['№', 'Məhsulun Adı', 'Barkod', 'Kateqoriya', 'Satılan Miqdar', 'Vahid', 'Sayım Yoxlaması']
      ];
      data.products.forEach((p, idx) => {
        productsAoa.push([
          idx + 1,
          p.name,
          p.barcode || '',
          p.category || '',
          p.quantity,
          p.unit || 'ədəd',
          ''
        ]);
      });
      const wsProducts = XLSX.utils.aoa_to_sheet(productsAoa);
      XLSX.utils.book_append_sheet(wb, wsProducts, 'Satılan Məhsullar');

      const filename = `Gunluk_Satilan_Mehsullar_${data.dateStr}.xlsx`;
      XLSX.writeFile(wb, filename);
      return true;
    }

    // Detailed Report (All figures)
    // 1. Summary Sheet
    const summaryAoa = [
      ['MƏRKƏZ CRM - GÜN SONU SATIŞ HESABATI'],
      ['Müəssisə:', businessInfo.businessName || businessInfo.company_name || 'Mərkəz CRM'],
      ['VÖEN:', businessInfo.voen || '-'],
      ['Hesabat Tarixi:', data.formattedDate],
      ['Çap Tarixi:', data.generatedAt],
      [],
      ['GÖSTƏRİCİ', 'MƏBLƏĞ / MİQDAR', 'VALYUTA / VAHİD'],
      ['Ümumi Dövriyyə (Cəmi Satış)', data.totalRevenue, 'AZN'],
      ['Nağd Satışlar', data.totalCash, 'AZN'],
      ['Kart / Nağdsız Satışlar', data.totalCard, 'AZN'],
      ['Bölünmüş (Qarışıq) Satışlar', data.totalSplit, 'AZN'],
      ['Nisyə / Kredit', data.totalCredit, 'AZN'],
      ['Cəmi Endirimlər', data.totalDiscounts, 'AZN'],
      ['Satış Çeklərinin Sayı', data.salesCount, 'ədəd'],
      ['Satılmış Məhsul Sayı', data.totalItemsCount, 'ədəd'],
      ['Orta Çek Məbləği', data.averageTicket, 'AZN'],
      ['Maya Dəyəri', data.totalCostPrice, 'AZN'],
      ['Təxmini Xalis Mənfəət', data.grossProfit, 'AZN'],
      ['Rentabellik (%)', data.marginPercent, '%']
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Maliyyə Xülasəsi');

    // 2. Products Sheet
    const productsAoa = [
      ['№', 'Məhsulun Adı', 'Barkod', 'Kateqoriya', 'Miqdar', 'Vahid', 'Orta Satış Qiyməti', 'Endirim', 'Cəmi Məbləğ (AZN)', 'Maya Dəyəri (AZN)', 'Mənfəət (AZN)']
    ];
    data.products.forEach((p, idx) => {
      productsAoa.push([
        idx + 1,
        p.name,
        p.barcode || '',
        p.category || '',
        p.quantity,
        p.unit || 'ədəd',
        p.avgPrice,
        p.totalDiscount || 0,
        p.totalRevenue,
        p.totalCost || 0,
        Number((p.totalRevenue - (p.totalCost || 0)).toFixed(2))
      ]);
    });
    const wsProducts = XLSX.utils.aoa_to_sheet(productsAoa);
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Satılan Məhsullar');

    // 3. Transactions Sheet
    const receiptsAoa = [
      ['Çek №', 'ID', 'Saat', 'Tarix', 'Ödəniş Üsulu', 'Məhsul Sayı', 'Endirim (AZN)', 'Yekun Məbləğ (AZN)']
    ];
    data.transactions.forEach(t => {
      receiptsAoa.push([
        t.receiptNumber,
        t.shortId,
        t.time,
        t.dateTime,
        t.paymentMethod,
        t.itemsCount,
        t.discount || 0,
        t.total
      ]);
    });
    const wsReceipts = XLSX.utils.aoa_to_sheet(receiptsAoa);
    XLSX.utils.book_append_sheet(wb, wsReceipts, 'Günün Çekləri');

    const filename = `Gun_Sonu_Etrafli_Satis_Hesabati_${data.dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
    return true;
  } catch (err) {
    console.error('Excel generation error:', err);
    throw err;
  }
};
