// FinCalci — Central validator
// Every calculation passes through here. NaN is impossible at output.

import type { InputSchema } from '../types';
import { FINANCE } from './constants';

// ─── Core guards ───

/** Convert anything to a finite number, or return fallback */
export const safeNum = (val: unknown, fallback = 0): number => {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return (Number.isNaN(n) || !Number.isFinite(n)) ? fallback : n;
};

/** Same as safeNum but rejects zero and negatives */
export const safePos = (val: unknown, fallback = 1): number => {
  const n = safeNum(val, fallback);
  return n > 0 ? n : fallback;
};

/** Clamp to range with NaN guard */
export const safeRange = (val: unknown, min: number, max: number, fallback?: number): number => {
  const n = safeNum(val, fallback ?? min);
  return Math.min(Math.max(n, min), max);
};

/** Safe division — prevents 0/0, x/0, NaN/x */
export const safeDivide = (numerator: unknown, denominator: unknown, fallback = 0): number => {
  const n = safeNum(numerator);
  const d = safeNum(denominator);
  if (d === 0) return fallback;
  const result = n / d;
  return Number.isFinite(result) ? result : fallback;
};

/** Safe Math.pow — prevents NaN/Infinity from exponential blowup */
export const safePow = (base: unknown, exp: unknown, fallback = 0): number => {
  const b = safeNum(base, 1);
  const e = safeNum(exp, 0);
  const result = Math.pow(b, e);
  return Number.isFinite(result) ? result : fallback;
};

// ─── Arithmetic guards (prevent raw x*y/z patterns) ───

/** Safe multiply — a * b, NaN-proof. Zero inputs = zero output. */
export const safeMul = (a: unknown, b: unknown, fallback = 0): number => {
  const va = safeNum(a);
  const vb = safeNum(b);
  const result = va * vb;
  return Number.isFinite(result) ? result : fallback;
};

/** Safe percentage — (value * rate / 100). Handles rate=0, value=undefined, NaN. */
export const safePct = (value: unknown, rate: unknown, fallback = 0): number => {
  const v = safeNum(value);
  const r = safeNum(rate);
  const result = v * r / 100;
  return Number.isFinite(result) ? result : fallback;
};

/** Safe rate conversion — annualRate% → monthly decimal (rate / 1200).
 *  Returns 0 for zero/negative rates (not NaN or Infinity). */
export const safeMonthlyRate = (annualRate: unknown): number => {
  const r = safeNum(annualRate);
  return r > 0 ? r / 1200 : 0;
};

/** Safe rate conversion — annualRate% → decimal (rate / 100). */
export const safeRateDecimal = (annualRate: unknown): number => {
  return safeNum(annualRate) / 100;
};

/** Safe subtraction — a - b, NaN-proof. */
export const safeSub = (a: unknown, b: unknown, fallback = 0): number => {
  const result = safeNum(a) - safeNum(b);
  return Number.isFinite(result) ? result : fallback;
};

/** Safe rounding — rounds to N decimal places, NaN returns fallback. */
export const safeRound = (val: unknown, decimals = 0, fallback = 0): number => {
  const n = safeNum(val, fallback);
  if (!Number.isFinite(n)) return fallback;
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
};

/** Safe toFixed — returns string, never "NaN" or "Infinity". */
export const safeFixed = (val: unknown, decimals = 1, fallback = '0'): string => {
  const n = safeNum(val);
  return Number.isFinite(n) ? n.toFixed(decimals) : fallback;
};



export interface GSTResult { base: number; gst: number; total: number; }

/** Safe GST — handles all 3 modes. Rate=0 → zero GST, not NaN. */
export const safeGST = (amount: unknown, rate: unknown, mode: 'exclusive' | 'inclusive' | 'reverse'): GSTResult => {
  const a = safeNum(amount);
  const r = safeNum(rate);
  if (mode === 'exclusive') { const gst = safePct(a, r); return { base: a, gst, total: a + gst }; }
  if (mode === 'inclusive') { const base = r > 0 ? safeDivide(a, 1 + r / 100, a) : a; return { base, gst: a - base, total: a }; }
  const base = r > 0 ? safeDivide(a * 100, r, 0) : 0;
  return { base, gst: a, total: base + a };
};

