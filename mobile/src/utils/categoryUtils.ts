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

export const getCategoryDepthColor = (level = 0): string => {
  const lvl = Math.max(0, parseInt(String(level), 10) || 0);
  return CATEGORY_DEPTH_COLORS[lvl % CATEGORY_DEPTH_COLORS.length];
};

export interface HierarchicalCategory {
  id: string;
  name: string;
  parent_id?: string | null;
  label: string;
  rawName: string;
  parentName?: string | null;
  level: number;
  color: string;
  hasChildren: boolean;
}

export const buildCategoryDescendantMap = (categories: Array<{ id: string; parent_id?: string | null }>) => {
  const childrenMap: Record<string, string[]> = {};
  categories.forEach((c) => {
    if (c.parent_id) {
      if (!childrenMap[c.parent_id]) childrenMap[c.parent_id] = [];
      childrenMap[c.parent_id].push(c.id);
    }
  });

  const descendantMap: Record<string, string[]> = {};

  const getDescendants = (id: string): string[] => {
    const directChildren = childrenMap[id] || [];
    let all = [...directChildren];
    directChildren.forEach((childId) => {
      all = [...all, ...getDescendants(childId)];
    });
    return all;
  };

  categories.forEach((c) => {
    descendantMap[c.id] = getDescendants(c.id);
  });

  return descendantMap;
};

export const formatCategoriesHierarchically = (
  categories: Array<{ id: string; name: string; parent_id?: string | null }> = []
): HierarchicalCategory[] => {
  if (!Array.isArray(categories) || categories.length === 0) return [];
  const result: HierarchicalCategory[] = [];

  const childrenCountMap: Record<string, number> = {};
  categories.forEach((c) => {
    if (c.parent_id) {
      childrenCountMap[c.parent_id] = (childrenCountMap[c.parent_id] || 0) + 1;
    }
  });

  const findChildren = (parentId: string, level = 0, parentName = '') => {
    const children = categories.filter((c) => c && c.parent_id === parentId);
    children.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    children.forEach((child) => {
      const nameStr = child.name || '';
      const hasChildren = (childrenCountMap[child.id] || 0) > 0;
      result.push({
        id: child.id,
        name: nameStr,
        parent_id: child.parent_id,
        label: nameStr,
        rawName: nameStr,
        parentName: parentName,
        level: level,
        color: getCategoryDepthColor(level),
        hasChildren,
      });
      findChildren(child.id, level + 1, nameStr);
    });
  };

  // Top level categories (no parent_id)
  const topLevel = categories.filter((c) => c && !c.parent_id);
  topLevel.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  topLevel.forEach((cat) => {
    const nameStr = cat.name || '';
    const hasChildren = (childrenCountMap[cat.id] || 0) > 0;
    result.push({
      id: cat.id,
      name: nameStr,
      parent_id: null,
      label: nameStr,
      rawName: nameStr,
      parentName: null,
      level: 0,
      color: getCategoryDepthColor(0),
      hasChildren,
    });
    findChildren(cat.id, 1, nameStr);
  });

  // Handle orphan categories
  const processedIds = new Set(result.map((r) => r.id));
  const orphans = categories.filter((c) => c && !processedIds.has(c.id));
  orphans.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  orphans.forEach((cat) => {
    const nameStr = cat.name || '';
    result.push({
      id: cat.id,
      name: nameStr,
      parent_id: null,
      label: nameStr,
      rawName: nameStr,
      parentName: null,
      level: 0,
      color: getCategoryDepthColor(0),
      hasChildren: false,
    });
  });

  return result;
};
