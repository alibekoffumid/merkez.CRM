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
import { X, Barcode, Sparkles, Check, Plus, RotateCcw } from 'lucide-react-native';
import { Product, Category, ProductAttribute } from '../types';
import { productService, getActiveUserId } from '../services/productService';
import { supabase } from '../config/supabase';
import { ProductCharacteristicsSection } from './ProductCharacteristicsSection';

interface NewProductModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (newProduct: Product) => void;
  initialBarcode?: string;
  onOpenScanner?: () => void;
  warehouseId?: string;
}

export const NewProductModal: React.FC<NewProductModalProps> = ({
  visible,
  onClose,
  onCreated,
  initialBarcode = '',
  onOpenScanner,
  warehouseId,
}) => {
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode);
  const [article, setArticle] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [factoryPrice, setFactoryPrice] = useState('');
  const [factoryCurrency, setFactoryCurrency] = useState<'AZN' | 'USD' | 'UAN' | 'TRY'>('USD');
  const [isSecondHand, setIsSecondHand] = useState(false);
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [criticalStock, setCriticalStock] = useState('5');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialBarcode) setBarcode(initialBarcode);
      setIsSecondHand(false);
      setSellerName('');
      setSellerPhone('');
      loadCategories();
    }
  }, [visible, initialBarcode]);

  const loadCategories = async () => {
    const list = await productService.getCategories();
    setCategories(list);
  };

  const generateBarcode = () => {
    // Generate EAN-13-like random internal code starting with 20
    const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000);
    setBarcode(`20${randomDigits}`);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Xəta', 'Məhsulun adını daxil edin');
      return;
    }

    try {
      setSaving(true);
      let formattedFactoryPrice = factoryPrice.trim();
      if (!isSecondHand && formattedFactoryPrice) {
        const cleanNum = formattedFactoryPrice.replace(/[₼$￥¥€₺\s]/g, '');
        const sym = factoryCurrency === 'USD' ? '$' : factoryCurrency === 'UAN' ? '¥' : factoryCurrency === 'TRY' ? '₺' : '₼';
        formattedFactoryPrice = cleanNum ? `${sym}${cleanNum}` : formattedFactoryPrice;
      }

      let extraDesc = '';
      if (isSecondHand) {
        extraDesc = 'İkinci əl məhsul\n';
        if (sellerName.trim()) extraDesc += `Satan: ${sellerName.trim()}\n`;
        if (sellerPhone.trim()) extraDesc += `Tel: ${sellerPhone.trim()}\n`;
      }

      const cleanAttrs = attributes.filter(a => a.name.trim() || a.value.trim());

      const newProd = await productService.saveProduct({
        name: name.trim(),
        barcode: barcode.trim() || article.trim() || undefined,
        warehouse_id: warehouseId,
        category_id: selectedCategoryId || undefined,
        sale_price: parseFloat(salePrice) || 0,
        purchase_price: parseFloat(purchasePrice) || 0,
        factory_price: isSecondHand ? undefined : (formattedFactoryPrice || undefined),
        stock_quantity: parseFloat(stockQuantity) || 0,
        critical_stock: parseFloat(criticalStock) || 5,
        unit: 'əd.',
        description: extraDesc.trim() || undefined,
        attributes: cleanAttrs,
      });

      // Record second-hand purchase expense in cashbox
      if (isSecondHand) {
        const expenseAmt = parseFloat(purchasePrice) || 0;
        if (expenseAmt > 0) {
          try {
            const userId = await getActiveUserId();
            const todayStr = new Date().toISOString().split('T')[0];
            let sellerInfo = '';
            if (sellerName.trim()) sellerInfo += ` [Satan: ${sellerName.trim()}]`;
            if (sellerPhone.trim()) sellerInfo += ` [Tel: ${sellerPhone.trim()}]`;
            const fullDesc = `İkinci əl: ${name.trim()}${sellerInfo} [Xərcləyən: ${sellerName.trim() || 'Müştəri'}] [Mənbə: Kassa]`;

            await supabase.from('business_expenses').insert([{
              user_id: userId,
              category: 'İkinci əl alış',
              description: fullDesc,
              amount: expenseAmt,
              expense_date: todayStr
            }]);
          } catch (expErr) {
            console.warn('Could not record mobile second hand expense:', expErr);
          }
        }
      }

      Alert.alert('Uğur', 'Məhsul uğurla əlavə edildi!');
      onCreated(newProd);
      onClose();
      // Reset
      setName('');
      setBarcode('');
      setArticle('');
      setSalePrice('');
      setPurchasePrice('');
      setFactoryPrice('');
      setStockQuantity('0');
      setAttributes([]);
      setIsSecondHand(false);
      setSellerName('');
      setSellerPhone('');
    } catch (e: any) {
      Alert.alert('Xəta', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <Plus size={20} color="#10B981" />
              </View>
              <Text style={styles.title}>Yeni məhsul</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={[
                  styles.secondHandBtn,
                  isSecondHand && styles.secondHandBtnActive
                ]}
                onPress={() => setIsSecondHand(!isSecondHand)}
              >
                <RotateCcw size={13} color={isSecondHand ? '#FFFFFF' : '#B45309'} />
                <Text style={[styles.secondHandBtnText, isSecondHand && styles.secondHandBtnTextActive]}>
                  İkinci əl
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Name */}
            <View style={styles.group}>
              <Text style={styles.label}>Məhsulun adı *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Məsələn: Mühərrik yağı 5W-40"
              />
            </View>

            {/* Barcode & Generation */}
            <View style={styles.group}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Barkod</Text>
                <TouchableOpacity style={styles.genBtn} onPress={generateBarcode}>
                  <Sparkles size={12} color="#4F46E5" />
                  <Text style={styles.genBtnText}>Avtomatik yarat</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.barcodeInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={barcode}
                  onChangeText={setBarcode}
                  placeholder="EAN-13 barkod və ya artikul"
                  keyboardType="numeric"
                />
                {onOpenScanner && (
                  <TouchableOpacity style={styles.scanBtn} onPress={onOpenScanner}>
                    <Barcode size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Category selection */}
            {categories.length > 0 && (
              <View style={styles.group}>
                <Text style={styles.label}>Kateqoriya</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                  {categories.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.catPill,
                        selectedCategoryId === c.id && styles.catPillActive,
                      ]}
                      onPress={() =>
                        setSelectedCategoryId(selectedCategoryId === c.id ? '' : c.id)
                      }
                    >
                      <Text
                        style={[
                          styles.catPillText,
                          selectedCategoryId === c.id && styles.catPillTextActive,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Prices */}
            {isSecondHand ? (
              <View style={styles.secondHandBox}>
                <Text style={styles.secondHandBoxTitle}>İkinci əl məhsul qeydiyyatı</Text>
                <View style={styles.row}>
                  <View style={[styles.group, { flex: 1 }]}>
                    <Text style={styles.label}>Alış qiyməti (₼) *</Text>
                    <TextInput
                      style={[styles.input, { borderColor: '#F59E0B', backgroundColor: '#FEF3C7' }]}
                      value={purchasePrice}
                      onChangeText={setPurchasePrice}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                    />
                  </View>
                  <View style={[styles.group, { flex: 1 }]}>
                    <Text style={styles.label}>Satış qiyməti (₼) *</Text>
                    <TextInput
                      style={styles.input}
                      value={salePrice}
                      onChangeText={setSalePrice}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                    />
                  </View>
                </View>

                {/* Seller info */}
                <View style={styles.group}>
                  <Text style={styles.label}>Satan şəxs (Ad, Soyad)</Text>
                  <TextInput
                    style={styles.input}
                    value={sellerName}
                    onChangeText={setSellerName}
                    placeholder="Məsələn: Əli Məmmədov"
                  />
                </View>
                <View style={styles.group}>
                  <Text style={styles.label}>Əlaqə nömrəsi</Text>
                  <TextInput
                    style={styles.input}
                    value={sellerPhone}
                    onChangeText={setSellerPhone}
                    keyboardType="phone-pad"
                    placeholder="Məsələn: +994 50 123 45 67"
                  />
                </View>

                <Text style={styles.secondHandNote}>
                  ℹ️ Alış qiyməti kassa xərclərinə (Çıxılan) əlavə ediləcək və Z-hesabatda əks olunacaq.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.row}>
                  <View style={[styles.group, { flex: 1.1 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.label}>Zavod qiyməti</Text>
                      <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 6, padding: 2 }}>
                        {(['AZN', 'USD', 'UAN', 'TRY'] as const).map((curr) => {
                          const sym = curr === 'AZN' ? '₼' : curr === 'USD' ? '$' : curr === 'TRY' ? '₺' : '¥';
                          const isSel = factoryCurrency === curr;
                          return (
                            <TouchableOpacity
                              key={curr}
                              onPress={() => setFactoryCurrency(curr)}
                              style={{
                                paddingHorizontal: 4,
                                paddingVertical: 2,
                                borderRadius: 4,
                                backgroundColor: isSel ? '#FFFFFF' : 'transparent',
                              }}
                            >
                              <Text style={{ fontSize: 9, fontWeight: '700', color: isSel ? '#4F46E5' : '#6B7280' }}>
                                {sym} {curr}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={factoryPrice}
                      onChangeText={setFactoryPrice}
                      placeholder={`məs. ${factoryCurrency === 'AZN' ? '₼' : factoryCurrency === 'USD' ? '$' : factoryCurrency === 'TRY' ? '₺' : '¥'}25.00`}
                    />
                  </View>
                  <View style={[styles.group, { flex: 1 }]}>
                    <Text style={styles.label}>Maya qiyməti (₼)</Text>
                    <TextInput
                      style={styles.input}
                      value={purchasePrice}
                      onChangeText={setPurchasePrice}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                    />
                  </View>
                </View>

                <View style={styles.group}>
                  <Text style={styles.label}>Satış qiyməti (₼) *</Text>
                  <TextInput
                    style={styles.input}
                    value={salePrice}
                    onChangeText={setSalePrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>
              </>
            )}

            {/* Stock */}
            <View style={styles.row}>
              <View style={[styles.group, { flex: 1 }]}>
                <Text style={styles.label}>İlkin qalıq</Text>
                <TextInput
                  style={styles.input}
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={[styles.group, { flex: 1 }]}>
                <Text style={styles.label}>Kritik qalıq</Text>
                <TextInput
                  style={styles.input}
                  value={criticalStock}
                  onChangeText={setCriticalStock}
                  keyboardType="numeric"
                  placeholder="5"
                />
              </View>
            </View>

            {/* Product Characteristics */}
            <ProductCharacteristicsSection
              attributes={attributes}
              onChange={setAttributes}
            />

            <TouchableOpacity
              style={styles.createBtn}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.createBtnText}>Yarat və anbara əlavə et</Text>
                </>
              )}
            </TouchableOpacity>
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
    maxHeight: '90%',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 20,
  },
  group: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  genBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  barcodeInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scanBtn: {
    backgroundColor: '#111827',
    width: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  catPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  catPillActive: {
    backgroundColor: '#10B981',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  catPillTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  createBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondHandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  secondHandBtnActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
  },
  secondHandBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  secondHandBtnTextActive: {
    color: '#FFFFFF',
  },
  secondHandBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  secondHandBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
  },
  secondHandNote: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
  },
});
