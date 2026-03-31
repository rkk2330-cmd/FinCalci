import { tabRowSm, sectionGap, sectionGapSm } from '../design/styles';
import { todayISO, sanitizeCalorieData } from '../utils/validate';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
import type { CalcProps } from '../types';
import { clampInput } from '../hooks/useValidatedInput';
import { CLAMP } from '../utils/constants';
// FinCalci — CalorieTracker v2
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeNum, safeRange } from '../utils/validate';
import { num, pct, FMT } from '../utils/format';
import { KEYS, TIMING, LIMITS } from '../utils/constants';
import { tokens } from '../design/tokens';
import { tabStyle, inputStyle, labelStyle, metricStyle } from '../design/theme';
import { safeStorageGet, safeStorageSet } from '../utils/storage';
import { FOOD_DB, MEALS } from '../utils/constants';
import { vib } from '../utils/haptics';
import { searchFood } from '@/utils/foodService';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import MiniChart from '../components/MiniChart';
import { InlineError, EmptyState, LoadingSpinner } from '../components/UIStates';

export default function CalorieTracker({ color, t, onResult }: CalcProps) {
  const [meals, setMeals] = useState<Record<string, unknown>>({}), [goal, setGoal] = useState(2000), [history, setHistory] = useState<unknown[]>([]);
  const [activeMeal, setActiveMeal] = useState("breakfast");
  const [search, setSearch] = useState(""), [mn, setMn] = useState(""), [mc, setMc] = useState(""), [mp, setMp] = useState(""), [mcc, setMcc] = useState(""), [mf, setMf] = useState("");
  const [foodSearchQ, setFoodSearchQ] = useState(""), [foodSearchResults, setFoodSearchResults] = useState<unknown[]>([]);
  const [foodSearching, setFoodSearching] = useState(false), [foodError, setFoodError] = useState("");

  const getToday = () => todayISO();
  const today = getToday();

  // Load data
  useEffect(() => {
    (async () => {
      const raw = await safeStorageGet(KEYS.CALORIE, null);
      const p = sanitizeCalorieData(raw);
      if (p) {
        if (p.date === today) { setMeals(p.meals); setGoal(p.goal); }
        else {
          const dayTotal = Object.values(p.meals).flat().reduce((s, f) => s + (safeNum((f as Record<string, unknown>).cal)), 0);
          await safeStorageSet(KEYS.CALORIE, { date: today, meals: {}, goal: p.goal, history: [...p.history.slice(-(LIMITS.CALORIE_DAYS_MAX - 1)), { date: p.date, total: dayTotal, goal: p.goal }] });
        }
        setHistory(p.history.slice(-LIMITS.CALORIE_DAYS_MAX));
      }
    })();
  }, []);

  const save = async (m, g, h) => { await safeStorageSet(KEYS.CALORIE, { date: today, meals: m || meals, goal: g || goal, history: h || history }); };

  const addFood = (food, meal) => {
    const nm = { ...meals, [meal]: [...(meals[meal] || []), food] };
    setMeals(nm); save(nm); vib();
  };
  const removeFood = (meal, idx) => {
    const nm = { ...meals, [meal]: (meals[meal] || []).filter((_, i) => i !== idx) };
    setMeals(nm); save(nm); vib();
  };

  const totals = useMemo(() => {
    let cal = 0, p = 0, c = 0, f = 0;
    for (const items of Object.values(meals)) for (const fd of (items || [])) { cal += safeNum(fd.cal); p += safeNum(fd.p); c += safeNum(fd.c); f += safeNum(fd.f); }
    return { cal, p, c, f };
  }, [meals]);

  const mealTotals = useMemo(() =>
    MEALS.map(m => ({ ...m, total: (meals[m.id] || []).reduce((s, f) => s + safeNum(f.cal), 0) })), [meals]);

  // Food search with {data, error}
  const searchFoodOnline = async () => {
    if (!foodSearchQ.trim()) return;
    setFoodSearching(true); setFoodError("");
    const { data, error } = await searchFood(foodSearchQ);
    setFoodSearchResults(data); if (error) setFoodError(error);
    setFoodSearching(false);
  };

  // Filtered local food
  const filtered = useMemo(() =>
    search.length > 0 ? FOOD_DB.filter(f => f.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10) : FOOD_DB.slice(0, 10),
  [search]);

  useEffect(() => { if (!onResult) return; const tm = setTimeout(() => onResult({ "Calories": `${num(totals.cal)} / ${num(goal)}`, "Protein": `${num(totals.p)}g`, "Remaining": num(Math.max(goal - totals.cal, 0)) }), TIMING.DEBOUNCE_CALC); return () => clearTimeout(tm); }, [meals, goal]);

  const pctUsed = goal > 0 ? Math.min(totals.cal / goal * 100, 150) : 0;
  const over = totals.cal > goal;

  return (<div>
    {/* Goal + Progress */}
    <div style={{ textAlign: "center", marginBottom: tokens.space.lg }}>
      <MiniChart type="gauge" data={Math.min(totals.cal / goal * 40, 40)} width={200} height={110} colors={[over ? tokens.color.danger : color]} t={t} />
      <HeroNumber value={`${num(totals.cal)} / ${num(goal)}`} label="Calories today" color={over ? tokens.color.danger : color} style={{ padding: `${tokens.space.sm}px 0` }} />
    </div>

    <MetricGrid t={t} columns={4} items={[
      { label: "Protein", value: `${num(totals.p)}g` },
      { label: "Carbs", value: `${num(totals.c)}g` },
      { label: "Fat", value: `${num(totals.f)}g` },
      { label: "Remaining", value: `${num(Math.max(goal - totals.cal, 0))}`, color: over ? tokens.color.danger : tokens.color.success },
    ]} />

    {/* Meal tabs */}
    <div style={tabRowSm}>
      {MEALS.map(m => (
        <button key={m.id} onClick={() => { setActiveMeal(m.id); vib(); }}
          style={{ ...tabStyle(activeMeal === m.id, color, t), flex: 1, fontSize: tokens.fontSize.caption - 1 }}>
          {m.icon} {mealTotals.find(mt => mt.id === m.id)?.total || 0}
        </button>
      ))}
    </div>

    {/* Current meal items */}
    {(meals[activeMeal] || []).length > 0 && (
      <div style={sectionGapSm}>
        {(meals[activeMeal] || []).map((f, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${tokens.space.xs}px 0`, borderBottom: `1px solid ${t.border}`, fontSize: tokens.fontSize.caption }}>
            <span style={{ color: t.text, flex: 1 }}>{f.name}</span>
            <span style={{ color, fontFamily: tokens.fontFamily.mono, marginRight: tokens.space.sm }}>{f.cal}kcal</span>
            <button onClick={() => removeFood(activeMeal, i)} style={{ background: "none", border: "none", color: tokens.color.danger, cursor: "pointer", fontSize: tokens.fontSize.caption }}>✕</button>
          </div>
        ))}
      </div>
    )}

    {/* Local food search */}
    <div style={{ position: "relative", marginBottom: tokens.space.sm }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: t.textDim }}>🔍</span>
      <input type="text" placeholder="Search food..." value={search} onChange={e => setSearch(e.target.value.slice(0, 30))} maxLength={30}
        style={{ ...inputStyle(t), paddingLeft: 36 }} />
    </div>
    <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: tokens.space.md }}>
      {filtered.map((f, i) => (
        <div key={i} onClick={() => addFood(f, activeMeal)} style={{ padding: `${tokens.space.sm}px ${tokens.space.md}px`, borderBottom: `1px solid ${t.border}`, cursor: "pointer", fontSize: tokens.fontSize.caption }}>
          <div style={{ color: t.text, fontWeight: 500 }}>{f.name}</div>
          <div style={{ color: t.textDim, fontFamily: tokens.fontFamily.mono, fontSize: tokens.fontSize.caption - 1, marginTop: 2 }}>{f.cal}kcal &bull; P{f.p} C{f.c} F{f.f}</div>
        </div>
      ))}
    </div>

    {/* Manual entry */}
    <div style={{ ...metricStyle(t), marginBottom: tokens.space.md }}>
      <div style={labelStyle(t)}>Manual entry</div>
      <input type="text" placeholder="Food name" value={mn} onChange={e => setMn(e.target.value.slice(0, 40))} maxLength={40} style={{ ...inputStyle(t), marginBottom: tokens.space.sm }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: tokens.space.xs }}>
        <input type="number" placeholder="Cal" value={mc} onChange={e => setMc(clampInput(e.target.value, 0, CLAMP.CALORIE_MAX) || '')} style={inputStyle(t)} />
        <input type="number" placeholder="P(g)" value={mp} onChange={e => setMp(clampInput(e.target.value, 0, CLAMP.MACRO_MAX) || '')} style={inputStyle(t)} />
        <input type="number" placeholder="C(g)" value={mcc} onChange={e => setMcc(clampInput(e.target.value, 0, CLAMP.MACRO_MAX) || '')} style={inputStyle(t)} />
        <input type="number" placeholder="F(g)" value={mf} onChange={e => setMf(clampInput(e.target.value, 0, CLAMP.MACRO_MAX) || '')} style={inputStyle(t)} />
      </div>
      <button onClick={() => { if (!mn.trim() || !mc) return; addFood({ name: mn, cal: safeNum(mc), p: safeNum(mp), c: safeNum(mcc), f: safeNum(mf), serving: "custom" }, activeMeal); setMn(""); setMc(""); setMp(""); setMcc(""); setMf(""); }}
        style={{ width: "100%", padding: tokens.space.sm, borderRadius: tokens.radius.sm, background: `${color}15`, border: `1px solid ${color}30`, color, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.caption, cursor: "pointer", marginTop: tokens.space.sm, fontFamily: tokens.fontFamily.sans }}>
        + Add manual entry
      </button>
    </div>

    {/* Online food search */}
    <div style={{ ...metricStyle(t), marginBottom: tokens.space.md }}>
      <div style={labelStyle(t)}>Search online (Open Food Facts)</div>
      <div style={{ display: "flex", gap: tokens.space.sm }}>
        <input value={foodSearchQ} onChange={e => setFoodSearchQ(e.target.value.slice(0, 30))} onKeyDown={e => e.key === "Enter" && searchFoodOnline()}
          placeholder="paneer tikka, maggi, amul..." maxLength={30} style={{ ...inputStyle(t), flex: 1, fontSize: tokens.fontSize.caption }} />
        <button onClick={searchFoodOnline} disabled={foodSearching}
          style={{ ...tabStyle(false, color, t), flexShrink: 0, minWidth: 50 }}>
          {foodSearching ? <LoadingSpinner size={14} color={color} /> : "Search"}
        </button>
      </div>
      {foodError && <InlineError message={foodError} onRetry={searchFoodOnline} t={t} />}
      {foodSearchResults.length > 0 && (<div style={{ marginTop: tokens.space.sm }}>
        {foodSearchResults.map((f, i) => (
          <div key={i} onClick={() => { addFood(f, activeMeal); vib(); }} style={{ padding: `${tokens.space.sm}px ${tokens.space.md}px`, borderBottom: `1px solid ${t.border}`, cursor: "pointer", fontSize: tokens.fontSize.caption }}>
            <div style={{ color: t.text, fontWeight: 500 }}>{f.name}</div>
            <div style={{ color: t.textDim, fontFamily: tokens.fontFamily.mono, fontSize: tokens.fontSize.caption - 1, marginTop: 2 }}>{f.cal}kcal</div>
          </div>
        ))}
      </div>)}
    </div>

    {/* Goal setter */}
    <div style={tabRowSm}>
      <span style={{ fontSize: tokens.fontSize.caption, color: t.textDim, alignSelf: "center" }}>Goal:</span>
      {[1500, 2000, 2500, 3000].map(g => (
        <button key={g} onClick={() => { setGoal(g); save(undefined, g); vib(); }}
          style={tabStyle(goal === g, color, t)}>{g}</button>
      ))}
    </div>

    {/* History sparkline */}
    {history.length > 2 && (<div style={sectionGap}>
      <div style={labelStyle(t)}>Last {history.length} days</div>
      <MiniChart type="sparkline" data={history.map(h => h.total)} height={60} colors={[color]} t={t} />
    </div>)}
    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.lg, lineHeight: 1.6 }}>
      Nutrition data from OpenFoodFacts (community-sourced). Values are approximate per 100g and may not match local products. Not a substitute for professional dietary advice.
    </div>
  </div>);
}
