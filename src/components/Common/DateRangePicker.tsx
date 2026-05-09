import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  label?: string;
  placeholder?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  startDate, 
  endDate, 
  onChange, 
  label,
  placeholder = 'Select date range'
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  
  // Internal state to hold temporary selection before "Apply"
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthsList = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  const getDaysInMonth = (m: number, y: number) => {
    if (m === 1) return (y % 4 === 0) ? 29 : 28;
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
  };

  const changeMonth = (offset: number) => {
    let newMonth = monthIndex + offset;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setMonthIndex(newMonth);
    setYear(newYear);
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, monthIndex, day);
    const dateStr = clickedDate.toISOString().split('T')[0];

    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd('');
    } else {
      const start = new Date(tempStart);
      if (clickedDate < start) {
        setTempStart(dateStr);
        setTempEnd('');
      } else {
        setTempEnd(dateStr);
      }
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const monthKey = monthsList[date.getMonth()];
    const monthName = t(`restaurant.${monthKey}`).slice(0, 3);
    const day = date.getDate();
    return `${monthName} ${day}`;
  };

  const daysInCurrentMonth = getDaysInMonth(monthIndex, year);
  const firstDayOfMonth = (new Date(year, monthIndex, 1).getDay() + 6) % 7;

  const refStart = tempStart ? new Date(tempStart).getTime() : null;
  const refEnd = tempEnd ? new Date(tempEnd).getTime() : null;

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">
          {label}
        </label>
      )}
      <div className="relative group">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-3.5 pl-12 bg-white border border-gray-200 rounded-xl focus:border-merkez-blue focus:ring-4 focus:ring-merkez-blue/10 outline-none transition-all text-sm font-bold text-gray-900 text-left flex items-center justify-between"
        >
          <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-merkez-blue transition-colors" />
          <span className={startDate ? 'text-gray-900' : 'text-gray-400 font-medium'}>
            {startDate ? (
              endDate ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}` : `${formatDateDisplay(startDate)}...`
            ) : placeholder}
          </span>
        </button>
        {(startDate || endDate) && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onChange('', '');
              setTempStart('');
              setTempEnd('');
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 p-6 w-[320px] animate-in fade-in zoom-in-95 duration-200 origin-top">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-black text-gray-900 uppercase tracking-tight">
              {t(`restaurant.${monthsList[monthIndex]}`)} {year}
            </span>
            <div className="flex gap-1">
              <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">
            {['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'].map(d => (
              <div key={d}>{t(`restaurant.${d}`)}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map(day => {
              const cellDate = new Date(year, monthIndex, day);
              const cellTime = cellDate.getTime();
              
              const isStart = refStart === cellTime;
              const isEnd = refEnd === cellTime;
              const isInRange = refStart && refEnd && cellTime > refStart && cellTime < refEnd;
              
              let classes = 'h-9 w-full flex items-center justify-center text-xs font-bold rounded-xl transition-all cursor-pointer ';
              if (isStart || isEnd) {
                classes += 'bg-merkez-blue text-white shadow-lg shadow-merkez-blue/20';
              } else if (isInRange) {
                classes += 'bg-blue-50 text-merkez-blue';
              } else {
                classes += 'text-gray-700 hover:bg-gray-100';
              }

              return (
                <div 
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={classes}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
            <button 
              onClick={() => {
                setTempStart('');
                setTempEnd('');
              }}
              className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
            >
              {t('restaurant.clear') || 'Clear'}
            </button>
            <button 
              onClick={() => {
                onChange(tempStart, tempEnd);
                setIsOpen(false);
              }}
              className="bg-merkez-blue text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-merkez-blue/20 hover:bg-blue-600 transition-all active:scale-95"
            >
              {t('restaurant.applyRange') || 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
