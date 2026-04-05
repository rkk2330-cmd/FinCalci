import { disclaimer } from '../design/styles';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — GoldCalc (redesigned: India-focused, 3-section layout)
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeNum, safePct } from '../utils/validate';
import { currency, pct } from '../utils/format';
import { FINANCE, TIMING } from '../utils/constants';
import { tokens } from '../design/tokens';
import { tabStyle } from '../design/theme';
import { LiveRates } from '../utils/liveData';
import HeroNumber from '../components/HeroNumber';
import { RateBadge, InlineError } from '../components/UIStates';

const GOLD_PURITIES = { "24K": 1, "22K": 0.9167, "18K": 0.75 };
const SILVER_PURITIES = { "999": 1, "925": 0.925 };
const WEIGHT_PRESETS = [
  { label: "1g", value: 1 },
  { label: "5g", value: 5 },
  { label: "10g", value: 10 },
  { label: "1 tola", value: 11.664 },
  { label: "50g", value: 50 },
];

export default function GoldCalc({ color, t, onResult }: CalcProps) {
  const [metal, setMetal] = useState("gold");
  const [purity, setPurity] = useState("22K");
  const [silverPurity, setSilverPurity] = useState("999");
  const [weight, setWeight] = useState(10);
  const [activePreset, setActivePreset] = useState("10g");
  const [makingPct, setMakingPct] = useState(8);
  const [showMaking, setShowMaking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState("10");

  const [goldRate, setGoldRate] = useState(9500);
  const [silverRate, setSilverRate] = useState(100);
  const [rateStatus, setRateStatus] = useState("loading");
  const [rateError, setRateError] = useState(null);

  useDebouncedPersist("gold", { weight, purity, makingPct, metal });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRateStatus("loading");
      const { data, error } = await LiveRates.getRates();
      if (cancelled) return;
      if (data?.gold) { setGoldRate(data.gold.goldPerGram); setSilverRate(data.gold.silverPerGram); }
      setRateStatus(data?.live ? (data.cached ? "cached" : "live") : "offline");
      setRateError(error);
    })();
    return () => { cancelled = true; };
  }, []);

  const metalColor = metal === "gold" ? tokens.color.gold : tokens.color.silver;
  const activePurity = metal === "gold" ? purity : silverPurity;
  const purities = metal === "gold" ? GOLD_PURITIES : SILVER_PURITIES;
  const rate = metal === "gold" ? goldRate : silverRate;

  const calc = useMemo(() => {
    const wg = safeNum(weight);
    const pure = wg * rate * (purities[activePurity] || 1);
    const making = safePct(pure, makingPct);
    const makingGst = safePct(making, 5);
    return { pure, making, makingGst, total: pure, totalWithMaking: pure + making + makingGst };
  }, [weight, rate, activePurity, makingPct, metal]);

  useEffect(() => {
    if (!onResult) return;
    const tm = setTimeout(() => {
      const label = metal === "gold" ? "Gold" : "Silver";
      onResult({ [`${label} Value`]: currency(calc.pure), "Total": currency(calc.pure) });
    }, TIMING.DEBOUNCE_CALC);
    return () => clearTimeout(tm);
  }, [calc, metal]);

  const handlePreset = (p) => { setWeight(p.value); setActivePreset(p.label); setEditVal(String(p.value)); };
  const handleEditDone = () => {
    const v = parseFloat(editVal);
    if (!isNaN(v) && v > 0 && v <= 50000) { setWeight(v); setActivePreset(""); }
    setEditing(false);
  };

  const rate24 = metal === "gold" ? goldRate : silverRate;
  const rate22 = metal === "gold" ? Math.round(goldRate * 0.9167) : Math.round(silverRate * 0.925);
  const label1 = metal === "gold" ? "24K" : "999";
  const label2 = metal === "gold" ? "22K" : "925";

  return (<div>
    {/* ─── Section 1: Metal toggle + Live rates ─── */}
    <div style={{ display: "flex", gap: 6, marginBottom: tokens.space.lg }}>
      <button onClick={() => { setMetal("gold"); setPurity("22K"); }}
        style={{ ...tabStyle(metal === "gold", tokens.color.gold, t), flex: 1 }}>Gold</button>
      <button onClick={() => { setMetal("silver"); setSilverPurity("999"); }}
        style={{ ...tabStyle(metal === "silver", tokens.color.silver, t), flex: 1 }}>Silver</button>
    </div>

    <div style={{ display: "flex", gap: 8, marginBottom: tokens.space.md }}>
      <div style={{ flex: 1, background: t.card, borderRadius: tokens.radius.lg, border: `1px solid ${metalColor}15`, padding: `${tokens.space.md}px`, textAlign: "center" }}>
        <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim }}>{label1} / gram</div>
        <div style={{ fontSize: 17, fontWeight: tokens.fontWeight.medium, color: metalColor, fontFamily: tokens.fontFamily.mono, marginTop: 2 }}>{currency(rate24)}</div>
      </div>
      <div style={{ flex: 1, background: t.card, borderRadius: tokens.radius.lg, border: `1px solid ${t.border}`, padding: `${tokens.space.md}px`, textAlign: "center" }}>
        <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim }}>{label2} / gram</div>
        <div style={{ fontSize: 17, fontWeight: tokens.fontWeight.medium, color: metalColor, fontFamily: tokens.fontFamily.mono, marginTop: 2 }}>{currency(rate22)}</div>
      </div>
    </div>

    <div style={{ textAlign: "center", marginBottom: tokens.space.lg }}>
      <RateBadge status={rateStatus} error={rateError} t={t} />
    </div>
    {rateError && <InlineError message={rateError} t={t} />}

    {/* ─── Section 2: Purity + Weight ─── */}
    <div style={{ height: 1, background: t.border, marginBottom: tokens.space.lg, opacity: 0.5 }} />

    <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.sm, letterSpacing: 0.3 }}>Purity</div>
    <div style={{ display: "flex", gap: 0, background: t.card, borderRadius: tokens.radius.md, overflow: "hidden", border: `1px solid ${t.border}`, marginBottom: tokens.space.lg }}>
      {Object.keys(purities).map(p => (
        <button key={p} onClick={() => { metal === "gold" ? setPurity(p) : setSilverPurity(p); }}
          style={{
            flex: 1, padding: `${tokens.space.md}px`, border: "none", cursor: "pointer",
            background: activePurity === p ? `${metalColor}15` : "transparent",
            color: activePurity === p ? metalColor : t.textDim,
            fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium,
            fontFamily: tokens.fontFamily.sans, transition: "all 0.2s",
          }}>{p}</button>
      ))}
    </div>

    <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.sm, letterSpacing: 0.3 }}>Weight</div>
    <div style={{
      background: t.card, borderRadius: tokens.radius.lg, border: `1px solid ${metalColor}25`,
      padding: `${tokens.space.lg}px`, textAlign: "center", marginBottom: tokens.space.sm,
    }}>
      {editing ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
            onBlur={handleEditDone} onKeyDown={e => e.key === "Enter" && handleEditDone()}
            autoFocus aria-label="Weight in grams"
            style={{
              width: 100, fontSize: 30, fontWeight: tokens.fontWeight.medium, color: metalColor,
              fontFamily: tokens.fontFamily.mono, background: "transparent", border: "none",
              borderBottom: `2px solid ${metalColor}`, outline: "none", textAlign: "center",
            }} />
          <span style={{ fontSize: 14, color: t.textMuted }}>grams</span>
        </div>
      ) : (
        <div onClick={() => { setEditing(true); setEditVal(String(weight)); }} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: 34, fontWeight: tokens.fontWeight.medium, color: metalColor, fontFamily: tokens.fontFamily.mono }}>
              {weight % 1 === 0 ? weight : weight.toFixed(3)}
            </span>
            <span style={{ fontSize: 14, color: t.textMuted }}>grams</span>
          </div>
          <div style={{ fontSize: tokens.fontSize.caption - 2, color: t.textDim, marginTop: 4 }}>Tap to type</div>
        </div>
      )}
    </div>

    <div style={{ display: "flex", gap: 5, marginBottom: tokens.space.lg }}>
      {WEIGHT_PRESETS.map(p => (
        <button key={p.label} onClick={() => handlePreset(p)}
          style={{
            flex: 1, padding: `${tokens.space.sm}px 0`, borderRadius: tokens.radius.md,
            background: activePreset === p.label ? `${metalColor}15` : t.card,
            border: `1px solid ${activePreset === p.label ? `${metalColor}35` : t.border}`,
            color: activePreset === p.label ? metalColor : t.textMuted,
            fontSize: tokens.fontSize.caption, fontWeight: tokens.fontWeight.medium,
            cursor: "pointer", fontFamily: tokens.fontFamily.sans, transition: "all 0.2s",
          }}>{p.label}</button>
      ))}
    </div>

    {/* ─── Section 3: Result + Breakdown ─── */}
    <div style={{ height: 1, background: t.border, marginBottom: tokens.space.lg, opacity: 0.5 }} />

    <HeroNumber
      label={`${activePurity} ${metal === "gold" ? "Gold" : "Silver"}, ${weight % 1 === 0 ? weight + "g" : weight.toFixed(3) + "g"}`}
      value={currency(calc.pure)} color={metalColor} />

    {/* Making charges (collapsible) */}
    <button onClick={() => setShowMaking(!showMaking)}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: `${tokens.space.md}px 0`, background: "none", border: "none", cursor: "pointer",
        borderTop: `1px solid ${t.border}40`, marginTop: tokens.space.md,
      }}>
      <span style={{ fontSize: tokens.fontSize.small, color: t.textMuted, fontWeight: tokens.fontWeight.medium, fontFamily: tokens.fontFamily.sans }}>
        {showMaking ? "Hide" : "Add"} making charges
      </span>
      <span style={{ fontSize: 12, color: t.textDim, transition: "transform 0.2s", transform: showMaking ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
    </button>

    {showMaking && (
      <div style={{
        background: t.card, borderRadius: tokens.radius.lg, border: `1px solid ${t.border}`,
        padding: `${tokens.space.md}px ${tokens.space.lg}px`, marginBottom: tokens.space.md,
        animation: "slideUp 0.2s ease both",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: tokens.space.sm }}>
          <span style={{ fontSize: tokens.fontSize.caption, color: t.textMuted }}>Making charge</span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {[5, 8, 10, 15, 25].map(v => (
              <button key={v} onClick={() => setMakingPct(v)}
                style={{
                  padding: "3px 7px", borderRadius: tokens.radius.sm, fontSize: tokens.fontSize.caption - 1,
                  background: makingPct === v ? `${metalColor}15` : "transparent",
                  border: `1px solid ${makingPct === v ? `${metalColor}30` : t.border}`,
                  color: makingPct === v ? metalColor : t.textDim, cursor: "pointer",
                  fontFamily: tokens.fontFamily.sans, fontWeight: tokens.fontWeight.medium,
                }}>{v}%</button>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: t.border, opacity: 0.5, margin: `${tokens.space.sm}px 0` }} />

        {[
          { label: `${activePurity} ${metal} value`, value: currency(calc.pure) },
          { label: `Making (${pct(makingPct, 0)})`, value: currency(calc.making) },
          { label: "GST on making (5%)", value: currency(calc.makingGst) },
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: tokens.fontSize.caption }}>
            <span style={{ color: t.textMuted }}>{row.label}</span>
            <span style={{ color: t.text, fontFamily: tokens.fontFamily.mono, fontWeight: tokens.fontWeight.medium }}>{row.value}</span>
          </div>
        ))}

        <div style={{ height: 1, background: `${metalColor}30`, margin: `${tokens.space.xs}px 0` }} />
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: tokens.fontSize.small }}>
          <span style={{ color: metalColor, fontWeight: tokens.fontWeight.medium }}>Total with making</span>
          <span style={{ color: metalColor, fontFamily: tokens.fontFamily.mono, fontWeight: tokens.fontWeight.medium }}>{currency(calc.totalWithMaking)}</span>
        </div>
      </div>
    )}

    <div style={disclaimer(t)}>
      Rates derived from international spot price + 6% import duty + 3% GST. Actual jeweller prices include making charges and may differ. Verify before purchasing.
    </div>
  </div>);
}
