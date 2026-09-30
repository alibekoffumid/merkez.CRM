import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Activity, 
  Calendar, 
  DollarSign, 
  Package, 
  Layers, 
  Award, 
  ArrowUpRight, 
  Tag, 
  CreditCard, 
  ShoppingBag, 
  Store, 
  Search,
  Sparkles,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { formatUnitName } from './SaleDetailModal';

const PERIODS = [
  { id: 'today', labelAz: 'Bugün', labelRu: 'Сегодня', labelEn: 'Today' },
  { id: '7days', labelAz: 'Son 7 gün', labelRu: '7 дней', labelEn: '7 days' },
  { id: '30days', labelAz: 'Son 30 gün', labelRu: '30 дней', labelEn: '30 days' },
  { id: 'thisMonth', labelAz: 'Bu ay', labelRu: 'Этот месяц', labelEn: 'This month' },
  { id: 'all', labelAz: 'Bütün dövr', labelRu: 'Все время', labelEn: 'All time' }
];

const TABS = [
  { id: 'top_products', icon: Award, labelAz: 'Ən Çox Satılanlar', labelRu: 'Топ продаж', labelEn: 'Top Products' },
  { id: 'timeline', icon: BarChart3, labelAz: 'Satış Dinamikası', labelRu: 'Динамика продаж', labelEn: 'Timeline' },
  { id: 'categories', icon: Layers, labelAz: 'Kateqoriyalar', labelRu: 'По категориям', labelEn: 'Categories' },
  { id: 'margins', icon: TrendingUp, labelAz: 'Mənfəət və Marja', labelRu: 'Прибыль и маржа', labelEn: 'Profit & Margin' },
  { id: 'channels', icon: CreditCard, labelAz: 'Ödəniş və Kanallar', labelRu: 'Оплата и каналы', labelEn: 'Payment & Channels' }
];

