import React, { useState, useRef, useEffect } from 'react';
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
  position?: 'top' | 'bottom';
}

const Dropdown: React.FC<DropdownProps> = ({ value, onChange, options, label, className = '', position = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[490]" onClick={() => setIsOpen(false)} />
          <div className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[500] py-2 animate-in zoom-in-95 fade-in duration-200 ${position === 'top' ? 'origin-bottom' : 'origin-top'}`}>
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
        </>
      )}
    </div>
  );
};

export default Dropdown;
