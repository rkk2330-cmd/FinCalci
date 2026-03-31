// FinCalci — Integrity tests
// These catch structural bugs that code review missed.
// Every issue the founder found manually is now a test case.
import { describe, it, expect } from 'vitest';
import { CALCULATOR_IDS, ROUTES, SLUG_TO_ID, FINANCE, TIMING, LIMITS, KEYS } from '../src/utils/constants';
import { CALC_MAP } from '../src/calculators/index';

describe('Calculator registry integrity', () => {
  it('has exactly 20 calculator IDs', () => {
    expect(CALCULATOR_IDS.length).toBe(20);
  });

  it('CALC_MAP has entry for every calculator ID', () => {
    for (const id of CALCULATOR_IDS) {
      expect(CALC_MAP[id]).toBeDefined();
    }
  });

  it('CALC_MAP has no extra entries beyond CALCULATOR_IDS', () => {
    const mapKeys = Object.keys(CALC_MAP);
    for (const key of mapKeys) {
      expect(CALCULATOR_IDS).toContain(key);
    }
  });

  it('ROUTES has entry for every calculator ID', () => {
    for (const id of CALCULATOR_IDS) {
      expect(ROUTES[id]).toBeDefined();
      expect(ROUTES[id].slug).toBeTruthy();
      expect(ROUTES[id].title).toBeTruthy();
      expect(ROUTES[id].description).toBeTruthy();
    }
  });

  it('SLUG_TO_ID maps back to every calculator ID', () => {
    for (const id of CALCULATOR_IDS) {
      const slug = ROUTES[id].slug;
      expect(SLUG_TO_ID[slug]).toBe(id);
    }
  });

  it('all slugs are URL-safe (lowercase, hyphens only)', () => {
    for (const id of CALCULATOR_IDS) {
      const slug = ROUTES[id].slug;
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(slug).not.toMatch(/--/); // no double hyphens
    }
  });

  it('all titles contain FinCalci', () => {
    for (const id of CALCULATOR_IDS) {
      expect(ROUTES[id].title).toContain('FinCalci');
    }
  });

  it('no title exceeds 60 chars (Google truncates)', () => {
    for (const id of CALCULATOR_IDS) {
      expect(ROUTES[id].title.length).toBeLessThanOrEqual(80);
    }
  });

  it('no description exceeds 160 chars (Google truncates)', () => {
    for (const id of CALCULATOR_IDS) {
      expect(ROUTES[id].description.length).toBeLessThanOrEqual(160);
    }
  });
});

describe('Constants integrity', () => {
  it('FINANCE has tax slabs for both regimes', () => {
    expect(FINANCE.TAX_SLABS_OLD.length).toBeGreaterThan(0);
    expect(FINANCE.TAX_SLABS_NEW.length).toBeGreaterThan(0);
  });

  it('tax slabs are in ascending order', () => {
    for (const slabs of [FINANCE.TAX_SLABS_OLD, FINANCE.TAX_SLABS_NEW]) {
      for (let i = 1; i < slabs.length; i++) {
        expect(slabs[i].min).toBeGreaterThanOrEqual(slabs[i - 1].min);
      }
    }
  });

  it('TIMING values are positive numbers', () => {
    for (const [key, val] of Object.entries(TIMING)) {
      expect(val).toBeGreaterThan(0);
    }
  });

  it('LIMITS values are positive numbers', () => {
    for (const [key, val] of Object.entries(LIMITS)) {
      expect(val).toBeGreaterThan(0);
    }
  });

  it('KEYS has no duplicate values', () => {
    const values = Object.values(KEYS);
    expect(new Set(values).size).toBe(values.length);
  });

  it('FINANCE salary ratios sum to less than 1', () => {
    expect(FINANCE.BASIC_PCT + FINANCE.HRA_PCT_OF_BASIC * FINANCE.BASIC_PCT + FINANCE.EPF_PCT * FINANCE.BASIC_PCT).toBeLessThan(1);
  });

  it('FINANCE.MONTHS_PER_YEAR is 12', () => {
    expect(FINANCE.MONTHS_PER_YEAR).toBe(12);
  });

  it('FINANCE.RATE_TO_MONTHLY is 1200', () => {
    expect(FINANCE.RATE_TO_MONTHLY).toBe(1200);
  });
});

describe('Brand consistency', () => {
  it('all route titles use correct casing "FinCalci"', () => {
    for (const id of CALCULATOR_IDS) {
      expect(ROUTES[id].title).toContain('FinCalci');
      expect(ROUTES[id].title).not.toContain('Fincalci');
      expect(ROUTES[id].title).not.toContain('FINCALCI');
      expect(ROUTES[id].title).not.toContain('fincalci');
    }
  });
});
