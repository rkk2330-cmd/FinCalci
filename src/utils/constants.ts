// FinCalci — App-wide constants (zero magic numbers)
// Every hardcoded value in the app should live here.

// ─── Storage keys (typo here = compile error, not silent data loss) ───
export const KEYS = {
  PREFS: 'fincalci-prefs',
  FAVORITES: 'fincalci-favorites',
  HISTORY: 'fincalci-history',
  RECENT: 'fincalci-recent',
  STATS: 'fincalci-stats',
  EXPENSE: 'fincalci-expense-tracker',
  SPLIT: 'fincalci-split-sessions',
  KHATA: 'fincalci-khata',
  INPUTS: 'fincalci-inputs',
  ANALYTICS: 'fincalci-analytics',
  RATES: 'fincalci-live-rates',
  EVENTS: 'fincalci-analytics-events',
  ONBOARDED: 'fincalci-onboarded',
  CALC_DATA: 'fincalci-calc',
} as const;

// ─── API configuration ───
export const API = {
  TIMEOUT_FAST: 6_000,
  TIMEOUT_SLOW: 8_000,

  RATE_LIMIT_MF: 2_000,
  RATE_LIMIT_STOCK: 3_000,
  RATE_LIMIT_FOOD: 2_000,
  RATE_COOLDOWN: 60_000,

  CACHE_MF_SEARCH: 5 * 60 * 1_000,     // 5 min
  CACHE_MF_SCHEME: 60 * 60 * 1_000,     // 1 hr
  CACHE_STOCK: 5 * 60 * 1_000,          // 5 min
  CACHE_FOOD: 10 * 60 * 1_000,          // 10 min
  CACHE_RATES_HOURS: 1,                  // reduced from 12 to 1 hr

  GOLD_MIN_PER_GRAM: 3_000,
  GOLD_MAX_PER_GRAM: 30_000,
  GOLD_IMPORT_DUTY: 1.15,
  GOLD_SILVER_RATIO: 80,

  URLS: {
    CURRENCY_PRIMARY: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    CURRENCY_FALLBACK: 'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
    GOLD: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json',
    MF_SEARCH: 'https://api.mfapi.in/mf/search',
    MF_SCHEME: 'https://api.mfapi.in/mf',
    STOCK: 'https://stock.indianapi.in/stock',
    FOOD: 'https://world.openfoodfacts.org/cgi/search.pl',
  },

  MIN_VALID_CURRENCY_KEYS: 10,
} as const;

// ─── Financial constants ───
// ⚠️  MAINTENANCE: These values change. Review dates below.
//
// YEARLY (Union Budget — Feb/Jul):
//   TAX_SLABS_OLD, TAX_SLABS_NEW, STANDARD_DEDUCTION_*, SECTION_80C/80D, TAX_CESS
//   → Update after budget announcement, before new FY starts (Apr 1)
//
// QUARTERLY (RBI/EPFO):
//   PPF default rate (7.1%) → check rbi.org.in each quarter
//   EPF default rate (8.25%) → check epfindia.gov.in each year
//
// VARIABLE (bank/market):
//   LOAN_PRESETS rates, FD bank rates → check quarterly
//   GOLD_IMPORT_DUTY → check after customs notification
//
// LAST_VERIFIED: 2025-02-01 (Union Budget FY 2025-26)
// NEXT_REVIEW:   2026-04-15 (verify FY 2026-27 budget changes) (post any mid-year budget revision)

export const FINANCE_REVIEW = {
  LAST_VERIFIED: '2025-02-01',
  NEXT_REVIEW: '2026-04-15',
  FY: '2025-26',
} as const;

