import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  X,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  User,
  Package,
} from 'lucide-react-native';
import { WarehouseRental } from '../types';
import { rentalService } from '../services/rentalService';
import { useAuth } from '../context/AuthContext';

interface ReturnRentalModalProps {
  visible: boolean;
  rental: WarehouseRental | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReturnRentalModal: React.FC<ReturnRentalModalProps> = ({
  visible,
  rental,
  onClose,
  onSuccess,
}) => {
  const { currentStaff, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [conditionStatus, setConditionStatus] = useState<'GOOD' | 'DAMAGED'>('GOOD');
  const [conditionNotes, setConditionNotes] = useState('Saz vəziyyətdə təhvil alındı.');
  const [deductionAmount, setDeductionAmount] = useState('0');

  if (!visible || !rental) return null;

  const totalDeposit = Number(rental.deposit_amount || 0);
  const numDeduction = Math.max(0, Math.min(totalDeposit, Number(deductionAmount) || 0));
  const refundAmount = Math.max(0, totalDeposit - numDeduction);

  const handleConditionSelect = (status: 'GOOD' | 'DAMAGED') => {
    setConditionStatus(status);
    if (status === 'GOOD') {
      setDeductionAmount('0');
      setConditionNotes('Saz vəziyyətdə təhvil alındı.');
    } else {
      setConditionNotes('Zədə və ya qüsur aşkarlandı.');
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      await rentalService.returnRental(rental, {
        conditionStatus,
        conditionNotes,
        returnedDeposit: refundAmount,
        staffName: typeof currentStaff === 'object' && currentStaff ? currentStaff.name : typeof currentStaff === 'string' ? currentStaff : 'Mobil Kassir',
        userId: user?.id,
      });

      Alert.alert(
        'Təhvil alındı',
        `Məhsul anbara qaytarıldı (+1).\nMüştəriyə qaytarılan girov: ₼${refundAmount.toFixed(2)}`
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert('Xəta', e.message || 'Təhvil qeydiyyatı xətası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <RotateCcw size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.title}>İcarədən Təhvil Al</Text>
                <Text style={styles.subTitle}>
                  {rental.rental_code} • {rental.client_name}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Info Summary */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Məhsul:</Text>
                <Text style={styles.infoVal}>{rental.product_name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Müştəri:</Text>
                <Text style={styles.infoVal}>
                  {rental.client_name} ({rental.client_phone})
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Saxlanılan Girov:</Text>
                <Text style={styles.depositVal}>₼{totalDeposit.toFixed(2)}</Text>
              </View>
            </View>

            {/* Condition Check */}
            <Text style={styles.label}>Alətin Fiziki Vəziyyəti</Text>
            <View style={styles.condRow}>
              <TouchableOpacity
                style={[
                  styles.condBtn,
                  conditionStatus === 'GOOD' && styles.condBtnGoodActive,
                ]}
                onPress={() => handleConditionSelect('GOOD')}
              >
                <CheckCircle
                  size={20}
                  color={conditionStatus === 'GOOD' ? '#059669' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.condText,
                    conditionStatus === 'GOOD' && styles.condTextGoodActive,
                  ]}
                >
                  Saz / Qüsursuz
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.condBtn,
                  conditionStatus === 'DAMAGED' && styles.condBtnDamageActive,
                ]}
                onPress={() => handleConditionSelect('DAMAGED')}
              >
                <AlertTriangle
                  size={20}
                  color={conditionStatus === 'DAMAGED' ? '#DC2626' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.condText,
                    conditionStatus === 'DAMAGED' && styles.condTextDamageActive,
                  ]}
                >
                  Zədəli / Qüsurlu
                </Text>
              </TouchableOpacity>
            </View>

            {/* Deduction if damaged */}
            {conditionStatus === 'DAMAGED' && (
              <View style={styles.deductBox}>
                <Text style={styles.deductLabel}>
                  Zədəyə görə girovdan tutulan məbləğ (AZN):
                </Text>
                <TextInput
                  style={styles.deductInput}
                  keyboardType="numeric"
                  value={deductionAmount}
                  onChangeText={setDeductionAmount}
                />
              </View>
            )}

            {/* Refund to client */}
            <View style={styles.refundBox}>
              <View>
                <Text style={styles.refundTitle}>Müştəriyə Qaytarılacaq:</Text>
                <Text style={styles.refundSub}>
                  {conditionStatus === 'GOOD' ? 'Tam girov geri ödənilir' : 'Tutulma çıxıldı'}
                </Text>
              </View>
              <Text style={styles.refundAmount}>₼{refundAmount.toFixed(2)}</Text>
            </View>

            {/* Notes */}
            <Text style={styles.label}>Təhvil Qeydləri</Text>
            <TextInput
              style={styles.input}
              placeholder="Qeyd..."
              placeholderTextColor="#9CA3AF"
              value={conditionNotes}
              onChangeText={setConditionNotes}
            />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <RotateCcw size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>TƏHVİL AL VƏ ANBARA QAYTAR</Text>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#065F46',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  subTitle: {
    fontSize: 11,
    color: '#A7F3D0',
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  depositVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#059669',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 8,
  },
  condRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  condBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 6,
  },
  condBtnGoodActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  condBtnDamageActive: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  condText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  condTextGoodActive: {
    color: '#065F46',
  },
  condTextDamageActive: {
    color: '#991B1B',
  },
  deductBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  deductLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 6,
  },
  deductInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  refundBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  refundTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  refundSub: {
    fontSize: 11,
    color: '#047857',
  },
  refundAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: '#111827',
    marginBottom: 20,
  },
  footer: {
    padding: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
  },
});
