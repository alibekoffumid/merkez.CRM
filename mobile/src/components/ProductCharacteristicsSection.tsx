import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Plus, Trash2, Sparkles, SlidersHorizontal, Tag } from 'lucide-react-native';
import { ProductAttribute } from '../types';

interface ProductCharacteristicsSectionProps {
  attributes: ProductAttribute[];
  onChange: (attributes: ProductAttribute[]) => void;
}

const SUGGESTIONS = ['Ölçü', 'Rəng', 'Material', 'Çəki', 'Model', 'Brend'];

export const ProductCharacteristicsSection: React.FC<ProductCharacteristicsSectionProps> = ({
  attributes,
  onChange,
}) => {
  const handleAdd = (initialName = '') => {
    const newId = `attr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    onChange([...attributes, { id: newId, name: initialName, value: '' }]);
  };

  const handleUpdate = (id: string | undefined, field: 'name' | 'value', val: string) => {
    const updated = attributes.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    });
    onChange(updated);
  };

  const handleRemove = (id: string | undefined) => {
    const updated = attributes.filter((item) => item.id !== id);
    onChange(updated);
  };

  const handleQuickAdd = (suggestion: string) => {
    const emptyIdx = attributes.findIndex((a) => !a.name && !a.value);
    if (emptyIdx !== -1) {
      const updated = [...attributes];
      updated[emptyIdx] = { ...updated[emptyIdx], name: suggestion };
      onChange(updated);
    } else {
      handleAdd(suggestion);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <SlidersHorizontal size={14} color="#2563EB" />
          </View>
          <Text style={styles.title}>Xüsusiyyətlər</Text>
          {attributes.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{attributes.length}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd('')}>
          <Plus size={14} color="#fff" />
          <Text style={styles.addBtnText}>Xüsusiyyət əlavə et</Text>
        </TouchableOpacity>
      </View>

      {/* Quick suggestions */}
      <View style={styles.suggestionsRow}>
        <View style={styles.suggIconWrap}>
          <Sparkles size={11} color="#F59E0B" />
          <Text style={styles.suggLabel}>Tövsiyə:</Text>
        </View>
        {SUGGESTIONS.map((sugg) => {
          const isUsed = attributes.some(
            (a) => a.name?.trim().toLowerCase() === sugg.toLowerCase()
          );
          return (
            <TouchableOpacity
              key={sugg}
              style={[styles.suggChip, isUsed && styles.suggChipActive]}
              onPress={() => handleQuickAdd(sugg)}
            >
              <Text style={[styles.suggChipText, isUsed && styles.suggChipTextActive]}>
                + {sugg}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rows */}
      {attributes.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyCard}
          onPress={() => handleAdd('')}
          activeOpacity={0.7}
        >
          <Tag size={16} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            Ölçü, rəng və ya digər parametrlər daxil etmək üçün toxunun
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.list}>
          {attributes.map((attr, index) => (
            <View key={attr.id || index} style={styles.row}>
              <View style={styles.rowNum}>
                <Text style={styles.rowNumText}>#{index + 1}</Text>
              </View>

              <TextInput
                style={[styles.input, styles.nameInput]}
                value={attr.name}
                onChangeText={(val) => handleUpdate(attr.id, 'name', val)}
                placeholder="Adı (məs. Ölçü)"
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                style={[styles.input, styles.valueInput]}
                value={attr.value}
                onChangeText={(val) => handleUpdate(attr.id, 'value', val)}
                placeholder="Dəyəri (məs. XL)"
                placeholderTextColor="#9CA3AF"
              />

              <TouchableOpacity
                style={styles.trashBtn}
                onPress={() => handleRemove(attr.id)}
              >
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  suggestionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  suggIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginRight: 2,
  },
  suggLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  suggChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  suggChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  suggChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  suggChipTextActive: {
    color: '#2563EB',
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rowNum: {
    width: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowNumText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
  },
  nameInput: {
    flex: 1,
    fontWeight: '600',
  },
  valueInput: {
    flex: 1,
    fontWeight: '700',
    color: '#2563EB',
  },
  trashBtn: {
    padding: 4,
  },
});
