import { disclaimer } from '../design/styles';
import { loadCalcInputs } from '../utils/inputMemory';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types
// FinCalci — EMICalc (redesigned: clean 3-tab layout)
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo, useCallback } = React;
import { safeEMI, safeNum, safeRange, safePow, safeDivide, safePct } from '../utils/validate';
import { currency, currencyCompact, pct, decimal } from '../utils/format';
import { INPUT_SCHEMAS, FINANCE, TIMING, SLIDER } from '../utils/constants';
import { tokens } from '../design/tokens';
import { tabStyle } from '../design/theme';
import { vib } from '../utils/haptics';
import AmountInput from '../components/AmountInput';
import HeroNumber from '../components/HeroNumber';
import MiniChart from '../components/MiniChart';
import { useSchemaInputs, useValidatedNum } from '../hooks/useValidatedInput';

// ─── Shared styles ───
const divider = (t) => ({ height: 1, background: t.border, margin: `${tokens.space.lg}px 0`, opacity: 0.5 });
const sectionLabel = (t) => ({ fontSize: tokens.fontSize.caption, color: t.textDim, fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.sm, letterSpacing: 0.3 });
const collapseBtn = (t) => ({
  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: `${tokens.space.md}px 0`, background: "none", border: "none", cursor: "pointer",
  borderTop: `1px solid ${t.border}40`,
});
const collapseLbl = (t) => ({ fontSize: tokens.fontSize.small, color: t.textMuted, fontWeight: tokens.fontWeight.medium, fontFamily: tokens.fontFamily.sans });
const collapseArrow = (t, open) => ({ fontSize: 12, color: t.textDim, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" });
const inlineRow = (t) => ({ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: tokens.fontSize.caption });
const rowLabel = (t) => ({ color: t.textMuted });
const rowVal = (t) => ({ color: t.text, fontFamily: tokens.fontFamily.mono, fontWeight: tokens.fontWeight.medium });

// ─── Tenure display helper ───
const tenureLabel = (months) => {
  const y = Math.floor(months / 12), m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr${y > 1 ? "s" : ""}`;
  return `${y}y ${m}m`;
};

// ─── Compact slider for rate/tenure ───
const CompactSlider = ({ label, value, onChange, unit, min, max, step, color, t, displayFn }) => {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(String(value));
  const pctFill = Math.min(((value - min) / (max - min)) * 100, 100);

  const handleDone = () => {
    const v = parseFloat(editVal);
    if (!isNaN(v) && v >= min && v <= max) onChange(v);
    setEditing(false);
  };

  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, marginBottom: 2 }}>{label}</div>
      {editing ? (
        <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
          onBlur={handleDone} onKeyDown={e => e.key === "Enter" && handleDone()} autoFocus
          aria-label={label}
          style={{
            width: "100%", fontSize: 18, fontWeight: tokens.fontWeight.medium, color,
            fontFamily: tokens.fontFamily.mono, background: "transparent", border: "none",
            borderBottom: `2px solid ${color}`, outline: "none", padding: 0,
          }} />
      ) : (
        <div onClick={() => { setEditVal(String(value)); setEditing(true); }}
          style={{ cursor: "pointer", fontSize: 18, fontWeight: tokens.fontWeight.medium, color, fontFamily: tokens.fontFamily.mono }}>
          {displayFn ? displayFn(value) : `${value}${unit}`}
        </div>
      )}
      <div style={{ height: 3, background: t.border, borderRadius: 2, marginTop: 6, position: "relative" }}>
        <div style={{ height: "100%", width: `${pctFill}%`, background: color, borderRadius: 2 }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))} aria-label={label}
        style={{ width: "100%", opacity: 0, height: 20, margin: "-14px 0 0 0", cursor: "pointer", position: "relative", zIndex: 1 }} />
    </div>
  );
};

export default function EMICalc({ color, t, onResult }: CalcProps) {
  const inputs = useSchemaInputs(INPUT_SCHEMAS.emi, loadCalcInputs("emi", {}));
  const P = inputs.P.value, setP = inputs.P.set;
  const rate = inputs.rate.value, setRate = inputs.rate.set;
  const n = inputs.n.value, setN = inputs.n.set;

  const [mode, setMode] = useState("calc");
  const [showAmort, setShowAmort] = useState(false);
  const [showAfford, setShowAfford] = useState(false);

  // Compare state
  const [rate2, setRate2] = useValidatedNum(9.5, { min: 1, max: 30 });
  const [n2, setN2] = useValidatedNum(60, { min: 1, max: 360 });
  const [bankA, setBankA] = useState("Bank A");
  const [bankB, setBankB] = useState("Bank B");

  // Prepay state
  const [extraMonthly, setExtraMonthly] = useValidatedNum(5000, { min: 0, max: 10000000 });
  const [lumpSum, setLumpSum] = useValidatedNum(0, { min: 0, max: 500000000 });
  const [lumpMonth, setLumpMonth] = useValidatedNum(12, { min: 1, max: 360 });

  // Processing fee & affordability
  const [procFee, setProcFee] = useValidatedNum(0, { min: 0, max: 10 });
  const [monthlyIncome, setMonthlyIncome] = useValidatedNum(0, { min: 0, max: 5000000 });

  useDebouncedPersist("emi", { P, rate, n });

  // ─── Core calculations (all memoized) ───
  const { emi, total, interest } = useMemo(() => safeEMI(P, rate, n), [P, rate, n]);
  const procAmt = useMemo(() => safePct(P, procFee), [P, procFee]);
  const procGst = useMemo(() => safePct(procAmt, 18), [procAmt]);

  const compare = useMemo(() => {
    const r2 = safeEMI(P, rate2, n2);
    return { emi2: r2.emi, total2: r2.total, interest2: r2.interest, saved: Math.abs(total - r2.total) };
  }, [P, rate2, n2, total]);

  const afford = useMemo(() => {
    const inc = safeNum(monthlyIncome);
    const r = rate / FINANCE.RATE_TO_MONTHLY;
    const emiPct = inc > 0 ? safeDivide(emi, inc) * 100 : 0;
    const maxLoan = inc > 0 && r > 0
      ? safeDivide(inc * 0.4 * (safePow(1 + r, n, 1) - 1), r * safePow(1 + r, n, 1), 0) : 0;
    return { emiPct, maxLoan };
  }, [monthlyIncome, emi, rate, n]);

  const pp = useMemo(() => {
    const r = rate / FINANCE.RATE_TO_MONTHLY;
    if (r <= 0 || n <= 0 || emi <= 0) return { months: n, interest, totalPaid: total, saved: 0, monthsSaved: 0 };
    let bal = P, totalInt = 0, mo = 0;
    while (bal > 0.5 && mo < Math.min(n * 2, 600)) {
      mo++;
      const intPart = bal * r;
      totalInt += intPart;
      let prinPart = emi - intPart + extraMonthly;
      if (lumpSum > 0 && mo === lumpMonth) prinPart += lumpSum;
      bal = Math.max(bal - prinPart, 0);
    }
    return { months: mo, interest: totalInt, totalPaid: totalInt + P, saved: interest - totalInt, monthsSaved: n - mo };
  }, [P, rate, n, emi, interest, total, extraMonthly, lumpSum, lumpMonth]);

  const amortization = useMemo(() => {
    const r = rate / FINANCE.RATE_TO_MONTHLY;
    if (r <= 0 || n <= 0 || emi <= 0) return [];
    const rows = []; let bal = P;
    for (let i = 1; i <= Math.min(n, 360); i++) {
      const intPart = bal * r, prinPart = emi - intPart;
      bal = Math.max(bal - prinPart, 0);
      rows.push({ month: i, emi, principal: prinPart, interest: intPart, balance: bal });
    }
    return rows;
  }, [P, rate, n, emi]);

  const donutData = useMemo(() => [Math.max(P, 0), Math.max(interest, 0)], [P, interest]);

  // ─── Report to parent ───
  useEffect(() => {
    if (!onResult) return;
    const timer = setTimeout(() => {
      if (mode === "compare") onResult({ [`${bankA} EMI`]: currency(emi), [`${bankB} EMI`]: currency(compare.emi2), "You Save": currency(compare.saved) });
      else if (mode === "prepay") onResult({ "Months Saved": `${pp.monthsSaved}`, "Interest Saved": currency(pp.saved) });
      else onResult({ "Monthly EMI": currency(emi), "Total Interest": currency(interest), "Total Amount": currency(total) });
    }, TIMING.DEBOUNCE_CALC);
    return () => clearTimeout(timer);
  }, [P, rate, n, rate2, n2, mode, extraMonthly, lumpSum, lumpMonth]);

  // ─── PDF export ───
  const exportPDF = useCallback(() => {
    let bodyHtml = '';
    if (mode === "compare") {
      bodyHtml = `<h3>Loan Comparison</h3><table><tr><th></th><th>${bankA}</th><th>${bankB}</th></tr>`;
      bodyHtml += `<tr><th>Amount</th><td>${currency(P)}</td><td>${currency(P)}</td></tr>`;
      bodyHtml += `<tr><th>Rate</th><td>${pct(rate)}</td><td>${pct(rate2)}</td></tr>`;
      bodyHtml += `<tr><th>EMI</th><td>${currency(emi)}</td><td>${currency(compare.emi2)}</td></tr>`;
      bodyHtml += `<tr><th>Total Interest</th><td>${currency(interest)}</td><td>${currency(compare.interest2)}</td></tr>`;
      bodyHtml += `<tr><th>Savings</th><td colspan="2" style="color:${tokens.color.success};font-weight:500">${currency(compare.saved)}</td></tr></table>`;
    } else {
      bodyHtml = `<div class="summary"><div><div class="val">${currency(emi)}</div><div>Monthly EMI</div></div><div><div class="val">${currency(P)}</div><div>Loan Amount</div></div><div><div class="val">${pct(rate)}</div><div>Interest Rate</div></div></div>`;
      bodyHtml += `<h3>Amortization Schedule</h3><table><tr><th>Month</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>`;
      amortization.forEach(a => { bodyHtml += `<tr><td>${a.month}</td><td>${currency(a.principal)}</td><td>${currency(a.interest)}</td><td>${currency(a.balance)}</td></tr>`; });
      bodyHtml += `</table>`;
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>FinCalci EMI Report</title><style>body{font-family:${tokens.fontFamily.sans};padding:40px;color:#0F172A}h1{color:${tokens.color.primary}}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f1f5f9;padding:10px;text-align:right;border:1px solid #e2e8f0;font-size:12px}td{padding:8px 10px;text-align:right;border:1px solid #e2e8f0;font-size:12px}.summary{display:flex;gap:20px;margin:20px 0}.summary div{flex:1;padding:16px;border-radius:12px;background:#f8fafc;text-align:center}.summary .val{font-size:24px;font-weight:500;color:${tokens.color.primary}}.footer{margin-top:30px;color:#94a3b8;font-size:12px;text-align:center}@media print{body{padding:20px}}</style></head><body>`;
    const full = html + `<h1>EMI Calculation Report</h1><p>Generated by FinCalci</p>` + bodyHtml + `<div class="footer">Made with FinCalci &bull; fin-calci.vercel.app</div></body></html>`;
    const blob = new Blob([full], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `FinCalci-EMI-Report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }, [P, rate, n, emi, interest, total, compare, amortization, mode, bankA, bankB]);

  // ─── Bank card for compare tab ───
  const BankCard = ({ name, setName, rateVal, setRateVal, tenure, setTenure, emiVal, interestVal, cardColor }) => (
    <div style={{
      background: t.card, borderRadius: tokens.radius.lg, border: `1px solid ${cardColor}25`,
      padding: `${tokens.space.md}px ${tokens.space.lg}px`, marginBottom: tokens.space.sm,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: tokens.space.md }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: cardColor, flexShrink: 0 }} />
        <input type="text" value={name} onChange={e => setName(e.target.value.slice(0, 20))} maxLength={20}
          aria-label="Bank name"
          style={{
            flex: 1, background: "transparent", border: "none", borderBottom: `1px solid ${t.border}`,
            outline: "none", fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium,
            color: cardColor, padding: "2px 0", fontFamily: tokens.fontFamily.sans,
          }} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <CompactSlider label="Rate" value={rateVal} onChange={setRateVal} unit="%" min={1} max={30} step={0.1} color={cardColor} t={t} />
        <CompactSlider label="Tenure" value={tenure} onChange={setTenure} unit="" min={1} max={360} step={1} color={cardColor} t={t}
          displayFn={tenureLabel} />
        <div style={{ flex: 0.8, textAlign: "right" }}>
          <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, marginBottom: 2 }}>EMI</div>
          <div style={{ fontSize: 16, fontWeight: tokens.fontWeight.medium, color: cardColor, fontFamily: tokens.fontFamily.mono }}>
            {currencyCompact(emiVal)}
          </div>
          <div style={{ fontSize: tokens.fontSize.caption - 2, color: t.textDim, marginTop: 4 }}>
            Int: {currencyCompact(interestVal)}
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════
  // ─── RENDER ───
  // ═══════════════════════════════
  return (<div>
    {/* Mode tabs */}
    <div style={{ display: "flex", gap: 4, marginBottom: tokens.space.lg }}>
      {["calc", "compare", "prepay"].map(m => (
        <button key={m} onClick={() => setMode(m)}
          style={{ ...tabStyle(mode === m, color, t), flex: 1 }}>
          {m === "calc" ? "EMI" : m === "compare" ? "Compare" : "Prepay"}
        </button>
      ))}
    </div>

    {/* ═══════════════════════════════ */}
    {/* EMI TAB */}
    {/* ═══════════════════════════════ */}
    {mode === "calc" && (<div>
      <AmountInput label="Loan amount" value={P} onChange={setP}
        min={SLIDER.emi.P.min} max={SLIDER.emi.P.max} color={color} t={t} />

      <div style={{ display: "flex", gap: 10, marginBottom: tokens.space.sm }}>
        <CompactSlider label="Interest rate" value={rate} onChange={setRate} unit="%"
          min={SLIDER.emi.rate.min} max={SLIDER.emi.rate.max} step={SLIDER.emi.rate.step}
          color={color} t={t} />
        <CompactSlider label="Tenure" value={n} onChange={setN} unit=""
          min={SLIDER.emi.n.min} max={SLIDER.emi.n.max} step={12}
          color={color} t={t} displayFn={tenureLabel} />
      </div>

      {/* Rate hint */}
      <div style={{ fontSize: tokens.fontSize.caption - 2, color: t.textDim, marginBottom: tokens.space.md }}>
        Home 8-9% · Car 9-11% · Personal 11-14% · Education 8-10%
      </div>

      {/* Processing fee — compact inline */}
      <div style={{ display: "flex", alignItems: "center", gap: tokens.space.sm, marginBottom: tokens.space.md }}>
        <span style={{ fontSize: tokens.fontSize.caption, color: t.textDim }}>Processing fee</span>
        <input type="number" value={procFee || ""} placeholder="0"
          onChange={e => setProcFee(safeRange(parseFloat(e.target.value) || 0, 0, 10, 0))}
          aria-label="Processing fee percentage"
          style={{
            width: 50, padding: "4px 6px", borderRadius: tokens.radius.sm,
            border: `1px solid ${t.border}`, background: t.inputBg, color: t.text,
            fontSize: tokens.fontSize.caption, fontFamily: tokens.fontFamily.mono, textAlign: "right",
          }} />
        <span style={{ fontSize: tokens.fontSize.caption, color: t.textDim }}>%</span>
        {procFee > 0 && (
          <span style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim }}>
            = {currency(procAmt)} + {currency(procGst)} GST
          </span>
        )}
      </div>

      <div style={divider(t)} />

      {/* Hero result */}
      <HeroNumber label="Monthly EMI" value={currency(emi)} color={color} />

      {/* Donut with built-in legend */}
      <MiniChart type="donut" data={donutData} width={300} height={120}
        colors={[color, tokens.color.secondary]} t={t}
        labels={[`Principal ${currencyCompact(P)}`, `Interest ${currencyCompact(interest)}`]} />

      {/* Collapsibles */}
      <button onClick={() => setShowAfford(!showAfford)} style={collapseBtn(t)}>
        <span style={collapseLbl(t)}>Can I afford this?</span>
        <span style={collapseArrow(t, showAfford)}>▼</span>
      </button>
      {showAfford && (
        <div style={{ background: t.card, borderRadius: tokens.radius.lg, border: `1px solid ${t.border}`,
          padding: `${tokens.space.md}px ${tokens.space.lg}px`, marginBottom: tokens.space.md }}>
          <AmountInput label="Monthly income" value={monthlyIncome} onChange={setMonthlyIncome}
            min={0} max={5000000} color={tokens.color.success} t={t} />
          {monthlyIncome > 0 && (<div>
            <div style={{
              fontSize: tokens.fontSize.caption, fontWeight: tokens.fontWeight.medium, marginTop: tokens.space.sm,
              color: afford.emiPct > 40 ? tokens.color.danger : tokens.color.success,
            }}>
              EMI is {decimal(afford.emiPct)}% of income {afford.emiPct > 40 ? "(risky — banks recommend < 40%)" : "(healthy)"}
            </div>
            {afford.maxLoan > 0 && (
              <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, marginTop: 4 }}>
                Max eligible loan at 40% ratio: {currencyCompact(afford.maxLoan)}
              </div>
            )}
          </div>)}
        </div>
      )}

      <button onClick={() => setShowAmort(!showAmort)} style={collapseBtn(t)}>
        <span style={collapseLbl(t)}>Amortization schedule</span>
        <span style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim }}>{tenureLabel(n)} ▼</span>
      </button>
      {showAmort && amortization.length > 0 && (
        <div style={{ maxHeight: 300, overflowY: "auto", borderRadius: tokens.radius.md, border: `1px solid ${t.border}`, marginBottom: tokens.space.md }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: tokens.fontSize.caption }}>
            <thead><tr style={{ background: t.cardAlt, position: "sticky", top: 0 }}>
              <th style={{ padding: "8px 6px", textAlign: "center", color: t.textMuted, fontWeight: tokens.fontWeight.medium }}>Mo</th>
              <th style={{ padding: "8px 6px", textAlign: "right", color: t.textMuted, fontWeight: tokens.fontWeight.medium }}>Principal</th>
              <th style={{ padding: "8px 6px", textAlign: "right", color: t.textMuted, fontWeight: tokens.fontWeight.medium }}>Interest</th>
              <th style={{ padding: "8px 6px", textAlign: "right", color: t.textMuted, fontWeight: tokens.fontWeight.medium }}>Balance</th>
            </tr></thead>
            <tbody>{amortization.map(a => (
              <tr key={a.month} style={{ borderBottom: `1px solid ${t.border}` }}>
                <td style={{ padding: "6px", textAlign: "center", color: t.text, fontFamily: tokens.fontFamily.mono }}>{a.month}</td>
                <td style={{ padding: "6px", textAlign: "right", color: tokens.color.primary, fontFamily: tokens.fontFamily.mono }}>{currency(a.principal)}</td>
                <td style={{ padding: "6px", textAlign: "right", color: tokens.color.secondary, fontFamily: tokens.fontFamily.mono }}>{currency(a.interest)}</td>
                <td style={{ padding: "6px", textAlign: "right", color: t.text, fontFamily: tokens.fontFamily.mono }}>{currency(a.balance)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <button onClick={exportPDF} style={collapseBtn(t)}>
        <span style={collapseLbl(t)}>Download PDF report</span>
        <span style={{ fontSize: 14, color: t.textDim }}>↓</span>
      </button>
    </div>)}

    {/* ═══════════════════════════════ */}
    {/* COMPARE TAB */}
    {/* ═══════════════════════════════ */}
    {mode === "compare" && (<div>
      <AmountInput label="Loan amount (same for both)" value={P} onChange={setP}
        min={SLIDER.emi.P.min} max={SLIDER.emi.P.max} color={color} t={t} />

      <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, marginBottom: tokens.space.md }}>
        Adjust rate and tenure per bank to compare
      </div>

      <BankCard name={bankA} setName={setBankA} rateVal={rate} setRateVal={setRate}
        tenure={n} setTenure={setN} emiVal={emi} interestVal={interest} cardColor={color} />

      <BankCard name={bankB} setName={setBankB} rateVal={rate2} setRateVal={setRate2}
        tenure={n2} setTenure={setN2} emiVal={compare.emi2} interestVal={compare.interest2}
        cardColor={tokens.color.secondary} />

      <div style={divider(t)} />

      {/* Savings hero */}
      <div style={{
        background: `${total <= compare.total2 ? tokens.color.success : tokens.color.danger}10`,
        border: `1px solid ${total <= compare.total2 ? tokens.color.success : tokens.color.danger}25`,
        borderRadius: tokens.radius.lg, padding: `${tokens.space.lg}px`, textAlign: "center",
      }}>
        <div style={{ fontSize: tokens.fontSize.caption, color: t.textMuted }}>
          {total <= compare.total2 ? bankA : bankB} saves you
        </div>
        <HeroNumber value={currency(compare.saved)}
          color={total <= compare.total2 ? tokens.color.success : tokens.color.danger}
          style={{ padding: `${tokens.space.xs}px 0` }} />
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <span style={{ fontSize: tokens.fontSize.caption, color: t.textDim }}>
            EMI diff: {currency(Math.abs(emi - compare.emi2))}/mo
          </span>
          <span style={{ fontSize: tokens.fontSize.caption, color: t.textDim }}>
            Interest diff: {currencyCompact(Math.abs(interest - compare.interest2))}
          </span>
        </div>
      </div>

      {/* Total breakdown */}
      <div style={{ display: "flex", gap: 6, marginTop: tokens.space.md }}>
        <div style={{
          flex: 1, background: t.card, borderRadius: tokens.radius.md, border: `1px solid ${color}20`,
          padding: tokens.space.md, textAlign: "center", fontSize: tokens.fontSize.caption,
        }}>
          <div style={{ color: t.textDim }}>Total repayment</div>
          <div style={{ color, fontFamily: tokens.fontFamily.mono, fontWeight: tokens.fontWeight.medium, marginTop: 2 }}>
            {currencyCompact(total)}
          </div>
          <div style={{ color: t.textDim, fontSize: tokens.fontSize.caption - 2, marginTop: 2 }}>{bankA}</div>
        </div>
        <div style={{
          flex: 1, background: t.card, borderRadius: tokens.radius.md, border: `1px solid ${tokens.color.secondary}20`,
          padding: tokens.space.md, textAlign: "center", fontSize: tokens.fontSize.caption,
        }}>
          <div style={{ color: t.textDim }}>Total repayment</div>
          <div style={{ color: tokens.color.secondary, fontFamily: tokens.fontFamily.mono, fontWeight: tokens.fontWeight.medium, marginTop: 2 }}>
            {currencyCompact(compare.total2)}
          </div>
          <div style={{ color: t.textDim, fontSize: tokens.fontSize.caption - 2, marginTop: 2 }}>{bankB}</div>
        </div>
      </div>

      <button onClick={exportPDF}
        style={{ ...collapseBtn(t), marginTop: tokens.space.md, borderTop: `1px solid ${t.border}40` }}>
        <span style={collapseLbl(t)}>Download comparison PDF</span>
        <span style={{ fontSize: 14, color: t.textDim }}>↓</span>
      </button>
    </div>)}

    {/* ═══════════════════════════════ */}
    {/* PREPAY TAB */}
    {/* ═══════════════════════════════ */}
    {mode === "prepay" && (<div>
      {/* Current loan summary */}
      <div style={{
        background: t.card, borderRadius: tokens.radius.lg, border: `1px solid ${t.border}`,
        padding: `${tokens.space.md}px ${tokens.space.lg}px`, marginBottom: tokens.space.lg,
      }}>
        <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.sm }}>Your loan</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim }}>Amount</div>
            <div style={{ fontSize: tokens.fontSize.small, color: t.text, fontFamily: tokens.fontFamily.mono, fontWeight: tokens.fontWeight.medium }}>{currencyCompact(P)}</div>
          </div>
          <div>
            <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim }}>Rate</div>
            <div style={{ fontSize: tokens.fontSize.small, color: t.text, fontFamily: tokens.fontFamily.mono, fontWeight: tokens.fontWeight.medium }}>{pct(rate)}</div>
          </div>
          <div>
            <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim }}>Tenure</div>
            <div style={{ fontSize: tokens.fontSize.small, color: t.text, fontFamily: tokens.fontFamily.mono, fontWeight: tokens.fontWeight.medium }}>{tenureLabel(n)}</div>
          </div>
          <div>
            <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim }}>EMI</div>
            <div style={{ fontSize: tokens.fontSize.small, color, fontFamily: tokens.fontFamily.mono, fontWeight: tokens.fontWeight.medium }}>{currencyCompact(emi)}</div>
          </div>
        </div>
        <div style={{ fontSize: tokens.fontSize.caption - 2, color: t.textDim, marginTop: tokens.space.sm }}>
          Set these in the EMI tab, then come here to see prepayment impact
        </div>
      </div>

      <AmountInput label="Extra monthly payment" value={extraMonthly} onChange={setExtraMonthly}
        min={0} max={Math.max(emi * 3, 100000)} color={tokens.color.success} t={t} />

      <AmountInput label="One-time lump sum" value={lumpSum} onChange={setLumpSum}
        min={0} max={P} color={tokens.color.secondary} t={t} />

      {lumpSum > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: tokens.space.sm, marginBottom: tokens.space.md }}>
          <span style={{ fontSize: tokens.fontSize.caption, color: t.textDim }}>Lump sum at month</span>
          <input type="number" value={lumpMonth}
            onChange={e => setLumpMonth(safeRange(parseInt(e.target.value) || 1, 1, n, 12))}
            aria-label="Lump sum month"
            style={{
              width: 50, padding: "4px 6px", borderRadius: tokens.radius.sm,
              border: `1px solid ${t.border}`, background: t.inputBg, color: t.text,
              fontSize: tokens.fontSize.caption, fontFamily: tokens.fontFamily.mono, textAlign: "right",
            }} />
        </div>
      )}

      <div style={divider(t)} />

      {/* Savings result */}
      {pp.monthsSaved > 0 ? (
        <div style={{
          background: `${tokens.color.success}10`, border: `1px solid ${tokens.color.success}25`,
          borderRadius: tokens.radius.lg, padding: `${tokens.space.lg}px`, textAlign: "center",
          marginBottom: tokens.space.md,
        }}>
          <div style={{ fontSize: tokens.fontSize.caption, color: t.textMuted }}>You finish</div>
          <div style={{
            fontSize: 28, fontWeight: tokens.fontWeight.medium, color: tokens.color.success,
            fontFamily: tokens.fontFamily.mono, margin: `${tokens.space.xs}px 0`,
          }}>
            {pp.monthsSaved >= 12
              ? `${Math.floor(pp.monthsSaved / 12)}yr ${pp.monthsSaved % 12}mo early`
              : `${pp.monthsSaved} months early`}
          </div>
          <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color, fontFamily: tokens.fontFamily.mono }}>
            Save {currency(pp.saved)} in interest
          </div>
        </div>
      ) : (
        <div style={{
          background: t.card, borderRadius: tokens.radius.lg, border: `1px solid ${t.border}`,
          padding: `${tokens.space.lg}px`, textAlign: "center", marginBottom: tokens.space.md,
        }}>
          <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim }}>
            Add extra payments above to see how much you can save
          </div>
        </div>
      )}

      {/* Before vs After breakdown */}
      <div style={{
        background: t.card, borderRadius: tokens.radius.lg, border: `1px solid ${t.border}`,
        padding: `${tokens.space.md}px ${tokens.space.lg}px`,
      }}>
        <div style={inlineRow(t)}>
          <span style={rowLabel(t)} />
          <span style={{ ...rowLabel(t), fontWeight: tokens.fontWeight.medium }}>Original</span>
          <span style={{ ...rowLabel(t), fontWeight: tokens.fontWeight.medium, color: tokens.color.success }}>With prepay</span>
        </div>
        <div style={inlineRow(t)}>
          <span style={rowLabel(t)}>Tenure</span>
          <span style={rowVal(t)}>{tenureLabel(n)}</span>
          <span style={{ ...rowVal(t), color: tokens.color.success }}>{tenureLabel(pp.months)}</span>
        </div>
        <div style={inlineRow(t)}>
          <span style={rowLabel(t)}>Interest</span>
          <span style={rowVal(t)}>{currencyCompact(interest)}</span>
          <span style={{ ...rowVal(t), color: tokens.color.success }}>{currencyCompact(pp.interest)}</span>
        </div>
        <div style={inlineRow(t)}>
          <span style={rowLabel(t)}>Total paid</span>
          <span style={rowVal(t)}>{currencyCompact(total)}</span>
          <span style={{ ...rowVal(t), color: tokens.color.success }}>{currencyCompact(pp.totalPaid)}</span>
        </div>
      </div>
    </div>)}

    {/* Affiliate CTA */}
    <div onClick={() => vib(5)}
      style={{ display: "block", width: "100%", padding: `${tokens.space.md}px ${tokens.space.lg}px`,
        borderRadius: tokens.radius.lg, background: `${color}08`, border: `1px solid ${color}18`,
        marginTop: tokens.space.lg, textAlign: "center" }}>
      <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color }}>Compare bank loan rates →</div>
      <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, marginTop: 2 }}>Coming soon — compare rates from top banks</div>
    </div>

    <div style={disclaimer(t)}>
      EMI calculations are estimates. Actual EMI may vary based on bank policies, processing fees, and prepayment terms. This is not financial advice.
    </div>
  </div>);
}
