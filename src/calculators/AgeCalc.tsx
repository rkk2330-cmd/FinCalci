import { tabRow, sectionGap } from '../design/styles';
import { useDebouncedPersist } from '../hooks/useCalcHelpers';
// @ts-nocheck — TODO: add strict types (boundary typed via CalcProps)
// FinCalci — AgeCalc (Age, Life Stats, Birthday Countdown, Compare)
import type { CalcProps } from '../types';
import React from 'react';
const { useState, useEffect, useMemo } = React;
import { safeNum, safeDate, safeDateDiff } from '../utils/validate';
import { num, decimal } from '../utils/format';
import { TIMING } from '../utils/constants';
import { tokens } from '../design/tokens';
import { tabStyle, inputStyle, labelStyle, metricStyle } from '../design/theme';
import HeroNumber from '../components/HeroNumber';
import MetricGrid from '../components/MetricGrid';
import DatePicker from '../components/DatePicker';

export default function AgeCalc({ color, t, onResult }: CalcProps) {
  const [mode, setMode] = useState("age");
  const [dob, setDob] = useState("2000-01-01");
  const [dob2, setDob2] = useState("1995-06-15");

  useDebouncedPersist("age", { dob });

  const age = useMemo(() => {
    const birth = safeDate(dob), now = new Date();
    if (!birth) return null;
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }

    const totalDays = Math.floor((now.getTime() - birth.getTime()) / 86400000);
    const totalMonths = years * 12 + months;
    const totalWeeks = Math.floor(totalDays / 7);
    const totalHours = totalDays * 24;
    const totalMinutes = totalHours * 60;

    // Next birthday
    const nextBday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBday <= now) nextBday.setFullYear(nextBday.getFullYear() + 1);
    const daysToNext = Math.ceil((nextBday.getTime() - now.getTime()) / 86400000);
    const nextAge = nextBday.getFullYear() - birth.getFullYear();
    const nextDay = nextBday.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    // Life stats (fun)
    const heartbeats = totalMinutes * 72;
    const breaths = totalMinutes * 16;
    const sleepDays = Math.round(totalDays * 0.33);

    // Next milestone
    const next1k = Math.ceil(totalDays / 1000) * 1000;
    const days1k = next1k - totalDays;

    return { years, months, days, totalDays, totalMonths, totalWeeks, totalHours, totalMinutes,
      daysToNext, nextAge, nextDay, heartbeats, breaths, sleepDays, next1k, days1k,
      zodiac: getZodiac(birth.getMonth() + 1, birth.getDate()), dayBorn: birth.toLocaleDateString("en-IN", { weekday: "long" }) };
  }, [dob]);

  const compare = useMemo(() => {
    if (mode !== "compare") return null;
    const b1 = safeDate(dob), b2 = safeDate(dob2);
    if (!b1 || !b2) return null;
    const d1 = safeDateDiff(b1, new Date());
    const d2 = safeDateDiff(b2, new Date());
    return { diff: Math.abs(d1 - d2), diffYears: (Math.abs(d1 - d2) / 365.25).toFixed(1), older: d1 > d2 ? "Person 1" : "Person 2" };
  }, [dob, dob2, mode]);

  useEffect(() => {
    if (!onResult || !age) return;
    const tm = setTimeout(() => onResult({ "Age": `${age.years}y ${age.months}m ${age.days}d`, "Total Days": num(age.totalDays), "Next Birthday": `${age.daysToNext} days` }), TIMING.DEBOUNCE_CALC);
    return () => clearTimeout(tm);
  }, [dob, mode]);

  if (!age) return <div style={{ textAlign: "center", color: t.textDim, padding: tokens.space.xxl }}>Enter a valid date of birth</div>;

  return (<div>
    <div style={tabRow}>
      <button onClick={() => { setMode("age") }} style={tabStyle(mode === "age", color, t)}>Age</button>
      <button onClick={() => { setMode("stats") }} style={tabStyle(mode === "stats", "#A78BFA", t)}>Life stats</button>
      <button onClick={() => { setMode("birthday") }} style={tabStyle(mode === "birthday", "#F472B6", t)}>Birthday</button>
      <button onClick={() => { setMode("compare") }} style={tabStyle(mode === "compare", tokens.color.gold, t)}>Compare</button>
    </div>

    <div style={labelStyle(t)}>Date of birth</div>
    <DatePicker value={dob} onChange={setDob} color={color} t={t} />

    {mode === "age" && (<div>
      <HeroNumber label="Your age" value={`${age.years} years`} color={color} />
      <div style={{ textAlign: "center", fontSize: tokens.fontSize.small, color: t.textMuted, marginBottom: tokens.space.lg }}>
        {age.years} years, {age.months} months, {age.days} days
      </div>
      <MetricGrid t={t} items={[
        { label: "Total months", value: num(age.totalMonths) },
        { label: "Total weeks", value: num(age.totalWeeks) },
        { label: "Total days", value: num(age.totalDays) },
        { label: "Total hours", value: num(age.totalHours) },
      ]} />
      <MetricGrid t={t} items={[
        { label: "Born on", value: age.dayBorn },
        { label: "Zodiac", value: age.zodiac },
      ]} />
    </div>)}

    {mode === "stats" && (<div>
      <HeroNumber label="Heartbeats (estimated)" value={num(age.heartbeats)} color="#F472B6" />
      <MetricGrid t={t} items={[
        { label: "Breaths taken", value: num(age.breaths) },
        { label: "Days sleeping", value: `~${num(age.sleepDays)} days` },
        { label: "Total minutes alive", value: num(age.totalMinutes) },
      ]} columns={3} />
    </div>)}

    {mode === "birthday" && (<div>
      <HeroNumber label="Next birthday in" value={`${age.daysToNext} days`} color="#F472B6" />
      <MetricGrid t={t} items={[
        { label: "Turning", value: `${age.nextAge} years old` },
        { label: "On", value: age.nextDay },
        { label: "Next milestone", value: `${num(age.next1k)} days in ${age.days1k} days` },
      ]} columns={3} />
    </div>)}

    {mode === "compare" && (<div>
      <div style={labelStyle(t)}>Second person's date of birth</div>
      <DatePicker value={dob2} onChange={setDob2} color={tokens.color.gold} t={t} />
      {compare && (<div style={sectionGap}>
        <HeroNumber label="Age difference" value={`${compare.diffYears} years`} color={tokens.color.gold} />
        <MetricGrid t={t} items={[
          { label: "Days apart", value: num(compare.diff) },
          { label: "Older", value: compare.older },
        ]} />
      </div>)}
    </div>)}
  
    <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.md, lineHeight: 1.6 }}>Age calculations are based on calendar dates. Results are for personal reference only.</div>
  </div>);
}

function getZodiac(m, d) {
  const signs = [["Capricorn",20],["Aquarius",19],["Pisces",20],["Aries",20],["Taurus",21],["Gemini",21],["Cancer",22],["Leo",23],["Virgo",23],["Libra",23],["Scorpio",22],["Sagittarius",22]];
  return d > signs[m-1][1] ? signs[m%12][0] : signs[m-1][0];
}
