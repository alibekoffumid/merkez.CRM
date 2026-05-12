import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Book, Clock, Edit2, Trash2, Phone, Mail, Calendar, Users, Hash, TrendingUp, GraduationCap } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  date_of_birth?: string;
  created_at?: string;
}

interface StudentCardProps {
  student: Student;
  groups?: any[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

const StudentCard: React.FC<StudentCardProps> = ({ student, groups = [], onEdit, onDelete }) => {
  const { t } = useTranslation();
  
  const studentGroups = groups.filter(g => g.student_id === student.id);
  const registrationDate = student.created_at ? new Date(student.created_at).toLocaleDateString() : '—';

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative flex flex-col h-full">
      {/* Action Buttons */}
      <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
        <button 
          onClick={() => onEdit(student)}
          className="w-10 h-10 bg-white shadow-lg text-gray-400 hover:text-blue-600 rounded-xl transition-all flex items-center justify-center border border-gray-50"
          title={t('common.edit')}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onDelete(student)}
          className="w-10 h-10 bg-white shadow-lg text-gray-400 hover:text-red-600 rounded-xl transition-all flex items-center justify-center border border-gray-50"
          title={t('common.delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Section */}
      <div className="flex items-center gap-5 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl uppercase shadow-lg shadow-blue-600/20">
          {student.first_name?.[0] || ''}{student.last_name?.[0] || ''}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-black text-gray-900 truncate">{student.first_name} {student.last_name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {student.status === 'active' ? t('common.active', 'Aktiv') : t('common.inactive', 'Deaktiv')}
            </span>
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
              <Hash className="w-3 h-3" />
              ID: {student.id.slice(0, 8)}
            </span>
          </div>
        </div>
      </div>

      {/* Contact & Personal Info */}
      <div className="space-y-4 flex-1">
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50">
            <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('education.emailAddress')}</p>
              <p className="text-xs font-bold text-gray-700 truncate">{student.email || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50">
            <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('education.phoneNumber')}</p>
              <p className="text-xs font-bold text-gray-700 truncate">{student.phone || '—'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-blue-50/30 rounded-2xl border border-blue-100/30">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{t('profile.dateOfBirth', 'Doğum tarixi')}</span>
            </div>
            <p className="text-xs font-black text-gray-900">{student.date_of_birth || '—'}</p>
          </div>
          <div className="p-3 bg-purple-50/30 rounded-2xl border border-purple-100/30">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest">{t('common.date', 'Tarix')}</span>
            </div>
            <p className="text-xs font-black text-gray-900">{registrationDate}</p>
          </div>
        </div>

        {/* Academic Info: Groups */}
        <div className="p-4 bg-gray-900 rounded-[1.5rem] text-white mt-2 shadow-xl shadow-gray-900/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('education.tabGroups', 'Qruplar')}</span>
            </div>
            <span className="text-[10px] font-black bg-blue-600 px-2 py-0.5 rounded-md">{studentGroups.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {studentGroups.length > 0 ? (
              studentGroups.map((sg: any, idx: number) => (
                <span key={idx} className="text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-lg border border-white/5 whitespace-nowrap">
                  {sg.education_groups?.name || 'Group'}
                </span>
              ))
            ) : (
              <span className="text-[10px] font-bold text-gray-500 italic">{t('education.noGroupsAvailable', 'Qrup yoxdur')}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('education.attendance')}</p>
            <p className="text-sm font-black text-gray-900">100%</p>
          </div>
        </div>
        <div className="flex items-center gap-3 justify-end">
          <div className="text-right">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('education.level', 'Səviyyə')}</p>
            <p className="text-sm font-black text-gray-900">Advanced</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCard;
