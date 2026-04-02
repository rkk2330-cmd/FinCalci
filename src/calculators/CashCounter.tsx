import { tabRow, captionDim, itemTitle, TEXT_RIGHT } from '../design/styles';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
import type { CalcProps } from '../types';
import { clampInput } from '../hooks/useValidatedInput';
import { CLAMP } from '../utils/constants';
// FinCalci — CashCounter (Cash denomination counter + Khata Book)
import React from 'react';
const { useState, useEffect, useMemo, useCallback } = React;
import { safeNum, safeRange, sanitizeKhataCustomers } from '../utils/validate';
import { currency, num, FMT } from '../utils/format';
import { KEYS, TIMING, LIMITS } from '../utils/constants';
import { tokens } from '../design/tokens';
import { tabStyle, inputStyle, labelStyle, metricStyle } from '../design/theme';
import { safeStorageGet, safeStorageSet } from '../utils/storage';
import { vib } from '../utils/haptics';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import { EmptyState } from '../components/UIStates';

const DENOMS = [
  { value: 2000, color: "#D946EF", label: "₹2000" }, { value: 500, color: "#6366F1", label: "₹500" },
  { value: 200, color: "#F59E0B", label: "₹200" }, { value: 100, color: "#34D399", label: "₹100" },
  { value: 50, color: "#38BDF8", label: "₹50" }, { value: 20, color: "#FB923C", label: "₹20" },
  { value: 10, color: "#94a3b8", label: "₹10" }, { value: 5, color: "#64748b", label: "₹5" },
  { value: 2, color: "#4B5563", label: "₹2" }, { value: 1, color: "#374151", label: "₹1" },
];

