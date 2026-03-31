// @ts-nocheck — TODO: add strict types
// FinCalci — Loading states for lazy-loaded components
// Used as Suspense fallbacks. Designed for slow 3G India connections (~2s chunk loads).
import React from 'react';
import { tokens } from '../design/tokens';

// Shimmer keyframes defined in App.tsx global <style> — no dynamic injection needed.

// ─── Shimmer bar (reusable) ───
function ShimmerBar({ width = '100%', height = 14, radius = 8, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
      backgroundSize: '200% 100%',
      animation: 'fcShimmer 1.5s ease infinite',
      ...style,
    }} />
  );
}

// ─── Calculator skeleton (mimics slider + hero number layout) ───
function CalcSkeletonInner({ color = tokens.color.primary, t }) {
  const bg = t?.cardAlt || '#1A2332';
  const border = t?.border || 'rgba(255,255,255,0.08)';

  return (
    <div style={{ padding: 20 }} aria-label="Loading calculator" role="status">
      {/* Tab bar skeleton */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        <ShimmerBar width="33%" height={36} radius={8} />
        <ShimmerBar width="33%" height={36} radius={8} />
        <ShimmerBar width="33%" height={36} radius={8} />
      </div>

      {/* Slider skeletons (3) */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <ShimmerBar width={80} height={12} />
            <ShimmerBar width={60} height={12} />
          </div>
          <ShimmerBar width="100%" height={6} radius={3} />
        </div>
      ))}

      {/* Hero number skeleton */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <ShimmerBar width={100} height={10} radius={4} style={{ margin: '0 auto 8px' }} />
        <ShimmerBar width={180} height={32} radius={8} style={{ margin: '0 auto' }} />
      </div>

      {/* Metric grid skeleton (2×2) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ padding: 12, borderRadius: 10, background: bg }}>
            <ShimmerBar width={60} height={10} style={{ marginBottom: 6 }} />
            <ShimmerBar width={90} height={16} />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <ShimmerBar width="100%" height={100} radius={10} style={{ marginBottom: 16 }} />

      {/* Spinner + text */}
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{
          width: 24, height: 24, border: `2px solid ${border}`,
          borderTopColor: color, borderRadius: '50%',
          animation: 'fcSpin 0.8s linear infinite',
          margin: '0 auto 8px',
        }} />
        <div style={{ fontSize: 12, color: t?.textDim || '#4B5563' }}>Loading calculator...</div>
      </div>
      
    </div>
  );
}

// ─── Section loader (for tab switches) ───
function SectionLoaderInner({ t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }} role="status" aria-label="Loading">
      <div style={{
        width: 28, height: 28,
        border: `2px solid ${t?.border || 'rgba(255,255,255,0.08)'}`,
        borderTopColor: tokens.color.primary,
        borderRadius: '50%',
        animation: 'fcSpin 0.8s linear infinite',
      }} />
      
    </div>
  );
}

// ─── Full page loader (for initial app load) ───
function FullPageLoaderInner() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#0B0F1A',
    }} role="status" aria-label="Loading FinCalci">
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(255,255,255,0.08)',
        borderTopColor: tokens.color.primary,
        borderRadius: '50%',
        animation: 'fcSpin 0.8s linear infinite',
        marginBottom: 16,
      }} />
      <div style={{ fontSize: 14, color: '#64748B', fontFamily: tokens.fontFamily.sans }}>
        Loading FinCalci...
      </div>
      
    </div>
  );
}

export const CalcSkeleton = React.memo(CalcSkeletonInner);
export const SectionLoader = React.memo(SectionLoaderInner);
export const FullPageLoader = React.memo(FullPageLoaderInner);
export default CalcSkeleton;
