import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  position?: 'top' | 'bottom' | 'auto';
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label, position = 'auto' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, isTop: false });
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const [hours, minutes] = value ? value.split(':') : ['10', '00'];

  const hoursList = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenTop = position === 'top' || (position === 'auto' && spaceBelow < 250 && spaceAbove > spaceBelow);
      
      setCoords({
        top: shouldOpenTop ? rect.top : rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 240), // Minimum width for the time picker
        isTop: shouldOpenTop
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          containerRef.current && !containerRef.current.contains(target) &&
          menuRef.current && !menuRef.current.contains(target)
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

  const handleHourSelect = (h: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(`${h}:${minutes}`);
  };

  const handleMinuteSelect = (m: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(`${hours}:${m}`);
    setIsOpen(false); 
  };

  const timeMenu = isOpen && createPortal(
    <div 
      ref={menuRef}
      className={`fixed z-[9999] bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 flex gap-4 animate-in fade-in duration-200 ${coords.isTop ? 'slide-in-from-bottom-2 origin-bottom' : 'slide-in-from-top-2 origin-top'} zoom-in-95`}
      style={{
        top: coords.isTop ? 'auto' : `${coords.top + 8}px`,
        bottom: coords.isTop ? `${window.innerHeight - coords.top + 8}px` : 'auto',
        left: `${coords.left}px`,
        width: `${coords.width}px`,
      }}
    >
      <div className="flex-1 max-h-48 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Hour</div>
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
              className={`w-full py-2 px-3 rounded-xl text-sm font-bold transition-all ${hours === h ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-gray-50 text-gray-600'}`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>
      <div className="w-px bg-gray-100 my-2" />
      <div className="flex-1 max-h-48 overflow-y-auto no-scrollbar scroll-smooth">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Min</div>
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
              className={`w-full py-2 px-3 rounded-xl text-sm font-bold transition-all ${minutes === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-gray-50 text-gray-600'}`}
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
        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900 flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          <span>{value || '10:00'}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </button>

      {timeMenu}
    </div>
  );
};

export default TimePicker;
