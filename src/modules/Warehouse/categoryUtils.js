export const formatCategoriesHierarchically = (categories, excludeId = null, t = (k, opts) => opts?.defaultValue || k.split('.').pop()) => {
  const result = [];
  
  // Find all descendants of excludeId to avoid circular references
  const getDescendants = (id) => {
    const children = categories.filter(c => c.parent_id === id);
    let descendants = [...children.map(c => c.id)];
    children.forEach(child => {
      descendants = [...descendants, ...getDescendants(child.id)];
    });
    return descendants;
  };

  const excludedIds = excludeId ? [excludeId, ...getDescendants(excludeId)] : [];
  
  const findChildren = (parentId, level = 0) => {
    const children = categories.filter(c => c.parent_id === parentId && !excludedIds.includes(c.id));
    // Sort children by name
    children.sort((a, b) => a.name.localeCompare(b.name));
    
    children.forEach(child => {
      const translatedName = t(`categories.${child.name}`, { defaultValue: child.name });
      result.push({
        ...child,
        label: level > 0 ? `${'\u00A0\u00A0'.repeat(level)}↳ ${translatedName}` : translatedName,
        level: level
      });
      findChildren(child.id, level + 1);
    });
  };

  // Start with top-level categories (no parent_id)
  const topLevel = categories.filter(c => !c.parent_id && !excludedIds.includes(c.id));
  topLevel.sort((a, b) => a.name.localeCompare(b.name));
  
  topLevel.forEach(cat => {
    const translatedName = t(`categories.${cat.name}`, { defaultValue: cat.name });
    result.push({
      ...cat,
      label: translatedName,
      level: 0
    });
    findChildren(cat.id, 1);
  });

  return result;
};

