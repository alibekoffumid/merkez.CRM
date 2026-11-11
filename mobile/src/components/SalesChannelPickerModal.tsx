import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import {
  Share2,
  Plus,
  Trash2,
  X,
  Check,
  Globe,
  Store,
  Camera,
  ShoppingBag,
} from 'lucide-react-native';

interface SalesChannelPickerModalProps {
  visible: boolean;
  onClose: () => void;
  channels: string[];
  customChannels: string[];
  selectedChannel: string;
  onSelectChannel: (channel: string) => void;
  onAddChannel: (channelName: string) => Promise<void>;
  onDeleteChannel: (channelName: string) => Promise<void>;
}

export const SalesChannelPickerModal: React.FC<SalesChannelPickerModalProps> = ({
  visible,
  onClose,
  channels,
  customChannels,
  selectedChannel,
  onSelectChannel,
  onAddChannel,
  onDeleteChannel,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newChannelInput, setNewChannelInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveNewChannel = async () => {
    const trimmed = newChannelInput.trim();
    if (!trimmed) {
      Alert.alert('Xəta', 'Kanalın adını daxil edin');
      return;
    }
    setSaving(true);
    try {
      await onAddChannel(trimmed);
      onSelectChannel(trimmed);
      setNewChannelInput('');
      setIsAdding(false);
    } catch (e: any) {
      Alert.alert('Xəta', e?.message || 'Kanal əlavə edilə bilmədi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (channelName: string) => {
    Alert.alert(
      'Kanalı sil',
      `"${channelName}" satış kanalını silmək istədiyinizə əminsiniz?`,
      [
        { text: 'Ləğv et', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await onDeleteChannel(channelName);
            if (selectedChannel === channelName) {
              onSelectChannel('Mağaza');
            }
          },
        },
      ]
    );
  };

  const getChannelIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('mağaza') || lower.includes('magaza')) {
      return <Store size={18} color="#2563EB" />;
    }
    if (lower.includes('insta')) {
      return <Camera size={18} color="#E1306C" />;
    }
    if (lower.includes('web') || lower.includes('sayt')) {
      return <Globe size={18} color="#059669" />;
    }
    if (lower.includes('birmarket') || lower.includes('market')) {
      return <ShoppingBag size={18} color="#E11D48" />;
    }
    return <Share2 size={18} color="#6366F1" />;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>SATIŞ KANALI</Text>
              <Text style={styles.subtitle}>Sifarişin daxil olduğu mənbəni seçin</Text>
            </View>

            <View style={styles.headerRight}>
              {!isAdding && (
                <TouchableOpacity
                  style={styles.addChannelBtn}
                  onPress={() => setIsAdding(true)}
                  activeOpacity={0.7}
                >
                  <Plus size={15} color="#2563EB" />
                  <Text style={styles.addChannelBtnText}>Yeni kanal</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Add Channel Form */}
          {isAdding && (
            <View style={styles.addFormCard}>
              <Text style={styles.addFormLabel}>YENİ KANALIN ADI:</Text>
              <View style={styles.addInputRow}>
                <TextInput
                  style={styles.addInput}
                  placeholder="Məsələn: WhatsApp, Trendyol, Telegram"
                  placeholderTextColor="#9CA3AF"
                  value={newChannelInput}
                  onChangeText={setNewChannelInput}
                  autoFocus
                />
              </View>
              <View style={styles.addActionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setIsAdding(false);
                    setNewChannelInput('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>İmtina</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveNewChannel}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? 'Saxlanılır...' : 'Əlavə et'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Channel list */}
          <ScrollView
            style={styles.channelList}
            contentContainerStyle={styles.channelListContent}
            showsVerticalScrollIndicator={false}
          >
            {channels.map((ch) => {
              const isSelected = selectedChannel === ch;
              const isCustom = customChannels.includes(ch);

              return (
                <TouchableOpacity
                  key={ch}
                  style={[
                    styles.channelItem,
                    isSelected && styles.channelItemActive,
                  ]}
                  onPress={() => {
                    onSelectChannel(ch);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.channelItemLeft}>
                    <View
                      style={[
                        styles.channelIconBox,
                        isSelected && styles.channelIconBoxActive,
                      ]}
                    >
                      {getChannelIcon(ch)}
                    </View>
                    <Text
                      style={[
                        styles.channelItemText,
                        isSelected && styles.channelItemTextActive,
                      ]}
                    >
                      {ch}
                    </Text>
                  </View>

                  <View style={styles.channelItemRight}>
                    {/* Custom channel delete icon */}
                    {isCustom && (
                      <TouchableOpacity
                        style={styles.deleteCustomBtn}
                        onPress={() => handleDelete(ch)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}

                    {/* Active dot indicator exactly like web version */}
                    {isSelected && (
                      <View style={styles.activeDot} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addChannelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  addChannelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFormCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  addFormLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  addInputRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  addInput: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  addActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  channelList: {
    marginTop: 10,
    maxHeight: 360,
  },
  channelListContent: {
    paddingVertical: 4,
    gap: 8,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  channelItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  channelItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  channelIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  channelIconBoxActive: {
    borderColor: '#BFDBFE',
    backgroundColor: '#fff',
  },
  channelItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  channelItemTextActive: {
    color: '#1D4ED8',
    fontWeight: '900',
  },
  channelItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteCustomBtn: {
    padding: 4,
  },
  activeDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#2563EB',
  },
});
