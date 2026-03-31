// FinCalci — Validator tests (REAL, EXECUTABLE)
// Run: npm test
import { describe, it, expect } from 'vitest';
import {
  safeNum, safePos, safeRange, safeDivide, safePow,
  safeMul, safePct, safeMonthlyRate, safeRateDecimal, safeSub, safeRound, safeFixed,
  safeBMI, safeIdealWeight, safeGST, safeSalary,
  safeEMI, safeSIPFV, safeCompound, safeTax,
  safeResult, validateCalcInputs, hashResult, isRecord,
} from '../src/utils/validate';
import { FINANCE, INPUT_SCHEMAS } from '../src/utils/constants';

// ─── safeNum ───
describe('safeNum', () => {
  it('returns number for valid input', () => {
    expect(safeNum(42)).toBe(42);
    expect(safeNum(3.14)).toBe(3.14);
    expect(safeNum(-5)).toBe(-5);
    expect(safeNum(0)).toBe(0);
  });

  it('returns fallback for garbage', () => {
    expect(safeNum(NaN)).toBe(0);
    expect(safeNum(Infinity)).toBe(0);
    expect(safeNum(-Infinity)).toBe(0);
    expect(safeNum(undefined)).toBe(0);
    expect(safeNum(null)).toBe(0);
    expect(safeNum('')).toBe(0);
    expect(safeNum('banana')).toBe(0);
    expect(safeNum({})).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(safeNum('42')).toBe(42);
    expect(safeNum('3.14')).toBe(3.14);
  });

  it('uses custom fallback', () => {
    expect(safeNum(NaN, 100)).toBe(100);
    expect(safeNum(undefined, -1)).toBe(-1);
  });
});

// ─── safePos ───
describe('safePos', () => {
  it('returns positive numbers', () => {
    expect(safePos(5)).toBe(5);
    expect(safePos(0.1)).toBe(0.1);
  });

  it('rejects zero and negatives', () => {
    expect(safePos(0)).toBe(1);
    expect(safePos(-5)).toBe(1);
    expect(safePos(0, 10)).toBe(10);
  });
});

// ─── safeRange ───
describe('safeRange', () => {
  it('clamps to range', () => {
    expect(safeRange(5, 0, 10)).toBe(5);
    expect(safeRange(-5, 0, 10)).toBe(0);
    expect(safeRange(15, 0, 10)).toBe(10);
  });

  it('handles NaN', () => {
    expect(safeRange(NaN, 0, 100)).toBe(0);
    expect(safeRange('garbage', 10, 50)).toBe(10);
  });
});

// ─── safeDivide ───
describe('safeDivide', () => {
  it('divides normally', () => {
    expect(safeDivide(10, 2)).toBe(5);
    expect(safeDivide(7, 3)).toBeCloseTo(2.333, 2);
  });

  it('returns fallback for /0', () => {
    expect(safeDivide(10, 0)).toBe(0);
    expect(safeDivide(10, 0, -1)).toBe(-1);
    expect(safeDivide(0, 0)).toBe(0);
  });

  it('handles NaN inputs', () => {
    expect(safeDivide(NaN, 5)).toBe(0);
    expect(safeDivide(10, NaN)).toBe(0);
  });
});

// ─── safePow ───
describe('safePow', () => {
  it('computes powers normally', () => {
    expect(safePow(2, 3)).toBe(8);
    expect(safePow(10, 0)).toBe(1);
  });

  it('handles NaN/Infinity', () => {
    expect(safePow(NaN, 3)).toBe(1); // safeNum(NaN, 1) = 1, pow(1,3) = 1
    expect(safePow(2, NaN)).toBe(1); // 2^0 = 1 (NaN exp → fallback 0)
  });
});

