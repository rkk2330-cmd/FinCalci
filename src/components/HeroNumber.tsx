// @ts-nocheck — TODO: add strict types
// FinCalci — HeroNumber: the big result display with optional count-up animation
import React from 'react';
const { useState, useEffect, useRef } = React;
import { tokens } from '../design/tokens';
import { TIMING } from '../utils/constants';

function HeroNumber({ value, label, color, animate = true, style = {} }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!animate || typeof value !== 'string') { setDisplay(value); return; }
    // Skip animation for compound values like "0 / 2,000" or non-numeric strings
    if (/[/|:]/.test(value) || !/\d/.test(value)) { setDisplay(value); return; }
    // Extract first contiguous number (with commas) for animation
    const match = value.match(/([^0-9]*?)(\d[\d,]*)(.*)/) ;
    if (!match) { setDisplay(value); return; }
    const prefix = match[1];
    const target = parseFloat(match[2].replace(/,/g, ''));
    const suffix = match[3];
    if (isNaN(target) || target === 0) { setDisplay(value); return; }
    const start = performance.now();
    const dur = TIMING.NUMBER_COUNT_UP;

    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const current = Math.round(target * ease);
      setDisplay(prefix + current.toLocaleString('en-IN') + suffix);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, animate]);

  return (
    <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: `${tokens.space.lg}px 0 ${tokens.space.sm}px`, ...style }}>
      {label && <div style={{ fontSize: tokens.fontSize.caption, color: 'inherit', opacity: 0.6, marginBottom: tokens.space.xs, fontFamily: tokens.fontFamily.sans }}>{label}</div>}
      <div style={{ fontSize: tokens.fontSize.hero, fontWeight: tokens.fontWeight.medium, fontFamily: tokens.fontFamily.mono, color: color || 'inherit', lineHeight: 1.2 }}>
        {display}
      </div>
    </div>
  );
}

export default React.memo(HeroNumber);
