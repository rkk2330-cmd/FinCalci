import { tabRow, sectionGap } from '../design/styles';
import { loadCalcInputs } from '../utils/inputMemory';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — SalaryCalc
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeNum, safeSalary, safeDivide, safeRound, validateCalcInputs } from '../utils/validate';
import { currency, currencyCompact, pct, FMT } from '../utils/format';
import { INPUT_SCHEMAS, TIMING, SLIDER } from '../utils/constants';
// SLIDER imported via constants
import { tokens } from '../design/tokens';
import { tabStyle } from '../design/theme';
import { vib } from '../utils/haptics';
import SliderInput from '../components/SliderInput';
import AmountInput from '../components/AmountInput';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import MiniChart from '../components/MiniChart';

export default function SalaryCalc({ color, t, onResult }: CalcProps) {
  const _s = validateCalcInputs(loadCalcInputs("salary", {}), INPUT_SCHEMAS.salary);
  const [ctc, setCtc] = useState(_s.ctc);
  const [mode, setMode] = useState("breakdown");
  const [ctc2, setCtc2] = useState(1500000);
  useDebouncedPersist("salary", { ctc });

  const calc = useMemo(() => safeSalary(ctc), [ctc]);

  const calc2 = useMemo(() => safeSalary(ctc2), [ctc2]);

  useEffect(() => { if (!onResult) return; const tm = setTimeout(() => onResult({ "Monthly Take-home": currency(calc.monthly), "Yearly Take-home": currency(calc.yearly), "Tax (approx)": currency(calc.tax) }), TIMING.DEBOUNCE_CALC); return () => clearTimeout(tm); }, [ctc]);

  const chartData = useMemo(() => [
    { label: "Take-home", value: calc.yearly, display: currencyCompact(calc.yearly) },
    { label: "Tax", value: calc.tax, display: currency(calc.tax) },
    { label: "EPF (you)", value: calc.epfEmp * 12, display: currencyCompact(calc.epfEmp * 12) },
    { label: "EPF (employer)", value: calc.epfEr * 12, display: currencyCompact(calc.epfEr * 12) },
  ], [calc]);

  return (<div>
    <div style={tabRow}>
      <button onClick={() => { setMode("breakdown"); vib(); }} style={tabStyle(mode === "breakdown", color, t)}>Breakdown</button>
      <button onClick={() => { setMode("compare"); vib(); }} style={tabStyle(mode === "compare", color, t)}>Compare offers</button>
    </div>

    <HeroNumber label="Monthly take-home" value={currency(calc.monthly)} color={color} />
    <MetricGrid t={t} items={[
      { label: "Basic (40%)", value: currencyCompact(calc.basic) },
      { label: "HRA (50% basic)", value: currencyCompact(calc.hra) },
      { label: "Your EPF", value: currency(Math.round(calc.epfEmp)) },
      { label: "Tax (approx)", value: currency(calc.tax), color: tokens.color.danger },
    ]} />

    <AmountInput label="Annual CTC" value={ctc} onChange={setCtc} min={SLIDER.salary.ctc.min} max={SLIDER.salary.ctc.max} color={color} t={t} />

    <div style={sectionGap}><MiniChart type="hbar" data={chartData} height={160} colors={[tokens.color.success, tokens.color.danger, tokens.color.primary, tokens.color.secondary]} t={t} /></div>

    {mode === "compare" && (<div style={sectionGap}>
      <AmountInput label="Offer B CTC" value={ctc2} onChange={setCtc2} min={SLIDER.salary.ctc.min} max={SLIDER.salary.ctc.max} color={tokens.color.secondary} t={t} />
      <MetricGrid t={t} items={[
        { label: "Offer A take-home", value: currency(calc.monthly), color },
        { label: "Offer B take-home", value: currency(calc2.monthly), color: tokens.color.secondary },
        { label: "Difference", value: currency(Math.abs(calc.monthly - calc2.monthly)), color: calc.monthly > calc2.monthly ? tokens.color.success : tokens.color.danger },
      ]} columns={3} />
    </div>)}

    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md }}>Salary breakdown is approximate. Actual take-home depends on company structure, HRA city, and tax declarations.</div>
  </div>);
}
