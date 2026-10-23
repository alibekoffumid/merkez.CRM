import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Alert, Platform } from 'react-native';

export interface PrinterConfig {
  ipAddress: string;
  port: number;
  paperWidth: '58mm' | '80mm';
  autoPrint: boolean;
  storeName: string;
  storeAddress: string;
  voen: string;
  phone: string;
  footerNote: string;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  ipAddress: '192.168.1.200',
  port: 9100,
  paperWidth: '58mm',
  autoPrint: true,
  storeName: 'RAST MUSIC',
  storeAddress: 'Bakı ş., Xətai r., ev 18A m.92',
  voen: '5501238362',
  phone: '+994 50 123 45 67',
  footerNote: 'Bizi seçdiyiniz üçün təşəkkür edirik!',
};

const STORAGE_KEY = '@merkez_printer_config';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  unit?: string;
}

export interface SaleReceiptData {
  saleId: string;
  date: Date | string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount?: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  total: number;
  paymentMethod: string;
  creditDetails?: {
    bank: string;
    months: number;
    monthlyPayment: number;
    markupPercent?: number;
    contractTotal: number;
  };
  clientName?: string;
  clientPhone?: string;
  cashierName?: string;
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

// String padding helpers
function padCenter(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const leftPad = Math.floor((width - text.length) / 2);
  const rightPad = width - text.length - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
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
        return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(json) };
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
   * Formats sale data into clean, monospace printable receipt text (ESC/POS compatible)
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
    if (lowerPay.includes('card') || lowerPay.includes('kart')) payTitle = 'Kartla';
    else if (lowerPay.includes('transfer') || lowerPay.includes('köçürmə')) payTitle = 'Köçürmə';
    else if (lowerPay.includes('credit') || lowerPay.includes('kredit')) payTitle = 'Kreditlə';

    const lines: string[] = [];

    // Header
    lines.push(dividerDouble);
    lines.push(padCenter(config.storeName || 'RAST MUSIC', width));
    if (config.storeAddress) {
      lines.push(padCenter(config.storeAddress, width));
    }
    if (config.voen) {
      lines.push(padCenter(`VÖEN: ${config.voen}`, width));
    }
    if (config.phone) {
      lines.push(padCenter(`Tel: ${config.phone}`, width));
    }
    lines.push(dividerDouble);

    // Metadata
    const cleanId = String(data.saleId).replace(/^SALE-/, '');
    lines.push(padRow(`SATIŞ ÇEKİ: #${cleanId}`, '', width));
    lines.push(padRow('Tarix:', dateFormatted, width));
    lines.push(padRow('Kassir:', data.cashierName || 'Default Clerk', width));
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
      lines.push(`${idx + 1}. ${item.name}`);
      const qtyStr = `  ${item.quantity} ${item.unit || 'əd.'} x ${Number(item.price).toFixed(2)} ₼`;
      const totStr = `${Number(item.total).toFixed(2)} ₼`;
      lines.push(padRow(qtyStr, totStr, width));
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

    lines.push(dividerDouble);
    if (config.footerNote) {
      lines.push(padCenter(config.footerNote, width));
    }
    lines.push(padCenter('*** MERKEZ POS SİSTEMİ ***', width));
    lines.push('\n\n\n'); // blank feed for cutter

