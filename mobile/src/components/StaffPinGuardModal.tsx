import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ShieldCheck,
  User,
  Users,
  ChevronLeft,
  Delete,
  LogOut,
  Lock,
  Sparkles,
  ShoppingBag,
  Package,
  Wrench,
  Check,
  Store,
  Hammer,
  ArrowRight,
} from 'lucide-react-native';
import { StaffMember, StaffRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { staffService } from '../services/staffService';

interface StaffPinGuardModalProps {
  visible: boolean;
  canCancel?: boolean;
  onClose?: () => void;
}

export const StaffPinGuardModal: React.FC<StaffPinGuardModalProps> = ({
  visible,
  canCancel = false,
  onClose,
}) => {
  const { profile, staffList, selectStaff, logout, currentStaff } = useAuth();
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | 'owner' | null>(null);
  const [activeTab, setActiveTab] = useState<'store' | 'masters'>('store');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [shakeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setPin('');
      setErrorMsg(null);
      setSelectedStaff(null);
      setActiveTab('store');
    }
  }, [visible]);

  const isMasterRole = (role?: string) => String(role || '').trim().toLowerCase() === 'master';

  // Store employees: all active staff excluding masters
  const storeEmployees = useMemo(() => {
    return staffList.filter((s) => !isMasterRole(s.role));
  }, [staffList]);

  // Masters: only staff with role 'master' / 'Master'
  const mastersList = useMemo(() => {
    return staffList.filter((s) => isMasterRole(s.role));
  }, [staffList]);

  const triggerShake = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSelectUser = (target: StaffMember | 'owner') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedStaff(target);
    setPin('');
    setErrorMsg(null);
  };

  const handleNumberPress = async (digit: string) => {
    if (pin.length >= 4 || verifying) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const nextPin = pin + digit;
    setPin(nextPin);
    setErrorMsg(null);

    if (nextPin.length === 4 && selectedStaff) {
      await attemptSubmit(nextPin, selectedStaff);
    }
  };

  const handleDeletePress = () => {
    if (pin.length > 0) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      setPin(prev => prev.slice(0, -1));
      setErrorMsg(null);
    }
  };

  const attemptSubmit = async (pinValue: string, staffTarget: StaffMember | 'owner') => {
    setVerifying(true);
    const res = await selectStaff(staffTarget, pinValue);
    setVerifying(false);

    if (res.success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      if (onClose) onClose();
    } else {
      setErrorMsg(res.error || 'PIN kod yanlışdır');
      triggerShake();
      setTimeout(() => {
        setPin('');
      }, 500);
    }
  };

  const getRoleIcon = (role?: StaffRole) => {
    switch (role) {
      case 'Cashier':
        return <ShoppingBag size={14} color="#D97706" />;
      case 'Storeman':
        return <Package size={14} color="#059669" />;
      case 'Master':
        return <Wrench size={14} color="#4F46E5" />;
      case 'Manager':
      case 'Admin':
      case 'Owner':
        return <ShieldCheck size={14} color="#2563EB" />;
      default:
        return <User size={14} color="#4B5563" />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={() => {
      if (canCancel && onClose) onClose();
    }}>
      <SafeAreaView style={styles.safeArea}>
        {/* VIEW 1: SELECT PROFILE ("Kim işləyir?") */}
        {!selectedStaff ? (
          <View style={styles.container}>
            {/* Top Bar with Cancel (if optional) */}
            <View style={styles.headerBar}>
              {canCancel ? (
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <ChevronLeft size={22} color="#111827" />
                  <Text style={styles.closeBtnText}>Geri</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 40 }} />
              )}

              <View style={styles.headerBadge}>
                <Lock size={14} color="#10B981" />
                <Text style={styles.headerBadgeText}>Təhlükəsiz Giriş</Text>
              </View>

              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.heroSection}>
                <View
                  style={[
                    styles.heroIconCircle,
                    activeTab === 'masters' && styles.heroIconCircleAmber,
                  ]}
                >
                  {activeTab === 'masters' ? (
                    <Hammer size={32} color="#D97706" />
                  ) : (
                    <Users size={32} color="#2563EB" />
                  )}
                </View>
                <Text style={styles.heroTitle}>
                  {activeTab === 'masters' ? 'Usta girişi' : 'Kim işləyir?'}
                </Text>
                <Text style={styles.heroSub}>
                  {activeTab === 'masters'
                    ? 'Təmir servisi üçün ustanı seçin və PIN kod daxil edin'
                    : 'Mağaza əməkdaşları üçün giriş (kassirlər, satıcılar, menecerlər)'}
                </Text>
              </View>

              {/* Segmented Control Tabs */}
              <View style={styles.segmentedContainer}>
                <TouchableOpacity
                  style={[
                    styles.segmentedTab,
                    activeTab === 'store' && styles.segmentedTabActive,
                  ]}
                  onPress={() => setActiveTab('store')}
                  activeOpacity={0.8}
                >
                  <Store size={15} color={activeTab === 'store' ? '#2563EB' : '#64748B'} />
                  <Text
                    style={[
                      styles.segmentedTabText,
                      activeTab === 'store' && styles.segmentedTabTextActive,
                    ]}
                  >
                    Mağaza
                  </Text>
                  <View
                    style={[
                      styles.segmentedCountBadge,
                      activeTab === 'store'
                        ? styles.segmentedCountBadgeBlue
                        : styles.segmentedCountBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentedCountText,
                        activeTab === 'store'
                          ? styles.segmentedCountTextBlue
                          : styles.segmentedCountTextInactive,
                      ]}
                    >
                      {storeEmployees.length + 1}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentedTab,
                    activeTab === 'masters' && styles.segmentedTabActive,
                  ]}
                  onPress={() => setActiveTab('masters')}
                  activeOpacity={0.8}
                >
                  <Hammer size={15} color={activeTab === 'masters' ? '#D97706' : '#64748B'} />
                  <Text
                    style={[
                      styles.segmentedTabText,
                      activeTab === 'masters' && styles.segmentedTabTextActive,
                    ]}
                  >
                    Ustalar
                  </Text>
                  <View
                    style={[
                      styles.segmentedCountBadge,
                      activeTab === 'masters'
                        ? styles.segmentedCountBadgeAmber
                        : styles.segmentedCountBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentedCountText,
                        activeTab === 'masters'
                          ? styles.segmentedCountTextAmber
                          : styles.segmentedCountTextInactive,
                      ]}
                    >
                      {mastersList.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Profiles List */}
              {activeTab === 'store' ? (
                <View style={styles.profilesSection}>
                  {/* 1. OWNER / ADMIN */}
                  <TouchableOpacity
                    style={[
                      styles.profileCard,
                      styles.ownerCard,
                      currentStaff === 'owner' && styles.profileCardActive,
                    ]}
                    onPress={() => handleSelectUser('owner')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.ownerAvatar}>
                      <ShieldCheck size={22} color="#fff" />
                    </View>
                    <View style={styles.profileInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.ownerTitle}>
                          {profile?.full_name || 'Sahib / İdarəçi'}
                        </Text>
                        {currentStaff === 'owner' && (
                          <View style={styles.activeCheckBadge}>
                            <Check size={12} color="#10B981" />
                          </View>
                        )}
                      </View>
                      <View style={styles.roleRow}>
                        <View style={styles.ownerBadge}>
                          <Text style={styles.ownerBadgeText}>İdarəçi · Tam Giriş</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* 2. STORE STAFF (EXCLUDING MASTERS) */}
                  {storeEmployees.map((st) => {
                    const badgeColor = staffService.getRoleBadgeColor(st.role);
                    const isCurrent =
                      typeof currentStaff === 'object' && currentStaff?.id === st.id;

                    return (
                      <TouchableOpacity
                        key={st.id}
                        style={[styles.profileCard, isCurrent && styles.profileCardActive]}
                        onPress={() => handleSelectUser(st)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.staffAvatar,
                            { backgroundColor: badgeColor.bg, borderColor: badgeColor.border },
                          ]}
                        >
                          <User size={20} color={badgeColor.text} />
                        </View>

                        <View style={styles.profileInfo}>
                          <View style={styles.nameRow}>
                            <Text style={styles.staffName}>{st.name}</Text>
                            {isCurrent && (
                              <View style={styles.activeCheckBadge}>
                                <Check size={12} color="#10B981" />
                              </View>
                            )}
                          </View>
                          <View style={styles.roleRow}>
                            <View
                              style={[
                                styles.roleBadge,
                                { backgroundColor: badgeColor.bg, borderColor: badgeColor.border },
                              ]}
                            >
                              {getRoleIcon(st.role)}
                              <Text style={[styles.roleBadgeText, { color: badgeColor.text }]}>
                                {staffService.getRoleLabel(st.role)}
                              </Text>
                            </View>
                            {st.phone && (
                              <Text style={styles.staffPhoneText}>{st.phone}</Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Transition Card to Masters */}
                  <TouchableOpacity
                    style={styles.mastersPromoBanner}
                    onPress={() => setActiveTab('masters')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.mastersPromoLeft}>
                      <View style={styles.mastersPromoIconBox}>
                        <Hammer size={18} color="#D97706" />
                      </View>
                      <View style={styles.mastersPromoTextBox}>
                        <View style={styles.mastersPromoTitleRow}>
                          <Text style={styles.mastersPromoTitle}>Usta və Servis Girişi</Text>
                          <View style={styles.mastersPromoCountBadge}>
                            <Text style={styles.mastersPromoCountText}>
                              {mastersList.length}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.mastersPromoSub}>
                          Təmir sifarişlərini idarə etmək üçün
                        </Text>
                      </View>
                    </View>
                    <ArrowRight size={18} color="#D97706" />
                  </TouchableOpacity>
                </View>
              ) : (
                /* MASTERS TAB */
                <View style={styles.profilesSection}>
                  {mastersList.length > 0 ? (
                    mastersList.map((m) => {
                      const isCurrent =
                        typeof currentStaff === 'object' && currentStaff?.id === m.id;

                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[
                            styles.profileCard,
                            styles.masterCard,
                            isCurrent && styles.profileCardActiveAmber,
                          ]}
                          onPress={() => handleSelectUser(m)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.masterAvatar}>
                            <Wrench size={20} color="#D97706" />
                          </View>

                          <View style={styles.profileInfo}>
                            <View style={styles.nameRow}>
                              <Text style={styles.staffName}>{m.name}</Text>
                              {isCurrent && (
                                <View style={styles.activeCheckBadgeAmber}>
                                  <Check size={12} color="#D97706" />
                                </View>
                              )}
                            </View>
                            <View style={styles.roleRow}>
                              <View style={styles.masterRoleBadge}>
                                <Wrench size={12} color="#B45309" />
                                <Text style={styles.masterRoleBadgeText}>Usta</Text>
                              </View>
                              <Text style={styles.staffPhoneText}>
                                {m.phone || 'Təmir mütəxəssisi'}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={styles.emptyMastersCard}>
                      <View style={styles.emptyMastersIconCircle}>
                        <Hammer size={26} color="#D97706" />
                      </View>
                      <Text style={styles.emptyMastersTitle}>Usta tapılmadı</Text>
                      <Text style={styles.emptyMastersSub}>
                        «Heyət» bölməsində «Usta» vəzifəsi ilə əməkdaş əlavə edin
                      </Text>
                    </View>
                  )}

                  {/* Back to store staff */}
                  <TouchableOpacity
                    style={styles.backToStoreBtn}
                    onPress={() => setActiveTab('store')}
                    activeOpacity={0.7}
                  >
                    <ChevronLeft size={16} color="#475569" />
                    <Text style={styles.backToStoreText}>
                      Mağaza əməkdaşlarına qayıt
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Logout Option */}
              <TouchableOpacity
                style={styles.fullLogoutBtn}
                onPress={logout}
                activeOpacity={0.7}
              >
                <LogOut size={16} color="#6B7280" />
                <Text style={styles.fullLogoutText}>Hesabdan çıxış et</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ) : (
          /* VIEW 2: PIN PAD */
          <View style={styles.container}>
            {/* Top Bar with Back Button */}
            <View style={styles.headerBar}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  setSelectedStaff(null);
                  setPin('');
                  setErrorMsg(null);
                }}
              >
                <ChevronLeft size={24} color="#111827" />
                <Text style={styles.closeBtnText}>
                  {activeTab === 'masters' ? 'Ustalar siyahısı' : 'Heyət siyahısı'}
                </Text>
              </TouchableOpacity>

              <View style={{ width: 40 }} />
            </View>

            <View style={styles.pinContent}>
              {/* Selected User Info */}
              <View style={styles.pinUserHero}>
                <View
                  style={[
                    styles.pinAvatarBox,
                    selectedStaff !== 'owner' &&
                      isMasterRole(selectedStaff?.role) &&
                      styles.pinAvatarBoxAmber,
                  ]}
                >
                  {selectedStaff === 'owner' ? (
                    <ShieldCheck size={32} color="#2563EB" />
                  ) : isMasterRole(selectedStaff.role) ? (
                    <Wrench size={32} color="#D97706" />
                  ) : (
                    <User size={32} color="#10B981" />
                  )}
                </View>
                <Text style={styles.pinUserName}>
                  {selectedStaff === 'owner'
                    ? profile?.full_name || 'Sahib / İdarəçi'
                    : selectedStaff.name}
                </Text>
                <View
                  style={[
                    styles.pinRoleBadge,
                    selectedStaff !== 'owner' &&
                      isMasterRole(selectedStaff?.role) &&
                      styles.pinRoleBadgeAmber,
                  ]}
                >
                  <Text
                    style={[
                      styles.pinRoleText,
                      selectedStaff !== 'owner' &&
                        isMasterRole(selectedStaff?.role) &&
                        styles.pinRoleTextAmber,
                    ]}
                  >
                    {selectedStaff === 'owner'
                      ? 'Sahib / İdarəçi'
                      : isMasterRole(selectedStaff.role)
                      ? 'Usta · Təmir mütəxəssisi'
                      : staffService.getRoleLabel(selectedStaff.role)}
                  </Text>
                </View>
                <Text style={styles.pinPrompt}>4 rəqəmli PIN kodunuzu daxil edin</Text>
              </View>

              {/* 4 PIN Dots with shake animation */}
              <Animated.View
                style={[
                  styles.dotsRow,
                  {
                    transform: [{ translateX: shakeAnim }],
                  },
                ]}
              >
                {[0, 1, 2, 3].map((idx) => {
                  const filled = pin.length > idx;
                  const isError = !!errorMsg;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.pinDot,
                        filled && styles.pinDotFilled,
                        isError && styles.pinDotError,
                      ]}
                    />
                  );
                })}
              </Animated.View>

              {/* Error Message */}
              {errorMsg ? (
                <Text style={styles.errorText}>{errorMsg}</Text>
              ) : (
                <View style={{ height: 20 }} />
              )}

              {/* Keypad */}
              <View style={styles.keypad}>
                {[
                  ['1', '2', '3'],
                  ['4', '5', '6'],
                  ['7', '8', '9'],
                  ['', '0', 'del'],
                ].map((row, rIdx) => (
                  <View key={rIdx} style={styles.keypadRow}>
                    {row.map((btn, bIdx) => {
                      if (btn === '') {
                        return <View key={bIdx} style={styles.keypadEmpty} />;
                      }

                      if (btn === 'del') {
                        return (
                          <TouchableOpacity
                            key={bIdx}
                            style={styles.keypadBtn}
                            onPress={handleDeletePress}
                            activeOpacity={0.6}
                          >
                            <Delete size={24} color="#4B5563" />
                          </TouchableOpacity>
                        );
                      }

                      return (
                        <TouchableOpacity
                          key={bIdx}
                          style={styles.keypadBtn}
                          onPress={() => handleNumberPress(btn)}
                          activeOpacity={0.6}
                        >
                          <Text style={styles.keypadDigit}>{btn}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              {verifying && (
                <View style={styles.verifyingOverlay}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={styles.verifyingText}>Yoxlanılır...</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  heroIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  heroIconCircleAmber: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  segmentedTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentedTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentedTabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  segmentedCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  segmentedCountBadgeBlue: {
    backgroundColor: '#DBEAFE',
  },
  segmentedCountBadgeAmber: {
    backgroundColor: '#FEF3C7',
  },
  segmentedCountBadgeInactive: {
    backgroundColor: '#E2E8F0',
  },
  segmentedCountText: {
    fontSize: 11,
    fontWeight: '900',
  },
  segmentedCountTextBlue: {
    color: '#1D4ED8',
  },
  segmentedCountTextAmber: {
    color: '#B45309',
  },
  segmentedCountTextInactive: {
    color: '#64748B',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  profilesSection: {
    gap: 12,
    marginTop: 10,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  profileCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  ownerCard: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ownerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  staffName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  activeCheckBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ownerBadgeText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '700',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  staffPhoneText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 8,
  },
  mastersPromoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 6,
  },
  mastersPromoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  mastersPromoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mastersPromoTextBox: {
    flex: 1,
  },
  mastersPromoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  mastersPromoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  mastersPromoCountBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  mastersPromoCountText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#78350F',
  },
  mastersPromoSub: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '500',
  },
  masterCard: {
    borderColor: '#FDE68A',
    backgroundColor: '#fff',
  },
  profileCardActiveAmber: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  masterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCheckBadgeAmber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  masterRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  masterRoleBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyMastersCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  emptyMastersIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyMastersTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptyMastersSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  backToStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 8,
  },
  backToStoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  pinAvatarBoxAmber: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  pinRoleBadgeAmber: {
    backgroundColor: '#FEF3C7',
  },
  pinRoleTextAmber: {
    color: '#B45309',
  },
  fullLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 12,
  },
  fullLogoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  pinContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pinUserHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pinAvatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  pinUserName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  pinRoleBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  pinRoleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  pinPrompt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 16,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  pinDotError: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  keypad: {
    width: '100%',
    maxWidth: 290,
    gap: 14,
    marginTop: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keypadBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  keypadEmpty: {
    width: 72,
    height: 72,
  },
  keypadDigit: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  verifyingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  verifyingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
});
