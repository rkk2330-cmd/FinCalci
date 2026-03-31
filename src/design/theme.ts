// FinCalci — Premium theme system
// Dark: Bloomberg-meets-CRED (#0B0F1A base)
// Light: clean fintech (#F8FAFC base)

import type { Theme } from '../types';
import { tokens } from './tokens';

export type ThemeMode = 'dark' | 'light';

// ─── Premium dark theme ───
const darkTheme: Theme = {
  bg: '#0B0F1A',                              // near-black (not navy like before)
  card: '#111827',                             // elevated surface
  cardAlt: '#1A2332',                          // secondary surface
  border: 'rgba(255,255,255,0.08)',            // subtle 8% white borders
  text: '#F1F5F9',                             // primary text (slightly warm white)
  textMuted: '#94A3B8',                        // secondary text
  textDim: '#4B5563',                          // tertiary/hint text
  inputBg: '#1A2332',                          // input background
  navBg: 'rgba(11,15,26,0.95)',               // floating nav backdrop
  shadow: '0 -4px 30px rgba(0,0,0,0.5)',       // nav shadow
};

// ─── Premium light theme ───
const lightTheme: Theme = {
  bg: '#F8FAFC',                               // cool off-white
  card: '#FFFFFF',                              // pure white cards
  cardAlt: '#F1F5F9',                           // secondary surface
  border: 'rgba(0,0,0,0.08)',                  // subtle 8% black borders
  text: '#0F172A',                              // near-black text
  textMuted: '#64748B',                         // secondary text
  textDim: '#94A3B8',                           // tertiary/hint text
  inputBg: '#F1F5F9',                           // input background
  navBg: 'rgba(248,250,252,0.95)',             // floating nav backdrop
  shadow: '0 -4px 30px rgba(0,0,0,0.06)',      // nav shadow
};

// ─── Theme factory ───
export const mkTheme = (mode: ThemeMode): Theme => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

// ─── Accent colors (user selectable — used for primary CTA only) ───
export const ACCENT_COLORS = [
  { id: 'teal', color: '#4ECDC4', label: 'Teal' },
  { id: 'indigo', color: '#6366F1', label: 'Indigo' },
  { id: 'coral', color: '#FF6B6B', label: 'Coral' },
  { id: 'violet', color: '#A78BFA', label: 'Violet' },
  { id: 'amber', color: '#F59E0B', label: 'Amber' },
  { id: 'sky', color: '#38BDF8', label: 'Sky' },
  { id: 'rose', color: '#F472B6', label: 'Rose' },
  { id: 'lime', color: '#84CC16', label: 'Lime' },
] as const;

export type AccentId = typeof ACCENT_COLORS[number]['id'];

/** Get accent hex by id (with fallback to teal) */
export const getAccent = (id: string): string => {
  return ACCENT_COLORS.find(a => a.id === id)?.color ?? tokens.color.primary;
};

// ─── Common inline style factories (reduces repetition in JSX) ───

/** Card style — elevated surface with subtle shadow */
export const cardStyle = (t: Theme): React.CSSProperties => ({
  background: t.card,
  borderRadius: tokens.radius.lg,
  padding: tokens.space.lg,
  border: `0.5px solid ${t.border}`,
  boxShadow: tokens.shadow.subtle,
});

/** Glass card style — frosted backdrop for tiles */
export const glassStyle = (t: Theme): React.CSSProperties => ({
  background: `${t.card}CC`, // 80% opacity
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: tokens.radius.lg,
  border: `0.5px solid ${t.border}`,
});

/** Input style — consistent across all calculators */
export const inputStyle = (t: Theme): React.CSSProperties => ({
  width: '100%',
  padding: `${tokens.space.md}px ${tokens.space.lg}px`,
  borderRadius: tokens.radius.md,
  border: `1px solid ${t.border}`,
  background: t.inputBg,
  color: t.text,
  fontSize: tokens.fontSize.body,
  fontFamily: tokens.fontFamily.sans,
  outline: 'none',
  transition: 'border-color 0.2s',
});

/** Tab button style */
export const tabStyle = (active: boolean, color: string, t: Theme): React.CSSProperties => ({
  padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
  borderRadius: tokens.radius.sm,
  flex: 1, minWidth: 0, textAlign: 'center' as const,
  background: active ? `${color}15` : t.cardAlt,
  border: `1px solid ${active ? `${color}30` : t.border}`,
  color: active ? color : t.textMuted,
  fontWeight: tokens.fontWeight.medium,
  fontSize: tokens.fontSize.small,
  cursor: 'pointer',
  fontFamily: tokens.fontFamily.sans,
  transition: 'all 0.2s',
});

/** Hero number style — the big answer display */
export const heroStyle = (color?: string): React.CSSProperties => ({
  fontSize: tokens.fontSize.hero,
  fontWeight: tokens.fontWeight.medium,
  fontFamily: tokens.fontFamily.mono,
  color: color,
  lineHeight: 1.2,
  textAlign: 'center' as const,
});

/** Label style — subtle text above values */
export const labelStyle = (t: Theme): React.CSSProperties => ({
  fontSize: tokens.fontSize.caption,
  color: t.textDim,
  fontWeight: tokens.fontWeight.regular,
  fontFamily: tokens.fontFamily.sans,
  marginBottom: tokens.space.xs,
});

/** Metric card style — small sub-value cards in 2-col grid */
export const metricStyle = (t: Theme): React.CSSProperties => ({
  padding: `${tokens.space.md}px ${tokens.space.lg}px`,
  borderRadius: tokens.radius.md,
  background: t.cardAlt,
});

/** Section gap */
export const sectionGap: React.CSSProperties = {
  marginBottom: tokens.space.xl,
};
