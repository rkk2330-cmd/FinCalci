import { tabRow, tabRowSm, sectionGap, sectionGapLg, rowCenter, TEXT_RIGHT } from '../design/styles';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
import type { CalcProps } from '../types';
import { clampInput } from '../hooks/useValidatedInput';
import { CLAMP } from '../utils/constants';
// FinCalci — ExpenseTrackerCalc v2 (Full expense tracker with categories, budgets, recurring)
import React from 'react';
const { useState, useEffect, useMemo, useCallback } = React;
import { safeNum, safeRange, todayISO, thisMonthISO, offsetMonth, formatMonth, sanitizeExpenseData } from '../utils/validate';
import { currency, currencyCompact, pct, num, FMT } from '../utils/format';
import { KEYS, TIMING, LIMITS } from '../utils/constants';
import { tokens } from '../design/tokens';
import { tabStyle, inputStyle, labelStyle, metricStyle } from '../design/theme';
import { safeStorageGet, safeStorageSet } from '../utils/storage';
import { EXP_CATEGORIES, PAY_MODES, QUICK_AMTS } from '../utils/constants';
import { vib } from '../utils/haptics';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import MiniChart from '../components/MiniChart';
import { EmptyState } from '../components/UIStates';

export default function ExpenseTrackerCalc({ color, t, onResult }: CalcProps) {
  const [entries, setEntries] = useState<unknown[]>([]);
  const [recurring, setRecurring] = useState<unknown[]>([]);
  const [budget, setBudget] = useState(30000);
  const [catBudgets, setCatBudgets] = useState<Record<string, unknown>>({});
  const [amt, setAmt] = useState(""), [note, setNote] = useState(""), [category, setCategory] = useState("food");
  const [expType, setExpType] = useState("expense");
  const [payMode, setPayMode] = useState("upi");
  const [viewMonth, setViewMonth] = useState(thisMonthISO());
  const [tab, setTab] = useState("add");
  const [rAmt, setRAmt] = useState(""), [rNote, setRNote] = useState(""), [rCat, setRCat] = useState("bills");

  // Load
  useEffect(() => { (async () => {
    const d = await safeStorageGet(KEYS.EXPENSE, null);
    const safe = sanitizeExpenseData(d);
    setEntries(safe.entries.slice(0, LIMITS.EXPENSE_MAX));
    setRecurring(safe.recurring.slice(0, 20));
    setBudget(safe.budget);
    setCatBudgets(safe.catBudgets);
  })(); }, []);

  const save = useCallback(async (e, r, b, cb) => {
    await safeStorageSet(KEYS.EXPENSE, { entries: e || entries, recurring: r || recurring, budget: b || budget, catBudgets: cb || catBudgets });
  }, [entries, recurring, budget, catBudgets]);

  const addEntry = () => {
    const a = safeRange(parseFloat(amt), 0.01, 9999999, 0);
    if (a <= 0) return;
    const entry = { id: Date.now(), amount: a, category, type: expType, note: note.trim().slice(0, 40), date: todayISO(), payMode };
    const ne = [entry, ...entries].slice(0, LIMITS.EXPENSE_MAX);
    setEntries(ne); save(ne); setAmt(""); setNote(""); vib();
  };

  const removeEntry = (id) => { const ne = entries.filter(e => e.id !== id); setEntries(ne); save(ne); vib(); };

  const addRecurring = () => {
    const a = safeRange(parseFloat(rAmt), 1, 9999999, 0);
    if (a <= 0 || !rNote.trim()) return;
    const nr = [...recurring, { id: Date.now(), amount: a, category: rCat, note: rNote.trim().slice(0, 40) }].slice(0, 20);
    setRecurring(nr); save(undefined, nr); setRAmt(""); setRNote(""); vib();
  };
  const removeRecurring = (id) => { const nr = recurring.filter(r => r.id !== id); setRecurring(nr); save(undefined, nr); vib(); };

  // Filtered entries for current month
  const monthEntries = useMemo(() => entries.filter(e => e.date?.startsWith(viewMonth)), [entries, viewMonth]);
  const monthExpenses = useMemo(() => monthEntries.filter(e => e.type === "expense"), [monthEntries]);
  const monthIncome = useMemo(() => monthEntries.filter(e => e.type === "income"), [monthEntries]);

  const monthExpTotal = useMemo(() => monthExpenses.reduce((s, e) => s + e.amount, 0), [monthExpenses]);
  const monthIncTotal = useMemo(() => monthIncome.reduce((s, e) => s + e.amount, 0), [monthIncome]);
  const recurringTotal = useMemo(() => recurring.reduce((s, r) => s + r.amount, 0), [recurring]);
  const effectiveBudget = budget + monthIncTotal;
  const remaining = effectiveBudget - monthExpTotal - recurringTotal;

  // Category breakdown
  const catData = useMemo(() => {
    return EXP_CATEGORIES.map(c => {
      const total = monthExpenses.filter(e => e.category === c.id).reduce((s, e) => s + e.amount, 0);
      const budgetAmt = safeNum(catBudgets[c.id]);
      return { ...c, total, pct: monthExpTotal > 0 ? (total / monthExpTotal * 100) : 0, budget: budgetAmt, overBudget: budgetAmt > 0 && total > budgetAmt };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [monthExpenses, monthExpTotal, catBudgets]);

  // Daily trend for sparkline
  const dailyTrend = useMemo(() => {
    const days = {};
    monthExpenses.forEach(e => { days[e.date] = (days[e.date] || 0) + e.amount; });
    return Object.values(days);
  }, [monthExpenses]);

  useEffect(() => { if (!onResult) return; const tm = setTimeout(() => onResult({
    "Spent": currency(monthExpTotal), "Budget": currency(budget), "Remaining": currency(remaining)
  }), TIMING.DEBOUNCE_CALC); return () => clearTimeout(tm); }, [monthExpTotal, budget, remaining]);

  return (<div>
    <div style={tabRow}>
      <button onClick={() => { setTab("add"); vib(); }} style={tabStyle(tab === "add", color, t)}>Add</button>
      <button onClick={() => { setTab("summary"); vib(); }} style={tabStyle(tab === "summary", tokens.color.secondary, t)}>Summary</button>
      <button onClick={() => { setTab("recurring"); vib(); }} style={tabStyle(tab === "recurring", "#F59E0B", t)}>Recurring</button>
      <button onClick={() => { setTab("budget"); vib(); }} style={tabStyle(tab === "budget", tokens.color.success, t)}>Budget</button>
    </div>

    {/* Month progress */}
    <div style={sectionGapLg}>
      <HeroNumber label={`${formatMonth(viewMonth)}`}
        value={currency(monthExpTotal)} color={remaining < 0 ? tokens.color.danger : color} />
      <MetricGrid t={t} items={[
        { label: "Income", value: currencyCompact(monthIncTotal), color: tokens.color.success },
        { label: "Budget", value: currencyCompact(effectiveBudget) },
        { label: "Recurring", value: currencyCompact(recurringTotal), color: "#F59E0B" },
        { label: "Remaining", value: currencyCompact(remaining), color: remaining >= 0 ? tokens.color.success : tokens.color.danger },
      ]} />
    </div>

    {tab === "add" && (<div>
      {/* Expense/Income toggle */}
      <div style={tabRowSm}>
        <button onClick={() => { setExpType("expense"); vib(); }} style={tabStyle(expType === "expense", tokens.color.danger, t)}>Expense</button>
        <button onClick={() => { setExpType("income"); vib(); }} style={tabStyle(expType === "income", tokens.color.success, t)}>Income</button>
      </div>

      <input type="number" placeholder="Amount ₹" value={amt} onChange={e => setAmt(clampInput(e.target.value, 0, CLAMP.AMOUNT_MAX) || "")}
        style={{ ...inputStyle(t), textAlign: "center", fontSize: tokens.fontSize.title, fontFamily: tokens.fontFamily.mono, marginBottom: tokens.space.sm }} />

      {/* Quick amounts */}
      <div style={{ display: "flex", gap: tokens.space.xs, marginBottom: tokens.space.md, flexWrap: "wrap" }}>
        {QUICK_AMTS.map(a => (
          <button key={a} onClick={() => { setAmt(String(a)); vib(); }} style={tabStyle(amt === String(a), color, t)}>{a >= 1000 ? `${a / 1000}K` : a}</button>
        ))}
      </div>

      {/* Category */}
      <div style={labelStyle(t)}>Category</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: tokens.space.xs, marginBottom: tokens.space.md }}>
        {EXP_CATEGORIES.map(c => (
          <button key={c.id} onClick={() => { setCategory(c.id); vib(); }}
            style={{ ...tabStyle(category === c.id, c.color, t), fontSize: tokens.fontSize.caption - 1 }}>{c.icon} {c.label}</button>
        ))}
      </div>

      <input type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value.slice(0, 40))} maxLength={40} style={{ ...inputStyle(t), marginBottom: tokens.space.sm }} />

      {/* Pay mode */}
      <div style={tabRowSm}>
        {PAY_MODES.map(p => (
          <button key={p.id} onClick={() => { setPayMode(p.id); vib(); }} style={tabStyle(payMode === p.id, color, t)}>{p.icon} {p.l}</button>
        ))}
      </div>

      <button onClick={addEntry} style={{ width: "100%", padding: tokens.space.lg, borderRadius: tokens.radius.md, background: expType === "expense" ? `${tokens.color.danger}15` : `${tokens.color.success}15`, border: `1px solid ${expType === "expense" ? tokens.color.danger : tokens.color.success}30`, color: expType === "expense" ? tokens.color.danger : tokens.color.success, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.body, cursor: "pointer", fontFamily: tokens.fontFamily.sans }}>
        {expType === "expense" ? "- Add expense" : "+ Add income"}
      </button>

      {/* Recent entries */}
      <div style={sectionGap}>
        <div style={labelStyle(t)}>Recent</div>
        {monthEntries.length === 0 ? (
          <EmptyState icon="💸" message="No entries this month. Add your first expense above." t={t} />
        ) : monthEntries.slice(0, 15).map(e => {
          const cat = EXP_CATEGORIES.find(c => c.id === e.category) || EXP_CATEGORIES[7];
          return (<div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${tokens.space.sm}px 0`, borderBottom: `1px solid ${t.border}`, fontSize: tokens.fontSize.caption }}>
            <div style={rowCenter}>
              <span>{cat.icon}</span>
              <div>
                <div style={{ color: t.text }}>{e.note || cat.label}</div>
                <div style={{ fontSize: tokens.fontSize.caption - 2, color: t.textDim }}>{e.date} &bull; {e.payMode}</div>
              </div>
            </div>
            <div style={rowCenter}>
              <span style={{ color: e.type === "income" ? tokens.color.success : tokens.color.danger, fontFamily: tokens.fontFamily.mono, fontWeight: tokens.fontWeight.medium }}>
                {e.type === "income" ? "+" : "-"}{currency(e.amount)}
              </span>
              <button onClick={() => removeEntry(e.id)} style={{ background: "none", border: "none", color: tokens.color.danger, cursor: "pointer", fontSize: 10 }}>✕</button>
            </div>
          </div>);
        })}
      </div>
    </div>)}

    {tab === "summary" && (<div>
      {/* Category donut */}
      {catData.length > 0 && (<div>
        <MiniChart type="donut" data={catData.map(c => c.total)} width={140} height={140} colors={catData.map(c => c.color)} t={t} />
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: tokens.space.sm, marginTop: tokens.space.sm, marginBottom: tokens.space.lg }}>
          {catData.map(c => (
            <span key={c.id} style={{ fontSize: tokens.fontSize.caption - 1, color: c.color }}>{c.icon} {c.label} {pct(c.pct, 0)}</span>
          ))}
        </div>
      </div>)}

      {/* Category breakdown */}
      {catData.map(c => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${tokens.space.sm}px 0`, borderBottom: `1px solid ${t.border}`, fontSize: tokens.fontSize.caption }}>
          <div style={rowCenter}>
            <span style={{ fontSize: 14 }}>{c.icon}</span>
            <span style={{ color: t.text }}>{c.label}</span>
            {c.overBudget && <span style={{ fontSize: 9, color: tokens.color.danger, background: `${tokens.color.danger}15`, padding: "1px 6px", borderRadius: 4 }}>Over budget</span>}
          </div>
          <div style={TEXT_RIGHT}>
            <span style={{ color: c.color, fontFamily: tokens.fontFamily.mono, fontWeight: tokens.fontWeight.medium }}>{currency(c.total)}</span>
            <span style={{ color: t.textDim, marginLeft: tokens.space.sm }}>{pct(c.pct, 0)}</span>
          </div>
        </div>
      ))}

      {/* Daily trend */}
      {dailyTrend.length > 2 && (<div style={sectionGap}>
        <div style={labelStyle(t)}>Daily spending trend</div>
        <MiniChart type="sparkline" data={dailyTrend} height={60} colors={[color]} t={t} />
      </div>)}
    </div>)}

    {tab === "recurring" && (<div>
      <div style={{ ...metricStyle(t), marginBottom: tokens.space.md }}>
        <input type="number" placeholder="Amount/month ₹" value={rAmt} onChange={e => setRAmt(clampInput(e.target.value, 0, CLAMP.AMOUNT_MAX) || "")} style={{ ...inputStyle(t), marginBottom: tokens.space.sm, fontFamily: tokens.fontFamily.mono }} />
        <input type="text" placeholder="Name (Rent, EMI, Netflix...)" value={rNote} onChange={e => setRNote(e.target.value.slice(0, 40))} maxLength={40} style={{ ...inputStyle(t), marginBottom: tokens.space.sm }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: tokens.space.xs, marginBottom: tokens.space.sm }}>
          {EXP_CATEGORIES.map(c => <button key={c.id} onClick={() => { setRCat(c.id); vib(); }} style={{ ...tabStyle(rCat === c.id, c.color, t), fontSize: tokens.fontSize.caption - 2 }}>{c.icon}</button>)}
        </div>
        <button onClick={addRecurring} style={{ width: "100%", padding: tokens.space.sm, borderRadius: tokens.radius.sm, background: `${color}15`, border: `1px solid ${color}30`, color, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", fontFamily: tokens.fontFamily.sans }}>+ Add recurring</button>
      </div>

      {recurring.length === 0 ? (
        <EmptyState icon="🔄" message="No recurring expenses. Add rent, EMI, subscriptions." t={t} />
      ) : recurring.map(r => {
        const cat = EXP_CATEGORIES.find(c => c.id === r.category) || EXP_CATEGORIES[7];
        return (<div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${tokens.space.sm}px 0`, borderBottom: `1px solid ${t.border}`, fontSize: tokens.fontSize.caption }}>
          <span style={{ color: t.text }}>{cat.icon} {r.note}</span>
          <div style={rowCenter}>
            <span style={{ color, fontFamily: tokens.fontFamily.mono }}>{currency(r.amount)}/mo</span>
            <button onClick={() => removeRecurring(r.id)} style={{ background: "none", border: "none", color: tokens.color.danger, cursor: "pointer" }}>✕</button>
          </div>
        </div>);
      })}
      {recurring.length > 0 && <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, marginTop: tokens.space.sm }}>Total recurring: {currency(recurringTotal)}/month</div>}
    </div>)}

    {tab === "budget" && (<div>
      <div style={labelStyle(t)}>Monthly budget</div>
      <div style={{ display: "flex", gap: tokens.space.xs, marginBottom: tokens.space.lg, flexWrap: "wrap" }}>
        {[10000, 20000, 30000, 50000, 75000, 100000].map(b => (
          <button key={b} onClick={() => { setBudget(b); save(undefined, undefined, b); vib(); }}
            style={tabStyle(budget === b, color, t)}>{currencyCompact(b)}</button>
        ))}
      </div>

      <div style={labelStyle(t)}>Category budgets</div>
      {EXP_CATEGORIES.map(c => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: tokens.space.sm, marginBottom: tokens.space.sm }}>
          <span style={{ fontSize: 14, width: 24 }}>{c.icon}</span>
          <span style={{ fontSize: tokens.fontSize.caption, color: t.textMuted, width: 60 }}>{c.label}</span>
          <input type="number" value={catBudgets[c.id] || ""} placeholder="0" onChange={e => { const nb = { ...catBudgets, [c.id]: safeRange(parseInt(e.target.value) || 0, 0, CLAMP.BUDGET_MAX, 0) }; setCatBudgets(nb); save(undefined, undefined, undefined, nb); }} style={{ ...inputStyle(t), flex: 1, textAlign: "right", fontFamily: tokens.fontFamily.mono, padding: `${tokens.space.xs}px ${tokens.space.sm}px` }} />
        </div>
      ))}
    </div>)}

    {/* Month navigation */}
    <div style={{ display: "flex", justifyContent: "center", gap: tokens.space.sm, marginTop: tokens.space.lg }}>
      <button onClick={() => { setViewMonth(offsetMonth(viewMonth, -1)); vib(); }}
        style={tabStyle(false, color, t)}>← Prev</button>
      <span style={{ fontSize: tokens.fontSize.caption, color: t.textMuted, alignSelf: "center" }}>{viewMonth}</span>
      <button onClick={() => { setViewMonth(offsetMonth(viewMonth, 1)); vib(); }}
        style={tabStyle(false, color, t)}>Next →</button>
    </div>
  
    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md, lineHeight: 1.6 }}>Expense tracking is for personal budgeting only. Verify figures independently. Not financial advice.</div>
  </div>);
}
