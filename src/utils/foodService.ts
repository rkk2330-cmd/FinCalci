// FinCalci — Food Nutrition Search Service (OpenFoodFacts API)
import { API } from '@/utils/constants';
import { LRUCache, fetchRetry, sanitize, clamp, extractError } from '@/utils/liveData';
import { logError, logWarn } from '@/utils/logger';

export interface FoodResult {
  name: string; cal: number; p: number; c: number; f: number; serving: string;
}

const cache = new LRUCache<FoodResult[]>(40, API.CACHE_FOOD);
let lastSearch = 0;

export async function searchFood(query: string): Promise<{ data: FoodResult[]; error: string | null }> {
  if (!query || query.length < 2) return { data: [], error: null };
  const q = sanitize(query, 30).toLowerCase();

  const cached = cache.get(q);
  if (cached) return { data: cached, error: null };

  const wait = API.RATE_LIMIT_FOOD - (Date.now() - lastSearch);
  if (wait > 0) await new Promise<void>(r => setTimeout(r, wait));
  lastSearch = Date.now();

  try {
    const r = await fetchRetry(
      `${API.URLS.FOOD}?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,nutriments`,
      API.TIMEOUT_FAST, { headers: { 'User-Agent': 'FinCalci/2.0' } },
    );
    if (!r.ok) { logWarn('api.food', `HTTP ${r.status} for q=${q}`); return { data: [], error: `Food API returned ${r.status}` }; }
    const data = await r.json();
    if (!data || !Array.isArray(data.products)) { logWarn('api.food', `Invalid structure for q=${q}`); return { data: [], error: 'Invalid response' }; }
    const results: FoodResult[] = data.products
      .filter(p => p?.product_name && p?.nutriments).slice(0, 8)
      .map(p => {
        const n = p.nutriments || {};
        return {
          name: sanitize(p.product_name, 50),
          cal: clamp(Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0), 0, 9999),
          p: clamp(Math.round((n.proteins_100g || 0) * 10) / 10, 0, 999),
          c: clamp(Math.round((n.carbohydrates_100g || 0) * 10) / 10, 0, 999),
          f: clamp(Math.round((n.fat_100g || 0) * 10) / 10, 0, 999),
          serving: '100g',
        };
      })
      .filter(r => r.cal > 0);
    cache.set(q, results);
    if (results.length === 0) logWarn('api.food', `Zero results for q=${q}`);
    return { data: results, error: results.length === 0 ? 'No results — try different spelling' : null };
  } catch (e: unknown) {
    const err = extractError(e, 'Food search');
    logError('api.food', err.message);
    return { data: [], error: err.userMessage };
  }
}
