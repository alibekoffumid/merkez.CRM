import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const mockTransactions = [
  { id: 'TRX-1029', date: '2026-04-01', description: 'Monthly Cloud Hosting', amount: -650.00, status: 'Completed', type: 'expense' },
  { id: 'TRX-1030', date: '2026-04-02', description: 'Acme Corp Subscription', amount: 1200.00, status: 'Completed', type: 'income' },
  { id: 'TRX-1031', date: '2026-04-02', description: 'Office Supplies', amount: -145.50, status: 'Pending', type: 'expense' },
  { id: 'TRX-1032', date: '2026-04-02', description: 'Consulting Session', amount: 500.00, status: 'Completed', type: 'income' },
];

const FinanceModule = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('sidebar.finance')}</h1>
          <p className="text-sm text-gray-500 mt-1">Track your revenue, expenses, and overall financial health.</p>
        </div>
        <button className="bg-white border text-gray-600 border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Balance Cards */}
         <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 flex items-start justify-between">
            <div>
               <p className="text-sm text-gray-500 font-medium">Total Balance</p>
               <h3 className="text-3xl font-bold text-gray-900 mt-2">$124,500.00</h3>
               <span className="inline-flex items-center text-sm font-medium text-merkez-green mt-2">
                 <TrendingUp className="w-4 h-4 mr-1" /> +2.5% vs last month
               </span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50">
               <DollarSign className="w-6 h-6 text-merkez-blue" />
            </div>
         </div>
         
         <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 flex items-start justify-between">
            <div>
               <p className="text-sm text-gray-500 font-medium">Monthly Income</p>
               <h3 className="text-3xl font-bold text-gray-900 mt-2">$45,200.00</h3>
               <span className="inline-flex items-center text-sm font-medium text-merkez-green mt-2">
                 <TrendingUp className="w-4 h-4 mr-1" /> +14.2% vs last month
               </span>
            </div>
            <div className="p-3 rounded-xl bg-green-50">
               <TrendingUp className="w-6 h-6 text-merkez-green" />
            </div>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 flex items-start justify-between">
            <div>
               <p className="text-sm text-gray-500 font-medium">Monthly Expenses</p>
               <h3 className="text-3xl font-bold text-gray-900 mt-2">$18,450.00</h3>
               <span className="inline-flex items-center text-sm font-medium text-merkez-red mt-2">
                 <TrendingDown className="w-4 h-4 mr-1" /> -1.5% vs last month
               </span>
            </div>
            <div className="p-3 rounded-xl bg-red-50">
               <TrendingDown className="w-6 h-6 text-merkez-red" />
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <button className="text-sm font-medium text-merkez-blue hover:text-blue-700 transition-colors">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                <th className="font-medium p-4">Transaction ID</th>
                <th className="font-medium p-4">Date</th>
                <th className="font-medium p-4">Description</th>
                <th className="font-medium p-4">Status</th>
                <th className="font-medium p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockTransactions.map(trx => (
                <tr key={trx.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 text-sm font-medium text-gray-500">{trx.id}</td>
                  <td className="p-4 text-sm text-gray-600">{trx.date}</td>
                  <td className="p-4 font-medium text-gray-900">{trx.description}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trx.status === 'Completed' ? 'bg-green-100 text-merkez-green' : 'bg-yellow-100 text-merkez-yellow'}`}>
                      {trx.status}
                    </span>
                  </td>
                  <td className={`p-4 text-right font-medium ${trx.type === 'income' ? 'text-merkez-green' : 'text-gray-900'}`}>
                    {trx.type === 'income' ? '+' : ''}{trx.amount < 0 ? `-$${Math.abs(trx.amount).toFixed(2)}` : `$${trx.amount.toFixed(2)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceModule;