// ─── safeEMI (the critical formula) ───
describe('safeEMI', () => {
  it('calculates standard home loan correctly', () => {
    // ₹50L at 8.5% for 20 years = ₹43,391/month (verified with Excel PMT)
    const r = safeEMI(5_000_000, 8.5, 240);
    expect(r.emi).toBeGreaterThan(43_000);
    expect(r.emi).toBeLessThan(44_000);
    expect(r.total).toBeGreaterThan(r.emi * 239);
    expect(r.interest).toBeGreaterThan(0);
    expect(r.interest).toBeCloseTo(r.total - 5_000_000, 0);
  });

  it('handles rate = 0 (interest-free loan)', () => {
    const r = safeEMI(1_200_000, 0, 12);
    expect(r.emi).toBe(100_000); // simple division
    expect(r.interest).toBe(0);
    expect(r.total).toBe(1_200_000);
  });

  it('never returns NaN', () => {
    const cases = [
      safeEMI(NaN, 8.5, 240),
      safeEMI(5_000_000, NaN, 240),
      safeEMI(5_000_000, 8.5, NaN),
      safeEMI(0, 0, 0),
      safeEMI(-1, -1, -1),
      safeEMI('banana', 'garbage', undefined),
    ];
    for (const r of cases) {
      expect(Number.isFinite(r.emi)).toBe(true);
      expect(Number.isFinite(r.total)).toBe(true);
      expect(Number.isFinite(r.interest)).toBe(true);
      expect(r.interest).toBeGreaterThanOrEqual(0); // never negative
    }
  });

  it('matches Excel PMT for car loan', () => {
    // ₹8L at 9% for 5 years
    const r = safeEMI(800_000, 9, 60);
    // Excel: =PMT(9%/12, 60, -800000) = 16,607.15
    expect(r.emi).toBeGreaterThan(16_500);
    expect(r.emi).toBeLessThan(16_700);
  });
});

// ─── safeSIPFV ───
describe('safeSIPFV', () => {
  it('calculates SIP correctly', () => {
    // ₹5000/month at 12% for 10 years
    const r = safeSIPFV(5_000, 12, 10);
    expect(r.invested).toBe(600_000);
    expect(r.fv).toBeGreaterThan(1_100_000); // ~₹11.6L
    expect(r.gains).toBeCloseTo(r.fv - r.invested, 0);
  });

  it('handles rate = 0', () => {
    const r = safeSIPFV(10_000, 0, 5);
    expect(r.fv).toBe(600_000); // 10000 × 60 months
    expect(r.gains).toBe(0);
  });

  it('never returns NaN', () => {
    const r = safeSIPFV(NaN, NaN, NaN);
    expect(Number.isFinite(r.fv)).toBe(true);
    expect(r.gains).toBeGreaterThanOrEqual(0);
  });
});

// ─── safeCompound ───
describe('safeCompound', () => {
  it('calculates FD correctly', () => {
    // ₹1L at 7% quarterly for 5 years
    const r = safeCompound(100_000, 7, 5, 4);
    expect(r.maturity).toBeGreaterThan(140_000);
    expect(r.maturity).toBeLessThan(142_000);
    expect(r.interest).toBeCloseTo(r.maturity - 100_000, 0);
  });

  it('handles rate = 0', () => {
    const r = safeCompound(100_000, 0, 5);
    expect(r.maturity).toBe(100_000);
    expect(r.interest).toBe(0);
  });
});

// ─── safeTax ───
describe('safeTax', () => {
  it('calculates old regime correctly', () => {
    const r = safeTax(1_200_000, FINANCE.TAX_SLABS_OLD);
    expect(r.tax).toBeGreaterThan(0);
    expect(r.cess).toBe(Math.round(r.tax * 0.04));
    expect(r.total).toBe(r.tax + r.cess);
    expect(r.effective).toBeGreaterThan(0);
    expect(r.effective).toBeLessThan(30);
  });

  it('zero tax for income below 2.5L (old regime)', () => {
    const r = safeTax(200_000, FINANCE.TAX_SLABS_OLD);
    expect(r.tax).toBe(0);
    expect(r.total).toBe(0);
  });

  it('calculates new regime correctly', () => {
    const r = safeTax(1_200_000, FINANCE.TAX_SLABS_NEW);
    expect(r.tax).toBeGreaterThan(0);
  });

  it('handles zero/negative income', () => {
    expect(safeTax(0, FINANCE.TAX_SLABS_OLD).total).toBe(0);
    expect(safeTax(-500_000, FINANCE.TAX_SLABS_OLD).total).toBe(0);
  });
});

