import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Alert, Platform, NativeModules } from 'react-native';
import QRCode from 'qrcode';

const { DirectPrinter } = NativeModules;

export interface PrinterConfig {
  connectionType?: 'direct_tcp' | 'rawbt';
  ipAddress: string;
  port: number;
  paperWidth: '58mm' | '80mm';
  autoPrint: boolean;
  autoCut?: boolean;
  openDrawer?: boolean;
  storeName: string;
  storeSubtitle?: string;
  storeAddress: string;
  voen: string;
  phone: string;
  footerNote: string;
  tsName?: string;
  tsAddress?: string;
  voName?: string;
  objectCode?: string;
  kassaNumber?: string;
  filialName?: string;
}

export interface SavedPrinter {
  id: string;
  name: string;
  connectionType: 'direct_tcp' | 'rawbt';
  ipAddress: string;
  port: number;
  paperWidth: '58mm' | '80mm';
  autoCut?: boolean;
  openDrawer?: boolean;
  isDefault: boolean;
  lastOnline?: boolean;
  lastChecked?: number;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  connectionType: 'direct_tcp',
  ipAddress: '192.168.1.200',
  port: 9100,
  paperWidth: '58mm',
  autoPrint: false,
  autoCut: true,
  openDrawer: false,
  storeName: 'RAST MUSİQİ ALƏTLƏRİ MAĞAZASI',
  storeSubtitle: 'Musiqi Alətlərinin Satışı və Təmiri',
  storeAddress: 'AZ1142 BAKI ŞƏHƏRİ XƏTAİ RAYONU ev.18A m.92',
  voen: '5501238362',
  phone: '+994 50 123 45 67',
  footerNote: 'Bizi seçdiyiniz üçün təşəkkür edirik!',
  tsName: 'MUSİQİ ALƏTLƏRİ SATIŞI VƏ TƏMİRİ',
  tsAddress: 'AZ1142 BAKI ŞƏHƏRİ XƏTAİ RAYONU ev.18A m.92',
  voName: 'ŞƏKƏROV KAMRAN MUSA OĞLU',
  objectCode: '5501238362-20001',
  kassaNumber: 'V1E0969392',
  filialName: 'DÜKKAN - ƏHMƏDLİ',
};

export function uint8ToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : NaN;
    const b3 = i + 2 < len ? bytes[i + 2] : NaN;

    const e1 = b1 >> 2;
    const e2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    const e3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
    const e4 = isNaN(b3) ? 64 : b3 & 63;

    output += chars.charAt(e1) + chars.charAt(e2) + chars.charAt(e3) + chars.charAt(e4);
  }
  return output;
}

export function cleanAzeriText(str: string): string {
  if (!str) return '';
  return str
    .replace(/ə/g, 'e')
    .replace(/Ə/g, 'E')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/₼/g, 'AZN');
}

export class EscPosBuilder {
  private buffer: number[] = [];

  init() {
    this.buffer.push(0x1B, 0x40); // ESC @
    this.buffer.push(0x1B, 0x61, 0x00); // ESC a 0 (standard left alignment)
    return this;
  }

  align(alignment: 'left' | 'center' | 'right') {
    const code = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(0x1B, 0x61, code);
    return this;
  }

  bold(enable: boolean) {
    this.buffer.push(0x1B, 0x45, enable ? 1 : 0);
    return this;
  }

  doubleHeight(enable: boolean) {
    this.buffer.push(0x1D, 0x21, enable ? 0x01 : 0x00);
    return this;
  }

  doubleSize(enable: boolean) {
    this.buffer.push(0x1D, 0x21, enable ? 0x11 : 0x00);
    return this;
  }

  text(str: string) {
    const cleaned = cleanAzeriText(str);
    for (let i = 0; i < cleaned.length; i++) {
      const code = cleaned.charCodeAt(i);
      this.buffer.push(code < 128 ? code : 63);
    }
    return this;
  }

  line(str: string) {
    this.text(str);
    this.buffer.push(0x0A);
    return this;
  }

  newLine(count = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0A);
    }
    return this;
  }

  rasterQr(text: string, paperWidthDots = 384, moduleScale = 4) {
    try {
      const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
      const size = qr.modules.size;
      const margin = 1;
      const totalModules = size + margin * 2;
      const qrPixelWidth = totalModules * moduleScale;
      const qrPixelHeight = qrPixelWidth;

      // Full paper width in bytes (e.g. 384 dots = 48 bytes for 58mm; 576 dots = 72 bytes for 80mm)
      const bytesWidth = Math.ceil(paperWidthDots / 8);

      // Horizontal offset in dots to mathematically center the QR code on physical paper
      const leftMarginDots = Math.max(0, Math.floor((paperWidthDots - qrPixelWidth) / 2));

      const xL = bytesWidth % 256;
      const xH = Math.floor(bytesWidth / 256);
      const yL = qrPixelHeight % 256;
      const yH = Math.floor(qrPixelHeight / 256);

      // Explicitly set left alignment so the line starts exactly at dot 0
      this.align('left');
      this.buffer.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH);

      for (let y = 0; y < qrPixelHeight; y++) {
        const modY = Math.floor(y / moduleScale) - margin;
        for (let bx = 0; bx < bytesWidth; bx++) {
          let byteVal = 0;
          for (let bit = 0; bit < 8; bit++) {
            const dotX = bx * 8 + bit;
            const qrX = dotX - leftMarginDots;
            if (qrX >= 0 && qrX < qrPixelWidth) {
              const modX = Math.floor(qrX / moduleScale) - margin;
              if (modY >= 0 && modY < size && modX >= 0 && modX < size) {
                if (qr.modules.get(modY, modX)) {
                  byteVal |= (1 << (7 - bit));
                }
              }
            }
          }
          this.buffer.push(byteVal);
        }
      }
      this.newLine(1);
    } catch (e) {
      console.warn('ESC/POS raster QR failed:', e);
    }
    return this;
  }

  feedAndCut() {
    this.buffer.push(0x0A, 0x0A, 0x0A, 0x0A);
    this.buffer.push(0x1D, 0x56, 0x41, 0x00);
    return this;
  }

  kickDrawer() {
    this.buffer.push(0x1B, 0x70, 0x00, 0x19, 0xFA);
    return this;
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

const STORAGE_KEY = '@merkez_printer_config';
const SAVED_PRINTERS_KEY = '@merkez_saved_printers_list_v1';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  unit?: string;
  barcode?: string;
  discount?: number;
  isGift?: boolean;
  originalPrice?: number;
}

