import React, { useState, useEffect } from 'react';
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
import { X, Barcode, Plus, Minus, Check, ArrowDownRight, ArrowUpRight, Edit3 } from 'lucide-react-native';
import { Product } from '../types';
import { productService } from '../services/productService';

interface ProductDetailsModalProps {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  onUpdated: (updatedProduct: Product) => void;
  onReceiveClick: (product: Product) => void;
  onDispatchClick: (product: Product) => void;
  canViewCostPrices?: boolean;
  canManageProducts?: boolean;
  canPerformMovements?: boolean;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  visible,
  onClose,
  onUpdated,
  onReceiveClick,
  onDispatchClick,
  canViewCostPrices = true,
  canManageProducts = true,
  canPerformMovements = true,
}) => {
  if (!product) return null;

  const [saving, setSaving] = useState(false);
  const [stockInput, setStockInput] = useState(String(product.stock_quantity));
  const [priceInput, setPriceInput] = useState(String(product.sale_price ?? product.price ?? 0));
  const [costInput, setCostInput] = useState(String(product.purchase_price ?? 0));
  const [factoryPriceInput, setFactoryPriceInput] = useState(String(product.factory_price ?? ''));

  useEffect(() => {
    if (product) {
      setStockInput(String(product.stock_quantity ?? 0));
      setPriceInput(String(product.sale_price ?? product.price ?? 0));
      setCostInput(String(product.purchase_price ?? 0));
      setFactoryPriceInput(String(product.factory_price ?? ''));
    }
  }, [product]);

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
    try {
      setSaving(true);
      const updatedData: Partial<Product> = {
        id: product.id,
        name: product.name,
        stock_quantity: parseFloat(stockInput) || 0,
        sale_price: parseFloat(priceInput) || 0,
        purchase_price: parseFloat(costInput) || 0,
        factory_price: factoryPriceInput.trim(),
        description: product.description,
      };

      const res = await productService.saveProduct(updatedData);
      onUpdated({ ...product, ...res });
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.title} numberOfLines={2}>
                {product.name}
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

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Quick Stock Counter Box */}
            <View style={styles.stockCard}>
              <Text style={styles.sectionLabel}>Anbardakı cari qalıq</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => handleQuickStockDelta(-1)}
                  disabled={saving}
                >
                  <Minus size={22} color="#DC2626" />
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
                >
                  <Plus size={22} color="#059669" />
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
                  >
                    <ArrowDownRight size={16} color="#059669" />
                    <Text style={styles.opBtnTextGreen}>Məhsul qəbulu</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.opBtnRed}
                    onPress={() => {
                      onClose();
                      onDispatchClick(product);
                    }}
                  >
                    <ArrowUpRight size={16} color="#DC2626" />
                    <Text style={styles.opBtnTextRed}>Məhsul silinməsi</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Price Inputs */}
            {canViewCostPrices && (
              <View style={styles.priceRow}>
                <View style={styles.priceInputBox}>
                  <Text style={styles.inputLabel}>Zavod qiyməti</Text>
                  <TextInput
                    style={styles.textInput}
                    value={factoryPriceInput}
                    onChangeText={setFactoryPriceInput}
                    placeholder="məs. $26.71"
                    editable={canManageProducts}
                  />
                </View>

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

            {/* Additional meta */}
            <View style={styles.metaBox}>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Kateqoriya:</Text>
                <Text style={styles.metaVal}>{product.category || 'Kateqoriyasız'}</Text>
              </View>
              {product.supplier_name && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Təchizatçı:</Text>
                  <Text style={styles.metaVal}>{product.supplier_name}</Text>
                </View>
              )}
              {product.article_number && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Artikul:</Text>
                  <Text style={styles.metaVal}>{product.article_number}</Text>
                </View>
              )}
            </View>

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
    maxHeight: '85%',
    paddingBottom: 30,
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
    padding: 20,
  },
  stockCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  stockDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  stockInputLarge: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    minWidth: 80,
  },
  unitText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  opShortcuts: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  opBtnGreen: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  opBtnTextGreen: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
  opBtnRed: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  opBtnTextRed: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  priceInputBox: {
    flex: 1,
  },
  priceSingleBox: {
    marginBottom: 16,
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
  metaBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
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
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
