// @ts-nocheck — TODO: add strict types
// FinCalci — UI state components: EmptyState, InlineError, OfflineBanner
import React from 'react';
import { tokens } from '../design/tokens';

// ─── Empty state: shown when a list/section has no data ───
function EmptyStateInner({ icon = '📋', message, action, onAction, t }) {
  return (
    <div style={{ textAlign: 'center', padding: `${tokens.space.xxl}px ${tokens.space.lg}px` }}>
      <div style={{ fontSize: 40, marginBottom: tokens.space.md }}>{icon}</div>
      <div style={{ fontSize: tokens.fontSize.small, color: t?.textMuted || '#94A3B8', marginBottom: action ? tokens.space.lg : 0, lineHeight: 1.6 }}>{message}</div>
      {action && onAction && (
        <button onClick={onAction} style={{
          padding: `${tokens.space.sm}px ${tokens.space.lg}px`, borderRadius: tokens.radius.sm,
          background: `${tokens.color.primary}15`, border: `1px solid ${tokens.color.primary}30`,
          color: tokens.color.primary, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small,
          cursor: 'pointer', fontFamily: tokens.fontFamily.sans,
        }}>{action}</button>
      )}
    </div>
  );
}

// ─── Inline error: shown when an API call or operation fails ───
function InlineErrorInner({ message, onRetry, t }) {
  return (
    <div style={{
      background: `${tokens.color.danger}08`, border: `1px solid ${tokens.color.danger}20`,
      borderRadius: tokens.radius.md, padding: `${tokens.space.md}px ${tokens.space.lg}px`,
      marginBottom: tokens.space.md, display: 'flex', alignItems: 'center', gap: tokens.space.md,
    }}>
      <div style={{ fontSize: tokens.fontSize.caption, color: tokens.color.danger, flex: 1, lineHeight: 1.5 }}>
        {message || 'Something went wrong'}
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{
          padding: `${tokens.space.xs}px ${tokens.space.md}px`, borderRadius: tokens.radius.sm,
          background: `${tokens.color.danger}15`, border: `1px solid ${tokens.color.danger}30`,
          color: tokens.color.danger, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.caption,
          cursor: 'pointer', flexShrink: 0, fontFamily: tokens.fontFamily.sans,
        }}>Retry</button>
      )}
    </div>
  );
}

// ─── Offline banner: shown at top when user loses connection ───
function OfflineBannerInner({ isOnline, t }) {
  if (isOnline) return null;
  return (
    <div style={{
      background: `${tokens.color.warning}12`, border: `1px solid ${tokens.color.warning}25`,
      borderRadius: tokens.radius.md, padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
      marginBottom: tokens.space.md, textAlign: 'center',
      fontSize: tokens.fontSize.caption, color: tokens.color.warning, fontWeight: tokens.fontWeight.medium,
    }}>
      📴 You're offline — calculators work, live rates won't update
    </div>
  );
}

// ─── Loading spinner: small inline spinning indicator ───
function LoadingSpinnerInner({ size = 20, color }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid rgba(255,255,255,0.1)`,
      borderTopColor: color || tokens.color.primary,
      animation: 'spin 0.8s linear infinite',
      display: 'inline-block',
    }} />
  );
}

// ─── Rate status badge: shows live/cached/offline state ───
function RateBadgeInner({ status, error, t }) {
  const cfg = {
    live: { bg: `${tokens.color.success}15`, color: tokens.color.success, text: '● Live rates' },
    cached: { bg: `${tokens.color.warning}15`, color: tokens.color.warning, text: '● Cached rates' },
    loading: { bg: `${t?.cardAlt || '#1A2332'}`, color: t?.textDim || '#4B5563', text: '◌ Loading...' },
    offline: { bg: `${tokens.color.danger}10`, color: tokens.color.danger, text: '○ Offline (static rates)' },
    error: { bg: `${tokens.color.danger}10`, color: tokens.color.danger, text: error || '⚠️ API error' },
  };
  const c = cfg[status] || cfg.offline;
  return (
    <div style={{
      display: 'inline-block', padding: `${tokens.space.xs}px ${tokens.space.md}px`,
      borderRadius: tokens.radius.pill, background: c.bg, border: `1px solid ${c.color}25`,
      fontSize: tokens.fontSize.caption - 1, color: c.color, fontWeight: tokens.fontWeight.medium,
    }}>{c.text}</div>
  );
}

export const EmptyState = React.memo(EmptyStateInner);
export const InlineError = React.memo(InlineErrorInner);
export const OfflineBanner = React.memo(OfflineBannerInner);
export const LoadingSpinner = React.memo(LoadingSpinnerInner);
export const RateBadge = React.memo(RateBadgeInner);
