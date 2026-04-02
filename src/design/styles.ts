// FinCalci — Style factories (Bold Fintech)
// Static styles are module-level constants — created once, never recreated.
// Dynamic styles use factory functions that return CSSProperties.
import type { CSSProperties } from 'react';
import { tokens } from './tokens';

type T = Record<string, string>; // Theme object shape

// ─── Layout ───
export const FLEX_CENTER: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
export const FLEX_COL: CSSProperties = { display: 'flex', flexDirection: 'column' };
export const FLEX_ROW: CSSProperties = { display: 'flex', flexDirection: 'row', alignItems: 'center' };
export const FLEX_BETWEEN: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
export const TEXT_CENTER: CSSProperties = { textAlign: 'center' };

// ─── Typography ───
export const FONT_SANS: CSSProperties = { fontFamily: tokens.fontFamily.sans };
export const FONT_MONO: CSSProperties = { fontFamily: tokens.fontFamily.mono };
export const TEXT_CAPTION: CSSProperties = { fontSize: tokens.fontSize.caption, fontFamily: tokens.fontFamily.sans };
export const TEXT_BODY: CSSProperties = { fontSize: tokens.fontSize.body, fontFamily: tokens.fontFamily.sans };
export const TEXT_TITLE: CSSProperties = { fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.medium, fontFamily: tokens.fontFamily.sans };

// ─── Section header — 13px uppercase ───
export const sectionHeader = (t: T): CSSProperties => ({
  fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium,
  color: t.textMuted, marginBottom: tokens.space.md,
  textTransform: 'uppercase' as const, letterSpacing: 0.8,
});

// ─── Card factories (theme-dependent — use in useMemo) ───
export const card = (t: T): CSSProperties => ({
  background: t.card, borderRadius: tokens.radius.xl,
  padding: tokens.space.xl,
  border: t.border === 'transparent' ? 'none' : `1px solid ${t.border}`,
  boxShadow: t.border === 'transparent' ? tokens.shadow.subtle : 'none',
});

export const cardAlt = (t: T): CSSProperties => ({
  background: t.cardAlt, borderRadius: tokens.radius.md,
  padding: tokens.space.md,
  border: t.border === 'transparent' ? 'none' : `1px solid ${t.border}`,
});

// ─── Glassmorphism hero card (dark mode result display) ───
export const glassHero = (color: string, t: T): CSSProperties => ({
  background: t.bg === '#0F0F13'
    ? `linear-gradient(135deg, ${color}12, ${t.card}E6)`
    : `linear-gradient(135deg, ${color}08, ${t.card})`,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: tokens.radius.xl,
  border: `1px solid ${color}20`,
  padding: `${tokens.space.xl}px ${tokens.space.lg}px`,
  textAlign: 'center' as const,
  position: 'relative' as const,
  overflow: 'hidden' as const,
});

// ─── Button factories ───
export const btnPrimary = (color: string): CSSProperties => ({
  padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
  borderRadius: tokens.radius.md, background: `${color}15`,
  border: `1px solid ${color}30`, color,
  fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small,
  cursor: 'pointer', fontFamily: tokens.fontFamily.sans,
  transition: 'all 0.2s ease',
});

export const btnGhost = (t: T): CSSProperties => ({
  padding: `${tokens.space.sm}px ${tokens.space.md}px`,
  borderRadius: tokens.radius.md, background: t.cardAlt,
  border: t.border === 'transparent' ? 'none' : `1px solid ${t.border}`,
  boxShadow: t.border === 'transparent' ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
  color: t.textMuted,
  fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small,
  cursor: 'pointer', fontFamily: tokens.fontFamily.sans,
});

export const btnIcon = (t: T, size = 36): CSSProperties => ({
  width: size, height: size, borderRadius: tokens.radius.sm,
  background: t.card,
  border: t.border === 'transparent' ? 'none' : `1px solid ${t.border}`,
  boxShadow: t.border === 'transparent' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
  cursor: 'pointer', fontSize: 15,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'transform 0.15s ease',
});

