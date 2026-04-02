// @ts-nocheck — TODO: add strict types
// FinCalci — SliderInput v3: CRED-style tap-to-type field
// Clean single-row card. Tap value to edit. No slider, no −/+ buttons.
// 
import React from 'react';
const { useState, useRef, useEffect } = React;
import { tokens } from '../design/tokens';
import { vib } from '../utils/haptics';

function SliderInputInner({ label, value, onChange, unit, min = 0, max = 100, step = 1, color, t }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(String(value));
  const inputRef = useRef(null);

  const clamp = (v, mn, mx, fb = mn) => {
    const n = Number(v);
    if (isNaN(n) || !isFinite(n)) return fb;
    return Math.min(Math.max(n, mn), mx);
  };

  // Allow values beyond slider max but cap at 100x (prevents garbage)
  const HARD_MAX = max * 100;

  const startEdit = () => {
    setEditVal(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const endEdit = () => {
    const n = Number(editVal);
    if (isNaN(n) || !isFinite(n)) { onChange(min); }
    else { onChange(clamp(n, min, HARD_MAX, min)); }
    setEditing(false);
    vib(5);
  };

  // Format display value
  const displayVal = (() => {
    const n = Number(value);
    if (isNaN(n)) return '0';
    // Show decimals for small step values (like 0.1, 0.25, 0.5)
    if (step < 1) {
      const decimals = String(step).split('.')[1]?.length || 1;
      return n.toFixed(Math.min(decimals, 2));
    }
    return n.toLocaleString('en-IN');
  })();

  const isDark = t.bg === '#0F0F13';

  return (
    <div
      onClick={!editing ? startEdit : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        marginBottom: 10,
        borderRadius: tokens.radius.md,
        background: isDark ? t.card : '#FFFFFF',
        border: editing
          ? `1.5px solid ${color}`
          : isDark ? `1px solid ${t.border}` : 'none',
        boxShadow: editing
          ? `0 0 0 3px ${color}15`
          : isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)',
        cursor: editing ? 'default' : 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Label */}
      <label style={{
        fontSize: tokens.fontSize.body,
        color: t.textMuted,
        fontFamily: tokens.fontFamily.sans,
        userSelect: 'none',
        flexShrink: 0,
      }}>
        {label}
      </label>

      {/* Value + Unit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={editVal}
            step={step}
            onChange={e => setEditVal(e.target.value)}
            onBlur={endEdit}
            onKeyDown={e => { if (e.key === 'Enter') endEdit(); }}
            autoFocus
            style={{
              width: 80,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color,
              fontSize: 16,
              fontWeight: tokens.fontWeight.medium,
              fontFamily: tokens.fontFamily.mono,
              textAlign: 'right',
              MozAppearance: 'textfield',
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          />
        ) : (
          <span style={{
            fontSize: 16,
            fontWeight: tokens.fontWeight.medium,
            fontFamily: tokens.fontFamily.mono,
            color: t.text,
            textAlign: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {displayVal}
          </span>
        )}
        {unit && (
          <span style={{
            color: t.textDim,
            fontSize: tokens.fontSize.caption,
            flexShrink: 0,
            minWidth: 16,
          }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// Memo: skip re-render when props unchanged
export default React.memo(SliderInputInner, (prev, next) =>
  prev.value === next.value &&
  prev.min === next.min &&
  prev.max === next.max &&
  prev.step === next.step &&
  prev.label === next.label &&
  prev.color === next.color &&
  prev.unit === next.unit &&
  prev.onChange === next.onChange &&
  prev.t === next.t
);
