import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Store,
  Check,
  Plus,
  X,
  MapPin,
  Building2,
  ChevronRight,
} from 'lucide-react-native';
import { Warehouse } from '../types';
import { productService } from '../services/productService';

interface WarehousePickerModalProps {
  visible: boolean;
  warehouses: Warehouse[];
  activeWarehouseId: string;
  onSelectWarehouse: (warehouseId: string) => void;
  onClose: () => void;
  onWarehouseCreated?: (newWarehouse: Warehouse) => void;
}

export const WarehousePickerModal: React.FC<WarehousePickerModalProps> = ({
  visible,
  warehouses,
  activeWarehouseId,
  onSelectWarehouse,
  onClose,
  onWarehouseCreated,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert('Xəta', 'Zəhmət olmasa anbar / filial adını daxil edin.');
      return;
    }

    setLoading(true);
    try {
      const created = await productService.createWarehouse(newName.trim(), newAddress.trim());
      setShowAddForm(false);
      setNewName('');
      setNewAddress('');
      onWarehouseCreated?.(created);
      onSelectWarehouse(created.id);
      onClose();
    } catch (err: any) {
      Alert.alert('Xəta', err?.message || 'Anbar yaradıla bilmədi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.iconBox}>
                <Store size={20} color="#2563EB" />
              </View>
              <div>
                <Text style={styles.title}>Filial və Anbar Seçimi</Text>
                <Text style={styles.subtitle}>Cari mağaza və ya anbarı dəyişin</Text>
              </div>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* List of Warehouses */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {warehouses.map((w) => {
              const isSelected = w.id === activeWarehouseId;
              return (
                <TouchableOpacity
                  key={w.id}
                  style={[
                    styles.item,
                    isSelected && styles.itemActive,
                  ]}
                  onPress={() => {
                    onSelectWarehouse(w.id);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.itemDot, isSelected && styles.itemDotActive]} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.itemName, isSelected && styles.itemNameActive]}>
                          {w.name}
                        </Text>
                        {w.is_default && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Əsas</Text>
                          </View>
                        )}
                      </View>
                      {w.address ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <MapPin size={11} color="#9CA3AF" />
                          <Text style={styles.itemAddress}>{w.address}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {isSelected ? (
                    <View style={styles.checkCircle}>
                      <Check size={14} color="#fff" />
                    </View>
                  ) : (
                    <ChevronRight size={16} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Quick Add Form or Add Button */}
            {!showAddForm ? (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setShowAddForm(true)}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#2563EB" />
                <Text style={styles.addBtnText}>+ Yeni Anbar / Filial Əlavə Et</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.addForm}>
                <Text style={styles.addFormTitle}>Yeni Anbar / Filial Məlumatları</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Məsələn: DÜKKAN YASAMAL, Mərkəzi Anbar"
                  placeholderTextColor="#9CA3AF"
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                />

                <TextInput
                  style={styles.input}
                  placeholder="Ünvan (istəyə görə): Məs: Zərdabi küç."
                  placeholderTextColor="#9CA3AF"
                  value={newAddress}
                  onChangeText={setNewAddress}
                />

                <View style={styles.formBtnRow}>
                  <TouchableOpacity
                    style={styles.formCancelBtn}
                    onPress={() => setShowAddForm(false)}
                  >
                    <Text style={styles.formCancelBtnText}>İmtina</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.formSaveBtn}
                    onPress={handleCreate}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Check size={14} color="#fff" />
                        <Text style={styles.formSaveBtnText}>Yarat və Seç</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  list: {
    marginTop: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  itemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  itemDotActive: {
    backgroundColor: '#2563EB',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  itemNameActive: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  itemAddress: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  defaultBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4338CA',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    backgroundColor: '#F8FAFC',
    marginTop: 6,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  addForm: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 8,
    gap: 10,
  },
  addFormTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  formCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  formSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  formSaveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
});
