import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CustomTimePicker = ({ value, onChange, label, position = 'auto', is24Hour = true }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, isTop: false });
  const containerRef = useRef(null);

  const [hours, minutes] = value ? value.split(':') : ['14', '00'];

  const hoursList = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const menuRef = useRef(null);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenTop = position === 'top' || (position === 'auto' && spaceBelow < 250 && spaceAbove > spaceBelow);
      
      setCoords({
        top: shouldOpenTop ? rect.top : rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 240),
        isTop: shouldOpenTop
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);

      const handleClickOutside = (event) => {
        if (
          containerRef.current && !containerRef.current.contains(event.target) &&
          menuRef.current && !menuRef.current.contains(event.target)
        ) {
          setIsOpen(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        window.removeEventListener('scroll', updateCoords, true);
        window.removeEventListener('resize', updateCoords);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const timeMenu = isOpen && createPortal(
    <div 
      ref={menuRef}
      className={`fixed z-[99999] bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 flex gap-4 animate-in fade-in duration-200 ${coords.isTop ? 'slide-in-from-bottom-2 origin-bottom' : 'slide-in-from-top-2 origin-top'} zoom-in-95`}
      style={{
        top: coords.isTop ? 'auto' : `${coords.top + 8}px`,
        bottom: coords.isTop ? `${window.innerHeight - coords.top + 8}px` : 'auto',
        left: `${coords.left}px`,
        width: `${coords.width}px`,
      }}
    >
      <div className="flex-1 max-h-48 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">{t('hotels.hour', 'Часы')}</div>
        <div className="space-y-1">
          {hoursList.map(h => (
            <button
              key={h}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(`${h}:${minutes}`);
              }}
              className={`w-full py-2 px-3 rounded-xl text-sm font-bold transition-all ${hours === h ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'hover:bg-gray-50 text-gray-600'}`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>
      <div className="w-px bg-gray-100 my-2" />
      <div className="flex-1 max-h-48 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">{t('hotels.minute', 'Минуты')}</div>
        <div className="space-y-1">
          {minutesList.map(m => (
            <button
              key={m}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(`${hours}:${m}`);
                setIsOpen(false);
              }}
              className={`w-full py-2 px-3 rounded-xl text-sm font-bold transition-all ${minutes === m ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'hover:bg-gray-50 text-gray-600'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all text-sm font-bold text-gray-900 flex items-center justify-between group h-[54px]"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-gray-400 group-hover:text-pink-500 transition-colors" />
          <span>{value || '14:00'}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-pink-500' : ''}`} />
      </button>

      {timeMenu}
    </div>
  );
};

export default CustomTimePicker;
