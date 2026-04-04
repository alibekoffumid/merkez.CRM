import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, DollarSign, Award, ArrowUpRight, CheckCircle2, BarChart3, Calendar as CalendarIcon } from 'lucide-react';

const waiterStats = [
  { id: 1, name: 'Alice Walker', tablesServed: 14, ordersTaken: 42, revenue: 1450.00, rating: 4.9 },
  { id: 2, name: 'Bob Harris', tablesServed: 12, ordersTaken: 38, revenue: 1120.50, rating: 4.7 },
  { id: 3, name: 'Charlie Dean', tablesServed: 18, ordersTaken: 55, revenue: 2100.00, rating: 4.8 },
  { id: 4, name: 'Diana King', tablesServed: 8, ordersTaken: 21, revenue: 890.00, rating: 4.6 },
];

const tableStats = [
  { id: 1, name: 'V1', type: 'VIP Cabin', seatings: 3, guestsTotal: 12, revenue: 850.00, avgTurnover: '1h 45m' },
  { id: 2, name: 'V2', type: 'VIP Cabin', seatings: 2, guestsTotal: 8, revenue: 640.00, avgTurnover: '2h 10m' },
  { id: 3, name: 'T6', type: 'Table', seatings: 5, guestsTotal: 34, revenue: 1250.00, avgTurnover: '45m' },
  { id: 4, name: 'T2', type: 'Table', seatings: 6, guestsTotal: 22, revenue: 810.50, avgTurnover: '55m' },
  { id: 5, name: 'T4', type: 'Table', seatings: 4, guestsTotal: 16, revenue: 420.00, avgTurnover: '50m' },
];

const monthsList = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const generateRandomHourlyData = () => {
  const data = [];
  const startHour = 10;
  for(let i=0; i<13; i++) {
    const hour = startHour + i;
    const base = (hour >= 18 && hour <= 21) ? 1200 : 200;
    const random = Math.floor(Math.random() * 1500);
    data.push({
      time: `${hour}:00`,
      revenue: base + random
    });
  }
  return data;
};