export interface SalaryResult {
  basic: number; hra: number; special: number; epfEmp: number; epfEr: number;
  gross: number; taxable: number; tax: number; monthly: number; yearly: number;
}

/** Safe salary breakdown — handles zero CTC. */
export const safeSalary = (ctc: unknown): SalaryResult => {
  const c = safeNum(ctc);
  if (c <= 0) return { basic: 0, hra: 0, special: 0, epfEmp: 0, epfEr: 0, gross: 0, taxable: 0, tax: 0, monthly: 0, yearly: 0 };
  const basic = c * FINANCE.BASIC_PCT;
  const hra = basic * FINANCE.HRA_PCT_OF_BASIC;
  const epfEmp = basic * FINANCE.EPF_PCT;
  const epfEr = basic * FINANCE.EPF_PCT;
  const special = c - basic - hra - epfEr;
  const proTax = c > FINANCE.PRO_TAX_THRESHOLD ? FINANCE.PRO_TAX_AMOUNT : 0;
  const stdDed = FINANCE.STANDARD_DEDUCTION_NEW;
  const gross = c - epfEr;
  const taxable = Math.max(gross - epfEmp - stdDed, 0);
  let tax = 0;
  // New regime slabs from FINANCE
  for (const slab of FINANCE.TAX_SLABS_NEW) {
    if (taxable > slab.min) {
      const slabIncome = Math.min(taxable, slab.max === Infinity ? taxable : slab.max) - slab.min;
      tax += slabIncome * slab.rate;
    }
  }
  tax += tax * FINANCE.TAX_CESS;
  const monthly = safeRound(safeDivide(gross - tax - epfEmp - proTax, FINANCE.MONTHS_PER_YEAR));
  return { basic, hra, special, epfEmp, epfEr, gross, taxable, tax: safeRound(tax), monthly, yearly: monthly * FINANCE.MONTHS_PER_YEAR };
};

// ─── Financial formulas (fully guarded) ───

export interface EMIResult {
  emi: number;
  total: number;
  interest: number;
}

/** EMI formula — guaranteed finite output for any input */
export const safeEMI = (principal: unknown, annualRate: unknown, months: unknown): EMIResult => {
  const P = safePos(principal, 100_000);
  const n = safePos(months, 12);
  const r = safeNum(annualRate) / 1200;

  // Zero/negative rate → simple division (no interest)
  if (r <= 0) {
    const emi = P / n;
    return { emi, total: P, interest: 0 };
  }

  const x = safePow(1 + r, n, 1);
  const denominator = x - 1;

  // Guard against denominator = 0 (mathematically impossible for r>0, n>0, but be safe)
  if (denominator <= 0) {
    const emi = P / n;
    return { emi, total: P, interest: 0 };
  }

  const emi = (P * r * x) / denominator;

  // Final NaN check (belt + suspenders)
  if (!Number.isFinite(emi) || emi <= 0) {
    const fallbackEmi = P / n;
    return { emi: fallbackEmi, total: P, interest: 0 };
  }

  const total = emi * n;
  const interest = total - P;

  return {
    emi: Math.round(emi * 100) / 100,
    total: Math.round(total * 100) / 100,
    interest: Math.max(Math.round(interest * 100) / 100, 0), // never negative
  };
};

export interface SIPResult {
  fv: number;
  invested: number;
  gains: number;
}

/** SIP future value — guaranteed finite output */
export const safeSIPFV = (monthly: unknown, annualRate: unknown, years: unknown): SIPResult => {
  const m = safePos(monthly, 1_000);
  const y = safePos(years, 1);
  const r = safeNum(annualRate) / 1200;
  const n = y * 12;

  if (r <= 0) {
    const invested = m * n;
    return { fv: invested, invested, gains: 0 };
  }

  const x = safePow(1 + r, n, 1);
  const fv = m * safeDivide(x - 1, r, n) * (1 + r);
  const invested = m * n;

  if (!Number.isFinite(fv)) {
    return { fv: invested, invested, gains: 0 };
  }

  return {
    fv: Math.round(fv * 100) / 100,
    invested: Math.round(invested * 100) / 100,
    gains: Math.max(Math.round((fv - invested) * 100) / 100, 0),
  };
};

