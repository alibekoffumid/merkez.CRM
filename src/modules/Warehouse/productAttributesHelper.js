/**
 * Helper utilities for managing product characteristics / attributes (e.g. Size, Color, Material, etc.)
 */

export const parseProductAttributes = (product) => {
  if (!product) return [];

  // 1. Try product.attributes (JSONB column)
  let rawAttrs = product.attributes;
  if (typeof rawAttrs === 'string') {
    try {
      rawAttrs = JSON.parse(rawAttrs);
    } catch (e) {
      rawAttrs = null;
    }
  }

  if (Array.isArray(rawAttrs) && rawAttrs.length > 0) {
    return rawAttrs
      .filter(item => item && (item.name || item.key))
      .map((item, idx) => ({
        id: item.id || `attr-${idx}-${Date.now()}`,
        name: String(item.name || item.key || '').trim(),
        value: String(item.value ?? item.val ?? '').trim()
      }));
  }

  if (rawAttrs && typeof rawAttrs === 'object' && !Array.isArray(rawAttrs)) {
    return Object.entries(rawAttrs).map(([name, value], idx) => ({
      id: `attr-${idx}-${Date.now()}`,
      name: String(name).trim(),
      value: String(value ?? '').trim()
    }));
  }

  // 2. Fallback: Parse from product.description
  const desc = product.description || '';
  if (!desc) return [];

  const charHeaderMatch = desc.match(/(?:xarakteristika(?:lar)?|xüsusiyyət(?:lər)?|характеристик[аи]|attributes?|specs?)\s*:([\s\S]*)/i);
  if (!charHeaderMatch || !charHeaderMatch[1]) return [];

  const lines = charHeaderMatch[1].split('\n');
  const parsed = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Stop if encountering another standard section
    if (rawLine.startsWith('Əlavə məlumat:') || rawLine.startsWith('Zavod qiyməti:')) {
      break;
    }

    // Strip bullet markers (•, -, *, >)
    const line = rawLine.replace(/^[•\-\*\>]\s*/, '').trim();
    const colonIndex = line.indexOf(':');

    if (colonIndex > 0) {
      const name = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      if (name) {
        parsed.push({
          id: `desc-attr-${parsed.length}-${Date.now()}`,
          name,
          value
        });
      }
    }
  }

  return parsed;
};

export const cleanAttributesForSave = (attributes) => {
  if (!Array.isArray(attributes)) return [];
  return attributes
    .filter(attr => attr && (attr.name?.trim() || attr.value?.trim()))
    .map(attr => ({
      name: (attr.name || '').trim(),
      value: (attr.value || '').trim()
    }));
};

export const formatAttributesForDescription = (cleanAttributes) => {
  if (!cleanAttributes || cleanAttributes.length === 0) return '';
  const lines = cleanAttributes.map(a => `• ${a.name}: ${a.value}`);
  return `Xarakteristikalar:\n${lines.join('\n')}`;
};

export const extractAdditionalInfo = (description = '') => {
  if (!description) return '';
  let info = '';
  if (description.includes('Əlavə məlumat:')) {
    info = description.split('Əlavə məlumat:')[1];
  } else if (description.includes('?lav? m?lumat:')) {
    info = description.split('?lav? m?lumat:')[1];
  } else {
    // If there is no explicit label, remove Zavod qiyməti and Xarakteristikalar blocks
    let cleaned = description;
    cleaned = cleaned.replace(/Zavod qiym[əe\?]ti:[^\n]*\n?/gi, '');
    cleaned = cleaned.replace(/(?:xarakteristika(?:lar)?|xüsusiyyət(?:lər)?|характеристик[аи]|attributes?|specs?)\s*:[\s\S]*/gi, '');
    return cleaned.trim();
  }

  // If there are characteristics following additional info, cut them off
  if (info) {
    info = info.split(/(?:xarakteristika(?:lar)?|xüsusiyyət(?:lər)?|характеристик[аи]|attributes?|specs?)\s*:/i)[0];
    info = info.split('Zavod qiyməti:')[0];
    return info.trim();
  }

  return '';
};
