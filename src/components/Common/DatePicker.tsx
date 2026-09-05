import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  position?: 'top' | 'bottom' | 'auto';
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label, position = 'auto' }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'date' | 'year'>('date');
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, isTop: false });

  // Use state for the calendar view date (independent of selected value)
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  
  // Ensure viewDate updates if value changes and modal is closed
  useEffect(() => {
    if (!isOpen && value) {
      setViewDate(new Date(value));
    }
  }, [value, isOpen]);

  const selectedDate = value ? new Date(value) : null;

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenTop = position === 'top' || (position === 'auto' && spaceBelow < 380 && spaceAbove > spaceBelow);
      
      const popupWidth = 320;
      let left = rect.left;
      if (left + popupWidth > window.innerWidth - 12) {
        left = Math.max(12, rect.right - popupWidth);
      }

      setCoords({
        top: shouldOpenTop ? rect.top : rect.bottom,
        left: Math.max(12, left),
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
          popupRef.current && !popupRef.current.contains(target)
        ) {
          setIsOpen(false);
          setViewMode('date');
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

  const changeMonth = (offset: number) => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + offset);
    setViewDate(d);
  };

  const formatDateValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDisplayDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const monthKey = ['january','february','march','april','may','june','july','august','september','october','november','december'][date.getMonth()];
    const month = t(`common.months.${monthKey}`);
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(<div key={`e${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = formatDateValue(date);
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

    days.push(
      <button
        key={d}
        type="button"
        onClick={() => {
          onChange(dateStr);
          setIsOpen(false);
        }}
        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
          isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' :
          isToday ? 'bg-blue-50 text-blue-600 border border-blue-200' :
          'text-gray-700 hover:bg-gray-100'
        }`}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setViewMode('date');
        }}
        className="w-full p-4 pl-14 bg-gray-50 border border-gray-100 rounded-2xl hover:border-blue-500 hover:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900 text-left relative group shadow-sm"
      >
        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
        <span className="font-black tracking-tight">
          {selectedDate ? getDisplayDate(selectedDate) : t('common.selectDate', 'Tarix seçin')}
        </span>
      </button>

      {isOpen && createPortal(
        <div 
          ref={popupRef}
          className={`fixed z-[99999] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-gray-100 p-6 w-[320px] animate-in zoom-in-95 fade-in duration-150 ${coords.isTop ? 'slide-in-from-bottom-2 origin-bottom' : 'slide-in-from-top-2 origin-top'}`}
          style={{
            top: coords.isTop ? 'auto' : `${coords.top + 8}px`,
            bottom: coords.isTop ? `${window.innerHeight - coords.top + 8}px` : 'auto',
            left: `${coords.left}px`,
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <button type="button" onClick={() => viewMode === 'date' ? changeMonth(-1) : setViewMode('date')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {viewMode === 'date' ? (
                <button 
                  onClick={() => setViewMode('year')}
                  className="text-sm font-black text-gray-900 uppercase tracking-tight hover:text-blue-600 transition-colors px-2 py-1 rounded-lg"
                >
                  {t(`common.months.${['january','february','march','april','may','june','july','august','september','october','november','december'][viewDate.getMonth()]}`)} {viewDate.getFullYear()}
                </button>
              ) : (
                <span className="text-sm font-black text-gray-900 uppercase tracking-tight">
                  {t('common.selectYear', 'İl seçin')}
                </span>
              )}
            </div>
            <button type="button" onClick={() => viewMode === 'date' ? changeMonth(1) : undefined} className={`p-2 rounded-xl transition-colors ${viewMode === 'date' ? 'hover:bg-gray-100' : 'opacity-0 cursor-default'}`}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          {viewMode === 'date' ? (
            <>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {[
                  t('common.weekdays.mon', 'Mon'),
                  t('common.weekdays.tue', 'Tue'),
                  t('common.weekdays.wed', 'Wed'),
                  t('common.weekdays.thu', 'Thu'),
                  t('common.weekdays.fri', 'Fri'),
                  t('common.weekdays.sat', 'Sat'),
                  t('common.weekdays.sun', 'Sun')
                ].map(d => (
                  <span key={d} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{d.substring(0, 3)}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days}
              </div>

              <button 
                type="button"
                onClick={() => {
                  onChange(formatDateValue(new Date()));
                  setIsOpen(false);
                }}
                className="w-full mt-6 py-3 bg-gray-50 hover:bg-gray-100 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                {t('dental.today') || 'Today'}
              </button>
            </>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto no-scrollbar p-1">
              {Array.from({ length: 120 }).map((_, i) => {
                const y = new Date().getFullYear() - i + 2; // From +2 years into the future down to 118 years in the past
                const isSelected = y === viewDate.getFullYear();
                return (
                  <button 
                    key={y}
                    onClick={() => {
                      const newDate = new Date(viewDate);
                      newDate.setFullYear(y);
                      setViewDate(newDate);
                      setViewMode('date');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default DatePicker;