    return lines.join('\n');
  },

  /**
   * Generates clean HTML matching the official fiscal thermal receipt (for webview or system print)
   */
  formatReceiptHtml(data: SaleReceiptData, config: PrinterConfig): string {
    const widthMm = config.paperWidth === '80mm' ? '72mm' : '48mm';
    const paperWidth = config.paperWidth === '80mm' ? '80mm auto' : '58mm auto';

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
    if (lowerPay.includes('card') || lowerPay.includes('kart')) payTitle = 'Kart';
    else if (lowerPay.includes('transfer') || lowerPay.includes('köçürmə')) payTitle = 'Köçürmə';
    else if (lowerPay.includes('credit') || lowerPay.includes('kredit')) payTitle = 'Kredit';

    const itemsHtml = data.items
      .map(
        (i, idx) => `
        <div style="margin-bottom: 4px; font-size: 11px;">
          <div style="font-weight: 600;">${idx + 1}. ${i.name}</div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #333;">
            <span>${i.quantity} ${i.unit || 'əd.'} × ${Number(i.price).toFixed(2)} ₼</span>
            <span style="font-weight: 600;">${Number(i.total).toFixed(2)} ₼</span>
          </div>
        </div>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Çek #${data.saleId}</title>
        <style>
          @page { size: ${paperWidth}; margin: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
            width: ${widthMm};
            margin: 0 auto;
            padding: 8px 6px;
            font-size: 11px;
            color: #000;
            background: #fff;
            line-height: 1.25;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-bottom: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 13px;">${config.storeName || 'RAST MUSIC'}</div>
        ${config.storeAddress ? `<div class="center" style="font-size: 10px;">${config.storeAddress}</div>` : ''}
        ${config.voen ? `<div class="center" style="font-size: 10px;">VÖEN: ${config.voen}</div>` : ''}
        ${config.phone ? `<div class="center" style="font-size: 10px;">Tel: ${config.phone}</div>` : ''}
        
        <div class="double-divider"></div>
        <div class="row"><span class="bold">SATIŞ ÇEKİ:</span> <span class="bold">#${data.saleId}</span></div>
        <div class="row"><span>Tarix:</span> <span>${dateFormatted}</span></div>
        <div class="row"><span>Kassir:</span> <span>${data.cashierName || 'Default Clerk'}</span></div>
        ${data.clientName ? `<div class="row"><span>Müştəri:</span> <span>${data.clientName}</span></div>` : ''}
        
        <div class="divider"></div>
        ${itemsHtml}
        
        <div class="divider"></div>
        <div class="row"><span>CƏMİ:</span> <span>${Number(data.subtotal).toFixed(2)} ₼</span></div>
        ${
          data.discountAmount && data.discountAmount > 0
            ? `<div class="row" style="color: #059669;"><span>ENDİRİM:</span> <span>-${Number(data.discountAmount).toFixed(2)} ₼</span></div>`
            : ''
        }
        <div class="double-divider"></div>
        <div class="row bold" style="font-size: 13px;"><span>YEKUN:</span> <span>${Number(data.total).toFixed(2)} ₼</span></div>
        <div class="row"><span>ÖDƏNİŞ:</span> <span class="bold">${payTitle}</span></div>

        ${
          data.creditDetails
            ? `
          <div class="divider"></div>
          <div class="center bold" style="font-size: 10px;">KREDİT ŞƏRTLƏRİ</div>
          <div class="row"><span>Bank:</span> <span>${data.creditDetails.bank}</span></div>
          <div class="row"><span>Müddət:</span> <span>${data.creditDetails.months} ay</span></div>
          <div class="row"><span>Aylıq:</span> <span>${Number(data.creditDetails.monthlyPayment).toFixed(2)} ₼</span></div>
          <div class="row bold"><span>Müqavilə cəmi:</span> <span>${Number(data.creditDetails.contractTotal).toFixed(2)} ₼</span></div>
        `
            : ''
        }

        <div class="double-divider"></div>
        <div class="center" style="font-size: 10px; margin-top: 6px;">${config.footerNote}</div>
      </body>
      </html>
    `;
  },

  /**
   * Main print dispatcher:
   * 1. Generates receipt text
   * 2. Encodes to base64
   * 3. Sends to RawBT directly via URL scheme
   * 4. If RawBT is not installed on Android, prompts to install from Play Store
   */
  async printReceipt(data: SaleReceiptData, customConfig?: PrinterConfig): Promise<boolean> {
    const config = customConfig || (await this.getConfig());
    const receiptText = this.formatReceiptText(data, config);
    const b64 = utf8ToBase64(receiptText);
    const rawbtUrl = `rawbt:data:text/plain;base64,${b64}`;

    try {
      const supported = await Linking.canOpenURL(rawbtUrl);
      if (supported) {
        await Linking.openURL(rawbtUrl);
        return true;
      }
    } catch (e) {
      console.warn('Linking check error for rawbt:', e);
    }

    // Try opening anyway (on some Android versions canOpenURL returns false without manifest queries)
    try {
      await Linking.openURL(rawbtUrl);
      return true;
    } catch (openErr) {
      console.warn('Direct rawbt open failed:', openErr);

      if (Platform.OS === 'android') {
        Alert.alert(
          '🖨️ RawBT Sürücüsü Tapılmadı',
          'Çeki LAN printerə birbaşa göndərmək üçün telefonunuza pulsuz "RawBT Print Service" tətbiqi lazımdır.\n\nİndi Google Play-dən quraşdırılsın?',
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
   * Triggers a self-test print ticket to verify the printer connection immediately
   */
  async printTest(customConfig?: PrinterConfig): Promise<boolean> {
    const config = customConfig || (await this.getConfig());
    const testData: SaleReceiptData = {
      saleId: 'TEST-001',
      date: new Date(),
      items: [
        { name: 'Sınaq məhsulu (Test Item)', quantity: 1, price: 10.0, total: 10.0, unit: 'əd.' },
        { name: 'Merkez CRM Mobil Sınaq', quantity: 2, price: 5.0, total: 10.0, unit: 'əd.' },
      ],
      subtotal: 20.0,
      total: 20.0,
      paymentMethod: 'Nağd',
      cashierName: 'Admin (Sınaq)',
    };
    return this.printReceipt(testData, config);
  },
};
