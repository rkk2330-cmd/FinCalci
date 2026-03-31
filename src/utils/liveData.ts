// @ts-nocheck — TODO: add strict types
// FinCalci — Live data fetchers (v2 — Option A: {data, error})
// Every API returns {data, error} so callers show proper error messages.
import { FALLBACK_CURRENCY, FALLBACK_GOLD, API, KEYS } from './constants';
import { safeStorageGet, safeStorageSet } from './storage';
import { logError, logWarn } from './logger';

export const sanitize = (str: unknown, maxLen = 100): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').replace(/[<>"'`]/g, '').trim().slice(0, maxLen);
};
export const clamp = (val: unknown, min: number, max: number, fb = 0): number => { const n = Number(val); if (isNaN(n) || !isFinite(n)) return fb; return Math.min(Math.max(n, min), max); };

/** Type-safe error extraction from catch(e: unknown).
 *  Returns { isAbort, message, userMessage } — no raw `e.name` access. */
export const extractError = (e: unknown, context: string): { isAbort: boolean; message: string; userMessage: string } => {
  if (e instanceof Error) {
    const isAbort = e.name === 'AbortError';
    return {
      isAbort,
      message: `${e.name}: ${e.message}`,
      userMessage: isAbort
        ? 'Request timed out — check your connection'
        : `${context} failed — ${e.message.slice(0, 60)}`,
    };
  }
  return {
    isAbort: false,
    message: String(e),
    userMessage: `${context} failed — please try again`,
  };
};

/** Extract short API name from URL for logging */
const apiTag = (url: string): string => {
  try { return new URL(url).hostname.split('.').slice(-2, -1)[0] || 'api'; }
  catch { return 'api'; }
};

/** Fetch with timeout + abort signal */
const fetchT = async (url: string, ms: number, opts: RequestInit = {}): Promise<Response> => {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { ...opts, signal: c.signal }); clearTimeout(t); return r; }
  catch (e: unknown) { clearTimeout(t); throw e; }
};

/** Fetch with retry (exponential backoff: 0s, 1s, 2s). Logs every failed attempt. */
export const fetchRetry = async (url: string, ms: number, opts: RequestInit = {}, retries = 2): Promise<Response> => {
  const tag = apiTag(url);
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchT(url, ms, opts);
    } catch (e: unknown) {
      const err = extractError(e, tag);
      if (i < retries && !err.isAbort) {
        logWarn(`api.${tag}.retry${i + 1}`, err.message);
      }
      if (i === retries || err.isAbort) {
        logError(`api.${tag}.failed`, `${err.message} (${retries + 1} attempts, url: ${url.split('?')[0]})`);
        throw e;
      }
      await new Promise(r => setTimeout(r, (i + 1) * 1000));
    }
  }
  throw new Error('Fetch failed after retries');
};

// ─── Bounded LRU cache (in-memory) ───
// Evicts oldest entries when size exceeds max. Entries expire after ttlMs.
// Used by MFSearch, StockLookup, FoodSearch — prevents unbounded heap growth.
export class LRUCache<T> {
  private _map = new Map<string, { data: T; ts: number }>();
  private readonly _max: number;
  private readonly _ttl: number;

  constructor(max: number, ttlMs: number) {
    this._max = max;
    this._ttl = ttlMs;
  }

  get(key: string): T | null {
    const entry = this._map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this._ttl) {
      this._map.delete(key);
      return null;
    }
    // Move to end (most recently used)
    this._map.delete(key);
    this._map.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    // Delete first to reset position
    this._map.delete(key);
    // Evict oldest if at capacity
    if (this._map.size >= this._max) {
      const oldest = this._map.keys().next().value;
      if (oldest !== undefined) this._map.delete(oldest);
    }
    this._map.set(key, { data, ts: Date.now() });
  }

  has(key: string): boolean {
    return this.get(key) !== null; // Also checks TTL
  }

  get size(): number { return this._map.size; }
  clear(): void { this._map.clear(); }
}
export const LiveRates = {
  _lastFetch: 0, _fetching: false,

  async getRates() {
    try {
      const cached = await safeStorageGet(KEYS.RATES, null);
      if (cached && typeof cached === 'object' && cached.timestamp) {
        const ageH = (Date.now() - cached.timestamp) / 3600000;
        if (ageH < API.CACHE_RATES_HOURS && cached.currency && cached.gold)
          return { data: { currency: cached.currency, gold: cached.gold, live: true, cached: true, age: Math.round(ageH * 60) + 'm ago' }, error: null };
      }
      if (Date.now() - this._lastFetch < API.RATE_COOLDOWN || this._fetching)
        return this._fb(cached, null);
      return await this._fetch(cached);
    } catch (e: unknown) { const err = extractError(e, "Live rates"); logError("api.rates", err.message); return this._fb(null, err.userMessage); }
  },

  async _fetch(cached: Record<string, unknown> | null) {
    this._fetching = true; this._lastFetch = Date.now();
    let curr = null, gold = null, err = null;
    try { const r = await fetchT(API.URLS.CURRENCY_PRIMARY, API.TIMEOUT_SLOW, { mode: 'cors' });
      if (r.ok) { const d = await r.json(); if (d?.usd && typeof d.usd === 'object') curr = this._valCurr(d.usd); }
      else { err = `API returned ${r.status}`; logWarn('api.rates.currency', `HTTP ${r.status}`); }
    } catch (e: unknown) { const ex = extractError(e, 'Currency rates'); err = ex.userMessage; logError('api.rates.currency', ex.message); }
    if (!curr) try { const r2 = await fetchT(API.URLS.CURRENCY_FALLBACK, API.TIMEOUT_SLOW, { mode: 'cors' });
      if (r2.ok) { const d2 = await r2.json(); if (d2?.usd) curr = this._valCurr(d2.usd); }
    } catch (e: unknown) { logWarn('api.rates.fallback', e instanceof Error ? e.message : 'failed'); }
    try { const r3 = await fetchT(API.URLS.GOLD, API.TIMEOUT_SLOW, { mode: 'cors' });
      if (r3.ok) { const d3 = await r3.json(); if (d3?.xau?.inr) gold = this._valGold(d3.xau.inr); }
    } catch (e: unknown) { logWarn('api.rates.gold', e instanceof Error ? e.message : 'failed'); }
    this._fetching = false;
    const result = { currency: curr || cached?.currency || FALLBACK_CURRENCY, gold: gold || cached?.gold || FALLBACK_GOLD, timestamp: Date.now(), live: !!(curr || gold) };
    await safeStorageSet(KEYS.RATES, result);
    // Evict old localStorage entries after successful write
    evictOldCache();
    return { data: { ...result, cached: false, age: 'just now' }, error: (curr || gold) ? null : (err || 'Could not fetch live rates') };
  },

  _valCurr(usd: Record<string, unknown>) {
    if (!usd || typeof usd !== 'object') return null;
    const KEYS = ['inr','eur','gbp','jpy','aed','cad','aud','sgd','chf','bdt','lkr','npr','myr','thb','sar','kwd','zar','brl','cny'];
    const v = { USD: 1 }; let ok = 0;
    for (const k of KEYS) { const val = usd[k];
      if (typeof val === 'number' && isFinite(val) && val > 0 && val < 1000000) { v[k.toUpperCase()] = clamp(val, 0.001, 999999, FALLBACK_CURRENCY[k.toUpperCase()] || 1); ok++; }
      else v[k.toUpperCase()] = FALLBACK_CURRENCY[k.toUpperCase()] || 1;
    }
    return ok >= API.MIN_VALID_CURRENCY_KEYS ? v : null;
  },

  _valGold(xauInr: unknown) {
    if (typeof xauInr !== 'number' || !isFinite(xauInr) || xauInr <= 0) return null;
    const pg = (xauInr / 31.1035) * API.GOLD_IMPORT_DUTY;
    if (pg < API.GOLD_MIN_PER_GRAM || pg > API.GOLD_MAX_PER_GRAM) return null;
    return { goldPerGram: Math.round(pg), silverPerGram: Math.round(pg / API.GOLD_SILVER_RATIO) };
  },

  _fb(cached: Record<string, unknown> | null, error: string | null) {
    this._fetching = false;
    return { data: { currency: cached?.currency || FALLBACK_CURRENCY, gold: cached?.gold || FALLBACK_GOLD, live: false, cached: true, age: 'offline' }, error: error || (cached ? null : 'No cached rates available') };
  },
};

// ─── MF Search ───

// ─── Stock Lookup ───

// ─── Food Search ───

export const RATE_CACHE_KEY = KEYS.RATES;
export const RATE_CACHE_HOURS = API.CACHE_RATES_HOURS;
export const RATE_COOLDOWN_MS = API.RATE_COOLDOWN;

// ─── localStorage cache eviction ───
// Prevents localStorage from growing unbounded.
// Called by LiveRates.getRates() after every successful fetch.
const LS_MAX_CACHE = 50;

export const evictOldCache = (): void => {
  try {
    const entries: { key: string; ts: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('fincalci-')) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null && 'timestamp' in parsed) {
          entries.push({ key, ts: (parsed as Record<string, number>).timestamp || 0 });
        }
      } catch (e: unknown) { logWarn('cache.parse', e instanceof Error ? e.message : 'bad entry'); continue; }
    }
    if (entries.length <= LS_MAX_CACHE) return;
    entries.sort((a, b) => a.ts - b.ts);
    const toRemove = entries.slice(0, entries.length - LS_MAX_CACHE);
    toRemove.forEach(e => { try { localStorage.removeItem(e.key); } catch (e2: unknown) { logWarn('cache.evict', e2 instanceof Error ? e2.message : 'locked'); } });
  } catch (e: unknown) { logWarn('cache.evictSweep', e instanceof Error ? e.message : 'failed'); }
};