export const FINANCE = {
  MONTHS_PER_YEAR: 12,
  RATE_TO_MONTHLY: 1_200,    // annualRate / 1200 = monthly decimal
  TAX_CESS: 0.04,            // 4% health & education cess
  TROY_OZ_TO_GRAMS: 31.1035,
  MPG_TO_KMPL: 0.425144,
  DEFAULT_INFLATION: 0.06,
  DEFAULT_FD_RATE: 0.07,

  // Salary breakdown ratios
  BASIC_PCT: 0.40,
  HRA_PCT_OF_BASIC: 0.50,
  EPF_PCT: 0.12,
  PRO_TAX_THRESHOLD: 250_000,
  PRO_TAX_AMOUNT: 2_400,

  STANDARD_DEDUCTION_OLD: 50_000,
  STANDARD_DEDUCTION_NEW: 75_000,
  SECTION_80C_MAX: 150_000,
  SECTION_80D_MAX: 25_000,
  SECTION_80D_SENIOR: 50_000,
  NPS_80CCD_MAX: 50_000,
  HRA_METRO_PCT: 0.50,
  HRA_NON_METRO_PCT: 0.40,

  // Tax slabs — Old regime FY 2025-26
  TAX_SLABS_OLD: [
    { min: 0, max: 250_000, rate: 0 },
    { min: 250_000, max: 500_000, rate: 0.05 },
    { min: 500_000, max: 1_000_000, rate: 0.20 },
    { min: 1_000_000, max: Infinity, rate: 0.30 },
  ],

  // Tax slabs — New regime FY 2025-26
  TAX_SLABS_NEW: [
    { min: 0, max: 400_000, rate: 0 },
    { min: 400_000, max: 800_000, rate: 0.05 },
    { min: 800_000, max: 1_200_000, rate: 0.10 },
    { min: 1_200_000, max: 1_600_000, rate: 0.15 },
    { min: 1_600_000, max: 2_000_000, rate: 0.20 },
    { min: 2_000_000, max: 2_400_000, rate: 0.25 },
    { min: 2_400_000, max: Infinity, rate: 0.30 },
  ],

  // Loan presets
  LOAN_PRESETS: [
    { id: 'home', label: '🏠 Home', rate: 8.5, tenure: 240, min: 500_000, max: 50_000_000 },
    { id: 'car', label: '🚗 Car', rate: 9, tenure: 60, min: 100_000, max: 5_000_000 },
    { id: 'personal', label: '👤 Personal', rate: 12, tenure: 48, min: 50_000, max: 4_000_000 },
    { id: 'edu', label: '🎓 Education', rate: 8, tenure: 84, min: 100_000, max: 5_000_000 },
  ],

  // GST slab options
  GST_RATES: [0, 0.25, 3, 5, 12, 18, 28],

  // FD bank rates (indicative, review quarterly)
  // LAST_VERIFIED: 2025-02-01
  FD_BANK_RATES: [
    { name: 'SBI', r: 6.5 }, { name: 'HDFC', r: 7.0 }, { name: 'ICICI', r: 6.9 },
    { name: 'Axis', r: 7.1 }, { name: 'Post Office', r: 7.5 },
  ],

  // Weight units for gold
  WEIGHT_UNITS: { g: 1, tola: 11.664, oz: 31.1035, kg: 1000 } as Record<string, number>,

  // Body fat formula constants (US Navy method)
  BODY_FAT_CONST_M: { a: 1.0324, b: 0.19077, c: 0.15456, offset: 495, sub: 450 },
  BODY_FAT_CONST_F: { a: 1.29579, b: 0.35004, c: 0.22100, offset: 495, sub: 450 },
} as const;

// ─── UI timing (ms) ───
export const TIMING = {
  TOAST_DURATION: 1_800,
  ACHIEVEMENT_DURATION: 3_000,
  RATE_POPUP_DELAY: 1_500,
  RELOAD_DELAY: 1_500,
  BACK_EXIT_WINDOW: 2_000,
  PREFETCH_FALLBACK: 2_000,
  PREFETCH_STAGGER: 200,
  DEEP_LINK_DELAY: 300,
  SWIPE_THRESHOLD_PX: 80,
  DEBOUNCE_CALC: 150,
  DEBOUNCE_PERSIST: 500,
  ANIMATION_FAST: 200,
  ANIMATION_NORMAL: 300,
  ANIMATION_SLOW: 600,
  NUMBER_COUNT_UP: 400,
  STAGGER_ITEM: 30,
  SPLASH_TIMEOUT: 8_000,
} as const;

// ─── Storage limits ───
export const LIMITS = {
  HISTORY_MAX: 50,
  RECENT_MAX: 10,
  FAVORITES_MAX: 50,
  EVENTS_MAX: 500,
  EXPENSE_MAX: 500,
  KHATA_CUSTOMERS_MAX: 200,
  KHATA_TXNS_PER_CUSTOMER: 500,
  SPLIT_SESSIONS_MAX: 20,
  SPLIT_MEMBERS_MAX: 30,
  CACHE_ENTRIES_PER_NS: 30,
  STORAGE_QUOTA_BYTES: 5 * 1024 * 1024,
  SINGLE_WRITE_MAX_BYTES: 100 * 1024,
  STORAGE_WARNING_PCT: 0.80,
} as const;

