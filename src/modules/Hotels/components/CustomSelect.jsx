import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

const CustomSelect = ({ value, onChange, options, label, placeholder, isGrouped = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = useMemo(() => {
    if (isGrouped) {
      for (const group of options) {
        const found = group.items.find(o => o.value === value);
        if (found) return found;
      }
    }
    return options.find(o => o.value === value);
  }, [options, value, isGrouped]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    if (isGrouped) {
      return options.map(group => ({
        ...group,
        items: group.items.filter(item => 
          item.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(group => group.items.length > 0);
    }
    return options.filter(opt => 
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm, isGrouped]);

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-pink-500 hover:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 outline-none transition-all text-sm font-bold text-gray-900 text-left relative group shadow-sm flex items-center justify-between"
      >
        <span className="font-black tracking-tight">{selected ? selected.label : placeholder || 'Select...'}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[1000] animate-in zoom-in-95 fade-in duration-200 origin-top max-h-[350px] overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="px-3 mb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input 
                type="text"
                autoFocus
                placeholder="Axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-50 rounded-xl text-xs font-bold focus:bg-white focus:border-pink-200 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
            {isGrouped ? (
              filteredOptions.map((group, idx) => (
                <div key={idx} className="mb-4 last:mb-0">
                  <div className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 rounded-lg mb-1">
                    {group.category}
                  </div>
                  {group.items.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                        value === opt.value 
                          ? 'bg-pink-50 text-pink-600' 
                          : 'text-gray-700 hover:bg-gray-50 hover:translate-x-1'
                      }`}
                    >
                      {opt.label}
                      {value === opt.value && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                    value === opt.value 
                      ? 'bg-pink-50 text-pink-600' 
                      : 'text-gray-700 hover:bg-gray-50 hover:translate-x-1'
                  }`}
                >
                  {opt.label}
                  {value === opt.value && <Check className="w-3 h-3" />}
                </button>
              ))
            )}
            {filteredOptions.length === 0 && (
              <div className="text-center py-8 text-gray-400 italic text-xs">Məlumat tapılmadı</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
