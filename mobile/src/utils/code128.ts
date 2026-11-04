/**
 * Standalone, zero-dependency Code 128 (Code Set B) Barcode Generator.
 * Encodes alphanumeric text into bar patterns and returns SVG representation.
 */

// 107 Code 128 patterns (index 0 to 106). Each string contains widths of 3 bars and 3 spaces (sum = 11 modules).
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '233111',                                    // 100-106
];

// Stop pattern (2331112) has 13 modules
const STOP_PATTERN = '2331112';
const START_B = 104; // Start Code B

export interface BarcodeBar {
  x: number;
  width: number;
}

export function encodeCode128(text: string): { bars: BarcodeBar[]; totalWidth: number } {
  const safeText = (text || '00000000').trim();
  const codes: number[] = [START_B];

  for (let i = 0; i < safeText.length; i++) {
    const charCode = safeText.charCodeAt(i);
    // ASCII 32 to 126 map to values 0 to 94 in Code B
    const val = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
    codes.push(val);
  }

  // Calculate checksum
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);

  // Convert codes to pattern strings
  const patterns: string[] = codes.map((c) => CODE128_PATTERNS[c] || CODE128_PATTERNS[0]);
  patterns.push(STOP_PATTERN);

  // Convert patterns to bar coordinates (unit width = 1 module)
  const bars: BarcodeBar[] = [];
  let currentX = 0;

  patterns.forEach((pattern) => {
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10);
      const isBar = j % 2 === 0;
      if (isBar) {
        bars.push({ x: currentX, width });
      }
      currentX += width;
    }
  });

  return { bars, totalWidth: currentX };
}

/**
 * Returns clean SVG markup string for embedding in HTML receipts / thermal label templates
 */
export function generateCode128Svg(text: string, height = 45, moduleWidth = 1.6): string {
  const { bars, totalWidth } = encodeCode128(text);
  const svgWidth = Math.ceil(totalWidth * moduleWidth);

  const rects = bars
    .map((bar) => {
      const rx = (bar.x * moduleWidth).toFixed(1);
      const rw = (bar.width * moduleWidth).toFixed(1);
      return `<rect x="${rx}" y="0" width="${rw}" height="${height}" fill="#000" />`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${height}" width="${svgWidth}" height="${height}">${rects}</svg>`;
}

