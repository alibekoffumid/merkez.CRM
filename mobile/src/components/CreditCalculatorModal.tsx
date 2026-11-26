import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import {
  X,
  Calculator,
  Sparkles,
  Check,
  Percent,
  Calendar,
} from 'lucide-react-native';
import {
  CREDIT_BANKS,
  CreditBank,
  calculateCredit,
  getAvailableMonths,
} from '../utils/creditCalculator';

interface CreditCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  initialPrice?: number | string;
}

export const CreditCalculatorModal: React.FC<CreditCalculatorModalProps> = ({
  visible,
  onClose,
  initialPrice = 500,
}) => {
  const [priceInput, setPriceInput] = useState<string>(String(initialPrice || 500));
  const [downpaymentInput, setDownpaymentInput] = useState<string>('0');
  const [selectedBank, setSelectedBank] = useState<CreditBank>('Birkart');
  const [selectedMonths, setSelectedMonths] = useState<number>(12);
  const [isZeroInterest, setIsZeroInterest] = useState<boolean>(false);

  useEffect(() => {
    if (initialPrice && Number(initialPrice) > 0) {
      setPriceInput(String(initialPrice));
    }
  }, [initialPrice]);

  const availableMonths = useMemo(() => {
    return getAvailableMonths(selectedBank);
  }, [selectedBank]);

  useEffect(() => {
    if (!availableMonths.includes(selectedMonths)) {
      if (availableMonths.includes(12)) {
        setSelectedMonths(12);
      } else {
        setSelectedMonths(availableMonths[availableMonths.length - 1] || 12);
      }
    }
  }, [selectedBank, availableMonths, selectedMonths]);

  const numPrice = parseFloat(priceInput) || 0;
  const numDownpayment = Math.min(numPrice, Math.max(0, parseFloat(downpaymentInput) || 0));
  const netAmount = Math.max(0, numPrice - numDownpayment);

  const currentResult = useMemo(() => {
    return calculateCredit(netAmount, selectedBank, selectedMonths, isZeroInterest);
  }, [netAmount, selectedBank, selectedMonths, isZeroInterest]);

  // Comparison for all supported months of selected bank
  const allMonthsComparison = useMemo(() => {
    return availableMonths.map((m) => {
      const res = calculateCredit(netAmount, selectedBank, m, isZeroInterest);
      return {
        months: m,
        ...res,
      };
    });
  }, [availableMonths, netAmount, selectedBank, isZeroInterest]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Calculator size={20} color="#4F46E5" />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Kredit Kalkulyatoru</Text>
                <Text style={styles.headerSubtitle}>Bank tarifləri və aylıq ödənişlər</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Price & Downpayment (Clean 2-Column Row without quick presets) */}
            <View style={styles.inputCard}>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                  <Text style={styles.inputLabel}>Məhsulun qiyməti (₼) *</Text>
                  <View style={styles.inputBox}>
                    <Text style={styles.currencyPrefix}>₼</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="decimal-pad"
                      value={priceInput}
                      onChangeText={setPriceInput}
                      placeholder="0.00"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>İlkin ödəniş (₼)</Text>
                  <View style={styles.inputBox}>
                    <Text style={styles.currencyPrefix}>₼</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="decimal-pad"
                      value={downpaymentInput}
                      onChangeText={setDownpaymentInput}
                      placeholder="0.00"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Bank Selection & 0% Toggle */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bank seçimi</Text>
                <TouchableOpacity
                  style={[styles.zeroToggleBtn, isZeroInterest && styles.zeroToggleBtnActive]}
                  onPress={() => setIsZeroInterest(!isZeroInterest)}
                  activeOpacity={0.8}
                >
                  <Sparkles size={13} color={isZeroInterest ? '#FFFFFF' : '#059669'} />
                  <Text style={[styles.zeroToggleText, isZeroInterest && styles.zeroToggleTextActive]}>
                    {isZeroInterest ? '0% Faizsiz Aksiya' : '0% Faizsiz rejim'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bankScroll}>
                {CREDIT_BANKS.map((b) => {
                  const isSel = selectedBank === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[styles.bankChip, isSel && styles.bankChipActive]}
                      onPress={() => setSelectedBank(b)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.bankChipText, isSel && styles.bankChipTextActive]}>{b}</Text>
                      <Text style={[styles.bankChipSub, isSel && styles.bankChipSubActive]}>
                        {isZeroInterest ? '0% faizsiz' : 'Standart'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Months Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kredit müddəti (Ay)</Text>
              <View style={styles.monthsRow}>
                {availableMonths.map((m) => {
                  const isSel = selectedMonths === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthPill, isSel && styles.monthPillActive]}
                      onPress={() => setSelectedMonths(m)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.monthPillText, isSel && styles.monthPillTextActive]}>
                        {m} ay
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Main Result Card */}
            <View style={styles.resultCard}>
              <View style={styles.resultCardTop}>
                <View>
                  <Text style={styles.resultLabel}>Aylıq ödəniş məbləği</Text>
                  <View style={styles.monthlyRow}>
                    <Text style={styles.monthlyValue}>₼{currentResult.monthlyPayment.toFixed(2)}</Text>
                    <Text style={styles.monthlyPeriod}>/ {selectedMonths} ay</Text>
                  </View>
                </View>

                <View style={styles.contractTotalWrap}>
                  <Text style={styles.contractTotalLabel}>Yekun məbləğ</Text>
                  <Text style={styles.contractTotalVal}>₼{currentResult.contractTotal.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.resultDivider} />

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Kreditə verilən</Text>
                  <Text style={styles.detailValue}>₼{netAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Faiz dərəcəsi</Text>
                  <Text style={styles.detailValue}>
                    {isZeroInterest ? '0%' : `${currentResult.markupPercent.toFixed(1)}%`}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Faiz artımı</Text>
                  <Text style={[styles.detailValue, { color: '#FDE047' }]}>
                    +₼{currentResult.interestAmount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Şöbəyə gedən</Text>
                  <Text style={styles.detailValue}>₼{currentResult.bankSentAmount.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Quick Comparison Table */}
            <View style={styles.comparisonCard}>
              <View style={styles.comparisonHeader}>
                <Text style={styles.comparisonTitle}>{selectedBank} üzrə bütün müddətlər</Text>
                <Text style={styles.comparisonSubtitle}>{isZeroInterest ? '0% Faizsiz' : 'Bank tarifi'}</Text>
              </View>

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableTh, { flex: 1 }]}>Müddət</Text>
                <Text style={[styles.tableTh, { flex: 1, textAlign: 'center' }]}>Faiz</Text>
                <Text style={[styles.tableTh, { flex: 1.2, textAlign: 'right' }]}>Aylıq</Text>
                <Text style={[styles.tableTh, { flex: 1.2, textAlign: 'right' }]}>Yekun</Text>
              </View>

              {allMonthsComparison.map((row) => {
                const isRowActive = row.months === selectedMonths;
                return (
                  <TouchableOpacity
                    key={row.months}
                    style={[styles.tableRow, isRowActive && styles.tableRowActive]}
                    onPress={() => setSelectedMonths(row.months)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tableRowLeft}>
                      {isRowActive && <View style={styles.activeDot} />}
                      <Text style={[styles.tableCell, isRowActive && styles.tableCellActive]}>
                        {row.months} ay
                      </Text>
                    </View>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: '#6B7280' }]}>
                      {isZeroInterest ? '0%' : `${row.markupPercent.toFixed(1)}%`}
                    </Text>
                    <Text style={[styles.tableCell, isRowActive && styles.tableCellActive, { flex: 1.2, textAlign: 'right' }]}>
                      ₼{row.monthlyPayment.toFixed(2)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right', color: '#4B5563', fontWeight: '700' }]}>
                      ₼{row.contractTotal.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeActionBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeActionBtnText}>Bağla</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  inputCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '900',
    color: '#9CA3AF',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    paddingVertical: 0,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  zeroToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  zeroToggleBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  zeroToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  zeroToggleTextActive: {
    color: '#FFFFFF',
  },
  bankScroll: {
    flexDirection: 'row',
  },
  bankChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    minWidth: 110,
  },
  bankChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  bankChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
  },
  bankChipTextActive: {
    color: '#4F46E5',
  },
  bankChipSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2,
  },
  bankChipSubActive: {
    color: '#6366F1',
  },
  monthsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  monthPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  monthPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B5563',
  },
  monthPillTextActive: {
    color: '#FFFFFF',
  },
  resultCard: {
    backgroundColor: '#4338CA',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  resultCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C7D2FE',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  monthlyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  monthlyValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  monthlyPeriod: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A5B4FC',
  },
  contractTotalWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  contractTotalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E0E7FF',
    textTransform: 'uppercase',
  },
  contractTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 1,
  },
  resultDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 14,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C7D2FE',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  comparisonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  comparisonTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#374151',
  },
  comparisonSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableTh: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRowActive: {
    backgroundColor: '#EEF2FF',
  },
  tableRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4F46E5',
  },
  tableCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  tableCellActive: {
    color: '#4F46E5',
    fontWeight: '900',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeActionBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
  },
});
