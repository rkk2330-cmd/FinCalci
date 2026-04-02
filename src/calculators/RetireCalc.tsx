import { sectionGap, captionMuted } from '../design/styles';
import { loadCalcInputs } from '../utils/inputMemory';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — RetireCalc (FIRE calculator)
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeNum, safePow, safeDivide, safeSIPFV, safeRateDecimal, validateCalcInputs } from '../utils/validate';
import { currency, currencyCompact, pct, decimal, FMT } from '../utils/format';
import { INPUT_SCHEMAS, FINANCE, TIMING, SLIDER } from '../utils/constants';
// SLIDER imported via constants
import { tokens } from '../design/tokens';
import { tabStyle, labelStyle, metricStyle } from '../design/theme';
import { useSchemaInputs } from '../hooks/useValidatedInput';
import { vib } from '../utils/haptics';
import SliderInput from '../components/SliderInput';
import AmountInput from '../components/AmountInput';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import MiniChart from '../components/MiniChart';

export default function RetireCalc({ color, t, onResult }: CalcProps) {
  const _i = useSchemaInputs(INPUT_SCHEMAS.retire, loadCalcInputs("retire", {}));
  const [monthlyExp, setMonthlyExp] = useState(_i._values.monthlyExp);
  const [savings, setSavings] = useState(_i._values.savings);
  const [monthlySIP, setMonthlySIP] = useState(_i._values.monthlySIP);
  const [workYears, setWorkYears] = useState(_i._values.workYears);
  const [retireYears, setRetireYears] = useState(_i._values.retireYears);
  const [inflation, setInflation] = useState(_i._values.inflation);
  const [returnRate, setReturnRate] = useState(_i._values.returnRate);
  const [mode, setMode] = useState("fire");

  useDebouncedPersist("retire", { monthlyExp, savings, monthlySIP, workYears, retireYears, inflation, returnRate });

  const calc = useMemo(() => {
    const futureExp = monthlyExp * safePow(1 + safeRateDecimal(inflation), workYears, 1);
    const rr = returnRate / FINANCE.RATE_TO_MONTHLY;
    const corpusNeeded = rr > 0
      ? futureExp * 12 * safeDivide(1 - safePow(1 + rr, -retireYears * 12, 0), rr, retireYears * 12)
      : futureExp * 12 * retireYears;
    const r = returnRate / FINANCE.RATE_TO_MONTHLY;
    const n = workYears * 12;
    const savGrowth = savings * safePow(1 + r, n, 1);
    const sipGrowth = r > 0 ? monthlySIP * safeDivide(safePow(1 + r, n, 1) - 1, r, n) * (1 + r) : monthlySIP * n;
    const totalCorpus = savGrowth + sipGrowth;
    const gap = corpusNeeded - totalCorpus;
    const onTrack = gap <= 0;
    const reqSIP = gap > 0 && r > 0 ? Math.round(safeDivide(gap, safeDivide(safePow(1 + r, n, 1) - 1, r, n) * (1 + r), 0)) : 0;
    return { futureExp, corpusNeeded, savGrowth, sipGrowth, totalCorpus, gap, onTrack, reqSIP };
  }, [monthlyExp, savings, monthlySIP, workYears, retireYears, inflation, returnRate]);

  const chartData = useMemo(() => {
    const data = [];
    for (let y = 1; y <= workYears; y++) {
      const r = returnRate / FINANCE.RATE_TO_MONTHLY;
      const n = y * 12;
      const sg = savings * safePow(1 + r, n, 1);
      const sp = r > 0 ? monthlySIP * safeDivide(safePow(1 + r, n, 1) - 1, r, n) * (1 + r) : monthlySIP * n;
      data.push({ a: sg, b: sp });
    }
    return data;
  }, [savings, monthlySIP, returnRate, workYears]);

  useEffect(() => { if (!onResult) return; const t = setTimeout(() => onResult({ "Corpus Needed": currency(calc.corpusNeeded), "Projected": currency(calc.totalCorpus), [calc.onTrack ? "Surplus" : "Shortfall"]: currency(Math.abs(calc.gap)) }), TIMING.DEBOUNCE_CALC); return () => clearTimeout(t); }, [monthlyExp, savings, monthlySIP, workYears, retireYears, inflation, returnRate]);

  return (<div>
    <HeroNumber label="Retirement corpus needed" value={currencyCompact(calc.corpusNeeded)} color={color} />

    <MetricGrid t={t} items={[
      { label: "Monthly exp at retire", value: currency(Math.round(calc.futureExp)) },
      { label: "Savings growth", value: currencyCompact(calc.savGrowth) },
      { label: "SIP growth", value: currencyCompact(calc.sipGrowth), color: tokens.color.success },
      { label: "Projected corpus", value: currencyCompact(calc.totalCorpus), color: tokens.color.primary },
    ]} />

    <div style={{ background: calc.onTrack ? `${tokens.color.success}10` : `${tokens.color.danger}10`, border: `1px solid ${calc.onTrack ? tokens.color.success : tokens.color.danger}25`, borderRadius: tokens.radius.lg, padding: tokens.space.lg, textAlign: "center", marginBottom: tokens.space.lg }}>
      <div style={captionMuted(t)}>{calc.onTrack ? "You're on track!" : "Shortfall"}</div>
      <HeroNumber value={currencyCompact(Math.abs(calc.gap))} color={calc.onTrack ? tokens.color.success : tokens.color.danger} style={{ padding: `${tokens.space.sm}px 0` }} />
      {!calc.onTrack && calc.reqSIP > 0 && <div style={{ fontSize: tokens.fontSize.small, color: tokens.color.primary }}>Increase SIP to {currency(calc.reqSIP)}/month to bridge the gap</div>}
    </div>

    <AmountInput label="Monthly Expenses (today)" value={monthlyExp} onChange={setMonthlyExp} min={SLIDER.retire.monthlyExp.min} max={SLIDER.retire.monthlyExp.max} color={color} t={t} />
    <AmountInput label="Current Savings" value={savings} onChange={setSavings} min={SLIDER.retire.savings.min} max={SLIDER.retire.savings.max} color={tokens.color.secondary} t={t} />
    <AmountInput label="Monthly SIP" value={monthlySIP} onChange={setMonthlySIP} min={SLIDER.retire.sip.min} max={SLIDER.retire.sip.max} color={tokens.color.success} t={t} />
    <SliderInput label="Years to Retire" value={workYears} onChange={setWorkYears} unit="yrs" min={SLIDER.retire.workYears.min} max={SLIDER.retire.workYears.max} step={SLIDER.retire.workYears.step} color={color} t={t} />
    <SliderInput label="Retirement Duration" value={retireYears} onChange={setRetireYears} unit="yrs" min={SLIDER.retire.retireYears.min} max={SLIDER.retire.retireYears.max} step={SLIDER.retire.retireYears.step} color={color} t={t} />
    <SliderInput label="Inflation" value={inflation} onChange={setInflation} unit="%" min={SLIDER.retire.inflation.min} max={SLIDER.retire.inflation.max} step={SLIDER.retire.inflation.step} color={tokens.color.warning} t={t} />
    <SliderInput label="Expected Return" value={returnRate} onChange={setReturnRate} unit="%" min={SLIDER.retire.returnRate.min} max={SLIDER.retire.returnRate.max} step={SLIDER.retire.returnRate.step} color={tokens.color.success} t={t} />

    {chartData.length > 1 && <div style={sectionGap}><MiniChart type="area" data={chartData} height={120} colors={[tokens.color.secondary, tokens.color.success]} t={t} /></div>}

    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md }}>Projections assume constant inflation and returns. Actual results will vary. This is not financial advice.</div>
  </div>);
}
