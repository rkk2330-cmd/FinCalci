import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
import type { CalcProps } from '../types';
import { clampInput } from '../hooks/useValidatedInput';
import { CLAMP } from '../utils/constants';
// SLIDER imported via constants
// FinCalci — CurrencyCalc v2
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeNum, safeDivide, validateCalcInputs } from '../utils/validate';
import { currency, decimal, FMT } from '../utils/format';
import { FALLBACK_CURRENCY, INPUT_SCHEMAS, TIMING, SLIDER } from '../utils/constants';
// SLIDER imported via constants
import { tokens } from '../design/tokens';
import { tabStyle, inputStyle, labelStyle } from '../design/theme';
import { vib } from '../utils/haptics';
import { LiveRates } from '../utils/liveData';
import SliderInput from '../components/SliderInput';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import { RateBadge, InlineError } from '../components/UIStates';

const CURRENCIES = ["USD","INR","EUR","GBP","JPY","AED","CAD","AUD","SGD","CHF","BDT","LKR","NPR","MYR","THB","SAR","KWD","ZAR","BRL","CNY"];

export default function CurrencyCalc({ color, t, onResult }: CalcProps) {
  const [amt, setAmt] = useState(1000), [from, setFrom] = useState("USD"), [to, setTo] = useState("INR");
  const [liveRates, setLiveRates] = useState(null);
  const [rateStatus, setRateStatus] = useState("loading");
  const [rateError, setRateError] = useState(null);
  const [customRate, setCustomRate] = useState(""), [useCustom, setUseCustom] = useState(false);

  useDebouncedPersist("currency", { amount: amt });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRateStatus("loading");
      const { data, error } = await LiveRates.getRates();
      if (cancelled) return;
      if (data?.currency) setLiveRates(data.currency);
      setRateStatus(data?.live ? (data.cached ? "cached" : "live") : "offline");
      setRateError(error);
    })();
    return () => { cancelled = true; };
  }, []);

  const rates = liveRates || FALLBACK_CURRENCY;

  const result = useMemo(() => {
    if (useCustom && safeNum(customRate) > 0) return amt * safeNum(customRate);
    return rates[to] && rates[from] ? amt * safeDivide(rates[to], rates[from], 1) : amt;
  }, [amt, from, to, rates, customRate, useCustom]);

  const rateDisplay = useMemo(() => rates[to] && rates[from] ? safeDivide(rates[to], rates[from], 1) : 1, [rates, from, to]);

  useEffect(() => { if (!onResult) return; const t = setTimeout(() => onResult({ "Result": `${FMT(amt)} ${from} = ${FMT(result)} ${to}` }), TIMING.DEBOUNCE_CALC); return () => clearTimeout(t); }, [amt, from, to, useCustom, customRate, liveRates]);

  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.lg }}>
      <RateBadge status={rateStatus} error={rateError} t={t} />
    </div>
    {rateError && <InlineError message={rateError} t={t} />}

    <HeroNumber label={`${FMT(amt)} ${from} =`} value={`${FMT(result)} ${to}`} color={color} />

    <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, textAlign: "center", marginBottom: tokens.space.lg }}>
      1 {from} = {decimal(rateDisplay, 4)} {to}
    </div>

    <SliderInput label="Amount" value={amt} onChange={setAmt} unit={from} min={SLIDER.currency.amount.min} max={SLIDER.currency.amount.max} step={SLIDER.currency.amount.step} color={color} t={t} />

    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: tokens.space.sm, alignItems: "center", marginBottom: tokens.space.lg }}>
      <select value={from} onChange={e => { setFrom(e.target.value); vib(); }} style={{ ...inputStyle(t), textAlign: "center" }}>
        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button onClick={() => { const tmp = from; setFrom(to); setTo(tmp); vib(); }}
        style={{ width: 36, height: 36, borderRadius: tokens.radius.pill, background: `${color}15`, border: `1px solid ${color}30`, color, fontSize: 16, cursor: "pointer" }}>⇄</button>
      <select value={to} onChange={e => { setTo(e.target.value); vib(); }} style={{ ...inputStyle(t), textAlign: "center" }}>
        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>

    {/* Custom rate */}
    <div style={{ display: "flex", alignItems: "center", gap: tokens.space.sm, marginBottom: tokens.space.md }}>
      <button onClick={() => { setUseCustom(!useCustom); vib(); }} style={tabStyle(useCustom, color, t)}>Custom rate</button>
      {useCustom && <input type="number" value={customRate} placeholder={decimal(rateDisplay, 2)} onChange={e => setCustomRate(clampInput(e.target.value, CLAMP.CUSTOM_RATE_MIN, CLAMP.CUSTOM_RATE_MAX) || "")}
        style={{ ...inputStyle(t), width: 100, textAlign: "right", fontFamily: tokens.fontFamily.mono }} />}
    </div>

    {/* Quick conversions */}
    <div style={labelStyle(t)}>Quick conversions</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.space.xs }}>
      {[1, 10, 100, 1000, 10000].map(a => {
        const cv = useCustom && safeNum(customRate) > 0 ? a * safeNum(customRate) : a * rateDisplay;
        return (<div key={a} style={{ display: "flex", justifyContent: "space-between", padding: `${tokens.space.xs}px ${tokens.space.sm}px`, fontSize: tokens.fontSize.caption, color: t.textMuted }}>
          <span>{a} {from}</span><span style={{ color, fontFamily: tokens.fontFamily.mono }}>{FMT(cv)} {to}</span>
        </div>);
      })}
    </div>

    {useCustom && <div style={{ fontSize: tokens.fontSize.caption, color: tokens.color.warning, textAlign: "center", marginTop: tokens.space.sm }}>Using your custom rate</div>}
    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md }}>Rates are indicative mid-market rates. Actual bank/forex rates will differ. Not financial advice.</div>
  </div>);
}
