// FinCalci — Tier 3 Error Boundary: wraps individual calculator
// Catches: render errors, lazy import failures, useEffect errors
// Does NOT catch: event handler errors (React limitation — use try-catch in handlers)
//
// Features:
//   - Shows WHICH calculator crashed (calcLabel prop)
//   - "Try Again" forces remount via key increment (fixes React.lazy cached failure)
//   - "Go Home" navigates away from broken calculator
//   - Retry limit: after 3 retries, only shows Go Home
import React from 'react';
import { tokens } from '../design/tokens';
import { FA } from '../utils/firebase';

const MAX_RETRIES = 3;

interface CalcWrapperProps {
  children: React.ReactNode;
  t?: Record<string, string>;
  onGoHome?: () => void;
  calcLabel?: string;
  calcId?: string;
}

interface CalcWrapperState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  retryKey: number;
}

export class CalcWrapper extends React.Component<CalcWrapperProps, CalcWrapperState> {
  constructor(props: CalcWrapperProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0, retryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[FinCalci] Calc crash (${this.props.calcId}):`, error.message);
    FA.track('error_boundary_catch', {
      calc_id: this.props.calcId || 'unknown',
      error_name: error?.name || 'Error',
      error_msg: (error?.message || '').slice(0, 100),
    });
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
      retryKey: prev.retryKey + 1,
    }));
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, retryCount: 0, retryKey: 0 });
    if (this.props.onGoHome) this.props.onGoHome();
  };

  render() {
    if (this.state.hasError) {
      const t = this.props.t || { text: '#F1F5F9', textMuted: '#94A3B8', textDim: '#4B5563', card: '#111827', border: 'rgba(255,255,255,0.08)' };
      const calcLabel = this.props.calcLabel || 'Calculator';
      const canRetry = this.state.retryCount < MAX_RETRIES;
      const isChunkError = this.state.error?.message?.includes('Loading chunk') ||
                           this.state.error?.message?.includes('Failed to fetch') ||
                           this.state.error?.name === 'ChunkLoadError';

      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{isChunkError ? '📡' : '⚠️'}</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6, color: t.text }}>
            {isChunkError ? `Couldn't load ${calcLabel}` : `${calcLabel} hit an error`}
          </div>
          <div style={{ fontSize: 13, color: t.textDim, marginBottom: 20, lineHeight: 1.6 }}>
            {isChunkError
              ? 'Check your internet connection and try again.'
              : 'Your data is safe. Try again or go back to home.'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {canRetry && (
              <button onClick={this.handleRetry} aria-label="Retry calculator"
                style={{ padding: '10px 20px', borderRadius: tokens.radius.md, background: `${tokens.color.primary}15`, border: `1px solid ${tokens.color.primary}30`, color: tokens.color.primary, fontWeight: 500, fontSize: 14, cursor: 'pointer', fontFamily: tokens.fontFamily.sans }}>
                Try again {this.state.retryCount > 0 ? `(${MAX_RETRIES - this.state.retryCount} left)` : ''}
              </button>
            )}
            <button onClick={this.handleGoHome} aria-label="Go to home screen"
              style={{ padding: '10px 20px', borderRadius: tokens.radius.md, background: t.card, border: `1px solid ${t.border}`, color: t.textMuted, fontWeight: 500, fontSize: 14, cursor: 'pointer', fontFamily: tokens.fontFamily.sans }}>
              Go home
            </button>
          </div>
          {!canRetry && (
            <div style={{ fontSize: 12, color: t.textDim, marginTop: 16 }}>
              Retry limit reached. Try reloading the app.
            </div>
          )}
        </div>
      );
    }

    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

export default CalcWrapper;