const Analytics = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('Today');
  const [chartData, setChartData] = useState([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [monthIndex, setMonthIndex] = useState(3);
  const [year, setYear] = useState(2026);

  const [rangeStart, setRangeStart] = useState({ d: 5, m: 3, y: 2026 });
  const [rangeEnd, setRangeEnd] = useState({ d: 25, m: 3, y: 2026 });
  const [clickStep, setClickStep] = useState(0);

  useEffect(() => {
    setChartData(generateRandomHourlyData());
  }, [timeRange, rangeStart, rangeEnd]);

  const maxRevenue = chartData.length ? Math.max(...chartData.map(d => d.revenue)) : 1;
  const peakHourObj = chartData.find(d => d.revenue === maxRevenue);

  const prevMonth = () => {
    if (monthIndex === 0) {
       setMonthIndex(11);
       setYear(y => y - 1);
    } else {
       setMonthIndex(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (monthIndex === 11) {
       setMonthIndex(0);
       setYear(y => y + 1);
    } else {
       setMonthIndex(m => m + 1);
    }
  };

  const handleDateClick = (day) => {
    const clickedTime = new Date(year, monthIndex, day).getTime();
    
    if (clickStep === 0) {
      setRangeStart({ d: day, m: monthIndex, y: year });
      setRangeEnd(null);
      setClickStep(1);
    } else {
      const startTime = new Date(rangeStart.y, rangeStart.m, rangeStart.d).getTime();
      if (clickedTime < startTime) {
        setRangeStart({ d: day, m: monthIndex, y: year });
        setRangeEnd(null);
        setClickStep(1);
      } else {
        setRangeEnd({ d: day, m: monthIndex, y: year });
        setClickStep(0);
      }
    }
    setTimeRange('Custom Range...');
  };

  const getDaysInMonth = (m, y) => {
     if (m === 1) return (y % 4 === 0) ? 29 : 28;
     return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
  };
  const daysInCurrentMonth = getDaysInMonth(monthIndex, year);

  const refStart = rangeStart ? new Date(rangeStart.y, rangeStart.m, rangeStart.d).getTime() : null;
  const refEnd = rangeEnd ? new Date(rangeEnd.y, rangeEnd.m, rangeEnd.d).getTime() : null;

  const formatBtnDate = (dObj) => dObj ? `${monthsList[dObj.m].slice(0,3)} ${String(dObj.d).padStart(2,'0')}` : '';
  const buttonText = rangeEnd 
     ? `${formatBtnDate(rangeStart)} - ${formatBtnDate(rangeEnd)}, ${rangeEnd.y}`
     : (rangeStart ? `${formatBtnDate(rangeStart)}, ${rangeStart.y} (${t('restaurant.selectEndDate')})` : t('restaurant.selectDateRange'));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
         <div>
            <h2 className="text-lg font-bold text-gray-900">{t('restaurant.performanceDashboard')}</h2>
            <p className="text-sm text-gray-500">{t('restaurant.performanceDesc')}</p>
         </div>
         <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="flex items-center bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors font-medium shadow-sm"
              >
                 <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                 {buttonText}
              </button>
              
              {isCalendarOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 mt-2 w-[310px] sm:w-[320px] bg-white border border-gray-100 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] z-50 p-4 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-gray-900">{t(`restaurant.${monthsList[monthIndex].toLowerCase()}`)} {year}</span>
                    <div className="flex gap-1">
                      <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors">&lt;</button>
                      <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors">&gt;</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                     <div>{t('restaurant.mo')}</div><div>{t('restaurant.tu')}</div><div>{t('restaurant.we')}</div><div>{t('restaurant.th')}</div><div>{t('restaurant.fr')}</div><div>{t('restaurant.sa')}</div><div>{t('restaurant.su')}</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                     <div className="p-1"></div>
                     <div className="p-1"></div>
                     
                     {Array.from({length: daysInCurrentMonth}, (_, i) => i + 1).map(day => {
                        const cellTime = new Date(year, monthIndex, day).getTime();
                        
                        const isStart = refStart === cellTime;
                        const isEnd = refEnd === cellTime;
                        const isEnds = isStart || isEnd;
                        const isSelectedRange = refStart && refEnd && cellTime >= refStart && cellTime <= refEnd;
                        const isSingleSelected = isStart && !refEnd;
                        
                        let cellClasses = 'hover:bg-gray-100 text-gray-700 font-medium';
                        
                        if (isEnds || isSingleSelected) {
                           cellClasses = 'bg-merkez-blue text-white font-bold shadow-md shadow-blue-200';
                        } else if (isSelectedRange) {
                           cellClasses = 'bg-blue-50 text-merkez-blue font-semibold';
                        }
                        
                        return (
                          <div 
                             key={day} 
                             onClick={() => handleDateClick(day)}
                             className={`h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${cellClasses}`}
                          >
                             {day}
                          </div>
                        );
                     })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
                     <button 
                       onClick={() => {
                          setRangeStart(null);
                          setRangeEnd(null);
                          setClickStep(0);
                       }} 
                       className="px-4 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-red-500 rounded-lg transition-colors mr-auto"
                     >
                       {t('restaurant.clear')}
                     </button>
                     <button 
                       onClick={() => setIsCalendarOpen(false)} 
                       className="px-4 py-1.5 text-xs font-bold bg-merkez-blue text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
                     >
                       {t('restaurant.applyRange')}
                     </button>
                  </div>
                </div>
              )}
            </div>

            <select 
               value={timeRange}
               onChange={(e) => setTimeRange(e.target.value)}
               className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-merkez-green font-medium cursor-pointer shadow-sm"
            >
               <option>{t('restaurant.today')}</option>
               <option>{t('restaurant.yesterday')}</option>
               <option>{t('restaurant.thisWeek')}</option>
               <option>{t('restaurant.thisMonth')}</option>
               <option>{t('restaurant.customRange')}</option>
            </select>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-500 mb-1">{t('restaurant.totalRevenue')}</p>
               <h3 className="text-2xl font-bold text-gray-900">$5,560.50</h3>
               <p className="text-xs text-green-600 flex items-center mt-1 font-medium"><ArrowUpRight className="w-3 h-3 mr-1"/> +14.5% {t('restaurant.fromYesterday')}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-merkez-green">
               <DollarSign className="w-6 h-6" />
            </div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-500 mb-1">{t('restaurant.totalOrders')}</p>
               <h3 className="text-2xl font-bold text-gray-900">156</h3>
               <p className="text-xs text-green-600 flex items-center mt-1 font-medium"><ArrowUpRight className="w-3 h-3 mr-1"/> +5.2% {t('restaurant.fromYesterday')}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-merkez-blue">
               <TrendingUp className="w-6 h-6" />
            </div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-500 mb-1">{t('restaurant.tablesServed')}</p>
               <h3 className="text-2xl font-bold text-gray-900">52</h3>
               <p className="text-xs text-gray-400 mt-1">{t('restaurant.totalSeatingsAcrossAllZones')}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center text-merkez-yellow">
               <CheckCircle2 className="w-6 h-6" />
            </div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-500 mb-1">{t('restaurant.activeWaiters')}</p>
               <h3 className="text-2xl font-bold text-gray-900">4</h3>
               <p className="text-xs text-gray-400 mt-1">{t('restaurant.currentlyTakingOrders')}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
               <Users className="w-6 h-6" />
            </div>
         </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
         <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
               <div className="w-8 h-8 rounded-full bg-blue-50 text-merkez-blue flex items-center justify-center mr-3">
                 <BarChart3 className="w-4 h-4" />
               </div>
               <div>
                 <h3 className="font-bold text-gray-900">{t('restaurant.revenueByHour')}</h3>
                 <p className="text-xs text-gray-500 mt-0.5">{t('restaurant.dynamicHourlySalesPerformance')}</p>
               </div>
            </div>
            <div className="text-right">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{t('restaurant.peakHour')}: {peakHourObj?.time}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">${(peakHourObj?.revenue || 0).toFixed(2)}</p>
            </div>
         </div>
         
         <div className="w-full overflow-x-auto pt-10 -mt-6 no-scrollbar">
            <div className="flex items-end gap-1.5 sm:gap-3 h-52 border-b border-gray-100 pb-2 min-w-min sm:min-w-0">
               {chartData.map((d, index) => {
                  const heightPercent = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center group relative min-w-[30px] h-full">
                       {/* Tooltip on hover */}
                       <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded-md whitespace-nowrap pointer-events-none transition-opacity z-10 shadow-lg">
                         ${d.revenue.toFixed(2)}
                         <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                       </div>
                       {/* Bar Line bg */}
                       <div className="w-full sm:w-8 h-full bg-blue-50/50 rounded-t-md relative flex items-end">
                          {/* Animated Bar fill */}
                          <div 
                            className="w-full bg-merkez-blue rounded-t-md transition-all duration-500 group-hover:bg-blue-600" 
                            style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                          />
                       </div>
                       <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium mt-3 whitespace-nowrap">{d.time}</span>
                    </div>
                  );
               })}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiter Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
             <h3 className="font-bold text-gray-900 flex items-center">
                <Award className="w-5 h-5 mr-2 text-merkez-blue" />
                {t('restaurant.waiterPerformance')}
             </h3>
             <span className="text-xs font-semibold text-merkez-blue bg-blue-50 px-2 py-1 rounded-md">{t('restaurant.rankedByRevenue')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase text-gray-500 tracking-wider">
                  <th className="font-semibold p-4">{t('restaurant.staff')}</th>
                  <th className="font-semibold p-4 text-center">{t('restaurant.tables')}</th>
                  <th className="font-semibold p-4 text-center">{t('restaurant.orders')}</th>
                  <th className="font-semibold p-4 text-right">{t('restaurant.revenueGenerated')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {waiterStats.sort((a,b) => b.revenue - a.revenue).map((waiter, idx) => (
                  <tr key={waiter.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-900 flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-merkez-blue flex items-center justify-center text-xs font-bold mr-3 border border-blue-200">
                        {waiter.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        {waiter.name}
                        {idx === 0 && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-sm uppercase font-bold">{t('restaurant.top')}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-semibold text-gray-700 text-center">{waiter.tablesServed}</td>
                    <td className="p-4 text-sm font-semibold text-gray-700 text-center">{waiter.ordersTaken}</td>
                    <td className="p-4 text-sm font-bold text-merkez-green text-right">${waiter.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table/Cabin Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
             <h3 className="font-bold text-gray-900 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-merkez-yellow" />
                {t('restaurant.topZones')}
             </h3>
             <span className="text-xs font-semibold text-merkez-yellow bg-yellow-50 px-2 py-1 rounded-md">{t('restaurant.rankedByRevenue')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase text-gray-500 tracking-wider">
                  <th className="font-semibold p-4">{t('restaurant.zoneTable')}</th>
                  <th className="font-semibold p-4 text-center">{t('restaurant.seatings')}</th>
                  <th className="font-semibold p-4 text-center">{t('restaurant.avgTime')}</th>
                  <th className="font-semibold p-4 text-right">{t('restaurant.revenue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tableStats.sort((a,b) => b.revenue - a.revenue).map((table, idx) => (
                  <tr key={table.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-900 flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${table.type === 'VIP Cabin' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                        {table.name}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{table.type === 'VIP Cabin' ? t('restaurant.vipCabin') : t('restaurant.table')}</span>
                        <span className="text-[11px] text-gray-500 mt-0.5">{table.guestsTotal} {t('restaurant.guestsTotal')}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-semibold text-gray-700 text-center">{table.seatings}x</td>
                    <td className="p-4 text-sm font-medium text-gray-500 text-center">{table.avgTurnover}</td>
                    <td className="p-4 text-sm font-bold text-gray-900 text-right">${table.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
