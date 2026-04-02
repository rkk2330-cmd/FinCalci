import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — PercentCalc v3 (sentence-style, consistent with app design)
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useMemo, useEffect } = React;
import { safeNum, safeDivide, safePct } from '../utils/validate';
import { num, pct } from '../utils/format';
import { TIMING } from '../utils/constants';
import { tokens } from '../design/tokens';
import { tabStyle, inputStyle, labelStyle, metricStyle } from '../design/theme';
import { vib } from '../utils/haptics';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';

const MODES = [
  { id: 'pctOf', label: '% of' },
  { id: 'whatPct', label: 'What %' },
  { id: 'change', label: 'Change' },
  { id: 'profit', label: 'Profit' },
];

export default function PercentCalc({ color, t, onResult }: CalcProps) {
  const [mode, setMode] = useState('pctOf');
  const [v1, setV1] = useState(15);
  const [v2, setV2] = useState(500);

  useDebouncedPersist("percent", { value: v1, total: v2 });

  const results = useMemo(() => {
    const a = safeNum(v1), b = safeNum(v2);
    return {
      pctOf: safePct(b, a),
      whatPct: b > 0 ? safeDivide(a, b, 0) * 100 : 0,
      change: a > 0 ? safeDivide(b - a, a, 0) * 100 : 0,
      profit: b - a,
      margin: b > 0 ? safeDivide(b - a, b, 0) * 100 : 0,
      markup: a > 0 ? safeDivide(b - a, a, 0) * 100 : 0,
    };
  }, [v1, v2]);

  useEffect(() => {
    if (!onResult) return;
    const tm = setTimeout(() => {
      if (mode === 'pctOf') onResult({ "Result": num(results.pctOf, 2), "Calculation": `${num(v1)}% of ${num(v2)}` });
      else if (mode === 'whatPct') onResult({ "Result": pct(results.whatPct), "Ratio": `${num(v1)} of ${num(v2)}` });
      else if (mode === 'change') onResult({ "Change": pct(results.change), "From": num(v1), "To": num(v2) });
      else onResult({ "Profit": `₹${num(results.profit)}`, "Margin": pct(results.margin), "Markup": pct(results.markup) });
    }, TIMING.DEBOUNCE_CALC);
    return () => clearTimeout(tm);
  }, [v1, v2, mode]);

  const IS = { ...inputStyle(t), textAlign: 'center' as const, fontFamily: tokens.fontFamily.mono, fontSize: tokens.fontSize.body };

  return (<div>
    {/* Mode tabs — same pattern as every other calculator */}
    <div style={{ display: 'flex', gap: tokens.space.xs, marginBottom: tokens.space.xl }}>
      {MODES.map(m => (
        <button key={m.id} onClick={() => { setMode(m.id); vib(); }}
          style={tabStyle(mode === m.id, color, t)}>{m.label}</button>
      ))}
    </div>

    {/* Sentence-style input — reads like plain English */}
    <div style={{ ...metricStyle(t), marginBottom: tokens.space.lg }}>
      {mode === 'pctOf' && (<>
        <div style={labelStyle(t)}>What is ___ % of ___ ?</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space.sm }}>
          <input type="number" value={v1 || ''} onChange={e => setV1(safeNum(e.target.value))} placeholder="15"
            style={{ ...IS, width: 80 }} />
          <span style={{ color: t.textMuted, fontSize: tokens.fontSize.small, flexShrink: 0 }}>% of</span>
          <input type="number" value={v2 || ''} onChange={e => setV2(safeNum(e.target.value))} placeholder="500"
            style={{ ...IS, flex: 1 }} />
        </div>
      </>)}

      {mode === 'whatPct' && (<>
        <div style={labelStyle(t)}>___ is what % of ___ ?</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space.sm }}>
          <input type="number" value={v1 || ''} onChange={e => setV1(safeNum(e.target.value))} placeholder="25"
            style={{ ...IS, flex: 1 }} />
          <span style={{ color: t.textMuted, fontSize: tokens.fontSize.small, flexShrink: 0 }}>is what % of</span>
          <input type="number" value={v2 || ''} onChange={e => setV2(safeNum(e.target.value))} placeholder="200"
            style={{ ...IS, flex: 1 }} />
        </div>
      </>)}

      {mode === 'change' && (<>
        <div style={labelStyle(t)}>Percentage change from → to</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space.sm }}>
          <input type="number" value={v1 || ''} onChange={e => setV1(safeNum(e.target.value))} placeholder="100"
            style={{ ...IS, flex: 1 }} />
          <span style={{ color: t.textMuted, fontSize: 18, flexShrink: 0 }}>→</span>
          <input type="number" value={v2 || ''} onChange={e => setV2(safeNum(e.target.value))} placeholder="120"
            style={{ ...IS, flex: 1 }} />
        </div>
      </>)}

      {mode === 'profit' && (<>
        <div style={labelStyle(t)}>I bought for ___ and sold for ___</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space.sm }}>
          <span style={{ color: t.textMuted, fontSize: tokens.fontSize.small, flexShrink: 0 }}>₹</span>
          <input type="number" value={v1 || ''} onChange={e => setV1(safeNum(e.target.value))} placeholder="80"
            style={{ ...IS, flex: 1 }} />
          <span style={{ color: t.textMuted, fontSize: tokens.fontSize.small, flexShrink: 0 }}>sold ₹</span>
          <input type="number" value={v2 || ''} onChange={e => setV2(safeNum(e.target.value))} placeholder="100"
            style={{ ...IS, flex: 1 }} />
        </div>
      </>)}
    </div>

    {/* Result — uses HeroNumber + MetricGrid like every other calculator */}
    {mode === 'pctOf' && (
      <HeroNumber label={`${pct(v1, 0)} of ${num(v2)}`} value={num(results.pctOf, 2)} color={color} />
    )}

    {mode === 'whatPct' && (
      <HeroNumber label={`${num(v1)} out of ${num(v2)}`} value={pct(results.whatPct)} color={color} />
    )}

    {mode === 'change' && (<>
      <HeroNumber
        label={results.change >= 0 ? 'Increased by' : 'Decreased by'}
        value={`${results.change >= 0 ? '↑' : '↓'} ${pct(Math.abs(results.change))}`}
        color={results.change >= 0 ? tokens.color.success : tokens.color.danger} />
      <MetricGrid t={t} items={[
        { label: 'Difference', value: num(Math.abs(safeNum(v2) - safeNum(v1))) },
        { label: 'Direction', value: results.change >= 0 ? 'Increase' : 'Decrease', color: results.change >= 0 ? tokens.color.success : tokens.color.danger },
      ]} />
    </>)}

    {mode === 'profit' && (<>
      <HeroNumber
        label={results.profit >= 0 ? 'Profit' : 'Loss'}
        value={`${results.profit >= 0 ? '+' : ''}₹${num(results.profit)}`}
        color={results.profit >= 0 ? tokens.color.success : tokens.color.danger} />
      <MetricGrid t={t} items={[
        { label: 'Profit margin', value: pct(results.margin), color: tokens.color.success },
        { label: 'Markup', value: pct(results.markup), color: color },
      ]} />
      <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: 'center', marginTop: tokens.space.md }}>
        Margin = Profit ÷ Selling price &bull; Markup = Profit ÷ Cost price
      </div>
    </>)}
  
    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md, lineHeight: 1.6 }}>Percentage calculations are for reference only. Verify critical calculations independently.</div>
  </div>);
}
