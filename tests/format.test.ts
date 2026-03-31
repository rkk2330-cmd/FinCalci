// FinCalci — Format utility tests (REAL, EXECUTABLE)
import { describe, it, expect } from 'vitest';
import { currency, currencyCompact, pct, num, decimal, duration, FMT } from '../src/utils/format';

describe('currency', () => {
  it('formats with ₹ and Indian commas', () => {
    expect(currency(5000000)).toBe('₹50,00,000');
    expect(currency(43391)).toBe('₹43,391');
    expect(currency(100)).toBe('₹100');
  });

  it('handles decimals', () => {
    expect(currency(43391.56, 2)).toBe('₹43,391.56');
  });

  it('handles zero and NaN', () => {
    expect(currency(0)).toBe('₹0');
    expect(currency(NaN)).toBe('₹0');
    expect(currency(undefined)).toBe('₹0');
  });
});

describe('currencyCompact', () => {
  it('abbreviates crores', () => {
    expect(currencyCompact(10413840)).toBe('₹1.04Cr');
    expect(currencyCompact(50000000)).toBe('₹5.00Cr');
  });

  it('abbreviates lakhs', () => {
    expect(currencyCompact(500000)).toBe('₹5.0L');
    expect(currencyCompact(1234567)).toBe('₹12.3L');
  });

  it('abbreviates thousands', () => {
    expect(currencyCompact(43391)).toBe('₹43.4K');
  });

  it('small numbers use full format', () => {
    expect(currencyCompact(500)).toBe('₹500');
  });

  it('handles negatives', () => {
    expect(currencyCompact(-5000000)).toBe('-₹50.0L');
  });
});

describe('pct', () => {
  it('formats percentages', () => {
    expect(pct(8.5)).toBe('8.5%');
    expect(pct(12)).toBe('12.0%');
    expect(pct(0.5, 2)).toBe('0.50%');
  });

  it('handles NaN', () => {
    expect(pct(NaN)).toBe('0.0%');
  });
});

describe('num', () => {
  it('formats with Indian commas', () => {
    expect(num(1234567)).toBe('12,34,567');
    expect(num(100)).toBe('100');
  });
});

describe('decimal', () => {
  it('formats to fixed places', () => {
    expect(decimal(24.867, 1)).toBe('24.9');
    expect(decimal(3.14159, 2)).toBe('3.14');
  });

  it('handles NaN', () => {
    expect(decimal(NaN)).toBe('0.0');
  });
});

describe('duration', () => {
  it('formats months to years + months', () => {
    expect(duration(240)).toBe('20 yrs');
    expect(duration(243)).toBe('20 yrs 3 mo');
    expect(duration(6)).toBe('6 mo');
    expect(duration(12)).toBe('1 yr');
    expect(duration(13)).toBe('1 yr 1 mo');
  });

  it('handles zero', () => {
    expect(duration(0)).toBe('0 mo');
  });
});

describe('FMT (legacy compatibility)', () => {
  it('matches old behavior', () => {
    expect(FMT(43391)).toBe('43,391');
    expect(FMT(5000000)).toBe('50,00,000');
    expect(FMT(NaN)).toBe('0');
    expect(FMT(undefined)).toBe('0');
  });
});
