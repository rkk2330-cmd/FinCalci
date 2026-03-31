// FinCalci — Unified display formatter
// Replaces: ₹${FMT(x)}, x.toFixed(1), toLocaleString patterns
// Every number that reaches the UI passes through one of these.

import { safeNum } from './validate';

/** Indian currency: ₹12,34,567 */
export const currency = (val: unknown, decimals = 0): string => {
  const n = safeNum(val);
  return '₹' + n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/** Compact Indian: ₹12.5L, ₹1.04Cr (for hero numbers, tight spaces) */
export const currencyCompact = (val: unknown): string => {
  const n = safeNum(val);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 1_00_00_000) return sign + '₹' + (abs / 1_00_00_000).toFixed(2) + 'Cr';
  if (abs >= 1_00_000) return sign + '₹' + (abs / 1_00_000).toFixed(1) + 'L';
  if (abs >= 1_000) return sign + '₹' + (abs / 1_000).toFixed(1) + 'K';
  return currency(n);
};

/** Percentage: 8.5% */
export const pct = (val: unknown, decimals = 1): string => {
  return safeNum(val).toFixed(decimals) + '%';
};

/** Plain number with Indian commas: 12,34,567 */
export const num = (val: unknown, decimals = 0): string => {
  return safeNum(val).toLocaleString('en-IN', {
    maximumFractionDigits: decimals,
  });
};

/** Decimal: 24.9 (BMI, rates, ratios) */
export const decimal = (val: unknown, places = 1): string => {
  return safeNum(val).toFixed(places);
};

/** Duration from months: "20 yrs 3 mo" */
export const duration = (totalMonths: unknown): string => {
  const m = Math.round(safeNum(totalMonths));
  const y = Math.floor(m / 12);
  const rem = m % 12;

  if (m <= 0) return '0 mo';
  if (y === 0) return `${rem} mo`;
  if (rem === 0) return `${y} yr${y > 1 ? 's' : ''}`;
  return `${y} yr${y > 1 ? 's' : ''} ${rem} mo`;
};

/** Days count with commas: "4,380 days" */
export const days = (val: unknown): string => {
  return num(val) + ' days';
};

/** Weight: "10.5 g" / "1.2 kg" */
export const weight = (val: unknown, unit = 'g'): string => {
  return decimal(val) + ' ' + unit;
};

/** Calories: "2,100 kcal" */
export const kcal = (val: unknown): string => {
  return num(val) + ' kcal';
};

// ─── Legacy compatibility ───
// Legacy format helpers — used across all .tsx calculators
// and it works identically to the old function.
export const FMT = (n: unknown): string => {
  const val = safeNum(n);
  return val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};
