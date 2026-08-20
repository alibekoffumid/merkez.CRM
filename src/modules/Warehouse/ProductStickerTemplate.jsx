import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

const ProductStickerTemplate = ({ items, format = 'a4', onPrintComplete }) => {
  useEffect(() => {
    if (items && items.length > 0) {
      // Small delay to ensure rendering and barcodes are drawn before printing
      const timer = setTimeout(() => {
        window.print();
        if (onPrintComplete) onPrintComplete();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [items, onPrintComplete]);

  if (!items || items.length === 0) return null;

  return (
    <div id="merkez-sticker-print-area" className={`print-area-wrapper print-format-${format}`}>
      {format === 'a4' ? (
        <div className="a4-sticker-grid">
          {items.map((item, index) => {
            const barcodeValue = item.barcode || item.id?.replace(/-/g, '').substring(0, 12) || '00000000';
            const encodedName = encodeURIComponent((item.name || '').trim());
            const qrUrl = `https://rastmusicshop.com/mahsul/name::${encodedName}`;

            return (
              <div key={`${item.id}-${index}`} className="a4-sticker-card">
                <div className="sticker-header-row">
                  <div className="sticker-title-text">{item.name}</div>
                  {item.color && <div className="sticker-badge-color">{item.color}</div>}
                </div>

                <div className="sticker-content-row">
                  <div className="sticker-price-barcode-box">
                    <div className="sticker-price-val">{parseFloat(item.price || 0).toFixed(2)} ₼</div>
                    <div className="sticker-barcode-box">
                      <Barcode 
                        value={barcodeValue} 
                        width={1.0} 
                        height={22} 
                        fontSize={8} 
                        margin={0} 
                        displayValue={true} 
                      />
                    </div>
                  </div>

                  <div className="sticker-qr-box">
                    <QRCodeSVG value={qrUrl} size={42} level="M" includeMargin={false} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="thermal-sticker-container">
          {items.map((item, index) => {
            const barcodeValue = item.barcode || item.id?.replace(/-/g, '').substring(0, 12) || '00000000';
            const encodedName = encodeURIComponent((item.name || '').trim());
            const qrUrl = `https://rastmusicshop.com/mahsul/name::${encodedName}`;

            return (
              <div key={`${item.id}-${index}`} className="thermal-sticker-page">
                <div className="thermal-header-row">
                  <div className="thermal-title-text">{item.name}</div>
                  {item.color && <div className="thermal-badge-color">{item.color}</div>}
                </div>

                <div className="thermal-content-row">
                  <div className="thermal-price-barcode-box">
                    <div className="thermal-price-val">{parseFloat(item.price || 0).toFixed(2)} ₼</div>
                    <div className="thermal-barcode-box">
                      <Barcode 
                        value={barcodeValue} 
                        width={1.0} 
                        height={20} 
                        fontSize={8} 
                        margin={0} 
                        displayValue={true} 
                      />
                    </div>
                  </div>

                  <div className="thermal-qr-box">
                    <QRCodeSVG value={qrUrl} size={38} level="M" includeMargin={false} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductStickerTemplate;
