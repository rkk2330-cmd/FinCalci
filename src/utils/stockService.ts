// FinCalci — Stock Lookup Service
import { API } from '@/utils/constants';
import { LRUCache, fetchRetry, sanitize, clamp, extractError } from '@/utils/liveData';
import { logError, logWarn } from '@/utils/logger';

export interface StockResult {
  name: string; symbol: string; price: number; change: number | null;
  high52: number; low52: number; pe: number; marketCap: string; sector: string; industry: string;
}

const cache = new LRUCache<StockResult>(30, API.CACHE_STOCK);
let lastSearch = 0;

export async function searchStock(query: string): Promise<{ data: StockResult | null; error: string | null }> {
  if (!query || query.length < 1) return { data: null, error: null };
  const q = sanitize(query, 20).toUpperCase();

  const cached = cache.get(q);
  if (cached) return { data: cached, error: null };

  const wait = API.RATE_LIMIT_STOCK - (Date.now() - lastSearch);
  if (wait > 0) await new Promise<void>(r => setTimeout(r, wait));
  lastSearch = Date.now();

  try {
    const r = await fetchRetry(`${API.URLS.STOCK}?name=${encodeURIComponent(q)}`, API.TIMEOUT_SLOW, { mode: 'cors' });
    if (!r.ok) { logWarn('api.stock', `HTTP ${r.status} for q=${q}`); return { data: null, error: `API returned ${r.status}` }; }
    const data = await r.json();
    if (!data) { logWarn('api.stock', `Empty response for q=${q}`); return { data: null, error: 'Empty response' }; }
    const price = parseFloat(data.currentPrice?.BSE || data.currentPrice?.NSE || 0);
    if (price <= 0 || price > 999999) { logWarn('api.stock', `Not found: ${q} (price=${price})`); return { data: null, error: 'Stock not found. Try NSE symbol (e.g. TCS, RELIANCE)' }; }
    const result: StockResult = {
      name: sanitize(String(data.companyName || q), 60), symbol: sanitize(String(data.symbol || q), 15),
      price: clamp(price, 0.01, 999999), change: typeof data.percentChange === 'number' ? clamp(data.percentChange, -99, 999) : null,
      high52: clamp(parseFloat(data['52weekHigh']) || 0, 0, 999999), low52: clamp(parseFloat(data['52weekLow']) || 0, 0, 999999),
      pe: clamp(parseFloat(data.peTTM) || 0, 0, 9999), marketCap: sanitize(String(data.marketCap || ''), 30),
      sector: sanitize(String(data.sector || ''), 30), industry: sanitize(String(data.industry || ''), 40),
    };
    cache.set(q, result);
    return { data: result, error: null };
  } catch (e: unknown) {
    const err = extractError(e, 'Stock lookup');
    logError('api.stock', err.message);
    return { data: null, error: err.userMessage };
  }
}
