import React, { useState, useEffect } from 'react';
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
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [shakeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setPin('');
      setErrorMsg(null);
      setSelectedStaff(null);
    }
  }, [visible]);

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
                <View style={styles.heroIconCircle}>
                  <Users size={32} color="#10B981" />
                </View>
                <Text style={styles.heroTitle}>Kim işləyir?</Text>
                <Text style={styles.heroSub}>
                  İşə başlamaq üçün profilinizi seçin və PIN kod daxil edin
                </Text>
              </View>

              {/* Profiles List */}
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
                        <Text style={styles.ownerBadgeText}>Sahib · Tam Hüquq</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* 2. STAFF LIST */}
                {staffList.map((st) => {
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
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

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
                <Text style={styles.closeBtnText}>Heyət siyahısı</Text>
              </TouchableOpacity>

              <View style={{ width: 40 }} />
            </View>

            <View style={styles.pinContent}>
              {/* Selected User Info */}
              <View style={styles.pinUserHero}>
                <View style={styles.pinAvatarBox}>
                  {selectedStaff === 'owner' ? (
                    <ShieldCheck size={32} color="#10B981" />
                  ) : (
                    <User size={32} color="#10B981" />
                  )}
                </View>
                <Text style={styles.pinUserName}>
                  {selectedStaff === 'owner'
                    ? profile?.full_name || 'Sahib / İdarəçi'
                    : selectedStaff.name}
                </Text>
                <View style={styles.pinRoleBadge}>
                  <Text style={styles.pinRoleText}>
                    {selectedStaff === 'owner'
                      ? 'Sahib / İdarəçi'
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
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#A7F3D0',
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
