import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Package,
  ArrowRightLeft,
  Search,
  ShoppingCart,
  Trash2,
  Building,
  Tag,
  FileText,
  ChevronRight,
  Calendar as CalendarIcon,
  RotateCcw,
  X,
} from 'lucide-react-native';
import {
  StockReceiptItem,
  StockSaleItem,
  StockDispatchItem,
  StockTransferItem,
} from '../types';
import { movementService } from '../services/movementService';
import { useAuth } from '../context/AuthContext';
import { DeleteHistoryModal, HistoryItemToDelete } from '../components/DeleteHistoryModal';
import { SaleDetailModal } from '../components/SaleDetailModal';
import {
  DateFilterModal,
  DateFilterRange,
  DatePreset,
  getPresetRange,
  formatDisplayDate,
  formatYMD,
} from '../components/DateFilterModal';

type OperationTab = 'receipts' | 'sales' | 'dispatches' | 'transfers';

interface TabDef {
  id: OperationTab;
  label: string;
  activeColor: string;
  badgeBg: string;
}

const TABS: TabDef[] = [
  {
    id: 'receipts',
    label: 'QƏBULLAR',
    activeColor: '#2563EB',
    badgeBg: '#EFF6FF',
  },
  {
    id: 'sales',
    label: 'SATIŞ TARİXÇƏSİ',
    activeColor: '#059669',
    badgeBg: '#ECFDF5',
  },
  {
    id: 'dispatches',
    label: 'SİLİNMƏLƏR',
    activeColor: '#DC2626',
    badgeBg: '#FEF2F2',
  },
  {
    id: 'transfers',
    label: 'YERDƏYİŞMƏLƏR',
    activeColor: '#4F46E5',
    badgeBg: '#EEF2FF',
  },
];

