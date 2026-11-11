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
            <SlidersHorizontal size={18} color="#2563EB" />
          </View>
          <Text style={styles.title}>Xüsusiyyətlər</Text>
          {attributes.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{attributes.length}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => handleAdd('')}
          activeOpacity={0.75}
        >
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Quick suggestions */}
      <View style={[styles.suggestionsSection, attributes.length === 0 && { marginBottom: 0 }]}>
        <View style={styles.suggIconWrap}>
          <Sparkles size={14} color="#F59E0B" />
          <Text style={styles.suggLabel}>Tövsiyə (tez əlavə et):</Text>
        </View>
        <View style={styles.suggestionsRow}>
          {SUGGESTIONS.map((sugg) => {
            const isUsed = attributes.some(
              (a) => a.name?.trim().toLowerCase() === sugg.toLowerCase()
            );
            return (
              <TouchableOpacity
                key={sugg}
                style={[styles.suggChip, isUsed && styles.suggChipActive]}
                onPress={() => handleQuickAdd(sugg)}
                activeOpacity={0.7}
              >
                <Text style={[styles.suggChipText, isUsed && styles.suggChipTextActive]}>
                  + {sugg}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Rows */}
      {attributes.length > 0 && (
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
                activeOpacity={0.7}
              >
                <Trash2 size={18} color="#EF4444" />
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
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionsSection: {
    marginBottom: 14,
  },
  suggIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  suggLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  suggestionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggChip: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#60A5FA',
  },
  suggChipText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  suggChipTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  emptyCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    flex: 1,
    fontSize: 13.5,
    color: '#475569',
    fontWeight: '600',
    lineHeight: 18,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rowNum: {
    width: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 14,
    color: '#0F172A',
  },
  nameInput: {
    flex: 1,
    fontWeight: '700',
  },
  valueInput: {
    flex: 1,
    fontWeight: '800',
    color: '#2563EB',
  },
  trashBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
