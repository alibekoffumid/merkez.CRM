import React from 'react';
import { Award, TrendingUp } from 'lucide-react';

const ProgressTracker = () => {
  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Student Progress</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Track performance levels and academic achievements</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Sample Progress Row */}
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-lg group-hover:scale-105 transition-transform">
            AJ
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 text-base">Aysel Jafarova</h4>
            <p className="text-xs font-medium text-gray-500">Classical Piano</p>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Level</p>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> Grade 4
              </span>
            </div>
            
            <div className="w-40">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-500 font-medium">Semester Progress</span>
                <span className="font-black text-gray-900">75%</span>
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-3/4 rounded-full"></div>
              </div>
            </div>
            
            <button className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors">
              <TrendingUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;