const WarehouseEfficiencyCharts = ({ 
  dispatches = [], 
  products = [], 
  categories = [] 
}) => {
  const { i18n } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [activeTab, setActiveTab] = useState('top_products');
  const [topSortBy, setTopSortBy] = useState('quantity'); // 'quantity' | 'revenue' | 'profit'
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Process all sales dispatches with product information
  const parsedSales = useMemo(() => {
    const prodMap = new Map();
    (products || []).forEach(p => {
      if (p?.id) prodMap.set(p.id, p);
    });

    const catMap = new Map();
    (categories || []).forEach(c => {
      if (c?.id) catMap.set(c.id, c.name);
    });

    return (dispatches || [])
      .filter(d => {
        // Dispatches marked as sale or negative quantity sales
        const isSaleReason = !d.reason || d.reason === 'sale';
        const qty = Math.abs(parseFloat(d.quantity) || 0);
        return isSaleReason && qty > 0;
      })
      .map(d => {
        const prod = d.products || prodMap.get(d.product_id) || {};
        const qty = Math.abs(parseFloat(d.quantity) || 1);
        const prodPrice = parseFloat(prod.price) || 0;
        const purchasePrice = parseFloat(prod.purchase_price) || 0;
        const note = d.notes || '';

        // Extract metadata from notes if present
        let unitPrice = prodPrice;
        const priceMatch = note.match(/\[Qiymət:\s*([\d.,]+)\s*₼\]/i);
        if (priceMatch) {
          unitPrice = parseFloat(priceMatch[1].replace(',', '.')) || prodPrice;
        }

        let discount = 0;
        const discMatch = note.match(/\[(?:Endirim|Скидка|Discount):\s*([\d.,]+)\s*₼\]/i);
        if (discMatch) {
          discount = parseFloat(discMatch[1].replace(',', '.')) || 0;
        }

        let totalAmount = 0;
        const totalMatch = note.match(/\[(?:Cəmi|Məbləğ):\s*([\d.,]+)\s*₼\]/i);
        if (totalMatch) {
          totalAmount = parseFloat(totalMatch[1].replace(',', '.')) || 0;
        } else {
          totalAmount = Math.max(0, (unitPrice * qty) - discount);
        }

        let paymentMethod = 'Nəqd';
        const payMatch = note.match(/Ödəniş:\s*([^,\])]+)/i);
        if (payMatch) {
          paymentMethod = payMatch[1].trim();
        }

        let channel = 'Mağaza';
        const chanMatch = note.match(/\[Kanal:\s*([^\]]+)\]/i);
        if (chanMatch) {
          channel = chanMatch[1].trim();
        }

        const costTotal = purchasePrice * qty;
        const netProfit = totalAmount - costTotal;
        const profitMargin = totalAmount > 0 ? (netProfit / totalAmount) * 100 : 0;

        const dateObj = new Date(d.issued_at || d.created_at || Date.now());

        return {
          id: d.id,
          date: dateObj,
          timestamp: dateObj.getTime(),
          productId: d.product_id,
          productName: prod.name || 'Naməlum məhsul',
          barcode: prod.barcode || '',
          unit: prod.unit || 'pcs',
          categoryId: prod.category_id,
          categoryName: catMap.get(prod.category_id) || 'Kateqoriyasız',
          quantity: qty,
          unitPrice,
          purchasePrice,
          totalAmount,
          discount,
          costTotal,
          netProfit,
          profitMargin,
          paymentMethod,
          channel
        };
      });
  }, [dispatches, products, categories]);

  // 2. Filter sales by selected time period
  const filteredSales = useMemo(() => {
    if (selectedPeriod === 'all') return parsedSales;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let cutoff = 0;
    if (selectedPeriod === 'today') {
      cutoff = startOfToday;
    } else if (selectedPeriod === '7days') {
      cutoff = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    } else if (selectedPeriod === '30days') {
      cutoff = now.getTime() - (30 * 24 * 60 * 60 * 1000);
    } else if (selectedPeriod === 'thisMonth') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    }

    return parsedSales.filter(s => s.timestamp >= cutoff);
  }, [parsedSales, selectedPeriod]);

  // 3. Overall KPI Metrics for selected period
  const summary = useMemo(() => {
    let totalRevenue = 0;
    let totalUnits = 0;
    let totalProfit = 0;
    let totalCost = 0;
    let totalDiscounts = 0;
    const transactions = filteredSales.length;

    filteredSales.forEach(s => {
      totalRevenue += s.totalAmount;
      totalUnits += s.quantity;
      totalProfit += s.netProfit;
      totalCost += s.costTotal;
      totalDiscounts += s.discount;
    });

    const avgTicket = transactions > 0 ? totalRevenue / transactions : 0;
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalUnits,
      totalProfit,
      totalCost,
      totalDiscounts,
      transactions,
      avgTicket,
      overallMargin
    };
  }, [filteredSales]);

  // 4. Aggregate by Product for Top Selling Chart
  const productAggregates = useMemo(() => {
    const map = new Map();

    filteredSales.forEach(s => {
      const key = s.productId || s.productName;
      if (!map.has(key)) {
        map.set(key, {
          id: s.productId,
          name: s.productName,
          barcode: s.barcode,
          unit: s.unit,
          categoryName: s.categoryName,
          quantity: 0,
          revenue: 0,
          profit: 0,
          ordersCount: 0,
          avgPrice: s.unitPrice
        });
      }
      const item = map.get(key);
      item.quantity += s.quantity;
      item.revenue += s.totalAmount;
      item.profit += s.netProfit;
      item.ordersCount += 1;
    });

    let list = Array.from(map.values());

    // Calculate share
    const maxQty = Math.max(...list.map(i => i.quantity), 1);
    const maxRev = Math.max(...list.map(i => i.revenue), 1);
    const maxProfit = Math.max(...list.map(i => i.profit), 1);

    list = list.map(item => ({
      ...item,
      margin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
      shareRevenue: summary.totalRevenue > 0 ? (item.revenue / summary.totalRevenue) * 100 : 0,
      shareQuantity: summary.totalUnits > 0 ? (item.quantity / summary.totalUnits) * 100 : 0,
      qtyBarPercent: (item.quantity / maxQty) * 100,
      revBarPercent: (item.revenue / maxRev) * 100,
      profitBarPercent: item.profit > 0 ? (item.profit / maxProfit) * 100 : 0
    }));

    // Sort based on user selection
    if (topSortBy === 'quantity') {
      list.sort((a, b) => b.quantity - a.quantity);
    } else if (topSortBy === 'revenue') {
      list.sort((a, b) => b.revenue - a.revenue);
    } else if (topSortBy === 'profit') {
      list.sort((a, b) => b.profit - a.profit);
    }

    return list;
  }, [filteredSales, topSortBy, summary]);

  // 5. Aggregate by Date for Timeline Chart
  const timelineData = useMemo(() => {
    if (filteredSales.length === 0) return [];

    const dateMap = new Map();

    // Group sales by YYYY-MM-DD
    filteredSales.forEach(s => {
      const d = s.date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString(i18n.language === 'az' ? 'az-AZ' : 'ru-RU', { day: 'numeric', month: 'short' });

      if (!dateMap.has(key)) {
        dateMap.set(key, {
          dateKey: key,
          label,
          revenue: 0,
          quantity: 0,
          profit: 0,
          ordersCount: 0
        });
      }
      const dayObj = dateMap.get(key);
      dayObj.revenue += s.totalAmount;
      dayObj.quantity += s.quantity;
      dayObj.profit += s.netProfit;
      dayObj.ordersCount += 1;
    });

    const sortedDays = Array.from(dateMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    const maxDayRev = Math.max(...sortedDays.map(d => d.revenue), 1);

    return sortedDays.map(d => ({
      ...d,
      heightPercent: (d.revenue / maxDayRev) * 100
    }));
  }, [filteredSales, i18n.language]);

  // 6. Aggregate by Category
  const categoryData = useMemo(() => {
    const catMap = new Map();

    filteredSales.forEach(s => {
      const cat = s.categoryName || 'Kateqoriyasız';
      if (!catMap.has(cat)) {
        catMap.set(cat, {
          name: cat,
          revenue: 0,
          quantity: 0,
          profit: 0,
          count: 0
        });
      }
      const c = catMap.get(cat);
      c.revenue += s.totalAmount;
      c.quantity += s.quantity;
      c.profit += s.netProfit;
      c.count += 1;
    });

    const list = Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue);
    const maxCatRev = Math.max(...list.map(c => c.revenue), 1);

    return list.map(c => ({
      ...c,
      share: summary.totalRevenue > 0 ? (c.revenue / summary.totalRevenue) * 100 : 0,
      barPercent: (c.revenue / maxCatRev) * 100
    }));
  }, [filteredSales, summary]);

  // 7. Aggregate by Payment Method and Channels
  const paymentAndChannels = useMemo(() => {
    const payMap = new Map();
    const chanMap = new Map();

    filteredSales.forEach(s => {
      // Payment
      const pay = s.paymentMethod || 'Nəqd';
      payMap.set(pay, (payMap.get(pay) || 0) + s.totalAmount);

      // Channel
      const chan = s.channel || 'Mağaza';
      chanMap.set(chan, (chanMap.get(chan) || 0) + s.totalAmount);
    });

    const payments = Array.from(payMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percent: summary.totalRevenue > 0 ? (amount / summary.totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const channels = Array.from(chanMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percent: summary.totalRevenue > 0 ? (amount / summary.totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return { payments, channels };
  }, [filteredSales, summary]);

  // Search filtered products for the table
  const searchFilteredProducts = useMemo(() => {
    if (!searchQuery) return productAggregates;
    const q = searchQuery.toLowerCase();
    return productAggregates.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(q))
    );
  }, [productAggregates, searchQuery]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100/90 shadow-sm overflow-hidden mb-6 transition-all">
      {/* 1. Header with Period Picker */}
      <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-gray-50/70 via-white to-blue-50/30">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>{i18n.language === 'az' ? 'Satış və Effektivlik Qrafikləri' : i18n.language === 'ru' ? 'Графики продаж и эффективности' : 'Sales & Efficiency Analytics'}</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 tracking-wider">
                  Live
                </span>
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {i18n.language === 'az' 
                  ? 'Məhsulların satış həcmi, gəlirlilik və ən çox satılan malların analitikası' 
                  : i18n.language === 'ru'
                  ? 'Аналитика объемов продаж, прибыльности и самых продаваемых товаров'
                  : 'Product sales volume, profitability and top selling items'}
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl self-start md:self-auto overflow-x-auto max-w-full">
          {PERIODS.map(p => {
            const isSelected = selectedPeriod === p.id;
            const label = i18n.language === 'az' ? p.labelAz : i18n.language === 'ru' ? p.labelRu : p.labelEn;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-white text-gray-900 shadow-sm font-black'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Key Sales Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-gray-100 border-b border-gray-100">
        {/* Total Turnover */}
        <div className="bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {i18n.language === 'az' ? 'Cəmi Dövriyyə' : i18n.language === 'ru' ? 'Выручка' : 'Turnover'}
            </span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
            ₼{summary.totalRevenue.toFixed(2)}
          </div>
          <p className="text-[10px] font-bold text-gray-400 mt-0.5">
            {summary.transactions} {i18n.language === 'az' ? 'əməliyyat' : i18n.language === 'ru' ? 'продаж' : 'sales'}
          </p>
        </div>

        {/* Units Sold */}
        <div className="bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {i18n.language === 'az' ? 'Satılan Miqdar' : i18n.language === 'ru' ? 'Продано товаров' : 'Units Sold'}
            </span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
            {summary.totalUnits} <span className="text-xs font-bold text-gray-500">{formatUnitName('pcs', i18n.language)}</span>
          </div>
          <p className="text-[10px] font-bold text-blue-600 mt-0.5">
            {productAggregates.length} {i18n.language === 'az' ? 'çeşid məhsul' : 'видов товаров'}
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {i18n.language === 'az' ? 'Xalis Mənfəət' : i18n.language === 'ru' ? 'Чистая прибыль' : 'Net Profit'}
            </span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className={`text-lg sm:text-2xl font-black tracking-tight ${summary.totalProfit >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
            {summary.totalProfit >= 0 ? '+' : ''}₼{summary.totalProfit.toFixed(2)}
          </div>
          <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
            {summary.overallMargin.toFixed(1)}% {i18n.language === 'az' ? 'rentabellik' : 'маржа'}
          </p>
        </div>

        {/* Average Ticket */}
        <div className="bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {i18n.language === 'az' ? 'Orta Çek' : i18n.language === 'ru' ? 'Средний чек' : 'Avg Ticket'}
            </span>
            <ShoppingBag className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
            ₼{summary.avgTicket.toFixed(2)}
          </div>
          <p className="text-[10px] font-bold text-gray-400 mt-0.5">
            {i18n.language === 'az' ? 'Hər müştəriyə düşən' : 'На одного клиента'}
          </p>
        </div>

        {/* Discounts */}
        <div className="bg-white p-4 sm:p-5 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {i18n.language === 'az' ? 'Endirimlər' : i18n.language === 'ru' ? 'Скидки' : 'Discounts'}
            </span>
            <Tag className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
            ₼{summary.totalDiscounts.toFixed(2)}
          </div>
          <p className="text-[10px] font-bold text-rose-600 mt-0.5">
            {summary.totalDiscounts > 0 ? (i18n.language === 'az' ? 'Güzəşt tətbiq olunub' : 'Предоставлено скидок') : '0.00 ₼'}
          </p>
        </div>
      </div>

      {/* 3. Interactive Chart Switcher Tabs */}
      <div className="px-5 pt-4 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const label = i18n.language === 'az' ? tab.labelAz : i18n.language === 'ru' ? tab.labelRu : tab.labelEn;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-sm font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-t-lg'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Chart Views Content */}
      <div className="p-5 sm:p-6">
        {filteredSales.length === 0 ? (
          <div className="py-14 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center mb-3">
              <Package className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-gray-800">
              {i18n.language === 'az' ? 'Seçilmiş dövrdə heç bir satış qeydiyyatı yoxdur' : 'Нет записей продаж за выбранный период'}
            </h4>
            <p className="text-xs text-gray-400 max-w-sm mt-1 mb-4">
              {i18n.language === 'az' 
                ? 'Daha geniş dövr seçin və ya "Bütün dövr" düyməsinə klikləyərək ümumi statistikaya baxın.' 
                : 'Выберите другой период или "Все время" для просмотра общей статистики.'}
            </p>
            <button
              onClick={() => setSelectedPeriod('all')}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              {i18n.language === 'az' ? 'Bütün dövrü göstər' : 'Показать за все время'}
            </button>
          </div>
        ) : (
          <>
            {/* TAB 1: TOP PRODUCTS */}
            {activeTab === 'top_products' && (
              <div className="space-y-6">
                {/* Sub-filter: Sort by quantity vs revenue vs profit */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-500 mr-1">
                      {i18n.language === 'az' ? 'Sıralama:' : 'Сортировка:'}
                    </span>
                    <button
                      onClick={() => setTopSortBy('quantity')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        topSortBy === 'quantity'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {i18n.language === 'az' ? 'Satış Miqdarı (əd)' : 'По количеству (шт)'}
                    </button>
                    <button
                      onClick={() => setTopSortBy('revenue')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        topSortBy === 'revenue'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {i18n.language === 'az' ? 'Dövriyyə Məbləği (₼)' : 'По сумме (₼)'}
                    </button>
                    <button
                      onClick={() => setTopSortBy('profit')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        topSortBy === 'profit'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {i18n.language === 'az' ? 'Mənfəət (₼)' : 'По прибыли (₼)'}
                    </button>
                  </div>

                  <div className="text-xs text-gray-400 font-medium">
                    {i18n.language === 'az' 
                      ? `Ümumi ${productAggregates.length} adda məhsul satılıb` 
                      : `Всего продано ${productAggregates.length} наименований`}
                  </div>
                </div>

                {/* Visual Ranking Bars (Top 5-10) */}
                <div className="space-y-3">
                  {productAggregates.slice(0, 10).map((prod, idx) => {
                    const unitStr = formatUnitName(prod.unit, i18n.language);
                    const barPercent = topSortBy === 'quantity' 
                      ? prod.qtyBarPercent 
                      : topSortBy === 'revenue' 
                      ? prod.revBarPercent 
                      : prod.profitBarPercent;

                    const rankColors = [
                      'from-amber-500 to-yellow-400 text-white', // #1 Gold
                      'from-slate-400 to-gray-300 text-white',    // #2 Silver
                      'from-amber-700 to-amber-600 text-white',   // #3 Bronze
                    ];
                    const rankBadgeColor = rankColors[idx] || 'bg-gray-100 text-gray-600';

                    return (
                      <div 
                        key={prod.id || idx}
                        className="p-3.5 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Rank badge */}
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${idx < 3 ? `bg-gradient-to-br ${rankBadgeColor} shadow-sm` : rankBadgeColor}`}>
                              {idx + 1}
                            </div>
                            
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                  {prod.name}
                                </h4>
                                {prod.categoryName && (
                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-block">
                                    {prod.categoryName}
                                  </span>
                                )}
                              </div>
                              {prod.barcode && (
                                <p className="text-[10px] font-mono text-gray-400">
                                  {prod.barcode}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Metric values */}
                          <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right">
                            <div>
                              <p className="text-xs font-black text-gray-900">
                                {prod.quantity} <span className="text-[10px] font-bold text-gray-500">{unitStr}</span>
                              </p>
                              <p className="text-[10px] font-semibold text-gray-400">
                                {prod.shareQuantity.toFixed(1)}% {i18n.language === 'az' ? 'həcm' : 'объем'}
                              </p>
                            </div>

                            <div className="min-w-[80px]">
                              <p className="text-xs sm:text-sm font-black text-emerald-600">
                                ₼{prod.revenue.toFixed(2)}
                              </p>
                              <p className="text-[10px] font-semibold text-gray-400">
                                {prod.shareRevenue.toFixed(1)}% {i18n.language === 'az' ? 'pay' : 'доля'}
                              </p>
                            </div>

                            <div className="min-w-[70px] hidden md:block">
                              <p className={`text-xs font-black ${prod.profit >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {prod.profit >= 0 ? '+' : ''}₼{prod.profit.toFixed(2)}
                              </p>
                              <p className="text-[10px] font-semibold text-gray-400">
                                {prod.margin.toFixed(1)}% {i18n.language === 'az' ? 'marja' : 'маржа'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Animated Visual Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              idx === 0 
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400' 
                                : idx === 1 
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                                : idx === 2 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                : 'bg-gradient-to-r from-blue-400 to-blue-500'
                            }`}
                            style={{ width: `${Math.max(barPercent, 3)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detailed Table for all sold items */}
                {productAggregates.length > 10 && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <h4 className="text-sm font-black text-gray-900">
                        {i18n.language === 'az' ? 'Bütün Satılan Məhsulların Siyahısı' : 'Полный список проданных товаров'}
                      </h4>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder={i18n.language === 'az' ? 'Məhsul adı və ya barkod...' : 'Название или штрихкод...'}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg outline-none focus:border-blue-500 w-56 bg-gray-50/50"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-gray-100 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                            <th className="p-3">#</th>
                            <th className="p-3">{i18n.language === 'az' ? 'Məhsul' : 'Товар'}</th>
                            <th className="p-3">{i18n.language === 'az' ? 'Kateqoriya' : 'Категория'}</th>
                            <th className="p-3 text-right">{i18n.language === 'az' ? 'Satış Miqdarı' : 'Продано'}</th>
                            <th className="p-3 text-right">{i18n.language === 'az' ? 'Cəmi Məbləğ' : 'Сумма'}</th>
                            <th className="p-3 text-right">{i18n.language === 'az' ? 'Xalis Mənfəət' : 'Прибыль'}</th>
                            <th className="p-3 text-right">{i18n.language === 'az' ? 'Marja' : 'Маржа'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 font-medium">
                          {searchFilteredProducts.map((p, i) => (
                            <tr key={p.id || i} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-3 font-bold text-gray-400">{i + 1}</td>
                              <td className="p-3">
                                <div className="font-bold text-gray-900">{p.name}</div>
                                {p.barcode && <div className="text-[10px] text-gray-400 font-mono">{p.barcode}</div>}
                              </td>
                              <td className="p-3 text-gray-500">{p.categoryName}</td>
                              <td className="p-3 text-right font-black text-gray-900">
                                {p.quantity} {formatUnitName(p.unit, i18n.language)}
                              </td>
                              <td className="p-3 text-right font-black text-emerald-600">
                                ₼{p.revenue.toFixed(2)}
                              </td>
                              <td className="p-3 text-right font-black text-amber-600">
                                {p.profit >= 0 ? '+' : ''}₼{p.profit.toFixed(2)}
                              </td>
                              <td className="p-3 text-right font-bold text-gray-500">
                                {p.margin.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SALES DYNAMICS / TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-gray-900">
                      {i18n.language === 'az' ? 'Günlər üzrə Satış Dövriyyəsi' : 'Динамика продаж по дням'}
                    </h4>
                    <p className="text-xs text-gray-400 font-medium">
                      {i18n.language === 'az' ? 'Gündəlik satış məbləğləri və trend' : 'Суммы продаж и тенденции'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      {i18n.language === 'az' ? 'Ən Yüksək Gün' : 'Пиковый день'}
                    </span>
                    <p className="text-sm font-black text-emerald-600">
                      {timelineData.length > 0 
                        ? `₼${Math.max(...timelineData.map(d => d.revenue)).toFixed(2)}` 
                        : '0.00 ₼'}
                    </p>
                  </div>
                </div>

                {/* Timeline Bar Chart */}
                <div className="w-full pt-8 pb-2">
                  <div className="flex items-end gap-1.5 sm:gap-3 h-64 border-b border-gray-100 pb-3 w-full overflow-x-auto">
                    {timelineData.map((day, idx) => (
                      <div 
                        key={day.dateKey || idx} 
                        className="flex-1 min-w-[28px] max-w-[64px] flex flex-col items-center group relative h-full justify-end"
                      >
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg whitespace-nowrap pointer-events-none transition-all z-20 shadow-xl">
                          <p className="text-emerald-400 font-black">₼{day.revenue.toFixed(2)}</p>
                          <p className="text-gray-300">{day.quantity} {formatUnitName('pcs', i18n.language)} ({day.ordersCount} {i18n.language === 'az' ? 'satış' : 'чек.'})</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>

                        {/* Bar background */}
                        <div className="w-full h-full bg-blue-50/40 rounded-t-xl relative flex items-end overflow-hidden hover:bg-blue-100/60 transition-colors">
                          <div 
                            className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-xl transition-all duration-700 ease-out group-hover:from-emerald-500 group-hover:to-teal-400"
                            style={{ height: `${Math.max(day.heightPercent, 4)}%` }}
                          />
                        </div>

                        <span className="text-[10px] text-gray-400 font-bold mt-2 truncate w-full text-center">
                          {day.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 font-medium">
                  <span>← {timelineData[0]?.label || ''}</span>
                  <span className="text-gray-500 font-bold">
                    {i18n.language === 'az' ? 'Gündəlik orta satış:' : 'Среднесуточный объем:'} ₼{(summary.totalRevenue / Math.max(timelineData.length, 1)).toFixed(2)}
                  </span>
                  <span>{timelineData[timelineData.length - 1]?.label || ''} →</span>
                </div>
              </div>
            )}

            {/* TAB 3: CATEGORIES DISTRIBUTION */}
            {activeTab === 'categories' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-gray-900">
                    {i18n.language === 'az' ? 'Kateqoriyalar üzrə Satış və Paylanma' : 'Продажи по категориям'}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">
                    {i18n.language === 'az' ? 'Hansı məhsul qrupları ən böyük gəlir gətirir' : 'Какие группы товаров приносят наибольший доход'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryData.map((cat, idx) => (
                    <div 
                      key={cat.name || idx}
                      className="p-4 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <h5 className="text-sm font-black text-gray-900">{cat.name}</h5>
                            <p className="text-[10px] text-gray-400 font-bold">
                              {cat.quantity} {formatUnitName('pcs', i18n.language)} {i18n.language === 'az' ? 'satılıb' : 'продано'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-600">₼{cat.revenue.toFixed(2)}</p>
                          <p className="text-[10px] font-bold text-gray-400">{cat.share.toFixed(1)}%</p>
                        </div>
                      </div>

                      <div className="w-full bg-gray-200/60 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-700"
                          style={{ width: `${Math.max(cat.share, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: PROFIT & MARGINS */}
            {activeTab === 'margins' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-gray-900">
                    {i18n.language === 'az' ? 'Məhsul Effektivliyi və Rentabellik' : 'Эффективность товаров и рентабельность'}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">
                    {i18n.language === 'az' 
                      ? 'Ən çox xalis qazanc gətirən və yüksək marjalı məhsullar' 
                      : 'Товары с максимальной чистой прибылью и высокой наценкой'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top profit products */}
                  <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/20 border border-amber-100/80 rounded-xl p-4">
                    <h5 className="text-xs font-black uppercase text-amber-700 tracking-wider mb-3 flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      {i18n.language === 'az' ? 'Ən Çox Xalis Qazanc Gətirənlər' : 'Топ по чистой прибыли'}
                    </h5>
                    <div className="space-y-2.5">
                      {[...productAggregates].sort((a, b) => b.profit - a.profit).slice(0, 5).map((p, i) => (
                        <div key={p.id || i} className="bg-white p-3 rounded-lg border border-amber-100/60 flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                            <p className="text-[10px] text-gray-400 font-medium">
                              {p.quantity} {formatUnitName(p.unit, i18n.language)} • Dövriyyə: ₼{p.revenue.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-amber-600">+₼{p.profit.toFixed(2)}</p>
                            <p className="text-[10px] font-bold text-emerald-600">{p.margin.toFixed(1)}% {i18n.language === 'az' ? 'marja' : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Highest margin % */}
                  <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/20 border border-emerald-100/80 rounded-xl p-4">
                    <h5 className="text-xs font-black uppercase text-emerald-700 tracking-wider mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      {i18n.language === 'az' ? 'Ən Yüksək Marjalı Məhsullar (%)' : 'Самые высокомаржинальные (%)'}
                    </h5>
                    <div className="space-y-2.5">
                      {[...productAggregates].filter(p => p.revenue > 10).sort((a, b) => b.margin - a.margin).slice(0, 5).map((p, i) => (
                        <div key={p.id || i} className="bg-white p-3 rounded-lg border border-emerald-100/60 flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                            <p className="text-[10px] text-gray-400 font-medium">
                              Maya: ₼{(p.revenue - p.profit).toFixed(2)} • Satış: ₼{p.revenue.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-emerald-600">{p.margin.toFixed(1)}%</p>
                            <p className="text-[10px] font-bold text-gray-400">+{p.profit.toFixed(2)} ₼</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PAYMENT METHODS & CHANNELS */}
            {activeTab === 'channels' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-gray-900">
                    {i18n.language === 'az' ? 'Ödəniş Üsulları və Satış Kanalları' : 'Способы оплаты и каналы продаж'}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">
                    {i18n.language === 'az' ? 'Müştərilərin necə və haradan alış etməsi' : 'Как и откуда покупают клиенты'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Payment methods */}
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30">
                    <h5 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-4 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                      {i18n.language === 'az' ? 'Ödəniş Üsulları' : 'Способы оплаты'}
                    </h5>
                    <div className="space-y-3">
                      {paymentAndChannels.payments.map((p, i) => (
                        <div key={p.name || i} className="bg-white p-3 rounded-lg border border-gray-100">
                          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                            <span className="text-gray-900">{p.name}</span>
                            <span className="text-emerald-600 font-black">₼{p.amount.toFixed(2)} ({p.percent.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-full bg-purple-600 rounded-full"
                              style={{ width: `${Math.max(p.percent, 3)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Channels */}
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30">
                    <h5 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-4 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-blue-600" />
                      {i18n.language === 'az' ? 'Satış Kanalları' : 'Каналы продаж'}
                    </h5>
                    <div className="space-y-3">
                      {paymentAndChannels.channels.map((c, i) => (
                        <div key={c.name || i} className="bg-white p-3 rounded-lg border border-gray-100">
                          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                            <span className="text-gray-900">{c.name}</span>
                            <span className="text-blue-600 font-black">₼{c.amount.toFixed(2)} ({c.percent.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${Math.max(c.percent, 3)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WarehouseEfficiencyCharts;