// ─── Slider visual ranges (subset of INPUT_SCHEMAS for usable slider UI) ───
// Typed input can go beyond these via HARD_MAX = max * 100 in SliderInput.
// Change slider max here → all calculators update automatically.
export const SLIDER = {
  emi: {
    P: { min: 10_000, max: 10_000_000, step: 10_000 },
    rate: { min: 1, max: 30, step: 0.1 },
    n: { min: 1, max: 360, step: 1 },
    procFee: { min: 0, max: 10, step: 0.1 },
    income: { min: 0, max: 1_000_000, step: 5_000 },
    extra: { min: 0, max: 500_000, step: 1_000 },
    lump: { min: 0, max: 10_000_000, step: 50_000 },
    lumpMonth: { min: 1, max: 360, step: 1 },
  },
  sip: {
    monthly: { min: 100, max: 1_000_000, step: 500 },
    rate: { min: 1, max: 30, step: 0.5 },
    years: { min: 1, max: 40, step: 1 },
    goal: { min: 100_000, max: 100_000_000, step: 100_000 },
    step: { min: 0, max: 50, step: 1 },
    lump: { min: 10_000, max: 10_000_000, step: 10_000 },
    swpCorpus: { min: 100_000, max: 100_000_000, step: 100_000 },
    swpMonthly: { min: 1_000, max: 1_000_000, step: 1_000 },
    swpYears: { min: 1, max: 40, step: 1 },
  },
  gst: {
    amount: { min: 0, max: 10_000_000, step: 100 },
  },
  gold: {
    weight: { min: 0.1, max: 10_000, step: 0.1 },
    making: { min: 0, max: 30, step: 0.5 },
    gst: { min: 0, max: 10, step: 0.5 },
  },
  tax: {
    income: { min: 0, max: 50_000_000, step: 50_000 },
    sec80c: { min: 0, max: 150_000, step: 5_000 },
    sec80d: { min: 0, max: 50_000, step: 5_000 },
    nps: { min: 0, max: 50_000, step: 5_000 },
    homeLoan: { min: 0, max: 200_000, step: 10_000 },
    hra: { min: 0, max: 500_000, step: 5_000 },
    rent: { min: 0, max: 2_400_000, step: 6_000 },
  },
  fd: {
    P: { min: 1_000, max: 10_000_000, step: 1_000 },
    rate: { min: 1, max: 15, step: 0.1 },
    years: { min: 1, max: 30, step: 1 },
    rd: { min: 500, max: 500_000, step: 500 },
  },
  salary: {
    ctc: { min: 100_000, max: 50_000_000, step: 50_000 },
  },
  ppf: {
    yearly: { min: 500, max: 150_000, step: 500 },
    years: { min: 15, max: 50, step: 1 },
    rate: { min: 5, max: 10, step: 0.1 },
    epfBasic: { min: 5_000, max: 200_000, step: 1_000 },
    epfRate: { min: 5, max: 12, step: 0.25 },
    epfYears: { min: 5, max: 40, step: 1 },
  },
  retire: {
    monthlyExp: { min: 5_000, max: 500_000, step: 5_000 },
    savings: { min: 0, max: 100_000_000, step: 50_000 },
    sip: { min: 0, max: 1_000_000, step: 1_000 },
    workYears: { min: 1, max: 50, step: 1 },
    retireYears: { min: 10, max: 50, step: 5 },
    inflation: { min: 2, max: 15, step: 0.5 },
    returnRate: { min: 4, max: 20, step: 0.5 },
  },
  compound: {
    P: { min: 1_000, max: 10_000_000, step: 1_000 },
    rate: { min: 1, max: 50, step: 0.5 },
    years: { min: 1, max: 50, step: 1 },
    monthly: { min: 0, max: 1_000_000, step: 500 },
  },
  currency: {
    amount: { min: 1, max: 10_000_000, step: 100 },
  },
  percent: {
    value: { min: 0, max: 999_999, step: 1 },
  },
} as const;

// ─── Input clamping limits for raw <input type=number> ───
export const CLAMP = {
  AMOUNT_MAX: 10_000_000,
  AMOUNT_HUGE_MAX: 100_000_000,
  DENOM_COUNT_MAX: 99_999,
  CUSTOM_RATE_MIN: 0.0001,
  CUSTOM_RATE_MAX: 99_999,
  BUDGET_MAX: 999_999,
} as const;

