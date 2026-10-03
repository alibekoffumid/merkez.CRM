import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import {
  Trash2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  X,
  ShieldAlert,
  Check,
  PackageX,
  FileEdit,
} from 'lucide-react-native';
import { movementService } from '../services/movementService';

export interface HistoryItemToDelete {
  id: string;
  product_id: string;
  product_name: string;
  barcode?: string;
  quantity: number;
  type: 'sale' | 'dispatch' | 'receipt';
  notes?: string;
}

interface DeleteHistoryModalProps {
  visible: boolean;
  item: HistoryItemToDelete | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

interface ReasonOption {
  id: string;
  label: string;
  bgColor: string;
}

const REASONS: ReasonOption[] = [
  {
    id: 'return',
    label: 'Müştəri qaytarması (İadə)',
    bgColor: '#EFF6FF',
  },
  {
    id: 'error',
    label: 'Səhv vurulmuş əməliyyat',
    bgColor: '#FEF3C7',
  },
  {
    id: 'damaged',
    label: 'Zədəli / Yararsız məhsul',
    bgColor: '#FEE2E2',
  },
  {
    id: 'other',
    label: 'Digər səbəb',
    bgColor: '#F3F4F6',
  },
];

const renderReasonIcon = (id: string, isSelected: boolean) => {
  if (isSelected) {
    switch (id) {
      case 'return':
        return <RotateCcw size={15} color="#DC2626" />;
      case 'error':
        return <AlertCircle size={15} color="#DC2626" />;
      case 'damaged':
        return <PackageX size={15} color="#DC2626" />;
      case 'other':
      default:
        return <FileEdit size={15} color="#DC2626" />;
    }
  }

  switch (id) {
    case 'return':
      return <RotateCcw size={15} color="#2563EB" />;
    case 'error':
      return <AlertCircle size={15} color="#D97706" />;
    case 'damaged':
      return <PackageX size={15} color="#DC2626" />;
    case 'other':
    default:
      return <FileEdit size={15} color="#6B7280" />;
  }
};

export const DeleteHistoryModal: React.FC<DeleteHistoryModalProps> = ({
  visible,
  item,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('return');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && item) {
      setSelectedReason(item.type === 'sale' ? 'return' : 'error');
      setNote('');
      setLoading(false);
    }
  }, [visible, item]);

  if (!item) return null;

  const isSale = item.type === 'sale';
  const isDispatch = item.type === 'dispatch';
  const isReceipt = item.type === 'receipt';

  const modalTitle = isSale
    ? 'Satışın ləğvi / Qaytarılması'
    : isDispatch
    ? 'Silinmənin ləğvi'
    : 'Qəbulun ləğvi';

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const chosenReasonObj = REASONS.find((r) => r.id === selectedReason);
      const reasonLabel = chosenReasonObj ? chosenReasonObj.label : selectedReason;
      const fullReason = note.trim() ? `${reasonLabel}: ${note.trim()}` : reasonLabel;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Şəbəkə sorğusu vaxtı bitdi. Zəhmət olmasa yenidən cəhd edin.')), 10000)
      );

      let successMsg = '';
      if (isReceipt) {
        const res = await Promise.race([
          movementService.deleteReceipt(item.id, reasonLabel, fullReason),
          timeoutPromise,
        ]);
        successMsg = `"${res.productName}" qəbul yazısı silindi. Qalıqdan ${res.deductedQuantity} əd. çıxıldı.`;
      } else {
        const res = await Promise.race([
          movementService.deleteDispatchOrSale(
            item.id,
            reasonLabel,
            fullReason
          ),
          timeoutPromise,
        ]);
        successMsg = `"${res.productName}" uğurla silindi. Anbara ${res.restoredQuantity} ədəd bərpa olundu.`;
      }

      onClose();
      setTimeout(() => {
        onSuccess(successMsg);
      }, 150);
    } catch (err: any) {
      console.error('Delete history error:', err);
      Alert.alert('Xəta baş verdi', err.message || 'Əməliyyatı silmək mümkün olmadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.dangerIconBadge}>
                  {isSale ? (
                    <RotateCcw size={20} color="#DC2626" />
                  ) : (
                    <Trash2 size={20} color="#DC2626" />
                  )}
                </View>
                <View>
                  <Text style={styles.title}>{modalTitle}</Text>
                  <View style={styles.adminTag}>
                    <ShieldAlert size={11} color="#B91C1C" />
                    <Text style={styles.adminTagText}>Yalnız Admin səlahiyyəti</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                disabled={loading}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Product summary card */}
            <View style={styles.productCard}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.product_name}
              </Text>
              {item.barcode ? (
                <Text style={styles.barcodeText}>{item.barcode}</Text>
              ) : null}

              {/* Stock impact banner */}
              {isSale || isDispatch ? (
                <View style={styles.stockImpactGreen}>
                  <RotateCcw size={14} color="#059669" />
                  <Text style={styles.stockImpactTextGreen}>
                    Anbara geri qaytarılacaq: +{item.quantity} ədəd
                  </Text>
                </View>
              ) : (
                <View style={styles.stockImpactAmber}>
                  <AlertTriangle size={14} color="#D97706" />
                  <Text style={styles.stockImpactTextAmber}>
                    Anbar qalığından çıxılacaq: -{item.quantity} ədəd
                  </Text>
                </View>
              )}
            </View>

            {/* Reason selector */}
            <Text style={styles.sectionLabel}>Ləğv / Qaytarılma səbəbi:</Text>
            <View style={styles.reasonsList}>
              {REASONS.map((r) => {
                const isSelected = selectedReason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.reasonOption,
                      isSelected && styles.reasonOptionActive,
                    ]}
                    onPress={() => setSelectedReason(r.id)}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.reasonIconBox,
                        { backgroundColor: isSelected ? '#FEE2E2' : r.bgColor },
                      ]}
                    >
                      {renderReasonIcon(r.id, isSelected)}
                    </View>
                    <Text
                      style={[
                        styles.reasonLabel,
                        isSelected && styles.reasonLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {r.label}
                    </Text>
                    {isSelected ? (
                      <View style={styles.checkCircle}>
                        <Check size={11} color="#fff" strokeWidth={3} />
                      </View>
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Additional note */}
            <Text style={styles.sectionLabel}>Əlavə qeyd (istəyə görə):</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Qeyd və ya izahat daxil edin..."
              placeholderTextColor="#9CA3AF"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={200}
              editable={!loading}
            />

            {/* Action buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>Ləğv et</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Trash2 size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>
                      {isSale ? 'Qaytar və Sil' : 'Təsdiqlə və Sil'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dangerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  adminTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  adminTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  closeBtn: {
    padding: 4,
  },
  productCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  productName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  barcodeText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  stockImpactGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  stockImpactTextGreen: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  stockImpactAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  stockImpactTextAmber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  reasonsList: {
    gap: 6,
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  reasonOptionActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  reasonIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reasonLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  reasonLabelActive: {
    color: '#B91C1C',
    fontWeight: '800',
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#111827',
    minHeight: 50,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  confirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
});