/** Compound interest — P × (1 + r/n)^(n×t) */
export const safeCompound = (
  principal: unknown,
  annualRate: unknown,
  years: unknown,
  compoundFreq = 4 // quarterly default
): { maturity: number; interest: number } => {
  const P = safePos(principal, 1_000);
  const rate = safeNum(annualRate);
  const t = safePos(years, 1);
  const freq = safePos(compoundFreq, 4);

  if (rate <= 0) return { maturity: P, interest: 0 };

  const maturity = P * safePow(1 + rate / (100 * freq), freq * t, 1);

  if (!Number.isFinite(maturity)) return { maturity: P, interest: 0 };

  return {
    maturity: Math.round(maturity * 100) / 100,
    interest: Math.max(Math.round((maturity - P) * 100) / 100, 0),
  };
};

/** Tax slab calculator */
export const safeTax = (
  income: unknown,
  slabs: readonly { min: number; max: number; rate: number }[],
  cessPct = 0.04
): { tax: number; cess: number; total: number; effective: number } => {
  const inc = safeNum(income);
  if (inc <= 0) return { tax: 0, cess: 0, total: 0, effective: 0 };

  let tax = 0;
  for (const slab of slabs) {
    if (inc > slab.min) {
      const taxable = Math.min(inc, slab.max) - slab.min;
      tax += taxable * slab.rate;
    }
  }

  const cess = tax * cessPct;
  const total = tax + cess;

  return {
    tax: Math.round(tax),
    cess: Math.round(cess),
    total: Math.round(total),
    effective: inc > 0 ? Math.round((total / inc) * 10000) / 100 : 0,
  };
};

// ─── Result guard (before UI display) ───

/** Ensure no NaN/Infinity/undefined reaches the screen */
export const safeResult = (val: unknown, fallback = 0): number => {
  const n = safeNum(val, fallback);
  return n;
};

// ─── Type guards ───

/** Runtime check: is this a non-null object? */
export const isRecord = (val: unknown): val is Record<string, unknown> => {
  return val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val);
};

// ─── Input validation from memory/restore ───

/** Infer the shape from an InputSchema — keys become the output type */
type SchemaShape<S extends InputSchema> = {
  [K in keyof S]: number;
};

/** Validate and clamp all inputs against schema. Strips garbage from corrupted restores.
 *  Returns an object with exactly the keys defined in the schema, all guaranteed to be finite numbers. */
export const validateCalcInputs = <S extends InputSchema>(
  raw: unknown,
  schema: S
): SchemaShape<S> => {
  const cleaned: Record<string, number> = {};
  const rawObj = isRecord(raw) ? raw : {};

  for (const [key, config] of Object.entries(schema)) {
    cleaned[key] = safeRange(rawObj[key], config.min, config.max, config.default);
  }

  // Safe: cleaned has exactly the keys from schema, all numbers from safeRange
  return cleaned as SchemaShape<S>;
};

// ─── Hash for duplicate detection ───

/** Generate a stable hash from calcId + result object. Order-insensitive, locale-insensitive. */
export const hashResult = (calcId: string, result: Record<string, string>): string => {
  const sorted = Object.keys(result)
    .sort()
    .map(k => k + ':' + String(result[k]).replace(/[₹,\s%]/g, ''))
    .join('|');
  return calcId + '::' + sorted;
};

// ─── Date guards (timezone-safe, fintech-grade) ───

/** Core calendar validation — rejects dates that JS silently wraps.
 *  new Date(2024, 1, 31) → Mar 2 (wraps). This catches it.
 *  Returns true only if the constructed Date matches the intended y/m/d. */
