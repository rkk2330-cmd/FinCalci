// FinCalci — Design tokens v3 (Bold Fintech: CRED × PhonePe)
// Every visual value in the app comes from here.
// Change a token → entire app updates consistently.

import type { DesignTokens } from '../types';

export const tokens: DesignTokens = {
  color: {
    // Brand — Bold Fintech palette
    primary: '#10B981',        // emerald — CTAs, positive values, brand identity
    primaryDim: '#10B98118',   // emerald at 9% opacity — backgrounds
    secondary: '#6366F1',      // indigo — charts, secondary data, accents
    secondaryDim: '#6366F118',
    danger: '#EF4444',         // red — errors, negative values only
    dangerDim: '#EF444412',
    success: '#34D399',        // mint — positive change indicators
    successDim: '#34D39912',
    warning: '#F59E0B',        // amber — warnings, cached data badges
    warningDim: '#F59E0B12',
  },

  fontSize: {
    hero: 34,     // big answer (₹43,391) — JetBrains Mono
    title: 20,    // screen titles
    body: 14,     // labels, body text
    small: 13,    // secondary info, section titles
    caption: 11,  // disclaimers, timestamps — minimum size
  },

  fontWeight: {
    regular: 400, // body, labels
    medium: 500,  // titles, hero numbers — only 2 weights
  },

  fontFamily: {
    sans: "'Inter', 'system-ui', '-apple-system', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },

  space: {
    xs: 4,   // inline gaps, tight internal padding
    sm: 8,   // between related items
    md: 12,  // component internal padding
    lg: 16,  // card padding, input padding
    xl: 24,  // section gaps
    xxl: 32, // screen padding, major section breaks
  },

  radius: {
    sm: 8,    // buttons, badges, small pills
    md: 12,   // cards, inputs
    lg: 16,   // large cards, modals
    xl: 20,   // hero cards, floating nav
    pill: 999, // fully rounded pills
  },

  shadow: {
    subtle: '0 2px 8px rgba(0,0,0,0.04)',     // cards (light mode)
    medium: '0 4px 16px rgba(0,0,0,0.08)',     // floating elements
    heavy: '0 8px 32px rgba(0,0,0,0.16)',      // modals, popups
  },
};

// ─── Category colors (locked from plan) ───
export const CATEGORY_COLORS = {
  finance: '#10B981',  // emerald
  business: '#F59E0B', // amber
  health: '#F43F5E',   // rose
  utility: '#3B82F6',  // blue
} as const;

// ─── Semantic color helpers ───
export const colorAlpha = (hex: string, alpha: number): string => {
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return hex.replace(/[0-9a-f]{2}$/i, '') + alphaHex;
};

// ─── CSS custom properties injection ───
export const tokensToCSS = (): string => `
  --fc-primary: ${tokens.color.primary};
  --fc-secondary: ${tokens.color.secondary};
  --fc-danger: ${tokens.color.danger};
  --fc-success: ${tokens.color.success};
  --fc-warning: ${tokens.color.warning};
  --fc-font-sans: ${tokens.fontFamily.sans};
  --fc-font-mono: ${tokens.fontFamily.mono};
  --fc-radius-sm: ${tokens.radius.sm}px;
  --fc-radius-md: ${tokens.radius.md}px;
  --fc-radius-lg: ${tokens.radius.lg}px;
  --fc-shadow-subtle: ${tokens.shadow.subtle};
  --fc-shadow-medium: ${tokens.shadow.medium};
  --fc-shadow-heavy: ${tokens.shadow.heavy};
`;