export interface SaleReceiptData {
  saleId: string;
  receiptNumber?: string;
  transactionId?: string;
  date: Date | string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount?: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  total: number;
  taxAmount?: number;
  paymentMethod: string;
  creditDetails?: {
    bank: string;
    months: number;
    monthlyPayment: number;
    markupPercent?: number;
    contractTotal: number;
  };
  depositDetails?: {
    advanceAmount: number;
    advanceRecipient?: string;
    remainingBalance: number;
  };
  splitDetails?: {
    cash: number;
    card: number;
    terminal: number;
    credit: number;
    creditBank?: string;
    creditMonths?: number;
    creditContract?: number;
    creditMonthlyPayment?: number;
  };
  birmarketDetails?: {
    category: 'Alətlər' | 'Aksesuarlar';
    grossAmount: number;
    pureProfit: number;
  };
  clientName?: string;
  clientPhone?: string;
  salesChannel?: string;
  cashierName?: string;
  warehouseName?: string;
  notes?: string;
  qrUrl?: string;
  paperWidth?: '57mm' | '58mm' | '80mm';
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Pure JS UTF-8 to Base64 encoder (works in Expo Go, Android, iOS without Buffer)
export function utf8ToBase64(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const utf8 = unescape(encodeURIComponent(str));
  let output = '';
  for (
    let block = 0, charCode, idx = 0, map = chars;
    utf8.charAt(idx | 0) || ((map = '='), idx % 1);
    output += map.charAt(63 & (block >> (8 - (idx % 1) * 8)))
  ) {
    charCode = utf8.charCodeAt((idx += 3 / 4));
    if (charCode > 0xff) {
      throw new Error("'utf8ToBase64' error: character out of Latin1 range");
    }
    block = (block << 8) | charCode;
  }
  return output;
}

// Text wrapping and monospace padding helpers
export function wrapText(text: string, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (word.length > maxWidth) {
      let remaining = word;
      if (currentLine) {
        const spaceLeft = maxWidth - currentLine.length - 1;
        if (spaceLeft >= 6) {
          currentLine += ' ' + remaining.slice(0, spaceLeft);
          remaining = remaining.slice(spaceLeft);
          lines.push(currentLine);
          currentLine = '';
        } else {
          lines.push(currentLine);
          currentLine = '';
        }
      }
      while (remaining.length > maxWidth) {
        lines.push(remaining.slice(0, maxWidth));
        remaining = remaining.slice(maxWidth);
      }
      currentLine = remaining;
    } else if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export function padCenter(text: string, width: number): string {
  if (text.length >= width) return text;
  const leftPad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(leftPad) + text;
}

function centerWrapped(builder: EscPosBuilder, text: string, width: number) {
  const cleaned = cleanAzeriText(text);
  const lines = wrapText(cleaned, width);
  if (lines.length === 0) return;
  for (const l of lines) {
    builder.line(padCenter(l, width));
  }
}

function padRow(left: string, right: string, width: number): string {
  const totalLen = left.length + right.length;
  if (totalLen >= width) {
    const available = width - right.length - 1;
    if (available > 3) {
      return left.slice(0, available) + ' ' + right;
    }
    return left + '\n' + ' '.repeat(Math.max(0, width - right.length)) + right;
  }
  return left + ' '.repeat(width - totalLen) + right;
}

export const receiptService = {
  async getConfig(): Promise<PrinterConfig> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const parsed = JSON.parse(json);
        // Migrate legacy placeholder name to official store name
        if (parsed.storeName === 'RAST MUSIC') {
          parsed.storeName = DEFAULT_PRINTER_CONFIG.storeName;
        }
        return { ...DEFAULT_PRINTER_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load printer config:', e);
    }
    return DEFAULT_PRINTER_CONFIG;
  },

  async saveConfig(config: PrinterConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save printer config:', e);
    }
  },

