import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon, 
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
  Info,
  CircleDot,
  LayoutGrid,
  BarChart2
} from 'lucide-react';
import { formatUnitName } from './SaleDetailModal';

const CHART_COLORS = [
  '#2563EB', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#84CC16', // Lime
];

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
  { id: 'categories', icon: PieChartIcon, labelAz: 'Kateqoriyalar', labelRu: 'По категориям', labelEn: 'Categories' },
  { id: 'margins', icon: TrendingUp, labelAz: 'Mənfəət və Marja', labelRu: 'Прибыль и маржа', labelEn: 'Profit & Margin' },
  { id: 'channels', icon: CreditCard, labelAz: 'Ödəniş və Kanallar', labelRu: 'Оплата и каналы', labelEn: 'Payment & Channels' }
];

// Helper: SVG Donut Chart with interactive slices and center summary
const SvgDonutChart = ({ data = [], totalLabel = 'Cəmi', totalValue = '0', size = 210 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const total = useMemo(() => data.reduce((sum, d) => sum + (d.value || 0), 0), [data]);

  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  let accumulatedPercent = 0;
  const segments = data.map((item, idx) => {
    const percent = total > 0 ? item.value / total : 0;
    const strokeDash = percent * circumference;
    const strokeOffset = circumference * (1 - accumulatedPercent) + (circumference * 0.25);
    accumulatedPercent += percent;
    return {
      ...item,
      percent,
      strokeDash: `${Math.max(strokeDash - (data.length > 1 ? 2 : 0), 0)} ${circumference}`,
      strokeOffset,
      color: item.color || CHART_COLORS[idx % CHART_COLORS.length]
    };
  });

  return (
    <div className="relative flex flex-col items-center justify-center p-2">
      <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90 drop-shadow-sm">
        {/* Background ring */}
        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#F1F5F9" strokeWidth="15" />
        
        {/* Slices */}
        {segments.map((seg, i) => {
          if (seg.percent <= 0) return null;
          const isHovered = hoveredIdx === i;
          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={isHovered ? "18" : "15"}
              strokeDasharray={seg.strokeDash}
              strokeDashoffset={seg.strokeOffset}
              className="transition-all duration-300 cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}
      </svg>
      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
        {hoveredIdx !== null && segments[hoveredIdx] ? (
          <>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate max-w-[110px]">
              {segments[hoveredIdx].label}
            </span>
            <span className="text-base font-black text-gray-900 tracking-tight">
              {segments[hoveredIdx].displayValue || segments[hoveredIdx].value}
            </span>
            <span className="text-[11px] font-black text-blue-600">
              {(segments[hoveredIdx].percent * 100).toFixed(1)}%
            </span>
          </>
        ) : (
          <>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {totalLabel}
            </span>
            <span className="text-lg font-black text-gray-900 tracking-tight">
              {totalValue}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

// Helper: Real Vertical Column Chart with grid lines and value badges
const VerticalColumnChart = ({ 
  items = [], 
  valueKey = 'value', 
  labelKey = 'name', 
  displayValueKey = 'displayValue', 
  yUnit = '',
  i18n 
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const maxVal = Math.max(...items.map(it => it[valueKey] || 0), 1);

  // Y-axis steps: 100%, 75%, 50%, 25%, 0%
  const gridSteps = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="bg-gradient-to-b from-gray-50/50 to-white rounded-xl border border-gray-100 p-5 pt-8">
      {/* Chart Canvas Area */}
      <div className="relative h-64 w-full flex items-end">
        {/* Horizontal Gridlines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {gridSteps.map((step, idx) => (
            <div key={idx} className="flex items-center w-full">
              <span className="text-[9px] font-mono font-bold text-gray-400 w-12 text-right pr-2 shrink-0">
                {step === 0 ? '0' : (maxVal * step).toFixed(maxVal < 10 ? 1 : 0)} {yUnit}
              </span>
              <div className="flex-1 border-b border-dashed border-gray-200" />
            </div>
          ))}
        </div>

        {/* Vertical Columns Container */}
        <div className="relative z-10 flex items-end justify-around w-full h-full pl-14 pr-2 gap-2 sm:gap-4">
          {items.map((it, idx) => {
            const val = it[valueKey] || 0;
            const heightPercent = Math.max((val / maxVal) * 100, 4);
            const isHovered = hoveredIdx === idx;
            const rank = idx + 1;

            const columnGradients = [
              'from-amber-500 to-yellow-400 shadow-amber-500/20', // #1 Gold
              'from-blue-600 to-indigo-500 shadow-blue-500/20',   // #2 Silver/Blue
              'from-emerald-500 to-teal-400 shadow-emerald-500/20', // #3 Bronze/Teal
              'from-purple-600 to-fuchsia-500 shadow-purple-500/20',
              'from-sky-500 to-cyan-400 shadow-cyan-500/20',
              'from-rose-500 to-pink-400 shadow-rose-500/20',
            ];
            const colColor = columnGradients[idx % columnGradients.length];

            return (
              <div 
                key={it.id || idx}
                className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer max-w-[72px]"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Floating Value Pill Above Bar */}
                <div 
                  className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-black transition-all shadow-sm whitespace-nowrap z-20 ${
                    isHovered
                      ? 'bg-gray-900 text-white scale-110'
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  {it[displayValueKey] || val}
                </div>

                {/* Column Body with Animated Fill */}
                <div className="w-full h-full relative flex items-end justify-center">
                  <div 
                    className={`w-full max-w-[48px] rounded-t-xl bg-gradient-to-t ${colColor} shadow-md transition-all duration-700 ease-out flex items-center justify-center ${
                      isHovered ? 'brightness-110 scale-x-105' : 'opacity-90 hover:opacity-100'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    {/* Rank Badge inside the column if tall enough */}
                    {heightPercent > 20 && (
                      <span className="text-[10px] font-black text-white/90 drop-shadow mb-1">
                        #{rank}
                      </span>
                    )}
                  </div>
                </div>

                {/* X-axis Label & Details */}
                <div className="mt-2.5 text-center w-full">
                  <div className="text-[11px] font-black text-gray-800 truncate" title={it[labelKey]}>
                    {it[labelKey]}
                  </div>
                  {it.subLabel && (
                    <div className="text-[9px] font-semibold text-gray-400 truncate">
                      {it.subLabel}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const WarehouseEfficiencyCharts = ({ 
  dispatches = [], 
  products = [], 
  categories = [] 
}) => {
  const { i18n } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [activeTab, setActiveTab] = useState('top_products');
  const [topSortBy, setTopSortBy] = useState('quantity'); // 'quantity' | 'revenue' | 'profit'
  const [topChartView, setTopChartView] = useState('columns'); // 'columns' | 'bars'
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
          purchasePrice: s.purchasePrice,
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

    if (topSortBy === 'quantity') {
      list.sort((a, b) => b.quantity - a.quantity);
    } else if (topSortBy === 'revenue') {
      list.sort((a, b) => b.revenue - a.revenue);
    } else if (topSortBy === 'profit') {
      list.sort((a, b) => b.profit - a.profit);
    }

    return list;
  }, [filteredSales, topSortBy, summary]);

  // Formatted items for the VerticalColumnChart in Tab 1
  const topColumnsData = useMemo(() => {
    return productAggregates.slice(0, 8).map(p => {
      const unitStr = formatUnitName(p.unit, i18n.language);
      let value = p.quantity;
      let displayValue = `${p.quantity} ${unitStr}`;

      if (topSortBy === 'revenue') {
        value = p.revenue;
        displayValue = `₼${p.revenue.toFixed(2)}`;
      } else if (topSortBy === 'profit') {
        value = p.profit;
        displayValue = `+₼${p.profit.toFixed(2)}`;
      }

      return {
        id: p.id,
        name: p.name,
        subLabel: p.categoryName,
        value,
        displayValue,
        unit: unitStr
      };
    });
  }, [productAggregates, topSortBy, i18n.language]);

  // 5. Aggregate by Date for Timeline Chart
  const timelineData = useMemo(() => {
    if (filteredSales.length === 0) return [];

    const dateMap = new Map();

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

  // 6. Aggregate by Category for Donut & Breakdown
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

    return list.map((c, idx) => ({
      ...c,
      color: CHART_COLORS[idx % CHART_COLORS.length],
      share: summary.totalRevenue > 0 ? (c.revenue / summary.totalRevenue) * 100 : 0,
      barPercent: (c.revenue / maxCatRev) * 100
    }));
  }, [filteredSales, summary]);

  // Category donut slices
  const categoryDonutSlices = useMemo(() => {
    return categoryData.map(c => ({
      label: c.name,
      value: c.revenue,
      displayValue: `₼${c.revenue.toFixed(2)}`,
      color: c.color
    }));
  }, [categoryData]);

  // 7. Aggregate by Payment Method and Channels for Donut charts
  const paymentAndChannels = useMemo(() => {
    const payMap = new Map();
    const chanMap = new Map();

    filteredSales.forEach(s => {
      const pay = s.paymentMethod || 'Nəqd';
      payMap.set(pay, (payMap.get(pay) || 0) + s.totalAmount);

      const chan = s.channel || 'Mağaza';
      chanMap.set(chan, (chanMap.get(chan) || 0) + s.totalAmount);
    });

    const payments = Array.from(payMap.entries())
      .map(([name, amount], idx) => ({
        label: name,
        value: amount,
        displayValue: `₼${amount.toFixed(2)}`,
        percent: summary.totalRevenue > 0 ? (amount / summary.totalRevenue) * 100 : 0,
        color: CHART_COLORS[idx % CHART_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);

    const channels = Array.from(chanMap.entries())
      .map(([name, amount], idx) => ({
        label: name,
        value: amount,
        displayValue: `₼${amount.toFixed(2)}`,
        percent: summary.totalRevenue > 0 ? (amount / summary.totalRevenue) * 100 : 0,
        color: CHART_COLORS[(idx + 4) % CHART_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);

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
            {/* TAB 1: TOP PRODUCTS - REAL VISUAL COLUMN CHART */}
            {activeTab === 'top_products' && (
              <div className="space-y-6">
                {/* Sub-filter: Sort by quantity vs revenue vs profit + View Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
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

                  {/* Toggle between Column Chart and Rank List */}
                  <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg self-end sm:self-auto">
                    <button
                      onClick={() => setTopChartView('columns')}
                      className={`p-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                        topChartView === 'columns' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                      }`}
                      title={i18n.language === 'az' ? 'Sütun qrafiki' : 'Столбчатый график'}
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">{i18n.language === 'az' ? 'Sütun Qrafiki' : 'График'}</span>
                    </button>
                    <button
                      onClick={() => setTopChartView('bars')}
                      className={`p-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                        topChartView === 'bars' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                      }`}
                      title={i18n.language === 'az' ? 'Siyahı xətləri' : 'Список'}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">{i18n.language === 'az' ? 'Xətli Siyahı' : 'Список'}</span>
                    </button>
                  </div>
                </div>

                {/* THE REAL VISUAL COLUMN CHART */}
                {topChartView === 'columns' && (
                  <VerticalColumnChart 
                    items={topColumnsData}
                    valueKey="value"
                    labelKey="name"
                    displayValueKey="displayValue"
                    yUnit={topSortBy === 'quantity' ? formatUnitName('pcs', i18n.language) : '₼'}
                    i18n={i18n}
                  />
                )}

                {/* Visual Ranking Bars (Top 10) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black uppercase text-gray-500 tracking-wider">
                      {i18n.language === 'az' ? 'Reytinq və Məhsul Göstəriciləri' : 'Рейтинг и показатели товаров'}
                    </h5>
                    <span className="text-xs font-semibold text-gray-400">
                      {productAggregates.length} {i18n.language === 'az' ? 'məhsul' : 'товаров'}
                    </span>
                  </div>

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
                {productAggregates.length > 5 && (
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

            {/* TAB 3: CATEGORIES - REAL INTERACTIVE SVG DONUT CHART + BREAKDOWN */}
            {activeTab === 'categories' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-gray-900">
                    {i18n.language === 'az' ? 'Kateqoriyalar üzrə Dairəvi Qrafik və Paylanma' : 'Круговая диаграмма по категориям'}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">
                    {i18n.language === 'az' ? 'Kateqoriyaların satış həcmi və gəlir nisbəti' : 'Соотношение категорий по выручке и продажам'}
                  </p>
                </div>

                {/* Donut Chart + Category Cards Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left: SVG Donut Chart */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <SvgDonutChart 
                      data={categoryDonutSlices}
                      totalLabel={i18n.language === 'az' ? 'Cəmi Satış' : 'Всего'}
                      totalValue={`₼${summary.totalRevenue.toFixed(2)}`}
                      size={220}
                    />
                    <p className="text-[11px] font-bold text-gray-400 mt-2">
                      {categoryData.length} {i18n.language === 'az' ? 'kateqoriya üzrə paylanma' : 'категорий товаров'}
                    </p>
                  </div>

                  {/* Right: Category Legend & Visual Progress */}
                  <div className="lg:col-span-7 space-y-3">
                    {categoryData.map((cat, idx) => (
                      <div 
                        key={cat.name || idx}
                        className="p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: cat.color }}
                            />
                            <div>
                              <h5 className="text-sm font-black text-gray-900">{cat.name}</h5>
                              <p className="text-[10px] text-gray-400 font-bold">
                                {cat.quantity} {formatUnitName('pcs', i18n.language)} {i18n.language === 'az' ? 'satılıb' : 'продано'} • {cat.count} {i18n.language === 'az' ? 'əməliyyat' : 'чеков'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-black text-emerald-600">₼{cat.revenue.toFixed(2)}</p>
                            <span 
                              className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                              style={{ backgroundColor: cat.color }}
                            >
                              {cat.share.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Visual Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-700"
                            style={{ 
                              width: `${Math.max(cat.share, 3)}%`,
                              backgroundColor: cat.color 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PROFIT & MARGINS - COMPARATIVE VISUAL BARS */}
            {activeTab === 'margins' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-gray-900">
                    {i18n.language === 'az' ? 'Maya vs Satış vs Xalis Qazanc Qrafiki' : 'График: Себестоимость vs Продажи vs Прибыль'}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">
                    {i18n.language === 'az' 
                      ? 'Hər məhsul üzrə maya xərci, yekun satış dövriyyəsi və əldə olunan xalis gəlir' 
                      : 'Соотношение себестоимости, выручки и чистой прибыли по каждому товару'}
                  </p>
                </div>

                {/* Comparative Visual Chart */}
                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                    <span className="text-xs font-black uppercase text-gray-500 tracking-wider">
                      {i18n.language === 'az' ? 'Məhsulların Maliyyə Strukturu' : 'Финансовая структура товаров'}
                    </span>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <span className="w-3 h-3 rounded bg-blue-500" />
                        <span>{i18n.language === 'az' ? 'Maya Dəyəri' : 'Себестоимость'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <span className="w-3 h-3 rounded bg-emerald-500" />
                        <span>{i18n.language === 'az' ? 'Satış Məbləği' : 'Выручка'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <span className="w-3 h-3 rounded bg-amber-500" />
                        <span>{i18n.language === 'az' ? 'Xalis Qazanc' : 'Чистая прибыль'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {productAggregates.slice(0, 6).map((p, idx) => {
                      const costTotal = Math.max(p.revenue - p.profit, 0);
                      const maxBar = Math.max(p.revenue, 1);

                      return (
                        <div key={p.id || idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-sm font-black text-gray-900">{p.name}</h5>
                              <p className="text-[10px] text-gray-400 font-bold">
                                {p.quantity} {formatUnitName(p.unit, i18n.language)} • {p.categoryName}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {p.margin.toFixed(1)}% {i18n.language === 'az' ? 'marja' : 'маржа'}
                              </span>
                            </div>
                          </div>

                          {/* 3 Comparative Bars */}
                          <div className="space-y-1.5 text-xs font-bold pt-1">
                            {/* Cost Bar */}
                            <div className="flex items-center gap-3">
                              <span className="w-24 text-[10px] text-gray-500 uppercase">{i18n.language === 'az' ? 'Maya:' : 'Себест:'}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full transition-all duration-700" 
                                  style={{ width: `${Math.max((costTotal / maxBar) * 100, 3)}%` }} 
                                />
                              </div>
                              <span className="w-20 text-right font-black text-gray-700">₼{costTotal.toFixed(2)}</span>
                            </div>

                            {/* Revenue Bar */}
                            <div className="flex items-center gap-3">
                              <span className="w-24 text-[10px] text-emerald-600 uppercase">{i18n.language === 'az' ? 'Satış:' : 'Продажа:'}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-700" 
                                  style={{ width: '100%' }} 
                                />
                              </div>
                              <span className="w-20 text-right font-black text-emerald-600">₼{p.revenue.toFixed(2)}</span>
                            </div>

                            {/* Profit Bar */}
                            <div className="flex items-center gap-3">
                              <span className="w-24 text-[10px] text-amber-600 uppercase">{i18n.language === 'az' ? 'Qazanc:' : 'Прибыль:'}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div 
                                  className="h-full bg-amber-500 rounded-full transition-all duration-700" 
                                  style={{ width: `${Math.max((p.profit / maxBar) * 100, 3)}%` }} 
                                />
                              </div>
                              <span className="w-20 text-right font-black text-amber-600">+₼{p.profit.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PAYMENT METHODS & CHANNELS - DUAL SVG DONUT CHARTS */}
            {activeTab === 'channels' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-gray-900">
                    {i18n.language === 'az' ? 'Ödəniş Üsulları və Satış Kanalları Qrafiki' : 'Графики: Способы оплаты и каналы'}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">
                    {i18n.language === 'az' ? 'Dairəvi diaqramlarla ödəniş metodları və satış mənbələri' : 'Круговые диаграммы способов оплаты и каналов сбыта'}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Donut 1: Payment Methods */}
                  <div className="border border-gray-100 rounded-2xl p-5 bg-gradient-to-b from-gray-50/50 to-white shadow-sm flex flex-col items-center">
                    <h5 className="text-xs font-black uppercase text-purple-700 tracking-wider mb-4 flex items-center gap-1.5 self-start">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                      {i18n.language === 'az' ? 'Ödəniş Üsulları Qrafiki' : 'Диаграмма способов оплаты'}
                    </h5>

                    <SvgDonutChart 
                      data={paymentAndChannels.payments}
                      totalLabel={i18n.language === 'az' ? 'Cəmi Ödəniş' : 'Всего'}
                      totalValue={`₼${summary.totalRevenue.toFixed(2)}`}
                      size={200}
                    />

                    {/* Legend */}
                    <div className="w-full space-y-2 mt-4 pt-4 border-t border-gray-100">
                      {paymentAndChannels.payments.map((p, i) => (
                        <div key={p.label || i} className="flex items-center justify-between text-xs font-bold p-2 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-gray-900">{p.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-black">{p.displayValue}</span>
                            <span className="text-[10px] text-gray-400 font-bold">({p.percent.toFixed(1)}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Donut 2: Channels */}
                  <div className="border border-gray-100 rounded-2xl p-5 bg-gradient-to-b from-gray-50/50 to-white shadow-sm flex flex-col items-center">
                    <h5 className="text-xs font-black uppercase text-blue-700 tracking-wider mb-4 flex items-center gap-1.5 self-start">
                      <Store className="w-4 h-4 text-blue-600" />
                      {i18n.language === 'az' ? 'Satış Kanalları Qrafiki' : 'Диаграмма каналов продаж'}
                    </h5>

                    <SvgDonutChart 
                      data={paymentAndChannels.channels}
                      totalLabel={i18n.language === 'az' ? 'Cəmi Satış' : 'Всего'}
                      totalValue={`₼${summary.totalRevenue.toFixed(2)}`}
                      size={200}
                    />

                    {/* Legend */}
                    <div className="w-full space-y-2 mt-4 pt-4 border-t border-gray-100">
                      {paymentAndChannels.channels.map((c, i) => (
                        <div key={c.label || i} className="flex items-center justify-between text-xs font-bold p-2 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                            <span className="text-gray-900">{c.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 font-black">{c.displayValue}</span>
                            <span className="text-[10px] text-gray-400 font-bold">({c.percent.toFixed(1)}%)</span>
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
