import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  CheckCircle2,
  Printer,
  Settings,
  ArrowRight,
  Receipt,
  User,
  CreditCard,
} from 'lucide-react-native';
import { receiptService, SaleReceiptData, PrinterConfig } from '../services/receiptService';

interface SaleSuccessModalProps {
  visible: boolean;
  receiptData: SaleReceiptData | null;
  onClose: () => void;
  onOpenPrinterSettings: () => void;
}

export const SaleSuccessModal: React.FC<SaleSuccessModalProps> = ({
  visible,
  receiptData,
  onClose,
  onOpenPrinterSettings,
}) => {
  const [printing, setPrinting] = useState(false);

  if (!receiptData) return null;

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await receiptService.printReceipt(receiptData);
    } catch (e: any) {
      Alert.alert('Çap Xətası', e.message || 'Çek göndərilərkən xəta baş verdi');
    } finally {
      setPrinting(false);
    }
  };

  const cleanId = String(receiptData.saleId).replace(/^SALE-/, '');

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Success Icon */}
          <View style={styles.iconCircle}>
            <CheckCircle2 size={42} color="#10B981" />
          </View>

          <Text style={styles.title}>Satış Rəsmiləşdirildi!</Text>
          <Text style={styles.saleId}>Çek № {cleanId}</Text>

          {/* Amount Badge */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Yekun məbləğ:</Text>
            <Text style={styles.amountValue}>₼{Number(receiptData.total).toFixed(2)}</Text>
            {receiptData.discountAmount && receiptData.discountAmount > 0 ? (
              <Text style={styles.discountText}>
                Endirim: -₼{Number(receiptData.discountAmount).toFixed(2)}
              </Text>
            ) : null}
          </View>

          {/* Details */}
          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Məhsul sayı:</Text>
              <Text style={styles.detailValue}>
                {receiptData.items.reduce((acc, i) => acc + i.quantity, 0)} ədəd
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ödəniş üsulu:</Text>
              <Text style={styles.detailValueBold}>{receiptData.paymentMethod}</Text>
            </View>

            {receiptData.clientName ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Müştəri:</Text>
                <Text style={styles.detailValue}>{receiptData.clientName}</Text>
              </View>
            ) : null}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {/* Primary Print Button */}
            <TouchableOpacity
              style={[styles.printBtn, printing && styles.btnDisabled]}
              onPress={handlePrint}
              disabled={printing}
              activeOpacity={0.8}
            >
              {printing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Printer size={18} color="#fff" />
                  <Text style={styles.printBtnText}>ÇAP ET (Çek Vur)</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Quick settings link */}
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => {
                onClose();
                onOpenPrinterSettings();
              }}
              activeOpacity={0.7}
            >
              <Settings size={15} color="#4B5563" />
              <Text style={styles.settingsBtnText}>Printer Tənzimləmələri</Text>
            </TouchableOpacity>

            {/* Done / Next Sale Button */}
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>Yeni Satışa Keç</Text>
              <ArrowRight size={16} color="#10B981" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  saleId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 16,
  },
  amountBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#10B981',
    marginTop: 2,
  },
  discountText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  detailValueBold: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 15,
    width: '100%',
  },
  printBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  settingsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    marginTop: 4,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
