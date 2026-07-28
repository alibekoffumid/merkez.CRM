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
        // Ensure barcode has a value, fallback to short ID if empty
        const barcodeValue = item.barcode || item.id?.replace(/-/g, '').substring(0, 10) || '00000000';
        
        // Encode the product name so the store can search by name without extra data entry
        const encodedName = encodeURIComponent(item.name.trim());
        const qrUrl = `https://rastmusicshop.com/mahsul/name::${encodedName}`;
        
        return (
          <div key={`${item.id}-${index}`} className="sticker-page">
            {/* Product Title */}
            <div className="sticker-title">
              {item.name}
            </div>
            
            {/* QR Code */}
            <div className="sticker-qr-vertical">
              <QRCodeSVG value={qrUrl} size={32} level="M" includeMargin={false} />
            </div>
            
            {/* Bottom Row: Price */}
            <div className="sticker-price-vertical">
              {item.price || item.sale_price || 0} ₼
            </div>
            
            {/* Bottom: Barcode */}
            <div className="sticker-barcode-vertical">
              <Barcode 
                value={barcodeValue} 
                format="CODE128" 
                width={1.2} 
                height={20} 
                fontSize={12}
                margin={0}
                displayValue={true}
                background="transparent"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductStickerTemplate;
