// @ts-nocheck — TODO: add strict types
// FinCalci — MiniChart: lightweight canvas-based charts
// Types: donut (with legend), hbar, sparkline
import React from 'react';
const { useRef, useEffect } = React;
import { tokens } from '../design/tokens';

function MiniChart({ type, data, width = 300, height = 160, colors, t, labels }) {
  const canvasRef = useRef(null);
  const prevData = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataKey = JSON.stringify(data) + JSON.stringify(labels);
    if (prevData.current === dataKey) return;
    prevData.current = dataKey;

    const actualWidth = (type === 'hbar' || type === 'sparkline')
      ? (canvas.parentElement?.clientWidth || canvas.clientWidth || width)
      : width;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = actualWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, actualWidth, height);

    const c1 = colors?.[0] || tokens.color.primary;
    const c2 = colors?.[1] || tokens.color.secondary;
    const textColor = t?.textDim || '#4B5563';
    const textMain = t?.textMuted || '#6B7280';

    if (type === 'donut') drawDonut(ctx, data, actualWidth, height, colors || [c1, c2], labels, textMain, textColor);
    else if (type === 'sparkline') drawSparkline(ctx, data, actualWidth, height, c1);
    else if (type === 'hbar') drawHBar(ctx, data, actualWidth, height, colors || [c1, c2], textColor, t);
  }, [data, type, width, height, colors, t, labels]);

  const isFullWidth = type === 'hbar' || type === 'sparkline';

  return <canvas ref={canvasRef} style={{
    display: 'block',
    width: isFullWidth ? '100%' : width,
    height,
    borderRadius: tokens.radius.md,
    margin: isFullWidth ? undefined : '0 auto',
  }} />;
}

// ─── Donut with built-in legend ───
function drawDonut(ctx, data, w, h, colors, labels, textMain, textDim) {
  if (!data || data.length === 0) return;
  const total = data.reduce((s, d) => s + Math.max(d, 0), 0);
  if (total <= 0) return;

  const hasLabels = labels && labels.length > 0;

  // Ring dimensions — left side if labels, centered if not
  const ringSize = hasLabels ? Math.min(h, w * 0.4) : Math.min(w, h);
  const cx = hasLabels ? ringSize / 2 + 4 : w / 2;
  const cy = h / 2;
  const r = ringSize / 2 - 8;
  const thick = r * 0.32;

  // Draw ring segments with small gap
  let angle = -Math.PI / 2;
  const gapAngle = data.length > 1 ? 0.03 : 0;

  data.forEach((val, i) => {
    const pct = Math.max(val, 0) / total;
    const sweep = pct * Math.PI * 2;
    if (sweep > 0.01) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, angle + gapAngle / 2, angle + sweep - gapAngle / 2);
      ctx.arc(cx, cy, r - thick, angle + sweep - gapAngle / 2, angle + gapAngle / 2, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
    }
    angle += sweep;
  });

  // Draw legend on right side
  if (hasLabels) {
    const legendX = ringSize + 12;
    const lineH = Math.min(28, (h - 10) / labels.length);
    const startY = (h - labels.length * lineH) / 2 + lineH / 2;

    labels.forEach((lbl, i) => {
      const y = startY + i * lineH;
      const pctVal = total > 0 ? Math.round((Math.max(data[i] || 0, 0) / total) * 100) : 0;
      const clr = colors[i % colors.length];

      // Color dot
      ctx.beginPath();
      ctx.arc(legendX, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = clr;
      ctx.fill();

      // Label text
      ctx.fillStyle = textMain;
      ctx.font = `400 ${11}px ${tokens.fontFamily.sans}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl, legendX + 10, y);

      // Percentage
      ctx.fillStyle = textDim;
      ctx.font = `500 ${11}px ${tokens.fontFamily.mono}`;
      ctx.textAlign = 'right';
      ctx.fillText(`${pctVal}%`, w - 6, y);
    });
  }
}

// ─── Sparkline ───
function drawSparkline(ctx, data, w, h, color) {
  if (!data || data.length < 2) return;
  const max = Math.max(...data, 1); const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pad = 4;

  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  data.forEach((v, i) => {
    const x = i * step;
    const y = pad + ((max - v) / range) * (h - pad * 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.lineTo((data.length - 1) * step, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = color + '15';
  ctx.fill();
}

// ─── Horizontal bar ───
function drawHBar(ctx, data, w, h, colors, textC, t) {
  if (!data || data.length === 0) return;
  const max = Math.max(...data.map(d => d.value), 1);
  const rowH = Math.min(h / data.length, 40);
  const padY = (rowH - 28) / 2;
  const barH = 28;
  const numW = 32;
  const valueW = 85;
  const barStart = numW;
  const barMaxW = w - numW - valueW - 8;

  const barColors = ['#E8593C', '#F2A623', '#3B8BD4', '#10B981', '#8B5CF6', '#EC4899', '#6366F1', '#F59E0B'];

  data.forEach((d, i) => {
    const y = i * rowH + padY;
    const bw = Math.max((barMaxW * d.value) / max, 40);

    ctx.fillStyle = textC;
    ctx.font = `500 ${13}px ${tokens.fontFamily.mono}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${String(i + 1).padStart(2, '0')}.`, numW - 6, y + barH / 2 + 5);

    const barColor = barColors[i % barColors.length];
    ctx.fillStyle = barColor;
    ctx.beginPath(); roundRect(ctx, barStart, y, bw, barH, 4); ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `500 ${11}px ${tokens.fontFamily.sans}`;
    ctx.textAlign = 'left';
    const labelText = d.label || '';
    const maxLabelW = bw - 16;
    let displayLabel = labelText;
    if (ctx.measureText(labelText).width > maxLabelW) {
      while (displayLabel.length > 3 && ctx.measureText(displayLabel + '…').width > maxLabelW) {
        displayLabel = displayLabel.slice(0, -1);
      }
      displayLabel += '…';
    }
    ctx.fillText(displayLabel, barStart + 10, y + barH / 2 + 4);

    ctx.fillStyle = textC;
    ctx.font = `500 ${12}px ${tokens.fontFamily.mono}`;
    ctx.textAlign = 'right';
    ctx.fillText(d.display || d.value.toLocaleString('en-IN'), w - 4, y + barH / 2 + 4);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
}

export default React.memo(MiniChart, (prev, next) => {
  return JSON.stringify(prev.data) === JSON.stringify(next.data)
    && JSON.stringify(prev.labels) === JSON.stringify(next.labels)
    && prev.type === next.type && prev.width === next.width && prev.height === next.height;
});
