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
    expenseDetails = null, // { category, description, recipient, amount }
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
  } else if (lowerMethod.includes('expense') || lowerMethod.includes('xərc') || lowerMethod.includes('rasxod') || lowerMethod.includes('digər')) {
    paymentTitle = 'Digər xərclər';
    paidLabel = 'xərc';
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

        ${expenseDetails ? `
          <div class="credit-info" style="margin-top: 4px; padding: 3px 0; border-top: 1px dashed #000;">
            <div>Xərc kateqoriyası: ${escapeHtml(expenseDetails.category || 'Xərc')}</div>
            ${expenseDetails.description ? `<div>İzah: ${escapeHtml(expenseDetails.description)}</div>` : ''}
            ${expenseDetails.recipient ? `<div>Təhvil alan: ${escapeHtml(expenseDetails.recipient)}</div>` : ''}
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

  // On mobile browsers (Android/iOS), hidden iframes cannot invoke print dialogs reliably
  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  if (isMobile) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      return true;
    }
  }

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

/**
 * Specialized thermal receipt printing for Product Returns and Exchanges (57mm / 80mm)
 */
export function printThermalReturnReceipt57mm(returnData) {
  const {
    receiptNumber = Date.now().toString().slice(-4),
    originalReceiptNumber = '',
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
    operationType = 'refund', // 'refund' | 'exchange'
    reason = '',
    returnedItem = null, // { name, barcode, quantity, unit, price, total }
    refundAmount = 0,
    refundMethod = 'Nağd',
    exchangeItem = null, // { name, barcode, quantity, unit, price, total }
    priceDifference = 0,
    diffPaymentMethod = 'Nağd',
    notes = '',
    transactionId = '',
    paperWidth = '57mm'
  } = returnData;

  const isExchange = operationType === 'exchange';
  const is80mm = paperWidth === '80mm';
  const widthMm = is80mm ? '72mm' : '48mm';
  const pageSize = is80mm ? '80mm auto' : '58mm auto';
  const qrSvgSize = is80mm ? 130 : 100;

  let dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) dateObj = new Date();

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}:${seconds}`;

  const cleanReceiptNumber = String(receiptNumber || '').replace(/^[№#]\s*/, '') || Date.now().toString().slice(-4);
  const cleanOriginalNumber = String(originalReceiptNumber || '').replace(/^[№#]\s*/, '');
  const cleanTxId = String(transactionId || cleanReceiptNumber);

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://rastmusic.az';
  const targetQrUrl = `${origin}/receipt/${encodeURIComponent(cleanTxId)}?type=${operationType}&num=${encodeURIComponent(cleanReceiptNumber)}`;

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

  const receiptHtml = `
    <!DOCTYPE html>
    <html lang="az">
    <head>
      <meta charset="utf-8">
      <title>${isExchange ? 'Məhsul Dəyişdirmə Çeki' : 'Məhsul Qaytarılma Çeki'} ${cleanReceiptNumber}</title>
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
        * { box-sizing: border-box; word-break: break-word; }
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
        .black { font-weight: 900; }
        
        .store-top-header { text-align: center; margin-bottom: 4px; }
        .store-main-title {
          font-size: ${is80mm ? '14px' : '12px'};
          font-weight: 900;
          letter-spacing: -0.2px;
          text-transform: uppercase;
        }
        .operation-badge {
          display: block;
          margin: 4px auto;
          padding: 3px 6px;
          background: #000;
          color: #fff;
          font-size: ${is80mm ? '11px' : '10px'};
          font-weight: 900;
          text-transform: uppercase;
          border-radius: 2px;
          letter-spacing: 0.5px;
        }
        .dashed-sep {
          border-top: 1px dashed #000;
          margin: 4px 0;
        }
        .solid-sep {
          border-top: 1.5px solid #000;
          margin: 5px 0;
        }
        .meta-line {
          display: flex;
          justify-content: space-between;
          font-size: ${is80mm ? '10px' : '9px'};
          line-height: 1.35;
        }
        .box-section {
          background: #f7f7f7;
          border: 1px solid #ddd;
          padding: 4px;
          margin: 4px 0;
          border-radius: 3px;
        }
        .section-header {
          font-size: ${is80mm ? '10px' : '9px'};
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .item-row {
          font-size: ${is80mm ? '10.5px' : '9.5px'};
          margin: 2px 0;
        }
        .total-block {
          margin-top: 5px;
          padding-top: 4px;
          border-top: 1.5px solid #000;
        }
        .grand-line {
          display: flex;
          justify-content: space-between;
          font-size: ${is80mm ? '13px' : '11.5px'};
          font-weight: 900;
          margin: 2px 0;
        }
        .qr-section {
          text-align: center;
          margin-top: 8px;
        }
        .qr-wrap {
          display: inline-block;
          padding: 4px;
          background: #fff;
          border: 1px solid #000;
          margin: 4px auto;
        }
      </style>
    </head>
    <body>
      <div class="store-top-header">
        <div class="store-main-title">${escapeHtml(storeName)}</div>
        <div style="font-size: 8.5px; color: #333;">${escapeHtml(tsName)}</div>
        <div style="font-size: 8px; color: #555;">${escapeHtml(tsAddress)}</div>
        <div class="operation-badge">
          ${isExchange ? 'MƏHSULUN DƏYİŞDİRİLMƏSİ' : 'MƏHSULUN GERİ QAYTARILMASI'}
        </div>
      </div>

      <div class="dashed-sep"></div>

      <div class="meta-line">
        <span>Sənəd №:</span>
        <span class="bold">Q-${escapeHtml(cleanReceiptNumber)}</span>
      </div>
      ${cleanOriginalNumber ? `
      <div class="meta-line">
        <span>İlkin Satış №:</span>
        <span class="bold">#${escapeHtml(cleanOriginalNumber.slice(0, 8).toUpperCase())}</span>
      </div>` : ''}
      <div class="meta-line">
        <span>Tarix / Vaxt:</span>
        <span>${dateStr} ${timeStr}</span>
      </div>
      <div class="meta-line">
        <span>Kassir / Təhvil alan:</span>
        <span class="bold">${escapeHtml(cashierName)}</span>
      </div>
      ${customerName ? `
      <div class="meta-line">
        <span>Müştəri:</span>
        <span class="bold">${escapeHtml(customerName)}${customerPhone ? ` (${escapeHtml(customerPhone)})` : ''}</span>
      </div>` : ''}
      ${reason ? `
      <div class="meta-line" style="margin-top: 2px;">
        <span>Səbəb:</span>
        <span class="bold" style="text-align: right; max-width: 65%;">${escapeHtml(reason)}</span>
      </div>` : ''}

      <div class="solid-sep"></div>

      <!-- Returned Item -->
      <div class="box-section">
        <div class="section-header" style="color: #b91c1c;">▼ QAYTARILAN MƏHSUL</div>
        ${returnedItem ? `
          <div class="item-row bold">${escapeHtml(returnedItem.name || 'Məhsul')}</div>
          ${returnedItem.barcode ? `<div style="font-size: 8px; font-family: monospace; color: #555;">Barkod: ${escapeHtml(returnedItem.barcode)}</div>` : ''}
          <div class="meta-line" style="margin-top: 2px;">
            <span>${returnedItem.quantity || 1} ${returnedItem.unit || 'əd'} x ₼${Number(returnedItem.price || 0).toFixed(2)}</span>
            <span class="bold" style="color: #b91c1c;">-₼${Number(returnedItem.total || refundAmount || 0).toFixed(2)}</span>
          </div>
        ` : '<div>—</div>'}
      </div>

      <!-- Exchanged Replacement Item (if exchange) -->
      ${isExchange && exchangeItem ? `
        <div class="box-section" style="background: #f0fdf4; border-color: #bbf7d0;">
          <div class="section-header" style="color: #15803d;">▲ ƏVƏZİNƏ VERİLƏN MƏHSUL</div>
          <div class="item-row bold">${escapeHtml(exchangeItem.name || 'Yeni Məhsul')}</div>
          ${exchangeItem.barcode ? `<div style="font-size: 8px; font-family: monospace; color: #555;">Barkod: ${escapeHtml(exchangeItem.barcode)}</div>` : ''}
          <div class="meta-line" style="margin-top: 2px;">
            <span>${exchangeItem.quantity || 1} ${exchangeItem.unit || 'əd'} x ₼${Number(exchangeItem.price || 0).toFixed(2)}</span>
            <span class="bold" style="color: #15803d;">+₼${Number(exchangeItem.total || 0).toFixed(2)}</span>
          </div>
        </div>
      ` : ''}

      <!-- Settlement Summary -->
      <div class="total-block">
        ${isExchange ? `
          <div class="meta-line">
            <span>Qaytarılan məhsulun dəyəri:</span>
            <span class="bold">₼${Number(returnedItem?.total || refundAmount || 0).toFixed(2)}</span>
          </div>
          <div class="meta-line">
            <span>Yeni məhsulun dəyəri:</span>
            <span class="bold">₼${Number(exchangeItem?.total || 0).toFixed(2)}</span>
          </div>
          <div class="dashed-sep"></div>
          ${priceDifference > 0 ? `
            <div class="grand-line" style="color: #c2410c;">
              <span>MÜŞTƏRİ ƏLAVƏ ÖDƏYİB:</span>
              <span>+₼${Number(priceDifference).toFixed(2)}</span>
            </div>
            <div class="meta-line">
              <span>Ödəniş üsulu:</span>
              <span class="bold">${escapeHtml(diffPaymentMethod)}</span>
            </div>
          ` : priceDifference < 0 ? `
            <div class="grand-line" style="color: #15803d;">
              <span>MÜŞTƏRİYƏ QAYTARILIB:</span>
              <span>₼${Number(Math.abs(priceDifference)).toFixed(2)}</span>
            </div>
            <div class="meta-line">
              <span>Qaytarılma üsulu:</span>
              <span class="bold">${escapeHtml(diffPaymentMethod)}</span>
            </div>
          ` : `
            <div class="grand-line">
              <span>QİYMƏT FƏRQİ:</span>
              <span>₼0.00</span>
            </div>
          `}
        ` : `
          <div class="grand-line" style="color: #b91c1c;">
            <span>QAYTARILAN MƏBLƏĞ:</span>
            <span>₼${Number(refundAmount || 0).toFixed(2)}</span>
          </div>
          <div class="meta-line">
            <span>Qaytarılma üsulu:</span>
            <span class="bold">${escapeHtml(refundMethod)}</span>
          </div>
        `}
      </div>

      ${notes ? `
        <div style="font-size: 8.5px; color: #555; margin-top: 4px; font-style: italic;">
          Qeyd: ${escapeHtml(notes)}
        </div>
      ` : ''}

      <div class="solid-sep"></div>

      <!-- QR & Verification -->
      <div class="qr-section">
        <div class="qr-wrap">${qrSvgHtml}</div>
        <div style="font-size: 8px; color: #555;">ID: ${escapeHtml(cleanTxId)}</div>
        <div style="font-size: 9px; font-weight: 700; margin-top: 2px;">ƏMƏLİYYAT RƏSMİLƏŞDİRİLDİ</div>
        <div style="font-size: 8px; color: #777;">Məhsulun qəbulu və yenilənməsi anbara işlənmişdir.</div>
      </div>

      <div style="height: 10mm;">&nbsp;</div>

      <script>
        if (window.self === window.top) {
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        }
      </script>
    </body>
    </html>
  `;

  return printHtmlToThermal(receiptHtml);
}

function printHtmlToThermal(receiptHtml) {
  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  if (isMobile) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      return true;
    }
  }

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

  const printWindow = window.open('', '_blank', 'width=380,height=600');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    return true;
  }

  return false;
}

/**
 * Specialized thermal receipt printing for Cashbox / Operational Store Expenses (57mm / 80mm)
 */
export function printThermalExpenseVoucher(voucherData) {
  const {
    receiptNumber = Date.now().toString().slice(-4),
    date = new Date(),
    storeName = 'Rast musiqi alətləri mağazası',
    warehouseName = 'Əsas Mağaza',
    category = 'Digər xərc',
    amount = 0,
    description = '',
    recipient = 'Kassa',
    paymentSource = 'Nağd Kassa',
    cashierName = 'Kassir',
    paperWidth = '57mm'
  } = voucherData || {};

  const is80mm = paperWidth === '80mm';
  const widthMm = is80mm ? '72mm' : '48mm';
  const pageSize = is80mm ? '80mm auto' : '58mm auto';

  let dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) dateObj = new Date();

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}:${seconds}`;

  const cleanVoucherNumber = String(receiptNumber || '').replace(/^[№#]\s*/, '') || Date.now().toString().slice(-4);

  const receiptHtml = `
    <!DOCTYPE html>
    <html lang="az">
    <head>
      <meta charset="utf-8">
      <title>Kassa Məxaric Qəbzi №${cleanVoucherNumber}</title>
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
        * { box-sizing: border-box; word-break: break-word; }
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
        .black { font-weight: 900; }
        
        .store-main-title {
          font-size: ${is80mm ? '13px' : '11px'};
          font-weight: 900;
          letter-spacing: -0.2px;
          text-transform: uppercase;
        }
        .badge {
          display: block;
          margin: 4px auto;
          padding: 3px 6px;
          background: #000;
          color: #fff;
          font-size: ${is80mm ? '11px' : '9.5px'};
          font-weight: 900;
          text-transform: uppercase;
          border-radius: 2px;
          letter-spacing: 0.5px;
        }
        .dashed-sep {
          border-top: 1px dashed #000;
          margin: 4px 0;
        }
        .solid-sep {
          border-top: 1.5px solid #000;
          margin: 5px 0;
        }
        .meta-line {
          display: flex;
          justify-content: space-between;
          font-size: ${is80mm ? '10px' : '9px'};
          line-height: 1.35;
        }
        .amount-box {
          border: 1.5px solid #000;
          padding: 6px 4px;
          margin: 6px 0;
          text-align: center;
          border-radius: 3px;
        }
        .amount-val {
          font-size: ${is80mm ? '18px' : '15px'};
          font-weight: 900;
        }
        .sig-block {
          margin-top: 10px;
          font-size: ${is80mm ? '9.5px' : '8.5px'};
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="text-center">
        <div class="store-main-title">${escapeHtml(storeName)}</div>
        <div style="font-size: 8.5px; color: #444; margin-top: 1px;">${escapeHtml(warehouseName)}</div>
        <span class="badge">KASSA MƏXARİC QƏBZİ</span>
      </div>

      <div class="dashed-sep"></div>

      <div class="meta-line">
        <span>Order №:</span>
        <span class="bold">#${escapeHtml(cleanVoucherNumber)}</span>
      </div>
      <div class="meta-line">
        <span>Tarix / Vaxt:</span>
        <span>${escapeHtml(dateStr)} ${escapeHtml(timeStr)}</span>
      </div>
      <div class="meta-line">
        <span>Kassir / Təhvil verən:</span>
        <span class="bold">${escapeHtml(cashierName)}</span>
      </div>
      <div class="meta-line">
        <span>Məxaric mənbəyi:</span>
        <span class="bold">${escapeHtml(paymentSource)}</span>
      </div>

      <div class="solid-sep"></div>

      <div class="amount-box">
        <div style="font-size: 9px; text-transform: uppercase; font-weight: 700; color: #444;">XƏRCLƏNƏN MƏBLƏĞ</div>
        <div class="amount-val">-₼${Number(amount || 0).toFixed(2)}</div>
      </div>

      <div class="meta-line">
        <span>Təyinat / Kateqoriya:</span>
        <span class="bold">${escapeHtml(category)}</span>
      </div>
      <div class="meta-line">
        <span>Xərcləyən / Şəxs:</span>
        <span class="bold">${escapeHtml(recipient)}</span>
      </div>
      ${description ? `
        <div style="font-size: 8.5px; color: #333; margin-top: 3px; line-height: 1.25;">
          <strong>Qeyd / Təfsilat:</strong> ${escapeHtml(description)}
        </div>
      ` : ''}

      <div class="dashed-sep"></div>

      <div class="sig-block">
        <div style="margin-bottom: 6px;">
          Təhvil verdi (Kassir): ______________________
        </div>
        <div>
          Təhvil aldı (${escapeHtml(recipient)}): ______________________
        </div>
      </div>

      <div style="text-align: center; font-size: 7.5px; color: #666; margin-top: 10px;">
        *** DAXİLİ TƏSƏRRÜFAT SƏNƏDİ ***
      </div>

      <div style="height: 10mm;">&nbsp;</div>

      <script>
        if (window.self === window.top) {
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        }
      </script>
    </body>
    </html>
  `;

  return printHtmlToThermal(receiptHtml);
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