// ─── validateCalcInputs ───
describe('validateCalcInputs', () => {
  it('clamps values to schema range', () => {
    const r = validateCalcInputs(
      { P: 999_999_999, rate: -5, n: 0 },
      INPUT_SCHEMAS.emi
    );
    expect(r.P).toBe(100_000_000); // clamped to max
    expect(r.rate).toBe(0);        // clamped to min
    expect(r.n).toBe(1);           // clamped to min
  });

  it('uses defaults for missing keys', () => {
    const r = validateCalcInputs({}, INPUT_SCHEMAS.emi);
    expect(r.P).toBe(5_000_000);
    expect(r.rate).toBe(8.5);
    expect(r.n).toBe(240);
  });

  it('handles corrupted backup data', () => {
    const r = validateCalcInputs(
      { P: 'banana', rate: undefined, n: NaN },
      INPUT_SCHEMAS.emi
    );
    expect(r.P).toBe(5_000_000);  // NaN → falls to schema default
    expect(r.rate).toBe(8.5);  // undefined → schema default
    expect(r.n).toBe(240);   // NaN → schema default
  });

  it('handles null input', () => {
    const r = validateCalcInputs(null, INPUT_SCHEMAS.sip);
    expect(r.monthly).toBe(5_000);
    expect(r.rate).toBe(12);
    expect(r.years).toBe(10);
  });
});

// ─── hashResult (duplicate detection) ───
describe('hashResult', () => {
  it('generates stable hash', () => {
    const h1 = hashResult('emi', { EMI: '₹43,391', Total: '₹1,04,13,840' });
    const h2 = hashResult('emi', { EMI: '₹43,391', Total: '₹1,04,13,840' });
    expect(h1).toBe(h2);
  });

  it('is order-insensitive', () => {
    const h1 = hashResult('emi', { a: '1', b: '2' });
    const h2 = hashResult('emi', { b: '2', a: '1' });
    expect(h1).toBe(h2);
  });

  it('strips formatting (₹, commas)', () => {
    const h1 = hashResult('emi', { v: '₹43,391' });
    const h2 = hashResult('emi', { v: '43391' });
    expect(h1).toBe(h2);
  });

  it('different calcs produce different hashes', () => {
    const h1 = hashResult('emi', { v: '100' });
    const h2 = hashResult('sip', { v: '100' });
    expect(h1).not.toBe(h2);
  });
});

// ─── NEW ARITHMETIC GUARDS ───

describe('safeMul', () => {
  it('multiplies normally', () => { expect(safeMul(5, 3)).toBe(15); });
  it('handles NaN', () => { expect(safeMul(NaN, 5)).toBe(0); });
  it('handles undefined', () => { expect(safeMul(undefined, 5)).toBe(0); });
});

describe('safePct', () => {
  it('calculates percentage', () => { expect(safePct(200, 18)).toBe(36); });
  it('rate=0 returns 0', () => { expect(safePct(1000, 0)).toBe(0); });
  it('value=0 returns 0', () => { expect(safePct(0, 18)).toBe(0); });
  it('NaN returns fallback', () => { expect(safePct(NaN, 18)).toBe(0); });
  it('undefined returns fallback', () => { expect(safePct(undefined, undefined)).toBe(0); });
});

describe('safeMonthlyRate', () => {
  it('converts annual to monthly', () => { expect(safeMonthlyRate(12)).toBeCloseTo(0.01); });
  it('zero rate returns 0', () => { expect(safeMonthlyRate(0)).toBe(0); });
  it('negative rate returns 0', () => { expect(safeMonthlyRate(-5)).toBe(0); });
  it('NaN returns 0', () => { expect(safeMonthlyRate(NaN)).toBe(0); });
});

describe('safeRateDecimal', () => {
  it('converts % to decimal', () => { expect(safeRateDecimal(7.1)).toBeCloseTo(0.071); });
  it('zero returns 0', () => { expect(safeRateDecimal(0)).toBe(0); });
  it('NaN returns 0', () => { expect(safeRateDecimal(NaN)).toBe(0); });
});

