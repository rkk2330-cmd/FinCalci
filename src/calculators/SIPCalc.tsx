import { captionDim, sectionGapLg, disclaimer } from '../design/styles';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
import { loadCalcInputs } from '../utils/inputMemory';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — SIPCalc (SIP, Step-up, Lumpsum, SWP, MF NAV, Stock lookup)
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo, useCallback } = React;
import { safeSIPFV, safeNum, safeRange, safePow, safeDivide, safeRateDecimal, validateCalcInputs } from '../utils/validate';
import { currency, currencyCompact, pct, num, decimal, FMT } from '../utils/format';
import { INPUT_SCHEMAS, FINANCE, TIMING, SLIDER } from '../utils/constants';
// SLIDER imported via constants
import { tokens } from '../design/tokens';
import { tabStyle, metricStyle, labelStyle, inputStyle } from '../design/theme';
import { useSchemaInputs, useValidatedNum } from '../hooks/useValidatedInput';
import { vib } from '../utils/haptics';
import MFLookup from '../components/MFLookup';
import StockLookupCard from '../components/StockLookupCard';
import SliderInput from '../components/SliderInput';
import AmountInput from '../components/AmountInput';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import MiniChart from '../components/MiniChart';
import { InlineError, LoadingSpinner } from '../components/UIStates';

