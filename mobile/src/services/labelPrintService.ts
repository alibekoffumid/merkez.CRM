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

function utf8ToBase64(str: string): string {
  const utf8 = unescape(encodeURIComponent(str));
  let output = '';
  for (let i = 0; i < utf8.length; i++) {
    output += String.fromCharCode(utf8.charCodeAt(i));
  }
  return btoa(output);
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const labelPrintService = {
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
      const nameStr = cleanAzeriText(item.name || 'Məhsul');

      for (let q = 0; q < qty; q++) {
        builder.align('center');

        // 1. Product Title (bold, single height, max 24 chars per line)
        builder.bold(true);
        builder.line(nameStr.slice(0, 30));
        builder.bold(false);

        // 2. Barcode (Hardware ESC/POS Code128)
        // GS h 64 (height 64 dots)
        // GS w 2  (width multiplier 2)
        // GS H 2  (HRI characters placed below barcode)
        // GS f 0  (Font A for HRI)
        // GS k 73 len+2 {B data
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
          0x0A
        ];

        // Push raw barcode bytes into buffer
        bData.forEach((byte) => (builder as any).buffer.push(byte));

        // 3. Price (Large, bold)
        builder.align('center');
        builder.bold(true);
        builder.doubleSize(true);
        builder.line(priceStr);
        builder.doubleSize(false);
        builder.bold(false);

        // Gap spacing between thermal labels (approx 3 line feeds)
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
        const bytes = this.formatLabelsEscPos(validItems, config);
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