export const OperationsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OperationTab>('receipts');
  const [searchTerm, setSearchTerm] = useState('');

  const cachedData = movementService.getCachedData();
  const [loading, setLoading] = useState(!cachedData.receipts && !cachedData.dispatchesSales);
  const [refreshing, setRefreshing] = useState(false);

  const [receipts, setReceipts] = useState<StockReceiptItem[]>(cachedData.receipts || []);
  const [sales, setSales] = useState<StockSaleItem[]>(cachedData.dispatchesSales?.sales || []);
  const [dispatches, setDispatches] = useState<StockDispatchItem[]>(cachedData.dispatchesSales?.dispatches || []);
  const [transfers, setTransfers] = useState<StockTransferItem[]>(cachedData.transfers || []);

  const { permissions } = useAuth();
  const canDeleteHistory = permissions.canDeleteHistory;
  const [itemToDelete, setItemToDelete] = useState<HistoryItemToDelete | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<StockSaleItem | null>(null);
  const [dateRange, setDateRange] = useState<DateFilterRange>({
    startDate: '',
    endDate: '',
    preset: 'all',
  });
  const [dateModalVisible, setDateModalVisible] = useState(false);

  const isDateFiltered = dateRange.preset !== 'all' || !!dateRange.startDate || !!dateRange.endDate;

  const handleQuickPreset = (preset: DatePreset) => {
    if (preset === 'all') {
      setDateRange({ startDate: '', endDate: '', preset: 'all' });
      return;
    }
    const range = getPresetRange(preset);
    setDateRange({
      startDate: range.startDate,
      endDate: range.endDate,
      preset,
    });
  };

  const getItemYMD = (dateVal?: string | null, createdAtVal?: string | null): string => {
    const target = dateVal || createdAtVal;
    if (!target) return '';
    try {
      const d = new Date(target);
      if (isNaN(d.getTime())) {
        return target.substring(0, 10);
      }
      return formatYMD(d);
    } catch {
      return target.substring(0, 10);
    }
  };

  const isWithinRange = (dateVal?: string | null, createdAtVal?: string | null) => {
    if (!dateRange.startDate && !dateRange.endDate) return true;
    if (!dateVal && !createdAtVal) return false;
    const ymd = getItemYMD(dateVal, createdAtVal);
    if (!ymd) return false;
    if (dateRange.startDate && ymd < dateRange.startDate) return false;
    if (dateRange.endDate && ymd > dateRange.endDate) return false;
    return true;
  };

  const handleOpenDelete = (item: any, type: 'sale' | 'dispatch' | 'receipt') => {
    setItemToDelete({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      barcode: item.barcode,
      quantity: item.quantity,
      type,
      notes: item.notes,
    });
    setDeleteModalVisible(true);
  };

  const handleDeleteSuccess = (msg: string) => {
    if (itemToDelete) {
      if (itemToDelete.type === 'sale') {
        setSales((prev) => prev.filter((s) => s.id !== itemToDelete.id));
      } else if (itemToDelete.type === 'dispatch') {
        setDispatches((prev) => prev.filter((d) => d.id !== itemToDelete.id));
      } else if (itemToDelete.type === 'receipt') {
        setReceipts((prev) => prev.filter((r) => r.id !== itemToDelete.id));
      }
    }
    Alert.alert('Uğurlu', msg);
    loadAllData(true);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async (forceRefresh = false) => {
    try {
      const hasCached = !!movementService.getCachedData().receipts;
      if (!hasCached || forceRefresh) {
        setLoading(true);
      }
      const [receiptsData, dispatchesData, transfersData] = await Promise.all([
        movementService.getReceipts(forceRefresh),
        movementService.getDispatchesAndSales(forceRefresh),
        movementService.getTransfers(forceRefresh),
      ]);

      setReceipts(receiptsData || []);
      setSales(dispatchesData?.sales || []);
      setDispatches(dispatchesData?.dispatches || []);
      setTransfers(transfersData || []);
    } catch (e) {
      console.error('loadAllData error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData(true);
    setRefreshing(false);
  };

  const formatHistoryDateTime = (dateVal?: string | null, createdAtVal?: string | null) => {
    let dateObj: Date | null = null;
    let timeStr = '';

    if (createdAtVal) {
      const cDate = new Date(createdAtVal);
      if (!isNaN(cDate.getTime())) {
        dateObj = cDate;
        timeStr = cDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      }
    }

    if (dateVal) {
      const dDate = new Date(dateVal);
      if (!isNaN(dDate.getTime())) {
        if (!dateObj) {
          dateObj = dDate;
        } else {
          const dDateOnly = typeof dateVal === 'string' ? dateVal.split('T')[0] : '';
          const cDateOnly = dateObj.toISOString().split('T')[0];
          if (dDateOnly && dDateOnly !== cDateOnly) {
            dateObj = dDate;
          }
        }
        if (!timeStr && typeof dateVal === 'string' && (dateVal.includes('T') || dateVal.includes(':'))) {
          timeStr = dDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        }
      }
    }

    if (!dateObj) return '—';

    const dateStr = dateObj.toLocaleDateString('ru-RU');
    return timeStr ? `${dateStr} ${timeStr}` : dateStr;
  };

  // Filtered lists based on search term & date range
  const filteredReceipts = useMemo(() => {
    let result = receipts;
    if (dateRange.startDate || dateRange.endDate) {
      result = result.filter((r) => isWithinRange(r.received_at, (r as any).created_at));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.product_name.toLowerCase().includes(q) ||
          (r.barcode && r.barcode.includes(q)) ||
          (permissions.canViewSupplier && r.supplier_name && r.supplier_name.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }
    return result;
  }, [receipts, searchTerm, permissions.canViewSupplier, dateRange]);

  const filteredSales = useMemo(() => {
    let result = sales;
    if (dateRange.startDate || dateRange.endDate) {
      result = result.filter((s) => isWithinRange(s.issued_at, s.created_at));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.product_name.toLowerCase().includes(q) ||
          (s.barcode && s.barcode.includes(q)) ||
          (s.notes && s.notes.toLowerCase().includes(q))
      );
    }
    return result;
  }, [sales, searchTerm, dateRange]);

  const filteredDispatches = useMemo(() => {
    let result = dispatches;
    if (dateRange.startDate || dateRange.endDate) {
      result = result.filter((d) => isWithinRange(d.issued_at, d.created_at));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.product_name.toLowerCase().includes(q) ||
          (d.barcode && d.barcode.includes(q)) ||
          (d.reason && d.reason.toLowerCase().includes(q)) ||
          (d.notes && d.notes.toLowerCase().includes(q))
      );
    }
    return result;
  }, [dispatches, searchTerm, dateRange]);

  const filteredTransfers = useMemo(() => {
    let result = transfers;
    if (dateRange.startDate || dateRange.endDate) {
      result = result.filter((t) => isWithinRange(t.created_at));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (t) =>
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          t.items?.some((i) => i.product_name.toLowerCase().includes(q))
      );
    }
    return result;
  }, [transfers, searchTerm, dateRange]);

  const getTabCount = (tab: OperationTab) => {
    switch (tab) {
      case 'receipts':
        return filteredReceipts.length;
      case 'sales':
        return filteredSales.length;
      case 'dispatches':
        return filteredDispatches.length;
      case 'transfers':
        return filteredTransfers.length;
    }
  };

  // Render individual cards
  const renderReceiptItem = ({ item }: { item: StockReceiptItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={[styles.typeIconBox, { backgroundColor: '#EFF6FF' }]}>
            <ArrowDownRight size={18} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {item.product_name}
            </Text>
            <View style={styles.metaRow}>
              {item.barcode ? (
                <View style={styles.barcodeChip}>
                  <Text style={styles.barcodeChipText}>{item.barcode}</Text>
                </View>
              ) : null}
              {permissions.canViewSupplier && item.supplier_name ? (
                <View style={styles.supplierChip}>
                  <Building size={11} color="#4B5563" />
                  <Text style={styles.supplierChipText} numberOfLines={1}>
                    {item.supplier_name}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.cardRight}>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <View style={[styles.qtyBadge, { backgroundColor: '#ECFDF5' }]}>
              <Text style={[styles.qtyText, { color: '#059669' }]}>
                +{item.quantity}
              </Text>
            </View>
            {permissions.canViewCostPrices && item.unit_price ? (
              <Text style={styles.subPriceText}>
                {item.unit_price.toFixed(2)} ₼ / əd.
              </Text>
            ) : null}
          </View>

          {canDeleteHistory && (
            <TouchableOpacity
              style={styles.deleteActionBtn}
              onPress={() => handleOpenDelete(item, 'receipt')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <Clock size={12} color="#9CA3AF" />
          <Text style={styles.dateText}>{formatHistoryDateTime(item.received_at, (item as any).created_at)}</Text>
        </View>
        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const renderSaleItem = ({ item }: { item: StockSaleItem }) => {
    // Parse sales channel if present in notes, e.g. [kanal: ...]
    const channelMatch = item.notes?.match(/\[kanal:\s*([^\]]+)\]/i);
    const channel = channelMatch ? channelMatch[1].toUpperCase() : 'MAĞAZA';

    // Parse discount if present in notes, e.g. [endirim: ...]
    const discountMatch = item.notes?.match(/\[endirim:\s*([^\]]+)\]/i);
    const discountLabel = discountMatch
      ? discountMatch[1]
      : (item.discount_amount && item.discount_amount > 0
          ? `${item.discount_amount.toFixed(2)} ₼`
          : null);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => setSelectedSaleDetail(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <View style={[styles.typeIconBox, { backgroundColor: '#ECFDF5' }]}>
              <ShoppingCart size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {item.product_name}
              </Text>
              <View style={styles.metaRow}>
                {item.barcode ? (
                  <View style={styles.barcodeChip}>
                    <Text style={styles.barcodeChipText}>{item.barcode}</Text>
                  </View>
                ) : null}
                <View style={[styles.channelChip, { backgroundColor: '#F0FDF4' }]}>
                  <Tag size={10} color="#16A34A" />
                  <Text style={styles.channelChipText}>{channel}</Text>
                </View>
                {discountLabel ? (
                  <View style={styles.discountChip}>
                    <Tag size={10} color="#059669" />
                    <Text style={styles.discountChipText}>Endirim: {discountLabel}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.cardRight}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.qtyBadge, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.qtyText, { color: '#DC2626' }]}>
                  -{item.quantity}
                </Text>
              </View>
              <ChevronRight size={16} color="#9CA3AF" />
            </View>

            {canDeleteHistory && (
              <TouchableOpacity
                style={styles.deleteActionBtn}
                onPress={() => handleOpenDelete(item, 'sale')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateRow}>
            <Clock size={12} color="#9CA3AF" />
            <Text style={styles.dateText}>{formatHistoryDateTime(item.issued_at, item.created_at)}</Text>
          </View>
          {item.notes ? (
            <Text style={styles.notesText} numberOfLines={1}>
              {item.notes.replace(/\[kanal:[^\]]+\]/gi, '').replace(/\[endirim:[^\]]+\]/gi, '').trim()}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDispatchItem = ({ item }: { item: StockDispatchItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={[styles.typeIconBox, { backgroundColor: '#FEF2F2' }]}>
            <ArrowUpRight size={18} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {item.product_name}
            </Text>
            <View style={styles.metaRow}>
              {item.barcode ? (
                <View style={styles.barcodeChip}>
                  <Text style={styles.barcodeChipText}>{item.barcode}</Text>
                </View>
              ) : null}
              <View style={[styles.reasonChip, { backgroundColor: '#FEF2F2' }]}>
                <Text style={styles.reasonChipText} numberOfLines={1}>
                  {item.reason}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cardRight}>
          <View style={[styles.qtyBadge, { backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.qtyText, { color: '#DC2626' }]}>
              -{item.quantity}
            </Text>
          </View>

          {canDeleteHistory && (
            <TouchableOpacity
              style={styles.deleteActionBtn}
              onPress={() => handleOpenDelete(item, 'dispatch')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <Clock size={12} color="#9CA3AF" />
          <Text style={styles.dateText}>{formatHistoryDateTime(item.issued_at, item.created_at)}</Text>
        </View>
        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const renderTransferItem = ({ item }: { item: StockTransferItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={[styles.typeIconBox, { backgroundColor: '#EEF2FF' }]}>
            <ArrowRightLeft size={18} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {item.from_warehouse_name || 'Əsas Anbar'} ➔ {item.to_warehouse_name || 'Anbar 2'}
            </Text>
            <Text style={styles.transferItemsCount}>
              Say: {item.items?.length || 0}
            </Text>
          </View>
        </View>
      </View>

      {item.items && item.items.length > 0 && (
        <View style={styles.transferItemsList}>
          {item.items.slice(0, 3).map((sub, idx) => (
            <View key={idx} style={styles.transferItemRow}>
              <Text style={styles.transferItemName} numberOfLines={1}>
                • {sub.product_name}
              </Text>
              <Text style={styles.transferItemQty}>{sub.quantity} əd.</Text>
            </View>
          ))}
          {item.items.length > 3 && (
            <Text style={styles.moreItemsText}>
              + daha {item.items.length - 3} sayda
            </Text>
          )}
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <Clock size={12} color="#9CA3AF" />
          <Text style={styles.dateText}>{formatHistoryDateTime(item.created_at)}</Text>
        </View>
        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );

  // Render current tab list
  const renderCurrentList = () => {
    let data: any[] = [];
    let emptyMessage = '';

    switch (activeTab) {
      case 'receipts':
        data = filteredReceipts;
        emptyMessage = 'Qəbul qeydi tapılmadı';
        break;
      case 'sales':
        data = filteredSales;
        emptyMessage = 'Satış qeydi tapılmadı';
        break;
      case 'dispatches':
        data = filteredDispatches;
        emptyMessage = 'Silinmə qeydi tapılmadı';
        break;
      case 'transfers':
        data = filteredTransfers;
        emptyMessage = 'Yerdəyişmə tarixi boşdur';
        break;
    }

    if (data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Package size={50} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>{emptyMessage}</Text>
          <Text style={styles.emptySub}>
            Yeni əməliyyatlar avtomatik olaraq burada görünəcək
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={data}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => {
          switch (activeTab) {
            case 'receipts':
              return renderReceiptItem({ item });
            case 'sales':
              return renderSaleItem({ item });
            case 'dispatches':
              return renderDispatchItem({ item });
            case 'transfers':
              return renderTransferItem({ item });
          }
        }}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#10B981']}
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Əməliyyat tarixçəsi</Text>
          <Text style={styles.sub}>
            Qəbullar, satışlar, silinmələr və yerdəyişmələr
          </Text>
        </View>

        {/* 4 Tabs matching Web Version: QƏBULLAR | SATIŞ TARİXÇƏSİ | SİLİNMƏLƏR | YERDƏYİŞMƏLƏR */}
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = getTabCount(tab.id);

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabButton,
                    isActive && styles.tabButtonActive,
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      isActive && { color: tab.activeColor, fontWeight: '900' },
                    ]}
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={[
                      styles.countBadge,
                      isActive && { backgroundColor: tab.badgeBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        isActive && { color: tab.activeColor },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Search & Date Filter Bar */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchBar}>
            <Search size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Ada, barkoda, qeydə görə axtarış..."
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={setSearchTerm}
              clearButtonMode="while-editing"
            />
            {searchTerm ? (
              <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={15} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={[
              styles.dateTriggerBtn,
              isDateFiltered && styles.dateTriggerBtnActive,
            ]}
            onPress={() => setDateModalVisible(true)}
            activeOpacity={0.8}
          >
            <CalendarIcon size={18} color={isDateFiltered ? '#059669' : '#4B5563'} />
            {isDateFiltered && <View style={styles.dateFilterDot} />}
          </TouchableOpacity>
        </View>

        {/* Quick Date Presets Row */}
        <View style={styles.dateChipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateChipsContainer}
          >
            <TouchableOpacity
              style={[
                styles.dateChip,
                dateRange.preset === 'all' && styles.dateChipActive,
              ]}
              onPress={() => handleQuickPreset('all')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateChipText,
                  dateRange.preset === 'all' && styles.dateChipTextActive,
                ]}
              >
                Hamısı
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateChip,
                dateRange.preset === 'today' && styles.dateChipActive,
              ]}
              onPress={() => handleQuickPreset('today')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateChipText,
                  dateRange.preset === 'today' && styles.dateChipTextActive,
                ]}
              >
                Bu gün
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateChip,
                dateRange.preset === 'yesterday' && styles.dateChipActive,
              ]}
              onPress={() => handleQuickPreset('yesterday')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateChipText,
                  dateRange.preset === 'yesterday' && styles.dateChipTextActive,
                ]}
              >
                Dünən
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateChip,
                dateRange.preset === 'week' && styles.dateChipActive,
              ]}
              onPress={() => handleQuickPreset('week')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateChipText,
                  dateRange.preset === 'week' && styles.dateChipTextActive,
                ]}
              >
                Son 7 gün
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateChip,
                dateRange.preset === 'month' && styles.dateChipActive,
              ]}
              onPress={() => handleQuickPreset('month')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateChipText,
                  dateRange.preset === 'month' && styles.dateChipTextActive,
                ]}
              >
                Bu ay
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateChip,
                dateRange.preset === 'custom' && styles.dateChipActive,
                isDateFiltered && dateRange.preset === 'custom' && styles.dateChipCustomActive,
              ]}
              onPress={() => setDateModalVisible(true)}
              activeOpacity={0.7}
            >
              <CalendarIcon
                size={12}
                color={dateRange.preset === 'custom' ? '#0284C7' : '#6B7280'}
              />
              <Text
                style={[
                  styles.dateChipText,
                  dateRange.preset === 'custom' && { color: '#0284C7', fontWeight: '700' },
                ]}
              >
                {dateRange.preset === 'custom' && dateRange.startDate
                  ? `${formatDisplayDate(dateRange.startDate)}${
                      dateRange.endDate && dateRange.endDate !== dateRange.startDate
                        ? ` - ${formatDisplayDate(dateRange.endDate)}`
                        : ''
                    }`
                  : 'Fərdi...'}
              </Text>
            </TouchableOpacity>

            {isDateFiltered ? (
              <TouchableOpacity
                style={styles.clearDateBtn}
                onPress={() => handleQuickPreset('all')}
                activeOpacity={0.7}
              >
                <RotateCcw size={11} color="#DC2626" />
                <Text style={styles.clearDateBtnText}>Sıfırla</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Məlumatlar yüklənir...</Text>
          </View>
        ) : (
          renderCurrentList()
        )}

        <DeleteHistoryModal
          visible={deleteModalVisible}
          item={itemToDelete}
          onClose={() => setDeleteModalVisible(false)}
          onSuccess={handleDeleteSuccess}
        />

        <SaleDetailModal
          visible={!!selectedSaleDetail}
          sale={selectedSaleDetail}
          onClose={() => setSelectedSaleDetail(null)}
          onDelete={(sale) => handleOpenDelete(sale, 'sale')}
          canDelete={canDeleteHistory}
          permissions={permissions}
        />

        <DateFilterModal
          visible={dateModalVisible}
          currentRange={dateRange}
          onClose={() => setDateModalVisible(false)}
          onApply={(newRange) => {
            setDateRange(newRange);
            setDateModalVisible(false);
          }}
        />
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  tabsWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  tabsContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.4,
  },
  countBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 5,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  dateTriggerBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dateTriggerBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  dateFilterDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  dateChipsWrapper: {
    marginBottom: 6,
  },
  dateChipsContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  dateChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  dateChipCustomActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  dateChipTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  clearDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  clearDateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 40,
    gap: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  barcodeChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  barcodeChipText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#4B5563',
    fontWeight: '600',
  },
  supplierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  supplierChipText: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: '600',
    maxWidth: 120,
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  channelChipText: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  discountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  discountChipText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '800',
  },
  reasonChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reasonChipText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '900',
  },
  subPriceText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    marginTop: 10,
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  notesText: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  transferItemsCount: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '700',
    marginTop: 2,
  },
  transferItemsList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    gap: 4,
  },
  transferItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transferItemName: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  transferItemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  moreItemsText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
