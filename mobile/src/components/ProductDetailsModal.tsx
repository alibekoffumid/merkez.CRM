import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Barcode,
  Plus,
  Minus,
  Check,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  KeyRound,
  ChevronDown,
  Folder,
  Search,
} from 'lucide-react-native';
import { Product, Category, ProductAttribute } from '../types';
import { productService } from '../services/productService';
import { ProductCharacteristicsSection } from './ProductCharacteristicsSection';
import { CategoryPickerModal } from './CategoryPickerModal';
import { parseProductAttributes, cleanAttributesForSave } from '../utils/productAttributes';

interface ProductDetailsModalProps {
  product: Product | null;
  categories?: Category[];
  visible: boolean;
  onClose: () => void;
  onUpdated: (updatedProduct: Product) => void;
  onReceiveClick: (product: Product) => void;
  onDispatchClick: (product: Product) => void;
  onPrintLabels?: (product: Product) => void;
  onRentProduct?: (product: Product) => void;
  canViewCostPrices?: boolean;
  canManageProducts?: boolean;
  canPerformMovements?: boolean;
  canViewSupplier?: boolean;
  isAdmin?: boolean;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  categories,
  visible,
  onClose,
  onUpdated,
  onReceiveClick,
  onDispatchClick,
  onPrintLabels,
  onRentProduct,
  canViewCostPrices = true,
  canManageProducts = true,
  canPerformMovements = true,
  canViewSupplier = true,
  isAdmin = true,
}) => {
  if (!visible || !product || !isAdmin) return null;

  const [saving, setSaving] = useState(false);
  const [nameInput, setNameInput] = useState(product.name || '');
  const [stockInput, setStockInput] = useState(String(product.stock_quantity));
  const [priceInput, setPriceInput] = useState(String(product.sale_price ?? product.price ?? 0));
  const [costInput, setCostInput] = useState(String(product.purchase_price ?? 0));
  const [factoryPriceInput, setFactoryPriceInput] = useState(String(product.factory_price ?? ''));
  const [factoryCurrency, setFactoryCurrency] = useState<'AZN' | 'USD' | 'UAN' | 'TRY'>('USD');
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(product.category_id || null);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const allCategories = useMemo(() => {
    return categories && categories.length > 0
      ? categories
      : productService.getCachedCategories() || [];
  }, [categories]);

  const allProducts = useMemo(() => {
    return productService.getCachedProducts() || [];
  }, []);

  useEffect(() => {
    if (product) {
      setNameInput(product.name || '');
      setStockInput(String(product.stock_quantity ?? 0));
      setPriceInput(String(product.sale_price ?? product.price ?? 0));
      setCostInput(String(product.purchase_price ?? 0));

      let initialCatId = product.category_id || null;
      if (!initialCatId && product.category) {
        const found = allCategories.find((c) => c.name.toLowerCase() === product.category?.toLowerCase());
        if (found) initialCatId = found.id;
      }
      setSelectedCategoryId(initialCatId);

      const fp = String(product.factory_price ?? '');
      if (fp.includes('₼') || fp.toUpperCase().includes('AZN')) {
        setFactoryCurrency('AZN');
      } else if (
        fp.includes('¥') ||
        fp.includes('￥') ||
        fp.toUpperCase().includes('UAN') ||
        fp.toUpperCase().includes('CNY')
      ) {
        setFactoryCurrency('UAN');
      } else if (fp.includes('₺') || fp.toUpperCase().includes('TRY') || fp.toUpperCase().includes('TL')) {
        setFactoryCurrency('TRY');
      } else if (fp.includes('$') || fp.toUpperCase().includes('USD')) {
        setFactoryCurrency('USD');
      }
      const cleanFp = fp.replace(/[₼$￥¥€₺\s]/g, '').trim();
      setFactoryPriceInput(cleanFp || fp);

      setAttributes(parseProductAttributes(product));
    }
  }, [product, allCategories]);

  // Resolve exact current category name
  const currentCategoryName = useMemo(() => {
    if (selectedCategoryId) {
      const found = allCategories.find((c: any) => c.id === selectedCategoryId);
      if (found?.name) return found.name;
    }
    if (product.category && product.category.trim() && product.category !== 'Kateqoriyasız') {
      return product.category;
    }
    return 'Kateqoriyasız';
  }, [selectedCategoryId, allCategories, product.category]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return allCategories;
    const q = categorySearch.toLowerCase().trim();
    return allCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [allCategories, categorySearch]);

  const handleQuickStockDelta = async (delta: number) => {
    const current = Number(product.stock_quantity) || 0;
    const nextVal = Math.max(0, current + delta);
    setStockInput(String(nextVal));

    try {
      setSaving(true);
      await productService.updateStock(product.id, nextVal);
      const updated = { ...product, stock_quantity: nextVal };
      onUpdated(updated);
    } catch (e: any) {
      Alert.alert('Xəta', 'Qalığı yeniləmək mümkün olmadı: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const trimmedName = nameInput.trim();
    if (isAdmin && !trimmedName) {
      Alert.alert('Xəta', 'Məhsulun adı boş ola bilməz');
      return;
    }

    try {
      setSaving(true);
      let formattedFp = factoryPriceInput.trim();
      if (formattedFp) {
        const cleanNum = formattedFp.replace(/[₼$￥¥€₺\s]/g, '');
        const sym = factoryCurrency === 'USD' ? '$' : factoryCurrency === 'UAN' ? '¥' : factoryCurrency === 'TRY' ? '₺' : '₼';
        formattedFp = cleanNum ? `${sym}${cleanNum}` : formattedFp;
      }

      const updatedData: Partial<Product> = {
        id: product.id,
        name: isAdmin && trimmedName ? trimmedName : product.name,
        category_id: selectedCategoryId || undefined,
        stock_quantity: parseFloat(stockInput) || 0,
        sale_price: parseFloat(priceInput) || 0,
        purchase_price: parseFloat(costInput) || 0,
        factory_price: formattedFp,
        description: product.description,
        attributes: cleanAttributesForSave(attributes),
      };

      const res = await productService.saveProduct(updatedData);
      onUpdated({
        ...product,
        ...res,
        name: updatedData.name || product.name,
        category_id: selectedCategoryId || undefined,
        category: currentCategoryName,
        attributes: updatedData.attributes,
      });
      Alert.alert('Uğurlu', 'Məhsul məlumatları saxlanıldı');
      onClose();
    } catch (e: any) {
      Alert.alert('Saxlama xətası', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header with single title display */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.title} numberOfLines={2}>
                {nameInput.trim() || product.name}
              </Text>
              {product.barcode ? (
                <View style={styles.barcodeRow}>
                  <Barcode size={14} color="#6B7280" />
                  <Text style={styles.barcodeText}>{product.barcode}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Name input card for Admin */}
            {isAdmin && (
              <View style={styles.nameCard}>
                <View style={styles.nameCardHeader}>
                  <Text style={styles.inputLabel}>Məhsulun adı</Text>
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>Admin</Text>
                  </View>
                </View>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Məhsulun adını daxil edin..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              </View>
            )}

            {/* Quick Stock Counter Box - Compact Redesign */}
            <View style={styles.stockCard}>
              <Text style={styles.sectionLabel}>Anbardakı cari qalıq</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => handleQuickStockDelta(-1)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Minus size={18} color="#DC2626" />
                </TouchableOpacity>

                <View style={styles.stockDisplay}>
                  <TextInput
                    style={styles.stockInputLarge}
                    value={stockInput}
                    onChangeText={setStockInput}
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitText}>{product.unit || 'əd.'}</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => handleQuickStockDelta(1)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color="#059669" />
                </TouchableOpacity>
              </View>

              {/* Quick Operation shortcuts */}
              {canPerformMovements && (
                <View style={styles.opShortcuts}>
                  <TouchableOpacity
                    style={styles.opBtnGreen}
                    onPress={() => {
                      onClose();
                      onReceiveClick(product);
                    }}
                    activeOpacity={0.7}
                  >
                    <ArrowDownRight size={15} color="#059669" />
                    <Text style={styles.opBtnTextGreen}>Məhsul qəbulu</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.opBtnRed}
                    onPress={() => {
                      onClose();
                      onDispatchClick(product);
                    }}
                    activeOpacity={0.7}
                  >
                    <ArrowUpRight size={15} color="#DC2626" />
                    <Text style={styles.opBtnTextRed}>Məhsul silinməsi</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Price Inputs */}
            {canViewCostPrices && (
              <View style={styles.priceSection}>
                <View style={styles.priceRow}>
                  {/* 1. Zavod Qiyməti */}
                  <View style={styles.priceInputBox}>
                    <Text style={styles.inputLabel}>Zavod qiyməti</Text>
                    <TextInput
                      style={styles.textInput}
                      value={factoryPriceInput}
                      onChangeText={setFactoryPriceInput}
                      keyboardType="decimal-pad"
                      placeholder={`məs. ${factoryCurrency === 'AZN' ? '₼' : factoryCurrency === 'USD' ? '$' : factoryCurrency === 'TRY' ? '₺' : '¥'}26.71`}
                      editable={canManageProducts}
                    />
                  </View>

                  {/* 2. Maya Qiyməti */}
                  <View style={styles.priceInputBox}>
                    <Text style={styles.inputLabel}>Maya qiyməti (₼)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={costInput}
                      onChangeText={setCostInput}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      editable={canManageProducts}
                    />
                  </View>
                </View>

                {/* Currency Switcher: Full width under the price row so all 4 currencies are 100% visible */}
                <View style={styles.currencySwitcherRow}>
                  {(['AZN', 'USD', 'UAN', 'TRY'] as const).map((curr) => {
                    const sym = curr === 'AZN' ? '₼' : curr === 'USD' ? '$' : curr === 'TRY' ? '₺' : '¥';
                    const isSel = factoryCurrency === curr;
                    return (
                      <TouchableOpacity
                        key={curr}
                        disabled={!canManageProducts}
                        onPress={() => setFactoryCurrency(curr)}
                        style={[
                          styles.currencyPill,
                          isSel && styles.currencyPillActive,
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.currencyPillText,
                            isSel && styles.currencyPillTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {sym} {curr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.priceSingleBox}>
              <Text style={styles.inputLabelGreen}>Satış qiyməti (₼)</Text>
              <TextInput
                style={styles.textInputGreen}
                value={priceInput}
                onChangeText={setPriceInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                editable={canManageProducts}
              />
            </View>

            {/* Category Dropdown Card */}
            <View style={styles.categoryCard}>
              <View style={styles.categoryCardHeader}>
                <Text style={styles.inputLabel}>Kateqoriya</Text>
                {canManageProducts && (
                  <Text style={styles.categoryHintText}>Dəyişmək üçün toxunun</Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.categoryPickerBtn,
                  !canManageProducts && { opacity: 0.7 },
                ]}
                onPress={() => {
                  if (canManageProducts) {
                    setCategorySearch('');
                    setCategoryPickerVisible(true);
                  }
                }}
                disabled={!canManageProducts}
                activeOpacity={0.7}
              >
                <View style={styles.categoryPickerLeft}>
                  <Folder size={18} color="#059669" />
                  <Text style={styles.categoryPickerValue} numberOfLines={1}>
                    {currentCategoryName}
                  </Text>
                </View>
                {canManageProducts && <ChevronDown size={18} color="#6B7280" />}
              </TouchableOpacity>
            </View>

            {/* Additional meta (Supplier, Article) */}
            {(canViewSupplier && product.supplier_name || product.article_number) ? (
              <View style={styles.metaBox}>
                {canViewSupplier && product.supplier_name ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Təchizatçı:</Text>
                    <Text style={styles.metaVal}>{product.supplier_name}</Text>
                  </View>
                ) : null}
                {product.article_number ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>Artikul:</Text>
                    <Text style={styles.metaVal}>{product.article_number}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {canManageProducts && (
              <ProductCharacteristicsSection
                attributes={attributes}
                onChange={setAttributes}
              />
            )}

            {onPrintLabels && (
              <TouchableOpacity
                style={styles.printLabelBtn}
                onPress={() => onPrintLabels(product)}
              >
                <Printer size={16} color="#2563EB" />
                <Text style={styles.printLabelBtnText}>Barkod Etiketini Çap Et</Text>
              </TouchableOpacity>
            )}

            {onRentProduct && (
              <TouchableOpacity
                style={styles.rentProductBtn}
                onPress={() => onRentProduct(product)}
              >
                <KeyRound size={16} color="#4F46E5" />
                <Text style={styles.rentProductBtnText}>Məhsulu İcarəyə Ver</Text>
              </TouchableOpacity>
            )}

            {canManageProducts && (
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveAll}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Dəyişiklikləri saxla</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Category Selection Modal with Full Tree Hierarchy & Depth Colors */}
      <CategoryPickerModal
        visible={categoryPickerVisible}
        onClose={() => setCategoryPickerVisible(false)}
        categories={allCategories}
        selectedCategoryId={selectedCategoryId || ''}
        onSelectCategory={(id) => {
          setSelectedCategoryId(id || null);
        }}
        products={allProducts}
        canViewStockStats={canViewCostPrices}
        hideAllOption={true}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editNameBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerNameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerNameInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  headerNameConfirmBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  nameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adminBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  nameInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    minHeight: 40,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  barcodeText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 45,
  },
  stockCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stockDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  stockInputLarge: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    minWidth: 70,
    paddingVertical: 2,
  },
  unitText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  opShortcuts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    width: '100%',
  },
  opBtnGreen: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  opBtnTextGreen: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  opBtnRed: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  opBtnTextRed: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  priceSection: {
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInputBox: {
    flex: 1,
  },
  currencySwitcherRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
    gap: 6,
  },
  currencyPill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currencyPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  currencyPillTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  priceSingleBox: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputLabelGreen: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  textInputGreen: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 18,
    fontWeight: '800',
    color: '#065F46',
  },
  categoryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryHintText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  categoryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryPickerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  metaBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaKey: {
    fontSize: 13,
    color: '#6B7280',
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  saveBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  printLabelBtn: {
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 10,
  },
  printLabelBtnText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '800',
  },
  rentProductBtn: {
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    marginBottom: 10,
  },
  rentProductBtnText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '800',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  catModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  catModalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
    paddingBottom: 30,
  },
  catModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  catModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  catModalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  catSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  catListScroll: {
    maxHeight: 350,
  },
  catListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  catListItemActive: {
    backgroundColor: '#ECFDF5',
  },
  catItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  catItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  catItemTextActive: {
    fontWeight: '800',
    color: '#059669',
  },
});
