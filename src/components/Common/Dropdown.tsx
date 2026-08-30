import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  buttonClassName?: string;
  position?: 'top' | 'bottom' | 'auto';
  trigger?: React.ReactNode;
  items?: DropdownItem[];
  searchable?: boolean;
  disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({ 
  value, 
  onChange, 
  options, 
  label, 
  className = '', 
  buttonClassName = '',
  position = 'auto',
  trigger,
  items,
  searchable = false,
  disabled = false
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, isTop: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

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

  const filteredOptions = options ? (
    searchable && searchQuery ? options.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    ) : options
  ) : null;

  const dropdownMenu = isOpen && createPortal(
    <div 
      ref={menuRef}
      className={`fixed z-[99999] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_16px_48px_-8px_rgba(0,0,0,0.18)] border border-gray-100/90 p-1.5 animate-in fade-in duration-150 ${coords.isTop ? 'slide-in-from-bottom-2 origin-bottom' : 'slide-in-from-top-2 origin-top'} zoom-in-95 flex flex-col`}
      style={{
        top: coords.isTop ? 'auto' : `${coords.top + 6}px`,
        bottom: coords.isTop ? `${window.innerHeight - coords.top + 6}px` : 'auto',
        left: `${coords.left}px`,
        minWidth: `${Math.max(coords.width, 180)}px`,
        width: 'max-content',
        maxWidth: '380px',
      }}
    >
      {searchable && (
        <div className="px-2 py-1.5 border-b border-gray-100/70 sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0 mb-1">
          <input
            type="text"
            placeholder={t('common.search') || 'Axtarış...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200/60 rounded-xl text-xs outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue/20 transition-all font-bold text-gray-800 placeholder-gray-400"
            autoFocus
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <div className="max-h-[280px] overflow-y-auto custom-scrollbar flex flex-col gap-0.5 pr-0.5">
        {filteredOptions ? (
          filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-xs font-bold text-gray-400">
              {i18n.language === 'az' ? 'Nəticə tapılmadı' : 'Ничего не найдено'}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange?.(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl text-left text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-blue-50 text-merkez-blue font-black'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {opt.icon && <opt.icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-merkez-blue' : 'text-gray-400'}`} />}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-merkez-blue shrink-0"></span>}
                </button>
              );
            })
          )
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
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl text-left text-xs font-bold transition-all ${
                item.active 
                  ? 'bg-blue-50 text-merkez-blue font-black' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              } ${item.className || ''}`}
            >
              <span className="truncate">{item.label}</span>
              {item.active && <span className="w-1.5 h-1.5 rounded-full bg-merkez-blue shrink-0"></span>}
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
            if (disabled) return;
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className={`cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
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
            disabled={disabled}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className={`w-full flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 transition-all group shadow-sm outline-none focus:ring-1 focus:ring-merkez-blue ${buttonClassName || 'rounded-lg px-4 py-2.5'} ${disabled ? 'opacity-75 cursor-not-allowed' : 'hover:border-merkez-blue hover:bg-white'}`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {selectedOption?.icon && <selectedOption.icon className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-merkez-blue transition-colors" />}
              <span className="text-sm font-bold text-gray-700 whitespace-nowrap truncate">{selectedOption?.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-merkez-blue' : ''}`} />
          </button>
        </>
      )}

      {dropdownMenu}
    </div>
  );
};

export default Dropdown;
