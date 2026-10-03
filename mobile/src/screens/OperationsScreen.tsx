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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return dateStr;
    }
  };

  // Filtered lists based on search term
  const filteredReceipts = useMemo(() => {
    if (!searchTerm.trim()) return receipts;
    const q = searchTerm.toLowerCase().trim();
    return receipts.filter(
      (r) =>
        r.product_name.toLowerCase().includes(q) ||
        (r.barcode && r.barcode.includes(q)) ||
        (r.supplier_name && r.supplier_name.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q))
    );
  }, [receipts, searchTerm]);

  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return sales;
    const q = searchTerm.toLowerCase().trim();
    return sales.filter(
      (s) =>
        s.product_name.toLowerCase().includes(q) ||
        (s.barcode && s.barcode.includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q))
    );
  }, [sales, searchTerm]);

  const filteredDispatches = useMemo(() => {
    if (!searchTerm.trim()) return dispatches;
    const q = searchTerm.toLowerCase().trim();
    return dispatches.filter(
      (d) =>
        d.product_name.toLowerCase().includes(q) ||
        (d.barcode && d.barcode.includes(q)) ||
        (d.reason && d.reason.toLowerCase().includes(q)) ||
        (d.notes && d.notes.toLowerCase().includes(q))
    );
  }, [dispatches, searchTerm]);

  const filteredTransfers = useMemo(() => {
    if (!searchTerm.trim()) return transfers;
    const q = searchTerm.toLowerCase().trim();
    return transfers.filter(
      (t) =>
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        t.items?.some((i) => i.product_name.toLowerCase().includes(q))
    );
  }, [transfers, searchTerm]);

  const getTabCount = (tab: OperationTab) => {
    switch (tab) {
      case 'receipts':
        return receipts.length;
      case 'sales':
        return sales.length;
      case 'dispatches':
        return dispatches.length;
      case 'transfers':
        return transfers.length;
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
              {item.supplier_name ? (
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
            {item.unit_price ? (
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
          <Text style={styles.dateText}>{formatDate(item.received_at)}</Text>
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
      <View style={styles.card}>
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
            <View style={[styles.qtyBadge, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.qtyText, { color: '#DC2626' }]}>
                -{item.quantity}
              </Text>
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
            <Text style={styles.dateText}>{formatDate(item.issued_at)}</Text>
          </View>
          {item.notes ? (
            <Text style={styles.notesText} numberOfLines={1}>
              {item.notes.replace(/\[kanal:[^\]]+\]/gi, '').replace(/\[endirim:[^\]]+\]/gi, '').trim()}
            </Text>
          ) : null}
        </View>
      </View>
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
          <Text style={styles.dateText}>{formatDate(item.issued_at)}</Text>
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
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
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

        {/* Search Bar */}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
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
