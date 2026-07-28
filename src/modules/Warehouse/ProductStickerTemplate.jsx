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
        
        return (
          <div key={`${item.id}-${index}`} className="sticker-page">
            {/* Top: Branding */}
            <div className="sticker-brand">RAST MUSIC SHOP</div>
            
            {/* Product Title */}
            <div className="sticker-title">
              {item.name}
            </div>
            
            {/* Middle Row: Barcode & QR */}
            <div className="sticker-middle-row">
              <div className="sticker-barcode-wrapper">
                <Barcode 
                  value={barcodeValue} 
                  format="CODE128" 
                  width={1.1} 
                  height={24} 
                  fontSize={10}
                  margin={0}
                  displayValue={true}
                  background="transparent"
                />
              </div>
              <div className="sticker-qr-wrapper">
                <QRCodeSVG value={qrUrl} size={32} level="M" includeMargin={false} />
              </div>
            </div>
            
            {/* Bottom Row: Price & Call to action */}
            <div className="sticker-bottom-row">
              <div className="sticker-price">
                Nağd: {item.price || item.sale_price || 0} ₼
              </div>
              <div className="sticker-cta">
                Kredit kalkulyatoru<br />üçün skan edin
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductStickerTemplate;