describe('safeSub', () => {
  it('subtracts normally', () => { expect(safeSub(10, 3)).toBe(7); });
  it('handles NaN', () => { expect(safeSub(NaN, 5)).toBe(-5); });
});

describe('safeRound', () => {
  it('rounds to decimals', () => { expect(safeRound(3.14159, 2)).toBe(3.14); });
  it('rounds to integer', () => { expect(safeRound(3.7)).toBe(4); });
  it('NaN returns fallback', () => { expect(safeRound(NaN, 0, -1)).toBe(-1); });
});

describe('safeFixed', () => {
  it('returns fixed string', () => { expect(safeFixed(3.14159, 2)).toBe('3.14'); });
  it('NaN returns 0 (safeNum normalizes)', () => { expect(safeFixed(NaN, 2, 'N/A')).toBe('0.00'); });
  it('Infinity normalizes to 0', () => { expect(safeFixed(Infinity)).toBe('0.0'); });
});

describe('safeBMI', () => {
  it('calculates BMI correctly', () => {
    const bmi = safeBMI(70, 170);
    expect(bmi).toBeGreaterThan(24);
    expect(bmi).toBeLessThan(25);
  });
  it('height=0 returns 0 (not Infinity)', () => { expect(safeBMI(70, 0)).toBe(0); });
  it('weight=0 returns 0', () => { expect(safeBMI(0, 170)).toBe(0); });
  it('NaN returns 0', () => { expect(safeBMI(NaN, NaN)).toBe(0); });
});

describe('safeIdealWeight', () => {
  it('returns valid range for 170cm', () => {
    const r = safeIdealWeight(170);
    expect(parseFloat(r.min)).toBeGreaterThan(50);
    expect(parseFloat(r.max)).toBeLessThan(75);
  });
  it('height=0 returns zeros', () => {
    const r = safeIdealWeight(0);
    expect(r.min).toBe('0');
    expect(r.max).toBe('0');
  });
});

describe('safeGST', () => {
  it('exclusive: base 1000 at 18%', () => {
    const r = safeGST(1000, 18, 'exclusive');
    expect(r.gst).toBe(180);
    expect(r.total).toBe(1180);
    expect(r.base).toBe(1000);
  });
  it('inclusive: total 1180 at 18%', () => {
    const r = safeGST(1180, 18, 'inclusive');
    expect(r.total).toBe(1180);
    expect(r.base).toBeCloseTo(1000, 0);
    expect(r.gst).toBeCloseTo(180, 0);
  });
  it('reverse: GST amt 180 at 18%', () => {
    const r = safeGST(180, 18, 'reverse');
    expect(r.base).toBe(1000);
    expect(r.gst).toBe(180);
    expect(r.total).toBe(1180);
  });
  it('rate=0 returns no tax', () => {
    const r = safeGST(1000, 0, 'exclusive');
    expect(r.gst).toBe(0);
    expect(r.total).toBe(1000);
  });
  it('NaN returns zeros', () => {
    const r = safeGST(NaN, NaN, 'exclusive');
    expect(r.gst).toBe(0);
  });
});

describe('safeSalary', () => {
  it('calculates for 12L CTC', () => {
    const r = safeSalary(1200000);
    expect(r.basic).toBe(480000);
    expect(r.monthly).toBeGreaterThan(0);
    expect(r.yearly).toBe(r.monthly * 12);
    expect(r.tax).toBeGreaterThanOrEqual(0);
  });
  it('zero CTC returns all zeros', () => {
    const r = safeSalary(0);
    expect(r.basic).toBe(0);
    expect(r.monthly).toBe(0);
    expect(r.tax).toBe(0);
  });
  it('NaN CTC returns all zeros', () => {
    const r = safeSalary(NaN);
    expect(r.basic).toBe(0);
  });
  it('negative CTC returns all zeros', () => {
    const r = safeSalary(-500000);
    expect(r.basic).toBe(0);
  });
});

describe('isRecord', () => {
  it('returns true for plain objects', () => { expect(isRecord({})).toBe(true); expect(isRecord({ a: 1 })).toBe(true); });
  it('returns false for non-objects', () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord('string')).toBe(false);
    expect(isRecord([1, 2])).toBe(false);
  });
});
