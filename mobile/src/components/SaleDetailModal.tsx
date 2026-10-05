import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import {
  X,
  Receipt,
  CheckCircle2,
  Calendar,
  Clock,
  DollarSign,
  Package,
  CreditCard,
  TrendingUp,
  User,
  Phone,
  Barcode as BarcodeIcon,
  Tag,
  Building,
  FileText,
  Trash2,
} from 'lucide-react-native';
import { StockSaleItem, StaffPermissions, Product } from '../types';
import { productService } from '../services/productService';
import { parseSaleNote, getChannelBadge } from '../utils/saleUtils';

interface SaleDetailModalProps {
  visible: boolean;
  sale: StockSaleItem | null;
  onClose: () => void;
  onDelete?: (sale: StockSaleItem) => void;
  canDelete?: boolean;
  permissions: StaffPermissions;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  visible,
  sale,
  onClose,
  onDelete,
  canDelete = false,
  permissions,
}) => {
  if (!sale) return null;

  // Resolve full product data
  const cachedProducts = productService.getCachedProducts() || [];
  const prod: Product | undefined =
    sale.product || cachedProducts.find((p) => p.id === sale.product_id);

  const quantity = Math.abs(Number(sale.quantity) || 1);
  const saleInfo = parseSaleNote(sale.notes, prod, quantity);
  const unitLabel = prod?.unit || 'əd.';
  const channelBadge = getChannelBadge(saleInfo.channel);

  // Access rights
  const isAdmin = permissions.isOwnerOrAdmin;
  const canViewCost = permissions.canViewCostPrices;
  const canViewSupplier = permissions.canViewSupplier;
  const canViewStock = permissions.canViewStockStats;

  // Format date and time matching web exactly
  const createdDate = sale.created_at ? new Date(sale.created_at) : null;
  const issuedDate = sale.issued_at ? new Date(sale.issued_at) : null;
  const primaryDate = createdDate && !isNaN(createdDate.getTime()) ? createdDate : (issuedDate || new Date());

  const dateStr = !isNaN(primaryDate.getTime())
    ? primaryDate.toLocaleDateString('ru-RU')
    : (sale.issued_at || '—');

  const timeStr = createdDate && !isNaN(createdDate.getTime())
    ? createdDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : (issuedDate && !isNaN(issuedDate.getTime()) && (sale.issued_at?.includes('T') || sale.issued_at?.includes(':'))
        ? issuedDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        : '');

  const handleCall = (phone: string) => {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (!cleanPhone) return;
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Zəng xətası', `Telefon nömrəsi: ${phone}`);
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Receipt size={22} color="#60A5FA" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    Satış Haqqında Məlumat
                  </Text>
                  <View style={styles.completedBadge}>
                    <CheckCircle2 size={11} color="#34D399" />
                    <Text style={styles.completedBadgeText}>Tamamlandı</Text>
                  </View>
                </View>
                <View style={styles.headerSubRow}>
                  <Text style={styles.codeText}>
                    #{sale.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Calendar size={12} color="#9CA3AF" />
                  <Text style={styles.dateSubText}>
                    {dateStr} {timeStr}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Financial KPI Cards — Admin Only */}
            {isAdmin && (
              <View style={styles.kpiGrid}>
                {/* Total Sale */}
                <View style={[styles.kpiCard, styles.kpiCardGreen]}>
                  <View style={styles.kpiTop}>
                    <Text style={[styles.kpiLabel, { color: '#059669' }]}>
                      CƏMİ MƏBLƏĞ
                    </Text>
                    <DollarSign size={14} color="#059669" />
                  </View>
                  <Text style={[styles.kpiVal, { color: '#047857' }]}>
                    ₼{saleInfo.totalAmount.toFixed(2)}
                  </Text>
                  <View style={styles.kpiSubRow}>
                    <Text style={[styles.kpiSubText, { color: '#059669' }]}>
                      ₼{saleInfo.unitPrice.toFixed(2)} / {unitLabel}
                    </Text>
                    {saleInfo.discount > 0 && (
                      <Text style={styles.discountPill}>
                        -{saleInfo.discount.toFixed(2)} ₼
                      </Text>
                    )}
                  </View>
                </View>

                {/* Quantity */}
                <View style={[styles.kpiCard, styles.kpiCardBlue]}>
                  <View style={styles.kpiTop}>
                    <Text style={[styles.kpiLabel, { color: '#2563EB' }]}>
                      MİQDAR
                    </Text>
                    <Package size={14} color="#2563EB" />
                  </View>
                  <Text style={[styles.kpiVal, { color: '#1D4ED8' }]}>
                    {quantity} <Text style={{ fontSize: 13, fontWeight: '700' }}>{unitLabel}</Text>
                  </Text>
                  <Text style={[styles.kpiSubText, { color: '#3B82F6' }]} numberOfLines={1}>
                    {canViewStock && prod?.stock_quantity != null
                      ? `Qalıq: ${prod.stock_quantity} ${unitLabel}`
                      : 'Satış qeydə alındı'}
                  </Text>
                </View>

                {/* Payment Method */}
                <View style={[styles.kpiCard, styles.kpiCardPurple]}>
                  <View style={styles.kpiTop}>
                    <Text style={[styles.kpiLabel, { color: '#9333EA' }]}>
                      ÖDƏNİŞ
                    </Text>
                    <CreditCard size={14} color="#9333EA" />
                  </View>
                  <Text style={[styles.kpiVal, { color: '#7E22CE', fontSize: 15 }]} numberOfLines={1}>
                    {saleInfo.paymentMethod}
                  </Text>
                  <Text style={[styles.kpiSubText, { color: '#A855F7' }]} numberOfLines={1}>
                    {saleInfo.channel}
                  </Text>
                </View>

                {/* Profit & Cost */}
                <View style={[styles.kpiCard, styles.kpiCardAmber]}>
                  <View style={styles.kpiTop}>
                    <Text style={[styles.kpiLabel, { color: '#D97706' }]}>
                      MƏNFƏƏT
                    </Text>
                    <TrendingUp size={14} color="#D97706" />
                  </View>
                  <Text style={[styles.kpiVal, { color: '#B45309' }]}>
                    +₼
                    {saleInfo.profit !== null
                      ? saleInfo.profit.toFixed(2)
                      : (saleInfo.totalAmount - saleInfo.totalCost).toFixed(2)}
                  </Text>
                  <Text style={[styles.kpiSubText, { color: '#D97706' }]} numberOfLines={1}>
                    {canViewCost ? `Maya: ₼${saleInfo.totalCost.toFixed(2)}` : 'Gəlir'}
                  </Text>
                </View>
              </View>
            )}

            {/* 2. Product Box */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWrap}>
                  <Package size={15} color="#2563EB" />
                  <Text style={styles.sectionTitle}>MƏHSUL MƏLUMATI</Text>
                </View>
                {prod?.category ? (
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>{prod.category}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.productNameText}>
                {sale.product_name || prod?.name || 'Məhsul'}
              </Text>

              <View style={styles.badgesRow}>
                {sale.barcode || prod?.barcode ? (
                  <View style={styles.barcodeBadge}>
                    <BarcodeIcon size={12} color="#4B5563" />
                    <Text style={styles.barcodeBadgeText}>
                      {sale.barcode || prod?.barcode}
                    </Text>
                  </View>
                ) : null}

                {canViewSupplier && prod?.supplier_name ? (
                  <View style={styles.supplierBadge}>
                    <Building size={11} color="#059669" />
                    <Text style={styles.supplierBadgeText} numberOfLines={1}>
                      {prod.supplier_name}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.unitBadge}>
                  <Text style={styles.unitBadgeText}>
                    {quantity} {unitLabel}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. Customer Info */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWrap}>
                  <User size={15} color="#4F46E5" />
                  <Text style={styles.sectionTitle}>MÜŞTƏRİ MƏLUMATI</Text>
                </View>
                <View style={[styles.channelPill, { backgroundColor: channelBadge.bg, borderColor: channelBadge.border }]}>
                  <Text style={[styles.channelPillText, { color: channelBadge.text }]}>
                    {channelBadge.label}
                  </Text>
                </View>
              </View>

              {saleInfo.customerName ? (
                <View style={styles.customerBox}>
                  <Text style={styles.customerName}>{saleInfo.customerName}</Text>
                  {saleInfo.customerPhone && (
                    <TouchableOpacity
                      style={styles.phoneBtn}
                      onPress={() => handleCall(saleInfo.customerPhone!)}
                      activeOpacity={0.8}
                    >
                      <Phone size={14} color="#2563EB" />
                      <Text style={styles.phoneText}>{saleInfo.customerPhone}</Text>
                      <Text style={styles.callHint}>(Zəng et)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={styles.standardCustomerText}>
                  Standart / Qeydiyyatsız alıcı (Anonim satış)
                </Text>
              )}
            </View>

            {/* 4. Payment & Financial Details */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWrap}>
                  <CreditCard size={15} color="#9333EA" />
                  <Text style={styles.sectionTitle}>ÖDƏNİŞ VƏ QİYMƏT</Text>
                </View>
                <View style={styles.payMethodBadge}>
                  <Text style={styles.payMethodText}>{saleInfo.paymentMethod}</Text>
                </View>
              </View>

              <View style={styles.dataRows}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Vahid satış qiyməti:</Text>
                  <Text style={styles.dataValBold}>₼{saleInfo.unitPrice.toFixed(2)}</Text>
                </View>

                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Satılan miqdar:</Text>
                  <Text style={styles.dataValBold}>
                    {quantity} {unitLabel}
                  </Text>
                </View>

                {saleInfo.discount > 0 && (
                  <>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Endirimsiz məbləğ:</Text>
                      <Text style={styles.dataValStrikethrough}>
                        ₼{saleInfo.originalGross.toFixed(2)}
                      </Text>
                    </View>

                    <View style={[styles.dataRow, styles.discountRow]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Tag size={13} color="#DC2626" />
                        <Text style={styles.discountLabel}>Tətbiq edilmiş endirim:</Text>
                      </View>
                      <Text style={styles.discountVal}>-₼{saleInfo.discount.toFixed(2)}</Text>
                    </View>
                  </>
                )}

                {saleInfo.months && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Kredit müddəti:</Text>
                    <Text style={styles.dataValBold}>{saleInfo.months} ay</Text>
                  </View>
                )}

                {canViewCost && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Vahid maya qiyməti:</Text>
                    <Text style={styles.dataValMaya}>
                      ₼{saleInfo.costPrice.toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.divider} />

                <View style={styles.dataRow}>
                  <Text style={styles.totalLabel}>Yekun ödənən məbləğ:</Text>
                  <Text style={styles.totalVal}>₼{saleInfo.totalAmount.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* 5. Custom Notes */}
            {saleInfo.cleanNote ? (
              <View style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <FileText size={14} color="#B45309" />
                  <Text style={styles.noteTitle}>QEYD / AÇIQLAMA</Text>
                </View>
                <Text style={styles.noteBody}>{saleInfo.cleanNote}</Text>
              </View>
            ) : null}

            {/* 6. System Log Preview */}
            {sale.notes ? (
              <View style={styles.logCard}>
                <Text style={styles.logLabel}>SİSTEM JURNALI:</Text>
                <Text style={styles.logText}>{sale.notes}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {canDelete && permissions.canDeleteHistory && onDelete ? (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  onClose();
                  onDelete(sale);
                }}
                activeOpacity={0.8}
              >
                <Trash2 size={16} color="#DC2626" />
                <Text style={styles.deleteBtnText}>Satışı sil</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            <TouchableOpacity
              style={styles.closeFooterBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeFooterBtnText}>Bağla</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  completedBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#93C5FD',
  },
  dotSeparator: {
    color: '#64748B',
    fontSize: 12,
  },
  dateSubText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  kpiCardGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  kpiCardBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  kpiCardPurple: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  kpiCardAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  kpiSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  kpiSubText: {
    fontSize: 10,
    fontWeight: '700',
  },
  discountPill: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B91C1C',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  catBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  productNameText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  barcodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  barcodeBadgeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#374151',
  },
  supplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  supplierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  unitBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  channelPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  channelPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  customerBox: {
    gap: 6,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  phoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  callHint: {
    fontSize: 10,
    color: '#60A5FA',
    fontWeight: '600',
  },
  standardCustomerText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  payMethodBadge: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  payMethodText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9333EA',
  },
  dataRows: {
    gap: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  dataValBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  dataValMaya: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  dataValStrikethrough: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  discountRow: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  discountLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  discountVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#DC2626',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
  },
  totalVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#059669',
  },
  noteCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  noteBody: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 18,
  },
  logCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  logText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#4B5563',
    lineHeight: 16,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  deleteBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },
  closeFooterBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  closeFooterBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
