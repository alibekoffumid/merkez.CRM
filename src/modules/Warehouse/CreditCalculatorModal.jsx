import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calculator, Percent, Sparkles, CheckCircle2, DollarSign, ArrowRight, ShieldCheck, ChevronRight } from 'lucide-react';
import ModalPortal from '../../components/Common/ModalPortal';
import { supabase } from '../../supabaseClient';

export const BANK_RATES = {
  'ABB Kredit': { 1: 0.0, 2: 0.02, 3: 0.03, 6: 0.055, 9: 0.08, 12: 0.10, 18: 0.17, 24: 0.23 },
  'Birkart': { 2: 0.032, 3: 0.043, 6: 0.074, 9: 0.10, 12: 0.13, 18: 0.17 },
  'Tamkart': { 2: 0.03, 3: 0.041, 6: 0.072, 9: 0.098, 12: 0.128 },
  'Kapital Kredit 35': { 2: 0.04, 3: 0.055, 6: 0.085, 12: 0.155, 18: 0.24, 24: 0.30, 35: 0.46 },
  'Ferrum Standart': { 3: 0.10, 6: 0.15, 9: 0.19, 12: 0.24 },
  'Ferrum Fast': { 3: 0.18, 6: 0.22 },
  'Ferrum DTI': { 3: 0.08, 6: 0.12, 9: 0.16, 12: 0.19 }
};

export const BANK_LIST = [
  'ABB Kredit',
  'Birkart',
  'Tamkart',
  'Kapital Kredit 35',
  'Ferrum Standart',
  'Ferrum Fast',
  'Ferrum DTI'
];

export const MARKUP_RATES = {
  'ABB Kredit': { 1: 0.0, 2: 0.079, 3: 0.09, 6: 0.119, 9: 0.1495, 12: 0.175, 18: 0.274, 24: 0.3735 },
  'Birkart': { 2: 0.0925, 3: 0.105, 6: 0.142, 9: 0.175, 12: 0.216, 18: 0.274 },
  'Tamkart': { 2: 0.09, 3: 0.1025, 6: 0.14, 9: 0.1725, 12: 0.213 },
  'Kapital Kredit 35': { 2: 0.101, 3: 0.1159, 6: 0.148, 12: 0.222, 18: 0.312, 24: 0.3751, 35: 0.545 },
  'Ferrum Standart': { 3: 0.177, 6: 0.246, 9: 0.308, 12: 0.3935 },
  'Ferrum Fast': { 3: 0.29, 6: 0.36 },
  'Ferrum DTI': { 3: 0.151, 6: 0.204, 9: 0.261, 12: 0.308 }
};

