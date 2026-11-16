import { NativeModules, Linking, Alert, Platform } from 'react-native';
import { receiptService, PrinterConfig, EscPosBuilder, cleanAzeriText } from './receiptService';
import { generateCode128Svg } from '../utils/code128';

const { DirectPrinter } = NativeModules;

export interface LabelPrintItem {
  id: string;
  name: string;
  barcode: string;
  price: number;
  printQty: number;
}

export function sanitizeTsplString(str: string): string {
  if (!str) return '';
  return cleanAzeriText(str)
    .replace(/"/g, "''")
    .replace(/\\/g, '/')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

export function wrapText(text: string, maxCharsPerLine = 26): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === 2) break;
    }
  }
  if (currentLine && lines.length < 2) {
    lines.push(currentLine);
  }

  if (lines.length === 0 && text.length > 0) {
    lines.push(text.slice(0, maxCharsPerLine));
    if (text.length > maxCharsPerLine) {
      lines.push(text.slice(maxCharsPerLine, maxCharsPerLine * 2));
    }
  }

  return lines;
}

export function stringToAsciiBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes[i] = code <= 255 ? code : 63;
  }
  return bytes;
}

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

function utf8ToBase64(str: string): string {
  const utf8 = unescape(encodeURIComponent(str));
  let output = '';
  for (let i = 0; i < utf8.length; i++) {
    output += String.fromCharCode(utf8.charCodeAt(i));
  }
  return uint8ToBase64(stringToAsciiBytes(output));
}

