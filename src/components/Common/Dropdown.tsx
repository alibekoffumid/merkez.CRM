import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  label?: string;
  className?: string;
  position?: 'top' | 'bottom' | 'auto';
}

const Dropdown: React.FC<DropdownProps> = ({ value, onChange, options, label, className = '', position = 'auto' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, isTop: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenTop = position === 'top' || (position === 'auto' && spaceBelow < 200 && spaceAbove > spaceBelow);
      
      setCoords({
        top: shouldOpenTop ? rect.top : rect.bottom,
        left: rect.left,
        width: rect.width,
        isTop: shouldOpenTop
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);



  const dropdownMenu = isOpen && createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
      <div 
        className={`fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in duration-200 ${coords.isTop ? 'slide-in-from-bottom-2 origin-bottom' : 'slide-in-from-top-2 origin-top'} zoom-in-95`}
        onClick={(e) => e.stopPropagation()}
        style={{
          top: coords.isTop ? 'auto' : `${coords.top + 8}px`,
          bottom: coords.isTop ? `${window.innerHeight - coords.top + 8}px` : 'auto',
          left: `${coords.left}px`,
          width: `${coords.width}px`,
        }}
      >
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors ${value === opt.value ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
            >
              {opt.icon && <opt.icon className={`w-4 h-4 ${value === opt.value ? 'text-blue-600' : 'text-gray-400'}`} />}
              <span className="text-sm font-bold">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 hover:border-blue-500 hover:bg-white rounded-2xl px-4 py-2.5 transition-all group shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10"
      >
        <div className="flex items-center gap-3">
          {selectedOption.icon && <selectedOption.icon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />}
          <span className="text-sm font-bold text-gray-700">{selectedOption.label}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </button>

      {dropdownMenu}
    </div>
  );
};

export default Dropdown;