export function computeCreditDetails({
  bank = 'Birkart',
  months = 12,
  price = 0,
  extraMarkup = 0,
  downpayment = 0,
  isZeroInterest = false,
  bankTariffs = []
}) {
  const rawPrice = (Number(price) || 0) + (Number(extraMarkup) || 0);
  const numDownpayment = Math.min(rawPrice, Math.max(0, Number(downpayment) || 0));
  const netAmount = Math.max(0, rawPrice - numDownpayment);

  const tariff = bankTariffs.find(
    s => s.bank_name?.toLowerCase() === bank.toLowerCase() && Number(s.months) === Number(months)
  );

  let bankPercent = 0;
  let taxPercent = 4.0;
  let storePercent = 0;

  if (isZeroInterest) {
    bankPercent = 0;
    taxPercent = 0;
    storePercent = 0;
  } else {
    bankPercent = tariff ? Number(tariff.bank_percent) : ((BANK_RATES[bank]?.[months] || 0) * 100);
    taxPercent = tariff ? Number(tariff.tax_percent) : 4.0;
    const defaultShop = bank.toLowerCase().includes('ferrum') ? 1.65 : 1.5;
    storePercent = tariff ? Number(tariff.store_percent) : defaultShop;
  }

  const dBank = bankPercent / 100;
  const dTax = taxPercent / 100;
  const dStore = storePercent / 100;

  const isFeeDeductedFromGross = !isZeroInterest && (bank.toLowerCase().includes('ferrum') || bank.toLowerCase().includes('abb'));

  const denominator = isFeeDeductedFromGross
    ? (1 - dBank) * (1 - dTax - dStore)
    : (1 - dBank - dTax - dStore);

  const rawGross = isZeroInterest ? netAmount : (denominator > 0 ? (netAmount / denominator) : netAmount);
  const exactMarkup = !isZeroInterest ? MARKUP_RATES[bank]?.[months] : 0;

  const contractTotal = isZeroInterest
    ? Number(netAmount.toFixed(2))
    : (exactMarkup !== undefined
      ? Number((netAmount * (1 + exactMarkup)).toFixed(2))
      : (isFeeDeductedFromGross ? Math.ceil(rawGross) : Math.ceil(rawGross)));

  const grossAmount = isZeroInterest
    ? netAmount
    : (isFeeDeductedFromGross
      ? (denominator > 0 ? (netAmount / denominator) : netAmount)
      : (exactMarkup !== undefined ? (netAmount * (1 + exactMarkup)) : rawGross));

  const monthlyPayment = months > 0
    ? (isZeroInterest
      ? Number((netAmount / months).toFixed(2))
      : (bank === 'Kapital Kredit 35'
        ? Number((Math.ceil(netAmount * 1.0575) / months).toFixed(2))
        : Number((Math.ceil(contractTotal) / months).toFixed(2))))
    : 0;

  const interestAmount = Math.max(0, contractTotal - netAmount);
  const commissionRateDisplay = netAmount > 0 ? ((contractTotal - netAmount) / netAmount) * 100 : 0;

  const sentToCreditDept = bank === 'Kapital Kredit 35'
    ? (isZeroInterest ? netAmount : Math.ceil(netAmount * 1.0575))
    : Math.ceil(contractTotal);

  return {
    rawPrice,
    numDownpayment,
    netAmount,
    contractTotal,
    grossAmount,
    monthlyPayment,
    interestAmount,
    commissionRateDisplay,
    sentToCreditDept,
    months,
    bank,
    bankPercent
  };
}

