import { tabRow, disclaimer } from '../design/styles';
import { loadCalcInputs } from '../utils/inputMemory';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — GSTCalc
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeNum, safeRange, safePct, safeGST, validateCalcInputs } from '../utils/validate';
import { currency, pct, FMT } from '../utils/format';
import { INPUT_SCHEMAS, FINANCE, TIMING, SLIDER } from '../utils/constants';
// SLIDER imported via constants
import { tokens } from '../design/tokens';
import { tabStyle, labelStyle } from '../design/theme';
import { useSchemaInputs } from '../hooks/useValidatedInput';
import { vib } from '../utils/haptics';
import SliderInput from '../components/SliderInput';
import AmountInput from '../components/AmountInput';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';

export default function GSTCalc({ color, t, onResult }: CalcProps) {
  const _i = useSchemaInputs(INPUT_SCHEMAS.gst, loadCalcInputs("gst", {}));
  const amt = _i.amount.value, setAmt = _i.amount.set;
  const gstRate = _i.rate.value, setGstRate = _i.rate.set;
  const [mode, setMode] = useState("exclusive");
  const [items, setItems] = useState<unknown[]>([]);

  useDebouncedPersist("gst", { amount: amt, rate: gstRate });

  const calc = useMemo(() => safeGST(amt, gstRate, mode), [amt, gstRate, mode]);

  const half = useMemo(() => calc.gst / 2, [calc.gst]);

  // Multi-item invoice total
  const invoiceTotal = useMemo(() => items.reduce((s, it) => {
    const g = safePct(it.amount, it.rate);
    return { base: s.base + safeNum(it.amount), gst: s.gst + g, total: s.total + safeNum(it.amount) + g };
  }, { base: 0, gst: 0, total: 0 }), [items]);

  useEffect(() => {
    if (!onResult) return;
    const t = setTimeout(() => onResult({ [mode === "reverse" ? "Base Amount" : "GST"]: currency(calc.gst), "Total": currency(calc.total), "CGST+SGST": `${currency(half)} each` }), TIMING.DEBOUNCE_CALC);
    return () => clearTimeout(t);
  }, [amt, gstRate, mode]);

  const addItem = () => { if (items.length >= 20) return; setItems([...items, { id: Date.now(), amount: amt, rate: gstRate, desc: `Item ${items.length + 1}` }]) };
  const removeItem = (id) => { setItems(items.filter(i => i.id !== id)) };

  return (<div>
    <div style={tabRow}>
      <button onClick={() => { setMode("exclusive") }} style={tabStyle(mode === "exclusive", color, t)}>Exclusive</button>
      <button onClick={() => { setMode("inclusive") }} style={tabStyle(mode === "inclusive", color, t)}>Inclusive</button>
      <button onClick={() => { setMode("reverse") }} style={tabStyle(mode === "reverse", color, t)}>Reverse</button>
    </div>

    <HeroNumber aria-live="polite" label={mode === "inclusive" ? "Base price" : mode === "reverse" ? "Base amount" : "Total (incl. GST)"} value={currency(mode === "inclusive" ? calc.base : calc.total)} color={color} />

    <MetricGrid t={t} items={[
      { label: mode === "reverse" ? "Base amount" : "Base price", value: currency(calc.base) },
      { label: `GST @ ${pct(gstRate, 0)}`, value: currency(calc.gst), color: tokens.color.secondary },
      { label: "CGST", value: currency(half) },
      { label: "SGST", value: currency(half) },
    ]} />

    <AmountInput label={mode === "reverse" ? "GST Amount" : "Amount"} value={amt} onChange={setAmt} min={SLIDER.gst.amount.min} max={SLIDER.gst.amount.max} color={color} t={t} />

    <div style={{ display: "flex", gap: tokens.space.xs, marginBottom: tokens.space.lg, flexWrap: "wrap" }}>
      {FINANCE.GST_RATES.map(r => (
        <button key={r} onClick={() => { setGstRate(r) }}
          style={{ ...tabStyle(gstRate === r, color, t), minWidth: 40 }}>{r}%</button>
      ))}
    </div>

    {/* Multi-item invoice */}
    <button onClick={addItem} style={{ width: "100%", padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${color}10`, border: `1px solid ${color}25`, color, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", marginTop: tokens.space.md, fontFamily: tokens.fontFamily.sans }}>
      + Add to invoice ({items.length}/20)
    </button>
    {items.length > 0 && (<div style={{ marginTop: tokens.space.md }}>
      <div style={labelStyle(t)}>Invoice items</div>
      {items.map(it => (<div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${tokens.space.sm}px 0`, borderBottom: `1px solid ${t.border}`, fontSize: tokens.fontSize.caption }}>
        <span style={{ color: t.text }}>{it.desc} — {currency(it.amount)} @ {pct(it.rate, 0)}</span>
        <button onClick={() => removeItem(it.id)} style={{ background: "none", border: "none", color: tokens.color.danger, cursor: "pointer", fontSize: tokens.fontSize.caption }}>✕</button>
      </div>))}
      <MetricGrid t={t} items={[
        { label: "Invoice subtotal", value: currency(invoiceTotal.base) },
        { label: "Total GST", value: currency(invoiceTotal.gst), color: tokens.color.secondary },
        { label: "Invoice total", value: currency(invoiceTotal.total), color: color },
      ]} columns={3} />
    </div>)}

    <div style={disclaimer(t)}>
      GST 2.0 rates (0%, 5%, 18%, 40%) effective Sep 22, 2025. 12% and 28% slabs abolished. For filing, consult a CA. IGST applies for inter-state.
    </div>
  </div>);
}
