// FinCalci — Helpers tests
import { describe, it, expect } from 'vitest';
import { safeParse, validateArray, validateStats, sanitize, escHtml } from '../src/utils/helpers.ts';

describe('safeParse', () => {
  it('parses valid JSON', () => {
    expect(safeParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeParse('[1,2,3]')).toEqual([1, 2, 3]);
    expect(safeParse('"hello"')).toBe('hello');
  });

  it('returns fallback for invalid JSON', () => {
    expect(safeParse('not json')).toBeNull();
    expect(safeParse('not json', {})).toEqual({});
    expect(safeParse(null)).toBeNull();
    expect(safeParse(undefined)).toBeNull();
    expect(safeParse('')).toBeNull();
  });
});

describe('validateArray', () => {
  it('returns array trimmed to maxLen', () => {
    expect(validateArray([1, 2, 3], 2)).toEqual([1, 2]);
    expect(validateArray([1, 2, 3], 10)).toEqual([1, 2, 3]);
  });

  it('returns empty array for non-arrays', () => {
    expect(validateArray(null)).toEqual([]);
    expect(validateArray(undefined)).toEqual([]);
    expect(validateArray('string')).toEqual([]);
    expect(validateArray(42)).toEqual([]);
    expect(validateArray({})).toEqual([]);
  });
});

describe('validateStats', () => {
  it('returns defaults for null/undefined', () => {
    const d = validateStats(null);
    expect(d.totalCalcs).toBe(0);
    expect(d.uniqueCalcs).toBe(0);
    expect(d.calcSet).toEqual([]);
    expect(d.streak).toBe(0);
    expect(d.lastDate).toBe('');
    expect(d.saved).toBe(0);
  });

  it('validates numeric fields', () => {
    const s = validateStats({ totalCalcs: 'banana', uniqueCalcs: -5, streak: NaN, saved: Infinity });
    expect(s.totalCalcs).toBe(0);
    expect(s.uniqueCalcs).toBe(0);
    expect(s.streak).toBe(0);
    expect(s.saved).toBe(0);
  });

  it('passes through valid stats', () => {
    const s = validateStats({ totalCalcs: 42, uniqueCalcs: 10, calcSet: ['emi', 'sip'], streak: 3, lastDate: '2025-01-01', saved: 5 });
    expect(s.totalCalcs).toBe(42);
    expect(s.uniqueCalcs).toBe(10);
    expect(s.calcSet).toEqual(['emi', 'sip']);
    expect(s.streak).toBe(3);
    expect(s.saved).toBe(5);
  });

  it('trims calcSet to 30', () => {
    const big = Array.from({ length: 50 }, (_, i) => `calc${i}`);
    const s = validateStats({ calcSet: big });
    expect(s.calcSet.length).toBe(30);
  });
});

describe('sanitize', () => {
  it('strips HTML tags', () => {
    expect(sanitize('<script>alert(1)</script>')).toBe('alert(1)');
    expect(sanitize('<b>bold</b>')).toBe('bold');
  });

  it('trims to maxLen', () => {
    expect(sanitize('a'.repeat(200), 10)).toBe('a'.repeat(10));
  });

  it('handles non-strings', () => {
    expect(sanitize(null)).toBe('');
    expect(sanitize(undefined)).toBe('');
    expect(sanitize(42)).toBe('');
  });
});

describe('escHtml', () => {
  it('escapes HTML entities', () => {
    expect(escHtml('<div>')).toBe('&lt;div&gt;');
    expect(escHtml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escHtml('a & b')).toBe('a &amp; b');
  });

  it('leaves safe strings unchanged', () => {
    expect(escHtml('hello')).toBe('hello');
    expect(escHtml('₹43,391')).toBe('₹43,391');
  });
});
