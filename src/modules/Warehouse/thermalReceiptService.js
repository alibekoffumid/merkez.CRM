/**
 * thermalReceiptService.js
 * Specialized receipt formatting and printing for 57mm / 58mm thermal printers (Xprinter, POS-58, etc.)
 */

/**
 * Generates clean HTML for 57mm / 58mm thermal receipts and opens the print dialog.
 */
export function printThermalReceipt57mm(saleData) {
  const {
    receiptNumber = `№${Date.now().toString().slice(-6)}`,
    date = new Date(),
    storeName = 'MERKEZ CRM',
    warehouseName = 'Əsas Anbar / Mağaza',
    cashierName = '',
    customerName = '',
    customerPhone = '',
    channel = '',
    paymentMethod = 'Nəqd',
    items = [],
    subtotal = 0,
    discountAmount = 0,
    total = 0,
    creditDetails = null, // { bank, months, monthlyPayment, markupPercent, contractTotal }
    notes = '',
    paperWidth = '57mm' // '57mm' | '80mm'
  } = saleData;

  const widthMm = paperWidth === '80mm' ? '72mm' : '48mm';
  const pageSize = paperWidth === '80mm' ? '80mm auto' : '58mm auto';

  // Format date and time
  let dateStr = '';
  let timeStr = '';
  if (date instanceof Date) {
    dateStr = date.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } else if (typeof date === 'string') {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      dateStr = d.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
      timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } else {
      dateStr = date;
    }
  }

  // Payment method label
  let paymentLabel = paymentMethod;
  if (paymentMethod === 'cash') paymentLabel = 'Nəqd';
  else if (paymentMethod === 'card') paymentLabel = 'Kart / Pos-Terminal';
  else if (paymentMethod === 'debt') paymentLabel = 'Nisyə / Borc';
  else if (paymentMethod === 'credit') paymentLabel = `Kredit (${creditDetails?.bank || 'Bank'})`;
  else if (paymentMethod === 'birmarket') paymentLabel = 'Birmarket';

  const receiptHtml = `
    <!DOCTYPE html>
    <html lang="az">
    <head>
      <meta charset="utf-8">
      <title>Çek ${receiptNumber}</title>
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
            padding: 1.5mm 1mm 15mm 1mm !important;
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
          font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
          width: ${widthMm};
          max-width: ${widthMm};
          margin: 0 auto;
          padding: 3mm 1mm 18mm 1mm;
          color: #000;
          background: #fff;
          font-size: 10.5px;
          line-height: 1.25;
          -webkit-font-smoothing: antialiased;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: 900; }
        .store-name {
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .store-sub {
          font-size: 9px;
          color: #222;
          margin-bottom: 2px;
        }
        .receipt-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 900;
          padding: 1px 4px;
          border: 1px solid #000;
          margin: 3px 0;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 4px 0;
        }
        .double-divider {
          border-top: 2px dashed #000;
          margin: 5px 0;
        }
        .flex-between {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
        }
        .meta-line {
          font-size: 9.5px;
          margin: 1.5px 0;
        }
        .items-header {
          font-size: 9px;
          font-weight: 900;
          padding-bottom: 2px;
        }
        .item-row {
          margin: 4px 0;
        }
        .item-name {
          font-weight: 900;
          font-size: 10px;
          word-break: break-word;
          line-height: 1.2;
        }
        .item-calc {
          font-size: 9px;
          color: #333;
        }
        .total-box {
          font-size: 13.5px;
          font-weight: 900;
          margin: 3px 0;
        }
        .credit-box {
          background: #f4f4f4;
          border: 1px dashed #000;
          padding: 3px;
          margin: 4px 0;
          font-size: 9.5px;
        }
        .footer {
          text-align: center;
          font-size: 9px;
          margin-top: 8px;
          line-height: 1.3;
        }
        .barcode-box {
          text-align: center;
          margin: 6px 0 2px 0;
          font-family: monospace;
          font-size: 11px;
          letter-spacing: 2px;
          font-weight: 900;
        }
        .btn-print {
          background: #000;
          color: #fff;
          border: none;
          padding: 8px 16px;
          font-weight: bold;
          font-size: 12px;
          border-radius: 4px;
          cursor: pointer;
          margin-bottom: 10px;
          width: 100%;
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Çap et (Print)</button>
      </div>

      <div class="text-center">
        <div class="store-name">${escapeHtml(storeName)}</div>
        <div class="store-sub">${escapeHtml(warehouseName)}</div>
        <div class="receipt-badge">SATIŞ ÇEKİ</div>
        <div class="meta-line">Çek: <span class="bold">${escapeHtml(receiptNumber)}</span></div>
        <div class="meta-line">Tarix: ${escapeHtml(dateStr)} ${escapeHtml(timeStr)}</div>
        ${cashierName ? `<div class="meta-line">Kassir: ${escapeHtml(cashierName)}</div>` : ''}
        ${channel ? `<div class="meta-line">Kanal: ${escapeHtml(channel)}</div>` : ''}
      </div>

      ${customerName ? `
        <div class="divider"></div>
        <div class="flex-between meta-line">
          <span>Müştəri:</span>
          <span class="bold">${escapeHtml(customerName)}</span>
        </div>
        ${customerPhone ? `
        <div class="flex-between meta-line">
          <span>Əlaqə:</span>
          <span>${escapeHtml(customerPhone)}</span>
        </div>
        ` : ''}
      ` : ''}

      <div class="divider"></div>

      <!-- Items Table Header -->
      <div class="flex-between items-header">
        <span class="bold">Məhsul</span>
        <span class="bold">Məbləğ</span>
      </div>
      <div class="divider"></div>

      <!-- Items List -->
      ${items.map((item, idx) => {
        const itemQty = Number(item.quantity) || 1;
        const itemPrice = Number(item.price) || 0;
        const itemTotal = Number(item.total) || (itemQty * itemPrice);
        const itemUnit = item.unit || 'əd';
        return `
          <div class="item-row">
            <div class="item-name">${idx + 1}. ${escapeHtml(item.name || 'Məhsul')}</div>
            ${item.barcode ? `<div style="font-size: 8.5px; color: #555;">Barkod: ${escapeHtml(item.barcode)}</div>` : ''}
            <div class="flex-between">
              <span class="item-calc">${itemQty} ${escapeHtml(itemUnit)} x ₼${itemPrice.toFixed(2)}</span>
              <span class="bold">₼${itemTotal.toFixed(2)}</span>
            </div>
            ${item.discount > 0 ? `
              <div class="text-right" style="font-size: 8.5px; color: #555;">(Endirim: -₼${Number(item.discount).toFixed(2)})</div>
            ` : ''}
          </div>
        `;
      }).join('')}

      <div class="double-divider"></div>

      <!-- Totals -->
      ${discountAmount > 0 ? `
        <div class="flex-between meta-line">
          <span>İlkin Cəmi:</span>
          <span>₼${Number(subtotal).toFixed(2)}</span>
        </div>
        <div class="flex-between meta-line bold">
          <span>Ümumi Endirim:</span>
          <span>-₼${Number(discountAmount).toFixed(2)}</span>
        </div>
        <div class="divider"></div>
      ` : ''}

      <div class="flex-between total-box">
        <span>YEKUN:</span>
        <span>₼${Number(total).toFixed(2)}</span>
      </div>

      <div class="flex-between meta-line">
        <span>Ödəniş növü:</span>
        <span class="bold">${escapeHtml(paymentLabel)}</span>
      </div>

      <!-- Credit / Installment Details -->
      ${creditDetails ? `
        <div class="credit-box">
          <div class="bold text-center" style="margin-bottom: 2px;">KREDİT ŞƏRTLƏRİ</div>
          <div class="flex-between">
            <span>Bank / Tərəfdaş:</span>
            <span class="bold">${escapeHtml(creditDetails.bank || 'Birkart')}</span>
          </div>
          <div class="flex-between">
            <span>Müddət:</span>
            <span class="bold">${creditDetails.months} ay</span>
          </div>
          <div class="flex-between">
            <span>Aylıq ödəniş:</span>
            <span class="bold">₼${Number(creditDetails.monthlyPayment || 0).toFixed(2)} / ay</span>
          </div>
          ${creditDetails.markupPercent ? `
          <div class="flex-between">
            <span>Faiz:</span>
            <span>${Number(creditDetails.markupPercent).toFixed(1)}%</span>
          </div>
          ` : ''}
          ${creditDetails.contractTotal ? `
          <div class="flex-between">
            <span>Müqavilə Cəmi:</span>
            <span class="bold">₼${Number(creditDetails.contractTotal).toFixed(2)}</span>
          </div>
          ` : ''}
        </div>
      ` : ''}

      ${notes ? `
        <div class="divider"></div>
        <div style="font-size: 9px; color: #333; margin: 3px 0;">Qeyd: ${escapeHtml(notes)}</div>
      ` : ''}

      <div class="divider"></div>

      <div class="barcode-box">
        *${escapeHtml(receiptNumber.replace(/[^A-Za-z0-9]/g, ''))}*
      </div>

      <div class="footer">
        <div class="bold">BİZİ SEÇDİYİNİZ ÜÇÜN TƏŞƏKKÜR EDİRİK!</div>
        <div style="margin-top: 2px;">Malı qaytararkən və ya dəyişdirərkən çeki təqdim edin.</div>
      </div>

      <!-- Feed space for thermal paper cutter -->
      <div style="height: 12mm; line-height: 12mm;">&nbsp;</div>

      <script>
        // Only auto-print from inside script if opened as a standalone window
        if (window.self === window.top) {
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        }
      </script>
    </body>
    </html>
  `;

  try {
    // Use hidden iframe - NEVER blocked by browser popup blockers!
    let iframe = document.getElementById('thermal-receipt-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'thermal-receipt-iframe';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '100px';
      iframe.style.height = '100px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(receiptHtml);
      doc.close();

      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
        } catch (printErr) {
          console.warn('Iframe print error:', printErr);
        }
      }, 300);

      return true;
    }
  } catch (err) {
    console.warn('Iframe print setup error, attempting fallback:', err);
  }

  // Fallback for edge cases
  const printWindow = window.open('', '_blank', 'width=380,height=600');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    return true;
  }

  return false;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