// ─── Input schemas (absolute validation boundaries — useSchemaInputs reads these) ───
export const INPUT_SCHEMAS = {
  emi: {
    P: { min: 10_000, max: 100_000_000, default: 5_000_000 },
    rate: { min: 0, max: 30, default: 8.5 },
    n: { min: 1, max: 360, default: 240 },
  },
  sip: {
    monthly: { min: 100, max: 10_000_000, default: 5_000 },
    rate: { min: 0, max: 50, default: 12 },
    years: { min: 1, max: 40, default: 10 },
  },
  gst: {
    amount: { min: 0, max: 999_999_999, default: 10_000 },
    rate: { min: 0, max: 28, default: 18 },
  },
  gold: {
    weight: { min: 0.1, max: 10_000, default: 10 },
    makingPct: { min: 0, max: 30, default: 10 },
    gstPct: { min: 0, max: 10, default: 3 },
  },
  tax: {
    income: { min: 0, max: 999_999_999, default: 1_200_000 },
  },
  fd: {
    P: { min: 1_000, max: 100_000_000, default: 100_000 },
    rate: { min: 0, max: 15, default: 7 },
    years: { min: 1, max: 30, default: 5 },
  },
  salary: {
    ctc: { min: 100_000, max: 999_999_999, default: 1_200_000 },
  },
  ppf: {
    yearly: { min: 500, max: 150_000, default: 150_000 },
    years: { min: 15, max: 50, default: 15 },
  },
  retire: {
    monthlyExp: { min: 1_000, max: 10_000_000, default: 50_000 },
    savings: { min: 0, max: 999_999_999, default: 500_000 },
    monthlySIP: { min: 0, max: 10_000_000, default: 20_000 },
    workYears: { min: 1, max: 50, default: 25 },
    retireYears: { min: 1, max: 50, default: 30 },
    inflation: { min: 0, max: 20, default: 6 },
    returnRate: { min: 0, max: 30, default: 12 },
  },
  compound: {
    P: { min: 1_000, max: 100_000_000, default: 100_000 },
    rate: { min: 0, max: 50, default: 10 },
    years: { min: 1, max: 50, default: 10 },
    monthlyAdd: { min: 0, max: 10_000_000, default: 0 },
  },
  currency: {
    amount: { min: 0, max: 999_999_999, default: 1_000 },
  },
  percent: {
    value: { min: 0, max: 999_999_999, default: 0 },
    total: { min: 0, max: 999_999_999, default: 100 },
  },
} as const;

// ─── Fallback data (when all APIs fail) ───
export const FALLBACK_CURRENCY: Record<string, number> = {
  USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79, JPY: 151, AED: 3.67,
  CAD: 1.36, AUD: 1.54, SGD: 1.34, CHF: 0.88, BDT: 110, LKR: 298,
  NPR: 133.5, MYR: 4.47, THB: 33.8, SAR: 3.75, KWD: 0.31, ZAR: 18.2,
  BRL: 4.97, CNY: 7.24,
};

export const FALLBACK_GOLD = {
  goldPerGram: 7200,
  silverPerGram: 85,
};

// ─── Calculator registry ───
export const CALCULATOR_IDS = [
  'emi', 'sip', 'gst', 'age', 'tip', 'percentage',
  'currency', 'compound', 'tax', 'unit', 'fd', 'cash',
  'salary', 'ppf', 'date', 'gold', 'retire', 'expense',
] as const;

export type CalculatorId = typeof CALCULATOR_IDS[number];

export const VALID_IDS = new Set<string>(CALCULATOR_IDS);

