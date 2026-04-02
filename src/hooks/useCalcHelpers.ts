// FinCalci — Shared calculator hooks
// Eliminates duplicate logic across 20 calculators.
// Each pattern was copy-pasted 14-20 times — now it's ONE hook.

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { TIMING } from '../utils/constants';
import { saveCalcInputs } from '../utils/inputMemory';
import { logWarn } from '../utils/logger';

// ─── 1. useDebouncedPersist: auto-save calc inputs ───
// BEFORE (in every calculator):
//   useEffect(() => { const t = setTimeout(() => saveCalcInputs("emi", { P, rate, n }), TIMING.DEBOUNCE_PERSIST); return () => clearTimeout(t); }, [P, rate, n]);
// AFTER:
//   useDebouncedPersist("emi", { P, rate, n });
export function useDebouncedPersist(calcId: string, inputs: Record<string, unknown>) {
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  useEffect(() => {
    const t = setTimeout(() => saveCalcInputs(calcId, inputsRef.current), TIMING.DEBOUNCE_PERSIST);

    // SW update calls flushPendingSaves() → dispatches this event.
    // We save immediately so reload() doesn't lose the user's inputs.
    const flush = () => {
      clearTimeout(t);
      saveCalcInputs(calcId, inputsRef.current);
    };
    window.addEventListener('fincalci-flush-saves', flush);

    return () => {
      clearTimeout(t);
      window.removeEventListener('fincalci-flush-saves', flush);
    };
    // Re-run when any input value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcId, ...Object.values(inputs)]);
}

// ─── 2. useDebouncedResult: auto-report result to parent ───
// BEFORE (in every calculator):
//   useEffect(() => { if (!onResult) return; const t = setTimeout(() => onResult({...}), TIMING.DEBOUNCE_CALC); return () => clearTimeout(t); }, [deps]);
// AFTER:
//   useDebouncedResult(onResult, { "EMI": currency(emi), "Total": currency(total) }, [emi, total]);
export function useDebouncedResult(
  onResult: ((result: Record<string, string>) => void) | undefined,
  result: Record<string, string>,
  deps: unknown[]
) {
  const resultRef = useRef(result);
  resultRef.current = result;

  useEffect(() => {
    if (!onResult) return;
    const t = setTimeout(() => onResult(resultRef.current), TIMING.DEBOUNCE_CALC);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ─── 3. useAsyncSearch: search with loading/error state ───
// BEFORE (copy-pasted for MF, Stock, Food):
//   const [query, setQuery] = useState(""); const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(false); const [error, setError] = useState("");
//   const search = useCallback(async () => { setLoading(true); setError(""); const {data, error} = await api(query); ... }, [query]);
// AFTER:
//   const mf = useAsyncSearch(q => MFSearch.search(q));
//   <input value={mf.query} onChange={e => mf.setQuery(e.target.value)} />
//   <button onClick={mf.search} disabled={mf.loading}>Search</button>
//   {mf.error && <InlineError message={mf.error} onRetry={mf.search} />}
//   {mf.data.map(r => ...)}
interface AsyncSearchReturn<T> {
  query: string;
  setQuery: (q: string) => void;
  data: T;
  loading: boolean;
  error: string;
  search: () => void;
  clear: () => void;
}

export function useAsyncSearch<T>(
  searchFn: (query: string) => Promise<{ data: T; error: string | null }>,
  defaultData: T,
  minLength = 2,
  maxLength = 40,
): AsyncSearchReturn<T> {
  const [query, setQueryRaw] = useState('');
  const [data, setData] = useState<T>(defaultData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryRaw(q.slice(0, maxLength));
  }, [maxLength]);

  const search = useCallback(async () => {
    if (!query.trim() || query.length < minLength) return;
    setLoading(true); setError('');
    try {
      const result = await searchFn(query);
      if (!mountedRef.current) return;
      setData(result.data);
      if (result.error) setError(result.error);
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      const msg = e instanceof Error ? e.message : 'Search failed';
      logWarn('search', msg);
      setError(msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [query, searchFn, minLength]);

  const clear = useCallback(() => {
    setQueryRaw(''); setData(defaultData); setError(''); setLoading(false);
  }, [defaultData]);

  return { query, setQuery, data, loading, error, search, clear };
}

// tabStyle and inputStyle are in design/theme.ts — single source of truth.
// Re-export here for convenience so calcs can import from one place.
export { tabStyle, inputStyle } from '../design/theme';

// ─── 5. PDF/Report export helper (Blob download — works on all mobile browsers) ───
export function openPrintWindow(title: string, bodyHtml: string): void {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title} — FinCalci</title>
    <style>
      body{font-family:Inter,system-ui,sans-serif;padding:40px;color:#0F172A;max-width:800px;margin:0 auto}
      h1{color:#10B981;margin-bottom:4px} h3{margin-top:24px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th{background:#f1f5f9;padding:10px;text-align:right;border:1px solid #e2e8f0;font-size:12px}
      td{padding:8px 10px;text-align:right;border:1px solid #e2e8f0;font-size:12px}
      .summary{display:flex;gap:16px;margin:16px 0}
      .summary div{flex:1;padding:16px;border-radius:12px;background:#f8fafc;text-align:center}
      .summary .val{font-size:24px;font-weight:500;color:#10B981}
      .footer{margin-top:30px;color:#94a3b8;font-size:12px;text-align:center;border-top:1px solid #e2e8f0;padding-top:16px}
      @media print{body{padding:20px}h1{color:#000}}
    </style></head><body>
    <h1>${title}</h1><p style="color:#94a3b8;margin-top:0">Generated by FinCalci • ${new Date().toLocaleDateString('en-IN')}</p>
    ${bodyHtml}
    <div class="footer">FinCalci — Free Calculator App for India • fin-calci.vercel.app<br>This report is for informational purposes only. Not financial advice.</div>
    </body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FinCalci-${title.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
