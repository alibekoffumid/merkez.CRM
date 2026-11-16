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

export function wrapText(text: string, maxCharsPerLine = 34): string[] {
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
   * Generates TSPL2 byte array for Xprinter (XP-350B, XP-365B, XP-420B, etc.) and TSC label printers.
   * Matches the exact layout, font sizing and geometry of the web version (40x20mm standard).
   */
  formatLabelsTspl(items: LabelPrintItem[], config: PrinterConfig): Uint8Array {
    const widthMm = config.labelWidthMm || 40;
    const heightMm = config.labelHeightMm || 20;
    const gapMm = config.labelGapMm || 2;

    const widthDots = Math.round(widthMm * 8); // 320 dots for 40mm, 464 for 58mm
    const heightDots = Math.round(heightMm * 8); // 160 dots for 20mm, 320 for 40mm

    const isCompact = heightMm <= 25; // 40x20mm standard sticker
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

      // Clear image buffer before drawing each label
      commands.push('CLS');

      if (isCompact) {
        // --- 40x20mm Layout (Identical to Web Version: Title -> Barcode -> Price) ---

        // 1. Product Title
        // Font "1" is 8x12 dots (matches web 8px font). Fits ~36 chars per line in 320 dots.
        // If short title (<= 20 chars), Font "2" (12x20 dots) fits on 1 line.
        let useFont = '1';
        let fontCharWidth = 8;
        let titleLines: string[] = [];

        if (cleanTitle.length <= 19) {
          useFont = '2';
          fontCharWidth = 12;
          titleLines = [cleanTitle];
        } else {
          useFont = '1';
          fontCharWidth = 8;
          titleLines = wrapText(cleanTitle, 19);
        }

        let barcodeY = 24;

        if (titleLines.length === 1) {
          const line = titleLines[0];
          const textWidth = line.length * fontCharWidth;
          const x = Math.max(8, Math.floor((widthDots - textWidth) / 2));
          const y = useFont === '2' ? 4 : 5;
          commands.push(`TEXT ${x},${y},"${useFont}",0,1,1,"${line}"`);
          barcodeY = useFont === '2' ? 28 : 22;
        } else {
          const line1 = titleLines[0];
          const line2 = titleLines[1];
          const x1 = Math.max(8, Math.floor((widthDots - line1.length * fontCharWidth) / 2));
          const x2 = Math.max(8, Math.floor((widthDots - line2.length * fontCharWidth) / 2));
          commands.push(`TEXT ${x1},3,"${useFont}",0,1,1,"${line1}"`);
          commands.push(`TEXT ${x2},16,"${useFont}",0,1,1,"${line2}"`);
          barcodeY = 30;
        }

        // 2. Barcode (Code 128)
        // narrow=1 module width (0.125mm). 13-digit code is ~165 dots wide, centered in 320 dots.
        const narrow = 1;
        const wide = 1;
        const estimatedBarcodeWidth = (barcodeStr.length + 2) * 11 * narrow;
        const barcodeX = Math.max(8, Math.floor((widthDots - estimatedBarcodeWidth) / 2));
        const barcodeHeight = 44; // bars height

        // human_readable = 2 places numbers centered under the bars
        commands.push(`BARCODE ${barcodeX},${barcodeY},"128",${barcodeHeight},2,0,${narrow},${wide},"${barcodeStr}"`);

        // 3. Price
        // Font "3" (16x24 dots bold) matches web 11.5px bold font
        const priceTextWidth = priceStr.length * 16;
        const priceX = Math.max(8, Math.floor((widthDots - priceTextWidth) / 2));
        const priceY = barcodeY + barcodeHeight + 20; // around y = 88-94
        commands.push(`TEXT ${priceX},${priceY},"3",0,1,1,"${priceStr}"`);

      } else {
        // --- 58x40mm Layout ---
        const maxChars = Math.max(16, Math.floor((widthDots - 32) / 16));
        const titleLines = wrapText(cleanTitle, maxChars);

        if (titleLines.length === 1) {
          const line = titleLines[0];
          const textWidth = line.length * 16;
          const x = Math.max(16, Math.floor((widthDots - textWidth) / 2));
          commands.push(`TEXT ${x},20,"3",0,1,1,"${line}"`);
        } else if (titleLines.length >= 2) {
          const line1 = titleLines[0];
          const line2 = titleLines[1];
          const x1 = Math.max(16, Math.floor((widthDots - line1.length * 16) / 2));
          const x2 = Math.max(16, Math.floor((widthDots - line2.length * 16) / 2));
          commands.push(`TEXT ${x1},12,"3",0,1,1,"${line1}"`);
          commands.push(`TEXT ${x2},38,"3",0,1,1,"${line2}"`);
        }

        const isLong = barcodeStr.length > 13;
        const narrow = isLong ? 1 : 2;
        const wide = narrow;
        const estimatedBarcodeWidth = (barcodeStr.length + 2) * 11 * narrow;
        const barcodeX = Math.max(16, Math.floor((widthDots - estimatedBarcodeWidth) / 2));
        const barcodeY = titleLines.length > 1 ? 72 : 62;
        const barcodeHeight = 52;

        commands.push(`BARCODE ${barcodeX},${barcodeY},"128",${barcodeHeight},2,0,${narrow},${wide},"${barcodeStr}"`);

        const priceTextWidth = priceStr.length * 24;
        const priceX = Math.max(16, Math.floor((widthDots - priceTextWidth) / 2));
        const priceY = barcodeY + barcodeHeight + 38;
        commands.push(`TEXT ${priceX},${priceY},"4",0,1,1,"${priceStr}"`);
      }

      // 4. Print Command
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

        // 2. Barcode
        const barcodeBytes: number[] = [];
        for (let i = 0; i < barcodeStr.length; i++) {
          barcodeBytes.push(barcodeStr.charCodeAt(i));
        }

        const bData: number[] = [
          0x1D, 0x68, 45,
          0x1D, 0x77, 2,
          0x1D, 0x48, 2,
          0x1D, 0x66, 0,
          0x1D, 0x6B, 73, barcodeBytes.length + 2, 0x7B, 0x42, ...barcodeBytes,
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

        builder.newLine(2);
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
      const svgBarcode = generateCode128Svg(barcodeStr, 32, 1.1);

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
            width: 40mm;
            height: 20mm;
            padding: 1mm 1.5mm;
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
            font-size: 8px;
            font-weight: 800;
            line-height: 1.1;
            max-height: 18px;
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
            margin: 1px 0;
          }
          .sticker-barcode-text {
            font-family: monospace;
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 1px;
            margin-top: 1px;
          }
          .sticker-price {
            font-size: 11px;
            font-weight: 900;
          }
          @media print {
            @page {
              size: 40mm 20mm;
              margin: 0;
            }
            .sticker-page {
              width: 40mm;
              height: 20mm;
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

    // 1. Direct Rendered Bitmap TSPL Print (matches web version pixel-for-pixel!)
    if (config.connectionType !== 'rawbt' && DirectPrinter?.printLabelsRendered && config.labelProtocol !== 'escpos') {
      try {
        const widthMm = config.labelWidthMm || 40;
        const heightMm = config.labelHeightMm || 20;
        const itemsJson = JSON.stringify(validItems);
        const port = Number(config.port) || 9100;
        await DirectPrinter.printLabelsRendered(config.ipAddress, port, itemsJson, widthMm, heightMm, 5000);
        return true;
      } catch (renderErr: any) {
        console.warn('Direct rendered label print failed, attempting raw TSPL fallback:', renderErr);
      }
    }

    // 2. Direct TCP Raw TSPL Print
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
   * Prints a single test label in TSPL (Xprinter XP-350B, 40x20mm standard)
   */
  async printTestLabel(customConfig?: PrinterConfig): Promise<boolean> {
    const config = customConfig || (await receiptService.getConfig());
    const testItems: LabelPrintItem[] = [
      {
        id: 'test-item-01',
        name: 'ALLEGRO BOYUK TEK PEDAL - AUX',
        barcode: '8868311174678',
        price: 20.00,
        printQty: 1,
      },
    ];

    if (config.connectionType !== 'rawbt' && DirectPrinter?.printLabelsRendered && config.labelProtocol !== 'escpos') {
      try {
        const widthMm = config.labelWidthMm || 40;
        const heightMm = config.labelHeightMm || 20;
        const itemsJson = JSON.stringify(testItems);
        const port = Number(config.port) || 9100;
        await DirectPrinter.printLabelsRendered(config.ipAddress, port, itemsJson, widthMm, heightMm, 5000);
        return true;
      } catch (e: any) {
        console.warn('Rendered test label failed, falling back to raw:', e);
      }
    }

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
