import { tabRow, tabRowSm, captionDim, captionDimMt, sectionGapSm, sectionGapLg, disclaimer, captionMuted } from '../design/styles';
import { loadCalcInputs } from '../utils/inputMemory';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — EMICalc v2 (template for all calculator migrations)
// Uses: safeEMI, format, constants, tokens, useMemo, HeroNumber, MetricGrid, MiniChart
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo, useCallback } = React;
import { safeEMI, safeNum, safeRange, safePow, safeDivide, safePct, validateCalcInputs } from '../utils/validate';
import { currency, currencyCompact, pct, num, decimal, FMT } from '../utils/format';
import { INPUT_SCHEMAS, FINANCE, TIMING, SLIDER } from '../utils/constants';
import { tokens } from '../design/tokens';
import { tabStyle, metricStyle, labelStyle } from '../design/theme';
import { vib } from '../utils/haptics';
import SliderInput from '../components/SliderInput';
import AmountInput from '../components/AmountInput';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import MiniChart from '../components/MiniChart';

import { useSchemaInputs, useValidatedNum, clampInput } from '../hooks/useValidatedInput';

export default function EMICalc({ color, t, onResult }: CalcProps) {
  // ─── Input state (schema-validated, persisted) ───
  const inputs = useSchemaInputs(INPUT_SCHEMAS.emi, loadCalcInputs("emi", {}));
  const P = inputs.P.value, setP = inputs.P.set;
  const rate = inputs.rate.value, setRate = inputs.rate.set;
  const n = inputs.n.value, setN = inputs.n.set;

  // ─── UI state (not persisted) ───
  const [compareMode, setCompareMode] = useState("calc");
  const [showAmort, setShowAmort] = useState(false);
  const [rate2, setRate2] = useValidatedNum(9.5, { min: 1, max: 30 });
  const [n2, setN2] = useValidatedNum(60, { min: 1, max: 360 });
  const [bankA, setBankA] = useState("Bank A"), [bankB, setBankB] = useState("Bank B");
  const [extraMonthly, setExtraMonthly] = useValidatedNum(5000, { min: 0, max: 10000000 });
  const [lumpSum, setLumpSum] = useValidatedNum(0, { min: 0, max: 100000000 });
  const [lumpMonth, setLumpMonth] = useValidatedNum(12, { min: 1, max: 360 });
  const [procFee, setProcFee] = useValidatedNum(0, { min: 0, max: 10 });
  const [monthlyIncome, setMonthlyIncome] = useValidatedNum(0, { min: 0, max: 10000000 });
  const [showAfford, setShowAfford] = useState(false);

  // ─── Persist inputs (debounced) ───
  useDebouncedPersist("emi", { P, rate, n });

  // ─── Core EMI calculation (memoized — only recalcs when P, rate, or n change) ───
  const { emi, total, interest } = useMemo(() => safeEMI(P, rate, n), [P, rate, n]);
  const procAmt = useMemo(() => safePct(P, procFee), [P, procFee]);
  const totalCost = useMemo(() => total + procAmt, [total, procAmt]);

  // ─── Compare mode (memoized) ───
  const compare = useMemo(() => {
    const r2 = safeEMI(P, rate2, n2);
    return { emi2: r2.emi, total2: r2.total, interest2: r2.interest, saved: Math.abs(total - r2.total) };
  }, [P, rate2, n2, total]);

  // ─── Affordability (memoized) ───
  const afford = useMemo(() => {
    const inc = safeNum(monthlyIncome);
    const r = rate / FINANCE.RATE_TO_MONTHLY;
    const emiPct = inc > 0 ? safeDivide(emi, inc) * 100 : 0;
    const maxLoan = inc > 0 && r > 0
      ? safeDivide(inc * 0.4 * (safePow(1 + r, n, 1) - 1), r * safePow(1 + r, n, 1), 0)
      : 0;
    return { emiPct, maxLoan };
  }, [monthlyIncome, emi, rate, n]);

  // ─── Prepayment calculation (memoized — expensive loop) ───
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

  // ─── Amortization table (memoized — up to 360 iterations) ───
  const amortization = useMemo(() => {
    const r = rate / FINANCE.RATE_TO_MONTHLY;
    if (r <= 0 || n <= 0 || emi <= 0) return [];
    const rows = [];
    let bal = P;
    for (let i = 1; i <= Math.min(n, 360); i++) {
      const intPart = bal * r;
      const prinPart = emi - intPart;
      bal = Math.max(bal - prinPart, 0);
      rows.push({ month: i, emi, principal: prinPart, interest: intPart, balance: bal });
    }
    return rows;
  }, [P, rate, n, emi]);

  // ─── Chart data (memoized — stable reference for React.memo'd MiniChart) ───
  const chartData = useMemo(() => {
    if (amortization.length === 0) return [];
    const step = Math.max(1, Math.floor(amortization.length / 24));
    return amortization.filter((_, i) => i % step === 0 || i === amortization.length - 1)
      .map(a => ({ a: P - a.balance, b: a.balance }));
  }, [amortization, P]);

  const chartLabels = useMemo(() => {
    if (amortization.length === 0) return [];
    const step = Math.max(1, Math.floor(amortization.length / 24));
    return amortization.filter((_, i) => i % step === 0 || i === amortization.length - 1)
      .map(a => a.month % 12 === 0 ? `${a.month / 12}y` : '');
  }, [amortization]);

  const donutData = useMemo(() => [Math.max(P, 0), Math.max(interest, 0)], [P, interest]);

  // ─── Report to parent (debounced) ───
  useEffect(() => {
    if (!onResult) return;
    const timer = setTimeout(() => {
      if (compareMode === "compare") onResult({ "Loan A EMI": currency(emi), "Loan B EMI": currency(compare.emi2), "You Save": currency(compare.saved) });
      else if (compareMode === "prepay") onResult({ "Months Saved": `${pp.monthsSaved} months`, "Interest Saved": currency(pp.saved), "New Tenure": `${pp.months} months` });
      else onResult({ "Monthly EMI": currency(emi), "Total Interest": currency(interest), "Total Amount": currency(total) });
    }, TIMING.DEBOUNCE_CALC);
    return () => clearTimeout(timer);
  }, [P, rate, n, rate2, n2, compareMode, extraMonthly, lumpSum, lumpMonth]);

  // ─── PDF export ───
  const exportPDF = useCallback(() => {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;
    w.document.write(`<html><head><title>FinCalci EMI Report</title><style>body{font-family:${tokens.fontFamily.sans};padding:40px;color:#0F172A}h1{color:${tokens.color.primary}}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f1f5f9;padding:10px;text-align:right;border:1px solid #e2e8f0;font-size:12px}td{padding:8px 10px;text-align:right;border:1px solid #e2e8f0;font-size:12px}.summary{display:flex;gap:20px;margin:20px 0}.summary div{flex:1;padding:16px;border-radius:12px;background:#f8fafc;text-align:center}.summary .val{font-size:24px;font-weight:500;color:${tokens.color.primary}}.footer{margin-top:30px;color:#94a3b8;font-size:12px;text-align:center}</style></head><body>`);
    w.document.write(`<h1>EMI Calculation Report</h1><p>Generated by FinCalci</p>`);
    if (compareMode === "compare") {
      w.document.write(`<h3>Loan Comparison</h3><table><tr><th></th><th>${bankA}</th><th>${bankB}</th></tr>`);
      w.document.write(`<tr><th>Amount</th><td>${currency(P)}</td><td>${currency(P)}</td></tr>`);
      w.document.write(`<tr><th>Rate</th><td>${pct(rate)}</td><td>${pct(rate2)}</td></tr>`);
      w.document.write(`<tr><th>EMI</th><td>${currency(emi)}</td><td>${currency(compare.emi2)}</td></tr>`);
      w.document.write(`<tr><th>Total Interest</th><td>${currency(interest)}</td><td>${currency(compare.interest2)}</td></tr>`);
      w.document.write(`<tr><th>Savings</th><td colspan="2" style="color:${tokens.color.success};font-weight:500">${currency(compare.saved)}</td></tr></table>`);
    } else {
      w.document.write(`<div class="summary"><div><div class="val">${currency(emi)}</div><div>Monthly EMI</div></div><div><div class="val">${currency(P)}</div><div>Loan Amount</div></div><div><div class="val">${pct(rate)}</div><div>Interest Rate</div></div></div>`);
      w.document.write(`<h3>Amortization Schedule</h3><table><tr><th>Month</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>`);
      amortization.forEach(a => { w.document.write(`<tr><td>${a.month}</td><td>${currency(a.principal)}</td><td>${currency(a.interest)}</td><td>${currency(a.balance)}</td></tr>`); });
      w.document.write(`</table>`);
    }
    w.document.write(`<div class="footer">Made with FinCalci &bull; fincalci.vercel.app</div></body></html>`);
    w.document.close(); w.print();
  }, [P, rate, n, emi, interest, total, compare, amortization, compareMode, bankA, bankB]);

  // ─── RENDER ───
  return (<div>
    {/* Mode toggle */}
    <div style={tabRow}>
      <button onClick={() => { setCompareMode("calc"); vib(); }} style={tabStyle(compareMode === "calc", color, t)}>EMI</button>
      <button onClick={() => { setCompareMode("compare"); vib(); }} style={tabStyle(compareMode === "compare", color, t)}>Compare</button>
      <button onClick={() => { setCompareMode("prepay"); vib(); }} style={tabStyle(compareMode === "prepay", color, t)}>Prepay</button>
    </div>

    <AmountInput label="Loan Amount" value={P} onChange={setP} min={SLIDER.emi.P.min} max={SLIDER.emi.P.max} color={color} t={t} />

    {/* Loan presets */}
    <div style={tabRowSm}>
      {FINANCE.LOAN_PRESETS.map(lp => (
        <button key={lp.id} onClick={() => { setRate(lp.rate); setN(lp.tenure); vib(); }}
          style={{ flex: 1, padding: `${tokens.space.xs}px`, borderRadius: tokens.radius.sm, fontSize: tokens.fontSize.caption - 2,
            border: `1px solid ${rate === lp.rate ? `${color}50` : t.border}`, background: rate === lp.rate ? `${color}12` : t.cardAlt,
            color: rate === lp.rate ? color : t.textMuted, cursor: "pointer", fontFamily: tokens.fontFamily.sans }}>{lp.label}</button>
      ))}
    </div>

    {compareMode === "calc" ? (<div>
      <SliderInput label="Interest Rate" value={rate} onChange={setRate} unit="%" min={SLIDER.emi.rate.min} max={SLIDER.emi.rate.max} step={SLIDER.emi.rate.step} color={color} t={t} />
      <SliderInput label="Tenure" value={n} onChange={setN} unit="mo" min={SLIDER.emi.n.min} max={SLIDER.emi.n.max} step={SLIDER.emi.n.step} color={color} t={t} />

      {/* Hero result */}
      <HeroNumber label="Monthly EMI" value={currency(emi)} color={color} />

      {/* Sub-metrics */}
      <MetricGrid t={t} items={[
        { label: "Total Interest", value: currencyCompact(interest), color: tokens.color.secondary },
        { label: "Total Amount", value: currencyCompact(total) },
        { label: "Processing Fee", value: procFee > 0 ? currency(procAmt) : "—" },
        { label: "Total Cost", value: procFee > 0 ? currencyCompact(totalCost) : "—" },
      ]} />

      {/* Amortization chart */}
      {chartData.length > 2 && (
        <div style={sectionGapLg}>
          <div style={labelStyle(t)}>Principal vs balance over time</div>
          <MiniChart type="area" data={chartData} labels={chartLabels} height={120} colors={[tokens.color.primary, tokens.color.secondary]} t={t} />
        </div>
      )}

      {/* Donut chart */}
      <div style={sectionGapLg}>
        <MiniChart type="donut" data={donutData} width={140} height={120} colors={[color, tokens.color.secondary]} t={t} />
        <div style={{ display: "flex", justifyContent: "center", gap: tokens.space.lg, marginTop: tokens.space.sm }}>
          <span style={captionDim(t)}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: color, marginRight: 4 }} />
            Principal {pct(safeDivide(P, total) * 100, 0)}
          </span>
          <span style={captionDim(t)}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: tokens.color.secondary, marginRight: 4 }} />
            Interest {pct(safeDivide(interest, total) * 100, 0)}
          </span>
        </div>
      </div>

      {/* Processing fee */}
      <div style={sectionGapSm}>
        <div style={{ display: "flex", alignItems: "center", gap: tokens.space.sm, fontSize: tokens.fontSize.caption, color: t.textDim }}>
          <span>Processing fee</span>
          <input type="number" value={procFee || ""} placeholder="0" onChange={e => setProcFee(safeRange(parseFloat(e.target.value) || 0, 0, 10, 0))}
            style={{ width: 60, padding: "4px 8px", borderRadius: tokens.radius.sm, border: `1px solid ${t.border}`, background: t.inputBg, color: t.text,
              fontSize: tokens.fontSize.caption, fontFamily: tokens.fontFamily.mono, textAlign: "right" }} />
          <span>%</span>
        </div>
      </div>

      {/* Affordability */}
      <button onClick={() => { setShowAfford(!showAfford); vib(); }}
        style={{ width: "100%", padding: tokens.space.md, borderRadius: tokens.radius.md, background: t.cardAlt, border: `1px solid ${t.border}`,
          color: t.textMuted, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", marginBottom: tokens.space.md, fontFamily: tokens.fontFamily.sans }}>
        {showAfford ? "▼" : "▶"} Can I afford this? (Eligibility check)
      </button>
      {showAfford && (<div style={{ background: t.cardAlt, borderRadius: tokens.radius.md, padding: tokens.space.lg, marginBottom: tokens.space.md }}>
        <AmountInput label="Monthly Income" value={monthlyIncome} onChange={setMonthlyIncome} min={SLIDER.emi.income.min} max={SLIDER.emi.income.max} color={tokens.color.success} t={t} />
        {monthlyIncome > 0 && (<div>
          <div style={{ fontSize: tokens.fontSize.caption, color: afford.emiPct > 40 ? tokens.color.danger : tokens.color.success, fontWeight: tokens.fontWeight.medium }}>
            EMI is {decimal(afford.emiPct)}% of income {afford.emiPct > 40 ? "(risky — banks recommend < 40%)" : "(healthy)"}
          </div>
          {afford.maxLoan > 0 && <div style={captionDimMt(t)}>Max eligible loan: {currencyCompact(afford.maxLoan)}</div>}
        </div>)}
      </div>)}

      {/* Amortization table */}
      <button onClick={() => { setShowAmort(!showAmort); vib(); }}
        style={{ width: "100%", padding: tokens.space.md, borderRadius: tokens.radius.md, background: t.cardAlt, border: `1px solid ${t.border}`,
          color: t.textMuted, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", marginBottom: tokens.space.sm, fontFamily: tokens.fontFamily.sans }}>
        {showAmort ? "▼ Hide" : "▶ Show"} Amortization Schedule ({n} months)
      </button>
      {showAmort && amortization.length > 0 && (
        <div style={{ marginTop: tokens.space.md, maxHeight: 300, overflowY: "auto", borderRadius: tokens.radius.md, border: `1px solid ${t.border}` }}>
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

      <button onClick={exportPDF} style={{ width: "100%", padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${color}15`,
        border: `1px solid ${color}30`, color, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small,
        cursor: "pointer", marginTop: tokens.space.md, fontFamily: tokens.fontFamily.sans }}>
        Download PDF Report
      </button>

    </div>) : compareMode === "compare" ? (<div>
      {/* Compare mode */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.space.sm }}>
        <div style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: tokens.radius.lg, padding: tokens.space.md }}>
          <input type="text" value={bankA} onChange={e => setBankA(e.target.value.slice(0, 20))} maxLength={20}
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: tokens.fontSize.small,
              fontWeight: tokens.fontWeight.medium, color, textAlign: "center", marginBottom: tokens.space.sm, fontFamily: tokens.fontFamily.sans }} />
          <SliderInput label="Rate" value={rate} onChange={setRate} unit="%" min={SLIDER.emi.rate.min} max={SLIDER.emi.rate.max} step={SLIDER.emi.rate.step} color={color} t={t} />
          <SliderInput label="Tenure" value={n} onChange={setN} unit="mo" min={SLIDER.emi.n.min} max={SLIDER.emi.n.max} step={SLIDER.emi.n.step} color={color} t={t} />
        </div>
        <div style={{ background: `${tokens.color.secondary}08`, border: `1px solid ${tokens.color.secondary}20`, borderRadius: tokens.radius.lg, padding: tokens.space.md }}>
          <input type="text" value={bankB} onChange={e => setBankB(e.target.value.slice(0, 20))} maxLength={20}
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: tokens.fontSize.small,
              fontWeight: tokens.fontWeight.medium, color: tokens.color.secondary, textAlign: "center", marginBottom: tokens.space.sm, fontFamily: tokens.fontFamily.sans }} />
          <SliderInput label="Rate" value={rate2} onChange={setRate2} unit="%" min={SLIDER.emi.rate.min} max={SLIDER.emi.rate.max} step={SLIDER.emi.rate.step} color={tokens.color.secondary} t={t} />
          <SliderInput label="Tenure" value={n2} onChange={setN2} unit="mo" min={SLIDER.emi.n.min} max={SLIDER.emi.n.max} step={SLIDER.emi.n.step} color={tokens.color.secondary} t={t} />
        </div>
      </div>

      {/* Comparison results */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.space.sm, marginTop: tokens.space.lg }}>
        <div style={{ ...metricStyle(t), textAlign: "center", borderTop: `3px solid ${color}` }}>
          <div style={labelStyle(t)}>EMI ({bankA})</div>
          <div style={{ fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.medium, color, fontFamily: tokens.fontFamily.mono, marginTop: tokens.space.xs }}>{currency(emi)}</div>
          <div style={captionDimMt(t)}>Interest: {currencyCompact(interest)}</div>
        </div>
        <div style={{ ...metricStyle(t), textAlign: "center", borderTop: `3px solid ${tokens.color.secondary}` }}>
          <div style={labelStyle(t)}>EMI ({bankB})</div>
          <div style={{ fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.medium, color: tokens.color.secondary, fontFamily: tokens.fontFamily.mono, marginTop: tokens.space.xs }}>{currency(compare.emi2)}</div>
          <div style={captionDimMt(t)}>Interest: {currencyCompact(compare.interest2)}</div>
        </div>
      </div>

      {/* Savings */}
      <div style={{ background: total <= compare.total2 ? `${tokens.color.success}10` : `${tokens.color.danger}10`,
        border: `1px solid ${total <= compare.total2 ? tokens.color.success : tokens.color.danger}25`,
        borderRadius: tokens.radius.lg, padding: tokens.space.lg, textAlign: "center", marginTop: tokens.space.md }}>
        <div style={captionMuted(t)}>{total <= compare.total2 ? bankA : bankB} saves you</div>
        <HeroNumber value={currency(compare.saved)} color={total <= compare.total2 ? tokens.color.success : tokens.color.danger} style={{ padding: 0 }} />
        <div style={captionDim(t)}>EMI difference: {currency(Math.abs(emi - compare.emi2))}/month</div>
      </div>

      <button onClick={exportPDF} style={{ width: "100%", padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${color}15`,
        border: `1px solid ${color}30`, color, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small,
        cursor: "pointer", marginTop: tokens.space.md, fontFamily: tokens.fontFamily.sans }}>
        Download Comparison PDF
      </button>

    </div>) : compareMode === "prepay" ? (<div>
      {/* Prepayment mode */}
      <SliderInput label="Interest Rate" value={rate} onChange={setRate} unit="%" min={SLIDER.emi.rate.min} max={SLIDER.emi.rate.max} step={SLIDER.emi.rate.step} color={color} t={t} />
      <SliderInput label="Original Tenure" value={n} onChange={setN} unit="mo" min={SLIDER.emi.n.min} max={SLIDER.emi.n.max} step={12} color={color} t={t} />
      <div style={{ fontSize: tokens.fontSize.small, color: t.textDim, fontWeight: tokens.fontWeight.medium, marginTop: tokens.space.xs, marginBottom: tokens.space.md }}>
        Regular EMI: {currency(emi)}/month
      </div>
      <AmountInput label="Extra Monthly Payment" value={extraMonthly} onChange={setExtraMonthly} min={0} max={Math.max(emi * 2, 10000)} color={tokens.color.success} t={t} />
      <AmountInput label="One-time Lump Sum" value={lumpSum} onChange={setLumpSum} min={0} max={P} color={tokens.color.secondary} t={t} />
      {lumpSum > 0 && <SliderInput label="Lump Sum at Month" value={lumpMonth} onChange={setLumpMonth} unit="mo" min={1} max={n} step={1} color={tokens.color.secondary} t={t} />}

      {/* Prepay comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.space.sm, marginTop: tokens.space.lg }}>
        <div style={{ ...metricStyle(t), textAlign: "center", borderTop: `3px solid ${t.textDim}` }}>
          <div style={labelStyle(t)}>Without prepayment</div>
          <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, fontFamily: tokens.fontFamily.mono, color: t.text, marginTop: tokens.space.xs }}>{n} months</div>
          <div style={captionDimMt(t)}>Interest: {currencyCompact(interest)}</div>
        </div>
        <div style={{ ...metricStyle(t), textAlign: "center", borderTop: `3px solid ${tokens.color.success}` }}>
          <div style={labelStyle(t)}>With prepayment</div>
          <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, fontFamily: tokens.fontFamily.mono, color: tokens.color.success, marginTop: tokens.space.xs }}>{pp.months} months</div>
          <div style={captionDimMt(t)}>Interest: {currencyCompact(pp.interest)}</div>
        </div>
      </div>

      {pp.monthsSaved > 0 && (
        <div style={{ background: `${tokens.color.success}10`, border: `1px solid ${tokens.color.success}25`,
          borderRadius: tokens.radius.lg, padding: tokens.space.lg, textAlign: "center", marginTop: tokens.space.md }}>
          <div style={captionMuted(t)}>You finish</div>
          <HeroNumber value={`${pp.monthsSaved} months early`} color={tokens.color.success} style={{ padding: `${tokens.space.sm}px 0` }} />
          <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: tokens.color.primary, fontFamily: tokens.fontFamily.mono }}>
            Save {currency(pp.saved)} in interest
          </div>
          {pp.monthsSaved >= 12 && (
            <div style={captionDimMt(t)}>
              That's {Math.floor(pp.monthsSaved / 12)} year{Math.floor(pp.monthsSaved / 12) > 1 ? "s" : ""}{pp.monthsSaved % 12 > 0 ? ` ${pp.monthsSaved % 12} month${pp.monthsSaved % 12 > 1 ? "s" : ""}` : ""} earlier!
            </div>
          )}
        </div>
      )}
    </div>) : null}

    <div style={disclaimer(t)}>
      EMI calculations are estimates. Actual EMI may vary based on bank policies, processing fees, and prepayment terms. This is not financial advice.
    </div>
  </div>);
}
