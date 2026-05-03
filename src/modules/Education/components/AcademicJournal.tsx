import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Search, User, Book, CheckCircle, XCircle, MoreVertical, Star, TrendingUp } from 'lucide-react';
import { useEducation } from '../hooks/useEducation';

const AcademicJournal = () => {
  const { t } = useTranslation();
  const { students, courses } = useEducation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');

  const filteredStudents = students?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCourse === 'all' || s.education_courses?.id === selectedCourse)
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">{t('education.tabJournal')}</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Track attendance, grades, and exam results</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm focus:border-blue-500 outline-none transition-all text-sm font-bold"
            />
          </div>
          <select 
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full sm:w-48 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm focus:border-blue-500 outline-none transition-all text-sm font-bold appearance-none"
          >
            <option value="all">All Programs</option>
            {courses?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Lessons</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Exams</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Average</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student: any) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm">
                          {student.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500 font-medium">{student.education_courses?.title || 'No course'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="flex -space-x-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`w-6 h-6 rounded-lg border-2 border-white flex items-center justify-center ${i < 4 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                              {i < 4 ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs font-black text-gray-400 ml-2">80%</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        {[8, 9, 7].map((grade, i) => (
                          <div key={i} className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-black text-gray-700 hover:border-blue-200 hover:text-blue-600 cursor-pointer transition-all">
                            {grade}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center">
                        <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-black border border-purple-100">
                          92 / 100
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-16 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 w-4/5 rounded-full" />
                        </div>
                        <span className="text-sm font-black text-blue-600">8.4</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold">No data in journal</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group">
          <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-700" />
          <h3 className="text-sm font-black uppercase tracking-widest opacity-80 mb-2">Average Score</h3>
          <p className="text-4xl font-black">8.2 / 10</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1.5 rounded-full">
            <Star className="w-3 h-3 fill-current" /> +12% from last month
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Total Attendance</h3>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-black text-gray-900">94%</p>
            <span className="text-emerald-500 text-sm font-bold mb-1">Excellent</span>
          </div>
          <div className="mt-6 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[94%] rounded-full" />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Next Exam Session</h3>
          <p className="text-xl font-black text-gray-900">May 20 - May 25</p>
          <p className="text-sm text-gray-500 mt-2 font-medium">12 students registered</p>
          <button className="mt-6 w-full py-3 bg-gray-50 text-gray-900 rounded-xl text-sm font-black hover:bg-gray-100 transition-all">
            Manage Exams
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcademicJournal;
