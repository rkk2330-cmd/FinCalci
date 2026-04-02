import { tabRow } from '../design/styles';
import { todayISO, safeDate, safeDateDiff, safeNum, safeRange } from '../utils/validate';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — DateCalcTool v2 (Days Between + Add/Subtract Days)
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { num, decimal, FMT } from '../utils/format';
import { TIMING } from '../utils/constants';
import { tokens } from '../design/tokens';
import { tabStyle, inputStyle, labelStyle } from '../design/theme';
import { vib } from '../utils/haptics';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';

export default function DateCalcTool({ color, t, onResult }: CalcProps) {
  const today = todayISO();
  const [mode, setMode] = useState("diff");
  const [d1, setD1] = useState(today);
  const [d2, setD2] = useState(today);
  const [addDays, setAddDays] = useState(30);
  const [addDir, setAddDir] = useState("add");

  const diff = useMemo(() => {
    const a = safeDate(d1), b = safeDate(d2);
    if (!a || !b) return { days: 0, weeks: 0, months: 0, years: "0.0" };
    const days = safeDateDiff(a, b);
    return { days, weeks: Math.floor(days / 7), months: Math.floor(days / 30.44), years: (days / 365.25).toFixed(1) };
  }, [d1, d2]);

  const addResult = useMemo(() => {
    const base = safeDate(d1);
    if (!base) return "Invalid date";
    const offset = addDir === "add" ? addDays : -addDays;
    base.setDate(base.getDate() + offset);
    return base.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [d1, addDays, addDir]);

  useEffect(() => {
    if (!onResult) return;
    const tm = setTimeout(() => {
      if (mode === "diff") onResult({ "Days": num(diff.days), "Weeks": num(diff.weeks), "Months": num(diff.months) });
      else onResult({ "Result Date": addResult });
    }, TIMING.DEBOUNCE_CALC);
    return () => clearTimeout(tm);
  }, [d1, d2, addDays, addDir, mode]);

  const IS = { ...inputStyle(t), fontFamily: tokens.fontFamily.mono };

  return (<div>
    <div style={tabRow}>
      <button onClick={() => { setMode("diff"); vib(); }} style={tabStyle(mode === "diff", color, t)}>Days between</button>
      <button onClick={() => { setMode("add"); vib(); }} style={tabStyle(mode === "add", "#A78BFA", t)}>Add/subtract days</button>
    </div>

    {mode === "diff" ? (<div>
      <div style={labelStyle(t)}>Start date</div>
      <input type="date" value={d1} onChange={e => setD1(e.target.value)} style={{ ...IS, marginBottom: tokens.space.md }} />
      <div style={labelStyle(t)}>End date</div>
      <input type="date" value={d2} onChange={e => setD2(e.target.value)} style={{ ...IS, marginBottom: tokens.space.lg }} />

      <HeroNumber label="Days between" value={num(diff.days)} color={color} />
      <MetricGrid t={t} columns={3} items={[
        { label: "Weeks", value: num(diff.weeks) },
        { label: "Months", value: num(diff.months) },
        { label: "Years", value: diff.years },
      ]} />
    </div>) : (<div>
      <div style={labelStyle(t)}>Start date</div>
      <input type="date" value={d1} onChange={e => setD1(e.target.value)} style={{ ...IS, marginBottom: tokens.space.md }} />
      <div style={{ display: "flex", gap: tokens.space.sm, marginBottom: tokens.space.md }}>
        <button onClick={() => { setAddDir("add"); vib(); }} style={tabStyle(addDir === "add", tokens.color.success, t)}>+ Add</button>
        <button onClick={() => { setAddDir("sub"); vib(); }} style={tabStyle(addDir === "sub", tokens.color.danger, t)}>− Subtract</button>
      </div>
      <div style={{ display: "flex", gap: tokens.space.sm, marginBottom: tokens.space.lg, flexWrap: "wrap" }}>
        {[7, 15, 30, 45, 60, 90, 180, 365].map(d => (
          <button key={d} onClick={() => { setAddDays(d); vib(); }}
            style={tabStyle(addDays === d, color, t)}>{d}d</button>
        ))}
      </div>
      <input type="number" value={addDays} onChange={e => setAddDays(safeRange(parseInt(e.target.value) || 0, 0, 36500, 30))}
        style={{ ...IS, width: 100, textAlign: "center", marginBottom: tokens.space.lg }} placeholder="Days" />

      <HeroNumber label={`${addDir === "add" ? "+" : "−"}${addDays} days from ${d1}`} value={addResult} color={color} />
    </div>)}
  
    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md, lineHeight: 1.6 }}>Date calculations are based on the Gregorian calendar. Results are for reference only.</div>
  </div>);
}
