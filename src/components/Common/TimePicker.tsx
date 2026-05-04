import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  position?: 'top' | 'bottom';
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label, position = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const [hours, minutes] = value ? value.split(':') : ['10', '00'];

  const hoursList = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHourSelect = (h: string) => {
    onChange(`${h}:${minutes}`);
  };

  const handleMinuteSelect = (m: string) => {
    onChange(`${hours}:${m}`);
    setIsOpen(false); // Close after selecting minutes for better UX
  };

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
        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-gray-900 flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          <span>{value || '10:00'}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 right-0 bg-white rounded-3xl shadow-2xl border border-gray-100 z-[600] p-4 flex gap-4 animate-in zoom-in-95 fade-in duration-200 ${position === 'top' ? 'origin-bottom' : 'origin-top'} overflow-hidden`}>
          <div className="flex-1 max-h-48 overflow-y-auto no-scrollbar scroll-smooth">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Hour</div>
            <div className="space-y-1">
              {hoursList.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleHourSelect(h)}
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
                  onClick={() => handleMinuteSelect(m)}
                  className={`w-full py-2 px-3 rounded-xl text-sm font-bold transition-all ${minutes === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-gray-50 text-gray-600'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
