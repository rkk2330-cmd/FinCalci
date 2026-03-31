// @ts-nocheck — TODO: add strict types
// FinCalci — MiniChart: lightweight canvas-based charts
// React.memo + canvas = no DOM churn on re-render
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

    // Skip redraw if data unchanged
    const dataKey = JSON.stringify(data);
    if (prevData.current === dataKey) return;
    prevData.current = dataKey;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const c1 = colors?.[0] || tokens.color.primary;
    const c2 = colors?.[1] || tokens.color.secondary;
    const gridColor = t?.border || 'rgba(255,255,255,0.06)';
    const textColor = t?.textDim || '#4B5563';

    if (type === 'area') drawArea(ctx, data, width, height, c1, c2, gridColor, textColor, labels);
    else if (type === 'bar') drawBar(ctx, data, width, height, c1, c2, gridColor, textColor, labels);
    else if (type === 'donut') drawDonut(ctx, data, width, height, colors || [c1, c2]);
    else if (type === 'gauge') drawGauge(ctx, data, width, height, c1, t);
    else if (type === 'sparkline') drawSparkline(ctx, data, width, height, c1);
    else if (type === 'hbar') drawHBar(ctx, data, width, height, colors || [c1, c2], textColor, t);
  }, [data, type, width, height, colors, t, labels]);

  return <canvas ref={canvasRef} style={{
    display: 'block',
    width: (type === 'donut' || type === 'gauge') ? width : '100%',
    height,
    borderRadius: tokens.radius.md,
    margin: (type === 'donut' || type === 'gauge') ? '0 auto' : undefined,
  }} />;
}

// ─── Chart drawing functions ───

