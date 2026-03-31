// @ts-nocheck — TODO: add strict types
// FinCalci — AmountInput: PhonePe-style ₹ input
// - Raw number while typing (no cursor issues)
// - Indian comma formatting on blur (5,00,000)
// - Helper text: "5 Lakh" / "50 Thousand" / "1.2 Crore"
// - No slider, no +/- buttons
import React from 'react';
const { useState, useRef, useCallback } = React;
import { tokens } from '../design/tokens';
import { vib } from '../utils/haptics';

/** Convert number to Indian word form: 5 Thousand, 50 Lakh, 1.2 Crore */
function indianWords(n) {
  if (n === 0 || isNaN(n) || !isFinite(n)) return '';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_00_00_000) {
    const cr = abs / 1_00_00_000;
    return sign + (cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1).replace(/\.0$/, '')) + ' Crore';
  }
  if (abs >= 1_00_000) {
    const lk = abs / 1_00_000;
    return sign + (lk % 1 === 0 ? lk.toFixed(0) : lk.toFixed(1).replace(/\.0$/, '')) + ' Lakh';
  }
  if (abs >= 1_000) {
    const th = abs / 1_000;
    return sign + (th % 1 === 0 ? th.toFixed(0) : th.toFixed(1).replace(/\.0$/, '')) + ' Thousand';
  }
  return '';
}

/** Format number with Indian commas: 50,00,000 */
function indianFormat(n) {
  if (isNaN(n) || !isFinite(n)) return '0';
  const s = Math.abs(Math.round(n)).toString();
  if (s.length <= 3) return (n < 0 ? '-' : '') + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  return (n < 0 ? '-' : '') + formatted;
}

function AmountInputInner({ label, value, onChange, min = 0, max = Infinity, color, t }) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(String(value || ''));
  const inputRef = useRef(null);

  const clamp = useCallback((v) => {
    const n = Number(v);
    if (isNaN(n) || !isFinite(n)) return min;
    return Math.min(Math.max(n, min), max);
  }, [min, max]);

  const handleFocus = () => {
    setFocused(true);
    setRaw(value ? String(value) : '');
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const handleBlur = () => {
    setFocused(false);
    const clamped = clamp(raw);
    onChange(clamped);
    vib(3);
  };

  const handleChange = (e) => {
    // Allow only digits and one decimal point
    const v = e.target.value.replace(/[^0-9.]/g, '');
    setRaw(v);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.target.blur(); }
  };

  const displayValue = focused ? raw : indianFormat(value);
  const helper = indianWords(value);

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, color: t.textMuted, display: 'block', marginBottom: 6,
        fontFamily: "'Inter',system-ui,sans-serif" }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: t.inputBg, borderRadius: 10,
        border: `1.5px solid ${focused ? color : t.border}`,
        padding: '8px 12px',
        transition: 'border-color 0.2s',
      }}>
        <span style={{ color: t.textDim, fontSize: 15, marginRight: 6, flexShrink: 0 }}>₹</span>
        <input
          ref={inputRef}
          type={focused ? 'number' : 'text'}
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: t.text, fontSize: 16, fontFamily: "'JetBrains Mono',monospace",
            fontWeight: 500, textAlign: 'right',
            MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'none',
          }}
        />
      </div>
      {helper && (
        <div style={{ fontSize: 11, color: t.textDim, textAlign: 'right', marginTop: 3,
          fontFamily: "'Inter',system-ui,sans-serif" }}>
          {helper}
        </div>
      )}
    </div>
  );
}

export default React.memo(AmountInputInner, (prev, next) =>
  prev.value === next.value && prev.label === next.label &&
  prev.min === next.min && prev.max === next.max &&
  prev.color === next.color && prev.t === next.t
);
