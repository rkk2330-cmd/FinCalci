// FinCalci — Premium theme system (CRED × PhonePe)
// Dark: #0F0F13 base with warm tint — elevation through lighter shades
// Light: #F5F5F7 base — shadows instead of borders

import type { Theme } from '../types';
import { tokens } from './tokens';

export type ThemeMode = 'dark' | 'light';

// ─── CRED-inspired dark theme ───
const darkTheme: Theme = {
  bg: '#0F0F13',                              // true dark with slight warm tint
  card: '#1A1A24',                            // subtle depth
  cardAlt: '#222230',                         // elevated surface
  border: 'rgba(255,255,255,0.06)',           // barely visible
  text: '#E8E8ED',                            // primary text (warm white)
  textMuted: '#8B8B9E',                       // secondary text
  textDim: '#55556B',                         // tertiary/hint text
  inputBg: '#1A1A24',                         // input background
  navBg: 'rgba(15,15,19,0.92)',              // floating nav backdrop
  shadow: '0 -2px 20px rgba(0,0,0,0.5)',     // nav shadow
};

// ─── Clean fintech light theme ───
const lightTheme: Theme = {
  bg: '#F5F5F7',                              // warm grey
  card: '#FFFFFF',                            // pure white cards
  cardAlt: '#ECECF0',                         // secondary surface
  border: 'transparent',                      // no borders in light — use shadows
  text: '#1A1A2E',                            // near-black text
  textMuted: '#6B6B80',                       // secondary text
  textDim: '#9B9BAE',                         // tertiary/hint text
  inputBg: '#FFFFFF',                         // input background
  navBg: 'rgba(245,245,247,0.92)',           // floating nav backdrop
  shadow: '0 -1px 12px rgba(0,0,0,0.04)',    // nav shadow
};

// ─── Theme factory ───
export const mkTheme = (mode: ThemeMode): Theme => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

// ─── Accent colors (user selectable) ───
export const ACCENT_COLORS = [
  { id: 'emerald', color: '#10B981', label: 'Emerald' },
  { id: 'indigo', color: '#6366F1', label: 'Indigo' },
  { id: 'rose', color: '#F43F5E', label: 'Rose' },
  { id: 'violet', color: '#A78BFA', label: 'Violet' },
  { id: 'amber', color: '#F59E0B', label: 'Amber' },
  { id: 'sky', color: '#38BDF8', label: 'Sky' },
  { id: 'coral', color: '#FF6B6B', label: 'Coral' },
  { id: 'lime', color: '#84CC16', label: 'Lime' },
] as const;

export type AccentId = typeof ACCENT_COLORS[number]['id'];

/** Get accent hex by id (with fallback to emerald) */
export const getAccent = (id: string): string => {
  return ACCENT_COLORS.find(a => a.id === id)?.color ?? tokens.color.primary;
};

// ─── Common inline style factories ───

/** Card style — elevated surface */
export const cardStyle = (t: Theme): React.CSSProperties => ({
  background: t.card,
  borderRadius: tokens.radius.lg,
  padding: tokens.space.lg,
  border: t.border === 'transparent' ? 'none' : `0.5px solid ${t.border}`,
  boxShadow: t.border === 'transparent' ? tokens.shadow.subtle : 'none',
});

/** Glass card style — frosted backdrop for hero results in dark mode */
export const glassStyle = (t: Theme): React.CSSProperties => ({
  background: `${t.card}B3`, // 70% opacity
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: tokens.radius.xl,
  border: `1px solid rgba(255,255,255,0.08)`,
});

/** Input style — consistent across all calculators */
export const inputStyle = (t: Theme): React.CSSProperties => ({
  width: '100%',
  padding: `${tokens.space.md}px ${tokens.space.lg}px`,
  borderRadius: tokens.radius.md,
  border: t.border === 'transparent' ? 'none' : `1px solid ${t.border}`,
  boxShadow: t.border === 'transparent' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
  background: t.inputBg,
  color: t.text,
  fontSize: tokens.fontSize.body,
  fontFamily: tokens.fontFamily.sans,
  outline: 'none',
  transition: 'box-shadow 0.2s, border-color 0.2s',
});

/** Tab button style */
export const tabStyle = (active: boolean, color: string, t: Theme): React.CSSProperties => ({
  padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
  borderRadius: tokens.radius.sm,
  flex: 1, minWidth: 0, textAlign: 'center' as const,
  background: active ? `${color}15` : 'transparent',
  border: 'none',
  color: active ? color : t.textMuted,
  fontWeight: tokens.fontWeight.medium,
  fontSize: tokens.fontSize.small,
  cursor: 'pointer',
  fontFamily: tokens.fontFamily.sans,
  transition: 'all 0.2s ease',
  ...(active ? { boxShadow: `0 1px 4px ${color}20` } : {}),
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
