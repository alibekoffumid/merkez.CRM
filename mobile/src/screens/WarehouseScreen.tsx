import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import {
  Search,
  Barcode,
  Plus,
  Filter,
  AlertTriangle,
  Package,
  Layers,
  Sparkles,
  Folder,
  ChevronDown,
  X,
  LogOut,
  User,
  Printer,
  CheckSquare,
  Square,
  KeyRound,
  Store,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { Product, Category, Warehouse } from '../types';
import { productService } from '../services/productService';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailsModal } from '../components/ProductDetailsModal';
import { StockOperationModal } from '../components/StockOperationModal';
import { NewProductModal } from '../components/NewProductModal';
import { CategoryPickerModal } from '../components/CategoryPickerModal';
import { LabelPrintModal } from '../components/LabelPrintModal';
import { RentProductModal } from '../components/RentProductModal';
import { RentalsListModal } from '../components/RentalsListModal';
import { WarehousePickerModal } from '../components/WarehousePickerModal';
import { rentalService } from '../services/rentalService';
import { buildCategoryDescendantMap } from '../utils/categoryUtils';

interface WarehouseScreenProps {
  onOpenScanner: (mode: 'terminal' | 'gun' | 'stocktake' | 'pos') => void;
  onAddToCart?: (product: Product) => void;
  externalScannedBarcode?: string | null;
  onClearScannedBarcode?: () => void;
}