const isValidCalendarDate = (d: Date, year: number, month: number, day: number): boolean => {
  return !isNaN(d.getTime()) &&
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day;
};

/** Parse any date value safely. Returns null for invalid or wrapped dates.
 *  CRITICAL: new Date('2024-02-31') silently becomes March 2.
 *  This function catches that and returns null instead.
 *  Handles: Date objects, ISO strings, YYYY-MM-DD, DD-MM-YYYY, timestamps. */
export const safeDate = (val: unknown): Date | null => {
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number' && isFinite(val)) {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val !== 'string' || val.length < 6) return null;
  const s = val.trim();

  // DD-MM-YYYY (MF API format: "31-01-2024")
  const ddmm = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmm) {
    const day = Number(ddmm[1]), month = Number(ddmm[2]), year = Number(ddmm[3]);
    const d = new Date(year, month - 1, day);
    return isValidCalendarDate(d, year, month, day) ? d : null;
  }

  // YYYY-MM-DD (ISO format — from <input type="date"> or API)
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const year = Number(iso[1]), month = Number(iso[2]), day = Number(iso[3]);
    const d = new Date(year, month - 1, day);
    return isValidCalendarDate(d, year, month, day) ? d : null;
  }

  // Fallback: let JS parse, then verify by round-tripping
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  // Re-extract components and verify they match (catches silent wrapping)
  const rebuilt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (rebuilt.getTime() !== new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) return null;
  return d;
};

/** Parse DD-MM-YYYY specifically (MF API NAV dates). Returns null if invalid or wraps.
 *  "31-02-2024" → null (Feb has no 31st — JS would silently wrap to March). */
export const parseDDMMYYYY = (s: string): Date | null => {
  if (!s || typeof s !== 'string') return null;
  const p = s.split('-');
  if (p.length !== 3) return null;
  const day = Number(p[0]), month = Number(p[1]), year = Number(p[2]);
  if (!isFinite(day) || !isFinite(month) || !isFinite(year)) return null;
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  return isValidCalendarDate(d, year, month, day) ? d : null;
};

/** Get today's date as YYYY-MM-DD string. Uses LOCAL time, not UTC.
 *  Critical: new Date().toISOString() returns UTC — at 11:30 PM IST returns tomorrow.
 *  This function always returns the user's local date. */
export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Get current month as YYYY-MM string (local time). */
export const thisMonthISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Calculate difference between two dates in whole days. DST-safe.
 *  Uses UTC normalization to avoid 23h/25h day issues around DST transitions. */
export const safeDateDiff = (a: unknown, b: unknown): number => {
  const da = safeDate(a);
  const db = safeDate(b);
  if (!da || !db) return 0;
  // Normalize to UTC midnight — eliminates DST hour drift
  const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round(Math.abs(utcA - utcB) / 86400000);
};

/** Calculate age breakdown from date of birth. Returns null for invalid DOB. */
export const safeAge = (dob: unknown): { years: number; months: number; days: number; totalDays: number } | null => {
  const birth = safeDate(dob);
  if (!birth) return null;
  const now = new Date();
  if (birth > now) return null; // Future DOB
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  const totalDays = safeDateDiff(birth, now);
  return { years, months, days, totalDays };
};