export const btnDanger = (): CSSProperties => ({
  padding: `${tokens.space.xs}px ${tokens.space.md}px`,
  borderRadius: tokens.radius.sm, background: `${tokens.color.danger}15`,
  border: `1px solid ${tokens.color.danger}30`, color: tokens.color.danger,
  fontSize: tokens.fontSize.caption, cursor: 'pointer',
});

// ─── Input factories ───
export const inputStyle = (t: T): CSSProperties => ({
  width: '100%', padding: `${tokens.space.sm}px ${tokens.space.md}px`,
  borderRadius: tokens.radius.md, background: t.cardAlt,
  border: t.border === 'transparent' ? 'none' : `1px solid ${t.border}`,
  boxShadow: t.border === 'transparent' ? 'inset 0 1px 2px rgba(0,0,0,0.04)' : 'none',
  color: t.text,
  fontSize: tokens.fontSize.body, fontFamily: tokens.fontFamily.sans,
  outline: 'none',
});

export const inputMono = (t: T): CSSProperties => ({
  ...inputStyle(t), fontFamily: tokens.fontFamily.mono, textAlign: 'right' as const,
});

// ─── Tab bar ───
export const tabBar = (t: T): CSSProperties => ({
  display: 'flex', gap: 2, padding: 3, borderRadius: tokens.radius.lg,
  background: t.cardAlt,
});

export const tab = (active: boolean, t: T, color: string): CSSProperties => ({
  flex: 1, padding: `${tokens.space.sm}px ${tokens.space.md}px`,
  borderRadius: tokens.radius.md, border: 'none', cursor: 'pointer',
  fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.caption,
  fontFamily: tokens.fontFamily.sans, transition: 'all 0.2s ease',
  ...(active
    ? { background: `${color}18`, color, boxShadow: `0 1px 4px ${color}15` }
    : { background: 'transparent', color: t.textDim }
  ),
});

// ─── Metric box ───
export const metricBox = (t: T): CSSProperties => ({
  padding: tokens.space.md, borderRadius: tokens.radius.md,
  background: t.cardAlt,
});

// ─── Toast ───
export const TOAST: CSSProperties = {
  position: 'fixed', bottom: 80, left: '50%', transform: 'translate(-50%,0)',
  padding: '10px 22px', borderRadius: tokens.radius.lg,
  fontSize: tokens.fontSize.caption, fontWeight: tokens.fontWeight.medium,
  fontFamily: tokens.fontFamily.sans, zIndex: 100,
  boxShadow: tokens.shadow.heavy, whiteSpace: 'nowrap',
};

// ─── Dot indicator ───
export const dot = (color: string, size = 8): CSSProperties => ({
  display: 'inline-block', width: size, height: size,
  borderRadius: size / 2, background: color, marginRight: 4,
});

// ─── Grid ───
export const GRID_2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };
export const GRID_3: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 };
export const GRID_4: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 };

// ─── Spacing helpers ───
export const mb = (n: number): CSSProperties => ({ marginBottom: n });
export const mt = (n: number): CSSProperties => ({ marginTop: n });
export const px = (n: number): CSSProperties => ({ paddingLeft: n, paddingRight: n });
export const py = (n: number): CSSProperties => ({ paddingTop: n, paddingBottom: n });

// ─── High-frequency patterns ───

/** Caption text in dim color */
export const textDim = (t: T): CSSProperties => ({
  fontSize: tokens.fontSize.caption, color: t.textDim,
});

/** Caption text in muted color */
export const textMuted = (t: T): CSSProperties => ({
  fontSize: tokens.fontSize.caption, color: t.textMuted,
});

/** Label: small, medium weight */
export const textLabel = (t: T): CSSProperties => ({
  fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: t.text,
});

/** Hint text under inputs */
export const textHint = (t: T): CSSProperties => ({
  fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: 'center' as const,
  marginTop: tokens.space.xs,
});

/** Tab bar container */
export const TAB_BAR: CSSProperties = {
  display: 'flex', gap: tokens.space.xs, marginBottom: tokens.space.xl,
};

