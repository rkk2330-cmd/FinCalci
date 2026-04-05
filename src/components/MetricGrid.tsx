// FinCalci — MetricGrid: sub-values in a 2-column card grid
import React from 'react';
import { tokens } from '../design/tokens';

function MetricGrid({ items, t, columns = 2 }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: tokens.space.sm, marginBottom: tokens.space.lg }}>
      {items.map((item, i) => (
        <div key={i} style={{ padding: `${tokens.space.md}px ${tokens.space.lg}px`, borderRadius: tokens.radius.md, background: t.cardAlt }}>
          <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, marginBottom: tokens.space.xs, fontFamily: tokens.fontFamily.sans }}>{item.label}</div>
          <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, fontFamily: tokens.fontFamily.mono, color: item.color || t.text }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export default React.memo(MetricGrid);
