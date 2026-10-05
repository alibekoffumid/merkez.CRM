import { Product } from '../types';

export interface ParsedSaleInfo {
  channel: string;
  paymentMethod: string;
  customerName: string | null;
  customerPhone: string | null;
  unitPrice: number;
  originalGross: number;
  totalAmount: number;
  discount: number;
  discountPercent: number | null;
  costPrice: number;
  totalCost: number;
  profit: number | null;
  kassaAmount: number | null;
  months: number | null;
  bank: string | null;
  birmarketCategory: string | null;
  rawNotes: string;
  cleanNote: string;
}

export const getChannelBadge = (channel: string) => {
  const ch = (channel || '').toLowerCase();
  if (ch.includes('birmarket')) {
    return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: 'Birmarket' };
  }
  if (ch.includes('kredit')) {
    return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', label: channel };
  }
  if (ch.includes('instagram')) {
    return { bg: '#FDF2F8', border: '#FBCFE8', text: '#DB2777', label: 'Instagram' };
  }
  if (ch.includes('web site') || ch.includes('website') || ch.includes('sayt')) {
    return { bg: '#EEF2FF', border: '#C7D2FE', text: '#4F46E5', label: 'Web site' };
  }
  if (ch.includes('sosial')) {
    return { bg: '#FAF5FF', border: '#E9D5FF', text: '#9333EA', label: 'Instagram' };
  }
  if (ch.includes('tap.az') || ch.includes('tap')) {
    return { bg: '#ECFDF5', border: '#A7F3D0', text: '#059669', label: 'Tap.az' };
  }
  if (ch.includes('lalafo')) {
    return { bg: '#FFF7ED', border: '#FED7AA', text: '#EA580C', label: 'Lalafo' };
  }
  if (ch.includes('tiktok')) {
    return { bg: '#111827', border: '#374151', text: '#FFFFFF', label: 'TikTok' };
  }
  return { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', label: channel || 'Mağaza' };
};

