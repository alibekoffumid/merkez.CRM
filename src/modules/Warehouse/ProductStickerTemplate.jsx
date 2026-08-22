import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

const ProductStickerTemplate = ({ items, onPrintComplete }) => {
  useEffect(() => {
    if (items && items.length > 0) {
      // Small delay to ensure rendering is complete before printing
      const timer = setTimeout(() => {
        window.print();
        if (onPrintComplete) onPrintComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [items, onPrintComplete]);

  if (!items || items.length === 0) return null;

  return (
    <div className="print-only-container">
      {items.map((item, index) => {
        const qrUrl = `https://rastmusicshop.com/product/${item.id}`;
        // Ensure barcode has a value, fallback to short ID if empty
        const barcodeValue = item.barcode || item.id?.replace(/-/g, '').substring(0, 10) || '00000000';
        const displayPrice = item.sale_price ?? item.price ?? item.sell_price ?? 0;

        return (
          <div key={`${item.id}-${index}`} className="sticker-page">
            <div className="sticker-layout">
              {/* Left Side: Branding, Title, Sale Price, Barcode */}
              <div className="sticker-left">
                <div className="sticker-brand">RAST MUSIC SHOP</div>
                <div className="sticker-title" title={item.name}>
                  {item.name}
                </div>
                <div className="sticker-price">
                  <span className="sticker-price-label">SATIŞ QİYMƏTİ: </span>
                  <span className="sticker-price-value">{displayPrice} ₼</span>
                </div>
                <div className="sticker-barcode-wrapper">
                  <Barcode 
                    value={barcodeValue} 
                    format="CODE128" 
                    width={0.9} 
                    height={12} 
                    fontSize={7}
                    margin={0}
                    displayValue={true}
                    background="transparent"
                  />
                </div>
              </div>

              {/* Right Side: Large QR Code */}
              <div className="sticker-right">
                <div className="sticker-qr-wrapper">
                  <QRCodeSVG value={qrUrl} size={44} level="M" includeMargin={false} />
                </div>
                <div className="sticker-cta">
                  Kredit kalkulyatoru<br />üçün skan edin
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductStickerTemplate;
