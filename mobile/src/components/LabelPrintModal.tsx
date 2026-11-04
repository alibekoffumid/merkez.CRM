import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Printer,
  X,
  Plus,
  Minus,
  Barcode,
  Settings,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { Product } from '../types';
import { labelPrintService, LabelPrintItem } from '../services/labelPrintService';
import { PrinterSettingsModal } from './PrinterSettingsModal';

interface LabelPrintModalProps {
  visible: boolean;
  onClose: () => void;
  products: Product[];
}

export const LabelPrintModal: React.FC<LabelPrintModalProps> = ({
  visible,
  onClose,
  products,
}) => {
  const [items, setItems] = useState<LabelPrintItem[]>([]);
  const [printing, setPrinting] = useState(false);
  const [printerSettingsVisible, setPrinterSettingsVisible] = useState(false);

  useEffect(() => {
    if (visible && products && products.length > 0) {
      setItems(
        products.map((p) => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode || p.article_number || '',
          price: Number(p.sale_price ?? p.price ?? 0),
          printQty: 1,
        }))
      );
    }
  }, [visible, products]);

  const handleQtyChange = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(0, (item.printQty || 0) + delta);
          return { ...item, printQty: newQty };
        }
        return item;
      })
    );
  };

  const handleSetAllQty = (qty: number) => {
    setItems((prev) => prev.map((item) => ({ ...item, printQty: Math.max(0, qty) })));
  };

  const handleSetByStock = () => {
    setItems((prev) =>
      prev.map((item) => {
        const prod = products.find((p) => p.id === item.id);
        const stock = prod ? Math.max(1, Math.min(prod.stock_quantity || 1, 99)) : 1;
        return { ...item, printQty: stock };
      })
    );
  };

  const totalLabels = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.printQty || 0), 0);
  }, [items]);

  const handlePrint = async () => {
    const validItems = items.filter((i) => (i.printQty || 0) > 0);
    if (validItems.length === 0) {
      Alert.alert('Xəbərdarlıq', 'Çap üçün ən azı 1 etiket qalmalıdır');
      return;
    }

    try {
      setPrinting(true);
      const success = await labelPrintService.printLabels(validItems);
      if (success) {
        Alert.alert('Uğurlu', `${totalLabels} ədəd etiket printerə göndərildi!`);
        onClose();
      }
    } catch (e: any) {
      Alert.alert('Çap Xətası', e.message || 'Etiketlər çap edilərkən xəta baş verdi');
    } finally {
      setPrinting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Printer size={18} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Barkod Etiketlərinin Çapı</Text>
                <Text style={styles.headerSubtitle}>
                  {items.length} məhsul · Termo 58×40 mm
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => setPrinterSettingsVisible(true)}
              >
                <Settings size={18} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Batch Actions */}
          <View style={styles.batchActionsRow}>
            <Text style={styles.batchLabel}>Sürətli:</Text>
            <TouchableOpacity
              style={styles.batchBtn}
              onPress={() => handleSetAllQty(1)}
            >
              <Sparkles size={12} color="#2563EB" />
              <Text style={styles.batchBtnText}>Hamısına 1 əd.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.batchBtn}
              onPress={handleSetByStock}
            >
              <Sparkles size={12} color="#059669" />
              <Text style={[styles.batchBtnText, { color: '#059669' }]}>Stoka görə</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.batchBtn, styles.batchBtnGray]}
              onPress={() => handleSetAllQty(0)}
            >
              <RotateCcw size={12} color="#64748B" />
              <Text style={[styles.batchBtnText, { color: '#64748B' }]}>Sıfırla</Text>
            </TouchableOpacity>
          </View>

          {/* Items List */}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.itemBadgesRow}>
                    <View style={styles.barcodeBadge}>
                      <Barcode size={12} color="#475569" />
                      <Text style={styles.barcodeText}>
                        {item.barcode || 'Barkod yoxdur'}
                      </Text>
                    </View>
                    <Text style={styles.priceBadge}>
                      {Number(item.price).toFixed(2)} ₼
                    </Text>
                  </View>
                </View>

                {/* Counter */}
                <View style={styles.counterBox}>
                  <TouchableOpacity
                    style={[styles.counterBtn, item.printQty <= 0 && styles.counterBtnDisabled]}
                    onPress={() => handleQtyChange(item.id, -1)}
                    disabled={item.printQty <= 0}
                  >
                    <Minus size={14} color={item.printQty <= 0 ? '#CBD5E1' : '#334155'} />
                  </TouchableOpacity>

                  <View style={styles.qtyDisplay}>
                    <Text style={styles.qtyText}>{item.printQty}</Text>
                    <Text style={styles.qtyUnit}>əd.</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => handleQtyChange(item.id, 1)}
                  >
                    <Plus size={14} color="#334155" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Footer Summary & Action */}
          <View style={styles.footer}>
            <View style={styles.footerInfoRow}>
              <Text style={styles.footerLabel}>Çap ediləcək etiketlər:</Text>
              <Text style={styles.footerVal}>{totalLabels} ədəd</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.printBtn,
                (totalLabels <= 0 || printing) && styles.printBtnDisabled,
              ]}
              onPress={handlePrint}
              disabled={totalLabels <= 0 || printing}
            >
              {printing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Printer size={18} color="#fff" />
                  <Text style={styles.printBtnText}>
                    {totalLabels > 0
                      ? `Etiketləri Çap Et (${totalLabels} əd.)`
                      : 'Məhsul seçin'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Printer Configuration Modal */}
      <PrinterSettingsModal
        visible={printerSettingsVisible}
        onClose={() => setPrinterSettingsVisible(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '55%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  batchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  batchLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  batchBtnGray: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  batchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  itemBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barcodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  barcodeText: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#475569',
  },
  priceBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 2,
  },
  counterBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  counterBtnDisabled: {
    opacity: 0.4,
  },
  qtyDisplay: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  qtyUnit: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginTop: -2,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  footerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  footerVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  printBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  printBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
});

