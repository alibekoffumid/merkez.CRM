import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  position?: 'top' | 'bottom';
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label, position = 'bottom' }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use state for the calendar view date (independent of selected value)
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  
  // Ensure viewDate updates if value changes and modal is closed
  useEffect(() => {
    if (!isOpen && value) {
      setViewDate(new Date(value));
    }
  }, [value, isOpen]);

  const selectedDate = value ? new Date(value) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    // We can use i18n for months if needed, but manual formatting is more reliable for simple UI
    const day = date.getDate();
    const month = months[date.getMonth()];
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
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 pl-12 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900 text-left relative group"
      >
        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
        <span className="font-black tracking-tight">
          {selectedDate ? getDisplayDate(selectedDate) : 'Select Date'}
        </span>
      </button>

      {isOpen && (
        <div className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 w-[320px] z-[600] animate-in zoom-in-95 fade-in duration-200 ${position === 'top' ? 'origin-bottom' : 'origin-top'}`}>
          <div className="flex items-center justify-between mb-6">
            <button type="button" onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-sm font-black text-gray-900 uppercase tracking-tight">
              {t(`common.months.${['january','february','march','april','may','june','july','august','september','october','november','december'][viewDate.getMonth()]}`)} {viewDate.getFullYear()}
            </span>
            <button type="button" onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
          
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
        </div>
      )}
    </div>
  );
};

export default DatePicker;
