import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Save, Loader2, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { DentalService } from '../../../services/DentalService';

const PriceList = () => {
  const { t } = useTranslation();
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // stores the condition key being saved

  const CONDITIONS = [
    'CARIES',
    'MISSING',
    'CROWN',
    'IMPLANT',
    'FILLING',
    'ROOT_CANAL',
    'EXTRACTION_REQUIRED',
    'BRIDGE'
  ];

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      setLoading(true);
      const data = await DentalService.getPriceList();
      const priceMap = {};
      data.forEach(item => {
        priceMap[item.condition] = item.price;
      });
      setPrices(priceMap);
    } catch (err) {
      console.error('Error fetching prices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (condition, value) => {
    setPrices(prev => ({
      ...prev,
      [condition]: value
    }));
  };

  const handleSave = async (condition) => {
    try {
      setSaving(condition);
      await DentalService.updatePrice(condition, parseFloat(prices[condition] || 0));
      // Show success briefly (simulated or just let the button reset)
    } catch (err) {
      console.error('Error saving price:', err);
      alert(t('common.error'));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 p-4 md:p-0">
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Tag className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900">{t('dental.priceList')}</h3>
              <p className="text-gray-500 text-sm font-medium">Manage treatment costs for automatic billing</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Prices are used for statistics & billing</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CONDITIONS.map(condition => {
          const isSaving = saving === condition;
          return (
            <div key={condition} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                   </div>
                   <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm">
                     {t(`dental.${condition === 'EXTRACTION_REQUIRED' ? 'extraction' : (condition === 'ROOT_CANAL' ? 'rootCanal' : condition.toLowerCase())}`)}
                   </h4>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="number"
                    value={prices[condition] || ''}
                    onChange={(e) => handlePriceChange(condition, e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-6 text-lg font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</div>
                </div>

                <button
                  onClick={() => handleSave(condition)}
                  disabled={isSaving}
                  className={`
                    w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest
                    ${isSaving 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98] shadow-lg shadow-gray-900/10'}
                  `}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? t('common.saving') : t('dental.savePrice')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriceList;
