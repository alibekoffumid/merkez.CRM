import React, { useEffect } from 'react';
import Barcode from 'react-barcode';
import ModalPortal from '../../components/Common/ModalPortal';

const ProductStickerTemplate = ({ items, onPrintComplete }) => {
  useEffect(() => {
    if (items && items.length > 0) {
      // Dynamic delay to ensure full SVG/Barcode rendering before window.print()
      const delay = Math.max(800, Math.min(items.length * 8, 2500));
      const timer = setTimeout(() => {
        const handleAfterPrint = () => {
          window.removeEventListener('afterprint', handleAfterPrint);
          if (onPrintComplete) onPrintComplete();
        };
        window.addEventListener('afterprint', handleAfterPrint);

        window.print();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [items, onPrintComplete]);

  if (!items || items.length === 0) return null;

  return (
    <ModalPortal>
      <div className="print-only-container">
        {items.map((item, index) => {
          // Ensure barcode has a value, fallback to short ID if empty
          const barcodeValue = item.barcode || item.id?.replace(/-/g, '').substring(0, 10) || '00000000';
          const rawPrice = item.sale_price ?? item.price ?? item.sell_price ?? 0;
          const displayPrice = isNaN(rawPrice) ? rawPrice : Number(rawPrice).toFixed(2);

          return (
            <div key={`${item.id}-${index}`} className="sticker-page">
              <div className="sticker-layout">
                {/* 1. Product Title */}
                <div className="sticker-title" title={item.name}>
                  {item.name}
                </div>

                {/* 2. Linear Barcode */}
                <div className="sticker-barcode-wrapper">
                  <Barcode 
                    value={barcodeValue} 
                    format="CODE128" 
                    width={0.88} 
                    height={16} 
                    fontSize={7.5}
                    margin={0}
                    textMargin={1}
                    displayValue={true}
                    background="transparent"
                  />
                </div>

                {/* 3. Product Price */}
                <div className="sticker-price">
                  <span className="sticker-price-value">{displayPrice} ₼</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ModalPortal>
  );
};

export default ProductStickerTemplate;