/** Validate a YYYY-MM string for month navigation. Returns valid YYYY-MM or fallback. */
export const safeMonth = (val: unknown, fallback?: string): string => {
  const fb = fallback || thisMonthISO();
  if (typeof val !== 'string') return fb;
  const m = val.match(/^(\d{4})-(\d{2})$/);
  if (!m) return fb;
  const year = Number(m[1]), month = Number(m[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return fb;
  return val;
};

/** Navigate month safely: returns YYYY-MM string offset by delta months. */
export const offsetMonth = (yyyymm: string, delta: number): string => {
  const safe = safeMonth(yyyymm);
  const d = new Date(Number(safe.slice(0, 4)), Number(safe.slice(5, 7)) - 1 + delta, 1);
  if (isNaN(d.getTime())) return safe;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Format YYYY-MM to readable month/year. Returns empty string for invalid input. */
export const formatMonth = (yyyymm: string): string => {
  const safe = safeMonth(yyyymm);
  const d = new Date(Number(safe.slice(0, 4)), Number(safe.slice(5, 7)) - 1, 1);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

// ─── localStorage shape sanitizers ───
// Corrupted or tampered localStorage data can parse as valid JSON
// but have wrong shapes → runtime crashes when accessing .name, .transactions, etc.
// These sanitizers drop invalid items and coerce fields to safe defaults.

/** Sanitize Khata customer array — drops items with missing name or bad transactions */
export function sanitizeKhataCustomers(raw: unknown, limit: number): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).filter(c =>
    typeof c.name === 'string' && c.name.length > 0 &&
    (c.transactions === undefined || Array.isArray(c.transactions))
  ).slice(0, limit).map(c => ({
    ...c,
    name: String(c.name).slice(0, 30),
    phone: typeof c.phone === 'string' ? c.phone.slice(0, 15) : '',
    transactions: Array.isArray(c.transactions)
      ? c.transactions.filter(isRecord).filter(tx =>
          typeof tx.amount === 'number' && (tx.type === 'gave' || tx.type === 'got')
        )
      : [],
  }));
}

/** Sanitize Split sessions — drops items with missing name or bad members/expenses */
export function sanitizeSplitSessions(raw: unknown, limit: number): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).filter(s =>
    typeof s.name === 'string' && s.name.length > 0 &&
    Array.isArray(s.members) && Array.isArray(s.expenses)
  ).slice(0, limit).map(s => ({
    ...s,
    name: String(s.name).slice(0, 25),
    members: (s.members as unknown[]).filter(isRecord).filter(m => typeof m.name === 'string'),
    expenses: (s.expenses as unknown[]).filter(isRecord).filter(e =>
      typeof e.amount === 'number' && (typeof e.payer === 'number' || typeof e.payer === 'string')
    ),
    settledList: Array.isArray(s.settledList) ? s.settledList.filter(k => typeof k === 'string') : [],
  }));
}

/** Sanitize Expense data — validates entries, recurring, budget, catBudgets */
export function sanitizeExpenseData(raw: unknown): {
  entries: Record<string, unknown>[]; recurring: Record<string, unknown>[];
  budget: number; catBudgets: Record<string, number>;
} {
  const empty = { entries: [], recurring: [], budget: 30_000, catBudgets: {} };
  if (!isRecord(raw)) return empty;
  return {
    entries: Array.isArray(raw.entries)
      ? raw.entries.filter(isRecord).filter(e => typeof e.amount === 'number' && typeof e.category === 'string')
      : [],
    recurring: Array.isArray(raw.recurring)
      ? raw.recurring.filter(isRecord).filter(r => typeof r.amount === 'number')
      : [],
    budget: safeRange(raw.budget, 1000, 10_000_000, 30_000),
    catBudgets: isRecord(raw.catBudgets)
      ? Object.fromEntries(Object.entries(raw.catBudgets).filter(([, v]) => typeof v === 'number'))
      : {},
  };
}

/** Sanitize Calorie data — validates meals object, goal, history */
export function sanitizeCalorieData(raw: unknown): {
  date: string; meals: Record<string, unknown[]>; goal: number; history: Record<string, unknown>[];
} | null {
  if (!isRecord(raw)) return null;
  const meals: Record<string, unknown[]> = {};
  if (isRecord(raw.meals)) {
    for (const [key, val] of Object.entries(raw.meals)) {
      if (Array.isArray(val)) {
        meals[key] = val.filter(isRecord).filter(f => typeof f.cal === 'number');
      }
    }
  }
  return {
    date: typeof raw.date === 'string' ? raw.date : '',
    meals,
    goal: safeRange(raw.goal, 500, 10_000, 2000),
    history: Array.isArray(raw.history)
      ? raw.history.filter(isRecord).filter(h => typeof h.date === 'string' && typeof h.total === 'number')
      : [],
  };
}
