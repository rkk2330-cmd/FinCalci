import { captionDim, sectionGap, itemTitle, rowCenter } from '../design/styles';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
import type { CalcProps } from '../types';
import { clampInput } from '../hooks/useValidatedInput';
import { CLAMP } from '../utils/constants';
// FinCalci — TipCalc v2 (Group bill splitter with persistent sessions)
import React from 'react';
const { useState, useEffect, useMemo, useCallback } = React;
import { safeNum, safeRange, safeDivide, sanitizeSplitSessions } from '../utils/validate';
import { currency, num, pct, FMT } from '../utils/format';
import { KEYS, TIMING, LIMITS } from '../utils/constants';
import { tokens } from '../design/tokens';
import { tabStyle, inputStyle, labelStyle, metricStyle } from '../design/theme';
import { safeStorageGet, safeStorageSet } from '../utils/storage';
import { vib } from '../utils/haptics';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import { EmptyState } from '../components/UIStates';

export default function TipCalc({ color, t, onResult }: CalcProps) {
  const [sessions, setSessions] = useState<unknown[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [newSessionName, setNewSessionName] = useState("");
  const [newName, setNewName] = useState("");
  const [expDesc, setExpDesc] = useState(""), [expAmt, setExpAmt] = useState(""), [expPayer, setExpPayer] = useState(null);
  const [splitType, setSplitType] = useState("equal");
  const [memberShares, setMemberShares] = useState<Record<string, unknown>>({});

  useEffect(() => { (async () => { const d = await safeStorageGet(KEYS.SPLIT, []); setSessions(sanitizeSplitSessions(d, LIMITS.SPLIT_SESSIONS_MAX)); })(); }, []);
  const saveSessions = async (s) => { await safeStorageSet(KEYS.SPLIT, s); };

  const sess = activeIdx >= 0 ? sessions[activeIdx] : null;
  const members = sess?.members || [];
  const expenses = sess?.expenses || [];
  const settledList = sess?.settledList || [];

  const updateSession = useCallback((updates) => {
    const ns = sessions.map((s, i) => i === activeIdx ? { ...s, ...updates } : s);
    setSessions(ns); saveSessions(ns);
  }, [sessions, activeIdx]);

  const createSession = () => {
    if (!newSessionName.trim() || sessions.length >= LIMITS.SPLIT_SESSIONS_MAX) return;
    const ns = [...sessions, { id: Date.now(), name: newSessionName.trim().slice(0, 25), members: [{ id: 1, name: "You" }, { id: 2, name: "Friend" }], expenses: [], settledList: [], createdAt: new Date().toLocaleDateString("en-IN"), nextMemberId: 3 }];
    setSessions(ns); saveSessions(ns); setActiveIdx(ns.length - 1); setNewSessionName(""); vib();
  };

  const addMember = () => {
    if (!newName.trim() || !sess || members.length >= LIMITS.SPLIT_MEMBERS_MAX) return;
    updateSession({ members: [...members, { id: sess.nextMemberId, name: newName.trim().slice(0, 20) }], nextMemberId: sess.nextMemberId + 1 });
    setNewName(""); vib();
  };

  const addExpense = () => {
    if (!expDesc.trim() || !expAmt || !expPayer) return;
    const amt = safeRange(parseFloat(expAmt), 0.01, 9999999, 0);
    if (amt <= 0) return;
    const exp = { id: Date.now(), payer: expPayer, amount: amt, desc: expDesc.trim().slice(0, 30), splitType, customShares: splitType === "custom" ? { ...memberShares } : undefined };
    updateSession({ expenses: [...expenses, exp] });
    setExpDesc(""); setExpAmt(""); setMemberShares({}); vib();
  };

  const removeExpense = (id) => { updateSession({ expenses: expenses.filter(e => e.id !== id) }); vib(); };
  const toggleSettle = (key) => { updateSession({ settledList: settledList.includes(key) ? settledList.filter(k => k !== key) : [...settledList, key] }); vib(); };

  // Calculate settlements
  const settlements = useMemo(() => {
    if (!sess || members.length < 2 || expenses.length === 0) return [];
    const owesMap = {};
    members.forEach(m => { owesMap[m.id] = 0; });

    expenses.forEach(exp => {
      if (exp.splitType === "custom" && exp.customShares) {
        const totalShares = Object.values(exp.customShares).reduce((s, v) => s + safeNum(v), 0);
        if (totalShares > 0) members.forEach(m => { owesMap[m.id] += (safeNum(exp.customShares[m.id]) / totalShares) * exp.amount; });
      } else {
        const perPerson = safeDivide(exp.amount, members.length, 0);
        members.forEach(m => { owesMap[m.id] += perPerson; });
      }
    });

    const balances = members.map(m => ({ ...m, paid: expenses.filter(e => e.payer === m.id).reduce((s, e) => s + e.amount, 0), owes: owesMap[m.id] || 0 }));
    const result = [];
    const debtors = balances.filter(b => b.paid < b.owes).map(b => ({ ...b, debt: b.owes - b.paid })).sort((a, b) => b.debt - a.debt);
    const creditors = balances.filter(b => b.paid > b.owes).map(b => ({ ...b, credit: b.paid - b.owes })).sort((a, b) => b.credit - a.credit);

    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const amount = Math.min(debtors[di].debt, creditors[ci].credit);
      if (amount > 0.5) result.push({ from: debtors[di].name, to: creditors[ci].name, amount, key: `${debtors[di].id}-${creditors[ci].id}` });
      debtors[di].debt -= amount; creditors[ci].credit -= amount;
      if (debtors[di].debt < 0.5) di++;
      if (creditors[ci].credit < 0.5) ci++;
    }
    return result;
  }, [sess, members, expenses]);

  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  useEffect(() => { if (!onResult || !sess) return; const tm = setTimeout(() => onResult({ "Total": currency(totalSpent), "Members": `${members.length}`, "Settlements": `${settlements.length}` }), TIMING.DEBOUNCE_CALC); return () => clearTimeout(tm); }, [expenses, members, settlements]);

  return (<div>
    {!sess ? (<div>
      {/* Session list */}
      <div style={{ ...metricStyle(t), marginBottom: tokens.space.md }}>
        <input type="text" placeholder="Trip name (e.g., Goa Trip, Roommates)" value={newSessionName} onChange={e => setNewSessionName(e.target.value.slice(0, 25))} maxLength={25} onKeyDown={e => e.key === "Enter" && createSession()} style={{ ...inputStyle(t), marginBottom: tokens.space.sm }} />
        <button onClick={createSession} style={{ width: "100%", padding: tokens.space.sm, borderRadius: tokens.radius.sm, background: `${color}15`, border: `1px solid ${color}30`, color, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", fontFamily: tokens.fontFamily.sans }}>
          + New group ({sessions.length}/{LIMITS.SPLIT_SESSIONS_MAX})
        </button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon="👥" message="No groups yet. Create a group to split bills with friends." t={t} />
      ) : sessions.map((s, i) => {
        const tot = (s.expenses || []).reduce((sum, e) => sum + e.amount, 0);
        return (<div key={s.id} onClick={() => { setActiveIdx(i); vib(); }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: tokens.space.md, borderRadius: tokens.radius.md, border: `1px solid ${t.border}`, marginBottom: tokens.space.sm, cursor: "pointer", background: t.card }}>
          <div>
            <div style={itemTitle(t)}>{s.name}</div>
            <div style={captionDim(t)}>{(s.members || []).length} members &bull; {(s.expenses || []).length} expenses</div>
          </div>
          <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color, fontFamily: tokens.fontFamily.mono }}>{currency(tot)}</div>
        </div>);
      })}
    </div>) : (<div>
      {/* Active session */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.lg }}>
        <button onClick={() => { setActiveIdx(-1); vib(); }} style={tabStyle(false, color, t)}>← Back</button>
        <div style={itemTitle(t)}>{sess.name}</div>
        <button onClick={() => { const ns = sessions.filter((_, i) => i !== activeIdx); setSessions(ns); saveSessions(ns); setActiveIdx(-1); vib(); }}
          style={tabStyle(false, tokens.color.danger, t)}>Delete</button>
      </div>

      <HeroNumber label="Total spent" value={currency(totalSpent)} color={color} />
      <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, textAlign: "center", marginBottom: tokens.space.lg }}>
        {members.length} members &bull; {currency(members.length > 0 ? totalSpent / members.length : 0)}/person avg
      </div>

      {/* Members */}
      <div style={labelStyle(t)}>Members</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: tokens.space.xs, marginBottom: tokens.space.md }}>
        {members.map(m => (
          <span key={m.id} style={{ padding: `${tokens.space.xs}px ${tokens.space.md}px`, borderRadius: tokens.radius.pill, background: `${color}15`, border: `1px solid ${color}30`, color, fontSize: tokens.fontSize.caption }}>{m.name}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: tokens.space.sm, marginBottom: tokens.space.lg }}>
        <input type="text" placeholder="Add member..." value={newName} onChange={e => setNewName(e.target.value.slice(0, 20))} maxLength={20} onKeyDown={e => e.key === "Enter" && addMember()} style={{ ...inputStyle(t), flex: 1 }} />
        <button onClick={addMember} style={tabStyle(false, color, t)}>+</button>
      </div>

      {/* Add expense */}
      <div style={{ ...metricStyle(t), marginBottom: tokens.space.md }}>
        <div style={labelStyle(t)}>Add expense</div>
        <input type="text" placeholder="What for?" value={expDesc} onChange={e => setExpDesc(e.target.value.slice(0, 30))} maxLength={30} style={{ ...inputStyle(t), marginBottom: tokens.space.sm }} />
        <input type="number" placeholder="Amount ₹" value={expAmt} onChange={e => setExpAmt(clampInput(e.target.value, 0, CLAMP.AMOUNT_MAX) || "")} style={{ ...inputStyle(t), marginBottom: tokens.space.sm, fontFamily: tokens.fontFamily.mono }} />
        <div style={labelStyle(t)}>Who paid?</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: tokens.space.xs, marginBottom: tokens.space.sm }}>
          {members.map(m => (
            <button key={m.id} onClick={() => { setExpPayer(m.id); vib(); }}
              style={tabStyle(expPayer === m.id, color, t)}>{m.name}</button>
          ))}
        </div>
        <button onClick={addExpense} style={{ width: "100%", padding: tokens.space.sm, borderRadius: tokens.radius.sm, background: `${color}15`, border: `1px solid ${color}30`, color, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", fontFamily: tokens.fontFamily.sans }}>
          + Add expense
        </button>
      </div>

      {/* Expenses list */}
      {expenses.length === 0 ? (
        <EmptyState icon="🧾" message="No expenses yet. Add a bill to split." t={t} />
      ) : expenses.map(e => {
        const payer = members.find(m => m.id === e.payer);
        return (<div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${tokens.space.sm}px 0`, borderBottom: `1px solid ${t.border}`, fontSize: tokens.fontSize.caption }}>
          <div>
            <span style={{ color: t.text, fontWeight: tokens.fontWeight.medium }}>{e.desc}</span>
            <span style={{ color: t.textDim, marginLeft: tokens.space.sm }}>by {payer?.name}</span>
          </div>
          <div style={rowCenter}>
            <span style={{ color, fontFamily: tokens.fontFamily.mono }}>{currency(e.amount)}</span>
            <button onClick={() => removeExpense(e.id)} style={{ background: "none", border: "none", color: tokens.color.danger, cursor: "pointer" }}>✕</button>
          </div>
        </div>);
      })}

      {/* Settlements */}
      {settlements.length > 0 && (<div style={sectionGap}>
        <div style={labelStyle(t)}>Who owes whom</div>
        {settlements.map(s => (
          <div key={s.key} onClick={() => toggleSettle(s.key)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: tokens.space.md, borderRadius: tokens.radius.md, border: `1px solid ${settledList.includes(s.key) ? tokens.color.success + "50" : t.border}`, background: settledList.includes(s.key) ? `${tokens.color.success}08` : t.card, marginBottom: tokens.space.sm, cursor: "pointer" }}>
            <div style={{ fontSize: tokens.fontSize.small, color: settledList.includes(s.key) ? tokens.color.success : t.text }}>
              <span style={{ fontWeight: tokens.fontWeight.medium }}>{s.from}</span>
              <span style={{ color: t.textDim }}> pays </span>
              <span style={{ fontWeight: tokens.fontWeight.medium }}>{s.to}</span>
            </div>
            <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: settledList.includes(s.key) ? tokens.color.success : color, fontFamily: tokens.fontFamily.mono, textDecoration: settledList.includes(s.key) ? "line-through" : "none" }}>
              {currency(Math.round(s.amount))}
            </div>
          </div>
        ))}
      </div>)}
    </div>)}
  
    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md, lineHeight: 1.6 }}>Bill splitting is approximate. Verify amounts with all parties before settling.</div>
  </div>);
}
