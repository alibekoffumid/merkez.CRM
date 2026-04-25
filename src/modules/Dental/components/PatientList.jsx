import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, User, Phone, Calendar, DollarSign, ChevronRight, Filter, MoreVertical, Activity, Loader2 } from 'lucide-react';
import { DentalService } from '../../../services/DentalService';

const PatientList = ({ onViewChart }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, [searchQuery]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await DentalService.getPatients(searchQuery);
      setPatients(data);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients; // Filtering is done on server-side now

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            placeholder={t('dental.searchPatients')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-[1.5rem] text-sm font-bold border border-gray-100 transition-all shadow-sm">
            <Filter className="w-4 h-4" />
            {t('common.filter')}
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] text-sm font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]">
            <Plus className="w-4 h-4" />
            {t('dental.addPatient')}
          </button>
        </div>
      </div>

      {/* Patient Cards/List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
        ) : filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <div 
              key={patient.id}
              className="group bg-white rounded-[2rem] border border-gray-100 p-6 hover:border-blue-200 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-600/5 relative overflow-hidden"
            >
              {/* Background Accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.03] -translate-y-16 translate-x-16 rounded-full group-hover:scale-150 transition-transform duration-700 ${(patient.estimated_value || 0) < 0 ? 'bg-red-600' : 'bg-emerald-600'}`} />

              <div className="flex flex-col lg:flex-row items-center gap-6 relative z-10">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <User className="w-8 h-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>

                {/* Patient Info */}
                <div className="flex-1 text-center lg:text-left">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">{patient.name}</h3>
                  <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <Phone className="w-3.5 h-3.5" />
                      {patient.phone || 'No phone'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <Calendar className="w-3.5 h-3.5" />
                      {t('dental.lastVisit')}: {patient.updated_at ? new Date(patient.updated_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Financial Status */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end gap-6 lg:gap-1 px-6 lg:border-x lg:border-gray-100">
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400 hidden lg:block">{t('dental.balance')}</p>
                  <div className={`flex items-center gap-1 text-xl font-black ${(patient.estimated_value || 0) < 0 ? 'text-rose-500' : (patient.estimated_value || 0) > 0 ? 'text-emerald-500' : 'text-gray-900'}`}>
                    <DollarSign className="w-5 h-5" />
                    {(patient.estimated_value || 0).toLocaleString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <button 
                    onClick={() => onViewChart(patient)}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    <Activity className="w-4 h-4" />
                    {t('dental.viewChart')}
                  </button>
                  <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-100 transition-all">
                    {t('dental.addVisit')}
                  </button>
                  <button className="p-3.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-gray-50/50 rounded-[2.5rem] p-20 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
            <User className="w-16 h-16 text-gray-300 mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{t('dental.noPatients')}</h3>
            <p className="text-gray-500 max-w-sm mt-3 font-medium">Try adjusting your search or filters to find the patient you're looking for.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientList;
