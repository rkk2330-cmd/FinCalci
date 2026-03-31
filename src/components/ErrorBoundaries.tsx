import { forceReload } from '../utils/router';
// FinCalci — Error boundaries (3-tier system) with proper TypeScript typing
// Tier 1: AppErrorBoundary — wraps entire app, last-resort safety net
// Tier 2: SectionBoundary — wraps each tab (home, history, settings, calculator view)
// Tier 3: CalcWrapper — wraps individual calculator (separate file)
import React from 'react';
import { tokens } from '../design/tokens';

// ─── Style constants (created once, never recreated on render) ───
const S: Record<string, React.CSSProperties> = {
  crashPage: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0B0F1A', color: '#F1F5F9', fontFamily: tokens.fontFamily.sans,
    padding: 32, textAlign: 'center',
  },
  crashBox: { maxWidth: 320 },
  crashIcon: { fontSize: 48, marginBottom: 16 },
  crashTitle: { fontSize: 20, fontWeight: 500, marginBottom: 8 },
  crashDesc: { fontSize: 14, color: '#94A3B8', marginBottom: 24, lineHeight: 1.6 },
  crashBtns: { display: 'flex', flexDirection: 'column', gap: 12 },
  primaryBtn: {
    padding: '12px 24px', borderRadius: 12, background: tokens.color.primary,
    border: 'none', color: '#0B0F1A', fontWeight: 500, fontSize: 16,
    cursor: 'pointer', fontFamily: tokens.fontFamily.sans,
  },
  ghostBtn: {
    padding: '10px 24px', borderRadius: 12, background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)', color: '#94A3B8',
    fontWeight: 500, fontSize: 14, cursor: 'pointer', fontFamily: tokens.fontFamily.sans,
  },
  dangerBtn: {
    padding: '10px 20px', borderRadius: 10, background: '#EF444415',
    border: '1px solid #EF444430', color: '#EF4444',
    fontWeight: 500, fontSize: 14, cursor: 'pointer', fontFamily: tokens.fontFamily.sans,
  },
  confirmBox: {
    padding: 16, borderRadius: 12, background: '#1A2332',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  confirmText: { fontSize: 13, color: '#94A3B8', marginBottom: 12, lineHeight: 1.5 },
  confirmBtns: { display: 'flex', gap: 8 },
  sectionWrap: { padding: 40, textAlign: 'center' as const },
  sectionIcon: { fontSize: 40, marginBottom: 12 },
  sectionBtns: { display: 'flex', gap: 10, justifyContent: 'center' },
};

// ─── Tier 1: App-level boundary ───
interface AppBoundaryState { hasError: boolean; error: Error | null; showClearConfirm: boolean }

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, AppBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, showClearConfirm: false };
  }

  static getDerivedStateFromError(error: Error): Partial<AppBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[FinCalci] App crash:", error, info.componentStack);
    // Sentry-ready: if (window.Sentry) window.Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={S.crashPage}>
          <div style={S.crashBox}>
            <div style={S.crashIcon}>⚠️</div>
            <div style={S.crashTitle}>FinCalci crashed</div>
            <div style={S.crashDesc}>
              Something unexpected happened. Your data is safe — try reloading.
            </div>
            <div style={S.crashBtns}>
              <button onClick={() => forceReload()} style={S.primaryBtn}>
                Reload app
              </button>
              {!this.state.showClearConfirm ? (
                <button onClick={() => this.setState({ showClearConfirm: true })} style={S.ghostBtn}>
                  Clear data & reload
                </button>
              ) : (
                <div style={S.confirmBox}>
                  <div style={S.confirmText}>
                    This will clear all saved data (history, Khata, expenses). Are you sure?
                  </div>
                  <div style={S.confirmBtns}>
                    <button onClick={() => {
                      try { localStorage.clear(); } catch { /* storage locked during crash — reload anyway */ }
                      forceReload();
                    }} style={S.dangerBtn}>
                      Yes, clear everything
                    </button>
                    <button onClick={() => this.setState({ showClearConfirm: false })} style={S.ghostBtn}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Tier 2: Section-level boundary ───
interface SectionProps { children: React.ReactNode; t?: Record<string, string>; onGoHome?: () => void }
interface SectionState { hasError: boolean }

export class SectionBoundary extends React.Component<SectionProps, SectionState> {
  constructor(props: SectionProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SectionState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[FinCalci] Section error:", error.message);
    // Sentry-ready: if (window.Sentry) window.Sentry.captureException(error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      const t = this.props.t || { textMuted: '#94A3B8', textDim: '#4B5563', card: '#111827', border: 'rgba(255,255,255,0.08)' };
      const retryBtn: React.CSSProperties = {
        padding: '10px 20px', borderRadius: tokens.radius.sm,
        background: `${tokens.color.primary}15`, border: `1px solid ${tokens.color.primary}30`,
        color: tokens.color.primary, fontWeight: 500, fontSize: 14,
        cursor: 'pointer', fontFamily: tokens.fontFamily.sans,
      };
      const homeBtn: React.CSSProperties = {
        padding: '10px 20px', borderRadius: tokens.radius.sm,
        background: t.card, border: `1px solid ${t.border}`,
        color: t.textMuted, fontWeight: 500, fontSize: 14,
        cursor: 'pointer', fontFamily: tokens.fontFamily.sans,
      };
      return (
        <div style={S.sectionWrap}>
          <div style={S.sectionIcon}>🔧</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: t.textMuted, marginBottom: 8 }}>
            This section hit an error
          </div>
          <div style={{ fontSize: 13, color: t.textDim, marginBottom: 20 }}>
            Other parts of the app still work fine.
          </div>
          <div style={S.sectionBtns}>
            <button onClick={() => this.setState({ hasError: false })} style={retryBtn}>Retry</button>
            {this.props.onGoHome && (
              <button onClick={this.props.onGoHome} style={homeBtn}>Go home</button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
