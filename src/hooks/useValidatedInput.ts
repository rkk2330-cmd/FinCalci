// @ts-nocheck — TODO: add strict types
// FinCalci — useValidatedInput: central input validation layer
// Every calculator state setter passes through this. No raw values reach calculations.
//
// Usage:
//   const [P, setP] = useValidatedNum(5_000_000, { min: 10_000, max: 100_000_000 });
//   setP(999999999999) → clamped to 100_000_000
//   setP(NaN) → falls back to 5_000_000
//   setP(-500) → clamped to 10_000
//
//   const inputs = useSchemaInputs(INPUT_SCHEMAS.emi, loadCalcInputs('emi', {}));
//   inputs.P.value    → always valid number
//   inputs.P.set(val) → clamped + NaN-safe

import { useState, useCallback, useRef, useMemo } from 'react';

/**
 * Single validated numeric state.
 * Every set() call clamps to [min, max] and guards NaN/undefined.
 *
 * @param {number} initial - starting value
 * @param {{ min: number, max: number }} bounds
 * @returns {[number, (v: unknown) => void]}
 */
export function useValidatedNum(initial, { min = 0, max = Infinity } = {}) {
  const boundsRef = useRef({ min, max, initial });
  boundsRef.current = { min, max, initial };

  const clamp = (v) => {
    const { min: mn, max: mx, initial: fb } = boundsRef.current;
    const n = Number(v);
    if (isNaN(n) || !isFinite(n)) return fb;
    return Math.min(Math.max(n, mn), mx);
  };

  const [value, setRaw] = useState(() => clamp(initial));
  const set = useCallback((v) => setRaw(prev => {
    const next = clamp(v);
    return prev === next ? prev : next;
  }), []);
  return [value, set];
}

/**
 * Build validated inputs from a schema + persisted data.
 * Returns an object where each key has .value and .set()
 *
 * @param {Record<string, {min: number, max: number, default: number}>} schema
 * @param {Record<string, unknown>} persisted - from loadCalcInputs()
 * @returns {Record<string, { value: number, set: (v: unknown) => void }>}
 *
 * Usage:
 *   const inputs = useSchemaInputs(INPUT_SCHEMAS.emi, loadCalcInputs('emi', {}));
 *   <SliderInput value={inputs.P.value} onChange={inputs.P.set} min={10000} max={10000000} />
 */
export function useSchemaInputs(schema, persisted = {}) {
  const buildInitial = () => {
    const state = {};
    for (const [key, config] of Object.entries(schema)) {
      const raw = persisted[key];
      const n = Number(raw);
      state[key] = (isNaN(n) || !isFinite(n))
        ? config.default
        : Math.min(Math.max(n, config.min), config.max);
    }
    return state;
  };

  const [values, setValues] = useState(buildInitial);
  const schemaRef = useRef(schema);
  const settersRef = useRef({});

  // Build stable setters once (schema never changes in practice)
  if (Object.keys(settersRef.current).length === 0 || schemaRef.current !== schema) {
    schemaRef.current = schema;
    for (const [key, config] of Object.entries(schema)) {
      settersRef.current[key] = (v) => {
        const n = Number(v);
        const clamped = (isNaN(n) || !isFinite(n))
          ? config.default
          : Math.min(Math.max(n, config.min), config.max);
        setValues(prev => prev[key] === clamped ? prev : { ...prev, [key]: clamped });
      };
    }
  }

  // Memoize the result object — only recreated when values change
  const result = useMemo(() => {
    const r = {};
    for (const key of Object.keys(schemaRef.current)) {
      r[key] = { value: values[key], set: settersRef.current[key] };
    }
    r._values = values;
    return r;
  }, [values]);

  return result;
}

/**
 * Parse a raw input event value to a safe number.
 * For use with <input type="number"> onChange handlers.
 *
 * @param {unknown} rawValue - e.target.value from input event
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
export function clampInput(rawValue, min = 0, max = Infinity, fallback = 0) {
  if (rawValue === '' || rawValue === null || rawValue === undefined) return fallback;
  const n = Number(rawValue);
  if (isNaN(n) || !isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}
