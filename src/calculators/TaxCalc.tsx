import { tabRow, captionDim, captionDimMt, disclaimer, captionMuted } from '../design/styles';
import { loadCalcInputs } from '../utils/inputMemory';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — TaxCalc
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeTax, safeNum, validateCalcInputs } from '../utils/validate';
import { currency, currencyCompact, pct, FMT } from '../utils/format';
import { INPUT_SCHEMAS, FINANCE, TIMING, SLIDER } from '../utils/constants';
// SLIDER imported via constants
import { tokens } from '../design/tokens';
import { tabStyle, labelStyle, metricStyle } from '../design/theme';
import { vib } from '../utils/haptics';
import SliderInput from '../components/SliderInput';
import AmountInput from '../components/AmountInput';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import MiniChart from '../components/MiniChart';

export default function TaxCalc({ color, t, onResult }: CalcProps) {
  const _s = validateCalcInputs(loadCalcInputs("tax", {}), INPUT_SCHEMAS.tax);
  const [income, setIncome] = useState(_s.income);
  const [taxTab, setTaxTab] = useState("basic");
  // Deduction fields
  const [sec80c, setSec80c] = useState(150000);
  const [sec80d, setSec80d] = useState(25000);
  const [nps, setNps] = useState(0);
  const [otherDed, setOtherDed] = useState(0);
  const [homeLoan, setHomeLoan] = useState(0);
  // HRA fields
  const [basicSalary, setBasicSalary] = useState(income * 0.4);
  const [hraReceived, setHraReceived] = useState(income * 0.2);
  const [rentPaid, setRentPaid] = useState(15000 * 12);
  const [isMetro, setIsMetro] = useState(true);
  const [age, setAge] = useState(30);

  useDebouncedPersist("tax", { income });

  // HRA exemption
  const hra = useMemo(() => {
    const a = safeNum(hraReceived);
    const b = safeNum(basicSalary) * (isMetro ? FINANCE.HRA_METRO_PCT : FINANCE.HRA_NON_METRO_PCT);
    const c = Math.max(safeNum(rentPaid) - safeNum(basicSalary) * 0.1, 0);
    return Math.min(a, b, c);
  }, [hraReceived, basicSalary, rentPaid, isMetro]);

  // Total deductions (old regime)
  const totalDed = useMemo(() =>
    FINANCE.STANDARD_DEDUCTION_OLD + Math.min(safeNum(sec80c), FINANCE.SECTION_80C_MAX) +
    Math.min(safeNum(sec80d), FINANCE.SECTION_80D_MAX) + Math.min(safeNum(nps), FINANCE.NPS_80CCD_MAX) +
    safeNum(otherDed) + Math.min(safeNum(homeLoan), 200000) + hra,
  [sec80c, sec80d, nps, otherDed, homeLoan, hra]);

  // Old regime
  const oldResult = useMemo(() => {
    const taxableOld = Math.max(income - totalDed, 0);
    return safeTax(taxableOld, FINANCE.TAX_SLABS_OLD);
  }, [income, totalDed]);

  // New regime
  const newResult = useMemo(() => {
    const taxableNew = Math.max(income - FINANCE.STANDARD_DEDUCTION_NEW, 0);
    return safeTax(taxableNew, FINANCE.TAX_SLABS_NEW);
  }, [income]);

  const savings = Math.abs(oldResult.total - newResult.total);
  const betterRegime = oldResult.total <= newResult.total ? "Old" : "New";

  // Chart data
  const chartData = useMemo(() => [
    { label: "Old regime", value: oldResult.total, display: currency(oldResult.total) },
    { label: "New regime", value: newResult.total, display: currency(newResult.total) },
  ], [oldResult, newResult]);

  useEffect(() => { if (!onResult) return; const t = setTimeout(() => onResult({
    "Old Regime Tax": currency(oldResult.total), "New Regime Tax": currency(newResult.total),
    [`${betterRegime} saves`]: currency(savings)
  }), TIMING.DEBOUNCE_CALC); return () => clearTimeout(t); }, [income, totalDed]);

  return (<div>
    <div style={tabRow}>
      <button onClick={() => { setTaxTab("basic") }} style={tabStyle(taxTab === "basic", color, t)}>Income</button>
      <button onClick={() => { setTaxTab("deductions") }} style={tabStyle(taxTab === "deductions", color, t)}>Deductions</button>
      <button onClick={() => { setTaxTab("hra") }} style={tabStyle(taxTab === "hra", color, t)}>HRA</button>
      <button onClick={() => { setTaxTab("result") }} style={tabStyle(taxTab === "result", color, t)}>Compare</button>
    </div>

    {taxTab === "basic" && (<div>
      <HeroNumber aria-live="polite" label={`${betterRegime} regime saves you`} value={currency(savings)} color={tokens.color.success} />
      <MetricGrid t={t} items={[
        { label: `Old regime tax`, value: currency(oldResult.total), color: tokens.color.secondary },
        { label: `New regime tax`, value: currency(newResult.total), color: tokens.color.primary },
        { label: "Old effective rate", value: pct(oldResult.effective) },
        { label: "New effective rate", value: pct(newResult.effective) },
      ]} />
      <AmountInput label="Annual Income (Gross)" value={income} onChange={setIncome} min={SLIDER.tax.income.min} max={SLIDER.tax.income.max} color={color} t={t} />
      <MiniChart type="hbar" data={chartData} height={80} colors={[tokens.color.secondary, tokens.color.primary]} t={t} />
    </div>)}

    {taxTab === "deductions" && (<div>
      <div style={labelStyle(t)}>Old regime deductions (not applicable in new regime)</div>
      <AmountInput label="80C (PPF, ELSS, LIC)" value={sec80c} onChange={setSec80c} min={SLIDER.tax.sec80c.min} max={SLIDER.tax.sec80c.max} color={color} t={t} />
      <AmountInput label="80D (Health Insurance)" value={sec80d} onChange={setSec80d} min={SLIDER.tax.sec80d.min} max={SLIDER.tax.sec80d.max} color={color} t={t} />
      <AmountInput label="80CCD NPS" value={nps} onChange={setNps} min={SLIDER.tax.nps.min} max={SLIDER.tax.nps.max} color={color} t={t} />
      <AmountInput label="Home Loan Interest (Sec 24)" value={homeLoan} onChange={setHomeLoan} min={SLIDER.tax.homeLoan.min} max={SLIDER.tax.homeLoan.max} color={color} t={t} />
      <AmountInput label="Other Deductions" value={otherDed} onChange={setOtherDed} min={SLIDER.tax.hra.min} max={SLIDER.tax.hra.max} color={color} t={t} />
      <MetricGrid t={t} items={[
        { label: "Total deductions", value: currency(totalDed), color },
        { label: "Taxable income (old)", value: currency(Math.max(income - totalDed, 0)) },
      ]} />
    </div>)}

    {taxTab === "hra" && (<div>
      <HeroNumber aria-live="polite" label="HRA exemption" value={currency(hra)} color={tokens.color.success} />
      <div style={labelStyle(t)}>HRA exemption calculator</div>
      <AmountInput label="Basic Salary (yearly)" value={basicSalary} onChange={setBasicSalary} min={0} max={income} color={color} t={t} />
      <AmountInput label="HRA Received (yearly)" value={hraReceived} onChange={setHraReceived} min={0} max={income} color={color} t={t} />
      <AmountInput label="Rent Paid (yearly)" value={rentPaid} onChange={setRentPaid} min={SLIDER.tax.rent.min} max={SLIDER.tax.rent.max} color={color} t={t} />
      <div style={{ display: "flex", gap: tokens.space.sm, marginBottom: tokens.space.lg }}>
        <button onClick={() => { setIsMetro(true) }} style={tabStyle(isMetro, color, t)}>Metro (50%)</button>
        <button onClick={() => { setIsMetro(false) }} style={tabStyle(!isMetro, color, t)}>Non-metro (40%)</button>
      </div>
    </div>)}

    {taxTab === "result" && (<div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.space.sm }}>
        <div style={{ ...metricStyle(t), textAlign: "center", borderTop: `3px solid ${tokens.color.secondary}` }}>
          <div style={labelStyle(t)}>Old regime</div>
          <div style={{ fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.medium, color: tokens.color.secondary, fontFamily: tokens.fontFamily.mono }}>{currency(oldResult.total)}</div>
          <div style={captionDimMt(t)}>Tax: {currency(oldResult.tax)}</div>
          <div style={captionDim(t)}>Cess: {currency(oldResult.cess)}</div>
          <div style={captionDim(t)}>Effective: {pct(oldResult.effective)}</div>
        </div>
        <div style={{ ...metricStyle(t), textAlign: "center", borderTop: `3px solid ${tokens.color.primary}` }}>
          <div style={labelStyle(t)}>New regime</div>
          <div style={{ fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.medium, color: tokens.color.primary, fontFamily: tokens.fontFamily.mono }}>{currency(newResult.total)}</div>
          <div style={captionDimMt(t)}>Tax: {currency(newResult.tax)}</div>
          <div style={captionDim(t)}>Cess: {currency(newResult.cess)}</div>
          <div style={captionDim(t)}>Effective: {pct(newResult.effective)}</div>
        </div>
      </div>
      <div style={{ background: `${tokens.color.success}10`, border: `1px solid ${tokens.color.success}25`, borderRadius: tokens.radius.lg, padding: tokens.space.lg, textAlign: "center", marginTop: tokens.space.md }}>
        <div style={captionMuted(t)}>{betterRegime} regime saves you</div>
        <HeroNumber aria-live="polite" value={currency(savings)} color={tokens.color.success} style={{ padding: `${tokens.space.sm}px 0` }} />
      </div>
    </div>)}

    <div style={disclaimer(t)}>
      Tax calculations are estimates for FY 2026-27 (AY 2027-28). Slabs unchanged from FY 2025-26. For exact tax filing, consult a Chartered Accountant. Rebates under Section 87A not included.
    </div>
  </div>);
}
