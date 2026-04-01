import { captionDim, disclaimer } from '../design/styles';
import { loadCalcInputs } from '../utils/inputMemory';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — GoldCalc v2
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeNum, safeRange, safePct, validateCalcInputs } from '../utils/validate';
import { currency, pct, decimal, FMT } from '../utils/format';
import { INPUT_SCHEMAS, FINANCE, TIMING, SLIDER } from '../utils/constants';
// SLIDER imported via constants
import { tokens } from '../design/tokens';
import { tabStyle, labelStyle } from '../design/theme';
import { useSchemaInputs } from '../hooks/useValidatedInput';
import { vib } from '../utils/haptics';
import { LiveRates } from '../utils/liveData';
import SliderInput from '../components/SliderInput';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import { RateBadge, InlineError } from '../components/UIStates';

export default function GoldCalc({ color, t, onResult }: CalcProps) {
  const _i = useSchemaInputs(INPUT_SCHEMAS.gold, loadCalcInputs("gold", {}));
  const [metalMode, setMetalMode] = useState("gold");
  const [weight, setWeight] = useState(10), [weightUnit, setWeightUnit] = useState("g");
  const [purity, setPurity] = useState("24K");
  const [makingPct, setMakingPct] = useState(_i._values.makingPct), [gstPct, setGstPct] = useState(_i._values.gstPct);
  const [goldRate, setGoldRate] = useState(7200), [silverRate, setSilverRate] = useState(85);
  const [rateStatus, setRateStatus] = useState("loading");
  const [rateError, setRateError] = useState(null);
  const [silverPurity, setSilverPurity] = useState("999");

  useDebouncedPersist("gold", { weight, makingPct, gstPct });

  // Fetch rates with {data, error}
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRateStatus("loading");
      const { data, error } = await LiveRates.getRates();
      if (cancelled) return;
      if (data?.gold) { setGoldRate(data.gold.goldPerGram); setSilverRate(data.gold.silverPerGram); }
      setRateStatus(data?.live ? (data.cached ? "cached" : "live") : "offline");
      setRateError(error);
    })();
    return () => { cancelled = true; };
  }, []);

  const purities = { "24K": 1, "22K": 0.9167, "18K": 0.75, "14K": 0.5833 };
  const silverPurities = { "999": 1, "925": 0.925, "900": 0.9, "800": 0.8 };

  const calc = useMemo(() => {
    const wg = safeNum(weight) * (FINANCE.WEIGHT_UNITS[weightUnit] || 1);
    if (metalMode === "gold") {
      const pure = wg * goldRate * (purities[purity] || 1);
      const making = safePct(pure, makingPct);
      const gst = safePct(pure + making, gstPct);
      return { pure, making, gst, total: pure + making + gst };
    }
    const pure = wg * silverRate * (silverPurities[silverPurity] || 1);
    const making = safePct(pure, makingPct);
    const gst = safePct(pure + making, gstPct);
    return { pure, making, gst, total: pure + making + gst };
  }, [weight, weightUnit, goldRate, silverRate, purity, silverPurity, makingPct, gstPct, metalMode]);

  useEffect(() => {
    if (!onResult) return;
    const t = setTimeout(() => {
      if (metalMode === "gold") onResult({ "Gold Value": currency(calc.pure), "Total": currency(calc.total) });
      else onResult({ "Silver Value": currency(calc.pure), "Total": currency(calc.total) });
    }, TIMING.DEBOUNCE_CALC);
    return () => clearTimeout(t);
  }, [calc, metalMode]);

  return (<div>
    <div style={{ display: "flex", gap: tokens.space.xs, marginBottom: tokens.space.lg }}>
      <button onClick={() => { setMetalMode("gold"); vib(); }} style={tabStyle(metalMode === "gold", "#F59E0B", t)}>Gold</button>
      <button onClick={() => { setMetalMode("silver"); vib(); }} style={tabStyle(metalMode === "silver", "#94A3B8", t)}>Silver</button>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.md }}>
      <RateBadge status={rateStatus} error={rateError} t={t} />
      <div style={captionDim(t)}>
        {metalMode === "gold" ? `${currency(goldRate)}/g` : `${currency(silverRate)}/g`}
      </div>
    </div>

    {rateError && <InlineError message={rateError} t={t} />}

    <HeroNumber label={metalMode === "gold" ? `${purity} Gold (${weight}${weightUnit})` : `${silverPurity} Silver (${weight}${weightUnit})`} value={currency(calc.total)} color={metalMode === "gold" ? "#F59E0B" : "#94A3B8"} />

    <MetricGrid t={t} items={[
      { label: `Pure ${metalMode} value`, value: currency(calc.pure) },
      { label: `Making (${pct(makingPct, 0)})`, value: currency(calc.making) },
      { label: `GST (${pct(gstPct, 0)})`, value: currency(calc.gst), color: tokens.color.secondary },
      { label: "Total price", value: currency(calc.total), color: metalMode === "gold" ? "#F59E0B" : "#94A3B8" },
    ]} />

    <SliderInput label="Weight" value={weight} onChange={setWeight} unit={weightUnit} min={0.1} max={10000} step={weightUnit === "g" ? 0.5 : 0.1} color={metalMode === "gold" ? "#F59E0B" : "#94A3B8"} t={t} />

    <div style={{ display: "flex", gap: tokens.space.xs, marginBottom: tokens.space.lg }}>
      {Object.keys(FINANCE.WEIGHT_UNITS).map(u => (
        <button key={u} onClick={() => { setWeightUnit(u); vib(); }} style={tabStyle(weightUnit === u, color, t)}>{u}</button>
      ))}
    </div>

    <div style={{ display: "flex", gap: tokens.space.xs, marginBottom: tokens.space.lg }}>
      {Object.keys(metalMode === "gold" ? purities : silverPurities).map(p => (
        <button key={p} onClick={() => { metalMode === "gold" ? setPurity(p) : setSilverPurity(p); vib(); }}
          style={tabStyle((metalMode === "gold" ? purity : silverPurity) === p, color, t)}>{p}</button>
      ))}
    </div>

    <SliderInput label="Making Charges" value={makingPct} onChange={setMakingPct} unit="%" min={SLIDER.gold.making.min} max={SLIDER.gold.making.max} step={SLIDER.gold.making.step} color={color} t={t} />
    <SliderInput label="GST" value={gstPct} onChange={setGstPct} unit="%" min={SLIDER.gold.gst.min} max={SLIDER.gold.gst.max} step={SLIDER.gold.gst.step} color={color} t={t} />

    <div style={disclaimer(t)}>
      Rates are derived from international spot prices with estimated import duty. Actual jeweller prices will vary. Verify before purchasing.
    </div>
  </div>);
}
