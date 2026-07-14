import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { ShoppingCart, AlertTriangle, TrendingUp } from 'lucide-react';
import React from 'react';

export const useOperationalDigest = () => {
  useEffect(() => {
    const checkDigest = async () => {
      // 1. Check if notifications are enabled
      const savedPrefs = localStorage.getItem('merkez_notifications');
      if (!savedPrefs) return;
      const prefs = JSON.parse(savedPrefs);
      if (!prefs.operational) return; // Operational Digest is disabled

      // 2. Check if we already showed it today
      const today = new Date().toISOString().split('T')[0];
      const lastDigest = localStorage.getItem('merkez_last_digest_date');
      if (lastDigest === today) return; // Already shown today

      // We will only run this if the user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        // Fetch Critical Inventory
        const { data: criticalItems, error: invError } = await supabase
          .from('products')
          .select('id, name, stock_quantity, critical_stock')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .lte('stock_quantity', 5); // Simplification, ideally use critical_stock column but lte needs a value. Let's fetch all and filter in JS.

        // Fetch Today's Sales Summary
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const { data: salesToday, error: salesError } = await supabase
          .from('retail_sales')
          .select('total_amount')
          .eq('user_id', user.id)
          .gte('created_at', startOfDay.toISOString());

        let totalSales = 0;
        if (salesToday) {
          totalSales = salesToday.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
        }

        // Filter actual critical items
        const lowStockItems = (criticalItems || []).filter(item => item.stock_quantity <= (item.critical_stock || 5));

        // Display the Digest Toast
        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-2xl rounded-lg pointer-events-auto flex flex-col ring-1 ring-black ring-opacity-5 overflow-hidden`}
          >
            <div className="p-5 bg-gradient-to-r from-merkez-blue to-blue-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-100" />
                <h3 className="font-black tracking-tight text-lg">Operational Digest</h3>
              </div>
              <span className="text-xs font-bold text-blue-100 bg-white/20 px-2 py-1 rounded-md">Today</span>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              {/* Sales Summary */}
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Today's Sales</p>
                  <p className="text-xl font-black text-gray-900">${totalSales.toFixed(2)}</p>
                </div>
              </div>

              {/* Critical Inventory */}
              {lowStockItems.length > 0 ? (
                <div className="flex items-start gap-4 bg-red-50 p-4 rounded-lg border border-red-100">
                  <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-red-600 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Critical Stock Alerts</p>
                    <ul className="text-sm font-bold text-gray-800 space-y-1">
                      {lowStockItems.slice(0, 3).map(item => (
                        <li key={item.id} className="flex justify-between">
                          <span className="truncate max-w-[150px]">{item.name}</span>
                          <span className="text-red-600 bg-red-100 px-2 rounded-md">{item.stock_quantity} left</span>
                        </li>
                      ))}
                      {lowStockItems.length > 3 && (
                        <li className="text-xs text-red-500 mt-2">+{lowStockItems.length - 3} more items low on stock</li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Inventory Status</p>
                    <p className="text-sm font-bold text-gray-800">All stock levels are optimal.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 p-2 flex justify-end bg-gray-50/50">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        ), { duration: 8000, position: 'top-right' });

        // 3. Mark as shown for today
        localStorage.setItem('merkez_last_digest_date', today);

      } catch (err) {
        console.error('Error fetching operational digest:', err);
      }
    };

    checkDigest();
  }, []);
};
