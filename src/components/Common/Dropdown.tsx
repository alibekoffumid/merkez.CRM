import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface DropdownItem {
  id: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}

interface DropdownProps {
  value?: string;
  onChange?: (value: string) => void;
  options?: DropdownOption[];
  label?: string;
  className?: string;
  position?: 'top' | 'bottom' | 'auto';
  trigger?: React.ReactNode;
  items?: DropdownItem[];
}

const Dropdown: React.FC<DropdownProps> = ({ 
  value, 
  onChange, 
  options, 
  label, 
  className = '', 
  position = 'auto',
  trigger,
  items
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, isTop: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options ? (options.find(opt => opt.value === value) || options[0]) : null;

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenTop = position === 'top' || (position === 'auto' && spaceBelow < 250 && spaceAbove > spaceBelow);
      
      setCoords({
        top: shouldOpenTop ? rect.top : rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 160),
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

  const dropdownMenu = isOpen && createPortal(
    <div 
      ref={menuRef}
      className={`fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in duration-200 ${coords.isTop ? 'slide-in-from-bottom-2 origin-bottom' : 'slide-in-from-top-2 origin-top'} zoom-in-95`}
      style={{
        top: coords.isTop ? 'auto' : `${coords.top + 8}px`,
        bottom: coords.isTop ? `${window.innerHeight - coords.top + 8}px` : 'auto',
        left: `${coords.left}px`,
        minWidth: `${coords.width}px`,
        width: 'max-content',
        maxWidth: '480px',
      }}
    >
      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
        {options ? (
          options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange?.(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left ${value === opt.value ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
            >
              {opt.icon && <opt.icon className={`w-4 h-4 ${value === opt.value ? 'text-blue-600' : 'text-gray-400'}`} />}
              <span className="text-sm font-bold whitespace-nowrap">{opt.label}</span>
            </button>
          ))
        ) : (
          items?.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                item.onClick();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left ${item.active ? 'bg-blue-50 text-blue-600' : 'text-gray-600'} ${item.className || ''}`}
            >
              <span className="text-sm font-bold whitespace-nowrap">{item.label}</span>
            </button>
          ))
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {trigger ? (
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="cursor-pointer"
        >
          {trigger}
        </div>
      ) : (
        <>
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
            className="w-full flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 hover:border-blue-500 hover:bg-white rounded-2xl px-4 py-2.5 transition-all group shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {selectedOption?.icon && <selectedOption.icon className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors" />}
              <span className="text-sm font-bold text-gray-700 whitespace-nowrap truncate">{selectedOption?.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
          </button>
        </>
      )}

      {dropdownMenu}
    </div>
  );
};

export default Dropdown;
