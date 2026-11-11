import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  Package,
  AlertTriangle,
  Award,
  CreditCard,
  Banknote,
  Store,
  ChevronDown,
  Layers,
  ArrowUpRight,
  RotateCw,
  Percent,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react-native';

import { supabase } from '../config/supabase';
import { productService, getActiveUserId } from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { Warehouse, Product } from '../types';
import { WarehousePickerModal } from '../components/WarehousePickerModal';

type PeriodType = 'today' | '7days' | '30days' | 'thisMonth' | 'all';

interface DispatchItem {
  id: string;
  product_id?: string;
  quantity: number;
  reason?: string;
  notes?: string;
  issued_at?: string;
  created_at: string;
  warehouse_id?: string;
  is_deleted?: boolean;
  is_hidden?: boolean;
  status?: string;
  products?: {
    id?: string;
    name?: string;
    barcode?: string;
    price?: number;
    purchase_price?: number;
    unit?: string;
    category_id?: string;
  };
}

/**
 * Exact port of parseSaleNote from web src/modules/Warehouse/SaleDetailModal.jsx
 */
function parseSaleNote(note = '', product: any = null, quantity = 1, isAdmin = true) {
  const qty = Math.abs(parseFloat(String(quantity)) || 1);
  const prodPrice = product?.price ? Number(product.price) : 0;
  const prodCost = isAdmin && product?.purchase_price ? Number(product.purchase_price) : null;

  const info: {
    channel: string;
    paymentMethod: string;
    sellerName: string | null;
    customerName: string | null;
    customerPhone: string | null;
    unitPrice: number;
    totalAmount: number;
    costPrice: number | null;
    totalCost: number | null;
    profit: number | null;
    kassaAmount: number | null;
    months: number | null;
    bank: string | null;
    birmarketCategory: string | null;
    advanceAmount: number | null;
    advanceRecipient: string | null;
    expenseCategory: string | null;
    expenseDescription: string | null;
    expenseRecipient: string | null;
    discount: number;
    discountPercent: number | null;
    originalGross: number;
    rawNotes: string;
  } = {
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
    discount: 0,
    discountPercent: null,
    originalGross: prodPrice * qty,
    rawNotes: note || '',
  };

  if (!note) {
    if (isAdmin && info.totalCost !== null) {
      info.profit = info.totalAmount - info.totalCost;
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
    const raw = payMatch[1].trim();
    const lower = raw.toLowerCase();
    if (lower === 'nəqd' || lower === 'nağd' || lower === 'cash' || lower === 'neqd' || lower === 'nagd') {
      info.paymentMethod = 'Nağd';
    } else if (lower.includes('terminal')) {
      info.paymentMethod = 'Terminal';
    } else if (lower.includes('kart') || lower.includes('card')) {
      info.paymentMethod = 'Kart';
    } else if (lower.includes('qarışıq') || lower.includes('bölünmüş') || lower.includes('split')) {
      info.paymentMethod = 'Qarışıq (Bölünmüş)';
    } else if (lower.includes('köçürmə') || lower.includes('kocurme') || lower.includes('transfer')) {
      info.paymentMethod = 'Köçürmə';
    } else if (lower.includes('kredit')) {
      info.paymentMethod = 'Kredit';
    } else if (lower.includes('nisyə') || lower.includes('nisye') || lower.includes('borc')) {
      info.paymentMethod = 'Nisyə';
    } else if (lower.includes('beh') || lower.includes('avans')) {
      info.paymentMethod = 'Beh';
    } else {
      info.paymentMethod = raw;
    }
  } else if (/qarışıq|bölünmüş|split/i.test(note)) {
    info.paymentMethod = 'Qarışıq (Bölünmüş)';
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
  } else if (/terminal/i.test(note)) {
    info.paymentMethod = 'Terminal';
  } else if (/kart/i.test(note)) {
    info.paymentMethod = 'Kart';
  } else {
    info.paymentMethod = 'Nağd';
  }

  // 4. Stored price / total if saved in note
  const priceMatch = note.match(/\[Qiymət:\s*₼?([0-9.,]+)\]/i);
  if (priceMatch) {
    info.unitPrice = parseFloat(priceMatch[1].replace(',', '.'));
  }
  const originalGross = info.unitPrice * qty;
  info.originalGross = originalGross;

  // 5. Discount detection
  let discountAmount = 0;
  let discountPercent: number | null = null;
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

  // 8.5. Other Expense details
  const expCatMatch = note.match(/\[Xərc:\s*([^\]]+)\]/i);
  if (expCatMatch) {
    info.expenseCategory = expCatMatch[1].trim();
    if (!info.paymentMethod || info.paymentMethod === 'Nağd') {
      info.paymentMethod = 'Digər xərclər';
    }
  }

  // Fallback profit calculation if not parsed
  if (info.profit === null) {
    info.profit = info.totalAmount - (info.totalCost || 0);
  }

  return info;
}

