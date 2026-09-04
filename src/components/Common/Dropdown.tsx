import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Folder, Search, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DropdownOption {
  value: string;
  label: string;
  rawName?: string;
  icon?: React.ElementType;
  level?: number;
  parentName?: string;
  color?: string;
}

const CATEGORY_DEPTH_COLORS = [
  '#4285F4', // Level 0: Main Category (Blue)
  '#34A853', // Level 1: Subcategory 1 (Green)
  '#FBBC05', // Level 2: Subcategory 2 (Yellow)
  '#EA4335', // Level 3: Subcategory 3 (Red)
  '#00A1F1', // Level 4: Subcategory 4 (Sky Blue)
  '#7CBB00', // Level 5: Subcategory 5 (Lime Green)
  '#FFBB00', // Level 6: Subcategory 6 (Amber)
  '#F65314', // Level 7: Subcategory 7 (Deep Orange)
];

const getCategoryDepthColor = (level: number = 0) => {
  const lvl = Math.max(0, level || 0);
  return CATEGORY_DEPTH_COLORS[lvl % CATEGORY_DEPTH_COLORS.length];
};

interface DropdownItem {
  id: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}

interface DropdownProps {
  value?: string | string[];
  onChange?: (value: any) => void;
  options?: DropdownOption[];
  label?: string;
  className?: string;
  buttonClassName?: string;
  position?: 'top' | 'bottom' | 'auto';
  trigger?: React.ReactNode;
  items?: DropdownItem[];
  searchable?: boolean;
  disabled?: boolean;
  multiple?: boolean;
}

