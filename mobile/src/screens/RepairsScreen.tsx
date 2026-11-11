import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import {
  Wrench,
  Plus,
  Minus,
  CheckCircle,
  Clock,
  X,
  User,
  Users,
  Phone,
  Hammer,
  Search,
  ArrowLeft,
  ChevronRight,
  Trash2,
  PackageCheck,
  Package,
} from 'lucide-react-native';
import { WarehouseRepair, WarehouseMaster } from '../types';
import { repairService } from '../services/repairService';
import { productService } from '../services/productService';

export const RepairsScreen: React.FC = () => {
  const [repairs, setRepairs] = useState<WarehouseRepair[]>([]);
  const [masters, setMasters] = useState<WarehouseMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected master: if null, show master cards; if selected, show that master's tools
  const [selectedMaster, setSelectedMaster] = useState<WarehouseMaster | null>(null);

  // New Tool / Send to repair modal
  const [toolModalVisible, setToolModalVisible] = useState(false);
  const [toolName, setToolName] = useState('');
  const [toolQuantity, setToolQuantity] = useState('1');
  const [toolSerial, setToolSerial] = useState('');
  const [toolIssue, setToolIssue] = useState('');
  const [toolMasterId, setToolMasterId] = useState('');
  const [savingTool, setSavingTool] = useState(false);

  // New Master modal
  const [masterModalVisible, setMasterModalVisible] = useState(false);
  const [masterName, setMasterName] = useState('');
  const [masterPhone, setMasterPhone] = useState('');
  const [savingMaster, setSavingMaster] = useState(false);

  // Direct edit quantity modal
  const [directEditRepair, setDirectEditRepair] = useState<WarehouseRepair | null>(null);
  const [directEditQty, setDirectEditQty] = useState('1');

  // Archive / History view toggle for selected master
  const [showArchive, setShowArchive] = useState(false);

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

  const getRepairQuantity = (repair: WarehouseRepair): number => {
    if (repair?.quantity != null && Number(repair.quantity) > 0) {
      return Math.floor(Number(repair.quantity));
    }
    const match = repair?.item_name?.match(/\(x(\d+)\)/);
    if (match) return parseInt(match[1], 10);
    return 1;
  };

  const getCleanItemName = (repair: WarehouseRepair): string => {
    if (!repair?.item_name) return '';
    return repair.item_name.replace(/\s*\(x\d+\)\s*/g, '').trim();
  };

  const formatItemNameWithQty = (baseName: string, qty: number): string => {
    const clean = (baseName || '').replace(/\s*\(x\d+\)\s*/g, '').trim();
    return qty > 1 ? `${clean} (x${qty})` : clean;
  };

  const isRepairActive = (r: WarehouseRepair): boolean => {
    return (
      r.status !== 'RECEIVED_FROM_WORKSHOP' &&
      r.status !== 'DELIVERED_TO_CUSTOMER' &&
      r.status !== 'RETURNED_TO_STOCK' &&
      getRepairQuantity(r) > 0
    );
  };

  // Grouped masters with active tool counts and repairs lists
  const allMastersWithStats = useMemo(() => {
    const masterMap = new Map<
      string,
      WarehouseMaster & {
        activeToolsCount: number;
        activeRepairs: WarehouseRepair[];
        completedRepairs: WarehouseRepair[];
      }
    >();

    masters.forEach((m) => {
      masterMap.set(m.id, {
        ...m,
        activeToolsCount: 0,
        activeRepairs: [],
        completedRepairs: [],
      });
    });

    repairs.forEach((r) => {
      const active = isRepairActive(r);
      const qty = getRepairQuantity(r);

      let masterKey = r.master_id;
      if (!masterKey && r.master_name) {
        const found = masters.find((m) => m.name === r.master_name);
        masterKey = found ? found.id : r.master_name;
      }
      if (!masterKey) masterKey = 'UNKNOWN';

      if (!masterMap.has(masterKey)) {
        masterMap.set(masterKey, {
          id: masterKey,
          name: r.master_name || 'Təyin edilməmiş usta',
          phone: '',
          activeToolsCount: 0,
          activeRepairs: [],
          completedRepairs: [],
        });
      }

      const mObj = masterMap.get(masterKey)!;
      if (active) {
        mObj.activeToolsCount += qty;
        mObj.activeRepairs.push(r);
      } else {
        mObj.completedRepairs.push(r);
      }
    });

    return Array.from(masterMap.values());
  }, [masters, repairs]);

  // Filtered masters list for search
  const filteredMasters = useMemo(() => {
    if (!searchQuery.trim()) return allMastersWithStats;
    const q = searchQuery.toLowerCase().trim();
    return allMastersWithStats.filter((m) => {
      const nameMatch = (m.name || '').toLowerCase().includes(q);
      const phoneMatch = (m.phone || '').toLowerCase().includes(q);
      const toolMatch = m.activeRepairs.some((r) =>
        (r.item_name || '').toLowerCase().includes(q)
      );
      return nameMatch || phoneMatch || toolMatch;
    });
  }, [allMastersWithStats, searchQuery]);

  // Overall KPI stats
  const totalStats = useMemo(() => {
    const totalMastersCount = allMastersWithStats.length;
    let totalActiveTools = 0;
    let mastersWithToolsCount = 0;

    allMastersWithStats.forEach((m) => {
      totalActiveTools += m.activeToolsCount;
      if (m.activeToolsCount > 0) mastersWithToolsCount += 1;
    });

    return {
      totalMastersCount,
      totalActiveTools,
      mastersWithToolsCount,
    };
  }, [allMastersWithStats]);

  // Handle +1 / -1 for repair tool
  const handleStepQuantity = async (repair: WarehouseRepair, delta: number) => {
    const currentQty = getRepairQuantity(repair);
    const nextQty = currentQty + delta;
    const cleanName = getCleanItemName(repair);

    if (nextQty <= 0) {
      Alert.alert(
        'Aləti təhvil al',
        `«${cleanName}» alətini tam təhvil almaq istəyirsiniz? Say 0 olacaq və alət aktiv siyahıdan çıxarılacaq.`,
        [
          { text: 'Xeyr', style: 'cancel' },
          {
            text: 'Bəli, təhvil al',
            style: 'default',
            onPress: async () => {
              try {
                await repairService.updateQuantity(
                  repair.id,
                  0,
                  cleanName,
                  'RECEIVED_FROM_WORKSHOP'
                );
                loadData();
              } catch (e: any) {
                Alert.alert('Xəta', e.message || 'Xəta baş verdi');
              }
            },
          },
        ]
      );
      return;
    }

    try {
      const newName = formatItemNameWithQty(cleanName, nextQty);
      await repairService.updateQuantity(
        repair.id,
        nextQty,
        newName,
        'BEING_REPAIRED'
      );
      setRepairs((prev) =>
        prev.map((r) =>
          r.id === repair.id
            ? { ...r, quantity: nextQty, item_name: newName, status: 'BEING_REPAIRED' }
            : r
        )
      );
    } catch (e: any) {
      Alert.alert('Xəta', e.message || 'Say dəyişdirilə bilmədi');
    }
  };

  // Direct edit quantity save
  const handleSaveDirectEdit = async () => {
    if (!directEditRepair) return;
    const newQty = parseInt(directEditQty, 10);
    if (isNaN(newQty) || newQty < 0) {
      Alert.alert('Xəta', 'Düzgün say daxil edin');
      return;
    }

    const cleanName = getCleanItemName(directEditRepair);

    try {
      if (newQty === 0) {
        await repairService.updateQuantity(
          directEditRepair.id,
          0,
          cleanName,
          'RECEIVED_FROM_WORKSHOP'
        );
      } else {
        const newName = formatItemNameWithQty(cleanName, newQty);
        await repairService.updateQuantity(
          directEditRepair.id,
          newQty,
          newName,
          'BEING_REPAIRED'
        );
      }
      setDirectEditRepair(null);
      loadData();
    } catch (e: any) {
      Alert.alert('Xəta', e.message);
    }
  };

  // Delete repair
  const handleDeleteRepair = (repairId: string) => {
    Alert.alert(
      'Təmiri sil',
      'Bu alət qeydini silmək istədiyinizə əminsiniz?',
      [
        { text: 'Ləğv et', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await repairService.deleteRepair(repairId);
              setRepairs((prev) => prev.filter((r) => r.id !== repairId));
            } catch (e: any) {
              Alert.alert('Xəta', e.message);
            }
          },
        },
      ]
    );
  };

  // Create new Master
  const handleCreateMaster = async () => {
    if (!masterName.trim()) {
      Alert.alert('Xəta', 'Ustanın adını daxil edin');
      return;
    }
    try {
      setSavingMaster(true);
      const newM = await repairService.createMaster(
        masterName.trim(),
        masterPhone.trim() || undefined
      );
      setMasterModalVisible(false);
      setMasterName('');
      setMasterPhone('');
      await loadData();
      if (newM) setSelectedMaster(newM);
    } catch (e: any) {
      Alert.alert('Xəta', e.message);
    } finally {
      setSavingMaster(false);
    }
  };

  // Give Tool to master
  const handleCreateTool = async () => {
    if (!toolName.trim()) {
      Alert.alert('Xəta', 'Alətin / malın adını daxil edin');
      return;
    }
    const qty = parseInt(toolQuantity, 10) || 1;

    try {
      setSavingTool(true);
      await repairService.createRepair({
        item_name: toolName.trim(),
        quantity: qty,
        serial_number: toolSerial.trim() || undefined,
        issue_description: toolIssue.trim() || undefined,
        type: 'INTERNAL_STOCK',
        master_id: toolMasterId || selectedMaster?.id || undefined,
      });

      setToolModalVisible(false);
      setToolName('');
      setToolQuantity('1');
      setToolSerial('');
      setToolIssue('');
      setToolMasterId('');
      loadData();
    } catch (e: any) {
      Alert.alert('Xəta', e.message);
    } finally {
      setSavingTool(false);
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Tools of currently selected master
  const currentMasterActiveRepairs = useMemo(() => {
    if (!selectedMaster) return [];
    const masterObj = allMastersWithStats.find((m) => m.id === selectedMaster.id);
    const list = masterObj ? masterObj.activeRepairs : [];

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((r) =>
      (r.item_name || '').toLowerCase().includes(q) ||
      (r.repair_code || '').toLowerCase().includes(q)
    );
  }, [selectedMaster, allMastersWithStats, searchQuery]);

  const currentMasterCompletedRepairs = useMemo(() => {
    if (!selectedMaster) return [];
    const masterObj = allMastersWithStats.find((m) => m.id === selectedMaster.id);
    const list = masterObj ? masterObj.completedRepairs : [];

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((r) =>
      (r.item_name || '').toLowerCase().includes(q) ||
      (r.repair_code || '').toLowerCase().includes(q)
    );
  }, [selectedMaster, allMastersWithStats, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Search and Top Action Header */}
      <View style={styles.topHeader}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Search size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder={
                selectedMaster
                  ? `${selectedMaster.name} alətləri...`
                  : 'Usta və ya alət axtar...'
              }
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {selectedMaster ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSelectedMaster(null);
                setShowArchive(false);
              }}
            >
              <ArrowLeft size={16} color="#374151" />
              <Text style={styles.backButtonText}>Ustalar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addMasterBtn}
              onPress={() => setMasterModalVisible(true)}
            >
              <Plus size={15} color="#2563EB" />
              <Text style={styles.addMasterBtnText}>Usta</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.giveToolBtn}
            onPress={() => {
              setToolMasterId(selectedMaster?.id || '');
              setToolModalVisible(true);
            }}
          >
            <Plus size={15} color="#fff" />
            <Text style={styles.giveToolBtnText}>Alət ver</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Məlumatlar yüklənir...</Text>
        </View>
      ) : selectedMaster === null ? (
        /* ========================================================================= */
        /* 1. MASTERS CARDS VIEW (DEFAULT)                                           */
        /* ========================================================================= */
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* KPI Summary Banner */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Users size={16} color="#2563EB" />
              </View>
              <Text style={styles.kpiLabel}>CƏMİ USTA</Text>
              <Text style={styles.kpiValue}>{totalStats.totalMastersCount}</Text>
            </View>

            <View style={[styles.kpiCard, { borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' }]}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#DCFCE7' }]}>
                <Hammer size={16} color="#059669" />
              </View>
              <Text style={[styles.kpiLabel, { color: '#047857' }]}>TƏMİRDƏ ALƏT</Text>
              <Text style={[styles.kpiValue, { color: '#047857' }]}>{totalStats.totalActiveTools} əd</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Wrench size={16} color="#D97706" />
              </View>
              <Text style={styles.kpiLabel}>AKTİV USTA</Text>
              <Text style={styles.kpiValue}>{totalStats.mastersWithToolsCount}</Text>
            </View>
          </View>

          {/* Master Cards List */}
          {filteredMasters.length === 0 ? (
            <View style={styles.emptyCard}>
              <Users size={40} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Heç bir usta tapılmadı</Text>
              <Text style={styles.emptySub}>
                Yuxarıdakı «+ Usta» düyməsi ilə yeni usta əlavə edə bilərsiniz.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setMasterModalVisible(true)}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.emptyActionBtnText}>Yeni Usta Əlavə Et</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredMasters.map((master) => {
              const hasTools = master.activeToolsCount > 0;
              const initials = getInitials(master.name);

              return (
                <TouchableOpacity
                  key={master.id}
                  style={[
                    styles.masterCard,
                    hasTools && styles.masterCardActive,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => setSelectedMaster(master)}
                >
                  {/* Master Info Header */}
                  <View style={styles.masterHeader}>
                    <View style={styles.masterAvatarRow}>
                      <View
                        style={[
                          styles.avatarCircle,
                          hasTools
                            ? styles.avatarCircleGreen
                            : styles.avatarCircleGray,
                        ]}
                      >
                        <Text
                          style={[
                            styles.avatarInitials,
                            hasTools
                              ? styles.avatarInitialsGreen
                              : styles.avatarInitialsGray,
                          ]}
                        >
                          {initials}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.masterName} numberOfLines={1}>
                          {master.name}
                        </Text>
                        <TouchableOpacity
                          style={styles.phoneRow}
                          disabled={!master.phone}
                          onPress={() => {
                            if (master.phone) {
                              Linking.openURL(`tel:${master.phone}`);
                            }
                          }}
                        >
                          <Phone size={12} color="#6B7280" />
                          <Text style={styles.phoneText}>
                            {master.phone || 'Nömrə qeyd edilməyib'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <ChevronRight size={18} color="#9CA3AF" />
                  </View>

                  {/* Active Tool Count Badge */}
                  <View
                    style={[
                      styles.toolBadgeBox,
                      hasTools
                        ? styles.toolBadgeBoxGreen
                        : styles.toolBadgeBoxGray,
                    ]}
                  >
                    <View style={styles.badgeLabelRow}>
                      <Hammer
                        size={14}
                        color={hasTools ? '#059669' : '#6B7280'}
                      />
                      <Text
                        style={[
                          styles.badgeLabelText,
                          hasTools && { color: '#065F46' },
                        ]}
                      >
                        Hazırda ustada:
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.badgePill,
                        hasTools
                          ? styles.badgePillGreen
                          : styles.badgePillGray,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgePillText,
                          hasTools
                            ? styles.badgePillTextGreen
                            : styles.badgePillTextGray,
                        ]}
                      >
                        {master.activeToolsCount} ədəd
                      </Text>
                    </View>
                  </View>

                  {/* Active Tools Preview Chips */}
                  {hasTools && (
                    <View style={styles.chipsPreviewRow}>
                      {master.activeRepairs.slice(0, 3).map((r) => {
                        const qty = getRepairQuantity(r);
                        const clean = getCleanItemName(r);
                        return (
                          <View key={r.id} style={styles.toolChip}>
                            <Text style={styles.toolChipText} numberOfLines={1}>
                              {clean}
                            </Text>
                            <View style={styles.toolChipQty}>
                              <Text style={styles.toolChipQtyText}>{qty}</Text>
                            </View>
                          </View>
                        );
                      })}
                      {master.activeRepairs.length > 3 && (
                        <Text style={styles.moreChipsText}>
                          +{master.activeRepairs.length - 3} daha
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Bottom Actions */}
                  <View style={styles.masterCardFooter}>
                    <TouchableOpacity
                      style={[
                        styles.viewToolsBtn,
                        hasTools && styles.viewToolsBtnGreen,
                      ]}
                      onPress={() => setSelectedMaster(master)}
                    >
                      <Wrench size={14} color={hasTools ? '#fff' : '#374151'} />
                      <Text
                        style={[
                          styles.viewToolsBtnText,
                          hasTools && styles.viewToolsBtnTextGreen,
                        ]}
                      >
                        {hasTools
                          ? `Alətlərə bax (${master.activeToolsCount})`
                          : 'Alətlərə bax'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickAddBtn}
                      onPress={() => {
                        setToolMasterId(master.id);
                        setToolModalVisible(true);
                      }}
                    >
                      <Plus size={16} color="#059669" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* ========================================================================= */
        /* 2. MASTER DETAILED TOOLS VIEW (+ and - controls, no complex statuses)     */
        /* ========================================================================= */
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Selected Master Profile Card */}
          <View style={styles.selectedMasterBanner}>
            <View style={styles.selectedMasterHeaderRow}>
              <View style={styles.avatarCircleGreenLarge}>
                <Text style={styles.avatarInitialsGreenLarge}>
                  {getInitials(selectedMaster.name)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.selectedMasterName} numberOfLines={1}>
                  {selectedMaster.name}
                </Text>
                {selectedMaster.phone ? (
                  <TouchableOpacity
                    style={styles.phoneRow}
                    onPress={() => Linking.openURL(`tel:${selectedMaster.phone}`)}
                  >
                    <Phone size={12} color="#059669" />
                    <Text style={[styles.phoneText, { color: '#059669', fontWeight: '700' }]}>
                      {selectedMaster.phone}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.phoneText}>Telefon nömrəsi yoxdur</Text>
                )}
              </View>
            </View>

            <View style={styles.selectedMasterStatsRow}>
              <View style={styles.activeToolsCounterPill}>
                <Hammer size={15} color="#059669" />
                <Text style={styles.activeToolsCounterText}>
                  Hazırda bu ustada:{' '}
                  <Text style={{ fontWeight: '900', color: '#047857' }}>
                    {currentMasterActiveRepairs.reduce(
                      (sum, r) => sum + getRepairQuantity(r),
                      0
                    )}{' '}
                    ədəd alət
                  </Text>
                </Text>
              </View>

              <TouchableOpacity
                style={styles.toggleArchiveBtn}
                onPress={() => setShowArchive(!showArchive)}
              >
                <Text style={styles.toggleArchiveBtnText}>
                  {showArchive
                    ? 'Aktivlərə qayıt'
                    : `Tarixçə (${currentMasterCompletedRepairs.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tools List */}
          {showArchive ? (
            /* Archive List */
            <View>
              <Text style={styles.sectionTitle}>
                ƏVVƏL TƏHVİL ALINMIŞ VƏ TAMAMLANMIŞ ALƏTLƏR
              </Text>
              {currentMasterCompletedRepairs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <CheckCircle size={32} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>Tarixçədə alət yoxdur</Text>
                </View>
              ) : (
                currentMasterCompletedRepairs.map((repair) => (
                  <View key={repair.id} style={styles.archiveCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.archiveItemName}>
                        {getCleanItemName(repair)}
                      </Text>
                      <Text style={styles.archiveSubText}>
                        {repair.repair_code} • {repair.created_at ? new Date(repair.created_at).toLocaleDateString() : '—'}
                      </Text>
                    </View>
                    <View style={styles.returnedBadge}>
                      <Text style={styles.returnedBadgeText}>✓ Təhvil alınıb</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : currentMasterActiveRepairs.length === 0 ? (
            /* Empty Active Tools */
            <View style={styles.emptyCard}>
              <CheckCircle size={40} color="#10B981" />
              <Text style={styles.emptyTitle}>
                Bu ustanın əlində hazırda alət yoxdur
              </Text>
              <Text style={styles.emptySub}>
                Usta bütün alətləri təhvil verib. Yeni alət vermək üçün aşağıdakı düyməni sıxın.
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  setToolMasterId(selectedMaster.id);
                  setToolModalVisible(true);
                }}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.emptyActionBtnText}>Bu Ustaya Alət Ver</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Active Tools with large + and - buttons */
            currentMasterActiveRepairs.map((repair) => {
              const totalQty = getRepairQuantity(repair);
              const cleanName = getCleanItemName(repair);

              return (
                <View key={repair.id} style={styles.toolCard}>
                  {/* Top Row: Code, Source and Delete */}
                  <View style={styles.toolCardHeader}>
                    <View style={styles.toolCodeBadge}>
                      <Text style={styles.toolCodeText}>{repair.repair_code}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View
                        style={[
                          styles.sourceBadge,
                          repair.type === 'INTERNAL_STOCK'
                            ? { backgroundColor: '#FFEDD5' }
                            : { backgroundColor: '#F3E8FF' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sourceBadgeText,
                            repair.type === 'INTERNAL_STOCK'
                              ? { color: '#C2410C' }
                              : { color: '#7E22CE' },
                          ]}
                        >
                          {repair.type === 'INTERNAL_STOCK' ? 'Anbar' : 'Müştəri'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleDeleteRepair(repair.id)}
                        style={styles.deleteToolBtn}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Tool Name */}
                  <Text style={styles.toolCardName}>{cleanName}</Text>

                  {/* Notes / Description */}
                  {repair.issue_description ? (
                    <View style={styles.issueBox}>
                      <Text style={styles.issueText} numberOfLines={2}>
                        {repair.issue_description}
                      </Text>
                    </View>
                  ) : null}

                  {/* Date */}
                  <View style={styles.toolDateRow}>
                    <Clock size={12} color="#9CA3AF" />
                    <Text style={styles.toolDateText}>
                      {repair.created_at
                        ? new Date(repair.created_at).toLocaleDateString()
                        : '—'}
                    </Text>
                  </View>

                  {/* Quantity Controller: MINUS / COUNT / PLUS */}
                  <View style={styles.qtyControllerCard}>
                    <Text style={styles.qtyControllerLabel}>Ustada olan say:</Text>

                    <View style={styles.qtyCounterBox}>
                      <TouchableOpacity
                        style={styles.counterBtnMinus}
                        activeOpacity={0.7}
                        onPress={() => handleStepQuantity(repair, -1)}
                      >
                        <Minus size={18} color="#991B1B" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.counterNumberBox}
                        activeOpacity={0.7}
                        onPress={() => {
                          setDirectEditRepair(repair);
                          setDirectEditQty(String(totalQty));
                        }}
                      >
                        <Text style={styles.counterNumberText}>{totalQty}</Text>
                        <Text style={styles.counterUnitText}>ədəd</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.counterBtnPlus}
                        activeOpacity={0.7}
                        onPress={() => handleStepQuantity(repair, 1)}
                      >
                        <Plus size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* 1. Add Master Modal */}
      <Modal
        visible={masterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMasterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <User size={18} color="#2563EB" />
                </View>
                <Text style={styles.modalTitle}>Yeni Usta Əlavə Et</Text>
              </View>
              <TouchableOpacity onPress={() => setMasterModalVisible(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Ustanın Adı və Soyadı *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Məs: QARMON USTA RACİ"
                placeholderTextColor="#9CA3AF"
                value={masterName}
                onChangeText={setMasterName}
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                Əlaqə Nömrəsi
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="+994 50 123 45 67"
                placeholderTextColor="#9CA3AF"
                value={masterPhone}
                onChangeText={setMasterPhone}
                keyboardType="phone-pad"
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setMasterModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Ləğv et</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, savingMaster && { opacity: 0.6 }]}
                  disabled={savingMaster}
                  onPress={handleCreateMaster}
                >
                  {savingMaster ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Yadda saxla</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Give Tool to Master Modal */}
      <Modal
        visible={toolModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setToolModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Hammer size={18} color="#059669" />
                </View>
                <Text style={styles.modalTitle}>Ustaya Alət Ver</Text>
              </View>
              <TouchableOpacity onPress={() => setToolModalVisible(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Master selector (if not inside master) */}
              <Text style={styles.inputLabel}>Usta seçin *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                {masters.map((m) => {
                  const isSel = (toolMasterId || selectedMaster?.id) === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.masterChip, isSel && styles.masterChipActive]}
                      onPress={() => setToolMasterId(m.id)}
                    >
                      <Text
                        style={[
                          styles.masterChipText,
                          isSel && styles.masterChipTextActive,
                        ]}
                      >
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.inputLabel}>Alətin / Malın Adı *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Məs: QARMON, Tar, Gitara..."
                placeholderTextColor="#9CA3AF"
                value={toolName}
                onChangeText={setToolName}
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                Say (ədəd) *
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="1"
                placeholderTextColor="#9CA3AF"
                value={toolQuantity}
                onChangeText={setToolQuantity}
                keyboardType="numeric"
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                Seriya Nömrəsi (S/N)
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="İstəyə bağlı"
                placeholderTextColor="#9CA3AF"
                value={toolSerial}
                onChangeText={setToolSerial}
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                Qeyd / Təmir səbəbi
              </Text>
              <TextInput
                style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Nasazlıq haqqında qeyd..."
                placeholderTextColor="#9CA3AF"
                value={toolIssue}
                onChangeText={setToolIssue}
                multiline
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setToolModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Ləğv et</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, savingTool && { opacity: 0.6 }]}
                  disabled={savingTool}
                  onPress={handleCreateTool}
                >
                  {savingTool ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Təsdiqlə</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. Direct Quantity Edit Modal */}
      <Modal
        visible={directEditRepair !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDirectEditRepair(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 320 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sayı dəyişdir</Text>
              <TouchableOpacity onPress={() => setDirectEditRepair(null)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.directEditSub}>
                {directEditRepair ? getCleanItemName(directEditRepair) : ''}
              </Text>
              <Text style={styles.directEditHint}>
                0 daxil etsəniz, alət tam təhvil alınmış sayılacaq.
              </Text>

              <TextInput
                style={styles.directEditInput}
                value={directEditQty}
                onChangeText={setDirectEditQty}
                keyboardType="numeric"
                autoFocus
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDirectEditRepair(null)}
                >
                  <Text style={styles.modalCancelText}>Ləğv et</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleSaveDirectEdit}
                >
                  <Text style={styles.modalSubmitText}>Təsdiqlə</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 10,
    gap: 4,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
  },
  addMasterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 10,
    gap: 4,
  },
  addMasterBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  giveToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    gap: 4,
  },
  giveToolBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },

  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 10,
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },

  // Master Card
  masterCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  masterCardActive: {
    borderColor: '#A7F3D0',
    backgroundColor: '#FAFCFB',
  },
  masterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  masterAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleGreen: {
    backgroundColor: '#10B981',
  },
  avatarCircleGray: {
    backgroundColor: '#E5E7EB',
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '900',
  },
  avatarInitialsGreen: {
    color: '#fff',
  },
  avatarInitialsGray: {
    color: '#4B5563',
  },
  masterName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Tool badge
  toolBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  toolBadgeBoxGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  toolBadgeBoxGray: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  badgeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeLabelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B5563',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillGreen: {
    backgroundColor: '#10B981',
  },
  badgePillGray: {
    backgroundColor: '#E5E7EB',
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  badgePillTextGreen: {
    color: '#fff',
  },
  badgePillTextGray: {
    color: '#6B7280',
  },

  // Chips Preview
  chipsPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 6,
  },
  toolChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    maxWidth: 120,
  },
  toolChipQty: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  toolChipQtyText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#047857',
  },
  moreChipsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    alignSelf: 'center',
  },

  // Card Footer
  masterCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewToolsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 9,
    gap: 6,
  },
  viewToolsBtnGreen: {
    backgroundColor: '#10B981',
  },
  viewToolsBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
  },
  viewToolsBtnTextGreen: {
    color: '#fff',
  },
  quickAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Selected Master Profile Banner
  selectedMasterBanner: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedMasterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarCircleGreenLarge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsGreenLarge: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
  selectedMasterName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  selectedMasterStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  activeToolsCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeToolsCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  toggleArchiveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  toggleArchiveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },

  // Tool Card (Detailed View)
  toolCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  toolCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  toolCodeBadge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  toolCodeText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    color: '#4B5563',
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  deleteToolBtn: {
    padding: 4,
  },
  toolCardName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  issueBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  issueText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  toolDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  toolDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  // Quantity Controller Box
  qtyControllerCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyControllerLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  qtyCounterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 2,
  },
  counterBtnMinus: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterNumberBox: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterNumberText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#065F46',
  },
  counterUnitText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
  },
  counterBtnPlus: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Header
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    marginBottom: 10,
    letterSpacing: 0.5,
  },

  // Archive Card
  archiveCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.85,
  },
  archiveItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  archiveSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2,
  },
  returnedBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  returnedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 240,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  emptyActionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  masterChip: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  masterChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  masterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  masterChipTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B5563',
  },
  modalSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  modalSubmitText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },

  // Direct Edit
  directEditSub: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  directEditHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
  },
  directEditInput: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    paddingVertical: 8,
    marginBottom: 10,
  },
});
