import { logError } from './logger';
// FinCalci — Per-calculator input persistence
import { KEYS } from './constants';

export const loadCalcInputs = (calcId: string, _fallback?: Record<string, unknown>): Record<string, unknown> => {
  try {
    const raw = localStorage.getItem(`${KEYS.CALC_DATA}-${calcId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
  } catch (e: unknown) { logError('inputMemory.load', e); return {}; }
};

export const saveCalcInputs = (calcId: string, inputs: Record<string, unknown>): void => {
  try {
    localStorage.setItem(`${KEYS.CALC_DATA}-${calcId}`, JSON.stringify(inputs));
  } catch (e: unknown) { logError('inputMemory.save', e); }
};
