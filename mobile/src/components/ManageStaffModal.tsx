import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  User,
  Shield,
  Phone,
  Lock,
  ChevronRight,
  Briefcase,
} from 'lucide-react-native';
import { StaffMember, StaffRole } from '../types';
import { staffService } from '../services/staffService';
import { getActiveUserId } from '../services/productService';
import { useAuth } from '../context/AuthContext';

interface ManageStaffModalProps {
  visible: boolean;
  onClose: () => void;
}

const AVAILABLE_ROLES: { role: StaffRole; label: string; desc: string }[] = [
  { role: 'Operator', label: 'Operator', desc: 'Zənglər və sifarişlərin qəbulu' },
  { role: 'Kreditor', label: 'Kreditor', desc: 'Kredit və hissə-hissə ödənişlər' },
  { role: 'Online Media', label: 'Online Media', desc: 'Sosial şəbəkələr və onlayn satış' },
  { role: 'Direktor', label: 'Direktor', desc: 'Şirkət rəhbərliyi və tam nəzarət' },
  { role: 'Adminstrator', label: 'Adminstrator', desc: 'Sistem və filial inzibatçısı' },
  { role: 'Baş menecer', label: 'Baş menecer', desc: 'Baş idarəçi və əməliyyat rəhbəri' },
  { role: 'Mağaza müdiri', label: 'Mağaza müdiri', desc: 'Filial və mağaza rəhbəri' },
  { role: 'Baş Kassir', label: 'Baş Kassir', desc: 'Baş kassa və maliyyə məsuliyyəti' },
  { role: 'Cashier', label: 'Kassir', desc: 'Kassa əməliyyatları və satış' },
  { role: 'Storeman', label: 'Anbardar', desc: 'Anbar qəbulu və hərəkətlər' },
  { role: 'Manager', label: 'Menecer', desc: 'Məhsul və müştəri idarəçiliyi' },
  { role: 'Staff', label: 'İşçi', desc: 'Ümumi satış və heyət' },
];

export const ManageStaffModal: React.FC<ManageStaffModalProps> = ({ visible, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<StaffRole>('Staff');
  const [pin, setPin] = useState('0000');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadStaff();
    }
  }, [visible]);

  const loadStaff = async () => {
    setLoading(true);
    const userId = user?.id || (await getActiveUserId());
    const data = await staffService.getAllStaff(userId);
    setStaffList(data);
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setSelectedRole('Staff');
    setPin('0000');
    setPhone('');
    setIsEditing(true);
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingId(staff.id);
    setName(staff.name);
    setSelectedRole(staff.role || 'Staff');
    setPin(staff.pin || '0000');
    setPhone(staff.phone || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Xəta', 'Əməkdaşın adını daxil edin');
      return;
    }

    try {
      setSaving(true);
      const userId = user?.id || (await getActiveUserId());
      await staffService.saveStaff(
        {
          id: editingId || undefined,
          name: name.trim(),
          role: selectedRole,
          pin: pin.trim() || '0000',
          phone: phone.trim() || undefined,
          status: 'Active',
        },
        userId
      );
      await loadStaff();
      setIsEditing(false);
    } catch (e: any) {
      Alert.alert('Xəta', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (staff: StaffMember) => {
    Alert.alert(
      'Təsdiq',
      `${staff.name} adlı əməkdaşı silmək istədiyinizə əminsiniz?`,
      [
        { text: 'Xeyr', style: 'cancel' },
        {
          text: 'Bəli, Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = user?.id || (await getActiveUserId());
              await staffService.deleteStaff(staff.id, userId);
              await loadStaff();
            } catch (e: any) {
              Alert.alert('Xəta', e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isEditing ? (editingId ? 'Əməkdaşı Redaktə Et' : 'Yeni Əməkdaş') : 'Heyət və Rollar'}
          </Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => (isEditing ? setIsEditing(false) : onClose())}
          >
            <X size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        {isEditing ? (
          /* EDIT / CREATE FORM */
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.label}>Ad və Soyad *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="məs. Nurlan Əliyev"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>PIN Kod (Kassaya giriş üçün) *</Text>
              <TextInput
                style={styles.input}
                value={pin}
                onChangeText={setPin}
                placeholder="4 rəqəmli PIN (məs. 1234)"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={6}
              />

              <Text style={styles.label}>Telefon Nömrəsi</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+994"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Vəzifə / Kateqoriya Seçin *</Text>
              <View style={styles.rolesGrid}>
                {AVAILABLE_ROLES.map((r) => {
                  const isSelected = selectedRole === r.role;
                  const badgeColor = staffService.getRoleBadgeColor(r.role);
                  return (
                    <TouchableOpacity
                      key={r.role}
                      style={[
                        styles.roleCard,
                        isSelected && { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
                      ]}
                      onPress={() => setSelectedRole(r.role)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.roleCardHeader}>
                        <View style={[styles.roleBadge, { backgroundColor: badgeColor.bg, borderColor: badgeColor.border }]}>
                          <Text style={[styles.roleBadgeText, { color: badgeColor.text }]}>{r.label}</Text>
                        </View>
                        {isSelected && <Check size={18} color="#2563EB" />}
                      </View>
                      <Text style={styles.roleDesc}>{r.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Yadda Saxla</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          /* STAFF LIST */
          <View style={{ flex: 1 }}>
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#2563EB" />
              </View>
            ) : (
              <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 100 }}>
                {staffList.length === 0 ? (
                  <View style={styles.centerBox}>
                    <Text style={styles.emptyText}>Heç bir əməkdaş əlavə edilməyib</Text>
                  </View>
                ) : (
                  staffList.map((item) => {
                    const badgeColor = staffService.getRoleBadgeColor(item.role);
                    return (
                      <View key={item.id} style={styles.staffCard}>
                        <View style={styles.staffInfo}>
                          <View style={styles.avatar}>
                            <User size={20} color="#4B5563" />
                          </View>
                          <View style={styles.staffDetails}>
                            <Text style={styles.staffName}>{item.name}</Text>
                            <View style={styles.staffMeta}>
                              <View
                                style={[
                                  styles.roleBadge,
                                  { backgroundColor: badgeColor.bg, borderColor: badgeColor.border },
                                ]}
                              >
                                <Text style={[styles.roleBadgeText, { color: badgeColor.text }]}>
                                  {staffService.getRoleLabel(item.role)}
                                </Text>
                              </View>
                              {item.pin && (
                                <View style={styles.pinTag}>
                                  <Lock size={11} color="#6B7280" />
                                  <Text style={styles.pinTagText}>{item.pin}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>

                        <View style={styles.actions}>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleOpenEdit(item)}
                          >
                            <Edit2 size={18} color="#2563EB" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleDelete(item)}
                          >
                            <Trash2 size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            {/* Floating Add Button */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={handleOpenAdd}
                activeOpacity={0.8}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Yeni Əməkdaş Əlavə Et</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  centerBox: {
    flex: 1,
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  staffMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pinTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pinTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  rolesGrid: {
    gap: 8,
    marginTop: 6,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
