import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wrench, Plus, CheckCircle, Clock, X, User } from 'lucide-react-native';
import { WarehouseRepair, WarehouseMaster } from '../types';
import { repairService } from '../services/repairService';

export const RepairsScreen: React.FC = () => {
  const [repairs, setRepairs] = useState<WarehouseRepair[]>([]);
  const [masters, setMasters] = useState<WarehouseMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // New repair modal
  const [modalVisible, setModalVisible] = useState(false);
  const [itemName, setItemName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [issue, setIssue] = useState('');
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reps, msts] = await Promise.all([
        repairService.getRepairs(),
        repairService.getMasters(),
      ]);
      setRepairs(reps);
      setMasters(msts);
    } catch (e) {
      console.error('loadData repairs error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateRepair = async () => {
    if (!itemName.trim()) {
      Alert.alert('Xəta', 'Cihazın / malın adını daxil edin');
      return;
    }

    try {
      setSaving(true);
      await repairService.createRepair({
        item_name: itemName.trim(),
        serial_number: serialNumber.trim() || undefined,
        issue_description: issue.trim() || undefined,
        type: 'INTERNAL_STOCK',
        master_id: selectedMasterId || undefined,
      });

      Alert.alert('Uğurlu', 'Təmir sifarişi yaradıldı');
      setModalVisible(false);
      setItemName('');
      setSerialNumber('');
      setIssue('');
      setSelectedMasterId('');
      loadData();
    } catch (e: any) {
      Alert.alert('Yaratma xətası', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    repairId: string,
    newStatus: 'SENT_TO_MASTER' | 'READY' | 'RETURNED_TO_STOCK'
  ) => {
    try {
      await repairService.updateStatus(repairId, newStatus);
      setRepairs((prev) =>
        prev.map((r) => (r.id === repairId ? { ...r, status: newStatus } : r))
      );
    } catch (e: any) {
      Alert.alert('Xəta', e.message);
    }
  };

  const filtered = repairs.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Servis və Təmir</Text>
            <Text style={styles.sub}>{repairs.length} sifariş qeydiyyatdadır</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.addBtnText}>Yeni sifariş</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, statusFilter === 'ALL' && styles.tabActive]}
            onPress={() => setStatusFilter('ALL')}
          >
            <Text style={[styles.tabText, statusFilter === 'ALL' && styles.tabTextActive]}>
              Hamısı
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, statusFilter === 'SENT_TO_MASTER' && styles.tabActiveAmber]}
            onPress={() => setStatusFilter('SENT_TO_MASTER')}
          >
            <Text
              style={[
                styles.tabText,
                statusFilter === 'SENT_TO_MASTER' && styles.tabTextActiveAmber,
              ]}
            >
              Təmirdə
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, statusFilter === 'READY' && styles.tabActiveGreen]}
            onPress={() => setStatusFilter('READY')}
          >
            <Text
              style={[styles.tabText, statusFilter === 'READY' && styles.tabTextActiveGreen]}
            >
              Hazırdır
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Təmir siyahısı yüklənir...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSent = item.status === 'SENT_TO_MASTER';
              const isReady = item.status === 'READY';
              return (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.codeRow}>
                      <Text style={styles.codeText}>{item.repair_code}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          isSent
                            ? styles.statusSent
                            : isReady
                            ? styles.statusReady
                            : styles.statusReturned,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isSent
                              ? styles.statusTextSent
                              : isReady
                              ? styles.statusTextReady
                              : styles.statusTextReturned,
                          ]}
                        >
                          {isSent
                            ? 'Təmirdə'
                            : isReady
                            ? 'Təhvilə hazırdır'
                            : 'Təhvil verildi'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    {item.serial_number ? (
                      <Text style={styles.serialText}>S/N: {item.serial_number}</Text>
                    ) : null}
                  </View>

                  {item.issue_description ? (
                    <Text style={styles.issueText} numberOfLines={2}>
                      Nasazlıq: {item.issue_description}
                    </Text>
                  ) : null}

                  {item.master_name ? (
                    <View style={styles.masterRow}>
                      <User size={13} color="#6B7280" />
                      <Text style={styles.masterText}>Usta: {item.master_name}</Text>
                    </View>
                  ) : null}

                  {/* Action buttons */}
                  <View style={styles.actionsRow}>
                    {isSent && (
                      <TouchableOpacity
                        style={styles.actionBtnGreen}
                        onPress={() => handleStatusChange(item.id, 'READY')}
                      >
                        <CheckCircle size={14} color="#059669" />
                        <Text style={styles.actionBtnTextGreen}>Hazır kimi qeyd et</Text>
                      </TouchableOpacity>
                    )}
                    {isReady && (
                      <TouchableOpacity
                        style={styles.actionBtnBlue}
                        onPress={() => handleStatusChange(item.id, 'RETURNED_TO_STOCK')}
                      >
                        <Text style={styles.actionBtnTextBlue}>Təhvil ver / Anbara</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#10B981']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Wrench size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Təmir sifarişi yoxdur</Text>
                <Text style={styles.emptySub}>
                  Yeni diaqnostika və ya təmir sifarişi əlavə edin
                </Text>
              </View>
            }
          />
        )}

        {/* Modal: New Repair */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Yeni təmir sifarişi</Text>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cihazın adı *</Text>
                  <TextInput
                    style={styles.input}
                    value={itemName}
                    onChangeText={setItemName}
                    placeholder="Məsələn: Noutbuk HP Pavilion 15"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Seriya nömrəsi / IMEI</Text>
                  <TextInput
                    style={styles.input}
                    value={serialNumber}
                    onChangeText={setSerialNumber}
                    placeholder="Seriya nömrəsi"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nasazlığın təsviri</Text>
                  <TextInput
                    style={[styles.input, { height: 70 }]}
                    value={issue}
                    onChangeText={setIssue}
                    placeholder="Açılmır, ekran qırılıb və s."
                    multiline
                  />
                </View>

                <TouchableOpacity
                  style={styles.createRepairBtn}
                  onPress={handleCreateRepair}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.createRepairBtnText}>Sifarişi təsdiqlə</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  sub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 10,
    gap: 8,
  },
  tab: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tabActiveAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  tabActiveGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabTextActiveAmber: {
    color: '#B45309',
  },
  tabTextActiveGreen: {
    color: '#059669',
  },
  list: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTop: {
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusSent: {
    backgroundColor: '#FFFBEB',
  },
  statusReady: {
    backgroundColor: '#ECFDF5',
  },
  statusReturned: {
    backgroundColor: '#F3F4F6',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextSent: {
    color: '#D97706',
  },
  statusTextReady: {
    color: '#059669',
  },
  statusTextReturned: {
    color: '#6B7280',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  serialText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  issueText: {
    fontSize: 13,
    color: '#4B5563',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    marginVertical: 6,
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  masterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtnGreen: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  actionBtnTextGreen: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnBlue: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  actionBtnTextBlue: {
    color: '#4338CA',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
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
  modalBody: {
    padding: 20,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
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
  createRepairBtn: {
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 10,
  },
  createRepairBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