export default function CashCounter({ color, t, onResult }: CalcProps) {
  const [mode, setMode] = useState("cash"); // cash, khata
  const [counts, setCounts] = useState<Record<string, unknown>>({});

  // Khata state
  const [customers, setCustomers] = useState<unknown[]>([]);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [custName, setCustName] = useState(""), [custPhone, setCustPhone] = useState("");
  const [txnAmt, setTxnAmt] = useState(""), [txnNote, setTxnNote] = useState("");
  const [kSearch, setKSearch] = useState("");
  const [editTxn, setEditTxn] = useState(null);

  // Load Khata
  useEffect(() => { (async () => { const d = await safeStorageGet(KEYS.KHATA, []); setCustomers(sanitizeKhataCustomers(d, LIMITS.KHATA_CUSTOMERS_MAX)); })(); }, []);
  const saveKhata = async (c) => { await safeStorageSet(KEYS.KHATA, c); };

  // Cash total
  const total = useMemo(() => DENOMS.reduce((s, d) => s + d.value * safeNum(counts[d.value]), 0), [counts]);
  const totalNotes = useMemo(() => Object.values(counts).reduce((s, c) => s + safeNum(c), 0), [counts]);

  const updateCount = (denom, val) => { setCounts(prev => ({ ...prev, [denom]: safeRange(parseInt(val) || 0, 0, 99999, 0) })); };
  const resetCounts = () => { setCounts({}); vib(); };

  // Khata functions
  const addCustomer = () => {
    if (!custName.trim() || customers.length >= LIMITS.KHATA_CUSTOMERS_MAX) return;
    const nc = [...customers, { id: Date.now(), name: custName.trim().slice(0, 30), phone: custPhone.slice(0, 15), transactions: [], createdAt: new Date().toLocaleDateString("en-IN") }];
    setCustomers(nc); saveKhata(nc); setCustName(""); setCustPhone(""); vib();
  };

  const addTransaction = (type) => {
    if (!activeCustomer || !txnAmt) return;
    const amt = safeRange(parseFloat(txnAmt), 0.01, 99999999, 0);
    if (amt <= 0) return;
    const nc = customers.map(c => {
      if (c.id !== activeCustomer.id) return c;
      const txns = [...(c.transactions || []).slice(-(LIMITS.KHATA_TXNS_PER_CUSTOMER - 1)), { id: Date.now(), amount: amt, type, note: txnNote.slice(0, 40), date: new Date().toLocaleDateString("en-IN") }];
      return { ...c, transactions: txns };
    });
    setCustomers(nc); saveKhata(nc); setTxnAmt(""); setTxnNote("");
    setActiveCustomer(nc.find(c => c.id === activeCustomer.id)); vib();
  };

  const balance = useMemo(() => {
    if (!activeCustomer) return 0;
    return (activeCustomer.transactions || []).reduce((s, tx) => s + (tx.type === "gave" ? -tx.amount : tx.amount), 0);
  }, [activeCustomer]);

  const filteredCustomers = useMemo(() =>
    kSearch ? customers.filter(c => c.name.toLowerCase().includes(kSearch.toLowerCase())) : customers,
  [customers, kSearch]);

  useEffect(() => { if (!onResult) return; const tm = setTimeout(() => {
    if (mode === "cash") onResult({ "Total": currency(total), "Notes": num(totalNotes) });
    else if (activeCustomer) onResult({ "Customer": activeCustomer.name, "Balance": currency(Math.abs(balance)), "Status": balance >= 0 ? "To receive" : "To pay" });
  }, TIMING.DEBOUNCE_CALC); return () => clearTimeout(tm); }, [total, counts, activeCustomer, balance, mode]);

  return (<div>
    <div style={tabRow}>
      <button onClick={() => { setMode("cash"); vib(); }} style={tabStyle(mode === "cash", color, t)}>Cash counter</button>
      <button onClick={() => { setMode("khata"); vib(); }} style={tabStyle(mode === "khata", "#34D399", t)}>Khata Book</button>
    </div>

    {mode === "cash" ? (<div>
      <HeroNumber label="Total cash" value={currency(total)} color={color} />
      <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, textAlign: "center", marginBottom: tokens.space.lg }}>{num(totalNotes)} notes/coins</div>

      {DENOMS.map(d => (
        <div key={d.value} style={{ display: "grid", gridTemplateColumns: "70px 1fr 80px", gap: tokens.space.sm, alignItems: "center", marginBottom: tokens.space.sm }}>
          <span style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: d.color, fontFamily: tokens.fontFamily.mono }}>{d.label}</span>
          <input type="number" value={counts[d.value] || ""} onChange={e => updateCount(d.value, clampInput(e.target.value, 0, CLAMP.DENOM_COUNT_MAX, 0))} placeholder="0"
            style={{ ...inputStyle(t), textAlign: "center", fontFamily: tokens.fontFamily.mono, padding: `${tokens.space.sm}px` }} />
          <span style={{ fontSize: tokens.fontSize.caption, color: t.textMuted, textAlign: "right", fontFamily: tokens.fontFamily.mono }}>= {currency(d.value * safeNum(counts[d.value]))}</span>
        </div>
      ))}

      <button onClick={resetCounts} style={{ width: "100%", padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${tokens.color.danger}10`, border: `1px solid ${tokens.color.danger}25`, color: tokens.color.danger, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", marginTop: tokens.space.md, fontFamily: tokens.fontFamily.sans }}>
        Reset all
      </button>
    </div>) : (<div>
      {/* Khata Book */}
      {!activeCustomer ? (<div>
        {/* Add customer */}
        <div style={{ ...metricStyle(t), marginBottom: tokens.space.md }}>
          <input type="text" placeholder="Customer name *" value={custName} onChange={e => setCustName(e.target.value.slice(0, 30))} maxLength={30} onKeyDown={e => e.key === "Enter" && addCustomer()} style={{ ...inputStyle(t), marginBottom: tokens.space.sm }} />
          <input type="text" placeholder="Phone (optional)" value={custPhone} onChange={e => setCustPhone(e.target.value.slice(0, 15))} maxLength={15} style={{ ...inputStyle(t), marginBottom: tokens.space.sm }} />
          <button onClick={addCustomer} style={{ width: "100%", padding: tokens.space.sm, borderRadius: tokens.radius.sm, background: `${tokens.color.success}15`, border: `1px solid ${tokens.color.success}30`, color: tokens.color.success, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", fontFamily: tokens.fontFamily.sans }}>
            + Add customer ({customers.length}/{LIMITS.KHATA_CUSTOMERS_MAX})
          </button>
        </div>

        {/* Search + list */}
        {customers.length > 3 && <input type="text" placeholder="Search customer..." value={kSearch} onChange={e => setKSearch(e.target.value.slice(0, 30))} maxLength={30} style={{ ...inputStyle(t), marginBottom: tokens.space.md }} />}

        {filteredCustomers.length === 0 ? (
          <EmptyState icon="📒" message="Your digital Khata. Add customers and track credit/debit." t={t} />
        ) : filteredCustomers.map(c => {
          const bal = (c.transactions || []).reduce((s, tx) => s + (tx.type === "gave" ? -tx.amount : tx.amount), 0);
          return (<div key={c.id} onClick={() => { setActiveCustomer(c); vib(); }}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${tokens.space.md}px`, borderRadius: tokens.radius.md, border: `1px solid ${t.border}`, marginBottom: tokens.space.sm, cursor: "pointer", background: t.card }}>
            <div>
              <div style={itemTitle(t)}>{c.name}</div>
              <div style={captionDim(t)}>{c.phone || "No phone"} &bull; {(c.transactions || []).length} txns</div>
            </div>
            <div style={TEXT_RIGHT}>
              <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: bal >= 0 ? tokens.color.success : tokens.color.danger, fontFamily: tokens.fontFamily.mono }}>{currency(Math.abs(bal))}</div>
              <div style={{ fontSize: tokens.fontSize.caption - 1, color: bal >= 0 ? tokens.color.success : tokens.color.danger }}>{bal >= 0 ? "To receive" : "To pay"}</div>
            </div>
          </div>);
        })}

        {/* Khata summary */}
        {customers.length > 0 && (() => {
          const totalGave = customers.reduce((s, c) => s + (c.transactions || []).filter(tx => tx.type === "gave").reduce((s2, tx) => s2 + tx.amount, 0), 0);
          const totalGot = customers.reduce((s, c) => s + (c.transactions || []).filter(tx => tx.type === "got").reduce((s2, tx) => s2 + tx.amount, 0), 0);
          return <MetricGrid t={t} items={[{ label: "Total given", value: currency(totalGave), color: tokens.color.danger }, { label: "Total received", value: currency(totalGot), color: tokens.color.success }]} />;
        })()}
      </div>) : (<div>
        {/* Customer detail */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.lg }}>
          <button onClick={() => { setActiveCustomer(null); vib(); }} style={tabStyle(false, color, t)}>← Back</button>
          <div style={TEXT_RIGHT}>
            <div style={itemTitle(t)}>{activeCustomer.name}</div>
            <div style={captionDim(t)}>{activeCustomer.phone}</div>
          </div>
        </div>

        <HeroNumber label={balance >= 0 ? "To receive" : "To pay"} value={currency(Math.abs(balance))} color={balance >= 0 ? tokens.color.success : tokens.color.danger} />

        {/* Add transaction */}
        <div style={{ display: "flex", gap: tokens.space.sm, marginBottom: tokens.space.md }}>
          <input type="number" placeholder="Amount ₹" value={txnAmt} onChange={e => setTxnAmt(clampInput(e.target.value, 0, CLAMP.AMOUNT_HUGE_MAX) || "")} style={{ ...inputStyle(t), flex: 1, fontFamily: tokens.fontFamily.mono }} />
          <input type="text" placeholder="Note" value={txnNote} onChange={e => setTxnNote(e.target.value.slice(0, 40))} maxLength={40} style={{ ...inputStyle(t), flex: 1 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.space.sm, marginBottom: tokens.space.lg }}>
          <button onClick={() => addTransaction("gave")} style={{ padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${tokens.color.danger}15`, border: `1px solid ${tokens.color.danger}30`, color: tokens.color.danger, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", fontFamily: tokens.fontFamily.sans }}>You gave</button>
          <button onClick={() => addTransaction("got")} style={{ padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${tokens.color.success}15`, border: `1px solid ${tokens.color.success}30`, color: tokens.color.success, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", fontFamily: tokens.fontFamily.sans }}>You got</button>
        </div>

        {/* Transaction list */}
        {(activeCustomer.transactions || []).length === 0 ? (
          <EmptyState icon="💰" message="No transactions yet. Tap You Gave / You Got to start." t={t} />
        ) : [...(activeCustomer.transactions || [])].reverse().map(tx => (
          <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${tokens.space.sm}px 0`, borderBottom: `1px solid ${t.border}`, fontSize: tokens.fontSize.caption }}>
            <div>
              <span style={{ color: tx.type === "gave" ? tokens.color.danger : tokens.color.success, fontWeight: tokens.fontWeight.medium }}>{tx.type === "gave" ? "↑ Gave" : "↓ Got"}</span>
              {tx.note && <span style={{ color: t.textDim, marginLeft: tokens.space.sm }}>{tx.note}</span>}
            </div>
            <div style={TEXT_RIGHT}>
              <div style={{ color: tx.type === "gave" ? tokens.color.danger : tokens.color.success, fontFamily: tokens.fontFamily.mono, fontWeight: tokens.fontWeight.medium }}>{currency(tx.amount)}</div>
              <div style={{ fontSize: tokens.fontSize.caption - 2, color: t.textDim }}>{tx.date}</div>
            </div>
          </div>
        ))}
      </div>)}
    </div>)}

    {/* CSV Export for Khata */}
    {mode === "khata" && customers.length > 0 && (
      <button onClick={() => {
        const header = "Customer,Phone,Type,Amount,Note,Date\n";
        const rows = customers.flatMap(c => 
          (c.transactions || []).map(tx => `"${(c.name || "").replace(/"/g, '""')}",${c.phone || ""},${tx.type || ""},${tx.amount || 0},"${(tx.note || "").replace(/"/g, '""')}",${tx.date || ""}`)
        ).join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `FinCalci-Khata-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); vib();
      }} style={{ width: "100%", padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${tokens.color.success}12`, border: `1px solid ${tokens.color.success}25`, color: tokens.color.success, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", marginTop: tokens.space.md, fontFamily: tokens.fontFamily.sans }}>
        📥 Export Khata as CSV
      </button>
    )}

    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md, lineHeight: 1.6 }}>Khata Book is for record-keeping only. Verify all transactions independently. Not financial advice.</div>
  </div>);
}
