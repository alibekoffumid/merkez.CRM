import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Book, Clock, Edit2, Trash2 } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  date_of_birth?: string;
}

interface StudentCardProps {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

const StudentCard: React.FC<StudentCardProps> = ({ student, onEdit, onDelete }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
      <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onEdit(student)}
          className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onDelete(student)}
          className="p-2 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4 pr-16">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl uppercase">
          {student.first_name?.[0] || ''}{student.last_name?.[0] || ''}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{student.first_name} {student.last_name}</h3>
          <p className="text-sm text-gray-500 truncate max-w-[150px]">{student.email || student.phone || 'No contact info'}</p>
        </div>
      </div>
      
      <div className="inline-block mb-4">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${student.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
          {student.status || t('education.active')}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
          <Book className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">{t('education.enrolled')}</p>
            <p className="text-sm font-bold text-gray-900">{t('education.oneCourse')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">{t('education.attendance')}</p>
            <p className="text-sm font-bold text-gray-900">100%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCard;