export const parseSaleNote = (note = '', product?: Partial<Product> | null, quantity = 1): ParsedSaleInfo => {
  const qty = Math.abs(parseFloat(String(quantity)) || 1);
  const prodPrice = product?.sale_price ? Number(product.sale_price) : product?.price ? Number(product.price) : 0;
  const prodCost = product?.purchase_price ? Number(product.purchase_price) : 0;

  const info: ParsedSaleInfo = {
    channel: 'Mağaza',
    paymentMethod: 'Nəqd',
    customerName: null,
    customerPhone: null,
    unitPrice: prodPrice,
    originalGross: prodPrice * qty,
    totalAmount: prodPrice * qty,
    discount: 0,
    discountPercent: null,
    costPrice: prodCost,
    totalCost: prodCost * qty,
    profit: null,
    kassaAmount: null,
    months: null,
    bank: null,
    birmarketCategory: null,
    rawNotes: note || '',
    cleanNote: '',
  };

  if (!note) {
    info.profit = info.totalAmount - info.totalCost;
    return info;
  }

  // 1. Channel
  const channelMatch = note.match(/\[Kanal:\s*([^\]]+)\]/i);
  if (channelMatch) {
    info.channel = channelMatch[1].trim();
    if (info.channel.toLowerCase().startsWith('kredit - ')) {
      info.bank = info.channel.replace(/kredit - /i, '').trim();
    }
  }

  // 2. Customer
  const customerMatch = note.match(/\[Müştəri:\s*([^\]]+)\]/i);
  if (customerMatch) {
    const custRaw = customerMatch[1].trim();
    const phoneMatch = custRaw.match(/\(([^)]+)\)/);
    if (phoneMatch) {
      info.customerPhone = phoneMatch[1].trim();
      info.customerName = custRaw.replace(/\([^)]+\)/, '').trim();
    } else {
      info.customerName = custRaw;
    }
  }

  // 3. Payment Method
  const payMatch = note.match(/\(Ödəniş:\s*([^)]+)\)/i);
  if (payMatch) {
    info.paymentMethod = payMatch[1].trim();
  } else if (/birmarket/i.test(note) || /birmarket/i.test(info.channel)) {
    info.paymentMethod = 'Birmarket';
  } else if (/kredit/i.test(note) || /kredit/i.test(info.channel)) {
    info.paymentMethod = 'Kredit';
  } else if (/nisyə|borc/i.test(note)) {
    info.paymentMethod = 'Nisyə';
  } else if (/kart/i.test(note)) {
    info.paymentMethod = 'Kart';
  } else if (/nəqd/i.test(note)) {
    info.paymentMethod = 'Nəqd';
  }

  // 4. Stored price / total if saved in note
  const priceMatch = note.match(/\[Qiymət:\s*₼?([0-9.,]+)\]/i);
  if (priceMatch) {
    info.unitPrice = parseFloat(priceMatch[1].replace(',', '.'));
  }
  const originalGross = info.unitPrice * qty;
  info.originalGross = originalGross;

  // 5. Discount detection (supports [Endirim: ₼5.00], [Скидка: 5], [Endirim: 10%], etc.)
  let discountAmount = 0;
  let discountPercent: number | null = null;
  const discBracketMatch = note.match(/\[(?:Endirim|Скидка|Discount):\s*₼?([0-9.,]+)%?\]/i);
  if (discBracketMatch) {
    if (discBracketMatch[0].includes('%')) {
      discountPercent = parseFloat(discBracketMatch[1].replace(',', '.'));
      discountAmount = (originalGross * discountPercent) / 100;
    } else {
      discountAmount = parseFloat(discBracketMatch[1].replace(',', '.'));
    }
  } else {
    const looseDiscMatch = note.match(/(?:endirim|скидка|discount)\s*:\s*₼?([0-9.,]+)%?/i);
    if (looseDiscMatch) {
      if (looseDiscMatch[0].includes('%')) {
        discountPercent = parseFloat(looseDiscMatch[1].replace(',', '.'));
        discountAmount = (originalGross * discountPercent) / 100;
      } else {
        discountAmount = parseFloat(looseDiscMatch[1].replace(',', '.'));
      }
    }
  }

  const totalMatch = note.match(/\[Məbləğ:\s*₼?([0-9.,]+)\]/i) || note.match(/\[Cəmi:\s*₼?([0-9.,]+)\]/i);
  if (totalMatch) {
    info.totalAmount = parseFloat(totalMatch[1].replace(',', '.'));
    if (discountAmount === 0 && info.totalAmount < originalGross && info.unitPrice > 0) {
      discountAmount = Math.max(0, originalGross - info.totalAmount);
    }
  } else {
    info.totalAmount = Math.max(0, originalGross - discountAmount);
  }

  info.discount = discountAmount;
  info.discountPercent = discountPercent;

  // 6. Birmarket details
  const birmarketMatch = note.match(/Satış\s*\(([^)]+)\):\s*Kassaya\/Saytda:\s*₼?([0-9.,]+),\s*Mənfəət:\s*₼?([0-9.,]+)/i);
  if (birmarketMatch) {
    info.birmarketCategory = birmarketMatch[1].trim();
    info.kassaAmount = parseFloat(birmarketMatch[2].replace(',', '.'));
    info.profit = parseFloat(birmarketMatch[3].replace(',', '.'));
  }

  // 7. Credit details
  const creditMatch = note.match(/Kredit Satışı\s*\(([0-9]+)\s*ay\):\s*Kassaya:\s*₼?([0-9.,]+),\s*Mənfəət:\s*₼?([0-9.,]+)/i);
  if (creditMatch) {
    info.months = parseInt(creditMatch[1], 10);
    info.kassaAmount = parseFloat(creditMatch[2].replace(',', '.'));
    info.profit = parseFloat(creditMatch[3].replace(',', '.'));
  }

  // Fallback profit calculation if not parsed
  if (info.profit === null) {
    info.profit = info.totalAmount - info.totalCost;
  }

  // Extract clean custom note (strip metadata brackets)
  info.cleanNote = note
    .replace(/\[Kanal:[^\]]+\]/gi, '')
    .replace(/\[Müştəri:[^\]]+\]/gi, '')
    .replace(/\[Qiymət:[^\]]+\]/gi, '')
    .replace(/\[Endirim:[^\]]+\]/gi, '')
    .replace(/\[Скидка:[^\]]+\]/gi, '')
    .replace(/\[Discount:[^\]]+\]/gi, '')
    .replace(/\[Məbləğ:[^\]]+\]/gi, '')
    .replace(/\[Cəmi:[^\]]+\]/gi, '')
    .replace(/^Məhsul Satışı\s*\(Ödəniş:[^)]+\)/gi, '')
    .replace(/^POS Satış\s*#[A-Z0-9-]+\s*\(Ödəniş:[^)]+\)/gi, '')
    .trim();

  return info;
};
