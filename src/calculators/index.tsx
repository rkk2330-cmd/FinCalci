// FinCalci — Calculator barrel with retry-aware lazy loading
// User always sees status: loading → retrying → failed → go home
import React from 'react';
import { CalcSkeleton } from '../components/Loader';
import { logError } from '../utils/logger';

// ─── Chunk load status indicator ───
function ChunkStatus({ attempt, maxAttempts, isOffline, color, t }: {
  attempt: number; maxAttempts: number; isOffline: boolean;
  color?: string; t?: Record<string, string>;
}) {
  const dim = t?.textDim || '#4B5563';
  const accent = color || '#4ECDC4';

  if (isOffline) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: t?.text || '#F1F5F9', marginBottom: 8 }}>
          You're offline
        </div>
        <div style={{ fontSize: 13, color: dim, marginBottom: 16, lineHeight: 1.6 }}>
          This calculator needs to download first. Connect to the internet and try again.
        </div>
      </div>
    );
  }

  return (
    <div>
      <CalcSkeleton color={color} t={t} />
      {attempt > 0 && (
        <div style={{ textAlign: 'center', padding: '8px 0 16px', fontSize: 12, color: dim }}>
          <div style={{
            display: 'inline-block', width: 14, height: 14,
            border: `2px solid ${dim}`, borderTopColor: accent,
            borderRadius: '50%', animation: 'fcSpin 0.8s linear infinite',
            verticalAlign: 'middle', marginRight: 6,
          }} />
          Retry {attempt}/{maxAttempts}... connection is slow
          
        </div>
      )}
    </div>
  );
}

// ─── Retryable lazy loader with user-visible status ───
const MAX_RETRIES = 3;
const RETRY_DELAYS = [0, 1500, 3000]; // ms before each attempt
const CHUNK_TIMEOUT = 15_000; // 15s — if chunk hasn't loaded, assume failure

const lazyCalc = (importFn: () => Promise<{ default: React.ComponentType<any> }>) => {
  // Wrapper that shows retry status
  const Wrapper = (props: { color?: string; t?: Record<string, string>; [key: string]: unknown }) => {
    const [status, setStatus] = React.useState<'loading' | 'retrying' | 'failed' | 'offline'>('loading');
    const [attempt, setAttempt] = React.useState(0);
    const [LoadedComp, setLoadedComp] = React.useState<React.ComponentType<any> | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const mountedRef = React.useRef(true);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
      mountedRef.current = true;
      let cancelled = false;

      // Check offline immediately
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus('offline');
        return () => { mountedRef.current = false; cancelled = true; };
      }

      const tryLoad = async () => {
        for (let i = 0; i <= MAX_RETRIES; i++) {
          if (cancelled || !mountedRef.current) return;

          if (i > 0) {
            setStatus('retrying');
            setAttempt(i);
            await new Promise<void>(r => {
              timeoutRef.current = setTimeout(r, RETRY_DELAYS[i] || 2000);
            });
            if (cancelled) return;
          }

          try {
            // Race: import vs timeout
            const result = await Promise.race([
              importFn(),
              new Promise<never>((_, reject) => {
                timeoutRef.current = setTimeout(
                  () => reject(new Error('Chunk load timeout')),
                  CHUNK_TIMEOUT
                );
              }),
            ]);

            if (cancelled || !mountedRef.current) return;
            setLoadedComp(() => result.default);
            setStatus('loading'); // reset
            return; // success
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            logError(`chunk.load.attempt${i}`, e);

            if (cancelled || !mountedRef.current) return;

            // Check if went offline during retry
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
              setStatus('offline');
              return;
            }

            if (i === MAX_RETRIES) {
              setStatus('failed');
              setError(msg.includes('timeout') ? 'Took too long to load' : 'Failed to load calculator');
            }
          }
        }
      };

      tryLoad();

      return () => {
        mountedRef.current = false;
        cancelled = true;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []); // Only run once on mount

    // ─── Render based on status ───

    if (LoadedComp) {
      return <LoadedComp {...props} />;
    }

    if (status === 'failed') {
      // CalcWrapper's error boundary will also catch, but this gives inline UX
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: props.t?.text || '#F1F5F9', marginBottom: 6 }}>
            Couldn't load calculator
          </div>
          <div style={{ fontSize: 13, color: props.t?.textDim || '#4B5563', marginBottom: 20, lineHeight: 1.6 }}>
            {error || 'Check your internet connection and try again.'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => { setStatus('loading'); setAttempt(0); setError(null); setLoadedComp(null); }}
              style={{
                padding: '10px 20px', borderRadius: 10,
                background: `${props.color || '#4ECDC4'}15`,
                border: `1px solid ${props.color || '#4ECDC4'}30`,
                color: props.color || '#4ECDC4',
                fontWeight: 500, fontSize: 14, cursor: 'pointer',
              }}>
              Try again
            </button>
          </div>
        </div>
      );
    }

    return <ChunkStatus attempt={attempt} maxAttempts={MAX_RETRIES} isOffline={status === 'offline'} color={props.color} t={props.t} />;
  };

  return React.memo(Wrapper);
};

export const CALC_MAP: Record<string, React.ComponentType<any>> = {
  emi: lazyCalc(() => import('./EMICalc')),
  sip: lazyCalc(() => import('./SIPCalc')),
  gst: lazyCalc(() => import('./GSTCalc')),
  age: lazyCalc(() => import('./AgeCalc')),
  tip: lazyCalc(() => import('./TipCalc')),
  percentage: lazyCalc(() => import('./PercentCalc')),
  currency: lazyCalc(() => import('./CurrencyCalc')),
  compound: lazyCalc(() => import('./CompoundCalc')),
  tax: lazyCalc(() => import('./TaxCalc')),
  unit: lazyCalc(() => import('./UnitConverter')),
  fd: lazyCalc(() => import('./FDCalc')),
  cash: lazyCalc(() => import('./CashCounter')),
  salary: lazyCalc(() => import('./SalaryCalc')),
  ppf: lazyCalc(() => import('./PPFCalc')),
  date: lazyCalc(() => import('./DateCalcTool')),
  gold: lazyCalc(() => import('./GoldCalc')),
  retire: lazyCalc(() => import('./RetireCalc')),
  expense: lazyCalc(() => import('./ExpenseTrackerCalc')),
};

export default CALC_MAP;
