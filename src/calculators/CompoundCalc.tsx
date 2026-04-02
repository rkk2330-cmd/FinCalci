import { sectionGapLg } from '../design/styles';
import { loadCalcInputs } from '../utils/inputMemory';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — CompoundCalc v2
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeCompound, safeNum, safeDivide, validateCalcInputs } from '../utils/validate';
import { currency, currencyCompact, pct, decimal, FMT } from '../utils/format';
import { INPUT_SCHEMAS, TIMING, SLIDER } from '../utils/constants';
// SLIDER imported via constants
import { tokens } from '../design/tokens';
import { useSchemaInputs } from '../hooks/useValidatedInput';
import { vib } from '../utils/haptics';
import SliderInput from '../components/SliderInput';
import AmountInput from '../components/AmountInput';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import MiniChart from '../components/MiniChart';

export default function CompoundCalc({ color, t, onResult }: CalcProps) {
  const _i = useSchemaInputs(INPUT_SCHEMAS.compound, loadCalcInputs("compound", {}));
  const [P, setP] = useState(_i._values.P), [rate, setRate] = useState(_i._values.rate);
  const [years, setYears] = useState(_i._values.years), [monthlyAdd, setMonthlyAdd] = useState(_i._values.monthlyAdd);
  const [freq, setFreq] = useState(12); // compounding frequency

  useDebouncedPersist("compound", { P, rate, years, monthlyAdd });

  const calc = useMemo(() => {
    const { maturity: pMat, interest: pInt } = safeCompound(P, rate, years, freq);
    const addTotal = safeNum(monthlyAdd) * 12 * years;
    const { maturity: addMat } = safeCompound(monthlyAdd * 12, rate, years, freq);
    const totalMat = pMat + (monthlyAdd > 0 ? addMat : 0);
    const totalInv = P + addTotal;
    return { maturity: totalMat, invested: totalInv, interest: totalMat - totalInv, doubleYears: rate > 0 ? decimal(72 / rate) : "∞" };
  }, [P, rate, years, monthlyAdd, freq]);

  const chartData = useMemo(() => {
    return Array.from({ length: years }, (_, y) => {
      const { maturity } = safeCompound(P, rate, y + 1, freq);
      const inv = P + safeNum(monthlyAdd) * 12 * (y + 1);
      return { a: inv, b: Math.max(maturity - inv, 0) };
    });
  }, [P, rate, years, freq, monthlyAdd]);

  useEffect(() => { if (!onResult) return; const t = setTimeout(() => onResult({ "Invested": currency(calc.invested), "Interest": currency(calc.interest), "Total": currency(calc.maturity) }), TIMING.DEBOUNCE_CALC); return () => clearTimeout(t); }, [P, rate, years, monthlyAdd, freq]);

  return (<div>
    <HeroNumber label="Maturity value" value={currency(calc.maturity)} color={color} />
    <MetricGrid t={t} items={[
      { label: "Total invested", value: currencyCompact(calc.invested) },
      { label: "Interest earned", value: currencyCompact(calc.interest), color: tokens.color.success },
      { label: "Rule of 72", value: `Doubles in ~${calc.doubleYears} yrs` },
    ]} columns={3} />

    <AmountInput label="Principal Amount" value={P} onChange={setP} min={SLIDER.compound.P.min} max={SLIDER.compound.P.max} color={color} t={t} />
    <SliderInput label="Annual Rate" value={rate} onChange={setRate} unit="%" min={SLIDER.compound.rate.min} max={SLIDER.compound.rate.max} step={SLIDER.compound.rate.step} color={color} t={t} />
    <SliderInput label="Duration" value={years} onChange={setYears} unit="yrs" min={SLIDER.compound.years.min} max={SLIDER.compound.years.max} step={SLIDER.compound.years.step} color={color} t={t} />
    <AmountInput label="Monthly Addition" value={monthlyAdd} onChange={setMonthlyAdd} min={SLIDER.compound.monthly.min} max={SLIDER.compound.monthly.max} color={tokens.color.secondary} t={t} />

    {chartData.length > 1 && <div style={sectionGapLg}><MiniChart type="area" data={chartData} height={120} colors={[color, tokens.color.success]} t={t} /></div>}
    <MiniChart type="donut" data={[calc.invested, Math.max(calc.interest, 0)]} width={140} height={120} colors={[color, tokens.color.success]} t={t} />

    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md }}>Compound interest calculations are estimates. Actual returns depend on compounding frequency and institution. Not financial advice.</div>
  </div>);
}
