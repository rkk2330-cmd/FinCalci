import { tabRow, sectionGap } from '../design/styles';
import { loadCalcInputs } from '../utils/inputMemory';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — FDCalc (FD + RD)
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeCompound, safeNum, safePow, safeDivide, safeRateDecimal, validateCalcInputs } from '../utils/validate';
import { currency, currencyCompact, pct, FMT } from '../utils/format';
import { INPUT_SCHEMAS, FINANCE, TIMING, SLIDER } from '../utils/constants';
// SLIDER imported via constants
import { tokens } from '../design/tokens';
import { tabStyle, labelStyle } from '../design/theme';
import { useSchemaInputs } from '../hooks/useValidatedInput';
import { vib } from '../utils/haptics';
import SliderInput from '../components/SliderInput';
import AmountInput from '../components/AmountInput';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import MiniChart from '../components/MiniChart';

export default function FDCalc({ color, t, onResult }: CalcProps) {
  const _i = useSchemaInputs(INPUT_SCHEMAS.fd, loadCalcInputs("fd", {}));
  const [P, setP] = useState(_i._values.P), [rate, setRate] = useState(_i._values.rate), [years, setYears] = useState(_i._values.years);
  const [isFD, setIsFD] = useState(true);
  const [rdMonthly, setRdMonthly] = useState(5000);
  useDebouncedPersist("fd", { P, rate, years });

  const freq = 4; // quarterly
  const fd = useMemo(() => safeCompound(P, rate, years, freq), [P, rate, years]);

  const rd = useMemo(() => {
    const qr = safeNum(rate) / 400; const rn = years * 12;
    let mat = 0;
    for (let i = 0; i < rn; i++) { mat += rdMonthly * safePow(1 + qr, (rn - i) / 3, 1); }
    const inv = rdMonthly * rn;
    return { maturity: mat, invested: inv, interest: mat - inv };
  }, [rdMonthly, rate, years]);

  const banks = useMemo(() => FINANCE.FD_BANK_RATES.map(b => {
    const { maturity, interest } = safeCompound(P, b.r, years, freq);
    return { ...b, maturity, interest };
  }), [P, years]);

  useEffect(() => { if (!onResult) return; const t = setTimeout(() => {
    if (isFD) onResult({ "Invested": currency(P), "Interest": currency(fd.interest), "Maturity": currency(fd.maturity) });
    else onResult({ "Invested": currency(rd.invested), "Interest": currency(rd.interest), "Maturity": currency(rd.maturity) });
  }, TIMING.DEBOUNCE_CALC); return () => clearTimeout(t); }, [P, rate, years, isFD, rdMonthly]);

  return (<div>
    <div style={tabRow}>
      <button onClick={() => { setIsFD(true) }} style={tabStyle(isFD, color, t)}>Fixed Deposit</button>
      <button onClick={() => { setIsFD(false) }} style={tabStyle(!isFD, "#D946EF", t)}>Recurring Deposit</button>
    </div>

    <HeroNumber label="Maturity value" value={currency(isFD ? fd.maturity : rd.maturity)} color={isFD ? color : "#D946EF"} />
    <MetricGrid t={t} items={[
      { label: "Invested", value: currencyCompact(isFD ? P : rd.invested) },
      { label: "Interest earned", value: currencyCompact(isFD ? fd.interest : rd.interest), color: tokens.color.success },
    ]} />

    {isFD
      ? <AmountInput label="Deposit Amount" value={P} onChange={setP} min={SLIDER.fd.P.min} max={SLIDER.fd.P.max} color={color} t={t} />
      : <AmountInput label="Monthly Deposit" value={rdMonthly} onChange={setRdMonthly} min={SLIDER.fd.rd.min} max={SLIDER.fd.rd.max} color="#D946EF" t={t} />
    }
    <SliderInput label="Interest Rate" value={rate} onChange={setRate} unit="%" min={SLIDER.fd.rate.min} max={SLIDER.fd.rate.max} step={SLIDER.fd.rate.step} color={color} t={t} />
    <SliderInput label="Duration" value={years} onChange={setYears} unit="yrs" min={SLIDER.fd.years.min} max={SLIDER.fd.years.max} step={SLIDER.fd.years.step} color={color} t={t} />

    <MiniChart type="donut" data={[isFD ? P : rd.invested, Math.max(isFD ? fd.interest : rd.interest, 0)]} width={140} height={140} colors={[isFD ? color : "#D946EF", tokens.color.success]} t={t} />

    {/* Bank comparison */}
    {isFD && (<div style={sectionGap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={labelStyle(t)}>Compare across banks</div>
        <div style={{ fontSize: tokens.fontSize.caption - 2, color: t.textDim }}>Rates as of Apr 2026</div>
      </div>
      <MiniChart type="hbar" data={banks.map(b => ({ label: b.name, value: b.maturity, display: currency(b.maturity) }))} height={banks.length * 40} colors={[color]} t={t} />
    </div>)}

    {/* Affiliate CTA */}
    <div onClick={() => vib(5)}
      style={{ display: "block", textDecoration: "none", width: "100%", padding: `${tokens.space.md}px ${tokens.space.lg}px`, borderRadius: tokens.radius.lg, background: `${color}08`, border: `1px solid ${color}18`, marginTop: tokens.space.lg, textAlign: "center" }}>
      <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color }}>🏦 Compare FD rates across banks →</div>
      <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, marginTop: 2 }}>Coming soon — compare FD rates from top banks</div>
    </div>

    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md }}>Bank rates shown are indicative. Actual rates vary by tenure, amount, and bank policy. Not financial advice.</div>
  </div>);
}
