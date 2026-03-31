// FinCalci — Mutual Fund Service
// Search funds, get scheme details (NAV, 1Y/3Y/5Y returns).
// Single source of truth — imported by MFLookup component and any future MF consumer.
import { API } from '@/utils/constants';
import { LRUCache, fetchRetry, sanitize, clamp, extractError } from '@/utils/liveData';
import { parseDDMMYYYY } from '@/utils/validate';
import { logError, logWarn } from '@/utils/logger';

export interface MFResult { code: number; name: string; }
export interface MFScheme {
  name: string; category: string; fund: string;
  nav: number; navDate: string;
  r1y: number | null; r3y: number | null; r5y: number | null;
}

const searchCache = new LRUCache<MFResult[]>(50, API.CACHE_MF_SEARCH);
const schemeCache = new LRUCache<MFScheme>(30, API.CACHE_MF_SCHEME);
let lastSearch = 0;

/** Search mutual funds by name. Returns top 15 matches. */
export async function searchFunds(query: string): Promise<{ data: MFResult[]; error: string | null }> {
  if (!query || query.length < 2) return { data: [], error: null };
  const q = sanitize(query, 40).toLowerCase();

  const cached = searchCache.get(q);
  if (cached) return { data: cached, error: null };

  // Auto-wait instead of rejecting
  const wait = API.RATE_LIMIT_MF - (Date.now() - lastSearch);
  if (wait > 0) await new Promise<void>(r => setTimeout(r, wait));
  lastSearch = Date.now();

  try {
    const r = await fetchRetry(`${API.URLS.MF_SEARCH}?q=${encodeURIComponent(q)}`, API.TIMEOUT_FAST);
    if (!r.ok) { logWarn('api.mf.search', `HTTP ${r.status} for q=${q}`); return { data: [], error: `Search failed (${r.status})` }; }
    const data = await r.json();
    if (!Array.isArray(data)) { logWarn('api.mf.search', `Non-array response for q=${q}`); return { data: [], error: 'Invalid response' }; }
    const results: MFResult[] = data.slice(0, 15)
      .filter(d => d && typeof d.schemeCode === 'number' && typeof d.schemeName === 'string')
      .map(d => ({ code: d.schemeCode, name: sanitize(d.schemeName, 80) }));
    searchCache.set(q, results);
    return { data: results, error: null };
  } catch (e: unknown) {
    const err = extractError(e, 'MF search');
    logError('api.mf.search', err.message);
    return { data: [], error: err.userMessage };
  }
}

/** Get scheme details: NAV, fund house, category, 1Y/3Y/5Y returns. */
export async function getScheme(code: number): Promise<{ data: MFScheme | null; error: string | null }> {
  if (!code || typeof code !== 'number') return { data: null, error: 'Invalid fund code' };
  const ck = 'mf_' + code;

  const cached = schemeCache.get(ck);
  if (cached) return { data: cached, error: null };

  try {
    const r = await fetchRetry(`${API.URLS.MF_SCHEME}/${code}`, API.TIMEOUT_FAST);
    if (!r.ok) { logWarn('api.mf.scheme', `HTTP ${r.status} for code=${code}`); return { data: null, error: `Failed (${r.status})` }; }
    const data = await r.json();
    if (!data?.meta || !Array.isArray(data.data) || data.data.length < 2) {
      logWarn('api.mf.scheme', `Invalid structure for code=${code}`);
      return { data: null, error: 'Invalid fund data' };
    }

    const nav = parseFloat(data.data[0]?.nav);
    if (isNaN(nav) || nav <= 0 || nav > 999999) {
      logWarn('api.mf.scheme', `Invalid NAV=${nav} for code=${code}`);
      return { data: null, error: 'Invalid NAV' };
    }

    // Calculate returns by finding historical NAV at ~daysAgo
    const calcReturn = (daysAgo: number): number | null => {
      const target = data.data.find((_: unknown, i: number) => {
        if (i < 1) return false;
        const d = data.data[i]?.date;
        if (!d) return false;
        const dt = parseDDMMYYYY(d);
        if (!dt) return false;
        return (Date.now() - dt.getTime()) / 86400000 >= daysAgo * 0.9;
      });
      if (!target) return null;
      const old = parseFloat(target.nav);
      if (isNaN(old) || old <= 0) return null;
      return (nav / old - 1) * 100;
    };

    const r1y = calcReturn(365), r3y = calcReturn(1095), r5y = calcReturn(1825);

    const result: MFScheme = {
      name: sanitize(data.meta.scheme_name || '', 80),
      category: sanitize(data.meta.scheme_category || '', 50),
      fund: sanitize(data.meta.fund_house || '', 60),
      nav: clamp(nav, 0.01, 999999),
      navDate: (data.data[0]?.date || '').slice(0, 12),
      r1y: r1y !== null ? Math.round(r1y * 10) / 10 : null,
      r3y: r3y !== null ? Math.round((Math.pow(1 + r3y / 100, 1 / 3) - 1) * 1000) / 10 : null,
      r5y: r5y !== null ? Math.round((Math.pow(1 + r5y / 100, 1 / 5) - 1) * 1000) / 10 : null,
    };

    schemeCache.set(ck, result);
    return { data: result, error: null };
  } catch (e: unknown) {
    const err = extractError(e, 'Fund details');
    logError('api.mf.scheme', err.message);
    return { data: null, error: err.userMessage };
  }
}
