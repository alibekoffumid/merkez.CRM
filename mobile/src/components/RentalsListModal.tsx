import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  Dimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import {
  X,
  KeyRound,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  Phone,
  User,
  ShieldCheck,
  RotateCcw,
  Trash2,
  Calendar,
  Layers,
  RefreshCw,
} from 'lucide-react-native';
import { WarehouseRental } from '../types';
import { rentalService } from '../services/rentalService';
import { ReturnRentalModal } from './ReturnRentalModal';

const { width } = Dimensions.get('window');

interface RentalsListModalProps {
  visible: boolean;
  onClose: () => void;
  warehouseId?: string;
}

export const RentalsListModal: React.FC<RentalsListModalProps> = ({
  visible,
  onClose,
  warehouseId,
}) => {
  const [rentals, setRentals] = useState<WarehouseRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED'>('ALL');

  // Return modal
  const [selectedRentalForReturn, setSelectedRentalForReturn] = useState<WarehouseRental | null>(null);

  const loadRentals = async () => {
    try {
      setLoading(true);
      const data = await rentalService.getRentals(warehouseId);
      setRentals(data);
    } catch (e) {
      console.error('loadRentals error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadRentals();
    }
  }, [visible, warehouseId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRentals();
    setRefreshing(false);
  };

  // Stats
  const stats = useMemo(() => {
    let active = 0;
    let overdue = 0;
    let returned = 0;
    let depositSum = 0;

    const now = new Date();
    rentals.forEach((r) => {
      const isAct = r.status === 'ACTIVE';
      const isOver = isAct && r.due_date && new Date(r.due_date) < now;
      if (isAct) {
        active++;
        depositSum += Number(r.deposit_amount || 0);
      }
      if (isOver) overdue++;
      if (r.status === 'RETURNED') returned++;
    });

    return { total: rentals.length, active, overdue, returned, depositSum };
  }, [rentals]);

  // Filtered list
  const filteredRentals = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const now = new Date();

    return rentals.filter((r) => {
      const isAct = r.status === 'ACTIVE';
      const isOver = isAct && r.due_date && new Date(r.due_date) < now;

      if (filterTab === 'ACTIVE' && (!isAct || isOver)) return false;
      if (filterTab === 'OVERDUE' && !isOver) return false;
      if (filterTab === 'RETURNED' && r.status !== 'RETURNED') return false;

      if (!q) return true;
      return (
        r.rental_code?.toLowerCase().includes(q) ||
        r.client_name?.toLowerCase().includes(q) ||
        r.client_phone?.toLowerCase().includes(q) ||
        r.client_fin?.toLowerCase().includes(q) ||
        r.product_name?.toLowerCase().includes(q)
      );
    });
  }, [rentals, searchTerm, filterTab]);

  const handleDelete = (rental: WarehouseRental) => {
    Alert.alert(
      'İcarəni sil',
      `${rental.client_name} - ${rental.product_name} icarəsini silmək istəyirsiniz?`,
      [
        { text: 'Xeyr', style: 'cancel' },
        {
          text: 'Bəli, Sil',
          style: 'destructive',
          onPress: async () => {
            await rentalService.deleteRental(rental.id, rental.product_id, rental.quantity);
            loadRentals();
          },
        },
      ]
    );
  };

  const renderRentalItem = ({ item }: { item: WarehouseRental }) => {
    const isAct = item.status === 'ACTIVE';
    const now = new Date();
    const due = item.due_date ? new Date(item.due_date) : null;
    const isOver = isAct && due && due < now;

    let diffDays = 0;
    if (due) {
      const diffTime = due.getTime() - now.getTime();
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return (
      <View style={[styles.card, isOver && styles.cardOverdue]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.codeText}>{item.rental_code}</Text>
            <Text style={styles.dateSubText}>
              {item.start_date ? new Date(item.start_date).toLocaleDateString() : ''}
            </Text>
          </View>

          {/* Status Badge */}
          {item.status === 'RETURNED' ? (
            <View style={styles.badgeReturned}>
              <CheckCircle size={12} color="#059669" />
              <Text style={styles.badgeReturnedText}>Qaytarılıb</Text>
            </View>
          ) : isOver ? (
            <View style={styles.badgeOverdue}>
              <AlertTriangle size={12} color="#DC2626" />
              <Text style={styles.badgeOverdueText}>
                Gecikir ({Math.abs(diffDays)} gün)
              </Text>
            </View>
          ) : diffDays === 0 ? (
            <View style={styles.badgeToday}>
              <Clock size={12} color="#D97706" />
              <Text style={styles.badgeTodayText}>Bu gün bitir!</Text>
            </View>
          ) : (
            <View style={styles.badgeActive}>
              <Clock size={12} color="#059669" />
              <Text style={styles.badgeActiveText}>Qalıb: {diffDays} gün</Text>
            </View>
          )}
        </View>

        {/* Product and Client */}
        <View style={styles.cardBody}>
          <Text style={styles.productTitle} numberOfLines={1}>
            {item.product_name}
          </Text>

          <View style={styles.clientRow}>
            <View style={styles.clientInfo}>
              <View style={styles.iconNameRow}>
                <User size={13} color="#4B5563" />
                <Text style={styles.clientName}>{item.client_name}</Text>
              </View>
              {item.client_fin ? (
                <Text style={styles.finText}>FİN: {item.client_fin}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${item.client_phone}`)}
            >
              <Phone size={13} color="#2563EB" />
              <Text style={styles.callBtnText}>{item.client_phone}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Deposit & Actions Footer */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.depositLabel}>Girov (Depozit):</Text>
            <Text style={styles.depositAmount}>₼{Number(item.deposit_amount || 0).toFixed(2)}</Text>
          </View>

          <View style={styles.footerBtns}>
            {isAct && (
              <TouchableOpacity
                style={styles.returnBtn}
                onPress={() => setSelectedRentalForReturn(item)}
              >
                <RotateCcw size={14} color="#fff" />
                <Text style={styles.returnBtnText}>Təhvil Al</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
            >
              <Trash2 size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <KeyRound size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.title}>İcarələr & Girovlar</Text>
                <Text style={styles.subTitle}>
                  {stats.active} aktiv • {stats.overdue} gecikən
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Quick KPI Row */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Aktiv</Text>
              <Text style={[styles.kpiVal, { color: '#2563EB' }]}>{stats.active}</Text>
            </View>
            <View style={[styles.kpiBox, stats.overdue > 0 && styles.kpiBoxAlert]}>
              <Text style={[styles.kpiLabel, stats.overdue > 0 && { color: '#DC2626' }]}>
                Gecikən
              </Text>
              <Text style={[styles.kpiVal, stats.overdue > 0 ? { color: '#DC2626' } : { color: '#6B7280' }]}>
                {stats.overdue}
              </Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Girov Fondu</Text>
              <Text style={[styles.kpiVal, { color: '#059669' }]}>
                ₼{stats.depositSum.toFixed(0)}
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Search size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Müştəri, FİN, telefon, mal axtarışı..."
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            {[
              { id: 'ALL', label: 'Hamısı' },
              { id: 'ACTIVE', label: 'Aktiv' },
              { id: 'OVERDUE', label: `Gecikən (${stats.overdue})` },
              { id: 'RETURNED', label: 'Qaytarılmış' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.filterChip,
                  filterTab === tab.id && styles.filterChipActive,
                ]}
                onPress={() => setFilterTab(tab.id as any)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterTab === tab.id && styles.filterChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Yüklənir...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredRentals}
              keyExtractor={(item) => item.id}
              renderItem={renderRentalItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#4F46E5']} />
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <KeyRound size={42} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>İcarə qeydi tapılmadı</Text>
                  <Text style={styles.emptySub}>
                    Məhsullar siyahısından məhsul seçərək «İcarəyə Ver» düyməsi ilə yeni icarə rəsmiləşdirə bilərsiniz.
                  </Text>
                </View>
              }
            />
          )}

          {/* Return Modal */}
          {selectedRentalForReturn && (
            <ReturnRentalModal
              visible={Boolean(selectedRentalForReturn)}
              rental={selectedRentalForReturn}
              onClose={() => setSelectedRentalForReturn(null)}
              onSuccess={() => {
                setSelectedRentalForReturn(null);
                loadRentals();
              }}
            />
          )}
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
    height: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  subTitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kpiBoxAlert: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 12,
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 12,
    gap: 10,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  cardOverdue: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4F46E5',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dateSubText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  badgeReturned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeReturnedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  badgeOverdue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeOverdueText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
  },
  badgeToday: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeTodayText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D97706',
  },
  badgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeActiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
  },
  cardBody: {
    gap: 4,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  clientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  clientInfo: {
    flex: 1,
  },
  iconNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clientName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  finText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginLeft: 17,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    marginTop: 4,
  },
  depositLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  depositAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#059669',
  },
  footerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  returnBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  deleteBtn: {
    padding: 6,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4B5563',
  },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