function drawArea(ctx, data, w, h, c1, c2, grid, textC, labels) {
  if (!data || data.length < 2) return;
  const pad = { t: 10, r: 10, b: 24, l: 10 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const max = Math.max(...data.map(d => (d.a || 0) + (d.b || 0)), 1);
  const step = cw / (data.length - 1);

  // Grid lines
  ctx.strokeStyle = grid; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 3; i++) { const y = pad.t + (ch / 3) * i; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }

  // Area 1 (principal/invested)
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t + ch);
  data.forEach((d, i) => { const x = pad.l + i * step; const y = pad.t + ch - (d.a / max) * ch; ctx.lineTo(x, y); });
  ctx.lineTo(pad.l + (data.length - 1) * step, pad.t + ch);
  ctx.closePath();
  ctx.fillStyle = c1 + '30'; ctx.fill();

  // Area 2 (total)
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t + ch);
  data.forEach((d, i) => { const x = pad.l + i * step; const y = pad.t + ch - ((d.a + d.b) / max) * ch; ctx.lineTo(x, y); });
  ctx.lineTo(pad.l + (data.length - 1) * step, pad.t + ch);
  ctx.closePath();
  ctx.fillStyle = c2 + '20'; ctx.fill();

  // Top line
  ctx.beginPath(); ctx.strokeStyle = c2; ctx.lineWidth = 2;
  data.forEach((d, i) => { const x = pad.l + i * step; const y = pad.t + ch - ((d.a + d.b) / max) * ch; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.stroke();

  // Labels
  if (labels && labels.length > 0) {
    ctx.fillStyle = textC; ctx.font = `${10}px ${tokens.fontFamily.sans}`;ctx.textAlign = 'center';
    const labelStep = Math.ceil(data.length / Math.min(labels.length, 5));
    labels.forEach((l, i) => { if (i % labelStep === 0) ctx.fillText(l, pad.l + i * step, h - 4); });
  }
}

function drawBar(ctx, data, w, h, c1, c2, grid, textC, labels) {
  if (!data || data.length === 0) return;
  const pad = { t: 10, r: 10, b: 24, l: 10 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const max = Math.max(...data.map(d => Math.max(d.a || 0, d.b || 0)), 1);
  const barW = Math.min(cw / data.length * 0.7, 20);
  const gap = cw / data.length;

  data.forEach((d, i) => {
    const x = pad.l + i * gap + gap / 2;
    const h1 = (d.a / max) * ch; const h2 = (d.b / max) * ch;
    // Bar A
    ctx.fillStyle = c1 + '80';
    ctx.beginPath(); roundRect(ctx, x - barW - 1, pad.t + ch - h1, barW, h1, 3); ctx.fill();
    // Bar B
    ctx.fillStyle = c2 + '80';
    ctx.beginPath(); roundRect(ctx, x + 1, pad.t + ch - h2, barW, h2, 3); ctx.fill();
  });

  if (labels) {
    ctx.fillStyle = textC; ctx.font = `${10}px ${tokens.fontFamily.sans}`; ctx.textAlign = 'center';
    labels.forEach((l, i) => { ctx.fillText(l, pad.l + i * gap + gap / 2, h - 4); });
  }
}

function drawDonut(ctx, data, w, h, colors) {
  if (!data || data.length === 0) return;
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 10, thick = r * 0.35;
  const total = data.reduce((s, d) => s + Math.max(d, 0), 0);
  if (total <= 0) return;
  let angle = -Math.PI / 2;

  data.forEach((val, i) => {
    const pct = Math.max(val, 0) / total;
    const sweep = pct * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.arc(cx, cy, r - thick, angle + sweep, angle, true);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    angle += sweep;
  });
}

function drawGauge(ctx, data, w, h, color, t) {
  const val = typeof data === 'number' ? data : (data?.[0] || 0);
  const cx = w / 2, cy = h - 20, r = Math.min(w, h) * 0.42;
  const startA = Math.PI, endA = 2 * Math.PI;
  const pct = Math.min(Math.max(val / 40, 0), 1); // BMI scale 0-40

  // Background arc
  ctx.beginPath(); ctx.arc(cx, cy, r, startA, endA);
  ctx.lineWidth = 12; ctx.strokeStyle = t?.border || 'rgba(255,255,255,0.08)'; ctx.lineCap = 'round'; ctx.stroke();

  // Value arc
  const valAngle = startA + pct * Math.PI;
  ctx.beginPath(); ctx.arc(cx, cy, r, startA, valAngle);
  ctx.strokeStyle = color; ctx.stroke();

  // Value text
  ctx.fillStyle = t?.text || '#F1F5F9'; ctx.font = `500 ${24}px ${tokens.fontFamily.mono}`; ctx.textAlign = 'center';
  ctx.fillText(val.toFixed(1), cx, cy - 8);
}

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

  // Fill below
  ctx.lineTo((data.length - 1) * step, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = color + '15';
  ctx.fill();
}

function drawHBar(ctx, data, w, h, colors, textC, t) {
  if (!data || data.length === 0) return;
  const max = Math.max(...data.map(d => d.value), 1);
  const barH = Math.min(h / data.length * 0.6, 24);
  const gap = h / data.length;
  const labelW = 80;

  data.forEach((d, i) => {
    const y = i * gap + gap / 2;
    const bw = ((w - labelW - 20) * d.value) / max;
    // Label
    ctx.fillStyle = textC; ctx.font = `${11}px ${tokens.fontFamily.sans}`; ctx.textAlign = 'right';
    ctx.fillText(d.label || '', labelW - 8, y + 4);
    // Bar
    ctx.fillStyle = colors[i % colors.length] + '80';
    ctx.beginPath(); roundRect(ctx, labelW, y - barH / 2, bw, barH, 4); ctx.fill();
    // Value
    ctx.fillStyle = textC; ctx.textAlign = 'left'; ctx.font = `500 ${11}px ${tokens.fontFamily.mono}`;
    ctx.fillText(d.display || d.value.toLocaleString('en-IN'), labelW + bw + 6, y + 4);
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
    && prev.type === next.type && prev.width === next.width && prev.height === next.height;
});
