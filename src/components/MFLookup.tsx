import { sectionGapLg, itemTitle } from '../design/styles';
// FinCalci — MF Fund Lookup widget
// Self-contained: search input + results list + scheme detail (NAV, 1Y/3Y/5Y)
// Usage: <MFLookup color={color} t={t} />
import React, { useState, useCallback } from 'react';
import { useAsyncSearch } from '../hooks/useCalcHelpers';
import { searchFunds, getScheme } from '@/utils/mfService';
import { tokens } from '../design/tokens';
import { tabStyle, inputStyle } from '../design/theme';
import { decimal, pct } from '../utils/format';
import { vib } from '../utils/haptics';
import { InlineError, LoadingSpinner } from './UIStates';
import HeroNumber from './HeroNumber';
import MetricGrid from './MetricGrid';

interface MFLookupProps {
  color: string;
  t: Record<string, string>;
}

function MFLookupInner({ color, t }: MFLookupProps) {
  const mf = useAsyncSearch((q: string) => searchFunds(q), [] as unknown[], 2, 40);
  const [scheme, setScheme] = useState<Record<string, unknown> | null>(null);
  const [schemeLoading, setSchemeLoading] = useState(false);

  const loadScheme = useCallback(async (code: number) => {
    setSchemeLoading(true);
    const { data, error } = await getScheme(code);
    if (data) setScheme(data as Record<string, unknown>);
    if (error) mf.setQuery('');
    setSchemeLoading(false);
  }, [mf]);

  const clear = useCallback(() => {
    setScheme(null);
    mf.clear();
  }, [mf]);

  const busy = mf.loading || schemeLoading;

  return (
    <div>
      {/* Search bar */}
      <div style={{ display: 'flex', gap: tokens.space.sm, marginBottom: tokens.space.md }}>
        <input
          value={mf.query}
          onChange={e => mf.setQuery(e.target.value.slice(0, 40))}
          onKeyDown={e => e.key === 'Enter' && mf.search()}
          placeholder="Search mutual fund..."
          style={{ ...inputStyle(t), flex: 1, fontSize: tokens.fontSize.caption }}
        />
        <button
          onClick={mf.search}
          disabled={busy}
          style={{ ...tabStyle(true, tokens.color.success, t), minWidth: 60, fontSize: tokens.fontSize.caption }}
        >
          {busy ? <LoadingSpinner size={16} color={tokens.color.success} /> : 'Search'}
        </button>
      </div>

      {/* Error */}
      {mf.error && <InlineError message={mf.error} onRetry={mf.search} t={t} />}

      {/* Results list (before scheme selected) */}
      {(mf.data as unknown[]).length > 0 && !scheme && (
        <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: tokens.space.md }}>
          {(mf.data as Array<{ code: number; name: string }>).map(r => (
            <div
              key={r.code}
              role="option" tabIndex={0}
              onClick={() => { loadScheme(r.code); vib(); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { loadScheme(r.code); vib(); } }}
              style={{
                padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                borderBottom: `1px solid ${t.border}`,
                cursor: 'pointer', fontSize: tokens.fontSize.caption,
                color: t.text,
              }}
            >
              {r.name}
            </div>
          ))}
        </div>
      )}

      {/* Scheme detail card */}
      {scheme && (
        <div style={sectionGapLg}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.space.sm }}>
            <div>
              <div style={itemTitle(t)}>
                {String(scheme.name || '')}
              </div>
              <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, marginTop: 2 }}>
                {String(scheme.fund || '')} &bull; {String(scheme.category || '')}
              </div>
            </div>
            <button
              onClick={clear}
              style={{ ...tabStyle(false, tokens.color.danger, t), fontSize: tokens.fontSize.caption - 1 }}
            >
              Clear
            </button>
          </div>

          <HeroNumber
            label={`NAV (${String(scheme.navDate || '')})`}
            value={`₹${decimal(Number(scheme.nav) || 0, 2)}`}
            color={tokens.color.success}
            style={{ padding: `${tokens.space.md}px 0` }}
          />

          <MetricGrid t={t} columns={3} items={[
            { label: '1Y Return', value: scheme.r1y !== null ? pct(Number(scheme.r1y)) : '—', color: Number(scheme.r1y) > 0 ? tokens.color.success : tokens.color.danger },
            { label: '3Y CAGR', value: scheme.r3y !== null ? pct(Number(scheme.r3y)) : '—', color: Number(scheme.r3y) > 0 ? tokens.color.success : tokens.color.danger },
            { label: '5Y CAGR', value: scheme.r5y !== null ? pct(Number(scheme.r5y)) : '—', color: Number(scheme.r5y) > 0 ? tokens.color.success : tokens.color.danger },
          ]} />
        </div>
      )}

      {/* Empty state */}
      {!scheme && (mf.data as unknown[]).length === 0 && !busy && !mf.error && (
        <div style={{ textAlign: 'center', padding: tokens.space.lg, color: t.textDim }}>
          <div style={{ fontSize: 28, marginBottom: tokens.space.sm }}>📈</div>
          <div style={{ fontSize: tokens.fontSize.small }}>Search for any mutual fund</div>
          <div style={{ fontSize: tokens.fontSize.caption, marginTop: 4 }}>Get live NAV, 1Y/3Y/5Y returns</div>
        </div>
      )}
    </div>
  );
}

export default React.memo(MFLookupInner);
