import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, AlertCircle, FileText, Download, Loader2 } from 'lucide-react';
import { DentalService } from '../../../services/DentalService';

const TreatmentHistory = ({ patientId }) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadHistory();
    }
  }, [patientId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await DentalService.getToothHistory(patientId);
      setHistory(data);
    } catch (err) {
      console.error('Error fetching treatment history:', err);
    } finally {
      setLoading(false);
    }
  };

  const mappedHistory = React.useMemo(() => {
    const conditionMap = {
      'HEALTHY': t('dental.healthy'),
      'CARIES': t('dental.caries'),
      'MISSING': t('dental.missing'),
      'CROWN': t('dental.crown'),
      'IMPLANT': t('dental.implant'),
      'FILLING': t('dental.filling'),
      'ROOT_CANAL': t('dental.rootCanal'),
      'EXTRACTION_REQUIRED': t('dental.extraction'),
      'BRIDGE': t('dental.bridge')
    };

    return history.map(item => ({
      id: item.id,
      date: item.created_at ? new Date(item.created_at).toLocaleDateString() : t('common.noData'),
      doctor: item.updated_by || 'Unknown',
      procedure: `${conditionMap[item.condition] || item.condition} - ${t('dental.tooth')} #${item.tooth_number || '?'}`,
      notes: item.notes || t('dental.noNotes'),
      status: t('status.completed'),
      cost: item.cost || 0
    }));
  }, [history, t]);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">{t('dental.treatmentHistory')}</h3>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest border border-gray-100 rounded-xl shadow-sm">
          <Download className="w-4 h-4" />
          {t('common.exportAll')}
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : mappedHistory.length > 0 ? (
          mappedHistory.map((item) => (
            <div key={item.id} className="group flex flex-col md:flex-row gap-6 p-6 rounded-[1.75rem] bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-100 transition-all duration-300">
              <div className="flex items-center gap-4 md:w-48 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-gray-100 shadow-sm">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">{item.date}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{item.doctor}</p>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{item.procedure}</h4>
                  <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100/50">
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">{item.notes}</p>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 md:w-32">
                <div className="text-right">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('common.price')}</p>
                  <p className="text-sm font-black text-gray-900">${item.cost}</p>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm font-bold">
            No history found.
          </div>
        )}
      </div>
      
      <button className="w-full mt-8 py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-dashed border-gray-200">
        {t('common.loadMore')}
      </button>
    </div>
  );
};

export default TreatmentHistory;
