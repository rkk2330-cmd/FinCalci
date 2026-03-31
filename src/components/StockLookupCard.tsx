import { captionDim, sectionGapLg } from '../design/styles';
// FinCalci — Stock Lookup widget
// Self-contained: search input + stock detail card (price, change, 52W, P/E)
// Usage: <StockLookupCard color={color} t={t} />
import React from 'react';
import { useAsyncSearch } from '../hooks/useCalcHelpers';
import { searchStock } from '@/utils/stockService';
import { tokens } from '../design/tokens';
import { tabStyle, inputStyle } from '../design/theme';
import { currency, decimal } from '../utils/format';
import { vib } from '../utils/haptics';
import { InlineError, LoadingSpinner } from './UIStates';
import HeroNumber from './HeroNumber';
import MetricGrid from './MetricGrid';

interface StockLookupCardProps {
  color: string;
  t: Record<string, string>;
}

function StockLookupCardInner({ color, t }: StockLookupCardProps) {
  const stk = useAsyncSearch((q: string) => searchStock(q), null as unknown, 1, 20);

  return (
    <div>
      {/* Search bar */}
      <div style={{ display: 'flex', gap: tokens.space.sm, marginBottom: tokens.space.md }}>
        <input
          value={stk.query}
          onChange={e => stk.setQuery(e.target.value.slice(0, 20))}
          onKeyDown={e => e.key === 'Enter' && stk.search()}
          placeholder="NSE symbol (TCS, RELIANCE...)"
          style={{ ...inputStyle(t), flex: 1, fontSize: tokens.fontSize.caption, fontFamily: tokens.fontFamily.mono }}
        />
        <button
          onClick={stk.search}
          disabled={stk.loading}
          style={{ ...tabStyle(true, color, t), minWidth: 60, fontSize: tokens.fontSize.caption }}
        >
          {stk.loading ? <LoadingSpinner size={16} color={color} /> : 'Search'}
        </button>
      </div>

      {/* Error */}
      {stk.error && <InlineError message={stk.error} onRetry={stk.search} t={t} />}

      {/* Stock detail card */}
      {stk.data && (
        <div style={sectionGapLg}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.space.sm }}>
            <div>
              <div style={{ fontSize: tokens.fontSize.body, fontWeight: tokens.fontWeight.medium, color: t.text }}>
                {String((stk.data as Record<string, unknown>).name || '')}
              </div>
              <div style={captionDim(t)}>
                {String((stk.data as Record<string, unknown>).symbol || '')} &bull; {String((stk.data as Record<string, unknown>).sector || '')}
              </div>
            </div>
            <button
              onClick={() => { stk.clear(); vib(); }}
              style={{ ...tabStyle(false, tokens.color.danger, t), fontSize: tokens.fontSize.caption - 1 }}
            >
              Clear
            </button>
          </div>

          <HeroNumber
            label="Current price"
            value={currency(Number((stk.data as Record<string, unknown>).price) || 0, 2)}
            color={Number((stk.data as Record<string, unknown>).change) >= 0 ? tokens.color.success : tokens.color.danger}
            style={{ padding: `${tokens.space.md}px 0` }}
          />

          {(stk.data as Record<string, unknown>).change !== null && (
            <div style={{
              textAlign: 'center', fontSize: tokens.fontSize.caption,
              color: Number((stk.data as Record<string, unknown>).change) >= 0 ? tokens.color.success : tokens.color.danger,
              marginBottom: tokens.space.md,
            }}>
              {Number((stk.data as Record<string, unknown>).change) >= 0 ? '+' : ''}{decimal(Number((stk.data as Record<string, unknown>).change))}% today
            </div>
          )}

          <MetricGrid t={t} columns={2} items={[
            { label: '52W High', value: currency(Number((stk.data as Record<string, unknown>).high52) || 0) },
            { label: '52W Low', value: currency(Number((stk.data as Record<string, unknown>).low52) || 0) },
            { label: 'P/E Ratio', value: Number((stk.data as Record<string, unknown>).pe) > 0 ? decimal(Number((stk.data as Record<string, unknown>).pe)) : '—' },
            { label: 'Market Cap', value: String((stk.data as Record<string, unknown>).marketCap || '—') },
          ]} />
        </div>
      )}

      {/* Empty state */}
      {!stk.data && !stk.error && !stk.loading && (
        <div style={{ textAlign: 'center', padding: tokens.space.lg, color: t.textDim }}>
          <div style={{ fontSize: 28, marginBottom: tokens.space.sm }}>📊</div>
          <div style={{ fontSize: tokens.fontSize.small }}>Look up any Indian stock</div>
          <div style={{ fontSize: tokens.fontSize.caption, marginTop: 4 }}>Enter NSE symbol for live price</div>
        </div>
      )}
    </div>
  );
}

export default React.memo(StockLookupCardInner);