export default function SIPCalc({ color, t, onResult }: CalcProps) {
  // ─── Mode ───
  const [sipMode, setSipMode] = useState("sip");

  // ─── Persisted inputs ───
  const _inputs = useSchemaInputs(INPUT_SCHEMAS.sip, loadCalcInputs("sip", {}));
  const monthly = _inputs.monthly.value, setMonthly = _inputs.monthly.set;
  const rate = _inputs.rate.value, setRate = _inputs.rate.set;
  const years = _inputs.years.value, setYears = _inputs.years.set;
  useDebouncedPersist("sip", { monthly, rate, years });

  // ─── UI state ───
  const [goalAmt, setGoalAmt] = useState(10000000);
  const [showInflation, setShowInflation] = useState(false);
  const [stepPct, setStepPct] = useState(10);
  const [lumpAmt, setLumpAmt] = useState(500000);
  const [corpus, setCorpus] = useState(2000000), [swpAmt, setSwpAmt] = useState(10000);
  const [swpRate, setSwpRate] = useState(8), [swpYears, setSwpYears] = useState(10);

  // MF and Stock lookup moved to <MFLookup> and <StockLookupCard> components

  // ─── Core SIP (memoized) ───
  const { fv, invested, gains } = useMemo(() => safeSIPFV(monthly, rate, years), [monthly, rate, years]);

  // ─── Inflation-adjusted (memoized) ───
  const realFV = useMemo(() => safeDivide(fv, safePow(1 + FINANCE.DEFAULT_INFLATION, years, 1), fv), [fv, years]);

  // ─── Goal SIP (memoized) ───
  const goalSIP = useMemo(() => {
    const r = rate / FINANCE.RATE_TO_MONTHLY;
    const n = years * 12;
    if (r <= 0 || n <= 0) return Math.round(safeDivide(goalAmt, n, 0));
    const x = safePow(1 + r, n, 1);
    return Math.round(safeDivide(goalAmt, safeDivide(x - 1, r, n) * (1 + r), 0));
  }, [goalAmt, rate, years]);

  // ─── FD comparison (memoized) ───
  const fdCompare = useMemo(() => {
    const fr = FINANCE.DEFAULT_FD_RATE / 12;
    const n = years * 12;
    const fdFV = monthly * safeDivide(safePow(1 + fr, n, 1) - 1, fr, n) * (1 + fr);
    return { fdFV, sipVsFdGain: fv - fdFV };
  }, [monthly, years, fv]);

  // ─── Step-up SIP (memoized — expensive loop) ───
  const su = useMemo(() => {
    let total = 0, inv = 0, curSIP = monthly;
    for (let y = 0; y < years; y++) {
      for (let m = 0; m < 12; m++) { inv += curSIP; total = (total + curSIP) * (1 + rate / FINANCE.RATE_TO_MONTHLY); }
      curSIP = Math.round(curSIP * (1 + safeRateDecimal(stepPct)));
    }
    return { fv: total, invested: inv, gains: total - inv };
  }, [monthly, rate, years, stepPct]);

  // ─── Lumpsum (memoized) ───
  const lump = useMemo(() => {
    const r = rate / FINANCE.RATE_TO_MONTHLY;
    const n = years * 12;
    const lumpFV = r > 0 ? lumpAmt * safePow(1 + r, n, 1) : lumpAmt;
    return { fv: lumpFV, gains: lumpFV - lumpAmt };
  }, [lumpAmt, rate, years]);

  // ─── SWP (memoized) ───
  const swp = useMemo(() => {
    const sr = swpRate / FINANCE.RATE_TO_MONTHLY;
    const sn = swpYears * 12;
    let bal = corpus, totalW = 0, exhausted = false, lastMonth = sn;
    for (let i = 1; i <= sn; i++) {
      bal = bal + bal * sr - swpAmt;
      totalW += swpAmt;
      if (bal <= 0) { lastMonth = i; exhausted = true; bal = 0; break; }
    }
    const maxSWP = sr > 0 ? safeDivide(corpus * sr, 1 - safePow(1 + sr, -sn, 0), safeDivide(corpus, sn)) : safeDivide(corpus, sn);
    return { finalBal: Math.max(bal, 0), totalWithdrawn: totalW, totalGrowth: totalW + Math.max(bal, 0) - corpus, exhausted, lastMonth, maxSWP };
  }, [corpus, swpAmt, swpRate, swpYears]);

  // ─── Chart data (memoized) ───
  const sipChartData = useMemo(() => {
    const data = [];
    for (let y = 1; y <= years; y++) {
      const n = y * 12; const r = rate / FINANCE.RATE_TO_MONTHLY;
      const yInv = monthly * n;
      const yFv = r > 0 ? monthly * safeDivide(safePow(1 + r, n, 1) - 1, r, n) * (1 + r) : yInv;
      data.push({ a: yInv, b: Math.max(yFv - yInv, 0) });
    }
    return data;
  }, [monthly, rate, years]);

  const sipChartLabels = useMemo(() =>
    Array.from({ length: years }, (_, i) => `${i + 1}y`), [years]);

  // ─── Report to parent ───
  useEffect(() => {
    if (!onResult) return;
    const timer = setTimeout(() => {
      if (sipMode === "sip") onResult({ "Invested": currency(invested), "Returns": currency(gains), "Total Value": currency(fv) });
      else if (sipMode === "stepup") onResult({ "Invested": currency(su.invested), "Returns": currency(su.gains), "Total Value": currency(su.fv) });
      else if (sipMode === "lumpsum") onResult({ "Invested": currency(lumpAmt), "Returns": currency(lump.gains), "Total Value": currency(lump.fv) });
      else if (sipMode === "swp") onResult({ "Withdrawn": currency(swp.totalWithdrawn), "Balance": currency(swp.finalBal), "Growth": currency(swp.totalGrowth) });
    }, TIMING.DEBOUNCE_CALC);
    return () => clearTimeout(timer);
  }, [monthly, rate, years, corpus, swpAmt, swpRate, swpYears, sipMode, stepPct, lumpAmt]);

  // ─── RENDER ───
  const tabBtn = (mode, label) => (
    <button onClick={() => { setSipMode(mode); vib(); }} style={{ ...tabStyle(sipMode === mode, color, t), width: "100%" }}>{label}</button>
  );

  return (<div>
    {/* Mode tabs */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: tokens.space.xs, marginBottom: tokens.space.xl }}>
      {tabBtn("sip", "SIP")} {tabBtn("stepup", "Step-up")} {tabBtn("lumpsum", "Lumpsum")}
      {tabBtn("swp", "SWP")} {tabBtn("mf", "Fund NAV")} {tabBtn("stock", "Stock")}
    </div>

    {sipMode === "sip" ? (<div>
      <HeroNumber label="Total value" value={currency(fv)} color={color} />
      <MetricGrid t={t} items={[
        { label: "Invested", value: currencyCompact(invested) },
        { label: "Returns", value: currencyCompact(gains), color: tokens.color.success },
        ...(showInflation ? [{ label: "Real value (after inflation)", value: currencyCompact(realFV), color: tokens.color.warning }] : []),
        { label: `vs FD (${pct(FINANCE.DEFAULT_FD_RATE * 100, 0)})`, value: `+${currencyCompact(fdCompare.sipVsFdGain)}`, color: tokens.color.success },
      ]} />

      <AmountInput label="Monthly SIP" value={monthly} onChange={setMonthly} min={SLIDER.sip.monthly.min} max={SLIDER.sip.monthly.max} color={color} t={t} />
      <SliderInput label="Expected Return" value={rate} onChange={setRate} unit="%" min={SLIDER.sip.rate.min} max={SLIDER.sip.rate.max} step={SLIDER.sip.rate.step} color={color} t={t} />
      <SliderInput label="Duration" value={years} onChange={setYears} unit="yrs" min={SLIDER.sip.years.min} max={SLIDER.sip.years.max} step={SLIDER.sip.years.step} color={color} t={t} />

      {/* Growth chart */}
      {sipChartData.length > 1 && (
        <div style={sectionGapLg}>
          <div style={labelStyle(t)}>Growth over {years} years</div>
          <MiniChart type="area" data={sipChartData} labels={sipChartLabels} height={120} colors={[tokens.color.primary, tokens.color.success]} t={t} />
        </div>
      )}

      {/* Donut */}
      <MiniChart type="donut" data={[invested, Math.max(gains, 0)]} width={140} height={120} colors={[color, tokens.color.success]} t={t} />
      <div style={{ display: "flex", justifyContent: "center", gap: tokens.space.lg, marginTop: tokens.space.sm, marginBottom: tokens.space.lg }}>
        <span style={captionDim(t)}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: color, marginRight: 4 }} />
          Invested {pct(safeDivide(invested, fv) * 100, 0)}
        </span>
        <span style={captionDim(t)}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: tokens.color.success, marginRight: 4 }} />
          Returns {pct(safeDivide(gains, fv) * 100, 0)}
        </span>
      </div>

      <button onClick={() => { setShowInflation(!showInflation); vib(); }}
        style={{ ...tabStyle(showInflation, tokens.color.warning, t), width: "100%", marginBottom: tokens.space.sm }}>
        {showInflation ? "Hide" : "Show"} inflation impact
      </button>

      {/* Goal calculator */}
      <div style={{ ...metricStyle(t), marginTop: tokens.space.md }}>
        <div style={labelStyle(t)}>Goal calculator — how much SIP for your target?</div>
        <div style={{ display: "flex", gap: tokens.space.xs, marginTop: tokens.space.sm, flexWrap: "wrap" }}>
          {[5000000, 10000000, 50000000, 100000000].map(g => (
            <button key={g} onClick={() => { setGoalAmt(g); vib(); }}
              style={{ ...tabStyle(goalAmt === g, color, t), flex: 1, minWidth: 60 }}>{currencyCompact(g)}</button>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: tokens.space.md }}>
          <div style={captionDim(t)}>You need</div>
          <div style={{ fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.medium, color, fontFamily: tokens.fontFamily.mono }}>
            {currency(goalSIP)}/month
          </div>
          <div style={captionDim(t)}>to reach {currencyCompact(goalAmt)} in {years} years at {pct(rate)}</div>
        </div>
      </div>

    </div>) : sipMode === "stepup" ? (<div>
      <HeroNumber label="Step-up SIP value" value={currency(su.fv)} color={color} />
      <MetricGrid t={t} items={[
        { label: "Invested", value: currencyCompact(su.invested) },
        { label: "Returns", value: currencyCompact(su.gains), color: tokens.color.success },
        { label: "vs regular SIP", value: `+${currencyCompact(su.fv - fv)}`, color: tokens.color.primary },
      ]} />
      <AmountInput label="Starting Monthly SIP" value={monthly} onChange={setMonthly} min={SLIDER.sip.monthly.min} max={SLIDER.sip.monthly.max} color={color} t={t} />
      <SliderInput label="Expected Return" value={rate} onChange={setRate} unit="%" min={SLIDER.sip.rate.min} max={SLIDER.sip.rate.max} step={SLIDER.sip.rate.step} color={color} t={t} />
      <SliderInput label="Duration" value={years} onChange={setYears} unit="yrs" min={SLIDER.sip.years.min} max={SLIDER.sip.years.max} step={SLIDER.sip.years.step} color={color} t={t} />
      <SliderInput label="Yearly Increase" value={stepPct} onChange={setStepPct} unit="%" min={SLIDER.sip.step.min} max={SLIDER.sip.step.max} step={SLIDER.sip.step.step} color={tokens.color.secondary} t={t} />

    </div>) : sipMode === "lumpsum" ? (<div>
      <HeroNumber label="Maturity value" value={currency(lump.fv)} color={color} />
      <MetricGrid t={t} items={[
        { label: "Invested", value: currencyCompact(lumpAmt) },
        { label: "Returns", value: currencyCompact(lump.gains), color: tokens.color.success },
      ]} />
      <AmountInput label="Lump Sum Amount" value={lumpAmt} onChange={setLumpAmt} min={SLIDER.sip.lump.min} max={SLIDER.sip.lump.max} color={color} t={t} />
      <SliderInput label="Expected Return" value={rate} onChange={setRate} unit="%" min={SLIDER.sip.rate.min} max={SLIDER.sip.rate.max} step={SLIDER.sip.rate.step} color={color} t={t} />
      <SliderInput label="Duration" value={years} onChange={setYears} unit="yrs" min={SLIDER.sip.years.min} max={SLIDER.sip.years.max} step={SLIDER.sip.years.step} color={color} t={t} />

    </div>) : sipMode === "swp" ? (<div>
      <HeroNumber label={swp.exhausted ? "Corpus exhausted!" : "Final balance"} value={currency(swp.finalBal)} color={swp.exhausted ? tokens.color.danger : tokens.color.success} />
      <MetricGrid t={t} items={[
        { label: "Total withdrawn", value: currencyCompact(swp.totalWithdrawn) },
        { label: "Total growth", value: currencyCompact(swp.totalGrowth), color: swp.totalGrowth >= 0 ? tokens.color.success : tokens.color.danger },
        { label: "Max safe withdrawal", value: currency(Math.round(swp.maxSWP)), color: tokens.color.primary },
      ]} />
      {swp.exhausted && <div style={{ fontSize: tokens.fontSize.caption, color: tokens.color.danger, textAlign: "center", marginBottom: tokens.space.sm }}>
        Corpus runs out in {swp.lastMonth} months. Reduce withdrawal or increase corpus.
      </div>}
      <AmountInput label="Initial Corpus" value={corpus} onChange={setCorpus} min={SLIDER.sip.swpCorpus.min} max={SLIDER.sip.swpCorpus.max} color={color} t={t} />
      <AmountInput label="Monthly Withdrawal" value={swpAmt} onChange={setSwpAmt} min={SLIDER.sip.swpMonthly.min} max={SLIDER.sip.swpMonthly.max} color={tokens.color.danger} t={t} />
      <SliderInput label="Expected Growth" value={swpRate} onChange={setSwpRate} unit="%" min={SLIDER.sip.rate.min} max={20} step={SLIDER.sip.rate.step} color={color} t={t} />
      <SliderInput label="Duration" value={swpYears} onChange={setSwpYears} unit="yrs" min={SLIDER.sip.years.min} max={SLIDER.sip.years.max} step={SLIDER.sip.years.step} color={color} t={t} />

    </div>) : sipMode === "mf" ? (<div>
      <MFLookup color={color} t={t} />

    </div>) : sipMode === "stock" ? (<div>
      <StockLookupCard color={color} t={t} />

    </div>) : null}

    {/* Affiliate CTA */}
    <a href="https://fin-calci.vercel.app/start-sip" target="_blank" rel="noopener noreferrer" onClick={() => vib(5)}
      style={{ display: "block", textDecoration: "none", width: "100%", padding: `${tokens.space.md}px ${tokens.space.lg}px`, borderRadius: tokens.radius.lg, background: `${color}08`, border: `1px solid ${color}18`, marginTop: tokens.space.lg, textAlign: "center" }}>
      <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color }}>📈 Start your SIP today →</div>
      <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, marginTop: 2 }}>Explore top-rated mutual funds on Groww, Zerodha & more</div>
    </a>

    <div style={disclaimer(t)}>
      Returns shown are hypothetical projections, not guaranteed. Mutual fund and stock data from free APIs — verify with your broker. This is not investment advice.
    </div>
  </div>);
}