const normalizeDropdownStr = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/i̇/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ə/g, 'e')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ё/g, 'е');
};

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
  disabled = false,
  multiple = false
}) => {
  const { t, i18n } = useTranslation();
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

  const selectedValues: string[] = React.useMemo(() => {
    if (!multiple) return [];
    if (Array.isArray(value)) {
      return value.filter(v => v !== 'all' && v !== '');
    }
    if (typeof value === 'string' && value !== 'all' && value !== '') {
      return [value];
    }
    return [];
  }, [multiple, value]);

  const selectedCount = selectedValues.length;
  const isAllSelected = multiple ? selectedCount === 0 : (value === 'all' || value === '' || !value);

  const selectedOption = options ? (
    multiple
      ? (selectedCount > 0 ? options.find(opt => opt.value === selectedValues[0]) : options[0])
      : (options.find(opt => opt.value === value) || options[0])
  ) : null;

  const handleOptionToggle = (optValue: string) => {
    if (optValue === 'all' || optValue === '') {
      onChange?.([]);
      return;
    }

    let nextValues: string[];
    if (selectedValues.includes(optValue)) {
      nextValues = selectedValues.filter(v => v !== optValue);
    } else {
      nextValues = [...selectedValues, optValue];
    }
    onChange?.(nextValues);
  };

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
    searchable && searchQuery.trim() ? options.filter(opt => {
      const q = normalizeDropdownStr(searchQuery);
      return (
        normalizeDropdownStr(opt.label).includes(q) ||
        (opt.rawName && normalizeDropdownStr(opt.rawName).includes(q)) ||
        (opt.parentName && normalizeDropdownStr(opt.parentName).includes(q))
      );
    }) : options
  ) : null;

  const dropdownMenu = isOpen && createPortal(
    <div 
      ref={menuRef}
      className={`fixed z-[99999] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_16px_48px_-8px_rgba(0,0,0,0.18)] border border-gray-100/90 p-1.5 animate-in fade-in duration-150 ${coords.isTop ? 'slide-in-from-bottom-2 origin-bottom' : 'slide-in-from-top-2 origin-top'} zoom-in-95 flex flex-col`}
      style={{
        top: coords.isTop ? 'auto' : `${coords.top + 6}px`,
        bottom: coords.isTop ? `${window.innerHeight - coords.top + 6}px` : 'auto',
        left: `${coords.left}px`,
        minWidth: `${Math.max(coords.width, 220)}px`,
        width: 'max-content',
        maxWidth: '420px',
      }}
    >
      {searchable && (
        <div className="px-1.5 py-1.5 border-b border-gray-100/80 sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0 mb-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('common.search') || (i18n?.language === 'az' ? 'Axtarış...' : 'Поиск...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-gray-50 border border-gray-200/70 rounded-xl text-xs outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue/20 transition-all font-semibold text-gray-800 placeholder-gray-400"
              autoFocus
              onKeyDown={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="max-h-[280px] overflow-y-auto custom-scrollbar flex flex-col gap-0.5 pr-0.5">
        {filteredOptions ? (
          filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-xs font-bold text-gray-400">
              {i18n?.language === 'az' ? 'Nəticə tapılmadı' : 'Ничего не найдено'}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isAllOption = opt.value === 'all' || opt.value === '';
              const isItemChecked = multiple 
                ? (isAllOption ? isAllSelected : selectedValues.includes(opt.value))
                : (value === opt.value);
              const isSelected = isItemChecked;
              const hasArrow = typeof opt.label === 'string' && opt.label.includes('↳');
              const hasLevel = typeof opt.level === 'number';
              const isHierarchy = hasLevel || hasArrow;
              const isSub = isHierarchy && ((hasLevel && opt.level! > 0) || hasArrow);
              const isMain = isHierarchy && !isSub && !isAllOption;
              const indentLevel = hasLevel ? opt.level! : (hasArrow ? 1 : 0);

              return (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (multiple) {
                      handleOptionToggle(opt.value);
                    } else {
                      onChange?.(opt.value);
                      setIsOpen(false);
                    }
                  }}
                  style={isSub ? { paddingLeft: `${14 + indentLevel * 14}px` } : undefined}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition-all group ${
                    isSelected
                      ? 'bg-blue-50/80 text-merkez-blue font-black'
                      : isMain
                        ? 'text-gray-900 font-black hover:bg-gray-100/70'
                        : isSub
                          ? 'text-gray-700 font-semibold hover:bg-gray-50 hover:text-gray-900'
                          : 'text-gray-700 font-bold hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                    {multiple && (
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                        isItemChecked 
                          ? 'bg-merkez-blue border-merkez-blue text-white shadow-sm' 
                          : 'border-gray-300 bg-white group-hover:border-gray-400'
                      }`}>
                        {isItemChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    )}
                    {(() => {
                      const optColor = opt.color || (isHierarchy ? getCategoryDepthColor(opt.level ?? (isSub ? 1 : 0)) : undefined);
                      if (opt.icon) {
                        return (
                          <opt.icon 
                            className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-merkez-blue' : ''}`}
                            style={!isSelected && optColor ? { color: optColor } : undefined}
                          />
                        );
                      }
                      if (isHierarchy && !isAllOption) {
                        return (
                          <Folder 
                            className="w-3.5 h-3.5 shrink-0 transition-transform duration-200" 
                            style={{ color: optColor }}
                            fill={optColor}
                            fillOpacity={0.2}
                          />
                        );
                      }
                      return null;
                    })()}
                    <span className="truncate">
                      {opt.rawName || (isSub ? opt.label.replace(/^[\s\u00A0↳]+/, '') : opt.label)}
                    </span>
                    {opt.parentName && (searchQuery || isSub) && (
                      <span className="text-[10px] text-gray-400 font-normal shrink-0 ml-auto mr-1 truncate max-w-[120px] bg-gray-100/80 px-1.5 py-0.5 rounded">
                        {opt.parentName}
                      </span>
                    )}
                  </div>
                  {!multiple && isSelected && <span className="w-1.5 h-1.5 rounded-full bg-merkez-blue shrink-0"></span>}
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
      {multiple && (
        <div className="pt-2 pb-1 px-2 border-t border-gray-100 flex items-center justify-between gap-2 mt-1 bg-white/95 shrink-0">
          <div className="text-[11px] font-bold text-gray-500">
            {isAllSelected ? (
              <span>{t('warehouse.allCategories') || 'Bütün kateqoriyalar'}</span>
            ) : (
              <span>
                <strong className="text-merkez-blue font-black">{selectedCount}</strong> {i18n?.language === 'az' ? 'seçilib' : 'выбрано'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!isAllSelected && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange?.([]);
                }}
                className="text-[11px] font-bold text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                {i18n?.language === 'az' ? 'Təmizlə' : 'Сбросить'}
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-[11px] font-bold bg-merkez-blue text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
            >
              {i18n?.language === 'az' ? 'Bağla' : 'Готово'}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );

  const selectedIsHierarchy = typeof selectedOption?.level === 'number' || (typeof selectedOption?.label === 'string' && selectedOption.label.includes('↳'));
  const selectedIsSub = selectedIsHierarchy && ((typeof selectedOption?.level === 'number' && selectedOption.level > 0) || (typeof selectedOption?.label === 'string' && selectedOption.label.includes('↳')));
  const selectedIsMain = selectedIsHierarchy && !selectedIsSub && selectedOption?.value !== '';

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
            className={`w-full flex items-center justify-between gap-2 bg-gray-50 border border-gray-100 transition-all group shadow-sm outline-none focus:ring-1 focus:ring-merkez-blue ${buttonClassName || 'rounded-lg px-4 py-2.5'} ${disabled ? 'opacity-75 cursor-not-allowed' : 'hover:border-merkez-blue hover:bg-white'}`}
          >
            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
              {(() => {
                if (multiple && !isAllSelected) {
                  const firstSelected = options?.find(o => o.value === selectedValues[0]);
                  const firstColor = firstSelected?.color || (firstSelected?.level != null ? getCategoryDepthColor(firstSelected.level) : '#4285F4');
                  return (
                    <>
                      <Folder 
                        className="w-3.5 h-3.5 shrink-0" 
                        style={{ color: firstColor }}
                        fill={firstColor}
                        fillOpacity={0.2}
                      />
                      <span className="text-sm font-bold text-gray-800 truncate">
                        {firstSelected?.rawName || (firstSelected?.label ? firstSelected.label.replace(/^[\s\u00A0↳]+/, '') : '')}
                      </span>
                      {selectedCount > 1 && (
                        <span className="bg-blue-100 text-merkez-blue text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                          +{selectedCount - 1}
                        </span>
                      )}
                    </>
                  );
                }

                const selectedColor = selectedOption?.color || (selectedIsHierarchy ? getCategoryDepthColor(selectedOption?.level ?? (selectedIsSub ? 1 : 0)) : undefined);
                if (selectedOption?.icon) {
                  return (
                    <selectedOption.icon 
                      className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-merkez-blue transition-colors" 
                      style={selectedColor ? { color: selectedColor } : undefined}
                    />
                  );
                }
                if (selectedIsHierarchy && selectedOption?.value !== '' && selectedOption?.value !== 'all') {
                  return (
                    <Folder 
                      className="w-3.5 h-3.5 shrink-0" 
                      style={{ color: selectedColor }}
                      fill={selectedColor}
                      fillOpacity={0.2}
                    />
                  );
                }
                return null;
              })()}
              {(multiple ? isAllSelected : true) && (
                <span className="text-sm font-bold text-gray-700 whitespace-nowrap truncate">
                  {selectedOption?.rawName || (selectedOption?.label ? selectedOption.label.replace(/^[\s\u00A0↳]+/, '') : '')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {multiple && !isAllSelected && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange?.([]);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-full transition-colors"
                  title={i18n?.language === 'az' ? 'Təmizlə' : 'Сбросить'}
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-merkez-blue' : ''}`} />
            </div>
          </button>
        </>
      )}

      {dropdownMenu}
    </div>
  );
};

export default Dropdown;
