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
        level: level
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
      level: 0
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
      level: 0
    });
  });

  return result;
};
