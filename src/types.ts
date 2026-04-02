// FinCalci — Shared type definitions
// Every component, utility, and calculator imports types from here.

// ─── Theme ───
export interface Theme {
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textDim: string;
  inputBg: string;
  navBg: string;
  shadow: string;
  [key: string]: string; // Allow Record<string,string> compat
}

// ─── Calculator props (every calculator receives these) ───
export interface CalcProps {
  color: string;
  t: Theme;
  onResult?: (result: Record<string, string>) => void;
}

// ─── API result (Option A error handling) ───
export interface ApiResult<T> {
  data: T;
  error: string | null;
}

// ─── Live rates ───
export interface CurrencyRates {
  [code: string]: number;
}

export interface GoldRates {
  goldPerGram: number;
  silverPerGram: number;
}

export interface RatesResponse {
  currency: CurrencyRates;
  gold: GoldRates;
  live: boolean;
  cached: boolean;
  age: string;
  timestamp?: number;
  error?: string | null;
}

// ─── MF scheme ───
export interface MFScheme {
  name: string;
  category: string;
  fund: string;
  nav: number;
  navDate: string;
  r1y: number | null;
  r3y: number | null;
  r5y: number | null;
}

export interface MFSearchResult {
  code: number;
  name: string;
}

// ─── Stock ───
export interface StockData {
  name: string;
  symbol: string;
  price: number;
  change: number | null;
  high52: number;
  low52: number;
  pe: number;
  marketCap: string;
  sector: string;
  industry: string;
}

// ─── Calculator history entry ───
export interface HistoryEntry {
  id: number;
  calcId: string;
  result: Record<string, string>;
  time: string;
  _hash?: string;
}

// ─── User stats (gamification) ───
export interface UserStats {
  totalCalcs: number;
  uniqueCalcs: number;
  calcSet: string[];
  streak: number;
  lastDate: string;
  saved: number;
}

// ─── Calculator metadata (from CALCULATORS array) ───
export interface CalcMeta {
  id: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
  seoDesc?: string;
}

// ─── Achievement ───
export interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  check: (stats: UserStats) => boolean;
}

// ─── Khata Book ───
export interface KhataCustomer {
  id: number;
  name: string;
  phone: string;
  createdAt: string;
  transactions: KhataTransaction[];
}

export interface KhataTransaction {
  id: number;
  amount: number;
  type: 'gave' | 'got';
  note: string;
  date: string;
}

// ─── Expense Tracker ───
export interface ExpenseEntry {
  id: number;
  amount: number;
  category: string;
  type: 'expense' | 'income';
  note: string;
  date: string;
}

export interface RecurringExpense {
  id: number;
  amount: number;
  category: string;
  note: string;
}

// ─── Split/Tip ───
export interface SplitSession {
  id: number;
  name: string;
  members: SplitMember[];
  expenses: SplitExpense[];
  settledList: string[];
  createdAt: string;
  nextMemberId: number;
}

export interface SplitMember {
  id: number;
  name: string;
}

export interface SplitExpense {
  id: number;
  payer: number;
  amount: number;
  desc: string;
  splitType: 'equal' | 'custom';
  customShares?: Record<number, number>;
}


// ─── Input schemas for validation ───
export interface InputConstraint {
  readonly min: number;
  readonly max: number;
  readonly default: number;
}

export interface InputSchema {
  readonly [key: string]: InputConstraint;
}

// ─── Per-calculator input shapes (compile-time enforcement) ───
export interface EMIInputs { P: number; rate: number; n: number; }
export interface SIPInputs { monthly: number; rate: number; years: number; }
export interface GSTInputs { amount: number; rate: number; }
export interface GoldInputs { weight: number; makingPct: number; gstPct: number; }
export interface TaxInputs { income: number; }
export interface FDInputs { P: number; rate: number; years: number; }
export interface SalaryInputs { ctc: number; }
export interface PPFInputs { yearly: number; years: number; }
export interface RetireInputs { monthlyExp: number; savings: number; monthlySIP: number; workYears: number; retireYears: number; inflation: number; returnRate: number; }
export interface CompoundInputs { P: number; rate: number; years: number; monthlyAdd: number; }
export interface CurrencyInputs { amount: number; }
export interface PercentInputs { value: number; total: number; }

// ─── Cache entry ───
export interface CacheEntry<T = unknown> {
  data: T;
  ts: number;
  ttl: number;
}

// ─── Design tokens ───
export interface DesignTokens {
  color: {
    primary: string;
    primaryDim: string;
    secondary: string;
    secondaryDim: string;
    danger: string;
    dangerDim: string;
    success: string;
    successDim: string;
    warning: string;
    warningDim: string;
  };
  fontSize: {
    hero: number;
    title: number;
    body: number;
    small: number;
    caption: number;
  };
  fontWeight: {
    regular: number;
    medium: number;
  };
  fontFamily: {
    sans: string;
    mono: string;
  };
  space: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  shadow: {
    subtle: string;
    medium: string;
    heavy: string;
  };
}

// ─── Format types ───
export type FormatType = 'currency' | 'compact' | 'pct' | 'num' | 'decimal' | 'duration';