/** Section spacing */
export const SECTION_GAP: CSSProperties = { marginBottom: tokens.space.lg };
export const SECTION_GAP_SM: CSSProperties = { marginBottom: tokens.space.md };

/** Flex row with small gap */
export const ROW_XS: CSSProperties = { display: 'flex', gap: tokens.space.xs, marginBottom: tokens.space.md };
export const ROW_SM: CSSProperties = { display: 'flex', gap: tokens.space.sm, marginBottom: tokens.space.md };
export const ROW_BETWEEN: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };

/** Full-width action button */
export const btnFull = (color: string, t: T): CSSProperties => ({
  width: '100%', padding: tokens.space.md, borderRadius: tokens.radius.md,
  background: `${color}15`, border: `1px solid ${color}30`, color,
  fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small,
  cursor: 'pointer', fontFamily: tokens.fontFamily.sans,
  transition: 'all 0.2s ease',
});

/** Delete/remove link button */
export const BTN_LINK_DANGER: CSSProperties = {
  background: 'none', border: 'none', color: tokens.color.danger,
  cursor: 'pointer', fontSize: tokens.fontSize.caption, padding: tokens.space.xs,
};

/** Empty state container */
export const emptyState = (t: T): CSSProperties => ({
  textAlign: 'center' as const, padding: tokens.space.xxl, color: t.textDim,
});

/** Result highlight card */
export const resultCard = (color: string): CSSProperties => ({
  background: `${color}08`, border: `1px solid ${color}20`,
  borderRadius: tokens.radius.lg, padding: tokens.space.lg,
});

// ─── Common repeated patterns ───

/** Caption text in dim color — used for hints, secondary labels */
export const captionDim = (t: T): CSSProperties => ({
  fontSize: tokens.fontSize.caption, color: t.textDim,
});

/** Caption text with top margin — used for sub-labels below inputs */
export const captionDimMt = (t: T): CSSProperties => ({
  fontSize: tokens.fontSize.caption, color: t.textDim, marginTop: tokens.space.xs,
});

/** Tab bar container — horizontal flex with gap */
export const tabRow: CSSProperties = {
  display: 'flex', gap: tokens.space.xs, marginBottom: tokens.space.xl,
};

/** Tab row with smaller gap */
export const tabRowSm: CSSProperties = {
  display: 'flex', gap: tokens.space.xs, marginBottom: tokens.space.md,
};

/** Section gap — vertical spacing between calc sections */
export const sectionGap: CSSProperties = { marginTop: tokens.space.lg };
export const sectionGapSm: CSSProperties = { marginBottom: tokens.space.md };
export const sectionGapLg: CSSProperties = { marginBottom: tokens.space.lg };

/** Disclaimer text — legal fine print at bottom of calculators */
export const disclaimer = (t: T): CSSProperties => ({
  fontSize: tokens.fontSize.caption - 1, color: t.textDim,
  textAlign: 'center' as const, marginTop: tokens.space.md, lineHeight: 1.6,
});

export const DISCLAIMER: CSSProperties = {
  fontSize: tokens.fontSize.caption - 1, textAlign: 'center',
  marginTop: tokens.space.lg, lineHeight: 1.6,
};

/** Item label — small bold text (name, fund house, etc) */
export const itemTitle = (t: T): CSSProperties => ({
  fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: t.text,
});

/** Item subtitle — smaller dim text */
export const itemSubtitle = (t: T): CSSProperties => ({
  fontSize: tokens.fontSize.caption, color: t.textDim, marginTop: 2,
});

/** Muted caption — for less important info */
export const captionMuted = (t: T): CSSProperties => ({
  fontSize: tokens.fontSize.caption, color: t.textMuted,
});

/** Flex row with items centered and small gap */
export const rowCenter: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: tokens.space.sm,
};

/** Input with bottom margin — most common pattern */
export const inputMb = (t: T): CSSProperties => ({
  ...inputStyle(t), marginBottom: tokens.space.sm,
});
export const TEXT_RIGHT: CSSProperties = { textAlign: 'right' as const };
