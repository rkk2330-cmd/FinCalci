import { tabRow } from '../design/styles';
import { loadCalcInputs } from '../utils/inputMemory';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — BMICalc v2 (BMI + Body Fat + Ideal Weight)
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeNum, safeDivide, safeBMI, safeIdealWeight, safeRateDecimal, validateCalcInputs } from '../utils/validate';
import { decimal, num, pct, FMT } from '../utils/format';
import { INPUT_SCHEMAS, TIMING, SLIDER } from '../utils/constants';
// SLIDER imported via constants
import { tokens } from '../design/tokens';
import { tabStyle, labelStyle } from '../design/theme';
import { useSchemaInputs, useValidatedNum } from '../hooks/useValidatedInput';
import { vib } from '../utils/haptics';
import SliderInput from '../components/SliderInput';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import MiniChart from '../components/MiniChart';

export default function BMICalc({ color, t, onResult }: CalcProps) {
  const _i = useSchemaInputs(INPUT_SCHEMAS.bmi, loadCalcInputs("bmi", {}));
  const [h, setH] = useState(_i._values.height), [w, setW] = useState(_i._values.weight), [age, setAge] = useState(_i._values.age);
  const [gender, setGender] = useState("male");
  const [healthTab, setHealthTab] = useState("bmi");
  const [bfWaist, setBfWaist] = useState(85), [bfNeck, setBfNeck] = useState(38), [bfHip, setBfHip] = useState(95);

  useDebouncedPersist("bmi", { height: h, weight: w, age });

  const bmi = useMemo(() => safeBMI(w, h), [w, h]);
  const cat = useMemo(() => bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy" : bmi < 30 ? "Overweight" : "Obese", [bmi]);
  const cc = useMemo(() => bmi < 18.5 ? tokens.color.warning : bmi < 25 ? tokens.color.success : bmi < 30 ? tokens.color.warning : tokens.color.danger, [bmi]);

  const idealRange = useMemo(() => safeIdealWeight(h), [h]);

  const bodyFat = useMemo(() => {
    if (gender === "male") {
      return bfWaist > bfNeck && h > 0 ? 495 / (1.0324 - 0.19077 * Math.log10(bfWaist - bfNeck) + 0.15456 * Math.log10(h)) - 450 : 0;
    }
    return bfWaist > bfNeck && h > 0 ? 495 / (1.29579 - 0.35004 * Math.log10(bfWaist + bfHip - bfNeck) + 0.22100 * Math.log10(h)) - 450 : 0;
  }, [bfWaist, bfNeck, bfHip, h, gender]);

  const dailyCal = useMemo(() => {
    const bmr = gender === "male" ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161;
    return { sedentary: Math.round(bmr * 1.2), moderate: Math.round(bmr * 1.55), active: Math.round(bmr * 1.725) };
  }, [w, h, age, gender]);

  useEffect(() => { if (!onResult) return; const tm = setTimeout(() => {
    if (healthTab === "bmi") onResult({ "BMI": decimal(bmi), "Category": cat });
    else if (healthTab === "bf") onResult({ "Body Fat": pct(bodyFat) });
    else onResult({ "Moderate": `${num(dailyCal.moderate)} kcal` });
  }, TIMING.DEBOUNCE_CALC); return () => clearTimeout(tm); }, [h, w, age, gender, healthTab, bfWaist, bfNeck, bfHip]);

  return (<div>
    <div style={tabRow}>
      <button onClick={() => { setHealthTab("bmi"); vib(); }} style={tabStyle(healthTab === "bmi", color, t)}>BMI</button>
      <button onClick={() => { setHealthTab("bf"); vib(); }} style={tabStyle(healthTab === "bf", "#F472B6", t)}>Body Fat</button>
      <button onClick={() => { setHealthTab("cal"); vib(); }} style={tabStyle(healthTab === "cal", "#34D399", t)}>Calories</button>
    </div>

    <div style={{ display: "flex", gap: tokens.space.sm, marginBottom: tokens.space.lg }}>
      <button onClick={() => { setGender("male"); vib(); }} style={tabStyle(gender === "male", color, t)}>Male</button>
      <button onClick={() => { setGender("female"); vib(); }} style={tabStyle(gender === "female", "#F472B6", t)}>Female</button>
    </div>

    <SliderInput label="Height" value={h} onChange={setH} unit="cm" min={SLIDER.bmi.height.min} max={SLIDER.bmi.height.max} step={SLIDER.bmi.height.step} color={color} t={t} />
    <SliderInput label="Weight" value={w} onChange={setW} unit="kg" min={SLIDER.bmi.weight.min} max={SLIDER.bmi.weight.max} step={SLIDER.bmi.weight.step} color={color} t={t} />
    <SliderInput label="Age" value={age} onChange={setAge} unit="yrs" min={SLIDER.bmi.age.min} max={SLIDER.bmi.age.max} step={SLIDER.bmi.age.step} color={color} t={t} />

    {healthTab === "bmi" && (<div>
      <HeroNumber label="BMI" value={decimal(bmi)} color={cc} />
      <div style={{ textAlign: "center", fontSize: tokens.fontSize.body, fontWeight: tokens.fontWeight.medium, color: cc, marginBottom: tokens.space.lg }}>{cat}</div>
      <MiniChart type="gauge" data={bmi} width={260} height={140} colors={[cc]} t={t} />
      <MetricGrid t={t} items={[
        { label: "Healthy range", value: `${idealRange.min} – ${idealRange.max} kg`, color: tokens.color.success },
        { label: "Your weight", value: `${w} kg`, color: cc },
      ]} />
    </div>)}

    {healthTab === "bf" && (<div>
      <SliderInput label="Waist (cm)" value={bfWaist} onChange={setBfWaist} unit="cm" min={SLIDER.bmi.waist.min} max={SLIDER.bmi.waist.max} step={SLIDER.bmi.waist.step} color="#F472B6" t={t} />
      <SliderInput label="Neck (cm)" value={bfNeck} onChange={setBfNeck} unit="cm" min={SLIDER.bmi.neck.min} max={SLIDER.bmi.neck.max} step={SLIDER.bmi.neck.step} color="#F472B6" t={t} />
      {gender === "female" && <SliderInput label="Hip (cm)" value={bfHip} onChange={setBfHip} unit="cm" min={SLIDER.bmi.waist.min} max={SLIDER.bmi.waist.max} step={SLIDER.bmi.waist.step} color="#F472B6" t={t} />}
      <HeroNumber label="Body fat" value={pct(bodyFat)} color="#F472B6" />
    </div>)}

    {healthTab === "cal" && (<div>
      <HeroNumber label="Daily calories (moderate)" value={`${num(dailyCal.moderate)} kcal`} color={tokens.color.success} />
      <MetricGrid t={t} columns={3} items={[
        { label: "Sedentary", value: `${num(dailyCal.sedentary)} kcal` },
        { label: "Moderate", value: `${num(dailyCal.moderate)} kcal`, color: tokens.color.success },
        { label: "Active", value: `${num(dailyCal.active)} kcal` },
      ]} />
    </div>)}

    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md }}>Health calculations are approximate and not a substitute for medical advice.</div>
  </div>);
}
