export const BANK_RATES: Record<string, Record<number, number>> = {
  'ABB Kredit': { 1: 0.0, 2: 0.02, 3: 0.03, 6: 0.055, 9: 0.08, 12: 0.10, 18: 0.17, 24: 0.23 },
  'Birkart': { 2: 0.032, 3: 0.043, 6: 0.074, 9: 0.10, 12: 0.13, 18: 0.17 },
  'Tamkart': { 2: 0.03, 3: 0.041, 6: 0.072, 9: 0.098, 12: 0.128 },
  'Kapital Kredit 35': { 2: 0.04, 3: 0.055, 6: 0.085, 12: 0.155, 18: 0.24, 24: 0.30, 35: 0.46 },
  'Ferrum Standart': { 3: 0.10, 6: 0.15, 9: 0.19, 12: 0.24 },
  'Ferrum Fast': { 3: 0.18, 6: 0.22 },
  'Ferrum DTI': { 3: 0.08, 6: 0.12, 9: 0.16, 12: 0.19 },
};

export const MARKUP_RATES: Record<string, Record<number, number>> = {
  'ABB Kredit': { 1: 0.0, 2: 0.079, 3: 0.09, 6: 0.119, 9: 0.1495, 12: 0.175, 18: 0.274, 24: 0.3735 },
  'Birkart': { 2: 0.0925, 3: 0.105, 6: 0.142, 9: 0.175, 12: 0.216, 18: 0.274 },
  'Tamkart': { 2: 0.09, 3: 0.1025, 6: 0.14, 9: 0.1725, 12: 0.213 },
  'Kapital Kredit 35': { 2: 0.101, 3: 0.1159, 6: 0.148, 12: 0.222, 18: 0.312, 24: 0.3751, 35: 0.545 },
  'Ferrum Standart': { 3: 0.177, 6: 0.246, 9: 0.308, 12: 0.3935 },
  'Ferrum Fast': { 3: 0.29, 6: 0.36 },
  'Ferrum DTI': { 3: 0.151, 6: 0.204, 9: 0.261, 12: 0.308 },
};

export const CREDIT_BANKS = [
  'ABB Kredit',
  'Birkart',
  'Tamkart',
  'Kapital Kredit 35',
  'Ferrum Standart',
  'Ferrum Fast',
  'Ferrum DTI',
] as const;

export type CreditBank = typeof CREDIT_BANKS[number];

export interface CreditCalculationResult {
  baseAmount: number;
  markupRate: number;
  markupPercent: number;
  interestAmount: number;
  contractTotal: number;
  monthlyPayment: number;
  bankSentAmount: number;
}

export function calculateCredit(
  amount: number,
  bank: CreditBank,
  months: number
): CreditCalculationResult {
  const base = Math.max(0, amount);
  const exactMarkup = MARKUP_RATES[bank]?.[months] ?? 0;
  const contractTotal = Number((base * (1 + exactMarkup)).toFixed(2));
  const interestAmount = Number((contractTotal - base).toFixed(2));
  const markupPercent = exactMarkup * 100;
  const monthlyPayment = months > 0 ? Number((Math.ceil(contractTotal) / months).toFixed(2)) : contractTotal;
  const bankSentAmount = bank === 'Kapital Kredit 35'
    ? Math.ceil(base * 1.0575)
    : Math.ceil(contractTotal);

  return {
    baseAmount: base,
    markupRate: exactMarkup,
    markupPercent,
    interestAmount,
    contractTotal,
    monthlyPayment,
    bankSentAmount,
  };
}

export function getAvailableMonths(bank: CreditBank): number[] {
  const rates = MARKUP_RATES[bank];
  if (!rates) return [3, 6, 12];
  return Object.keys(rates)
    .map(Number)
    .sort((a, b) => a - b);
}
