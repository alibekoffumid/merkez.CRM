import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {
  Search,
  X,
  Folder,
  FolderOpen,
  Check,
  ChevronRight,
  ChevronDown,
  Layers,
  CornerDownRight,
} from 'lucide-react-native';
import { Category, Product } from '../types';
import {
  formatCategoriesHierarchically,
  buildCategoryDescendantMap,
  HierarchicalCategory,
  getCategoryDepthColor,
} from '../utils/categoryUtils';

interface CategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  products: Product[];
  canViewStockStats?: boolean;
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  visible,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
  products,
  canViewStockStats = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  // 1. Map of descendants for each category
  const descendantMap = useMemo(() => {
    return buildCategoryDescendantMap(categories);
  }, [categories]);

  // 2. Count products per category (including subcategories)
  const categoryCounts = useMemo(() => {
    const directCounts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.category_id) {
        directCounts[p.category_id] = (directCounts[p.category_id] || 0) + 1;
      }
    });

    const totalCounts: Record<string, number> = {};
    categories.forEach((c) => {
      const descendants = descendantMap[c.id] || [];
      const subtotal = [c.id, ...descendants].reduce(
        (sum, id) => sum + (directCounts[id] || 0),
        0
      );
      totalCounts[c.id] = subtotal;
    });

    return totalCounts;
  }, [categories, products, descendantMap]);

  // 3. Hierarchical list
  const hierarchicalCategories = useMemo(() => {
    return formatCategoriesHierarchically(categories);
  }, [categories]);

  // 4. Toggle collapse/expand of parent category
  const toggleCollapse = (catId: string) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // 5. Filter for search mode or tree display
  const displayItems = useMemo(() => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      return hierarchicalCategories.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.parentName && c.parentName.toLowerCase().includes(q))
      );
    }

    // Tree display with collapsible parents
    const result: HierarchicalCategory[] = [];
    const hiddenDescendantIds = new Set<string>();

    hierarchicalCategories.forEach((item) => {
      if (item.parent_id && hiddenDescendantIds.has(item.parent_id)) {
        hiddenDescendantIds.add(item.id);
        return;
      }

      if (collapsedMap[item.id]) {
        (descendantMap[item.id] || []).forEach((id) => hiddenDescendantIds.add(id));
      }

      result.push(item);
    });

    return result;
  }, [hierarchicalCategories, searchTerm, collapsedMap, descendantMap]);

  const totalProducts = products.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <Layers size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.title}>Kateqoriyalar</Text>
                <Text style={styles.subTitle}>
                  {categories.length} kateqoriya
                  {canViewStockStats ? ` · ${totalProducts} anbar məhsulu` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Ad və ya ana kateqoriyaya görə axtarış..."
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={setSearchTerm}
              clearButtonMode="while-editing"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Depth Color Legend Pills */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getCategoryDepthColor(0) }]} />
              <Text style={styles.legendText}>Əsas</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getCategoryDepthColor(1) }]} />
              <Text style={styles.legendText}>Alt kateqoriya</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getCategoryDepthColor(2) }]} />
              <Text style={styles.legendText}>Səviyyə 3</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getCategoryDepthColor(3) }]} />
              <Text style={styles.legendText}>Səviyyə 4</Text>
            </View>
          </View>

          {/* List of Hierarchical Categories */}
          <FlatList
            data={displayItems}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              !searchTerm.trim() ? (
                <TouchableOpacity
                  style={[
                    styles.itemRow,
                    styles.allCategoriesRow,
                    selectedCategoryId === 'ALL' && styles.itemRowActive,
                  ]}
                  onPress={() => {
                    onSelectCategory('ALL');
                    onClose();
                  }}
                >
                  <View style={styles.itemLeft}>
                    <View
                      style={[
                        styles.folderIconWrap,
                        selectedCategoryId === 'ALL' && styles.folderIconActive,
                      ]}
                    >
                      <Layers
                        size={18}
                        color={selectedCategoryId === 'ALL' ? '#10B981' : '#4B5563'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.allCategoryTitle,
                        selectedCategoryId === 'ALL' && styles.itemTitleActive,
                      ]}
                    >
                      Bütün kateqoriyalar
                    </Text>
                  </View>
                  <View style={styles.itemRight}>
                    {canViewStockStats && (
                      <View style={styles.countBadgeAll}>
                        <Text style={styles.countTextAll}>{totalProducts} əd.</Text>
                      </View>
                    )}
                    {selectedCategoryId === 'ALL' && (
                      <Check size={18} color="#10B981" style={{ marginLeft: 8 }} />
                    )}
                  </View>
                </TouchableOpacity>
              ) : null
            }
            renderItem={({ item }) => {
              const isSelected = selectedCategoryId === item.id;
              const count = categoryCounts[item.id] || 0;
              const isCollapsed = Boolean(collapsedMap[item.id]);
              const indentPadding = Math.min(item.level * 20, 80);

              return (
                <View
                  style={[
                    styles.itemWrapper,
                    { paddingLeft: 12 + indentPadding },
                    isSelected && styles.itemWrapperActive,
                  ]}
                >
                  {/* Left color bar indicator matching web version */}
                  <View
                    style={[
                      styles.colorBarIndicator,
                      { backgroundColor: item.color },
                    ]}
                  />

                  {/* Expand/Collapse Toggle if category has children and not searching */}
                  {item.hasChildren && !searchTerm.trim() ? (
                    <TouchableOpacity
                      style={styles.expandBtn}
                      onPress={() => toggleCollapse(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {isCollapsed ? (
                        <ChevronRight size={16} color="#6B7280" />
                      ) : (
                        <ChevronDown size={16} color={item.color} />
                      )}
                    </TouchableOpacity>
                  ) : item.level > 0 ? (
                    <View style={styles.branchIconWrap}>
                      <CornerDownRight size={13} color={item.color} />
                    </View>
                  ) : (
                    <View style={{ width: 18 }} />
                  )}

                  <TouchableOpacity
                    style={styles.itemClickArea}
                    onPress={() => {
                      onSelectCategory(item.id);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemLeft}>
                      <View
                        style={[
                          styles.folderIconWrap,
                          {
                            backgroundColor: isSelected
                              ? '#D1FAE5'
                              : `${item.color}15`,
                          },
                        ]}
                      >
                        {item.hasChildren && !isCollapsed ? (
                          <FolderOpen size={16} color={item.color} />
                        ) : (
                          <Folder size={16} color={item.color} />
                        )}
                      </View>

                      <View style={styles.nameBlock}>
                        {searchTerm.trim() && item.parentName ? (
                          <Text style={styles.parentBreadcrumb}>
                            {item.parentName} ❯
                          </Text>
                        ) : null}
                        <Text
                          style={[
                            styles.itemTitle,
                            item.level === 0 && styles.itemTitleTopLevel,
                            isSelected && styles.itemTitleActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.itemRight}>
                      {canViewStockStats && count > 0 && (
                        <View
                          style={[
                            styles.countBadge,
                            item.level === 0 && styles.countBadgeTop,
                          ]}
                        >
                          <Text style={styles.countText}>{count} əd.</Text>
                        </View>
                      )}
                      {isSelected && (
                        <Check size={18} color="#10B981" style={{ marginLeft: 6 }} />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            }}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>«{searchTerm}» kateqoriyası tapılmadı</Text>
              </View>
            }
          />
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
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  subTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  allCategoriesRow: {
    marginHorizontal: 4,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  allCategoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  itemRowActive: {
    backgroundColor: '#ECFDF5',
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginVertical: 2,
    position: 'relative',
  },
  itemWrapperActive: {
    backgroundColor: '#ECFDF5',
  },
  colorBarIndicator: {
    position: 'absolute',
    left: 2,
    top: 6,
    bottom: 6,
    width: 3.5,
    borderRadius: 2,
  },
  expandBtn: {
    width: 22,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  branchIconWrap: {
    width: 22,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    opacity: 0.8,
  },
  itemClickArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingRight: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  folderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderIconActive: {
    backgroundColor: '#D1FAE5',
  },
  nameBlock: {
    flex: 1,
  },
  parentBreadcrumb: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  itemTitleTopLevel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  itemTitleActive: {
    color: '#059669',
    fontWeight: '800',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countBadgeTop: {
    backgroundColor: '#E5E7EB',
  },
  countBadgeAll: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  countTextAll: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '800',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
