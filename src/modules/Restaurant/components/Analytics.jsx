import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, DollarSign, Award, ArrowUpRight, CheckCircle2, BarChart3, Calendar as CalendarIcon, Download, PieChart, Activity, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { ReportService } from '../../../services/ReportService';
import Dropdown from '../../../components/Common/Dropdown';

const monthsList = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const Analytics = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('Today');
  const [chartData, setChartData] = useState([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Real stats state
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalSalaries: 0,
    netProfit: 0,
    totalOrders: 0,
    tablesServed: 0,
    activeWaiters: 0,
    revenueGrowth: 0,
    orderGrowth: 0
  });

  const [reportData, setReportData] = useState([]); // Raw items for PDF

  const [waiterStats, setWaiterStats] = useState([]);
  const [tableStats, setTableStats] = useState([]);
  
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [clickStep, setClickStep] = useState(0);

  const [expenseForm, setExpenseForm] = useState({
    category: 'Rent',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, rangeStart, rangeEnd]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Calculate time filters
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      if (timeRange === t('restaurant.yesterday')) {
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
      } else if (timeRange === t('restaurant.thisWeek')) {
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
      } else if (timeRange === t('restaurant.thisMonth')) {
        startDate.setDate(1);
      } else if (timeRange === t('restaurant.customRange') && rangeStart && rangeEnd) {
        startDate = new Date(rangeStart.y, rangeStart.m, rangeStart.d, 0, 0, 0);
        endDate = new Date(rangeEnd.y, rangeEnd.m, rangeEnd.d, 23, 59, 59);
      }

      // 2. Fetch Orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*, restaurant_tables(number, type)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // 3. Fetch Staff
      const { count: staffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });

      if (!orders) {
        setStats({ totalRevenue: 0, totalOrders: 0, tablesServed: 0, activeWaiters: staffCount || 0, revenueGrowth: 0, orderGrowth: 0 });
        setChartData(generateHourlyBuckets([]));
        setWaiterStats([]);
        setTableStats([]);
        return;
      }

      // 4. Process Stats
      const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
      const totalOrders = orders.length;
      const uniqueTables = new Set(orders.map(o => o.table_id)).size;

      setStats({
        totalRevenue,
        totalOrders,
        tablesServed: uniqueTables,
        activeWaiters: staffCount || 0,
        revenueGrowth: 0, // Simplified for now
        orderGrowth: 0
      });

      // 5. Process Hourly Chart
      setChartData(generateHourlyBuckets(orders));

      // 6. Process Waiter Leaderboard (using 'waiter' string from table if no direct staff link)
      const waiterMap = {};
      orders.forEach(o => {
        const waiterName = o.waiter_name || 'Staff'; // Fallback if we add waiter_name to orders
        if (!waiterMap[waiterName]) waiterMap[waiterName] = { name: waiterName, tables: new Set(), orders: 0, revenue: 0 };
        waiterMap[waiterName].orders += 1;
        waiterMap[waiterName].revenue += parseFloat(o.total_amount || 0);
        waiterMap[waiterName].tables.add(o.table_id);
      });

      setWaiterStats(Object.values(waiterMap).map(w => ({
        id: w.name,
        name: w.name,
        tablesServed: w.tables.size,
        ordersTaken: w.orders,
        revenue: w.revenue
      })));

      // 7. Process Table Leaderboard
      const tableMap = {};
      orders.forEach(o => {
        const tableName = o.restaurant_tables?.number || 'Unknown';
        const type = o.restaurant_tables?.type || 'Table';
        if (!tableMap[tableName]) tableMap[tableName] = { name: tableName, type, seatings: 0, guests: 0, revenue: 0 };
        tableMap[tableName].seatings += 1;
        tableMap[tableName].revenue += parseFloat(o.total_amount || 0);
        // We could fetch guests from customers count or order metadata if available
      });

      setTableStats(Object.values(tableMap).map(t => ({
        id: t.name,
        name: t.name,
        type: t.type,
        seatings: t.seatings,
        guestsTotal: 0, // Placeholder
        revenue: t.revenue,
        avgTurnover: '---'
      })));

      // 8. Fetch Business Expenses
      const { data: businessExpenses } = await supabase
        .from('business_expenses')
        .select('*')
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0]);

      // 9. Fetch Staff Payments
      const { data: staffPayments } = await supabase
        .from('staff_payments')
        .select('*')
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .lte('payment_date', endDate.toISOString().split('T')[0]);

      const totalExp = (businessExpenses || []).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const totalSalaries = (staffPayments || []).reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
      const totalRevenueValue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

      setStats(prev => ({
        ...prev,
        totalRevenue: totalRevenueValue,
        totalExpenses: totalExp,
        totalSalaries: totalSalaries,
        netProfit: totalRevenueValue - (totalExp + totalSalaries),
        totalOrders: orders.length,
        tablesServed: new Set(orders.map(o => o.table_id)).size,
        activeWaiters: staffCount || 0
      }));

      // 10. Prepare raw items for PDF report
      const allItems = [
        ...orders.map(o => ({
          date: new Date(o.created_at).toLocaleDateString(),
          category: 'Order Income',
          description: `Table ${o.restaurant_tables?.number || '?'}, Waiter: ${o.waiter_name || 'Staff'}`,
          amount: parseFloat(o.total_amount || 0),
          type: 'income'
        })),
        ...(businessExpenses || []).map(e => ({
          date: e.expense_date,
          category: e.category,
          description: e.description || 'Operating Expense',
          amount: parseFloat(e.amount || 0),
          type: 'expense'
        })),
        ...(staffPayments || []).map(s => ({
          date: s.payment_date,
          category: 'Salary',
          description: 'Staff Payout',
          amount: parseFloat(s.amount || 0),
          type: 'expense'
        }))
      ].sort((a,b) => new Date(b.date) - new Date(a.date));

      setReportData(allItems);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.amount) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('business_expenses').insert([{
        ...expenseForm,
        user_id: user.id
      }]);

      if (!error) {
        setIsExpenseModalOpen(false);
        setExpenseForm({ 
          category: 'Rent', 
          amount: '', 
          description: '', 
          expense_date: new Date().toISOString().split('T')[0] 
        });
        fetchDashboardData();
      } else {
        console.error('Error adding expense:', error);
        alert('Error: ' + error.message);
      }
    } catch (err) {
      console.error('Add expense error:', err);
    }
  };

  const handleDownloadPDF = async () => {
    setGeneratingPDF(true);
    try {
      // 1. Fetch Profile info for branding
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert(t('auth.sessionExpired'));
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, address')
        .eq('id', user.id)
        .single();

      const data = {
        totalIncome: stats?.totalRevenue || 0,
        totalExpenses: stats?.totalExpenses || 0,
        totalSalaries: stats?.totalSalaries || 0,
        netProfit: stats?.netProfit || 0,
        items: reportData || []
      };

      const reportTranslations = {
        title: profile?.business_name || 'Merkez CRM Report',
        period: t('common.period') || 'Period',
        generated: t('common.generated') || 'Generated',
        summaryTitle: t('restaurant.performanceDashboard').toUpperCase(),
        income: t('restaurant.totalRevenue'),
        expenses: t('restaurant.totalExpenses'),
        salaries: t('restaurant.salariesPaid'),
        netProfit: t('restaurant.netProfit'),
        thDate: t('finance.thDate'),
        thCategory: t('common.category'),
        thDesc: t('finance.thDesc'),
        thAmount: t('common.price'),
        currencySymbol: '$',
        incomeType: t('restaurant.revenue'),
        expenseType: t('finance.expenses'),
        salaryType: t('restaurant.salariesPaid')
      };

      const dateStr = timeRange === t('restaurant.customRange') ? buttonText : timeRange;
      const success = ReportService.generateFinancialReport(data, dateStr, {
        businessName: profile?.business_name || 'Merkez CRM Member',
        address: profile?.address || ''
      }, reportTranslations);
      
      if (!success) {
        console.error('Failed to generate report via Service');
      }
    } catch (err) {
      console.error('Report Generation Error:', err);
      alert('Could not download report: ' + err.message);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const generateHourlyBuckets = (orders) => {
    const buckets = {};
    // Full 24-hour cycle for precision
    for (let i = 0; i < 24; i++) {
      buckets[`${i}:00`] = 0;
    }

    orders.forEach(o => {
      const hour = new Date(o.created_at).getHours();
      const bucketKey = `${hour}:00`;
      if (buckets.hasOwnProperty(bucketKey)) {
        buckets[bucketKey] += parseFloat(o.total_amount || 0);
      }
    });

    // Only show hours that have data or a reasonable window for a restaurant (e.g., 08:00 - 02:00)
    // But to be "Real", let's show the whole day or at least where activity is
    return Object.entries(buckets).map(([time, revenue]) => ({ time, revenue }));
  };

  const maxRevenue = chartData.length ? Math.max(...chartData.map(d => d.revenue)) : 0;
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
    setTimeRange(t('restaurant.customRange'));
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
     : (rangeStart ? `${formatBtnDate(rangeStart)}, ${rangeStart.y} (${t('common.selectEndDate') || 'Select end date'})` : t('common.selectDateRange'));"}

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
                    <span className="text-sm font-bold text-gray-900">
                      {t(`restaurant.${monthsList[monthIndex].toLowerCase()}`)} {year}
                    </span>
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

            <button 
               onClick={() => setIsExpenseModalOpen(true)}
               className="flex items-center bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-4 py-2 hover:bg-gray-50 transition-all font-bold shadow-sm active:scale-95"
            >
               <Plus className="w-4 h-4 mr-2 text-merkez-blue" />
               {t('common.add')} {t('finance.expenses')}
            </button>

            <button 
               onClick={handleDownloadPDF}
               className="flex items-center bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-4 py-2 hover:bg-black transition-all font-bold shadow-lg active:scale-95"
            >
               <Download className="w-4 h-4 mr-2" />
               {t('restaurant.downloadReport')}
            </button>

            <Dropdown 
               value={timeRange}
               onChange={(val) => setTimeRange(val)}
               options={[
                 { value: 'Today', label: t('restaurant.today') },
                 { value: 'Yesterday', label: t('restaurant.yesterday') },
                 { value: 'This Week', label: t('restaurant.thisWeek') },
                 { value: 'This Month', label: t('restaurant.thisMonth') },
                 { value: 'Custom Range...', label: t('restaurant.customRange') }
               ]}
               className="w-48"
            />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-500 mb-1">{t('restaurant.totalRevenue')}</p>
               <h3 className="text-2xl font-bold text-gray-900">${(stats?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
               <p className="text-xs text-green-600 flex items-center mt-1 font-medium"><ArrowUpRight className="w-3 h-3 mr-1"/> {stats?.revenueGrowth || 0}% {t('restaurant.fromYesterday')}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-merkez-green">
               <DollarSign className="w-6 h-6" />
            </div>
         </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-500 mb-1">{t('restaurant.totalExpenses')}</p>
               <h3 className="text-2xl font-bold text-gray-900">${(stats?.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
               <p className="text-xs text-red-500 flex items-center mt-1 font-medium">{t('restaurant.businessExpenses')}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
               <PieChart className="w-6 h-6" />
            </div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-500 mb-1">{t('restaurant.netProfit')}</p>
               <h3 className={`text-2xl font-bold ${(stats?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                 ${(stats?.netProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
               </h3>
               <p className="text-xs text-gray-400 mt-1 font-medium italic">{t('dashboard.overview')}</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.netProfit >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'}`}>
               <Activity className="w-6 h-6" />
            </div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-gray-500 mb-1">{t('restaurant.salariesPaid')}</p>
               <h3 className="text-2xl font-bold text-gray-900">${(stats?.totalSalaries || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
               <p className="text-xs text-gray-400 mt-1">{t('restaurant.rankedByRevenue')}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-merkez-blue">
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
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  {t('restaurant.peakHour')}: {peakHourObj?.revenue > 0 ? peakHourObj.time : '---'}
                </p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">${(peakHourObj?.revenue || 0).toFixed(2)}</p>
            </div>
         </div>
         
          <div className="w-full pt-10 -mt-6">
            <div className="flex items-end gap-1 sm:gap-2 h-52 border-b border-gray-100 pb-2 w-full">
               {chartData.map((d, index) => {
                  const heightPercent = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center group relative h-full">
                       {/* Tooltip on hover */}
                       <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded-md whitespace-nowrap pointer-events-none transition-opacity z-10 shadow-lg">
                         ${d.revenue.toFixed(2)}
                         <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                       </div>
                       {/* Bar Line bg */}
                       <div className="w-full h-full bg-blue-50/30 rounded-t-lg relative flex items-end overflow-hidden hover:bg-blue-100/50 transition-colors">
                          {/* Animated Bar fill */}
                          <div 
                            className="w-full bg-blue-600 rounded-t-lg transition-all duration-700 ease-out" 
                            style={{ height: `${heightPercent}%`, minHeight: d.revenue > 0 ? '4px' : '0' }}
                          />
                       </div>
                       <span className="text-[9px] text-gray-400 font-bold mt-3 transform -rotate-45 sm:rotate-0 hidden sm:block">{d.time}</span>
                    </div>
                  );
               })}
            </div>
            {/* Mobile labels - separate row to avoid overlap if too many */}
            <div className="flex justify-between mt-2 sm:hidden px-2">
               <span className="text-[9px] text-gray-400 font-bold">0:00</span>
               <span className="text-[9px] text-gray-400 font-bold">12:00</span>
               <span className="text-[9px] text-gray-400 font-bold">23:00</span>
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
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '400px' }}>
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
                {waiterStats.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400 text-sm">{t('common.noData')}</td></tr>
                ) : waiterStats
                    .filter(w => w.name !== 'Staff') // Hide fallback staff
                    .sort((a,b) => b.revenue - a.revenue)
                    .map((waiter, idx) => (
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
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '400px' }}>
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
                {tableStats.length === 0 ? (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400 text-sm">{t('common.noData')}</td></tr>
                ) : tableStats.sort((a,b) => b.revenue - a.revenue).map((table, idx) => (
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

      {/* Expense Modal */}
      {isExpenseModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute -inset-10 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setIsExpenseModalOpen(false)}
          />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-10" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <h3 className="text-xl font-bold text-gray-900">{t('finance.addTransaction')}</h3>
               <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('common.category')}</label>
                    <Dropdown 
                      value={expenseForm.category}
                      onChange={val => setExpenseForm({...expenseForm, category: val})}
                      options={[
                        { value: 'Rent', label: t('finance.rent') },
                        { value: 'Utilities', label: t('finance.utilities') },
                        { value: 'Supplies', label: t('finance.supplies') },
                        { value: 'Marketing', label: t('finance.marketing') },
                        { value: 'Other', label: t('finance.other') }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('common.price')}</label>
                    <input 
                      type="number"
                      value={expenseForm.amount}
                      onChange={e => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value) || ''})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-merkez-blue"
                      placeholder="0.00"
                    />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('finance.thDesc')}</label>
                  <textarea 
                    value={expenseForm.description}
                    onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-merkez-blue h-24 resize-none"
                    placeholder="E.g. Electricity bill for March"
                  />
               </div>
               <button 
                 onClick={handleAddExpense}
                 className="w-full bg-merkez-blue text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all active:scale-95"
               >
                 {t('common.save')}
               </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Analytics;