const CreditCalculatorModal = ({ isOpen, onClose, initialPrice = 500 }) => {
  const { i18n } = useTranslation();
  const [priceInput, setPriceInput] = useState(String(initialPrice || 500));
  const [extraMarkupInput, setExtraMarkupInput] = useState('0');
  const [downpaymentInput, setDownpaymentInput] = useState('0');
  const [selectedBank, setSelectedBank] = useState('Birkart');
  const [selectedMonths, setSelectedMonths] = useState(12);
  const [isZeroInterest, setIsZeroInterest] = useState(false);
  const [bankTariffs, setBankTariffs] = useState([]);

  useEffect(() => {
    if (initialPrice && Number(initialPrice) > 0) {
      setPriceInput(String(initialPrice));
    }
  }, [initialPrice]);

  useEffect(() => {
    const fetchTariffs = async () => {
      try {
        const { data, error } = await supabase
          .from('bank_credit_tariffs')
          .select('bank_name, months, bank_percent, tax_percent, store_percent');
        if (!error && data) {
          setBankTariffs(data);
        }
      } catch (e) {
        // Fallback to static rates
      }
    };
    if (isOpen) {
      fetchTariffs();
    }
  }, [isOpen]);

  const availableMonths = useMemo(() => {
    const tariffsForBank = bankTariffs.filter(
      s => s.bank_name?.toLowerCase() === selectedBank.toLowerCase()
    );
    if (tariffsForBank.length > 0) {
      return Array.from(new Set(tariffsForBank.map(s => Number(s.months)))).sort((a, b) => a - b);
    }
    return Object.keys(BANK_RATES[selectedBank] || {}).map(Number).sort((a, b) => a - b);
  }, [selectedBank, bankTariffs]);

  // Ensure selected month exists for current bank
  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonths)) {
      if (availableMonths.includes(12)) {
        setSelectedMonths(12);
      } else {
        setSelectedMonths(availableMonths[availableMonths.length - 1]);
      }
    }
  }, [availableMonths, selectedMonths]);

  const currentResult = useMemo(() => {
    return computeCreditDetails({
      bank: selectedBank,
      months: selectedMonths,
      price: priceInput,
      extraMarkup: extraMarkupInput,
      downpayment: downpaymentInput,
      isZeroInterest,
      bankTariffs
    });
  }, [selectedBank, selectedMonths, priceInput, extraMarkupInput, downpaymentInput, isZeroInterest, bankTariffs]);

  // Comparison for all supported months of selected bank
  const allMonthsComparison = useMemo(() => {
    return availableMonths.map(m => {
      return computeCreditDetails({
        bank: selectedBank,
        months: m,
        price: priceInput,
        extraMarkup: extraMarkupInput,
        downpayment: downpaymentInput,
        isZeroInterest,
        bankTariffs
      });
    });
  }, [availableMonths, selectedBank, priceInput, extraMarkupInput, downpaymentInput, isZeroInterest, bankTariffs]);

  if (!isOpen) return null;

  const quickPresets = [100, 250, 500, 1000, 1500, 2000];

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col my-auto max-h-[94vh] animate-in fade-in zoom-in-95 duration-150"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-tight">
                  {i18n.language === 'az' ? 'Kredit Kalkulyatoru' : i18n.language === 'ru' ? 'Кредитный калькулятор' : 'Credit Calculator'}
                </h3>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">
                  {i18n.language === 'az'
                    ? 'Bank tarifləri və aylıq ödənişlərin ani hesablanması'
                    : i18n.language === 'ru'
                    ? 'Мгновенный расчет банковских тарифов и ежемесячных платежей'
                    : 'Instant bank rates and installment calculation'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-colors shadow-xs border border-transparent hover:border-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
            {/* Price & Presets */}
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                    {i18n.language === 'az' ? 'Məhsulun qiyməti' : 'Стоимость товара'} *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₼</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={priceInput}
                      onChange={e => setPriceInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-base font-black text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-xs transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                    {i18n.language === 'az' ? 'İlkin ödəniş' : 'Первый взнос'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₼</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={downpaymentInput}
                      onChange={e => setDownpaymentInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-base font-black text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-xs transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">
                  {i18n.language === 'az' ? 'Sürətli seçimlər:' : 'Быстрый выбор:'}
                </span>
                {quickPresets.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPriceInput(String(preset))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      Number(priceInput) === preset
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    ₼{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Bank Selection & 0% Toggle */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  {i18n.language === 'az' ? 'Bank seçimi' : 'Выбор банка'}
                </label>

                {/* 0% Interest Switch */}
                <button
                  type="button"
                  onClick={() => setIsZeroInterest(!isZeroInterest)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black transition-all shadow-xs ${
                    isZeroInterest
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isZeroInterest ? '✓ 0% Faizsiz Aksiya' : '0% Faizsiz rejim'}</span>
                  <span
                    className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                      isZeroInterest ? 'bg-emerald-800 justify-end' : 'bg-gray-300 justify-start'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-white shadow-xs"></span>
                  </span>
                </button>
              </div>

              {/* Bank Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BANK_LIST.map(bank => {
                  const isSelected = selectedBank === bank;
                  return (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs font-black'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700 font-bold'
                      }`}
                    >
                      <span className="text-xs truncate">{bank}</span>
                      <span className="text-[10px] text-gray-400 mt-1">
                        {isZeroInterest ? '0% Faizsiz' : 'Standart tarif'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Months Selector (Pills) */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                {i18n.language === 'az' ? 'Kredit müddəti (Ay)' : 'Срок кредита (Месяцев)'}
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {availableMonths.map(m => {
                  const isSelected = selectedMonths === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMonths(m)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        isSelected
                          ? 'bg-gray-900 text-white shadow-md shadow-gray-900/20'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {m} {i18n.language === 'az' ? 'ay' : 'мес'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Result Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-5 sm:p-6 shadow-xl shadow-blue-600/20 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/20">
                <div>
                  <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">
                    {i18n.language === 'az' ? 'Aylıq ödəniş məbləği' : 'Ежемесячный платеж'}
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight">
                      ₼{currentResult.monthlyPayment.toFixed(2)}
                    </span>
                    <span className="text-sm font-bold text-blue-200">
                      / {selectedMonths} {i18n.language === 'az' ? 'ay' : 'мес'}
                    </span>
                  </div>
                </div>

                <div className="bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 flex flex-col text-right sm:text-right">
                  <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider">
                    {i18n.language === 'az' ? 'Yekun müqavilə məbləği' : 'Итого по договору'}
                  </span>
                  <span className="text-xl font-black text-white">
                    ₼{currentResult.contractTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Key Breakdown Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                <div>
                  <span className="text-blue-200 text-[11px] font-medium block">
                    {i18n.language === 'az' ? 'Kreditə verilən:' : 'Сумма в кредит:'}
                  </span>
                  <span className="font-bold text-sm text-white">
                    ₼{currentResult.netAmount.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-blue-200 text-[11px] font-medium block">
                    {i18n.language === 'az' ? 'Faiz dərəcəsi:' : 'Процент:'}
                  </span>
                  <span className="font-bold text-sm text-white">
                    {isZeroInterest ? '0% (Faizsiz)' : `${currentResult.commissionRateDisplay.toFixed(2)}%`}
                  </span>
                </div>

                <div>
                  <span className="text-blue-200 text-[11px] font-medium block">
                    {i18n.language === 'az' ? 'Faiz artımı:' : 'Переплата:'}
                  </span>
                  <span className="font-bold text-sm text-amber-300">
                    +₼{currentResult.interestAmount.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-blue-200 text-[11px] font-medium block">
                    {i18n.language === 'az' ? 'Şöbəyə göndərilən:' : 'В отдел кредита:'}
                  </span>
                  <span className="font-bold text-sm text-white">
                    ₼{currentResult.sentToCreditDept.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Comparison Table for All Supported Durations */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  {i18n.language === 'az' ? `${selectedBank} üzrə bütün müddətlər` : `Все сроки по ${selectedBank}`}
                </span>
                <span className="text-[11px] text-gray-400 font-bold">
                  {isZeroInterest ? '0% Faizsiz' : 'Bank tarifi'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2">{i18n.language === 'az' ? 'Müddət' : 'Срок'}</th>
                      <th className="px-4 py-2 text-center">{i18n.language === 'az' ? 'Faiz' : 'Ставка'}</th>
                      <th className="px-4 py-2 text-right">{i18n.language === 'az' ? 'Aylıq ödəniş' : 'В месяц'}</th>
                      <th className="px-4 py-2 text-right">{i18n.language === 'az' ? 'Yekun məbləğ' : 'Итого'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {allMonthsComparison.map(row => {
                      const isRowActive = row.months === selectedMonths;
                      return (
                        <tr
                          key={row.months}
                          onClick={() => setSelectedMonths(row.months)}
                          className={`cursor-pointer transition-colors ${
                            isRowActive ? 'bg-blue-50/70 font-black text-blue-900' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <td className="px-4 py-2.5 flex items-center gap-1.5">
                            {isRowActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                            <span>{row.months} {i18n.language === 'az' ? 'ay' : 'мес'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-500">
                            {isZeroInterest ? '0%' : `${row.commissionRateDisplay.toFixed(1)}%`}
                          </td>
                          <td className="px-4 py-2.5 text-right font-black text-gray-900">
                            ₼{row.monthlyPayment.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-600">
                            ₼{row.contractTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors shadow-xs"
            >
              {i18n.language === 'az' ? 'Bağla' : i18n.language === 'ru' ? 'Закрыть' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CreditCalculatorModal;
