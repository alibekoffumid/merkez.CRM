import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, ArrowDownRight, ArrowUpRight, Check } from 'lucide-react-native';
import { Product } from '../types';
import { movementService } from '../services/movementService';

interface StockOperationModalProps {
  product: Product | null;
  operationType: 'RECEIVE' | 'DISPATCH' | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  canViewSupplier?: boolean;
}

export const StockOperationModal: React.FC<StockOperationModalProps> = ({
  product,
  operationType,
  visible,
  onClose,
  onSuccess,
  canViewSupplier = true,
}) => {
  if (!product || !operationType) return null;

  const isReceive = operationType === 'RECEIVE';
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState(String(product.purchase_price ?? ''));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      Alert.alert('Xəta', 'Düzgün miqdar daxil edin');
      return;
    }

    if (!isReceive && qtyNum > (product.stock_quantity || 0)) {
      Alert.alert('Diqqət', `Anbarda yalnız ${product.stock_quantity} əd. mövcuddur`);
      return;
    }

    try {
      setLoading(true);
      if (isReceive) {
        await movementService.recordReceipt(
          [{
            productId: product.id,
            quantity: qtyNum,
            unitPrice: parseFloat(unitPrice) || undefined,
          }],
          product.supplier_id,
          notes
        );
        Alert.alert('Uğurlu', `${qtyNum} əd. anbara mədaxil edildi`);
      } else {
        await movementService.recordDispatch(
          [{
            productId: product.id,
            quantity: qtyNum,
          }],
          'Mobil terminal ilə silinmə',
          notes
        );
        Alert.alert('Uğurlu', `${qtyNum} əd. anbardian silindi`);
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert('Əməliyyat xətası', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconWrap, isReceive ? styles.iconGreen : styles.iconRed]}>
                {isReceive ? (
                  <ArrowDownRight size={22} color="#059669" />
                ) : (
                  <ArrowUpRight size={22} color="#DC2626" />
                )}
              </View>
              <View>
                <Text style={styles.sheetTitle}>
                  {isReceive ? 'Məhsul mədaxili' : 'Məhsul silinməsi / Məxaric'}
                </Text>
                <Text style={styles.sheetSub} numberOfLines={1}>
                  {product.name}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Miqdar ({product.unit || 'əd.'})</Text>
              <TextInput
                style={styles.bigInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                autoFocus
              />
            </View>

            {isReceive && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vahid maya qiyməti (₼)</Text>
                <TextInput
                  style={styles.input}
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Qeyd / Səbəb</Text>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder={isReceive ? (canViewSupplier ? 'Qaimə nömrəsi və ya təchizatçı' : 'Qaimə nömrəsi və ya qeyd') : 'Silinmə səbəbi'}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isReceive ? styles.submitBtnGreen : styles.submitBtnRed]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {isReceive ? 'Mədaxili təsdiqlə' : 'Silinməni təsdiqlə'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconGreen: {
    backgroundColor: '#ECFDF5',
  },
  iconRed: {
    backgroundColor: '#FEF2F2',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  sheetSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
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
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
  },
  bigInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 8,
  },
  submitBtnGreen: {
    backgroundColor: '#059669',
  },
  submitBtnRed: {
    backgroundColor: '#DC2626',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