  /**
   * Retrieves all saved / connected printers list
   */
  async getSavedPrinters(): Promise<SavedPrinter[]> {
    try {
      const json = await AsyncStorage.getItem(SAVED_PRINTERS_KEY);
      if (json) {
        const list: SavedPrinter[] = JSON.parse(json);
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch (e) {
      console.warn('Failed to load saved printers list:', e);
    }

    // Default initial seed from current active config
    const currentCfg = await this.getConfig();
    const initialList: SavedPrinter[] = [
      {
        id: 'printer-primary-default',
        name: 'Əsas Kassa Printeri',
        connectionType: currentCfg.connectionType || 'direct_tcp',
        ipAddress: currentCfg.ipAddress || '192.168.1.200',
        port: Number(currentCfg.port) || 9100,
        paperWidth: currentCfg.paperWidth || '58mm',
        autoCut: currentCfg.autoCut !== false,
        openDrawer: !!currentCfg.openDrawer,
        isDefault: true,
      },
    ];

    try {
      await AsyncStorage.setItem(SAVED_PRINTERS_KEY, JSON.stringify(initialList));
    } catch (err) {}

    return initialList;
  },

  /**
   * Saves or updates a printer in the saved printers list
   */
  async savePrinter(printer: SavedPrinter): Promise<SavedPrinter[]> {
    const list = await this.getSavedPrinters();
    const existingIdx = list.findIndex((p) => p.id === printer.id);
    let updated: SavedPrinter[];

    if (existingIdx >= 0) {
      updated = [...list];
      updated[existingIdx] = { ...updated[existingIdx], ...printer };
    } else {
      updated = [...list, printer];
    }

    // If marked default or first printer, set default and sync with active config
    if (printer.isDefault || updated.length === 1) {
      updated = updated.map((p) => ({
        ...p,
        isDefault: p.id === printer.id,
      }));

      const currentCfg = await this.getConfig();
      await this.saveConfig({
        ...currentCfg,
        connectionType: printer.connectionType,
        ipAddress: printer.ipAddress,
        port: printer.port,
        paperWidth: printer.paperWidth,
        autoCut: printer.autoCut,
        openDrawer: printer.openDrawer,
      });
    }

    await AsyncStorage.setItem(SAVED_PRINTERS_KEY, JSON.stringify(updated));
    return updated;
  },

  /**
   * Sets a specific printer as default active printer
   */
  async setDefaultPrinter(id: string): Promise<SavedPrinter[]> {
    const list = await this.getSavedPrinters();
    const target = list.find((p) => p.id === id);
    if (!target) return list;

    const updated = list.map((p) => ({
      ...p,
      isDefault: p.id === id,
    }));

    await AsyncStorage.setItem(SAVED_PRINTERS_KEY, JSON.stringify(updated));

    const currentCfg = await this.getConfig();
    await this.saveConfig({
      ...currentCfg,
      connectionType: target.connectionType,
      ipAddress: target.ipAddress,
      port: target.port,
      paperWidth: target.paperWidth,
      autoCut: target.autoCut,
      openDrawer: target.openDrawer,
    });

    return updated;
  },

  /**
   * Deletes a printer by id
   */
  async deletePrinter(id: string): Promise<SavedPrinter[]> {
    const list = await this.getSavedPrinters();
    let updated = list.filter((p) => p.id !== id);

    if (updated.length > 0 && !updated.some((p) => p.isDefault)) {
      updated[0].isDefault = true;
      const currentCfg = await this.getConfig();
      await this.saveConfig({
        ...currentCfg,
        connectionType: updated[0].connectionType,
        ipAddress: updated[0].ipAddress,
        port: updated[0].port,
        paperWidth: updated[0].paperWidth,
        autoCut: updated[0].autoCut,
        openDrawer: updated[0].openDrawer,
      });
    }

    await AsyncStorage.setItem(SAVED_PRINTERS_KEY, JSON.stringify(updated));
    return updated;
  },

  /**
   * Updates online/offline status cache for a printer
   */
  async updatePrinterStatus(id: string, isOnline: boolean): Promise<SavedPrinter[]> {
    const list = await this.getSavedPrinters();
    const updated = list.map((p) =>
      p.id === id ? { ...p, lastOnline: isOnline, lastChecked: Date.now() } : p
    );
    await AsyncStorage.setItem(SAVED_PRINTERS_KEY, JSON.stringify(updated));
    return updated;
  },

  /**
   * Formats sale data into clean monospace printable receipt text (for pure ASCII/ESC-POS fallback)
   */
  formatReceiptText(data: SaleReceiptData, config: PrinterConfig): string {
    const width = config.paperWidth === '80mm' ? 48 : 32;
    const dividerDouble = '='.repeat(width);
    const dividerSingle = '-'.repeat(width);

    let d = data.date instanceof Date ? data.date : new Date(data.date);
    if (isNaN(d.getTime())) d = new Date();

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const dateFormatted = `${day}.${month}.${year} ${hours}:${minutes}`;

    let payTitle = 'Nağd';
    const lowerPay = (data.paymentMethod || '').toLowerCase();
    if (lowerPay.includes('split') || lowerPay.includes('qarışıq') || lowerPay.includes('bölünmüş')) payTitle = 'Qarışıq (Bölünmüş)';
    else if (lowerPay.includes('terminal')) payTitle = 'Terminal';
    else if (lowerPay.includes('card') || lowerPay.includes('kart') || lowerPay.includes('pos')) payTitle = 'Kart';
    else if (lowerPay.includes('transfer') || lowerPay.includes('köçürmə')) payTitle = 'Köçürmə';
    else if (lowerPay.includes('credit') || lowerPay.includes('kredit')) payTitle = 'Kredit';
    else if (lowerPay.includes('deposit') || lowerPay.includes('beh') || lowerPay.includes('avans')) payTitle = 'Beh (Avans)';

    const lines: string[] = [];

    // Header
    lines.push(dividerDouble);
    wrapText(config.storeName || 'RAST MUSİQİ ALƏTLƏRİ MAĞAZASI', width).forEach((l) =>
      lines.push(padCenter(l, width))
    );
    if (config.storeSubtitle) {
      wrapText(config.storeSubtitle, width).forEach((l) => lines.push(padCenter(l, width)));
    }
    if (config.storeAddress) {
      wrapText(config.storeAddress, width).forEach((l) => lines.push(padCenter(l, width)));
    }
    if (config.voen) {
      wrapText(`VÖEN: ${config.voen}`, width).forEach((l) => lines.push(padCenter(l, width)));
    }
    if (config.phone) {
      wrapText(`Tel: ${config.phone}`, width).forEach((l) => lines.push(padCenter(l, width)));
    }
    lines.push(dividerDouble);

    // Metadata
    const cleanId = String(data.receiptNumber || data.saleId).replace(/^SALE-/, '');
    lines.push(padRow(`SATIŞ ÇEKİ: #${cleanId}`, '', width));
    lines.push(padRow('Tarix:', dateFormatted, width));
    lines.push(padRow('Kassir:', data.cashierName || 'Kassir', width));
    if (data.clientName) {
      lines.push(padRow('Müştəri:', data.clientName, width));
    }
    if (data.clientPhone) {
      lines.push(padRow('Əlaqə:', data.clientPhone, width));
    }
    lines.push(dividerSingle);

    // Items list
    lines.push(padRow('MƏHSUL / SAYI x QİYMƏT', 'MƏBLƏĞ', width));
    lines.push(dividerSingle);

    data.items.forEach((item, idx) => {
      const isGift = Boolean(item.isGift);
      const prefix = `${idx + 1}. ${isGift ? '[HƏDİYYƏ] ' : ''}`;
      wrapText(`${prefix}${item.name}`, width).forEach((l) => lines.push(l));
      const priceVal = isGift ? 0 : Number(item.price);
      const totalVal = isGift ? 0 : Number(item.total);
      const qtyStr = `  ${item.quantity} ${item.unit || 'əd.'} x ${priceVal.toFixed(2)} ₼`;
      const totStr = `${totalVal.toFixed(2)} ₼`;
      lines.push(padRow(qtyStr, totStr, width));
      if (isGift) {
        lines.push(padCenter('*** MAĞAZADAN HƏDİYYƏ (0.00 AZN) ***', width));
      }
    });

    lines.push(dividerSingle);

    // Totals
    lines.push(padRow('CƏMİ:', `${Number(data.subtotal).toFixed(2)} ₼`, width));

    if (data.discountAmount && data.discountAmount > 0) {
      const discNote = data.discountType === 'percent' ? ` (-${data.discountValue}%)` : '';
      lines.push(padRow(`ENDİRİM${discNote}:`, `-${Number(data.discountAmount).toFixed(2)} ₼`, width));
    }

    lines.push(dividerDouble);
    lines.push(padRow('YEKUN MƏBLƏĞ:', `${Number(data.total).toFixed(2)} ₼`, width));
    lines.push(padRow('ÖDƏNİŞ ÜSULU:', payTitle, width));

    // Credit breakdown if applicable
    if (data.creditDetails) {
      lines.push(dividerSingle);
      lines.push(padCenter('KREDİT MƏLUMATLARI', width));
      lines.push(padRow('Bank:', data.creditDetails.bank, width));
      lines.push(padRow('Müddət:', `${data.creditDetails.months} ay`, width));
      lines.push(padRow('Aylıq ödəniş:', `${Number(data.creditDetails.monthlyPayment).toFixed(2)} ₼`, width));
      lines.push(padRow('Müqavilə cəmi:', `${Number(data.creditDetails.contractTotal).toFixed(2)} ₼`, width));
    }

    // Split payment breakdown if applicable
    if (data.splitDetails) {
      lines.push(dividerSingle);
      lines.push(padCenter('ÖDƏNİŞ BÖLGÜSÜ (QARIŞIQ)', width));
      if (data.splitDetails.cash > 0) {
        lines.push(padRow('Nağd:', `${Number(data.splitDetails.cash).toFixed(2)} ₼`, width));
      }
      if (data.splitDetails.card > 0) {
        lines.push(padRow('Kart:', `${Number(data.splitDetails.card).toFixed(2)} ₼`, width));
      }
      if (data.splitDetails.terminal > 0) {
        lines.push(padRow('Terminal:', `${Number(data.splitDetails.terminal).toFixed(2)} ₼`, width));
      }
      if (data.splitDetails.credit > 0) {
        lines.push(padRow('Kredit payı:', `${Number(data.splitDetails.credit).toFixed(2)} ₼`, width));
        if (data.splitDetails.creditBank) {
          lines.push(padRow('Bank:', data.splitDetails.creditBank, width));
        }
        if (data.splitDetails.creditMonths) {
          lines.push(padRow('Müddət:', `${data.splitDetails.creditMonths} ay`, width));
        }
        if (data.splitDetails.creditContract) {
          lines.push(padRow('Kredit müqaviləsi:', `${Number(data.splitDetails.creditContract).toFixed(2)} ₼`, width));
        }
      }
    }

    // Advance (Beh / Avans) breakdown if applicable
    if (data.depositDetails) {
      lines.push(dividerSingle);
      lines.push(padCenter('AVANS / BEH MƏLUMATLARI', width));
      lines.push(padRow('Ümumi məbləğ:', `${Number(data.total).toFixed(2)} ₼`, width));
      lines.push(padRow('Ödənilən avans:', `${Number(data.depositDetails.advanceAmount).toFixed(2)} ₼`, width));
      if (data.depositDetails.advanceRecipient) {
        lines.push(padRow('Avans alan:', data.depositDetails.advanceRecipient, width));
      }
      lines.push(padRow('Qalıq borc:', `${Number(data.depositDetails.remainingBalance).toFixed(2)} ₼`, width));
    }

    // Birmarket breakdown if applicable
    if (data.birmarketDetails) {
      lines.push(dividerSingle);
      lines.push(padCenter('BİRMARKET SATIŞI', width));
      lines.push(padRow('Kateqoriya:', data.birmarketDetails.category, width));
      lines.push(padRow('Saytda məbləğ:', `${Number(data.birmarketDetails.grossAmount).toFixed(2)} ₼`, width));
      lines.push(padRow('Xalis mənfəət:', `${Number(data.birmarketDetails.pureProfit).toFixed(2)} ₼`, width));
    }

    lines.push(dividerDouble);
    if (config.footerNote) {
      wrapText(config.footerNote, width).forEach((l) => lines.push(padCenter(l, width)));
    }
    lines.push(padCenter('*** MERKEZ POS SİSTEMİ ***', width));
    lines.push('\n\n\n'); // blank feed for cutter

    return lines.join('\n');
  },

  /**
   * Generates clean HTML matching the official Azerbaijani fiscal thermal receipt with QR code
   * Exactly matching the web version layout (thermalReceiptService.js)
   */
  async formatReceiptHtml(data: SaleReceiptData, config: PrinterConfig): Promise<string> {
    const is80mm = (data.paperWidth || config.paperWidth) === '80mm';
    const widthMm = is80mm ? '72mm' : '48mm';
    const pageSize = is80mm ? '80mm auto' : '58mm auto';
    const qrSvgSize = is80mm ? 135 : 105;

    // Date & Time matching fiscal layout: DD/MM/YYYY and HH:mm:ss
    let dateObj = data.date instanceof Date ? data.date : new Date(data.date);
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;

    // Clean receipt number and transaction ID
    let rawReceiptNum = data.receiptNumber || data.saleId || '';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawReceiptNum)) {
      rawReceiptNum = 'D' + rawReceiptNum.replace(/-/g, '').slice(0, 7).toUpperCase();
    } else if (rawReceiptNum.startsWith('SALE-')) {
      rawReceiptNum = rawReceiptNum.replace(/^SALE-/, 'D00');
    }
    const cleanReceiptNumber = String(rawReceiptNum).replace(/^[№#]\s*/, '') || Date.now().toString().slice(-4);
    const cleanTxId = String(data.transactionId || data.saleId || cleanReceiptNumber);

    // Target Electronic Verification QR Code URL
    let targetQrUrl = data.qrUrl;
    if (!targetQrUrl) {
      targetQrUrl = `https://rastmusic.az/receipt/${encodeURIComponent(cleanTxId)}?num=${encodeURIComponent(cleanReceiptNumber)}&sum=${Number(data.total).toFixed(2)}`;
    }

    // Generate QR Code: both inline SVG and crisp PNG data URL
    let qrSvgHtml = '';
    let qrDataUrl = '';
    try {
      qrSvgHtml = await QRCode.toString(targetQrUrl, {
        type: 'svg',
        margin: 1,
        width: qrSvgSize,
        errorCorrectionLevel: 'M',
      });
    } catch (e) {
      console.warn('QR SVG generation error:', e);
    }

    try {
      qrDataUrl = await QRCode.toDataURL(targetQrUrl, {
        margin: 1,
        width: qrSvgSize,
        errorCorrectionLevel: 'M',
      });
    } catch (e) {
      console.warn('QR DataURL generation error:', e);
    }

    // Payment method labels
    let paymentTitle = 'Nağd';
    let paidLabel = 'nağd';
    const lowerMethod = String(data.paymentMethod || '').toLowerCase();

    if (lowerMethod.includes('split') || lowerMethod.includes('qarışıq') || lowerMethod.includes('bölünmüş')) {
      paymentTitle = 'Qarışıq (Bölünmüş)';
      paidLabel = 'qarışıq';
    } else if (lowerMethod.includes('terminal')) {
      paymentTitle = 'Terminal';
      paidLabel = 'terminal';
    } else if (lowerMethod.includes('card') || lowerMethod.includes('kart') || lowerMethod.includes('pos')) {
      paymentTitle = 'Kart';
      paidLabel = 'kart';
    } else if (lowerMethod.includes('deposit') || lowerMethod.includes('beh') || lowerMethod.includes('avans')) {
      paymentTitle = 'Beh (Avans)';
      paidLabel = 'avans';
    } else if (lowerMethod.includes('credit') || lowerMethod.includes('kredit')) {
      const bankName = data.creditDetails?.bank || 'Bank';
      paymentTitle = `Kredit (${bankName})`;
      paidLabel = 'kredit';
    } else if (lowerMethod.includes('birmarket')) {
      paymentTitle = 'Birmarket';
      paidLabel = 'birmarket';
    } else if (lowerMethod.includes('debt') || lowerMethod.includes('nisyə') || lowerMethod.includes('borc')) {
      paymentTitle = 'Nisyə (Borc)';
      paidLabel = 'nisyə';
    }

    const storeTitle = config.storeName || 'RAST MUSİQİ ALƏTLƏRİ MAĞAZASI';
    const storeSub = config.storeSubtitle || 'Musiqi Alətlərinin Satışı və Təmiri';
    const tsName = config.tsName || 'MUSİQİ ALƏTLƏRİ SATIŞI VƏ TƏMİRİ';
    const tsAddress = config.tsAddress || config.storeAddress || 'AZ1142 BAKI ŞƏHƏRİ XƏTAİ RAYONU ev.18A m.92';
    const voName = config.voName || 'ŞƏKƏROV KAMRAN MUSA OĞLU';
    const voen = config.voen || '5501238362';
    const objectCode = config.objectCode || '5501238362-20001';
    const kassaNumber = config.kassaNumber || 'V1E0969392';
    const cashier = data.cashierName || 'Kassir';
    const filial = data.warehouseName || config.filialName || 'DÜKKAN - ƏHMƏDLİ';

    return `
      <!DOCTYPE html>
      <html lang="az">
      <head>
        <meta charset="utf-8">
        <title>Çek ${escapeHtml(cleanReceiptNumber)}</title>
        <style>
          @page {
            size: ${pageSize};
            margin: 0;
          }
          @media print {
            html, body {
              width: ${widthMm} !important;
              max-width: ${widthMm} !important;
              margin: 0 auto !important;
              padding: ${is80mm ? '2mm 2mm 10mm 2mm' : '1.5mm 1mm 10mm 1mm'} !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print { display: none !important; }
          }
          * {
            box-sizing: border-box;
            word-break: break-word;
          }
          body {
            font-family: Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif;
            width: ${widthMm};
            max-width: ${widthMm};
            margin: 0 auto;
            padding: ${is80mm ? '3mm 2mm 12mm 2mm' : '2.5mm 1mm 12mm 1mm'};
            color: #000;
            background: #fff;
            font-size: ${is80mm ? '11px' : '10px'};
            line-height: 1.25;
            -webkit-font-smoothing: antialiased;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .bold { font-weight: 700; }
          
          /* Store Top Header */
          .store-top-header {
            text-align: center;
            margin-bottom: 4px;
          }
          .store-main-title {
            font-size: ${is80mm ? '14px' : '12.5px'};
            font-weight: 900;
            letter-spacing: -0.2px;
            line-height: 1.2;
            text-transform: uppercase;
            margin-bottom: 1px;
          }
          .store-sub-title {
            font-size: ${is80mm ? '10px' : '9px'};
            font-weight: 600;
            color: #000;
          }

          .header-section {
            font-size: ${is80mm ? '10.5px' : '9.5px'};
            line-height: 1.25;
            text-align: left;
            margin-bottom: 4px;
          }
          .header-line {
            margin: 1px 0;
          }
          .title-block {
            text-align: center;
            margin: 4px 0 5px 0;
          }
          .receipt-title {
            font-size: ${is80mm ? '14px' : '12.5px'};
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .receipt-number {
            font-size: ${is80mm ? '12px' : '11px'};
            font-weight: 700;
            margin-bottom: 2px;
          }
          .receipt-datetime {
            font-size: ${is80mm ? '10.5px' : '9.5px'};
          }
          .store-block {
            margin: 4px 0;
            font-size: ${is80mm ? '10.5px' : '9.5px'};
            line-height: 1.25;
          }
          .store-name-title {
            font-size: ${is80mm ? '12px' : '11px'};
            font-weight: 700;
            margin-bottom: 2px;
          }
          .divider-stars {
            font-size: 9.5px;
            line-height: 1;
            letter-spacing: 0.5px;
            margin: 3px 0;
            white-space: nowrap;
            overflow: hidden;
            text-align: center;
            user-select: none;
          }
          .divider-dash {
            font-size: 9.5px;
            line-height: 1;
            letter-spacing: 0.5px;
            margin: 3px 0;
            white-space: nowrap;
            overflow: hidden;
            text-align: center;
            user-select: none;
          }
          .items-header {
            display: grid;
            grid-template-columns: ${is80mm ? '1fr 34px 54px 56px' : '1fr 26px 40px 42px'};
            column-gap: 2px;
            font-size: ${is80mm ? '10.5px' : '9.5px'};
            font-weight: 700;
            padding: 1px 0;
            line-height: 1.2;
          }
          .item-row {
            display: grid;
            grid-template-columns: ${is80mm ? '1fr 34px 54px 56px' : '1fr 26px 40px 42px'};
            column-gap: 2px;
            align-items: start;
            font-size: ${is80mm ? '10.5px' : '9.5px'};
            line-height: 1.25;
            margin: 2px 0;
          }
          .col-name {
            text-align: left;
            word-break: break-word;
          }
          .col-qty {
            text-align: right;
            white-space: nowrap;
          }
          .col-price {
            text-align: right;
            white-space: nowrap;
          }
          .col-total {
            text-align: right;
            white-space: nowrap;
            font-weight: 700;
          }
          .item-extra {
            font-size: 8.5px;
            color: #000;
            margin: 1px 0 2px 0;
            padding-left: 2px;
          }
          .flex-between {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            width: 100%;
          }
          .total-box {
            font-size: ${is80mm ? '14px' : '12.5px'};
            font-weight: 800;
            margin: 3px 0 1px 0;
          }
          .meta-line {
            font-size: ${is80mm ? '10.5px' : '9.5px'};
            line-height: 1.25;
            margin: 1.5px 0;
          }
          .payment-section {
            margin: 3px 0;
          }
          .credit-info {
            font-size: 9px;
            background: #fafafa;
            border-left: 2px solid #000;
            padding: 2px 4px;
            margin: 3px 0;
          }

          /* Fiscal QR Code Footer Section */
          .qr-fiscal-section {
            text-align: center;
            margin-top: 4px;
            padding-top: 2px;
          }
          .qr-title {
            font-size: ${is80mm ? '11px' : '10px'};
            letter-spacing: 0.5px;
            margin-bottom: 1px;
          }
          .qr-subtitle {
            font-size: 8.5px;
            margin-bottom: 5px;
            color: #000;
          }
          .qr-code-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 4px auto 5px auto;
          }
          .qr-code-wrapper svg, .qr-code-wrapper img {
            shape-rendering: crispEdges;
            display: block;
            margin: 0 auto;
          }
          .qr-id-line {
            font-size: 9px;
            margin-top: 2px;
            letter-spacing: 0.3px;
          }
          .qr-doc-line {
            font-size: 9px;
            margin-top: 1px;
          }
          .qr-thanks {
            font-size: ${is80mm ? '10.5px' : '9.5px'};
            margin-top: 5px;
            letter-spacing: 0.5px;
          }
          .qr-subthanks {
            font-size: 8.5px;
            margin-top: 1px;
          }
        </style>
      </head>
      <body>
        <!-- Top Store Brand Header -->
        <div class="store-top-header">
          <div class="store-main-title">${escapeHtml(storeTitle)}</div>
          <div class="store-sub-title">${escapeHtml(storeSub)}</div>
        </div>

        <div class="divider-dash">------------------------------------------------------------</div>

        <!-- Top Fiscal Merchant Header -->
        <div class="header-section">
          <div class="header-line">TS Adı: ${escapeHtml(tsName)}</div>
          <div class="header-line">TS Ünvanı: ${escapeHtml(tsAddress)}</div>
          <div class="header-line">VÖ Adı: ${escapeHtml(voName)}</div>
          <div class="header-line">VÖEN: ${escapeHtml(voen)}</div>
          <div class="header-line">Obyektin Kodu: ${escapeHtml(objectCode)}</div>
        </div>

        <!-- Document Title & Number -->
        <div class="title-block">
          <div class="receipt-title">SATIŞ ÇEKİ</div>
          <div class="receipt-number">Çek nömrəsi: ${escapeHtml(cleanReceiptNumber)}</div>
          <div class="receipt-datetime">Tarix: ${escapeHtml(dateStr)} &nbsp; Vaxt: ${escapeHtml(timeStr)}</div>
        </div>

        <!-- Store & Cashier Details -->
        <div class="store-block">
          <div class="store-name-title">${escapeHtml(storeTitle)}</div>
          ${filial ? `<div class="meta-line">Filial: ${escapeHtml(filial)}</div>` : ''}
          <div class="meta-line">Kassa nömrəsi: ${escapeHtml(kassaNumber)}</div>
          <div class="meta-line">Kassir: ${escapeHtml(cashier)}</div>
        </div>

        <div class="divider-stars">************************************************************</div>

        <!-- Items Header -->
        <div class="items-header">
          <span class="col-name">Malın Adı</span>
          <span class="col-qty">Miqdar</span>
          <span class="col-price">Qiymət</span>
          <span class="col-total">Toplam</span>
        </div>

        <!-- Items List -->
        ${data.items
          .map((item) => {
            const itemQty = Number(item.quantity) || 1;
            const isGift = Boolean(item.isGift);
            const itemPrice = isGift ? 0 : (Number(item.price) || 0);
            const itemTotal = isGift ? 0 : (Number(item.total) || itemQty * itemPrice);
            const itemUnit = item.unit ? `(${item.unit})` : '';
            const rawName = item.name || 'Məhsul';
            const itemDisplayName = `${isGift ? '[HƏDİYYƏ] ' : ''}${escapeHtml(rawName)}${itemUnit ? ` ${escapeHtml(itemUnit)}` : ''}`;
            const qtyFormatted = Number.isInteger(itemQty) ? itemQty.toFixed(1) : itemQty.toString();

            return `
              <div style="margin: 2px 0;">
                <div class="item-row">
                  <span class="col-name">${itemDisplayName}</span>
                  <span class="col-qty">${qtyFormatted}</span>
                  <span class="col-price">${isGift ? '0.00' : itemPrice.toFixed(2)}</span>
                  <span class="col-total">${isGift ? '0.00' : itemTotal.toFixed(2)}</span>
                </div>
                ${
                  isGift
                    ? `<div class="item-extra" style="font-weight: 700; color: #000;">*** MAĞAZADAN HƏDİYYƏ (0.00 AZN) ***</div>`
                    : item.discount && item.discount > 0
                    ? `<div class="item-extra">(Endirim: -${Number(item.discount).toFixed(2)})</div>`
                    : ''
                }
              </div>
            `;
          })
          .join('')}

        <div class="divider-dash">------------------------------------------------------------</div>

        <!-- Totals Block -->
        <div class="flex-between total-box">
          <span>YEKUN MƏBLƏĞ</span>
          <span>${Number(data.total).toFixed(2)}</span>
        </div>
        <div class="meta-line">Toplam vergi=${Number(data.taxAmount || 0).toFixed(2)}</div>
        ${
          data.discountAmount && data.discountAmount > 0
            ? `
          <div class="flex-between meta-line">
            <span>Ümumi endirim:</span>
            <span>-${Number(data.discountAmount).toFixed(2)}</span>
          </div>
        `
            : ''
        }

        <div class="divider-stars">************************************************************</div>

        <!-- Payment Section -->
        <div class="payment-section">
          <div class="bold meta-line">Ödəniş üsulu</div>
          <div class="flex-between meta-line">
            <span>${escapeHtml(paymentTitle)}</span>
            <span>${Number(data.total).toFixed(2)}</span>
          </div>
          <div class="flex-between meta-line">
            <span>Ödənilib ${escapeHtml(paidLabel)}</span>
            <span>${Number(data.total).toFixed(2)}</span>
          </div>
          <div class="flex-between meta-line">
            <span>Qalıq qaytarılıb nağd</span>
            <span>0.00</span>
          </div>

          ${
            data.creditDetails
              ? `
            <div class="credit-info">
              <div>Müddət: ${escapeHtml(data.creditDetails.months)} ay</div>
              <div>Aylıq ödəniş: ${Number(data.creditDetails.monthlyPayment || 0).toFixed(2)}</div>
              ${
                data.creditDetails.contractTotal
                  ? `<div>Müqavilə cəmi: ${Number(data.creditDetails.contractTotal).toFixed(2)}</div>`
                  : ''
              }
            </div>
          `
              : ''
          }

          ${
            data.depositDetails
              ? `
            <div class="credit-info" style="margin-top: 4px; padding: 3px 0; border-top: 1px dashed #000;">
              <div>Avans məbləği: ${Number(data.depositDetails.advanceAmount || 0).toFixed(2)} AZN</div>
              ${data.depositDetails.advanceRecipient ? `<div>Avans alan: ${escapeHtml(data.depositDetails.advanceRecipient)}</div>` : ''}
              <div>Qalıq borc: ${Number(data.depositDetails.remainingBalance || 0).toFixed(2)} AZN</div>
            </div>
          `
              : ''
          }

          ${
            data.birmarketDetails
              ? `
            <div class="credit-info" style="margin-top: 4px; padding: 3px 0; border-top: 1px dashed #000;">
              <div class="bold">BİRMARKET SATIŞI</div>
              <div>Kateqoriya: ${escapeHtml(data.birmarketDetails.category)}</div>
              <div>Saytda məbləğ: ${Number(data.birmarketDetails.grossAmount || 0).toFixed(2)} AZN</div>
              <div>Xalis mənfəət: ${Number(data.birmarketDetails.pureProfit || 0).toFixed(2)} AZN</div>
            </div>
          `
              : ''
          }
        </div>

        ${
          data.clientName
            ? `
          <div class="divider-stars">************************************************************</div>
          <div class="meta-line">Müştəri: <span class="bold">${escapeHtml(data.clientName)}</span></div>
          ${data.clientPhone ? `<div class="meta-line">Əlaqə: ${escapeHtml(data.clientPhone)}</div>` : ''}
        `
            : ''
        }

        ${
          data.notes
            ? `
          <div class="meta-line" style="font-size: 8.5px; margin-top: 2px;">Qeyd: ${escapeHtml(data.notes)}</div>
        `
            : ''
        }

        <div class="divider-stars">************************************************************</div>

        <!-- Fiscal QR Code & Verification Block -->
        <div class="qr-fiscal-section">
          <div class="qr-title bold">ELEKTRON ÇEK / YOXLAMA</div>
          <div class="qr-subtitle">Elektron versiya və yoxlama üçün skan edin</div>
          <div class="qr-code-wrapper">
            ${
              qrDataUrl
                ? `<img src="${qrDataUrl}" width="${qrSvgSize}" height="${qrSvgSize}" style="margin: 0 auto; display: block;" alt="QR" />`
                : qrSvgHtml
            }
          </div>
          <div class="qr-id-line">ID: <span class="bold">${escapeHtml(cleanTxId)}</span></div>
          <div class="qr-doc-line">Fiskal / Qeydiyyat №: ${escapeHtml(cleanReceiptNumber)}</div>
          <div class="qr-thanks bold">TİCARƏTİNİZ XEYİRLİ OLSUN!</div>
          <div class="qr-subthanks">${escapeHtml(config.footerNote || 'Bizi seçdiyiniz üçün təşəkkür edirik!')}</div>
        </div>

        <!-- Cutter Feed Space -->
        <div style="height: 12mm; line-height: 12mm;">&nbsp;</div>
      </body>
      </html>
    `;
  },

  /**
   * Generates binary ESC/POS byte array with raster QR code, headers, lines and cutter commands
   */
  formatReceiptEscPos(data: SaleReceiptData, config: PrinterConfig): Uint8Array {
    const is80mm = (data.paperWidth || config.paperWidth) === '80mm';
    const width = is80mm ? 48 : 32;
    const paperWidthDots = is80mm ? 576 : 384;
    const dividerDouble = '='.repeat(width);
    const dividerSingle = '-'.repeat(width);

    let d = data.date instanceof Date ? data.date : new Date(data.date);
    if (isNaN(d.getTime())) d = new Date();

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const dateFormatted = `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;

    let payTitle = 'Nagd';
    const lowerPay = (data.paymentMethod || '').toLowerCase();
    if (lowerPay.includes('terminal')) payTitle = 'Terminal';
    else if (lowerPay.includes('card') || lowerPay.includes('kart') || lowerPay.includes('pos')) payTitle = 'Kart';
    else if (lowerPay.includes('transfer') || lowerPay.includes('kocurme')) payTitle = 'Kocurme';
    else if (lowerPay.includes('credit') || lowerPay.includes('kredit')) payTitle = 'Kredit';
    else if (lowerPay.includes('deposit') || lowerPay.includes('beh') || lowerPay.includes('avans')) payTitle = 'Beh (Avans)';

    const builder = new EscPosBuilder();
    builder.init();

    if (config.openDrawer) {
      builder.kickDrawer();
    }

    // Top Header (Centered with spaces, keeping standard left alignment to prevent printer firmware offset bugs)
    builder.bold(true).doubleHeight(true);
    centerWrapped(builder, config.storeName || 'RAST MUSIQI ALETLERI MAGAZASI', width);
    builder.bold(false).doubleHeight(false);

    if (config.storeSubtitle) {
      centerWrapped(builder, config.storeSubtitle, width);
    }
    if (config.storeAddress) {
      centerWrapped(builder, config.storeAddress, width);
    }
    if (config.voen) {
      centerWrapped(builder, `VOEN: ${config.voen}`, width);
    }
    if (config.phone) {
      centerWrapped(builder, `Tel: ${config.phone}`, width);
    }

    builder.line(dividerDouble);

    // Metadata
    const cleanId = String(data.receiptNumber || data.saleId).replace(/^SALE-/, '');
    builder.line(padRow(`SATIS CEKI: #${cleanId}`, '', width));
    builder.line(padRow('Tarix:', dateFormatted, width));
    builder.line(padRow('Kassir:', cleanAzeriText(data.cashierName || 'Kassir'), width));
    if (data.warehouseName || config.filialName) {
      builder.line(padRow('Filial:', cleanAzeriText(data.warehouseName || config.filialName || ''), width));
    }
    if (data.clientName) {
      builder.line(padRow('Musteri:', cleanAzeriText(data.clientName), width));
    }
    if (data.clientPhone) {
      builder.line(padRow('Elaqe:', cleanAzeriText(data.clientPhone), width));
    }
    builder.line(dividerSingle);

    // Items table header
    builder.bold(true);
    builder.line(padRow('MEHSUL / SAY x QIYMET', 'MEBLEG', width));
    builder.bold(false);
    builder.line(dividerSingle);

    // Items (wrapped cleanly if name exceeds width)
    data.items.forEach((item, idx) => {
      const isGift = Boolean(item.isGift);
      const prefix = `${idx + 1}. ${isGift ? '[HEDIYYE] ' : ''}`;
      const fullName = cleanAzeriText(`${prefix}${item.name || 'Mehsul'}`);
      const nameLines = wrapText(fullName, width);
      nameLines.forEach((nl) => builder.line(nl));

      const priceVal = isGift ? 0 : Number(item.price);
      const totalVal = isGift ? 0 : Number(item.total);
      const qtyStr = `  ${item.quantity} ${cleanAzeriText(item.unit || 'ed.')} x ${priceVal.toFixed(2)} AZN`;
      const totStr = `${totalVal.toFixed(2)} AZN`;
      builder.line(padRow(qtyStr, totStr, width));
      if (isGift) {
        builder.line(padCenter('*** MAGAZADAN HEDIYYE (0.00 AZN) ***', width));
      }
    });

    builder.line(dividerSingle);

    // Totals
    builder.line(padRow('CEMI:', `${Number(data.subtotal).toFixed(2)} AZN`, width));

    if (data.discountAmount && data.discountAmount > 0) {
      const discNote = data.discountType === 'percent' ? ` (-${data.discountValue}%)` : '';
      builder.line(padRow(`ENDIRIM${discNote}:`, `-${Number(data.discountAmount).toFixed(2)} AZN`, width));
    }

    builder.line(dividerDouble);
    builder.bold(true).doubleHeight(true);
    builder.line(padRow('YEKUN:', `${Number(data.total).toFixed(2)} AZN`, width));
    builder.bold(false).doubleHeight(false);
    builder.line(padRow('ODENIS USULU:', payTitle, width));

    // Credit details
    if (data.creditDetails) {
      builder.line(dividerSingle);
      centerWrapped(builder, 'KREDIT MELUMATLARI', width);
      builder.line(padRow('Bank:', cleanAzeriText(data.creditDetails.bank), width));
      builder.line(padRow('Muddet:', `${data.creditDetails.months} ay`, width));
      builder.line(padRow('Ayliq odenis:', `${Number(data.creditDetails.monthlyPayment).toFixed(2)} AZN`, width));
      builder.line(padRow('Muqavile cemi:', `${Number(data.creditDetails.contractTotal).toFixed(2)} AZN`, width));
    }

    // Deposit details
    if (data.depositDetails) {
      builder.line(dividerSingle);
      centerWrapped(builder, 'AVANS / BEH MELUMATLARI', width);
      builder.line(padRow('Umumi mebleg:', `${Number(data.total).toFixed(2)} AZN`, width));
      builder.line(padRow('Odenilen avans:', `${Number(data.depositDetails.advanceAmount).toFixed(2)} AZN`, width));
      if (data.depositDetails.advanceRecipient) {
        builder.line(padRow('Avans alan:', cleanAzeriText(data.depositDetails.advanceRecipient), width));
      }
      builder.line(padRow('Qaliq borc:', `${Number(data.depositDetails.remainingBalance).toFixed(2)} AZN`, width));
    }

    // Birmarket details
    if (data.birmarketDetails) {
      builder.line(dividerSingle);
      centerWrapped(builder, 'BIRMARKET SATISI', width);
      builder.line(padRow('Kateqoriya:', cleanAzeriText(data.birmarketDetails.category), width));
      builder.line(padRow('Saytda mebleg:', `${Number(data.birmarketDetails.grossAmount).toFixed(2)} AZN`, width));
      builder.line(padRow('Xalis menfeet:', `${Number(data.birmarketDetails.pureProfit).toFixed(2)} AZN`, width));
    }

    builder.line(dividerDouble);

    // Fiscal QR Code & Verification (centered with exact dot offset in raster and wrapped text)
    const cleanReceiptNumber = data.receiptNumber || `CH-${cleanId}`;
    const cleanTxId = data.transactionId || data.saleId;
    const qrPayload =
      data.qrUrl ||
      `https://e-kassa.gov.az/check?doc=${encodeURIComponent(cleanReceiptNumber)}&sum=${Number(
        data.total
      ).toFixed(2)}&id=${encodeURIComponent(cleanTxId)}`;

    centerWrapped(builder, 'FISKAL / ELEKTRON CEK', width);
    builder.newLine(1);
    builder.rasterQr(qrPayload, paperWidthDots, is80mm ? 5 : 4);
    builder.newLine(1);
    centerWrapped(builder, `ID: ${cleanTxId}`, width);
    centerWrapped(builder, `Fiskal / Qeydiyyat: ${cleanReceiptNumber}`, width);
    builder.newLine(1);
    builder.bold(true);
    centerWrapped(builder, 'TICARETINIZ XEYIRLI OLSUN!', width);
    builder.bold(false);
    if (config.footerNote) {
      centerWrapped(builder, config.footerNote, width);
    }
    centerWrapped(builder, '*** MERKEZ POS SISTEMI ***', width);

    if (config.autoCut !== false) {
      builder.feedAndCut();
    } else {
      builder.newLine(4);
    }

    return builder.toUint8Array();
  },

  /**
   * Main print dispatcher:
   * 1. If connectionType is 'direct_tcp' (default): sends ESC/POS binary directly via TCP socket (port 9100)
   * 2. If DirectPrinter fails or connectionType is 'rawbt': falls back to RawBT Print Service
   */
  async printReceipt(data: SaleReceiptData, customConfig?: PrinterConfig): Promise<boolean> {
    const config = customConfig || (await this.getConfig());

    // 1. Direct TCP Socket (RawBT-free)
    if (config.connectionType !== 'rawbt' && DirectPrinter?.printRaw) {
      try {
        const bytes = this.formatReceiptEscPos(data, config);
        const b64 = uint8ToBase64(bytes);
        const port = Number(config.port) || 9100;
        await DirectPrinter.printRaw(config.ipAddress, port, b64, 4500);
        return true;
      } catch (err: any) {
        console.warn('Direct TCP print failed, offering fallback:', err);
        Alert.alert(
          '🖨️ Printer Xətası (LAN)',
          `Printerə qoşulmaq olmadı (${config.ipAddress}:${config.port || 9100}).\n\n1. Printerin yandırıldığını və şəbəkə kabelinin taxıldığını yoxlayın.\n2. Telefonun printerlə eyni Wi-Fi şəbəkəsində olduğunu yoxlayın.`,
          [
            { text: 'Bağla', style: 'cancel' },
            {
              text: 'RawBT ilə Çap Et',
              onPress: () => this.printViaRawbt(data, config),
            },
          ]
        );
        return false;
      }
    }

    // 2. Fallback to RawBT
    return this.printViaRawbt(data, config);
  },

  /**
   * Prints via RawBT print service app using standard URL scheme
   */
  async printViaRawbt(data: SaleReceiptData, config: PrinterConfig): Promise<boolean> {
    const receiptHtml = await this.formatReceiptHtml(data, config);
    const b64 = utf8ToBase64(receiptHtml);
    const rawbtUrl = `rawbt:data:text/html;base64,${b64}`;

    try {
      const supported = await Linking.canOpenURL(rawbtUrl);
      if (supported) {
        await Linking.openURL(rawbtUrl);
        return true;
      }
    } catch (e) {
      console.warn('Linking check error for rawbt:', e);
    }

    try {
      await Linking.openURL(rawbtUrl);
      return true;
    } catch (openErr) {
      console.warn('Direct rawbt open failed:', openErr);

      if (Platform.OS === 'android') {
        Alert.alert(
          '🖨️ RawBT Sürücüsü Tapılmadı',
          'Çeki RawBT ilə göndərmək üçün telefonunuza pulsuz "RawBT Print Service" lazımdır.\n\nİndi Google Play-dən quraşdırılsın?',
          [
            { text: 'Xeyr', style: 'cancel' },
            {
              text: 'Google Play-dən Endir',
              onPress: () => {
                Linking.openURL('market://details?id=ru.a402d.rawbtprinter').catch(() => {
                  Linking.openURL('https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter');
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Çap Məlumatı',
          'iOS cihazında birbaşa LAN çapı üçün AirPrint və ya Wi-Fi printer dəstəyi lazımdır.'
        );
      }
      return false;
    }
  },

  /**
   * Tests socket connection to printer IP:Port directly
   */
  async testConnection(customConfig?: PrinterConfig | SavedPrinter | { ipAddress?: string; port?: number }): Promise<boolean> {
    const config = customConfig || (await this.getConfig());
    if (!DirectPrinter?.testConnection) {
      throw new Error('DirectPrinter native modulu tapılmadı');
    }
    const ip = config.ipAddress || '192.168.1.200';
    const port = Number(config.port) || 9100;
    return await DirectPrinter.testConnection(ip, port, 3000);
  },

  /**
   * Triggers a self-test print ticket to verify the printer connection immediately
   */
  async printTest(customConfig?: PrinterConfig | SavedPrinter): Promise<boolean> {
    const activeCfg = await this.getConfig();
    let effectiveConfig: PrinterConfig = { ...activeCfg };

    if (customConfig) {
      effectiveConfig = {
        ...effectiveConfig,
        connectionType: customConfig.connectionType || effectiveConfig.connectionType,
        ipAddress: customConfig.ipAddress || effectiveConfig.ipAddress,
        port: Number(customConfig.port) || effectiveConfig.port,
        paperWidth: customConfig.paperWidth || effectiveConfig.paperWidth,
        autoCut: customConfig.autoCut !== undefined ? customConfig.autoCut : effectiveConfig.autoCut,
        openDrawer: customConfig.openDrawer !== undefined ? customConfig.openDrawer : effectiveConfig.openDrawer,
      };
    }

    const testData: SaleReceiptData = {
      saleId: 'd0079237-29f0-4e3b-a4dc-643ef0d3498f',
      receiptNumber: 'D0079237',
      transactionId: 'd0079237-29f0-4e3b-a4dc-643ef0d3498f',
      date: new Date(),
      warehouseName: effectiveConfig.filialName || 'DÜKKAN - ƏHMƏDLİ',
      cashierName: 'Kassir (Sınaq)',
      items: [
        { name: 'PEREXOD IN 2 TULPAN+ 1 AUX', quantity: 1, price: 2.0, total: 2.0, unit: 'əd' },
      ],
      subtotal: 2.0,
      total: 2.0,
      paymentMethod: 'Nağd',
      notes: 'POS Satış #SALE-852117 (Ödəniş: Nağd)',
    };
    return this.printReceipt(testData, effectiveConfig);
  },
};

