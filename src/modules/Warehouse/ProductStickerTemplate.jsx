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
            <div className="sticker-left-col">
              {/* Product Title */}
              <div className="sticker-title">
                {item.name}
              </div>
              
              {/* Price */}
              <div className="sticker-price">
                {item.price || item.sale_price || 0} ₼
              </div>
              
              {/* SKU / Barcode text */}
              <div className="sticker-barcode-text">
                {barcodeValue}
              </div>
            </div>
            
            <div className="sticker-right-col">
              {/* QR Code */}
              <QRCodeSVG value={qrUrl} size={64} level="M" includeMargin={false} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductStickerTemplate;