// ─── SEO Routes (clean URLs for Google indexing) ───
// Each calculator gets its own /slug URL with unique title + description.
// Google indexes /emi-calculator, not /?calc=emi.
export const ROUTES: Record<string, { slug: string; title: string; h1: string; description: string }> = {
  emi:        { slug: 'emi-calculator',          title: 'EMI Calculator — Home Loan, Car Loan, Personal Loan | FinCalci',            h1: 'EMI Calculator',              description: 'Calculate home loan EMI, compare banks, check prepayment savings. Free online EMI calculator for India.' },
  sip:        { slug: 'sip-calculator',          title: 'SIP Calculator — Mutual Fund, Step-up SIP, SWP | FinCalci',                h1: 'SIP Calculator',              description: 'SIP calculator with step-up, lumpsum, SWP, mutual fund NAV lookup. Plan your investments.' },
  gst:        { slug: 'gst-calculator',          title: 'GST Calculator — Inclusive, Exclusive, Reverse | FinCalci',                h1: 'GST Calculator',              description: 'GST calculator — inclusive, exclusive, reverse. Multi-item invoice with CGST SGST IGST breakdown.' },
  tax:        { slug: 'income-tax-calculator',   title: 'Income Tax Calculator — Old vs New Regime FY 2025-26 | FinCalci',          h1: 'Income Tax Calculator',       description: 'Income tax calculator FY 2025-26. Compare old vs new regime. HRA, 80C, 80D deductions.' },
  gold:       { slug: 'gold-rate-calculator',    title: 'Gold & Silver Calculator — Live Rates India | FinCalci',                   h1: 'Gold & Silver Calculator',    description: 'Gold & silver price calculator. Live rates, purity, making charges, GST. India prices.' },
  currency:   { slug: 'currency-converter',      title: 'Currency Converter — Live Exchange Rates | FinCalci',                      h1: 'Currency Converter',          description: 'Currency converter with 20+ currencies. Live exchange rates. INR USD EUR GBP JPY.' },
  fd:         { slug: 'fd-rd-calculator',        title: 'FD & RD Calculator — Fixed Deposit, Recurring Deposit | FinCalci',         h1: 'FD & RD Calculator',          description: 'FD & RD calculator. Compare bank rates. Quarterly compounding. Maturity value.' },
  salary:     { slug: 'salary-calculator',       title: 'Salary Calculator — CTC to Take-Home Breakdown | FinCalci',               h1: 'Salary Calculator',           description: 'Salary calculator — CTC to take-home. Tax, PF, HRA breakdown. Compare offers.' },
  retire:     { slug: 'retirement-calculator',   title: 'Retirement Calculator — FIRE Number, Corpus Planner | FinCalci',           h1: 'Retirement FIRE Calculator',  description: 'Retirement calculator — FIRE number, corpus needed, monthly SIP. Inflation adjusted.' },
  compound:   { slug: 'compound-interest',       title: 'Compound Interest Calculator — Rule of 72 | FinCalci',                    h1: 'Compound Interest Calculator', description: 'Compound interest calculator. Monthly additions. Rule of 72. Growth projection.' },
  ppf:        { slug: 'ppf-epf-calculator',      title: 'PPF & EPF Calculator — Public Provident Fund | FinCalci',                 h1: 'PPF & EPF Calculator',        description: 'PPF & EPF calculator. 15-year maturity. Year-wise growth breakdown.' },
  expense:    { slug: 'expense-tracker',         title: 'Expense Tracker — Budget, Categories, Recurring | FinCalci',               h1: 'Expense Tracker',             description: 'Expense tracker with categories, budgets, recurring expenses. Monthly analysis.' },
  tip:        { slug: 'bill-splitter',           title: 'Bill Splitter — Split Expenses with Friends | FinCalci',                   h1: 'Bill Splitter',               description: 'Bill splitter with groups, custom splits, settlement tracker.' },
  age:        { slug: 'age-calculator',          title: 'Age Calculator — Exact Age in Years Months Days | FinCalci',               h1: 'Age Calculator',              description: 'Age calculator — exact years, months, days. Birthday countdown. Zodiac sign.' },
  date:       { slug: 'date-calculator',         title: 'Date Calculator — Days Between Dates | FinCalci',                         h1: 'Date Calculator',             description: 'Date calculator — days between dates, add/subtract days.' },
  percentage: { slug: 'percentage-calculator',   title: 'Percentage Calculator — Increase, Decrease, Margin | FinCalci',            h1: 'Percentage Calculator',       description: 'Percentage calculator — all modes. Increase, decrease, margin, markup.' },
  unit:       { slug: 'unit-converter',          title: 'Unit Converter — Length, Weight, Temperature & More | FinCalci',           h1: 'Unit Converter',              description: 'Unit converter — 13 categories, 200+ units. Length, weight, temperature, data.' },
  cash:       { slug: 'khata-book',              title: 'Khata Book — Digital Credit Debit Tracker | FinCalci',                    h1: 'Khata Book',                  description: 'Cash counter & Khata Book. Count notes. Track credit/debit with customers.' },
};

// Reverse lookup: slug → calcId
export const SLUG_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTES).map(([id, r]) => [r.slug, id])
);

// Legacy support: old ?calc=emi still works via redirect

// ─── Re-export runtime data (CALCULATORS, UNIT_CATS, etc.) ───
// Typed in data.ts, re-exported here so imports don't change.
export {
  CALCULATORS, ACHIEVEMENTS, getTodayTip, MONTH_NAMES,
  EXP_CATEGORIES, PAY_MODES, QUICK_AMTS,
  UNIT_CATS, DENOMINATIONS,
} from './data';
