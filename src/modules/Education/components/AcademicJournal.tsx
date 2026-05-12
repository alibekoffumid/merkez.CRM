import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Search, CheckCircle, XCircle, MoreVertical, Star, TrendingUp, ChevronDown, Clock } from 'lucide-react';
import { useEducation } from '../hooks/useEducation';

const AcademicJournal = () => {
  const { t } = useTranslation();
  const { students, courses } = useEducation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);

  // Functional State mapped to localStorage
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [exams, setExams] = useState<Record<string, number>>({});

  useEffect(() => {
    const savedAtt = localStorage.getItem('academic_attendance');
    const savedGrades = localStorage.getItem('academic_grades');
    const savedExams = localStorage.getItem('academic_exams');
    if (savedAtt) setAttendance(JSON.parse(savedAtt));
    if (savedGrades) setGrades(JSON.parse(savedGrades));
    if (savedExams) setExams(JSON.parse(savedExams));
  }, []);

  const saveAttendance = (newAtt: Record<string, string>) => {
    setAttendance(newAtt);
    localStorage.setItem('academic_attendance', JSON.stringify(newAtt));
  };

  const saveGrades = (newGrades: Record<string, number>) => {
    setGrades(newGrades);
    localStorage.setItem('academic_grades', JSON.stringify(newGrades));
  };

  const saveExams = (newExams: Record<string, number>) => {
    setExams(newExams);
    localStorage.setItem('academic_exams', JSON.stringify(newExams));
  };

  const filteredStudents = students?.filter(s => {
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) &&
    (selectedCourse === 'all' || s.education_courses?.id === selectedCourse);
  }) || [];

  const handleAttendanceClick = (studentId: string, index: number) => {
    const key = `${studentId}_${index}`;
    const current = attendance[key] || 'present'; 
    let next = 'present';
    
    if (current === 'present') next = 'absent';
    else if (current === 'absent') next = 'late';
    else if (current === 'late') next = 'empty';
    else next = 'present';

    const newAtt = { ...attendance };
    if (next === 'empty') {
      delete newAtt[key];
    } else {
      newAtt[key] = next;
    }
    saveAttendance(newAtt);
  };

  const handleGradeClick = (studentId: string, index: number) => {
    const key = `${studentId}_${index}`;
    const current = grades[key] !== undefined ? grades[key].toString() : '';
    const newGrade = window.prompt(t('education.enterGrade', 'Qiymət daxil edin (1-10):'), current);
    
    if (newGrade !== null) {
      const num = parseInt(newGrade);
      const newGrades = { ...grades };
      if (!isNaN(num) && num >= 1 && num <= 10) {
        newGrades[key] = num;
      } else if (newGrade === '' || newGrade.trim() === '-') {
        delete newGrades[key];
      } else {
        alert(t('education.invalidGrade', 'Yanlış qiymət! 1-10 arası olmalıdır.'));
        return;
      }
      saveGrades(newGrades);
    }
  };

  const handleExamClick = (studentId: string) => {
    const current = exams[studentId] !== undefined ? exams[studentId].toString() : '';
    const newScore = window.prompt(t('education.enterExamScore', 'İmtahan nəticəsini daxil edin (0-100):'), current);
    
    if (newScore !== null) {
      const num = parseInt(newScore);
      const newExams = { ...exams };
      if (!isNaN(num) && num >= 0 && num <= 100) {
        newExams[studentId] = num;
      } else if (newScore === '' || newScore.trim() === '-') {
        delete newExams[studentId];
      } else {
        alert(t('education.invalidExamScore', 'Yanlış nəticə! 0-100 arası olmalıdır.'));
        return;
      }
      saveExams(newExams);
    }
  };

  const calculateStudentAverage = (studentId: string) => {
    const studentGrades = [0, 1, 2].map(i => grades[`${studentId}_${i}`]).filter(g => g !== undefined);
    const examScore = exams[studentId];
    
    if (studentGrades.length === 0 && examScore === undefined) return 0;
    
    let total = studentGrades.reduce((a, b) => a + b, 0);
    let count = studentGrades.length;
    
    if (examScore !== undefined) {
      total += (examScore / 10); // scale 100 to 10
      count += 1;
    }
    
    return Number((total / count).toFixed(1));
  };

  const calculateStudentAttendancePercent = (studentId: string) => {
    let presentCount = 0;
    let lateCount = 0;
    let totalAssigned = 0;

    for (let i = 0; i < 5; i++) {
      const status = attendance[`${studentId}_${i}`];
      if (status) {
        totalAssigned++;
        if (status === 'present') presentCount++;
        if (status === 'late') lateCount++;
      }
    }

    if (totalAssigned === 0) return 100;
    return Math.round(((presentCount + (lateCount * 0.5)) / totalAssigned) * 100);
  };

  // Global Stats
  const globalAverage = filteredStudents.length > 0 
    ? (filteredStudents.reduce((acc, s) => acc + calculateStudentAverage(s.id), 0) / filteredStudents.length).toFixed(1)
    : '0.0';

  const globalAttendance = filteredStudents.length > 0
    ? Math.round(filteredStudents.reduce((acc, s) => acc + calculateStudentAttendancePercent(s.id), 0) / filteredStudents.length)
    : 100;

  return (
    <div className="space-y-6">
      <div className="sticky top-20 z-30 bg-gray-50/95 backdrop-blur-md -mx-4 px-4 py-4 mb-6 border-b border-gray-200/50 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('education.tabJournal')}</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder={t('education.searchStudents')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm focus:border-blue-500 outline-none transition-all text-sm font-bold"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <button 
              onClick={() => setShowCourseDropdown(!showCourseDropdown)}
              className="w-full px-5 py-3 bg-white rounded-xl border border-gray-100 shadow-sm focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-900 flex items-center justify-between"
            >
              <span className="truncate">{selectedCourse === 'all' ? t('education.allPrograms') : courses?.find(c => c.id === selectedCourse)?.title}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCourseDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCourseDropdown && (
              <>
                <div className="fixed inset-0 z-[490]" onClick={() => setShowCourseDropdown(false)} />
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-[500] py-2 max-h-60 overflow-y-auto no-scrollbar animate-in zoom-in-95 fade-in duration-200 origin-top">
                  <button
                    onClick={() => {
                      setSelectedCourse('all');
                      setShowCourseDropdown(false);
                    }}
                    className={`w-full px-5 py-2.5 text-left hover:bg-blue-50 transition-colors text-sm font-bold ${selectedCourse === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                  >
                    {t('education.allPrograms')}
                  </button>
                  {courses?.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCourse(c.id);
                        setShowCourseDropdown(false);
                      }}
                      className={`w-full px-5 py-2.5 text-left hover:bg-blue-50 transition-colors text-sm font-bold ${selectedCourse === c.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('education.student')}</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('education.attendance')}</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('education.tabSchedule')}</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('education.exams')}</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('education.average')}</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('education.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student: any) => {
                  const studentAverage = calculateStudentAverage(student.id);
                  const studentAttendancePercent = calculateStudentAttendancePercent(student.id);
                  
                  return (
                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm">
                            {(student.first_name?.[0] || '') + (student.last_name?.[0] || '')}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{student.first_name} {student.last_name}</p>
                            <p className="text-xs text-gray-500 font-medium">{student.education_courses?.title || t('common.noData')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="flex -space-x-1">
                            {[0, 1, 2, 3, 4].map(i => {
                              const status = attendance[`${student.id}_${i}`] || 'present';
                              return (
                                <button 
                                  key={i} 
                                  onClick={() => handleAttendanceClick(student.id, i)}
                                  title={t(`education.status_${status}`, status)}
                                  className={`w-6 h-6 rounded-lg border-2 border-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform z-10 hover:z-20 shadow-sm
                                    ${status === 'present' ? 'bg-emerald-100 text-emerald-600' : 
                                      status === 'absent' ? 'bg-red-100 text-red-600' : 
                                      status === 'late' ? 'bg-amber-100 text-amber-600' :
                                      'bg-gray-100 text-gray-300'}`}
                                >
                                  {status === 'present' ? <CheckCircle className="w-3 h-3" /> : 
                                   status === 'absent' ? <XCircle className="w-3 h-3" /> : 
                                   status === 'late' ? <Clock className="w-3 h-3" /> :
                                   <div className="w-2 h-2 rounded-full bg-gray-200" />}
                                </button>
                              );
                            })}
                          </div>
                          <span className={`text-xs font-black ml-2 ${studentAttendancePercent < 50 ? 'text-red-500' : studentAttendancePercent < 80 ? 'text-amber-500' : 'text-gray-400'}`}>
                            {studentAttendancePercent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          {[0, 1, 2].map((i) => {
                            const grade = grades[`${student.id}_${i}`];
                            return (
                              <button 
                                key={i} 
                                onClick={() => handleGradeClick(student.id, i)}
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-black cursor-pointer transition-all hover:scale-105 shadow-sm
                                  ${grade ? 'bg-blue-50 border-blue-100 text-blue-700 hover:border-blue-300 hover:bg-blue-100' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-300 hover:bg-gray-100'}`}
                              >
                                {grade !== undefined ? grade : '-'}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center">
                          <button 
                            onClick={() => handleExamClick(student.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-black border transition-all hover:scale-105 shadow-sm
                              ${exams[student.id] !== undefined 
                                ? 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100' 
                                : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
                          >
                            {exams[student.id] !== undefined ? `${exams[student.id]} / 100` : '- / 100'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-2 w-16 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${studentAverage >= 8 ? 'bg-emerald-500' : studentAverage >= 5 ? 'bg-amber-500' : 'bg-red-500'}`} 
                              style={{ width: `${(studentAverage / 10) * 100}%` }}
                            />
                          </div>
                          <span className={`text-sm font-black ${studentAverage >= 8 ? 'text-emerald-600' : studentAverage >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                            {studentAverage.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold">{t('education.noDataJournal')}</p>
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
          <h3 className="text-sm font-black uppercase tracking-widest opacity-80 mb-2">{t('education.averageScore')}</h3>
          <p className="text-4xl font-black">{globalAverage} / 10</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1.5 rounded-full">
            <Star className="w-3 h-3 fill-current" /> {t('education.overall')}
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{t('education.totalAttendance')}</h3>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-black text-gray-900">{globalAttendance}%</p>
            <span className={`text-sm font-bold mb-1 ${globalAttendance >= 90 ? 'text-emerald-500' : globalAttendance >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
              {globalAttendance >= 90 ? t('education.excellent', 'Əla') : globalAttendance >= 70 ? t('education.good', 'Yaxşı') : t('education.poor', 'Zəif')}
            </span>
          </div>
          <div className="mt-6 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${globalAttendance >= 90 ? 'bg-emerald-500' : globalAttendance >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} 
              style={{ width: `${globalAttendance}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{t('education.nextExamSession')}</h3>
          <p className="text-xl font-black text-gray-900">
            {`20 ${t('common.months.may', 'May')} - 25 ${t('common.months.may', 'May')}`} 2026
          </p>
          <p className="text-sm text-gray-500 mt-2 font-medium">{filteredStudents.length} {t('education.studentsRegistered')}</p>
          <button className="mt-6 w-full py-3 bg-gray-50 text-gray-900 rounded-xl text-sm font-black hover:bg-gray-100 transition-all">
            {t('education.manageExams')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcademicJournal;