export const ReportsScreen: React.FC = () => {
  const { permissions } = useAuth();
  const canSeeCostPrices = permissions?.canViewCostPrices !== false;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodType>('7days');
  const [timelineMetric, setTimelineMetric] = useState<'quantity' | 'orders' | 'revenue'>('quantity');
  const [topChartSortBy, setTopChartSortBy] = useState<'quantity' | 'revenue' | 'profit'>('quantity');

  // Warehouses
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');
  const [warehousePickerVisible, setWarehousePickerVisible] = useState(false);

  // Raw data from Supabase (matching web WarehouseReports.jsx)
  const [products, setProducts] = useState<Product[]>([]);
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async (force = false) => {
    if (!force) setLoading(true);
    try {
      const [wList, activeWId] = await Promise.all([
        productService.getWarehouses(force),
        productService.getActiveWarehouseId(),
      ]);
      setWarehouses(wList);
      const targetWId = selectedWarehouseId === 'ALL' && activeWId ? activeWId : selectedWarehouseId;
      if (selectedWarehouseId === 'ALL' && activeWId) {
        setSelectedWarehouseId(activeWId);
      }
      await fetchReportsData(targetWId);
    } catch (e) {
      console.error('Reports loadInitialData error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchReportsData = async (targetWId: string) => {
    try {
      const userId = await getActiveUserId();

      // 1. Fetch Products with range pagination batching (exact match with web WarehouseReports.jsx)
      let allProducts: Product[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      const productCols = canSeeCostPrices
        ? 'id, name, barcode, stock_quantity, critical_stock, purchase_price, price, category_id, supplier_id, unit'
        : 'id, name, barcode, stock_quantity, critical_stock, price, category_id, supplier_id, unit';

      while (hasMore) {
        let query = supabase
          .from('products')
          .select(productCols)
          .eq('user_id', userId)
          .eq('is_deleted', false);

        if (targetWId && targetWId !== 'ALL') {
          query = query.eq('warehouse_id', targetWId);
        }

        const { data: prods, error: prodErr } = await query.range(from, from + step - 1);
        if (prodErr) {
          console.warn('Products batch fetch error in ReportsScreen:', prodErr);
          break;
        }

        if (prods && prods.length > 0) {
          allProducts = allProducts.concat(prods as any[]);
          if (prods.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }
      setProducts(allProducts);

      // 2. Fetch Stock Dispatches (exact match with web WarehouseReports.jsx)
      let dispQuery = supabase
        .from('stock_dispatches')
        .select('id, product_id, quantity, reason, notes, issued_at, created_at')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false });

      if (targetWId && targetWId !== 'ALL') {
        dispQuery = dispQuery.eq('warehouse_id', targetWId);
      }

      const { data: dispData, error: dispErr } = await dispQuery;
      if (dispErr) {
        console.warn('stock_dispatches fetch error in ReportsScreen:', dispErr);
      } else if (dispData) {
        setDispatches(dispData as DispatchItem[]);
      }
    } catch (err) {
      console.warn('fetchReportsData error:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData(true);
  };

  const handleSelectWarehouse = async (wId: string) => {
    setSelectedWarehouseId(wId);
    setLoading(true);
    await fetchReportsData(wId);
    setLoading(false);
  };

  // Aggregate stats (exact match with web WarehouseReports.jsx + WarehouseEfficiencyCharts.jsx)
  const stats = useMemo(() => {
    // 1. Stock KPIs (exact match with WarehouseReports.jsx lines 158-180)
    const totalStockCost = canSeeCostPrices
      ? products.reduce((sum, p) => {
          const qty = parseFloat(String(p.stock_quantity || 0));
          const price = parseFloat(String(p.purchase_price || 0));
          if (qty > 1000000 || price > 1000000) return sum;
          return sum + qty * price;
        }, 0)
      : 0;

    const totalStockRetail = products.reduce((sum, p) => {
      const qty = parseFloat(String(p.stock_quantity || 0));
      const price = parseFloat(String(p.price ?? p.sale_price ?? 0));
      if (qty > 1000000 || price > 1000000) return sum;
      return sum + qty * price;
    }, 0);

    const potentialStockProfit = canSeeCostPrices ? totalStockRetail - totalStockCost : 0;
    const potentialMargin = totalStockRetail > 0 ? (potentialStockProfit / totalStockRetail) * 100 : 0;

    const lowStockList = products.filter(
      (p) => parseFloat(String(p.stock_quantity || 0)) < parseFloat(String(p.critical_stock || 15))
    );
    const lowStockCount = lowStockList.length;

    // 2. Parse all sales dispatches (exact match with WarehouseEfficiencyCharts.jsx lines 317-377)
    const prodMap = new Map<string, Product>();
    (products || []).forEach((p) => {
      if (p?.id) prodMap.set(p.id, p);
    });

    const parsedSales = (dispatches || [])
      .filter((d) => {
        if (d.is_deleted === true || d.is_hidden === true) return false;
        const st = String(d.status || '').toLowerCase().trim();
        if (['cancelled', 'canceled', 'deleted', 'refunded', 'void', 'silindi', 'ləğv'].includes(st)) return false;
        if (/\[STATUS:\s*(?:REFUNDED|CANCELLED|LƏĞV|QAYTARILIB)\]/i.test(d.notes || '')) return false;
        if (/\[STATUS:\s*EXCHANGED\]/i.test(d.notes || '') && !/\[Yeni Məhsul:/i.test(d.notes || '')) return false;
        const isSaleReason = !d.reason || d.reason === 'sale';
        const qty = Math.abs(parseFloat(String(d.quantity)) || 0);
        return isSaleReason && qty > 0;
      })
      .map((d) => {
        const prod = d.products || (d.product_id ? prodMap.get(d.product_id) : undefined) || ({} as any);
        const qty = Math.abs(parseFloat(String(d.quantity)) || 1);
        const parsed = parseSaleNote(d.notes || '', prod, qty, canSeeCostPrices);

        const purchasePrice = canSeeCostPrices ? (parsed.costPrice || 0) : 0;
        const costTotal = canSeeCostPrices ? (parsed.totalCost || 0) : 0;
        const totalAmount = parsed.totalAmount;
        const unitPrice = parsed.unitPrice;
        const discount = parsed.discount || 0;
        const netProfit = canSeeCostPrices ? (parsed.profit ?? (totalAmount - costTotal)) : 0;
        const profitMargin = totalAmount > 0 && canSeeCostPrices ? (netProfit / totalAmount) * 100 : 0;

        const dateObj = new Date(d.issued_at || d.created_at || Date.now());

        return {
          id: d.id,
          date: dateObj,
          timestamp: dateObj.getTime(),
          productId: d.product_id,
          productName: prod.name || 'Naməlum məhsul',
          barcode: prod.barcode || '',
          unit: prod.unit || 'pcs',
          quantity: qty,
          unitPrice,
          purchasePrice,
          totalAmount,
          discount,
          costTotal,
          netProfit,
          profitMargin,
          paymentMethod: parsed.paymentMethod || 'Nağd',
          channel: parsed.channel || 'Mağaza',
        };
      });

    // 3. Filter sales by selected time period (exact match with WarehouseEfficiencyCharts.jsx lines 380-398)
    const filteredSales = (() => {
      if (period === 'all') return parsedSales;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      let cutoff = 0;
      if (period === 'today') {
        cutoff = startOfToday;
      } else if (period === '7days') {
        cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      } else if (period === '30days') {
        cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      } else if (period === 'thisMonth') {
        cutoff = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      }

      return parsedSales.filter((s) => s.timestamp >= cutoff);
    })();

    // 4. Overall KPI Metrics for selected period (exact match with WarehouseEfficiencyCharts.jsx lines 401-430)
    let periodRevenue = 0;
    let totalUnits = 0;
    let periodProfit = 0;
    let periodCost = 0;
    let totalDiscounts = 0;
    const salesCount = filteredSales.length;

    filteredSales.forEach((s) => {
      periodRevenue += s.totalAmount;
      totalUnits += s.quantity;
      periodProfit += s.netProfit;
      periodCost += s.costTotal;
      totalDiscounts += s.discount;
    });

    const avgTicket = salesCount > 0 ? periodRevenue / salesCount : 0;
    const periodMargin = periodRevenue > 0 ? (periodProfit / periodRevenue) * 100 : 0;

    // 5. Aggregate by Product for Top Selling (exact match with WarehouseEfficiencyCharts.jsx lines 433-485)
    const productSalesMap = new Map<
      string,
      { id?: string; name: string; qty: number; revenue: number; profit: number; ordersCount: number; barcode?: string; unit?: string }
    >();

    filteredSales.forEach((s) => {
      const key = s.productId || s.productName;
      if (!productSalesMap.has(key)) {
        productSalesMap.set(key, {
          id: s.productId,
          name: s.productName,
          barcode: s.barcode,
          unit: s.unit,
          qty: 0,
          revenue: 0,
          profit: 0,
          ordersCount: 0,
        });
      }
      const item = productSalesMap.get(key)!;
      item.qty += s.quantity;
      item.revenue += s.totalAmount;
      item.profit += s.netProfit;
      item.ordersCount += 1;
    });

    const allAggregatedProducts = Array.from(productSalesMap.values()).sort((a, b) => b.qty - a.qty);
    const uniqueProductsCount = allAggregatedProducts.length;
    const topSellingProducts = allAggregatedProducts.slice(0, 10);

    // 6. Payment Method & Channels Breakdown (exact match with WarehouseEfficiencyCharts.jsx lines 600-673)
    const paymentBreakdown = {
      cash: 0,
      card: 0,
      terminal: 0,
      transfer: 0,
      credit: 0,
      debt: 0,
      deposit: 0,
    };

    const payMap = new Map<string, number>();
    const chanMap = new Map<string, number>();

    const normalizePayment = (val: string) => {
      if (!val) return 'Nağd';
      const lower = String(val).toLowerCase().trim();
      if (lower === 'nəqd' || lower === 'nağd' || lower === 'cash' || lower === 'neqd' || lower === 'nagd') {
        return 'Nağd';
      }
      if (lower.includes('terminal')) return 'Terminal';
      if (lower.includes('kart') || lower.includes('card')) return 'Kart';
      if (lower.includes('köçürmə') || lower.includes('kocurme') || lower.includes('transfer')) return 'Köçürmə';
      if (lower.includes('kredit') || lower.includes('birmarket')) return 'Kredit';
      if (lower.includes('nisyə') || lower.includes('nisye') || lower.includes('borc')) return 'Nisyə';
      if (lower.includes('beh') || lower.includes('avans')) return 'Beh';
      return String(val).trim();
    };

    filteredSales.forEach((s) => {
      const pay = normalizePayment(s.paymentMethod);
      payMap.set(pay, (payMap.get(pay) || 0) + s.totalAmount);

      if (pay === 'Nağd') paymentBreakdown.cash += s.totalAmount;
      else if (pay === 'Kart') paymentBreakdown.card += s.totalAmount;
      else if (pay === 'Terminal') paymentBreakdown.terminal += s.totalAmount;
      else if (pay === 'Kredit') paymentBreakdown.credit += s.totalAmount;
      else if (pay === 'Köçürmə') paymentBreakdown.transfer += s.totalAmount;
      else if (pay === 'Nisyə') paymentBreakdown.debt += s.totalAmount;
      else if (pay === 'Beh') paymentBreakdown.deposit += s.totalAmount;
      else paymentBreakdown.cash += s.totalAmount;

      const chan = s.channel || 'Mağaza';
      chanMap.set(chan, (chanMap.get(chan) || 0) + s.totalAmount);
    });

    const channelsBreakdown = Array.from(chanMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percent: periodRevenue > 0 ? (amount / periodRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const lowStockProducts = lowStockList
      .sort((a, b) => Number(a.stock_quantity || 0) - Number(b.stock_quantity || 0))
      .slice(0, 10);

    // 7. Timeline Data (Aggregate by Date for Sales Dynamics Chart — exact match with WarehouseEfficiencyCharts.jsx lines 514-554)
    const azMonths = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];
    const dateMap = new Map<
      string,
      {
        dateKey: string;
        label: string;
        revenue: number;
        quantity: number;
        profit: number;
        ordersCount: number;
      }
    >();

    // Pre-seed days for 7days so every day of the period is visible on the chart
    if (period === '7days') {
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const label = `${String(d.getDate()).padStart(2, '0')} ${azMonths[d.getMonth()]}`;
        dateMap.set(key, {
          dateKey: key,
          label,
          revenue: 0,
          quantity: 0,
          profit: 0,
          ordersCount: 0,
        });
      }
    }

    filteredSales.forEach((s) => {
      const d = s.date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = `${String(d.getDate()).padStart(2, '0')} ${azMonths[d.getMonth()]}`;

      if (!dateMap.has(key)) {
        dateMap.set(key, {
          dateKey: key,
          label,
          revenue: 0,
          quantity: 0,
          profit: 0,
          ordersCount: 0,
        });
      }
      const dayObj = dateMap.get(key)!;
      dayObj.revenue += s.totalAmount;
      dayObj.quantity += s.quantity;
      dayObj.profit += s.netProfit;
      dayObj.ordersCount += 1;
    });

    const timelineData = Array.from(dateMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    return {
      totalStockCost,
      totalStockRetail,
      potentialStockProfit,
      potentialMargin,
      lowStockCount,
      totalStockItems: products.length,
      periodRevenue,
      periodProfit,
      periodMargin,
      salesCount,
      totalUnits,
      uniqueProductsCount,
      avgTicket,
      totalDiscounts,
      paymentBreakdown,
      channelsBreakdown,
      topSellingProducts,
      allAggregatedProducts,
      timelineData,
      lowStockProducts,
    };
  }, [products, dispatches, period, canSeeCostPrices]);

  // Sorted top columns for the Web-style Vertical Column Chart
  const topColumnsData = useMemo(() => {
    const list = [...(stats.allAggregatedProducts || [])];
    list.sort((a, b) => {
      if (topChartSortBy === 'revenue') return b.revenue - a.revenue;
      if (topChartSortBy === 'profit') return b.profit - a.profit;
      return b.qty - a.qty;
    });
    return list.slice(0, 8).map((p) => {
      const val =
        topChartSortBy === 'quantity'
          ? p.qty
          : topChartSortBy === 'revenue'
          ? p.revenue
          : Math.max(0, p.profit);
      const displayValue =
        topChartSortBy === 'quantity'
          ? `${p.qty} əd`
          : topChartSortBy === 'revenue'
          ? `₼${p.revenue.toFixed(0)}`
          : `₼${p.profit.toFixed(0)}`;
      const subText =
        topChartSortBy === 'quantity'
          ? `₼${p.revenue.toFixed(0)}`
          : `${p.qty} əd`;
      return {
        ...p,
        value: val,
        displayValue,
        subText,
      };
    });
  }, [stats.allAggregatedProducts, topChartSortBy]);

  const currentWarehouseName = useMemo(() => {
    if (selectedWarehouseId === 'ALL') return 'Bütün Filiallar (Cəmi)';
    const found = warehouses.find((w) => w.id === selectedWarehouseId);
    return found ? found.name : 'Filial Seçin';
  }, [warehouses, selectedWarehouseId]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}
    >
      {/* 1. Header Bar with Warehouse Selector */}
      <View style={styles.headerCard}>
        {/* Warehouse Dropdown Button */}
        <TouchableOpacity
          style={styles.warehouseSelectorBtn}
          onPress={() => setWarehousePickerVisible(true)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Store size={18} color="#60A5FA" />
            <View>
              <Text style={styles.warehouseSelectorSub}>HESABATIN FİLİALI:</Text>
              <Text style={styles.warehouseSelectorTitle} numberOfLines={1}>
                {currentWarehouseName}
              </Text>
            </View>
          </View>
          <ChevronDown size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* 2. Period Filter Pills */}
      <View style={styles.periodRowWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodScrollContent}
        >
          <TouchableOpacity
            style={[styles.periodPill, period === 'today' && styles.periodPillActive]}
            onPress={() => setPeriod('today')}
          >
            <Text
              numberOfLines={1}
              style={[styles.periodText, period === 'today' && styles.periodTextActive]}
            >
              Bugün
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodPill, period === '7days' && styles.periodPillActive]}
            onPress={() => setPeriod('7days')}
          >
            <Text
              numberOfLines={1}
              style={[styles.periodText, period === '7days' && styles.periodTextActive]}
            >
              Son 7 gün
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodPill, period === '30days' && styles.periodPillActive]}
            onPress={() => setPeriod('30days')}
          >
            <Text
              numberOfLines={1}
              style={[styles.periodText, period === '30days' && styles.periodTextActive]}
            >
              Son 30 gün
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodPill, period === 'thisMonth' && styles.periodPillActive]}
            onPress={() => setPeriod('thisMonth')}
          >
            <Text
              numberOfLines={1}
              style={[styles.periodText, period === 'thisMonth' && styles.periodTextActive]}
            >
              Bu ay
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodPill, period === 'all' && styles.periodPillActive]}
            onPress={() => setPeriod('all')}
          >
            <Text
              numberOfLines={1}
              style={[styles.periodText, period === 'all' && styles.periodTextActive]}
            >
              Bütün dövr
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Hesabat göstəriciləri hesablanır...</Text>
        </View>
      ) : (
        <>
          {/* 3. Sales KPI Cards (for Selected Period) */}
          <Text style={styles.sectionHeaderTitle}>
            Dövr üzrə Satış və Qazanc (
            {period === 'today'
              ? 'Bugün'
              : period === '7days'
              ? '7 gün'
              : period === '30days'
              ? '30 gün'
              : period === 'thisMonth'
              ? 'Bu ay'
              : 'Cəmi'}
            )
          </Text>

          <View style={styles.kpiGrid}>
            {/* Revenue */}
            <View style={[styles.kpiCard, styles.kpiCardGreen]}>
              <View style={styles.kpiIconGreen}>
                <DollarSign size={18} color="#059669" />
              </View>
              <Text style={styles.kpiLabel}>CƏMİ DÖVRİYYƏ</Text>
              <Text style={styles.kpiValGreen} numberOfLines={1} adjustsFontSizeToFit>
                ₼{stats.periodRevenue.toFixed(2)}
              </Text>
              <Text style={styles.kpiSub}>
                {stats.salesCount} əməliyyat
              </Text>
            </View>

            {/* Net Profit */}
            <View style={[styles.kpiCard, styles.kpiCardIndigo]}>
              <View style={styles.kpiIconIndigo}>
                <TrendingUp size={18} color="#4F46E5" />
              </View>
              <Text style={styles.kpiLabel}>XALİS MƏNFƏƏT</Text>
              <Text style={styles.kpiValIndigo} numberOfLines={1} adjustsFontSizeToFit>
                {canSeeCostPrices
                  ? `${stats.periodProfit >= 0 ? '+' : ''}₼${stats.periodProfit.toFixed(2)}`
                  : '***'}
              </Text>
              <Text style={styles.kpiSub}>
                {canSeeCostPrices ? `${stats.periodMargin.toFixed(1)}% rentabellik` : 'Giriş məhduddur'}
              </Text>
            </View>
          </View>

          <View style={styles.kpiGrid}>
            {/* Units Sold */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiIconBlue}>
                <Package size={18} color="#2563EB" />
              </View>
              <Text style={styles.kpiLabel}>SATILAN MİQDAR</Text>
              <Text style={styles.kpiValDark} numberOfLines={1} adjustsFontSizeToFit>
                {stats.totalUnits} əd
              </Text>
              <Text style={[styles.kpiSub, { color: '#2563EB', fontWeight: '700' }]}>
                {stats.uniqueProductsCount} çeşid məhsul
              </Text>
            </View>

            {/* Average Ticket & Discounts */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiIconGray}>
                <Percent size={18} color="#7C3AED" />
              </View>
              <Text style={styles.kpiLabel}>ORTA ÇEK</Text>
              <Text style={styles.kpiValDark} numberOfLines={1} adjustsFontSizeToFit>
                ₼{stats.avgTicket.toFixed(2)}
              </Text>
              <Text style={styles.kpiSub}>
                Endirimlər: ₼{stats.totalDiscounts.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* 4. Warehouse Stock Valuation Cards */}
          <Text style={styles.sectionHeaderTitle}>Anbar və Qalıq Dəyərləri</Text>

          <View style={styles.kpiGrid}>
            {/* Total Stock Cost */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiIconGray}>
                <Package size={18} color="#374151" />
              </View>
              <Text style={styles.kpiLabel}>MƏHSUL MAYASI</Text>
              <Text style={styles.kpiValDark} numberOfLines={1} adjustsFontSizeToFit>
                {canSeeCostPrices ? `₼${stats.totalStockCost.toFixed(2)}` : '***'}
              </Text>
              <Text style={styles.kpiSub}>{stats.totalStockItems} çeşid məhsul</Text>
            </View>

            {/* Total Stock Retail */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiIconBlue}>
                <ArrowUpRight size={18} color="#2563EB" />
              </View>
              <Text style={styles.kpiLabel}>SATIŞ DƏYƏRİ</Text>
              <Text style={styles.kpiValBlue} numberOfLines={1} adjustsFontSizeToFit>
                ₼{stats.totalStockRetail.toFixed(2)}
              </Text>
              <Text style={styles.kpiSub}>
                {canSeeCostPrices
                  ? `Gözlənilən qazanc: ₼${stats.potentialStockProfit.toFixed(2)}`
                  : `${stats.totalStockItems} çeşid məhsul`}
              </Text>
            </View>
          </View>

          {/* 4.5. Web-Style Sales Dynamics & Efficiency Column Charts */}
          <View style={styles.cardBox}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={18} color="#2563EB" />
                <View>
                  <Text style={styles.cardHeaderTitle}>Satış Dinamikası (Günlər üzrə Qrafik)</Text>
                  <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600', marginTop: 1 }}>
                    Seçilmiş dövr ərzində gündəlik satış həcmi və dinamikası
                  </Text>
                </View>
              </View>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>LIVE</Text>
              </View>
            </View>

            {/* Metric Switcher: Satılan Miqdar (əd) | Satış Sayı (Çek) | Dövriyyə (₼) */}
            <View style={styles.chartFilterRow}>
              <TouchableOpacity
                style={[
                  styles.chartFilterPill,
                  timelineMetric === 'quantity' && styles.chartFilterPillActive,
                ]}
                onPress={() => setTimelineMetric('quantity')}
              >
                <Text
                  style={[
                    styles.chartFilterPillText,
                    timelineMetric === 'quantity' && styles.chartFilterPillTextActive,
                  ]}
                >
                  Satış Miqdarı (əd)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.chartFilterPill,
                  timelineMetric === 'orders' && styles.chartFilterPillActive,
                ]}
                onPress={() => setTimelineMetric('orders')}
              >
                <Text
                  style={[
                    styles.chartFilterPillText,
                    timelineMetric === 'orders' && styles.chartFilterPillTextActive,
                  ]}
                >
                  Çek Sayı ({stats.salesCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.chartFilterPill,
                  timelineMetric === 'revenue' && styles.chartFilterPillActive,
                ]}
                onPress={() => setTimelineMetric('revenue')}
              >
                <Text
                  style={[
                    styles.chartFilterPillText,
                    timelineMetric === 'revenue' && styles.chartFilterPillTextActive,
                  ]}
                >
                  Dövriyyə (₼)
                </Text>
              </TouchableOpacity>
            </View>

            {stats.timelineData.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Bu dövr üçün satış qeydə alınmayıb.</Text>
              </View>
            ) : (
              (() => {
                const maxVal = Math.max(
                  ...stats.timelineData.map((d) =>
                    timelineMetric === 'quantity'
                      ? d.quantity
                      : timelineMetric === 'orders'
                      ? d.ordersCount
                      : d.revenue
                  ),
                  1
                );
                const gridSteps = [1, 0.75, 0.5, 0.25, 0];
                const barPalette = [
                  '#2563EB',
                  '#4F46E5',
                  '#10B981',
                  '#8B5CF6',
                  '#06B6D4',
                  '#F59E0B',
                  '#EC4899',
                ];

                return (
                  <View style={styles.chartWrapperBox}>
                    {/* Y-Axis Grid Lines */}
                    <View style={styles.chartGridOverlay} pointerEvents="none">
                      {gridSteps.map((step, i) => {
                        const stepVal = maxVal * step;
                        const labelStr =
                          step === 0
                            ? '0'
                            : timelineMetric === 'revenue'
                            ? `₼${stepVal >= 100 ? Math.round(stepVal) : stepVal.toFixed(0)}`
                            : `${stepVal % 1 === 0 ? stepVal : stepVal.toFixed(1)} əd`;
                        return (
                          <View key={i} style={styles.chartGridLineRow}>
                            <Text style={styles.chartYAxisLabel}>{labelStr}</Text>
                            <View style={styles.chartDashedLine} />
                          </View>
                        );
                      })}
                    </View>

                    {/* Scrollable Vertical Bars */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chartColumnsScroll}
                    >
                      {stats.timelineData.map((day, idx) => {
                        const rawVal =
                          timelineMetric === 'quantity'
                            ? day.quantity
                            : timelineMetric === 'orders'
                            ? day.ordersCount
                            : day.revenue;
                        const heightPct = maxVal > 0 ? (rawVal / maxVal) * 100 : 0;
                        const barHeight = rawVal > 0 ? Math.max((heightPct / 100) * 148, 18) : 4;
                        const badgeText =
                          timelineMetric === 'quantity'
                            ? `${day.quantity} əd`
                            : timelineMetric === 'orders'
                            ? `${day.ordersCount} çek`
                            : `₼${day.revenue.toFixed(0)}`;
                        const subText =
                          timelineMetric === 'revenue'
                            ? `${day.quantity} əd`
                            : `₼${day.revenue.toFixed(0)}`;
                        const barColor =
                          rawVal === 0
                            ? '#E5E7EB'
                            : barPalette[idx % barPalette.length];

                        return (
                          <View key={day.dateKey} style={styles.chartColItem}>
                            <View style={styles.chartBarTrack}>
                              <View style={styles.chartValueBadge}>
                                <Text style={styles.chartValueBadgeText}>{badgeText}</Text>
                              </View>
                              <View
                                style={[
                                  styles.chartBarFill,
                                  {
                                    height: barHeight,
                                    backgroundColor: barColor,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.chartColDateLabel} numberOfLines={1}>
                              {day.label}
                            </Text>
                            <Text style={styles.chartColSubLabel} numberOfLines={1}>
                              {subText}
                            </Text>
                          </View>
                        );
                      })}
                    </ScrollView>

                    {/* Summary Footer Row */}
                    <View style={styles.chartSummaryFooter}>
                      <Text style={styles.chartSummaryLeft}>
                        Cəmi: {stats.totalUnits} əd ({stats.salesCount} əməliyyat)
                      </Text>
                      <Text style={styles.chartSummaryRight}>
                        Orta/gün:{' '}
                        {timelineMetric === 'revenue'
                          ? `₼${(stats.periodRevenue / Math.max(stats.timelineData.length, 1)).toFixed(1)}`
                          : timelineMetric === 'orders'
                          ? `${(stats.salesCount / Math.max(stats.timelineData.length, 1)).toFixed(1)} çek`
                          : `${(stats.totalUnits / Math.max(stats.timelineData.length, 1)).toFixed(1)} əd`}
                      </Text>
                    </View>
                  </View>
                );
              })()
            )}
          </View>

          {/* 4.6. Web-Style Top Selling Products Vertical Column Chart (Ən Çox Satılanlar Sütun Qrafiki) */}
          <View style={styles.cardBox}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Award size={18} color="#F59E0B" />
                <View>
                  <Text style={styles.cardHeaderTitle}>Ən Çox Satılanlar (Sütun Qrafiki)</Text>
                  <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600', marginTop: 1 }}>
                    Məhsulların satış həcmi və gəlirlilik qrafiki
                  </Text>
                </View>
              </View>
              <Text style={styles.cardHeaderBadge}>Top {topColumnsData.length}</Text>
            </View>

            {/* Sort Metric Switcher matching Web */}
            <View style={styles.chartFilterRow}>
              <TouchableOpacity
                style={[
                  styles.chartFilterPill,
                  topChartSortBy === 'quantity' && styles.chartFilterPillActive,
                ]}
                onPress={() => setTopChartSortBy('quantity')}
              >
                <Text
                  style={[
                    styles.chartFilterPillText,
                    topChartSortBy === 'quantity' && styles.chartFilterPillTextActive,
                  ]}
                >
                  Satış Miqdarı (əd)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.chartFilterPill,
                  topChartSortBy === 'revenue' && styles.chartFilterPillActive,
                ]}
                onPress={() => setTopChartSortBy('revenue')}
              >
                <Text
                  style={[
                    styles.chartFilterPillText,
                    topChartSortBy === 'revenue' && styles.chartFilterPillTextActive,
                  ]}
                >
                  Dövriyyə Məbləği (₼)
                </Text>
              </TouchableOpacity>

              {canSeeCostPrices && (
                <TouchableOpacity
                  style={[
                    styles.chartFilterPill,
                    topChartSortBy === 'profit' && styles.chartFilterPillActive,
                  ]}
                  onPress={() => setTopChartSortBy('profit')}
                >
                  <Text
                    style={[
                      styles.chartFilterPillText,
                      topChartSortBy === 'profit' && styles.chartFilterPillTextActive,
                    ]}
                  >
                    Mənfəət (₼)
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {topColumnsData.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Bu dövr üçün satış qeydə alınmayıb.</Text>
              </View>
            ) : (
              (() => {
                const maxVal = Math.max(...topColumnsData.map((d) => d.value), 1);
                const gridSteps = [1, 0.75, 0.5, 0.25, 0];
                const webColumnColors = [
                  '#F59E0B', // #1 Gold/Amber
                  '#4F46E5', // #2 Indigo/Blue
                  '#10B981', // #3 Emerald/Teal
                  '#A855F7', // #4 Purple
                  '#06B6D4', // #5 Cyan
                  '#F43F5E', // #6 Rose
                  '#EAB308', // #7 Yellow
                  '#3B82F6', // #8 Blue
                ];

                return (
                  <View style={styles.chartWrapperBox}>
                    {/* Y-Axis Grid Lines */}
                    <View style={styles.chartGridOverlay} pointerEvents="none">
                      {gridSteps.map((step, i) => {
                        const stepVal = maxVal * step;
                        const labelStr =
                          step === 0
                            ? '0'
                            : topChartSortBy === 'quantity'
                            ? `${stepVal.toFixed(1)} əd`
                            : `₼${stepVal >= 100 ? Math.round(stepVal) : stepVal.toFixed(0)}`;
                        return (
                          <View key={i} style={styles.chartGridLineRow}>
                            <Text style={styles.chartYAxisLabel}>{labelStr}</Text>
                            <View style={styles.chartDashedLine} />
                          </View>
                        );
                      })}
                    </View>

                    {/* Scrollable Vertical Product Columns */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chartColumnsScroll}
                    >
                      {topColumnsData.map((item, idx) => {
                        const heightPct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                        const barHeight = Math.max((heightPct / 100) * 148, 26);
                        const barColor = webColumnColors[idx % webColumnColors.length];

                        return (
                          <View key={item.id || idx} style={styles.topChartColItem}>
                            <View style={styles.chartBarTrack}>
                              <View style={styles.chartValueBadge}>
                                <Text style={styles.chartValueBadgeText}>{item.displayValue}</Text>
                              </View>
                              <View
                                style={[
                                  styles.topChartBarFill,
                                  {
                                    height: barHeight,
                                    backgroundColor: barColor,
                                  },
                                ]}
                              >
                                <Text style={styles.topChartRankInside}>#{idx + 1}</Text>
                              </View>
                            </View>
                            <Text style={styles.topChartProdLabel} numberOfLines={2}>
                              {item.name}
                            </Text>
                            <Text style={styles.chartColSubLabel} numberOfLines={1}>
                              {item.subText}
                            </Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                );
              })()
            )}
          </View>

          {/* 5. Payment Methods Breakdown Card */}
          <View style={styles.cardBox}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CreditCard size={18} color="#2563EB" />
                <Text style={styles.cardHeaderTitle}>Ödəniş Üsulları üzrə Bölgü</Text>
              </View>
              <Text style={styles.cardHeaderTotal}>
                Cəmi: ₼{stats.periodRevenue.toFixed(2)}
              </Text>
            </View>

            <View style={styles.payMethodsList}>
              {/* Cash */}
              <View style={styles.payRow}>
                <View style={styles.payLeft}>
                  <View style={[styles.payDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.payName}>Nağd (Kassa)</Text>
                </View>
                <Text style={styles.payVal}>
                  ₼{stats.paymentBreakdown.cash.toFixed(2)}
                </Text>
              </View>

              {/* Card / Terminal */}
              <View style={styles.payRow}>
                <View style={styles.payLeft}>
                  <View style={[styles.payDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={styles.payName}>Kart / POS Terminal</Text>
                </View>
                <Text style={styles.payVal}>
                  ₼{(stats.paymentBreakdown.card + stats.paymentBreakdown.terminal).toFixed(2)}
                </Text>
              </View>

              {/* Credit / Installments */}
              <View style={styles.payRow}>
                <View style={styles.payLeft}>
                  <View style={[styles.payDot, { backgroundColor: '#8B5CF6' }]} />
                  <Text style={styles.payName}>Kredit / Hissəli (Bank)</Text>
                </View>
                <Text style={styles.payVal}>
                  ₼{stats.paymentBreakdown.credit.toFixed(2)}
                </Text>
              </View>

              {/* Bank Transfer */}
              <View style={styles.payRow}>
                <View style={styles.payLeft}>
                  <View style={[styles.payDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.payName}>Bank Köçürməsi</Text>
                </View>
                <Text style={styles.payVal}>
                  ₼{stats.paymentBreakdown.transfer.toFixed(2)}
                </Text>
              </View>

              {/* Debt / Nisyə */}
              {stats.paymentBreakdown.debt > 0 && (
                <View style={styles.payRow}>
                  <View style={styles.payLeft}>
                    <View style={[styles.payDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.payName}>Nisyə (Borc)</Text>
                  </View>
                  <Text style={styles.payVal}>
                    ₼{stats.paymentBreakdown.debt.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Deposit / Advance */}
              {stats.paymentBreakdown.deposit > 0 && (
                <View style={styles.payRow}>
                  <View style={styles.payLeft}>
                    <View style={[styles.payDot, { backgroundColor: '#EC4899' }]} />
                    <Text style={styles.payName}>Beh (Avans)</Text>
                  </View>
                  <Text style={styles.payVal}>
                    ₼{stats.paymentBreakdown.deposit.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 5.5. Sales Channels Breakdown Card */}
          {stats.channelsBreakdown.length > 0 && (
            <View style={styles.cardBox}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Store size={18} color="#10B981" />
                  <Text style={styles.cardHeaderTitle}>Satış Kanalları üzrə Bölgü</Text>
                </View>
                <Text style={styles.cardHeaderBadge}>
                  {stats.channelsBreakdown.length} kanal
                </Text>
              </View>

              <View style={styles.payMethodsList}>
                {stats.channelsBreakdown.map((ch, idx) => (
                  <View key={idx} style={styles.payRow}>
                    <View style={styles.payLeft}>
                      <View
                        style={[
                          styles.payDot,
                          {
                            backgroundColor:
                              idx === 0
                                ? '#2563EB'
                                : idx === 1
                                ? '#E1306C'
                                : idx === 2
                                ? '#10B981'
                                : '#F59E0B',
                          },
                        ]}
                      />
                      <Text style={styles.payName}>{ch.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#6B7280' }}>
                        {ch.percent.toFixed(1)}%
                      </Text>
                      <Text style={styles.payVal}>₼{ch.amount.toFixed(2)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 6. Top Selling Products */}
          <View style={styles.cardBox}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Award size={18} color="#F59E0B" />
                <Text style={styles.cardHeaderTitle}>Ən Çox Satılan Mallar</Text>
              </View>
              <Text style={styles.cardHeaderBadge}>
                {stats.uniqueProductsCount} çeşid
              </Text>
            </View>

            {stats.topSellingProducts.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Bu dövr üçün satış qeydə alınmayıb.</Text>
              </View>
            ) : (
              stats.topSellingProducts.map((item, idx) => (
                <View key={idx} style={styles.topProdRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>#{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.topProdName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.barcode ? (
                      <Text style={styles.topProdBarcode}>{item.barcode}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.topProdQty}>{item.qty} ədəd</Text>
                    <Text style={styles.topProdSum}>₼{item.revenue.toFixed(2)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* 7. Low Stock Alerts */}
          <View style={styles.cardBox}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="#EF4444" />
                <Text style={styles.cardHeaderTitle}>Kritik Həddə Olan Qalıqlar</Text>
              </View>
              <View style={styles.dangerCountBadge}>
                <Text style={styles.dangerCountText}>{stats.lowStockCount}</Text>
              </View>
            </View>

            {stats.lowStockProducts.length === 0 ? (
              <View style={styles.emptyBox}>
                <CheckCircle2 size={24} color="#10B981" />
                <Text style={styles.emptyText}>Bütün malların stoku qənaətbəxşdir!</Text>
              </View>
            ) : (
              stats.lowStockProducts.map((prod) => (
                <View key={prod.id} style={styles.lowStockRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.lowStockName} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <Text style={styles.lowStockSub}>
                      Kritik hədd: {prod.critical_stock || 15} {prod.unit || 'əd.'}
                    </Text>
                  </View>
                  <View style={styles.stockDangerBadge}>
                    <Text style={styles.stockDangerVal}>
                      {Number(prod.stock_quantity || 0)} {prod.unit || 'əd.'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {/* Warehouse Picker Modal */}
      <WarehousePickerModal
        visible={warehousePickerVisible}
        warehouses={warehouses}
        activeWarehouseId={selectedWarehouseId}
        onSelectWarehouse={handleSelectWarehouse}
        onClose={() => setWarehousePickerVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  headerCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '500',
  },
  warehouseSelectorBtn: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#374151',
  },
  warehouseSelectorSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  warehouseSelectorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F9FAFB',
    marginTop: 2,
  },
  periodRowWrapper: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 3,
  },
  periodScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '100%',
  },
  periodPill: {
    flexGrow: 1,
    flexShrink: 0,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  periodPillActive: {
    backgroundColor: '#111827',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  periodTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    marginTop: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  kpiCardGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  kpiCardIndigo: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  kpiIconGreen: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiIconIndigo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiIconGray: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiIconBlue: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  kpiValGreen: {
    fontSize: 18,
    fontWeight: '900',
    color: '#065F46',
  },
  kpiValIndigo: {
    fontSize: 18,
    fontWeight: '900',
    color: '#3730A3',
  },
  kpiValDark: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  kpiValBlue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E40AF',
  },
  kpiSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2,
  },
  cardBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  cardHeaderTotal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  cardHeaderBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  payMethodsList: {
    gap: 10,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  payLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  payName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  payVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  topProdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
  },
  topProdName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  topProdBarcode: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  topProdQty: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  topProdSum: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 1,
  },
  lowStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  lowStockName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  lowStockSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  stockDangerBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockDangerVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  emptyBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  dangerCountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dangerCountText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  livePillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.4,
  },
  chartFilterRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 11,
    padding: 3,
    gap: 4,
  },
  chartFilterPill: {
    flex: 1,
    paddingVertical: 6.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  chartFilterPillActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  chartFilterPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
  },
  chartFilterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  chartWrapperBox: {
    backgroundColor: '#FAFAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 10,
    position: 'relative',
  },
  chartGridOverlay: {
    position: 'absolute',
    top: 28,
    left: 10,
    right: 10,
    height: 148,
    justifyContent: 'space-between',
    zIndex: 0,
  },
  chartGridLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartYAxisLabel: {
    width: 38,
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    textAlign: 'right',
  },
  chartDashedLine: {
    flex: 1,
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  chartColumnsScroll: {
    paddingLeft: 44,
    paddingRight: 8,
    alignItems: 'flex-end',
    gap: 10,
  },
  chartColItem: {
    width: 48,
    alignItems: 'center',
  },
  topChartColItem: {
    width: 68,
    alignItems: 'center',
  },
  chartBarTrack: {
    height: 176,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 1,
  },
  chartValueBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chartValueBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#111827',
  },
  chartBarFill: {
    width: 28,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  topChartBarFill: {
    width: 36,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 5,
  },
  topChartRankInside: {
    fontSize: 9.5,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.92)',
  },
  chartColDateLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
    marginTop: 6,
    textAlign: 'center',
  },
  topChartProdLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 12,
    height: 24,
  },
  chartColSubLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  chartSummaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  chartSummaryLeft: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  chartSummaryRight: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2563EB',
  },
});

