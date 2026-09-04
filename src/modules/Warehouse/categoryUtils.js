export const CATEGORY_DEPTH_COLORS = [
  '#4285F4', // Level 0: Main Category (Blue)
  '#34A853', // Level 1: Subcategory 1 (Green)
  '#FBBC05', // Level 2: Subcategory 2 (Yellow)
  '#EA4335', // Level 3: Subcategory 3 (Red)
  '#00A1F1', // Level 4: Subcategory 4 (Sky Blue)
  '#7CBB00', // Level 5: Subcategory 5 (Lime Green)
  '#FFBB00', // Level 6: Subcategory 6 (Amber)
  '#F65314', // Level 7: Subcategory 7 (Deep Orange)
];

export const getCategoryDepthColor = (level = 0) => {
  const lvl = Math.max(0, parseInt(level, 10) || 0);
  return CATEGORY_DEPTH_COLORS[lvl % CATEGORY_DEPTH_COLORS.length];
};

export const getCategoryLevel = (category, allCategories = []) => {
  if (!category || !category.parent_id) return 0;
  let level = 0;
  let currentParentId = category.parent_id;
  const visited = new Set([category.id]);
  
  while (currentParentId && !visited.has(currentParentId)) {
    level++;
    visited.add(currentParentId);
    const parent = allCategories.find(c => c && c.id === currentParentId);
    currentParentId = parent ? parent.parent_id : null;
  }
  return level;
};

export const formatCategoriesHierarchically = (categories = [], excludeId = null, t = (k, opts) => opts?.defaultValue || k.split('.').pop()) => {
  if (!Array.isArray(categories) || categories.length === 0) return [];
  const result = [];
  
  // Find all descendants of excludeId to avoid circular references
  const getDescendants = (id) => {
    const children = categories.filter(c => c && c.parent_id === id);
    let descendants = [...children.map(c => c.id)];
    children.forEach(child => {
      descendants = [...descendants, ...getDescendants(child.id)];
    });
    return descendants;
  };

  const excludedIds = excludeId ? [excludeId, ...getDescendants(excludeId)] : [];
  
  const findChildren = (parentId, level = 0, parentName = '') => {
    const children = categories.filter(c => c && c.parent_id === parentId && !excludedIds.includes(c.id));
    // Sort children safely by name
    children.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    children.forEach(child => {
      const nameStr = child.name || '';
      const translatedName = t(`categories.${nameStr}`, { defaultValue: nameStr });
      result.push({
        ...child,
        label: level > 0 ? `${'\u00A0\u00A0'.repeat(level)}↳ ${translatedName}` : translatedName,
        rawName: translatedName,
        parentName: parentName,
        level: level,
        color: getCategoryDepthColor(level)
      });
      findChildren(child.id, level + 1, translatedName);
    });
  };

  // Start with top-level categories (no parent_id)
  const topLevel = categories.filter(c => c && !c.parent_id && !excludedIds.includes(c.id));
  topLevel.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  
  topLevel.forEach(cat => {
    const nameStr = cat.name || '';
    const translatedName = t(`categories.${nameStr}`, { defaultValue: nameStr });
    result.push({
      ...cat,
      label: translatedName,
      rawName: translatedName,
      parentName: null,
      level: 0,
      color: getCategoryDepthColor(0)
    });
    findChildren(cat.id, 1, translatedName);
  });

  // Handle any orphan categories whose parent doesn't exist
  const processedIds = new Set(result.map(r => r.id));
  const orphans = categories.filter(c => c && !excludedIds.includes(c.id) && !processedIds.has(c.id));
  orphans.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  orphans.forEach(cat => {
    const nameStr = cat.name || '';
    const translatedName = t(`categories.${nameStr}`, { defaultValue: nameStr });
    result.push({
      ...cat,
      label: translatedName,
      rawName: translatedName,
      parentName: null,
      level: 0,
      color: getCategoryDepthColor(0)
    });
  });

  return result;
};

export const getSupplierCurrency = (supplierName) => {
  if (!supplierName) return '';
  const norm = String(supplierName)
    .toLowerCase()
    .replace(/i̇/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ə/g, 'e');

  if (norm.includes('yerli')) return '₼';
  if (norm.includes('lade')) return '￥';
  if (norm.includes('gidoo') || norm.includes('gido')) return '$';
  if (norm.includes('iran')) return '₼';
  if (norm.includes('aroma')) return '$';
  if (norm.includes('miles')) return '$';
  if (norm.includes('vivaldi')) return '$';
  return '';
};
