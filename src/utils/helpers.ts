// FinCalci — Typed helpers
// Every function has explicit param types, return types, and runtime guards.

import type { UserStats } from '../types';
import { isRecord } from './validate';
import { logWarn } from './logger';

/** Type guard: is this a string? */
const isString = (val: unknown): val is string => typeof val === 'string';

/** Type guard: is this a finite number? */
const isFiniteNum = (val: unknown): val is number => typeof val === 'number' && Number.isFinite(val);

// ─── JSON parsing ───

/** Safe JSON parse with fallback. Optionally validate parsed result with a type guard. */
export function safeParse<T>(str: string | null | undefined, fallback: T, guard?: (val: unknown) => val is T): T;
export function safeParse<T = unknown>(str: string | null | undefined, fallback?: T | null): T | null;
export function safeParse<T = unknown>(str: string | null | undefined, fallback: T | null = null, guard?: (val: unknown) => val is T): T | null {
  if (!str || typeof str !== 'string') return fallback;
  try {
    const parsed = JSON.parse(str);
    if (guard && !guard(parsed)) return fallback;
    return parsed as T;
  } catch (e: unknown) {
    // Non-null string that fails JSON.parse = corrupted data.
    // This is the only signal that localStorage was tampered or corrupted.
    logWarn('safeParse', `corrupted JSON (${str.length} chars): ${e instanceof Error ? e.message : 'parse failed'}`);
    return fallback;
  }
}

// ─── Array validation ───

/** Validate array with optional element type guard. Returns typed array trimmed to maxLen. */
export function validateArray<T>(arr: unknown, maxLen: number, guard: (item: unknown) => item is T): T[];
export function validateArray(arr: unknown, maxLen?: number): unknown[];
export function validateArray<T>(arr: unknown, maxLen = 100, guard?: (item: unknown) => item is T): T[] | unknown[] {
  if (!Array.isArray(arr)) return [];
  const trimmed = arr.slice(0, maxLen);
  if (guard) return trimmed.filter(guard);
  return trimmed;
}

// ─── Stats validation ───

/** Validate stats object — guarantees all fields exist with correct types. */
export const validateStats = (s: unknown): UserStats => {
  const defaults: UserStats = { totalCalcs: 0, uniqueCalcs: 0, calcSet: [], streak: 0, lastDate: "", saved: 0 };
  if (!isRecord(s)) return defaults;

  return {
    totalCalcs: isFiniteNum(s.totalCalcs) ? Math.max(0, Math.floor(s.totalCalcs)) : 0,
    uniqueCalcs: isFiniteNum(s.uniqueCalcs) ? Math.max(0, Math.floor(s.uniqueCalcs)) : 0,
    calcSet: Array.isArray(s.calcSet) ? s.calcSet.filter(isString).slice(0, 30) : [],
    streak: isFiniteNum(s.streak) ? Math.max(0, Math.floor(s.streak)) : 0,
    lastDate: isString(s.lastDate) ? s.lastDate.slice(0, 12) : "",
    saved: isFiniteNum(s.saved) ? Math.max(0, Math.floor(s.saved)) : 0,
  };
};

// ─── String sanitization ───

/** Sanitize string — strip HTML tags, limit length. Returns '' for non-strings. */
export const sanitize = (str: unknown, maxLen = 100): string => {
  if (!isString(str)) return '';
  return str.replace(/<[^>]*>/g, '').replace(/[<>"'`]/g, '').trim().slice(0, maxLen);
};

/** Escape HTML entities for safe rendering in SVG/HTML */
export const escHtml = (s: string): string => {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// ─── Share card SVG generator ───

interface CalcMeta {
  icon: string;
  desc: string;
  color: string;
}

/** Generate Instagram-ready share card SVG string */
export const generateShareCard = (
  calcMeta: CalcMeta | undefined,
  results: Record<string, string>,
  accent: string
): string => {
  if (!calcMeta || !results) return '';
  const entries = Object.entries(results).slice(0, 4);
  const h = 200 + entries.length * 50;
  const rows = entries.map(([k, v], i) => {
    const y = 160 + i * 50;
    return `<text x="40" y="${y}" fill="#94A3B8" font-size="14" font-family="Inter,system-ui,sans-serif">${escHtml(sanitize(k, 20))}</text>
    <text x="360" y="${y}" fill="#F1F5F9" font-size="16" font-weight="500" font-family="'JetBrains Mono',monospace" text-anchor="end">${escHtml(sanitize(v, 30))}</text>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="${h}" viewBox="0 0 400 ${h}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0B0F1A"/><stop offset="100%" stop-color="#111827"/></linearGradient></defs>
  <rect width="400" height="${h}" rx="20" fill="url(#bg)"/>
  <rect x="0" y="0" width="400" height="4" rx="2" fill="${accent}"/>
  <text x="40" y="55" fill="${calcMeta.color}" font-size="36">${calcMeta.icon}</text>
  <text x="90" y="52" fill="#F1F5F9" font-size="20" font-weight="500" font-family="Inter,system-ui,sans-serif">${escHtml(sanitize(calcMeta.desc, 25))}</text>
  <line x1="40" y1="80" x2="360" y2="80" stroke="#1A2332" stroke-width="1"/>
  <text x="40" y="110" fill="${accent}" font-size="28" font-weight="500" font-family="'JetBrains Mono',monospace">${escHtml(sanitize(String(entries[0]?.[1] ?? ''), 20))}</text>
  <text x="40" y="130" fill="#64748B" font-size="12" font-family="Inter,system-ui,sans-serif">${escHtml(sanitize(String(entries[0]?.[0] ?? ''), 20))}</text>
  ${rows}
  <text x="200" y="${h - 20}" fill="#4B5563" font-size="11" text-anchor="middle" font-family="Inter,system-ui,sans-serif">Made with FinCalci • fincalci.vercel.app</text>
</svg>`;
};