export const labelPrintService = {
  /**
   * Generates TSPL2 byte array for Xprinter (XP-350B, XP-365B, XP-420B, etc.) and TSC label printers
   */
  formatLabelsTspl(items: LabelPrintItem[], config: PrinterConfig): Uint8Array {
    const widthMm = config.labelWidthMm || 58;
    const heightMm = config.labelHeightMm || 40;
    const gapMm = config.labelGapMm || 2;
    const storeName = sanitizeTsplString(config.storeName || 'MERKEZ MUSIQI').toUpperCase();

    const widthDots = Math.round(widthMm * 8); // 464 for 58mm
    const heightDots = Math.round(heightMm * 8); // 320 for 40mm

    const commands: string[] = [];
    const CRLF = '\r\n';

    // 1. Hardware Initialization for TSPL
    commands.push(`SIZE ${widthMm} mm, ${heightMm} mm`);
    commands.push(`GAP ${gapMm} mm, 0 mm`);
    commands.push('DIRECTION 1');
    commands.push('REFERENCE 0,0');
    commands.push('OFFSET 0 mm');
    commands.push('SET PEEL OFF');
    commands.push('SET CUTTER OFF');
    commands.push('SET TEAR ON');
    commands.push('CODEPAGE 1252');

    // 2. Iterate each label item
    items.forEach((item) => {
      const qty = Math.max(1, item.printQty || 1);
      const barcodeRaw = (item.barcode || item.id?.replace(/-/g, '').slice(0, 10) || '0000000000').trim();
      const barcodeStr = sanitizeTsplString(barcodeRaw);
      const priceNum = Number(item.price || 0);
      const priceStr = `${priceNum.toFixed(2)} AZN`;
      const cleanTitle = sanitizeTsplString(item.name || 'Mehsul');

      // Clear image buffer before drawing
      commands.push('CLS');

      // --- Product Title ---
      // Maximum characters per line based on width: approx (widthDots - 32) / 16
      const maxChars = Math.max(16, Math.floor((widthDots - 32) / 16));
      const titleLines = wrapText(cleanTitle, maxChars);

      if (titleLines.length === 1) {
        const line = titleLines[0];
        const textWidth = line.length * 16;
        const x = Math.max(16, Math.floor((widthDots - textWidth) / 2));
        const y = 20;
        commands.push(`TEXT ${x},${y},"3",0,1,1,"${line}"`);
      } else if (titleLines.length >= 2) {
        const line1 = titleLines[0];
        const line2 = titleLines[1];
        const x1 = Math.max(16, Math.floor((widthDots - line1.length * 16) / 2));
        const x2 = Math.max(16, Math.floor((widthDots - line2.length * 16) / 2));
        commands.push(`TEXT ${x1},12,"3",0,1,1,"${line1}"`);
        commands.push(`TEXT ${x2},38,"3",0,1,1,"${line2}"`);
      }

      // --- Linear Barcode (Code 128) ---
      // Module width (narrow): 2 dots for standard length <= 13 chars, 1 dot for longer
      const isLong = barcodeStr.length > 13;
      const narrow = isLong ? 1 : 2;
      const wide = narrow;
      const estimatedBarcodeWidth = (barcodeStr.length + 2) * 11 * narrow;
      const barcodeX = Math.max(16, Math.floor((widthDots - estimatedBarcodeWidth) / 2));
      const barcodeY = titleLines.length > 1 ? 72 : 62;
      const barcodeHeight = 52;

      // TSPL: BARCODE x,y,"128",height,human_readable,rotation,narrow,wide,"content"
      // human_readable = 2 (centered text below barcode)
      commands.push(`BARCODE ${barcodeX},${barcodeY},"128",${barcodeHeight},2,0,${narrow},${wide},"${barcodeStr}"`);

      // --- Divider Line ---
      const dividerY = barcodeY + barcodeHeight + 28;
      if (dividerY + 50 <= heightDots) {
        commands.push(`BAR 20,${dividerY},${widthDots - 40},2`);
      }

      // --- Price ---
      // Font "4" (24x32 dots)
      const priceTextWidth = priceStr.length * 24;
      const priceX = Math.max(16, Math.floor((widthDots - priceTextWidth) / 2));
      const priceY = dividerY + 10;
      commands.push(`TEXT ${priceX},${priceY},"4",0,1,1,"${priceStr}"`);

      // --- Store Footer ---
      if (storeName && priceY + 40 <= heightDots - 12) {
        const footerText = storeName.slice(0, 32);
        const footerWidth = footerText.length * 12; // Font "2" is 12x20
        const footerX = Math.max(16, Math.floor((widthDots - footerWidth) / 2));
        const footerY = priceY + 38;
        if (footerY + 16 <= heightDots) {
          commands.push(`TEXT ${footerX},${footerY},"2",0,1,1,"${footerText}"`);
        }
      }

      // --- Print Command ---
      // TSPL prints 'qty' copies of this label
      commands.push(`PRINT ${qty},1`);
    });

    const fullScript = commands.join(CRLF) + CRLF;
    return stringToAsciiBytes(fullScript);
  },

  /**
   * Generates ESC/POS byte array for thermal label printers (Direct TCP)
   */
  formatLabelsEscPos(items: LabelPrintItem[], config: PrinterConfig): Uint8Array {
    const builder = new EscPosBuilder();
    builder.init();

    // Iterate through items, respecting printQty
    items.forEach((item) => {
      const qty = Math.max(1, item.printQty || 1);
      const barcodeStr = (item.barcode || item.id.replace(/-/g, '').slice(0, 10)).trim();
      const priceStr = `${Number(item.price || 0).toFixed(2)} AZN`;
      const nameStr = cleanAzeriText(item.name || 'Mehsul');

      for (let q = 0; q < qty; q++) {
        builder.align('center');

        // 1. Product Title
        builder.bold(true);
        builder.line(nameStr.slice(0, 30));
        builder.bold(false);

        // 2. Barcode (Hardware ESC/POS Code128)
        const barcodeBytes: number[] = [];
        for (let i = 0; i < barcodeStr.length; i++) {
          barcodeBytes.push(barcodeStr.charCodeAt(i));
        }

        const bData: number[] = [
          0x1D, 0x68, 55,         // GS h (barcode height)
          0x1D, 0x77, 2,          // GS w (barcode width module)
          0x1D, 0x48, 2,          // GS H (HRI text below barcode)
          0x1D, 0x66, 0,          // GS f (Font A)
          0x1D, 0x6B, 73, barcodeBytes.length + 2, 0x7B, 0x42, ...barcodeBytes, // Code 128 Set B
          0x0A,
        ];

        bData.forEach((byte) => (builder as any).buffer.push(byte));

        // 3. Price
        builder.align('center');
        builder.bold(true);
        builder.doubleSize(true);
        builder.line(priceStr);
        builder.doubleSize(false);
        builder.bold(false);

        // Gap spacing between thermal labels
        builder.newLine(3);
      }
    });

    return builder.toUint8Array();
  },

  /**
   * Generates HTML layout for label stickers (for RawBT app and visual preview)
   */
  formatLabelsHtml(items: LabelPrintItem[]): string {
    const stickerBlocks: string[] = [];

    items.forEach((item) => {
      const qty = Math.max(1, item.printQty || 1);
      const barcodeStr = (item.barcode || item.id.replace(/-/g, '').slice(0, 10)).trim();
      const priceStr = `${Number(item.price || 0).toFixed(2)} ₼`;
      const svgBarcode = generateCode128Svg(barcodeStr, 40, 1.4);

      for (let q = 0; q < qty; q++) {
        stickerBlocks.push(`
          <div class="sticker-page">
            <div class="sticker-layout">
              <div class="sticker-title">${item.name}</div>
              <div class="sticker-barcode-wrapper">
                ${svgBarcode}
                <div class="sticker-barcode-text">${barcodeStr}</div>
              </div>
              <div class="sticker-price">${priceStr}</div>
            </div>
          </div>
        `);
      }
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #fff;
            color: #000;
          }
          .sticker-page {
            width: 58mm;
            height: 40mm;
            padding: 2mm 3mm;
            page-break-after: always;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .sticker-layout {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            text-align: center;
          }
          .sticker-title {
            font-size: 11px;
            font-weight: 800;
            line-height: 1.2;
            max-height: 28px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          .sticker-barcode-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin: 2px 0;
          }
          .sticker-barcode-text {
            font-family: monospace;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 2px;
            margin-top: 1px;
          }
          .sticker-price {
            font-size: 16px;
            font-weight: 900;
          }
          @media print {
            @page {
              size: 58mm 40mm;
              margin: 0;
            }
            .sticker-page {
              width: 58mm;
              height: 40mm;
            }
          }
        </style>
      </head>
      <body>
        ${stickerBlocks.join('')}
      </body>
      </html>
    `;
  },

  /**
   * Main print dispatcher for labels
   */
  async printLabels(items: LabelPrintItem[], customConfig?: PrinterConfig): Promise<boolean> {
    const config = customConfig || (await receiptService.getConfig());
    const validItems = items.filter((i) => (i.printQty || 0) > 0);

    if (validItems.length === 0) {
      Alert.alert('Xəbərdarlıq', 'Çap üçün ən azı 1 etiket seçilməlidir');
      return false;
    }

    // Direct TCP Print
    if (config.connectionType !== 'rawbt' && DirectPrinter?.printRaw) {
      try {
        const useTspl = config.labelProtocol !== 'escpos';
        const bytes = useTspl
          ? this.formatLabelsTspl(validItems, config)
          : this.formatLabelsEscPos(validItems, config);

        const b64 = uint8ToBase64(bytes);
        const port = Number(config.port) || 9100;
        await DirectPrinter.printRaw(config.ipAddress, port, b64, 5000);
        return true;
      } catch (err: any) {
        console.warn('Direct TCP label print failed, offering fallback:', err);
        return await new Promise<boolean>((resolve) => {
          Alert.alert(
            '🖨️ Printerə Qoşulma Xətası (LAN)',
            `Printerə qoşulmaq olmadı (${config.ipAddress}:${config.port || 9100}).\n\nRawBT vasitəsilə çap edilsin?`,
            [
              { text: 'Ləğv et', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'RawBT ilə Çap',
                onPress: async () => {
                  const res = await this.printViaRawbt(validItems);
                  resolve(res);
                },
              },
            ]
          );
        });
      }
    }

    // Fallback or explicit RawBT
    return this.printViaRawbt(validItems);
  },

  /**
   * Prints a single test label in TSPL (Xprinter XP-350B) to verify setup
   */
  async printTestLabel(customConfig?: PrinterConfig): Promise<boolean> {
    const config = customConfig || (await receiptService.getConfig());
    const testItems: LabelPrintItem[] = [
      {
        id: 'test-item-01',
        name: 'TEST ETIKETI · XP-350B',
        barcode: '123456789012',
        price: 99.00,
        printQty: 1,
      },
    ];

    if (config.connectionType !== 'rawbt' && DirectPrinter?.printRaw) {
      const useTspl = config.labelProtocol !== 'escpos';
      const bytes = useTspl
        ? this.formatLabelsTspl(testItems, config)
        : this.formatLabelsEscPos(testItems, config);

      const b64 = uint8ToBase64(bytes);
      const port = Number(config.port) || 9100;
      await DirectPrinter.printRaw(config.ipAddress, port, b64, 5000);
      return true;
    } else {
      return this.printViaRawbt(testItems);
    }
  },

  /**
   * Prints via RawBT print service app on Android
   */
  async printViaRawbt(items: LabelPrintItem[]): Promise<boolean> {
    const html = this.formatLabelsHtml(items);
    const b64 = utf8ToBase64(html);
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
      if (Platform.OS === 'android') {
        Alert.alert(
          '🖨️ RawBT Sürücüsü Tapılmadı',
          'Etiketləri çap etmək üçün telefonunuza pulsuz "RawBT Print Service" lazımdır.\n\nİndi Google Play-dən quraşdırılsın?',
          [
            { text: 'Xeyr', style: 'cancel' },
            {
              text: 'Bəli, Quraşdır',
              onPress: () => {
                Linking.openURL('https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter').catch(() => {});
              },
            },
          ]
        );
      } else {
        Alert.alert('Məlumat', 'iOS cihazında birbaşa LAN çapı üçün Wi-Fi printer dəstəyi lazımdır.');
      }
      return false;
    }
  },
};
