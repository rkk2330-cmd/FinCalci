import { tabRow } from '../design/styles';
import { loadCalcInputs } from '../utils/inputMemory';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — PPFCalc v2 (PPF + EPF)
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeNum, safeSIPFV, safePow, safeDivide, safeRateDecimal, validateCalcInputs } from '../utils/validate';
import { currency, currencyCompact, pct, FMT } from '../utils/format';
import { INPUT_SCHEMAS, FINANCE, TIMING, SLIDER } from '../utils/constants';
// SLIDER imported via constants
import { tokens } from '../design/tokens';
import { tabStyle } from '../design/theme';
import { useSchemaInputs } from '../hooks/useValidatedInput';
import { vib } from '../utils/haptics';
import SliderInput from '../components/SliderInput';
import AmountInput from '../components/AmountInput';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';

export default function PPFCalc({ color, t, onResult }: CalcProps) {
  const _i = useSchemaInputs(INPUT_SCHEMAS.ppf, loadCalcInputs("ppf", {}));
  const [yearly, setYearly] = useState(_i._values.yearly), [years, setYears] = useState(_i._values.years);
  const [ppfRate, setPpfRate] = useState(7.1);
  const [mode, setMode] = useState("ppf");
  const [epfBasic, setEpfBasic] = useState(30000), [epfRate2, setEpfRate2] = useState(8.25), [epfYears, setEpfYears] = useState(30);

  useDebouncedPersist("ppf", { yearly, years });

  const ppf = useMemo(() => {
    const r = safeRateDecimal(ppfRate);
    let bal = 0;
    for (let y = 1; y <= years; y++) bal = (bal + yearly) * (1 + r);
    const invested = yearly * years;
    return { maturity: bal, invested, interest: bal - invested };
  }, [yearly, years, ppfRate]);

  const epf = useMemo(() => {
    const monthly = epfBasic * 0.12;
    return safeSIPFV(monthly, epfRate2, epfYears);
  }, [epfBasic, epfRate2, epfYears]);

  useEffect(() => { if (!onResult) return; const t = setTimeout(() => {
    if (mode === "ppf") onResult({ "Invested": currency(ppf.invested), "Interest": currency(ppf.interest), "Maturity": currency(ppf.maturity) });
    else onResult({ "EPF Corpus": currency(epf.fv), "Your Contribution": currency(epf.invested), "Returns": currency(epf.gains) });
  }, TIMING.DEBOUNCE_CALC); return () => clearTimeout(t); }, [yearly, years, ppfRate, mode, epfBasic, epfRate2, epfYears]);

  return (<div>
    <div style={tabRow}>
      <button onClick={() => { setMode("ppf"); vib(); }} style={tabStyle(mode === "ppf", color, t)}>PPF</button>
      <button onClick={() => { setMode("epf"); vib(); }} style={tabStyle(mode === "epf", "#F59E0B", t)}>EPF</button>
    </div>

    {mode === "ppf" ? (<div>
      <HeroNumber label="PPF maturity" value={currency(ppf.maturity)} color={color} />
      <MetricGrid t={t} items={[
        { label: "Invested", value: currencyCompact(ppf.invested) },
        { label: "Interest earned", value: currencyCompact(ppf.interest), color: tokens.color.success },
      ]} />
      <AmountInput label="Yearly Deposit" value={yearly} onChange={setYearly} min={SLIDER.ppf.yearly.min} max={SLIDER.ppf.yearly.max} color={color} t={t} />
      <SliderInput label="Duration" value={years} onChange={setYears} unit="yrs" min={SLIDER.ppf.years.min} max={SLIDER.ppf.years.max} step={SLIDER.ppf.years.step} color={color} t={t} />
      <SliderInput label="PPF Rate" value={ppfRate} onChange={setPpfRate} unit="%" min={SLIDER.ppf.rate.min} max={SLIDER.ppf.rate.max} step={SLIDER.ppf.rate.step} color={color} t={t} />
    </div>) : (<div>
      <HeroNumber label="EPF corpus" value={currency(epf.fv)} color="#F59E0B" />
      <MetricGrid t={t} items={[
        { label: "Your contribution", value: currencyCompact(epf.invested) },
        { label: "Returns", value: currencyCompact(epf.gains), color: tokens.color.success },
      ]} />
      <AmountInput label="Basic Salary (monthly)" value={epfBasic} onChange={setEpfBasic} min={SLIDER.ppf.epfBasic.min} max={SLIDER.ppf.epfBasic.max} color="#F59E0B" t={t} />
      <SliderInput label="EPF Rate" value={epfRate2} onChange={setEpfRate2} unit="%" min={SLIDER.ppf.epfRate.min} max={SLIDER.ppf.epfRate.max} step={SLIDER.ppf.epfRate.step} color="#F59E0B" t={t} />
      <SliderInput label="Years of Service" value={epfYears} onChange={setEpfYears} unit="yrs" min={SLIDER.ppf.epfYears.min} max={SLIDER.ppf.epfYears.max} step={SLIDER.ppf.epfYears.step} color="#F59E0B" t={t} />
    </div>)}

    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md }}>PPF rate subject to quarterly revision by government. EPF assumes employer matches 12%. Not financial advice.</div>
  </div>);
}
