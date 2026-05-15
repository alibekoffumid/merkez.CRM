export const formatCategoriesHierarchically = (categories, excludeId = null) => {
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
      result.push({
        ...child,
        label: level > 0 ? `${'  '.repeat(level)}↳ ${child.name}` : child.name,
        level: level
      });
      findChildren(child.id, level + 1);
    });
  };

  // Start with top-level categories (no parent_id)
  const topLevel = categories.filter(c => !c.parent_id && !excludedIds.includes(c.id));
  topLevel.sort((a, b) => a.name.localeCompare(b.name));
  
  topLevel.forEach(cat => {
    result.push({
      ...cat,
      label: cat.name,
      level: 0
    });
    findChildren(cat.id, 1);
  });

  return result;
};