export const WarehouseScreen: React.FC<WarehouseScreenProps> = ({
  onOpenScanner,
  onAddToCart,
  externalScannedBarcode,
  onClearScannedBarcode,
}) => {
  const { user, profile, logout, currentStaff, permissions, lockStaff } = useAuth();
  const [products, setProducts] = useState<Product[]>(() => productService.getCachedProducts() || []);
  const [categories, setCategories] = useState<Category[]>(() => productService.getCachedCategories() || []);
  const [loading, setLoading] = useState(() => !productService.getCachedProducts());
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [opModalProduct, setOpModalProduct] = useState<Product | null>(null);
  const [opType, setOpType] = useState<'RECEIVE' | 'DISPATCH' | null>(null);
  const [newProductVisible, setNewProductVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [labelPrintVisible, setLabelPrintVisible] = useState(false);
  const [labelPrintProducts, setLabelPrintProducts] = useState<Product[]>([]);
  const [rentModalVisible, setRentModalVisible] = useState(false);
  const [rentModalProducts, setRentModalProducts] = useState<Product[]>([]);
  const [rentalsListVisible, setRentalsListVisible] = useState(false);
  const [overdueRentalsCount, setOverdueRentalsCount] = useState(0);

  // Warehouse selection state
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => productService.getCachedWarehouses() || []);
  const [activeWarehouseId, setActiveWarehouseId] = useState<string>('');
  const [warehousePickerVisible, setWarehousePickerVisible] = useState(false);

  const checkOverdueRentals = async () => {
    try {
      const list = await rentalService.getRentals();
      const now = new Date();
      const count = list.filter((r) => r.status === 'ACTIVE' && r.due_date && new Date(r.due_date) < now).length;
      setOverdueRentalsCount(count);
    } catch {}
  };

  useEffect(() => {
    checkOverdueRentals();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  // When a barcode is scanned from camera, search for it or open details
  useEffect(() => {
    if (externalScannedBarcode) {
      handleBarcodeScanned(externalScannedBarcode);
      if (onClearScannedBarcode) onClearScannedBarcode();
    }
  }, [externalScannedBarcode]);

  const handleBarcodeScanned = async (barcode: string) => {
    const found = products.find(
      (p) => p.barcode === barcode || p.article_number === barcode
    );
    if (found) {
      if (permissions.isOwnerOrAdmin) {
        setSelectedProduct(found);
        setDetailsVisible(true);
      } else if (onAddToCart) {
        onAddToCart(found);
      }
    } else {
      // Lookup in DB directly
      const direct = await productService.lookupByBarcode(barcode);
      if (direct) {
        if (permissions.isOwnerOrAdmin) {
          setSelectedProduct(direct);
          setDetailsVisible(true);
        } else if (onAddToCart) {
          onAddToCart(direct);
        }
      } else if (permissions.isOwnerOrAdmin) {
        // Offer to create product with this barcode
        setNewProductVisible(true);
      }
    }
  };

  const loadData = async (forceRefresh = false) => {
    try {
      const hasCached = !!productService.getCachedProducts();
      if (!hasCached || forceRefresh) {
        setLoading(true);
      }
      const [wList, activeWId] = await Promise.all([
        productService.getWarehouses(forceRefresh),
        productService.getActiveWarehouseId(),
      ]);
      setWarehouses(wList);
      setActiveWarehouseId(activeWId);

      const [prods, cats] = await Promise.all([
        productService.getProducts(forceRefresh, activeWId),
        productService.getCategories(forceRefresh),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      console.error('loadData error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWarehouse = async (newWarehouseId: string) => {
    if (newWarehouseId === activeWarehouseId) return;
    setLoading(true);
    await productService.setActiveWarehouseId(newWarehouseId);
    setActiveWarehouseId(newWarehouseId);
    await loadData(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const descendantMap = useMemo(() => {
    return buildCategoryDescendantMap(categories);
  }, [categories]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (activeWarehouseId) {
      result = result.filter((p) => !p.warehouse_id || p.warehouse_id === activeWarehouseId);
    }

    if (showLowStockOnly && permissions.canViewStockStats) {
      result = result.filter(
        (p) => Number(p.stock_quantity || 0) <= (p.critical_stock && p.critical_stock > 0 ? p.critical_stock : 5)
      );
    }

    if (selectedCategory !== 'ALL') {
      const descendants = descendantMap[selectedCategory] || [];
      const validCategoryIds = new Set([selectedCategory, ...descendants]);
      result = result.filter((p) => p.category_id && validCategoryIds.has(p.category_id));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q)) ||
          (p.article_number && p.article_number.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (Array.isArray(p.attributes) && p.attributes.some(a => (a?.name || '').toLowerCase().includes(q) || (a?.value || '').toLowerCase().includes(q)))
      );
    }

    return result;
  }, [products, activeWarehouseId, searchTerm, selectedCategory, showLowStockOnly, permissions.canViewStockStats]);

  // Inventory stats summary
  const stats = useMemo(() => {
    const totalCount = products.length;
    const totalQty = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
    const lowStockCount = products.filter(
      (p) => Number(p.stock_quantity || 0) <= (p.critical_stock && p.critical_stock > 0 ? p.critical_stock : 5)
    ).length;
    return { totalCount, totalQty, lowStockCount };
  }, [products]);


  const handleProductUpdated = (updated: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
    if (selectedProduct?.id === updated.id) {
      setSelectedProduct(updated);
    }
  };

  const handleProductCreated = (created: Product) => {
    setProducts((prev) => [created, ...prev]);
  };

  const handleProductPress = useCallback((item: Product) => {
    if (!permissions.isOwnerOrAdmin) return;
    setSelectedProduct(item);
    setDetailsVisible(true);
  }, [permissions.isOwnerOrAdmin]);

  const handleProductReceive = useCallback((item: Product) => {
    setOpModalProduct(item);
    setOpType('RECEIVE');
  }, []);

  const handleProductDispatch = useCallback((item: Product) => {
    setOpModalProduct(item);
    setOpType('DISPATCH');
  }, []);

  const handleProductAddToCart = useCallback(
    (item: Product) => {
      if (onAddToCart) onAddToCart(item);
    },
    [onAddToCart]
  );

  const toggleProductSelection = useCallback((id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllFiltered = useCallback(() => {
    setSelectedProductIds(new Set(filteredProducts.map((p) => p.id)));
  }, [filteredProducts]);

  const handleClearSelection = useCallback(() => {
    setSelectedProductIds(new Set());
  }, []);

  const handleOpenLabelPrintForSelected = useCallback(() => {
    const prods = products.filter((p) => selectedProductIds.has(p.id));
    if (prods.length === 0) {
      Alert.alert('Məhsul seçilməyib', 'Çap etmək üçün ən azı 1 məhsul seçin');
      return;
    }
    setLabelPrintProducts(prods);
    setLabelPrintVisible(true);
  }, [products, selectedProductIds]);

  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        onPress={permissions.isOwnerOrAdmin ? () => handleProductPress(item) : undefined}
        onReceive={permissions.canPerformMovements ? () => handleProductReceive(item) : undefined}
        onDispatch={permissions.canPerformMovements ? () => handleProductDispatch(item) : undefined}
        onAddToCart={onAddToCart ? () => handleProductAddToCart(item) : undefined}
        canViewCostPrices={permissions.canViewCostPrices}
        canViewSupplier={permissions.canViewSupplier}
        canViewLowStock={permissions.canViewStockStats}
        selectionMode={selectionMode}
        isSelected={selectedProductIds.has(item.id)}
        onToggleSelect={() => toggleProductSelection(item.id)}
      />
    ),
    [
      handleProductPress,
      handleProductReceive,
      handleProductDispatch,
      handleProductAddToCart,
      onAddToCart,
      permissions,
      selectionMode,
      selectedProductIds,
      toggleProductSelection,
    ]
  );

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.warehouseDropdownBtn}
            onPress={() => setWarehousePickerVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.warehouseDropdownLeft}>
              <Store size={16} color="#2563EB" />
              <Text style={styles.warehouseDropdownText} numberOfLines={1}>
                {warehouses.find((w) => w.id === activeWarehouseId)?.name || 'DÜKKAN - ƏHMƏDLİ'}
              </Text>
            </View>
            <ChevronDown size={14} color="#2563EB" />
          </TouchableOpacity>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.switchStaffBtn}
              onPress={lockStaff}
              activeOpacity={0.8}
            >
              <User size={14} color="#10B981" />
              <Text style={styles.switchStaffText}>
                {currentStaff === 'owner'
                  ? 'Sahib'
                  : currentStaff
                  ? currentStaff.name.split(' ')[0]
                  : 'Heyət'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row: Only visible if user has permission to see stock stats or add products */}
        {(permissions.canViewStockStats || permissions.canManageProducts) && (
          <View style={styles.statsRow}>
            {permissions.canViewStockStats && (
              <>
                <TouchableOpacity
                  style={[styles.statBox, !showLowStockOnly && styles.statBoxActive]}
                  onPress={() => setShowLowStockOnly(false)}
                >
                  <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit>{stats.totalCount}</Text>
                  <Text style={styles.statLabel} numberOfLines={1}>Bütün mallar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statBox, showLowStockOnly && styles.statBoxActiveRed]}
                  onPress={() => setShowLowStockOnly(!showLowStockOnly)}
                >
                  <View style={styles.statLabelWithIcon}>
                    <AlertTriangle size={12} color="#EF4444" />
                    <Text style={styles.statValRed} numberOfLines={1} adjustsFontSizeToFit>{stats.lowStockCount}</Text>
                  </View>
                  <Text style={styles.statLabel} numberOfLines={1}>Bitmək üzrədir</Text>
                </TouchableOpacity>
              </>
            )}

            {permissions.canManageProducts && (
              <>
                <TouchableOpacity
                  style={[styles.statBox, selectionMode && styles.statBoxActiveBlue]}
                  onPress={() => {
                    const next = !selectionMode;
                    setSelectionMode(next);
                    if (!next) setSelectedProductIds(new Set());
                  }}
                >
                  <View style={styles.statLabelWithIcon}>
                    <Printer size={12} color={selectionMode ? '#2563EB' : '#475569'} />
                    <Text
                      style={[
                        styles.statValText,
                        selectionMode && { color: '#2563EB' },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {selectionMode ? selectedProductIds.size : 'Çap'}
                    </Text>
                  </View>
                  <Text
                    style={[styles.statLabel, selectionMode && { color: '#2563EB', fontWeight: '800' }]}
                    numberOfLines={1}
                  >
                    {selectionMode ? 'Seçildi' : 'Etiketlər'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addStatBox}
                  onPress={() => setNewProductVisible(true)}
                >
                  <Plus size={15} color="#10B981" />
                  <Text style={styles.addStatText} numberOfLines={1}>Əlavə et</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Ada, barkoda, artikula görə axtarış..."
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={setSearchTerm}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Category Selector Bar & Quick Chips */}
        {categories.length > 0 && (
          <View style={styles.catChipsWrapper}>
            <View style={styles.categoryControlRow}>
              {/* Category Modal Trigger Button */}
              <TouchableOpacity
                style={[
                  styles.categoryPickerBtn,
                  selectedCategory !== 'ALL' && styles.categoryPickerBtnActive,
                ]}
                onPress={() => setCategoryPickerVisible(true)}
              >
                <Folder
                  size={15}
                  color={selectedCategory !== 'ALL' ? '#059669' : '#4B5563'}
                />
                <Text
                  style={[
                    styles.categoryPickerBtnText,
                    selectedCategory !== 'ALL' && styles.categoryPickerBtnTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {selectedCategory !== 'ALL'
                    ? categories.find((c) => c.id === selectedCategory)?.name || 'Kateqoriya'
                    : 'Bütün kateqoriyalar'}
                </Text>
                <ChevronDown
                  size={15}
                  color={selectedCategory !== 'ALL' ? '#059669' : '#6B7280'}
                />
              </TouchableOpacity>

              {/* Reset Filter */}
              {selectedCategory !== 'ALL' && (
                <TouchableOpacity
                  style={styles.clearCatBtn}
                  onPress={() => setSelectedCategory('ALL')}
                >
                  <X size={14} color="#EF4444" />
                  <Text style={styles.clearCatBtnText}>Sıfırla</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Products List */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Anbar məlumatları yüklənir...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            renderItem={renderProductItem}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            updateCellsBatchingPeriod={50}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#10B981']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Package size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Məhsul tapılmadı</Text>
                <Text style={styles.emptySub}>
                  Axtarış sorğusunu və ya kateqoriyanı dəyişməyə cəhd edin
                </Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => setNewProductVisible(true)}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>İlk məhsulu əlavə et</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {/* Product Details Modal */}
        <ProductDetailsModal
          visible={detailsVisible}
          product={selectedProduct}
          categories={categories}
          onClose={() => setDetailsVisible(false)}
          onUpdated={handleProductUpdated}
          onReceiveClick={(prod) => {
            setOpModalProduct(prod);
            setOpType('RECEIVE');
          }}
          onDispatchClick={(prod) => {
            setOpModalProduct(prod);
            setOpType('DISPATCH');
          }}
          onPrintLabels={(prod) => {
            setLabelPrintProducts([prod]);
            setLabelPrintVisible(true);
          }}
          onRentProduct={(prod) => {
            setDetailsVisible(false);
            setRentModalProducts([prod]);
            setRentModalVisible(true);
          }}
          canViewCostPrices={permissions.canViewCostPrices}
          canManageProducts={permissions.canManageProducts}
          canPerformMovements={permissions.canPerformMovements}
          canViewSupplier={permissions.canViewSupplier}
          isAdmin={permissions.isOwnerOrAdmin}
        />

        {/* Stock Operation Modal (Receive / Dispatch) */}
        <StockOperationModal
          visible={opType !== null}
          product={opModalProduct}
          operationType={opType}
          onClose={() => setOpType(null)}
          onSuccess={loadData}
          canViewSupplier={permissions.canViewSupplier}
        />

        {/* Add Product Modal */}
        <NewProductModal
          visible={newProductVisible}
          onClose={() => setNewProductVisible(false)}
          onCreated={handleProductCreated}
          warehouseId={activeWarehouseId}
          onOpenScanner={() => {
            setNewProductVisible(false);
            onOpenScanner('terminal');
          }}
        />

        {/* Warehouse / Filial Selector Bottom Sheet Modal */}
        <WarehousePickerModal
          visible={warehousePickerVisible}
          warehouses={warehouses}
          activeWarehouseId={activeWarehouseId}
          onSelectWarehouse={handleSelectWarehouse}
          onClose={() => setWarehousePickerVisible(false)}
          onWarehouseCreated={(newW) => {
            setWarehouses((prev) => [...prev, newW]);
          }}
        />

        {/* Category Searchable Bottom Sheet Modal */}
        <CategoryPickerModal
          visible={categoryPickerVisible}
          onClose={() => setCategoryPickerVisible(false)}
          categories={categories}
          selectedCategoryId={selectedCategory}
          onSelectCategory={(id) => setSelectedCategory(id)}
          products={products}
          canViewStockStats={permissions.canViewStockStats}
        />

        {/* Label Print Modal */}
        <LabelPrintModal
          visible={labelPrintVisible}
          onClose={() => setLabelPrintVisible(false)}
          products={labelPrintProducts}
        />

        {/* Rent Product Modal */}
        <RentProductModal
          visible={rentModalVisible}
          products={rentModalProducts}
          onClose={() => setRentModalVisible(false)}
          onSuccess={() => {
            setSelectionMode(false);
            setSelectedProductIds(new Set());
            loadData(true);
            checkOverdueRentals();
          }}
        />

        {/* Rentals Management List Modal */}
        <RentalsListModal
          visible={rentalsListVisible}
          onClose={() => {
            setRentalsListVisible(false);
            checkOverdueRentals();
            loadData(true);
          }}
        />

        {/* Floating Selection Bar */}
        {selectionMode && (
          <View style={styles.selectionBar}>
            <View style={styles.selectionBarLeft}>
              <Text style={styles.selectionCountText}>
                {selectedProductIds.size} məhsul seçildi
              </Text>
              <View style={styles.selectionQuickBtns}>
                <TouchableOpacity onPress={handleSelectAllFiltered}>
                  <Text style={styles.selectionQuickBtnText}>Hamısını seç</Text>
                </TouchableOpacity>
                <Text style={styles.selectionDot}>·</Text>
                <TouchableOpacity onPress={handleClearSelection}>
                  <Text style={styles.selectionQuickBtnText}>Təmizlə</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.selectionBarRight}>
              <TouchableOpacity
                style={[
                  styles.rentSelectedBtn,
                  selectedProductIds.size === 0 && styles.printSelectedBtnDisabled,
                ]}
                onPress={() => {
                  const prods = products.filter((p) => selectedProductIds.has(p.id));
                  if (prods.length === 0) {
                    Alert.alert('Məhsul seçilməyib', 'İcarəyə vermək üçün ən azı 1 məhsul seçin');
                    return;
                  }
                  setRentModalProducts(prods);
                  setRentModalVisible(true);
                }}
                disabled={selectedProductIds.size === 0}
              >
                <KeyRound size={15} color="#fff" />
                <Text style={styles.printSelectedBtnText}>İcarəyə Ver</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.printSelectedBtn,
                  selectedProductIds.size === 0 && styles.printSelectedBtnDisabled,
                ]}
                onPress={handleOpenLabelPrintForSelected}
                disabled={selectedProductIds.size === 0}
              >
                <Printer size={15} color="#fff" />
                <Text style={styles.printSelectedBtnText}>Çap et</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
  },
  warehouseDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    gap: 8,
    maxWidth: 220,
  },
  warehouseDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
  warehouseDropdownText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  scanHeaderBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  switchStaffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  switchStaffText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
  },
  logoutHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginTop: 6,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  statBoxActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  statBoxActiveRed: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  statBoxActiveBlue: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  statValRed: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EF4444',
  },
  statValText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  statLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  addStatBox: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 54,
    gap: 2,
  },
  addStatText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  catChipsWrapper: {
    marginTop: 10,
    gap: 8,
  },
  categoryControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  categoryPickerBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  categoryPickerBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  categoryPickerBtnTextActive: {
    color: '#059669',
  },
  clearCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearCatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  selectionBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  selectionBarLeft: {
    flex: 1,
  },
  selectionCountText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  selectionQuickBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  selectionQuickBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  selectionDot: {
    color: '#64748B',
    fontSize: 12,
  },
  selectionBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 10,
  },
  rentSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  printSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  printSelectedBtnDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  printSelectedBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
