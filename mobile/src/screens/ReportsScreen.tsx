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
import { Warehouse, Product } from '../types';
import { WarehousePickerModal } from '../components/WarehousePickerModal';

type PeriodType = 'today' | '7days' | 'thisMonth' | 'all';

interface DispatchItem {
  id: string;
  product_id: string;
  quantity: number;
  reason: string;
  notes?: string;
  dispatched_at?: string;
  created_at: string;
  total_price?: number;
  selling_price?: number;
  cost_price?: number;
  warehouse_id?: string;
  products?: {
    name?: string;
    barcode?: string;
    price?: number;
    purchase_price?: number;
  };
}

export const ReportsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodType>('today');

  // Warehouses
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');
  const [warehousePickerVisible, setWarehousePickerVisible] = useState(false);

  // Raw data from Supabase
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
      if (selectedWarehouseId === 'ALL' && activeWId) {
        setSelectedWarehouseId(activeWId);
      }
      await fetchReportsData(selectedWarehouseId === 'ALL' ? activeWId : selectedWarehouseId);
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

      // 1. Fetch Products
      let prodQuery = supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false);

      if (targetWId && targetWId !== 'ALL') {
        prodQuery = prodQuery.eq('warehouse_id', targetWId);
      }

      const { data: prodsData, error: prodErr } = await prodQuery;
      if (!prodErr && prodsData) {
        setProducts(prodsData);
      }

      // 2. Fetch Dispatches (Sales)
      let dispQuery = supabase
        .from('stock_dispatches')
        .select('id, product_id, quantity, reason, notes, created_at, dispatched_at, total_price, selling_price, cost_price, warehouse_id, products(name, barcode, price, purchase_price)')
        .eq('user_id', userId)
        .eq('reason', 'sale')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (targetWId && targetWId !== 'ALL') {
        dispQuery = dispQuery.eq('warehouse_id', targetWId);
      }

      const { data: dispData, error: dispErr } = await dispQuery;
      if (!dispErr && dispData) {
        setDispatches(dispData as any[]);
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

  // Filter Dispatches by selected Period
  const filteredDispatches = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return dispatches.filter((d) => {
      const itemTime = new Date(d.dispatched_at || d.created_at).getTime();
      if (isNaN(itemTime)) return true;

      switch (period) {
        case 'today':
          return itemTime >= startOfToday;
        case '7days':
          return itemTime >= sevenDaysAgo;
        case 'thisMonth':
          return itemTime >= startOfMonth;
        case 'all':
        default:
          return true;
      }
    });
  }, [dispatches, period]);

  // Aggregate stats
  const stats = useMemo(() => {
    // 1. Stock KPIs (current warehouse products)
    let totalStockCost = 0;
    let totalStockRetail = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      const qty = Number(p.stock_quantity || 0);
      const buyPrice = Number(p.purchase_price || 0);
      const sellPrice = Number(p.sale_price ?? p.price ?? 0);
      const crit = Number(p.critical_stock || 5);

      if (qty > 0) {
        totalStockCost += qty * buyPrice;
        totalStockRetail += qty * sellPrice;
      }
      if (qty <= crit) {
        lowStockCount++;
      }
    });

    const potentialStockProfit = Math.max(0, totalStockRetail - totalStockCost);
    const potentialMargin = totalStockRetail > 0 ? (potentialStockProfit / totalStockRetail) * 100 : 0;

    // 2. Sales KPIs (for selected period)
    let periodRevenue = 0;
    let periodCost = 0;
    const saleIdsSet = new Set<string>();

    const paymentBreakdown = {
      cash: 0,
      card: 0,
      terminal: 0,
      transfer: 0,
      credit: 0,
      deposit: 0,
    };

    const productSalesMap = new Map<string, { name: string; qty: number; revenue: number; barcode?: string }>();

    filteredDispatches.forEach((d) => {
      const qty = Number(d.quantity || 1);
      const pData = d.products || {};
      const unitSellPrice = Number(d.selling_price ?? pData.price ?? 0);
      const unitBuyPrice = Number(d.cost_price ?? pData.purchase_price ?? 0);

      const itemTotal = Number(d.total_price) > 0 ? Number(d.total_price) : unitSellPrice * qty;
      periodRevenue += itemTotal;
      periodCost += unitBuyPrice * qty;

      // Extract sale id for receipt count
      const matchSaleId = (d.notes || '').match(/#([A-Za-z0-9-]+)/);
      if (matchSaleId) {
        saleIdsSet.add(matchSaleId[1]);
      } else {
        saleIdsSet.add(d.id);
      }

      // Payment method breakdown from note
      const noteLower = (d.notes || '').toLowerCase();
      if (noteLower.includes('kredit') || noteLower.includes('birkart') || noteLower.includes('tamkart')) {
        paymentBreakdown.credit += itemTotal;
      } else if (noteLower.includes('terminal')) {
        paymentBreakdown.terminal += itemTotal;
      } else if (noteLower.includes('kart') || noteLower.includes('card')) {
        paymentBreakdown.card += itemTotal;
      } else if (noteLower.includes('köçürmə') || noteLower.includes('transfer')) {
        paymentBreakdown.transfer += itemTotal;
      } else if (noteLower.includes('beh') || noteLower.includes('avans')) {
        paymentBreakdown.deposit += itemTotal;
      } else {
        paymentBreakdown.cash += itemTotal;
      }

      // Top products map
      const prodKey = d.product_id || pData.name || 'Digər';
      const prodName = pData.name || 'Adsız Məhsul';
      const existing = productSalesMap.get(prodKey) || {
        name: prodName,
        qty: 0,
        revenue: 0,
        barcode: pData.barcode,
      };
      existing.qty += qty;
      existing.revenue += itemTotal;
      productSalesMap.set(prodKey, existing);
    });

    const periodProfit = Math.max(0, periodRevenue - periodCost);
    const periodMargin = periodRevenue > 0 ? (periodProfit / periodRevenue) * 100 : 0;

    const topSellingProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const lowStockProducts = products
      .filter((p) => Number(p.stock_quantity || 0) <= Number(p.critical_stock || 5))
      .sort((a, b) => Number(a.stock_quantity || 0) - Number(b.stock_quantity || 0))
      .slice(0, 10);

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
      salesCount: saleIdsSet.size,
      paymentBreakdown,
      topSellingProducts,
      lowStockProducts,
    };
  }, [products, filteredDispatches]);

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
        <View style={styles.headerTopRow}>
          <View style={styles.iconCircle}>
            <TrendingUp size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>HESABATLAR</Text>
            <Text style={styles.headerSubtitle}>Satışlar, Gəlir və Stok Göstəriciləri</Text>
          </View>
        </View>

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
      <View style={styles.periodRow}>
        <TouchableOpacity
          style={[styles.periodPill, period === 'today' && styles.periodPillActive]}
          onPress={() => setPeriod('today')}
        >
          <Text style={[styles.periodText, period === 'today' && styles.periodTextActive]}>
            Bugün
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.periodPill, period === '7days' && styles.periodPillActive]}
          onPress={() => setPeriod('7days')}
        >
          <Text style={[styles.periodText, period === '7days' && styles.periodTextActive]}>
            Son 7 gün
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.periodPill, period === 'thisMonth' && styles.periodPillActive]}
          onPress={() => setPeriod('thisMonth')}
        >
          <Text style={[styles.periodText, period === 'thisMonth' && styles.periodTextActive]}>
            Bu ay
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.periodPill, period === 'all' && styles.periodPillActive]}
          onPress={() => setPeriod('all')}
        >
          <Text style={[styles.periodText, period === 'all' && styles.periodTextActive]}>
            Bütün vaxt
          </Text>
        </TouchableOpacity>
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
            Dövr üzrə Satış və Qazanc ({period === 'today' ? 'Bugün' : period === '7days' ? '7 gün' : period === 'thisMonth' ? 'Bu ay' : 'Cəmi'})
          </Text>

          <View style={styles.kpiGrid}>
            {/* Revenue */}
            <View style={[styles.kpiCard, styles.kpiCardGreen]}>
              <View style={styles.kpiIconGreen}>
                <DollarSign size={18} color="#059669" />
              </View>
              <Text style={styles.kpiLabel}>SATIŞ DÖVRİYYƏSİ</Text>
              <Text style={styles.kpiValGreen}>
                ₼{stats.periodRevenue.toFixed(2)}
              </Text>
              <Text style={styles.kpiSub}>
                {stats.salesCount} qəbz / əməliyyat
              </Text>
            </View>

            {/* Net Profit */}
            <View style={[styles.kpiCard, styles.kpiCardIndigo]}>
              <View style={styles.kpiIconIndigo}>
                <TrendingUp size={18} color="#4F46E5" />
              </View>
              <Text style={styles.kpiLabel}>XALİS GƏLİR (MƏNFƏƏT)</Text>
              <Text style={styles.kpiValIndigo}>
                ₼{stats.periodProfit.toFixed(2)}
              </Text>
              <Text style={styles.kpiSub}>
                Marja: ~{stats.periodMargin.toFixed(1)}%
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
              <Text style={styles.kpiLabel}>STOK MAYƏ DƏYƏRİ</Text>
              <Text style={styles.kpiValDark}>
                ₼{stats.totalStockCost.toFixed(2)}
              </Text>
              <Text style={styles.kpiSub}>{stats.totalStockItems} çeşid məhsul</Text>
            </View>

            {/* Total Stock Retail */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiIconBlue}>
                <ArrowUpRight size={18} color="#2563EB" />
              </View>
              <Text style={styles.kpiLabel}>STOK SATIŞ DƏYƏRİ</Text>
              <Text style={styles.kpiValBlue}>
                ₼{stats.totalStockRetail.toFixed(2)}
              </Text>
              <Text style={styles.kpiSub}>
                Potensial mənfəət: ₼{stats.potentialStockProfit.toFixed(0)}
              </Text>
            </View>
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

          {/* 6. Top Selling Products */}
          <View style={styles.cardBox}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Award size={18} color="#F59E0B" />
                <Text style={styles.cardHeaderTitle}>Ən Çox Satılan Mallar</Text>
              </View>
              <Text style={styles.cardHeaderBadge}>
                {stats.topSellingProducts.length} çeşid
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
                      Kritik hədd: {prod.critical_stock || 5} {prod.unit || 'əd.'}
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
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    gap: 14,
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
  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 8,
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
});

