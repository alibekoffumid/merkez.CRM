/**
 * thermalReceiptService.js
 * Specialized fiscal-style thermal receipt formatting and printing for 57mm / 58mm & 80mm printers (Xprinter, POS-58, etc.)
 * Styled after official Azerbaijani POS/fiscal cash register receipts.
 */

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Generates clean HTML matching official fiscal thermal receipt layout and prints via hidden iframe.
 */
export function printThermalReceipt57mm(saleData) {
  const {
    receiptNumber = Date.now().toString().slice(-4),
    date = new Date(),
    storeName = 'Rast musiqi alətləri mağazası',
    tsName = 'MUSİQİ ALƏTLƏRİ SATIŞI VƏ TƏMİRİ',
    tsAddress = 'AZ1142 BAKI ŞƏHƏRİ XƏTAİ RAYONU ev.18A m.92',
    voName = 'ŞƏKƏROV KAMRAN MUSA OĞLU',
    voen = '5501238362',
    objectCode = '5501238362-20001',
    kassaNumber = 'V1E0969392',
    cashierName = 'Kassir',
    warehouseName = '',
    customerName = '',
    customerPhone = '',
    paymentMethod = 'Nağd',
    items = [],
    subtotal = 0,
    discountAmount = 0,
    total = 0,
    taxAmount = 0,
    creditDetails = null, // { bank, months, monthlyPayment, markupPercent, contractTotal }
    depositDetails = null, // { advanceAmount, advanceRecipient, remainingBalance }
    notes = '',
    transactionId = '',
    saleId = '',
    qrUrl = '',
    paperWidth = '57mm' // '57mm' | '58mm' | '80mm'
  } = saleData;

  const is80mm = paperWidth === '80mm';
  const widthMm = is80mm ? '72mm' : '48mm';
  const pageSize = is80mm ? '80mm auto' : '58mm auto';
  const qrSvgSize = is80mm ? 135 : 105;

  // Format date and time matching fiscal receipt: DD/MM/YYYY and HH:mm:ss
  let dateObj = date instanceof Date ? date : new Date(date);
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

  // Clean receipt number (remove leading № or #)
  const cleanReceiptNumber = String(receiptNumber || '').replace(/^[№#]\s*/, '') || Date.now().toString().slice(-4);
  const cleanTxId = String(transactionId || saleId || cleanReceiptNumber);

  // Construct Verification / Electronic Receipt URL for QR code
  let targetQrUrl = qrUrl;
  if (!targetQrUrl) {
    const origin = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://rastmusic.az';
    targetQrUrl = `${origin}/receipt/${encodeURIComponent(cleanTxId)}?num=${encodeURIComponent(cleanReceiptNumber)}&sum=${Number(total).toFixed(2)}`;
  }

  // Generate crisp pure SVG QR code HTML
  let qrSvgHtml = '';
  try {
    qrSvgHtml = renderToStaticMarkup(
      React.createElement(QRCodeSVG, {
        value: targetQrUrl,
        size: qrSvgSize,
        level: 'M',
        marginSize: 1,
        style: { margin: '0 auto', display: 'block' }
      })
    );
  } catch (err) {
    console.warn('QR code generation failed:', err);
  }

  // Normalize payment method
  let paymentTitle = 'Nağd';
  let paidLabel = 'nağd';
  const lowerMethod = String(paymentMethod || '').toLowerCase();

  if (lowerMethod.includes('card') || lowerMethod.includes('kart') || lowerMethod.includes('pos')) {
    paymentTitle = 'Kartdan karta(Hesab)';
    paidLabel = 'kartdan karta';
  } else if (lowerMethod.includes('deposit') || lowerMethod.includes('beh') || lowerMethod.includes('avans')) {
    paymentTitle = 'Beh (Avans)';
    paidLabel = 'avans';
  } else if (lowerMethod.includes('credit') || lowerMethod.includes('kredit')) {
    const bankName = creditDetails?.bank || 'Bank';
    paymentTitle = `Kredit (${bankName})`;
    paidLabel = 'kredit';
  } else if (lowerMethod.includes('birmarket')) {
    paymentTitle = 'Birmarket';
    paidLabel = 'birmarket';
  } else if (lowerMethod.includes('debt') || lowerMethod.includes('nisyə') || lowerMethod.includes('borc')) {
    paymentTitle = 'Nisyə (Borc)';
    paidLabel = 'nisyə';
  }

  const receiptHtml = `
    <!DOCTYPE html>
    <html lang="az">
    <head>
      <meta charset="utf-8">
      <title>Çek ${cleanReceiptNumber}</title>
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
        .qr-code-wrapper svg {
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

      <!-- Top Store Brand Header -->
      <div class="store-top-header">
        <div class="store-main-title">Rast musiqi alətləri mağazası</div>
        <div class="store-sub-title">Musiqi Alətlərinin Satışı və Təmiri</div>
      </div>

      <div class="divider-dash">------------------------------------------------------------</div>

      <!-- Top Fiscal Merchant Header -->
      <div class="header-section">
        <div class="header-line">TS Adı: ${escapeHtml(tsName || 'Rast musiqi alətləri mağazası')}</div>
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
        <div class="store-name-title">Rast musiqi alətləri mağazası</div>
        ${warehouseName ? `<div class="meta-line">Filial: ${escapeHtml(warehouseName)}</div>` : ''}
        <div class="meta-line">Kassa nömrəsi: ${escapeHtml(kassaNumber)}</div>
        <div class="meta-line">Kassir: ${escapeHtml(cashierName)}</div>
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
      ${items.map((item) => {
        const itemQty = Number(item.quantity) || 1;
        const itemPrice = Number(item.price) || 0;
        const itemTotal = Number(item.total) || (itemQty * itemPrice);
        const itemUnit = item.unit ? `(${item.unit})` : '';
        const itemDisplayName = `${escapeHtml(item.name || item.productName || 'Məhsul')}${itemUnit ? ` ${escapeHtml(itemUnit)}` : ''}`;
        const qtyFormatted = Number.isInteger(itemQty) ? itemQty.toFixed(1) : itemQty.toString();

        return `
          <div style="margin: 2px 0;">
            <div class="item-row">
              <span class="col-name">${itemDisplayName}</span>
              <span class="col-qty">${qtyFormatted}</span>
              <span class="col-price">${itemPrice.toFixed(2)}</span>
              <span class="col-total">${itemTotal.toFixed(2)}</span>
            </div>
            ${item.discount > 0 ? `
              <div class="item-extra">(Endirim: -${Number(item.discount).toFixed(2)})</div>
            ` : ''}
            ${item.taxRate ? `
              <div class="item-extra">${escapeHtml(item.taxRate)}%</div>
            ` : ''}
          </div>
        `;
      }).join('')}

      <div class="divider-dash">------------------------------------------------------------</div>

      <!-- Totals Block -->
      <div class="flex-between total-box">
        <span>YEKUN MƏBLƏĞ</span>
        <span>${Number(total).toFixed(2)}</span>
      </div>
      <div class="meta-line">Toplam vergi=${Number(taxAmount || 0).toFixed(2)}</div>
      ${discountAmount > 0 ? `
        <div class="flex-between meta-line">
          <span>Ümumi endirim:</span>
          <span>-${Number(discountAmount).toFixed(2)}</span>
        </div>
      ` : ''}

      <div class="divider-stars">************************************************************</div>

      <!-- Payment Section -->
      <div class="payment-section">
        <div class="bold meta-line">Ödəniş üsulu</div>
        <div class="flex-between meta-line">
          <span>${escapeHtml(paymentTitle)}</span>
          <span>${Number(total).toFixed(2)}</span>
        </div>
        <div class="flex-between meta-line">
          <span>Ödənilib ${escapeHtml(paidLabel)}</span>
          <span>${Number(total).toFixed(2)}</span>
        </div>
        <div class="flex-between meta-line">
          <span>Qalıq qaytarılıb nağd</span>
          <span>0.00</span>
        </div>

        ${creditDetails ? `
          <div class="credit-info">
            <div>Müddət: ${escapeHtml(creditDetails.months)} ay</div>
            <div>Aylıq ödəniş: ${Number(creditDetails.monthlyPayment || 0).toFixed(2)}</div>
            ${creditDetails.contractTotal ? `<div>Müqavilə cəmi: ${Number(creditDetails.contractTotal).toFixed(2)}</div>` : ''}
          </div>
        ` : ''}

        ${depositDetails ? `
          <div class="credit-info" style="margin-top: 4px; padding: 3px 0; border-top: 1px dashed #000;">
            <div>Avans məbləği: ${Number(depositDetails.advanceAmount || 0).toFixed(2)} AZN</div>
            ${depositDetails.advanceRecipient ? `<div>Avans alan: ${escapeHtml(depositDetails.advanceRecipient)}</div>` : ''}
            <div>Qalıq borc: ${Number(depositDetails.remainingBalance || 0).toFixed(2)} AZN</div>
          </div>
        ` : ''}
      </div>

      ${customerName ? `
        <div class="divider-stars">************************************************************</div>
        <div class="meta-line">Müştəri: <span class="bold">${escapeHtml(customerName)}</span></div>
        ${customerPhone ? `<div class="meta-line">Əlaqə: ${escapeHtml(customerPhone)}</div>` : ''}
      ` : ''}

      ${notes ? `
        <div class="meta-line" style="font-size: 8.5px; margin-top: 2px;">Qeyd: ${escapeHtml(notes)}</div>
      ` : ''}

      <div class="divider-stars">************************************************************</div>

      <!-- Fiscal QR Code & Verification Block -->
      <div class="qr-fiscal-section">
        <div class="qr-title bold">ELEKTRON ÇEK / YOXLAMA</div>
        <div class="qr-subtitle">Elektron versiya və yoxlama üçün skan edin</div>
        <div class="qr-code-wrapper">
          ${qrSvgHtml}
        </div>
        <div class="qr-id-line">ID: <span class="bold">${escapeHtml(cleanTxId)}</span></div>
        <div class="qr-doc-line">Fiskal / Qeydiyyat №: ${escapeHtml(cleanReceiptNumber)}</div>
        <div class="qr-thanks bold">TİCARƏTİNİZ XEYİRLİ OLSUN!</div>
        <div class="qr-subthanks">Bizi seçdiyiniz üçün təşəkkür edirik!</div>
      </div>

      <!-- Cutter Feed Space -->
      <div style="height: 12mm; line-height: 12mm;">&nbsp;</div>

      <script>
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
