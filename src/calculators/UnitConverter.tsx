// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — UnitConverter (13 categoriesber system, fuel, temp)
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeNum, safeDivide } from '../utils/validate';
import { decimal } from '../utils/format';
import { TIMING } from '../utils/constants';
import { tokens } from '../design/tokens';
import { tabStyle, inputStyle, labelStyle } from '../design/theme';
import { UNIT_CATS } from '../utils/constants';
import HeroNumber from '../components/HeroNumber';

export default function UnitConverter({ color, t, onResult }: CalcProps) {
  const [cat, setCat] = useState(0), [val, setVal] = useState(1), [from, setFrom] = useState(0), [to, setTo] = useState(1);
  const uc = UNIT_CATS[cat];

  const convert = useMemo(() => {
    if (!uc) return 0;
    const v = safeNum(val);
    if (uc.specialType === "number") {
      const dec = Math.floor(Math.abs(v));
      const f = uc.units[from], tt = uc.units[to];
      if (tt === "Decimal") return dec;
      if (tt === "Binary") return parseInt(dec.toString(2), 10);
      if (tt === "Octal") return parseInt(dec.toString(8), 10);
      if (tt === "Hex") return dec;
      return dec;
    }
    if (uc.specialType === "fuel") {
      const f = uc.units[from], tt = uc.units[to];
      let kmpl = v; if (f === "L/100km") kmpl = safeDivide(100, v, 0); if (f === "mpg") kmpl = v * 0.425144;
      if (tt === "km/L") return kmpl; if (tt === "L/100km") return kmpl > 0 ? safeDivide(100, kmpl, 0) : 0; if (tt === "mpg") return safeDivide(kmpl, 0.425144, 0);
      return v;
    }
    if (uc.special) {
      const f = uc.units[from], tt = uc.units[to];
      if (f === "°C" && tt === "°F") return v * 9 / 5 + 32;
      if (f === "°F" && tt === "°C") return (v - 32) * 5 / 9;
      if (f === "°C" && tt === "K") return v + 273.15;
      if (f === "K" && tt === "°C") return v - 273.15;
      if (f === "°F" && tt === "K") return (v - 32) * 5 / 9 + 273.15;
      if (f === "K" && tt === "°F") return (v - 273.15) * 9 / 5 + 32;
      return v;
    }
    const fKey = uc.units[from], tKey = uc.units[to];
    return val * safeDivide(uc.factors[fKey], uc.factors[tKey], 1);
  }, [val, from, to, cat, uc]);

  const numFmt = useMemo(() => {
    if (uc?.specialType === "number") {
      const tt = uc.units[to];
      if (tt === "Hex") return "0x" + Math.floor(Math.abs(safeNum(val))).toString(16).toUpperCase();
      return String(convert);
    }
    return FMT(convert);
  }, [convert, uc, to, val]);

  useEffect(() => {
    if (!onResult) return;
    const tm = setTimeout(() => onResult({ "Result": `${FMT(val)} ${uc.units[from]} = ${numFmt} ${uc.units[to]}` }), TIMING.DEBOUNCE_CALC);
    return () => clearTimeout(tm);
  }, [val, from, to, cat]);

  return (<div>
    {/* Category tabs — 4-col grid */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: tokens.space.xs, marginBottom: tokens.space.lg }}>
      {UNIT_CATS.map((c, i) => (
        <button key={c.name} onClick={() => { setCat(i); setFrom(0); setTo(1) }}
          style={{ ...tabStyle(cat === i, color, t), fontSize: tokens.fontSize.caption - 1, padding: `${tokens.space.sm}px ${tokens.space.xs}px` }}>
          {c.icon} {c.label}
        </button>
      ))}
    </div>

    {/* Input */}
    <input type="number" value={val} onChange={e => setVal(safeNum(e.target.value, 0))}
      style={{ ...inputStyle(t), textAlign: "center", fontFamily: tokens.fontFamily.mono, fontSize: tokens.fontSize.title, marginBottom: tokens.space.lg }} />

    {/* From/To selectors */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: tokens.space.sm, alignItems: "center", marginBottom: tokens.space.lg }}>
      <select value={from} onChange={e => { setFrom(Number(e.target.value)) }} style={inputStyle(t)}>
        {uc.units.map((u, i) => <option key={i} value={i}>{u}</option>)}
      </select>
      <button onClick={() => { const tmp = from; setFrom(to); setTo(tmp) }}
        style={{ width: 36, height: 36, borderRadius: tokens.radius.pill, background: `${color}15`, border: `1px solid ${color}30`, color, fontSize: 16, cursor: "pointer" }}>⇄</button>
      <select value={to} onChange={e => { setTo(Number(e.target.value)) }} style={inputStyle(t)}>
        {uc.units.map((u, i) => <option key={i} value={i}>{u}</option>)}
      </select>
    </div>

    {/* Result */}
    <HeroNumber label={`${FMT(val)} ${uc.units[from]} =`} value={`${numFmt} ${uc.units[to]}`} color={color} />

    {/* All conversions */}
    <div style={labelStyle(t)}>All conversions</div>
    <div style={{ borderRadius: tokens.radius.md, border: `1px solid ${t.border}`, overflow: "hidden" }}>
      {uc.units.map((u, i) => {
        if (i === from) return null;
        let dv;
        if (uc.specialType === "number") {
          const dec = Math.floor(Math.abs(safeNum(val)));
          if (u === "Hex") dv = "0x" + dec.toString(16).toUpperCase();
          else if (u === "Binary") dv = dec.toString(2);
          else if (u === "Octal") dv = dec.toString(8);
          else dv = String(dec);
        } else if (uc.specialType === "fuel") {
          const f = uc.units[from]; let kmpl = val; if (f === "L/100km") kmpl = safeDivide(100, val, 0); if (f === "mpg") kmpl = val * 0.425144;
          if (u === "km/L") dv = FMT(kmpl); else if (u === "L/100km") dv = FMT(kmpl > 0 ? 100 / kmpl : 0); else dv = FMT(safeDivide(kmpl, 0.425144, 0));
        } else if (uc.special) {
          // temp — just show target
          dv = i === to ? numFmt : "—";
        } else {
          dv = FMT(val * safeDivide(uc.factors[uc.units[from]], uc.factors[u], 1));
        }
        return (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: `${tokens.space.sm}px ${tokens.space.md}px`,
          borderBottom: `1px solid ${t.border}`, fontSize: tokens.fontSize.caption }}>
          <span style={{ color: t.textMuted }}>{u}</span>
          <span style={{ color: i === to ? color : t.text, fontFamily: tokens.fontFamily.mono, fontWeight: i === to ? tokens.fontWeight.medium : tokens.fontWeight.regular }}>{dv}</span>
        </div>);
      })}
    </div>
  
    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md, lineHeight: 1.6 }}>Unit conversions are approximate. For scientific or engineering use, verify with authoritative sources.</div>
  </div>);
}
