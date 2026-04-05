import { itemTitle, captionMuted, glassHero, sectionHeader } from './design/styles';
// @ts-nocheck — TODO: add strict types
// FinCalci v1.0 — Bold Fintech UI (CRED × PhonePe)
// All logic extracted to hooks. This file is router + layout.
import React from 'react';
const { useMemo, useCallback, useState } = React;

// Hooks
import useAppState from './hooks/useAppState';
import usePreferences from './hooks/usePreferences';
import useHistory from './hooks/useHistory';
import useAnalytics from './hooks/useAnalytics';

// Components
import { AppErrorBoundary, SectionBoundary } from './components/ErrorBoundaries';
import CalcWrapper from './components/CalcWrapper';
import CrossLinks from './components/CrossLinks';
import { OfflineBanner } from './components/UIStates';
import { SectionLoader } from './components/Loader';
import { Splash, getGreeting, NAV_ICONS, CALC_CATEGORIES, MORE_TOOLS_IDS, CATEGORY_META } from './components/Splash';

// Calculators (lazy loaded)
import { CALC_MAP } from './calculators/index';

// Constants
import { CALCULATORS, ACHIEVEMENTS, getTodayTip } from './utils/constants';
import { tokens, CATEGORY_COLORS } from './design/tokens';
import { forceReload, pushTab } from './utils/router';
import { logWarn, logError } from './utils/logger';
import { NavProvider } from './context/NavContext';
import { TOAST, DISCLAIMER, FLEX_CENTER, btnIcon, btnPrimary } from './design/styles';
import { ACCENT_COLORS } from './design/theme';
import { KEYS, TIMING, LIMITS, ROUTES } from './utils/constants';

import { safeStorageGet, safeStorageSet } from './utils/storage';
import { generateShareCard, sanitize, escHtml, safeParse } from './utils/helpers';
import { vib, vibSuccess } from './utils/haptics';
import { SFX } from './utils/sound';

const NI = NAV_ICONS;

export default function FinCalci() {
  // ─── Hooks ───
  const app = useAppState();
  const prefs = usePreferences(app.showToast);
  const hist = useHistory(app.showToast);
  const analytics = useAnalytics();
  const { t } = prefs;
  const isDark = prefs.theme === 'dark';

  // ─── Derived ───
  const filtered = useMemo(() => app.search
    ? CALCULATORS.filter(c => c.label.toLowerCase().includes(app.search.toLowerCase()) || c.desc.toLowerCase().includes(app.search.toLowerCase()) || c.id.includes(app.search.toLowerCase()))
    : CALCULATORS, [app.search]);
  const ActiveComp = useMemo(() => app.active ? CALC_MAP[app.active] : null, [app.active]);
  const activeMeta = useMemo(() => CALCULATORS.find(c => c.id === app.active), [app.active]);

  // ─── Categorized calculators ───
  const categorized = useMemo(() => {
    if (app.search) return null; // show flat list when searching
    return CATEGORY_META.map(cat => ({
      ...cat,
      calcs: CALC_CATEGORIES[cat.key]
        .map(id => CALCULATORS.find(c => c.id === id))
        .filter(Boolean),
    }));
  }, [app.search]);

  // ─── More Tools (collapsible) ───
  const [showMoreTools, setShowMoreTools] = useState(false);
  const moreTools = useMemo(() =>
    MORE_TOOLS_IDS.map(id => CALCULATORS.find(c => c.id === id)).filter(Boolean),
  []);

  // ─── Take a Tour (one-time) — must be before early returns (Rules of Hooks) ───
  const [tourStep, setTourStep] = useState(() => {
    try { return localStorage.getItem('fincalci-tour-done') ? -1 : 0; } catch { return -1; }
  });
  const tourSteps = [
    { icon: "💰", title: "Your finance toolkit", desc: "18 calculators organized by category. Tap any tile to start." },
    { icon: "🔍", title: "Search anytime", desc: "The floating search bar at the bottom finds any calculator instantly." },
    { icon: "⭐", title: "Make it yours", desc: "Star your favorites, toggle dark/light mode, and pick your accent color in Settings." },
    { icon: "🚀", title: "You're all set!", desc: "FinCalci works offline too. Install it for instant access from your home screen." },
  ];
  const finishTour = () => { setTourStep(-1); try { localStorage.setItem('fincalci-tour-done', '1'); } catch {} vib(10); };
  const nextTour = () => { if (tourStep < tourSteps.length - 1) { setTourStep(tourStep + 1); vib(5); } else finishTour(); };

  // ─── Track calc open/close lifecycle ───
  const prevActive = React.useRef(null);
  React.useEffect(() => {
    if (prevActive.current && prevActive.current !== app.active) {
      analytics.trackCalcClose(prevActive.current);
    }
    if (app.active) {
      analytics.trackCalcOpen(app.active);
    }
    prevActive.current = app.active;
  }, [app.active, analytics.trackCalcOpen, analytics.trackCalcClose]);

  // ─── Track search queries (debounced) ───
  React.useEffect(() => {
    if (!app.search || app.search.length < 2) return;
    const t = setTimeout(() => {
      analytics.trackSearch(app.search, filtered.length);
    }, 500);
    return () => clearTimeout(t);
  }, [app.search, filtered.length, analytics.trackSearch]);

  // ─── Wire trackCalcUse to openCalc ───
  const openCalc = useCallback((id) => {
    app.openCalc(id);
    hist.trackCalcUse(id);
  }, [app.openCalc, hist.trackCalcUse]);

  // ─── Analytics-wrapped handlers ───
  const onSave = useCallback(() => {
    hist.handleSave(app.active, app.lastResult);
    if (app.active) analytics.trackCalcSave(app.active);
  }, [app.active, app.lastResult, hist.handleSave, analytics.trackCalcSave]);

  const onShare = useCallback(() => {
    hist.handleShare(app.active, app.lastResult);
    if (app.active) analytics.trackCalcShare(app.active, 'whatsapp');
  }, [app.active, app.lastResult, hist.handleShare, analytics.trackCalcShare]);

  const onToggleTheme = useCallback(() => {
    prefs.toggleTheme();
    analytics.trackPrefChange('theme', prefs.theme === 'dark' ? 'light' : 'dark');
  }, [prefs.toggleTheme, prefs.theme, analytics.trackPrefChange]);

  const onToggleSound = useCallback(() => {
    prefs.toggleSound();
    analytics.trackPrefChange('sound', !prefs.soundOn);
  }, [prefs.toggleSound, prefs.soundOn, analytics.trackPrefChange]);

  const onAccentChange = useCallback((color) => {
    prefs.setAccentColor(color);
    analytics.trackPrefChange('accent', color);
  }, [prefs.setAccentColor, analytics.trackPrefChange]);

  const onToggleFav = useCallback((id) => {
    prefs.toggleFav(id);
    analytics.trackPrefChange('favorite', id);
  }, [prefs.toggleFav, analytics.trackPrefChange]);

  // ─── Share card ───
  const handleShareCard = useCallback(() => {
    if (!app.lastResult || !app.active) return;
    const meta = CALCULATORS.find(c => c.id === app.active);
    const svg = generateShareCard(meta, app.lastResult, prefs.accent);
    app.setShareCardSvg(svg); vib(10);
    analytics.trackCalcShare(app.active, 'share_card');
  }, [app.lastResult, app.active, prefs.accent, analytics.trackCalcShare]);

  const downloadShareCard = useCallback(() => {
    if (!app.shareCardSvg) return;
    const blob = new Blob([app.shareCardSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "FinCalci-Result.svg";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url); SFX.ding(); app.showToast("Card downloaded! 📸");
  }, [app.shareCardSvg, app.showToast]);

  // ─── Splash ───
  if (app.splash) return <Splash onDone={() => app.setSplash(false)} />;

  // ─── Helper: light-mode card border ───
  const cardBorder = isDark ? `1px solid ${t.border}` : 'none';
  const cardShadow = isDark ? 'none' : tokens.shadow.subtle;

  // ─── RENDER ───
  return (
    <AppErrorBoundary>
      <div role="application" aria-label="FinCalci Calculator App"
        style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: tokens.fontFamily.sans, maxWidth: 480, margin: "0 auto", paddingBottom: 140, transition: "background 0.3s,color 0.3s", overflowX: "hidden" }}>

        {/* Skip nav for keyboard users */}
        <a href="#main-content" style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }} onFocus={e => { (e.target as HTMLElement).style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;padding:12px;background:#10B981;color:#000;text-align:center;font-weight:500"; }}>Skip to content</a>

        <style>{`*{box-sizing:border-box;margin:0;padding:0}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}input[type=number]{-moz-appearance:textfield}
input[type=range]{-webkit-appearance:none;appearance:none}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:${tokens.shadow.medium};cursor:pointer;margin-top:-8px}
input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:${tokens.shadow.medium};cursor:pointer;border:none}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes pop{0%{transform:scale(0.97)}60%{transform:scale(1.01)}100%{transform:scale(1)}}
@keyframes toastIn{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes achIn{from{opacity:0;transform:translate(-50%,-20px) scale(0.95)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fcSpin{to{transform:rotate(360deg)}}
@keyframes fcShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes glow{0%{box-shadow:0 0 8px rgba(16,185,129,0.15)}50%{box-shadow:0 0 20px rgba(16,185,129,0.3)}100%{box-shadow:0 0 8px rgba(16,185,129,0.15)}}
@keyframes fadeScale{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
.ch{transition:transform 0.15s cubic-bezier(0.2,0,0,1);-webkit-tap-highlight-color:transparent;touch-action:manipulation;user-select:none;-webkit-user-select:none}.ch:active{transform:scale(0.96)}
select{-webkit-appearance:none}::-webkit-scrollbar{width:0;height:0}
.hscroll{overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}.hscroll::-webkit-scrollbar{display:none}
button{-webkit-tap-highlight-color:transparent;touch-action:manipulation;font-family:${tokens.fontFamily.sans}}
@media(prefers-reduced-motion:reduce){*{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}`}</style>

        {/* Take a Tour overlay */}
        {tourStep >= 0 && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: tokens.space.xl, backdropFilter: "blur(6px)" }}
            onClick={e => { if (e.target === e.currentTarget) finishTour(); }}>
            <div style={{ background: isDark ? t.card : '#FFFFFF', borderRadius: tokens.radius.xl, padding: `${tokens.space.xxl}px ${tokens.space.xl}px`, width: "100%", maxWidth: 320, textAlign: "center", animation: "fadeScale 0.3s both", boxShadow: tokens.shadow.heavy }}>
              <div style={{ fontSize: 48, marginBottom: tokens.space.lg }}>{tourSteps[tourStep].icon}</div>
              <div style={{ fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.medium, color: t.text, marginBottom: tokens.space.sm }}>{tourSteps[tourStep].title}</div>
              <div style={{ fontSize: tokens.fontSize.body, color: t.textMuted, lineHeight: 1.6, marginBottom: tokens.space.xl }}>{tourSteps[tourStep].desc}</div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: tokens.space.lg }}>
                {tourSteps.map((_, i) => <div key={i} style={{ width: i === tourStep ? 20 : 6, height: 6, borderRadius: 3, background: i === tourStep ? prefs.accent : t.cardAlt, transition: "all 0.3s" }} />)}
              </div>
              <div style={{ display: "flex", gap: tokens.space.sm }}>
                <button onClick={finishTour} style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: t.cardAlt, border: "none", color: t.textMuted, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer" }}>Skip</button>
                <button onClick={nextTour} className="ch" style={{ flex: 2, padding: tokens.space.md, borderRadius: tokens.radius.md, background: prefs.accent, border: "none", color: "#0F0F13", fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", boxShadow: `0 4px 12px ${prefs.accent}40` }}>
                  {tourStep < tourSteps.length - 1 ? "Next →" : "Let's go! 🚀"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {app.toast && <div aria-live="assertive" style={{ position: "fixed", bottom: 100, left: "50%", transform: "translate(-50%,0)", background: isDark ? t.card : '#1A1A2E', border: cardBorder, borderRadius: tokens.radius.xl, padding: `${tokens.space.md}px ${tokens.space.xl}px`, fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: isDark ? t.text : '#FFFFFF', zIndex: 200, boxShadow: tokens.shadow.heavy, animation: "toastIn 0.3s both", whiteSpace: "nowrap" }}>{app.toast}</div>}

        {/* Achievement popup */}
        {hist.newAch && <div aria-live="polite" style={{ position: "fixed", top: 20, left: "50%", transform: "translate(-50%,0)", background: isDark ? `linear-gradient(135deg,${prefs.accent}15,${t.card})` : t.card, border: `2px solid ${prefs.accent}40`, borderRadius: tokens.radius.xl, padding: `${tokens.space.md}px ${tokens.space.xl}px`, zIndex: 200, boxShadow: tokens.shadow.heavy, animation: "achIn 0.4s both", display: "flex", alignItems: "center", gap: tokens.space.md, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 32 }}>{hist.newAch.icon}</span>
          <div><div style={{ fontWeight: tokens.fontWeight.medium, color: prefs.accent, fontSize: tokens.fontSize.small }}>Achievement unlocked!</div>
            <div style={{ fontSize: tokens.fontSize.caption, color: t.text }}>{hist.newAch.title}</div></div>
        </div>}

        {/* Rate popup */}
        {hist.showRatePopup && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: tokens.space.xl, backdropFilter: "blur(8px)" }}>
          <div style={{ background: t.card, borderRadius: tokens.radius.xl, padding: tokens.space.xl, width: "100%", maxWidth: 340, textAlign: "center", animation: "fadeScale 0.3s both", boxShadow: tokens.shadow.heavy }}>
            <div style={{ fontSize: 40, marginBottom: tokens.space.md }}>⭐</div>
            <div style={{ fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.body, marginBottom: tokens.space.sm }}>Enjoying FinCalci?</div>
            <div style={{ fontSize: tokens.fontSize.caption, color: t.textMuted, marginBottom: tokens.space.lg }}>Rate us!</div>
            <div style={{ display: "flex", justifyContent: "center", gap: tokens.space.md, fontSize: 30, marginBottom: tokens.space.lg }}>
              {[1,2,3,4,5].map(s => <span key={s} onClick={() => hist.handleRate(s)} style={{ cursor: "pointer" }}>{s <= 3 ? "⭐" : "🌟"}</span>)}
            </div>
            <button onClick={hist.dismissRate} style={{ background: "none", border: "none", color: t.textDim, cursor: "pointer", fontSize: tokens.fontSize.caption }}>Not now</button>
          </div>
        </div>}

        {/* Share card modal */}
        {app.shareCardSvg && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: tokens.space.xl, backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) app.setShareCardSvg(null); }}>
          <div style={{ background: t.card, borderRadius: tokens.radius.xl, padding: tokens.space.lg, width: "100%", maxWidth: 360, animation: "fadeScale 0.3s both", boxShadow: tokens.shadow.heavy }}>
            <div style={{ borderRadius: tokens.radius.lg, overflow: "hidden", marginBottom: tokens.space.lg, border: cardBorder }}>
              <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(app.shareCardSvg)}`} alt="FinCalci Result Card" style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: tokens.space.sm }}>
              <button aria-label="Download share card" onClick={downloadShareCard} style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${prefs.accent}18`, border: `1px solid ${prefs.accent}40`, color: prefs.accent, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer" }}>Download</button>
              <button aria-label="Copy SVG to clipboard" onClick={() => { try { navigator.clipboard.writeText(app.shareCardSvg); app.showToast("SVG copied!"); } catch (e: unknown) { logWarn('clipboard.copy', e instanceof Error ? e.message : 'failed'); app.showToast("Copy failed"); } }} style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: t.cardAlt, border: cardBorder, boxShadow: cardShadow, color: t.textMuted, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer" }}>Copy SVG</button>
            </div>
          </div>
        </div>}

        {/* ─── CALCULATOR VIEW ─── */}
        <main id="main-content">
        {app.active && app.tab === "home" ? (
          <SectionBoundary t={t} onGoHome={app.goHome}>
            <div
              style={{ padding: `${tokens.space.lg}px ${tokens.space.xl}px 40px`, opacity: app.fadeIn ? 1 : 0, transform: app.fadeIn ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.25s ease,transform 0.25s ease" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: tokens.space.xl }}>
                <div style={{ display: "flex", alignItems: "center", gap: tokens.space.sm, minWidth: 0 }}>
                  <button aria-label="Go back" onClick={app.goHome} className="ch" style={{ width: 36, height: 36, borderRadius: tokens.radius.md, background: t.card, border: cardBorder, boxShadow: cardShadow, color: t.text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>←</button>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontSize: tokens.fontSize.body, fontWeight: tokens.fontWeight.medium, color: activeMeta?.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeMeta?.icon} {activeMeta?.desc}</h2>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button aria-label={prefs.favorites.includes(app.active) ? "Remove from favorites" : "Add to favorites"} onClick={() => onToggleFav(app.active)} className="ch" style={{ width: 32, height: 32, borderRadius: tokens.radius.sm, background: prefs.favorites.includes(app.active) ? `${activeMeta?.color}18` : t.card, border: prefs.favorites.includes(app.active) ? `1px solid ${activeMeta?.color}40` : cardBorder, boxShadow: cardShadow, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={prefs.favorites.includes(app.active) ? activeMeta?.color : "none"} stroke={prefs.favorites.includes(app.active) ? activeMeta?.color : t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </button>
                  <button aria-label="Save" onClick={onSave} className="ch" style={{ width: 32, height: 32, borderRadius: tokens.radius.sm, background: t.card, border: cardBorder, boxShadow: cardShadow, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>💾</button>
                  <button aria-label="Share card" onClick={handleShareCard} className="ch" style={{ width: 32, height: 32, borderRadius: tokens.radius.sm, background: t.card, border: cardBorder, boxShadow: cardShadow, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>📸</button>
                  <button aria-label="Share" onClick={onShare} className="ch" style={{ width: 32, height: 32, borderRadius: tokens.radius.sm, background: t.card, border: cardBorder, boxShadow: cardShadow, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>📤</button>
                </div>
              </div>
              {/* Calculator card with glassmorphism */}
              <div style={{
                background: isDark ? `${t.card}E6` : t.card,
                backdropFilter: isDark ? 'blur(16px)' : 'none',
                WebkitBackdropFilter: isDark ? 'blur(16px)' : 'none',
                borderRadius: tokens.radius.xl,
                padding: tokens.space.lg,
                border: isDark ? `1px solid ${activeMeta?.color}12` : 'none',
                boxShadow: isDark ? 'none' : `0 2px 12px rgba(0,0,0,0.06)`,
                animation: "fadeScale 0.25s both",
                overflowX: "hidden",
              }}>
                <CalcWrapper t={t} onGoHome={app.goHome} calcLabel={activeMeta?.desc || 'Calculator'}>
                  {ActiveComp && <ActiveComp color={activeMeta?.color} t={t} onResult={app.setLastResult} />}
                </CalcWrapper>
                <CrossLinks calcId={app.active} color={activeMeta?.color} t={t} onOpen={openCalc} />
                <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.lg, padding: `${tokens.space.md}px 0`, borderTop: `1px solid ${t.border === 'transparent' ? 'rgba(0,0,0,0.04)' : t.border}`, lineHeight: 1.6 }}>
                  Results are for informational purposes only. Not financial, tax, legal, or investment advice.
                </div>
              </div>
            </div>
          </SectionBoundary>

        ) : app.tab === "home" ? (
          <SectionBoundary t={t}>
            {/* ─── HOME SCREEN ─── */}
            <div style={{ padding: `${tokens.space.xl}px ${tokens.space.xl}px 0` }}>
              <OfflineBanner isOnline={app.isOnline} t={t} />

              {/* Greeting + Theme toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${tokens.space.lg}px 0 ${tokens.space.xl}px` }}>
                <div>
                  <div style={{ fontSize: tokens.fontSize.small, color: t.textDim, marginBottom: 2 }}>{getGreeting()}</div>
                  <h1 style={{ fontSize: 26, fontWeight: tokens.fontWeight.medium, fontFamily: tokens.fontFamily.sans, background: `linear-gradient(135deg,${prefs.accent},${tokens.color.secondary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2 }}>FinCalci</h1>
                </div>
                <button aria-label="Toggle theme" onClick={onToggleTheme} className="ch"
                  style={{ width: 40, height: 40, borderRadius: tokens.radius.md, background: t.card, border: cardBorder, boxShadow: cardShadow, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isDark ? "☀️" : "🌙"}
                </button>
              </div>

              {/* Tip of the day — top position */}
              {!app.search && <div style={{ padding: `${tokens.space.md}px ${tokens.space.lg}px`, background: isDark ? `${prefs.accent}08` : t.card, borderRadius: tokens.radius.lg, border: isDark ? `1px solid ${prefs.accent}12` : 'none', boxShadow: isDark ? 'none' : tokens.shadow.subtle, marginBottom: tokens.space.xl }}>
                <div style={{ fontSize: tokens.fontSize.caption, color: prefs.accent, fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.xs }}>💡 Tip of the day</div>
                <div style={{ fontSize: tokens.fontSize.caption, color: t.textMuted, lineHeight: 1.5 }}>{getTodayTip()}</div>
              </div>}

              {/* PWA Install */}
              {app.canInstall && !app.installDismissed && !app.search && (
                <div style={{ background: isDark ? `linear-gradient(135deg,${prefs.accent}12,${t.card})` : t.card, border: isDark ? `1px solid ${prefs.accent}25` : 'none', boxShadow: isDark ? 'none' : tokens.shadow.subtle, borderRadius: tokens.radius.xl, padding: tokens.space.lg, marginBottom: tokens.space.xl, animation: "slideUp 0.3s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: tokens.space.md }}>
                    <div style={{ fontSize: 32 }}>📲</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, color: t.text }}>Install FinCalci</div>
                      <div style={{ fontSize: tokens.fontSize.caption, color: t.textMuted, marginTop: 2 }}>Instant access & offline mode</div>
                    </div>
                    <button aria-label="Dismiss" onClick={() => app.setInstallDismissed(true)} style={{ background: "none", border: "none", color: t.textDim, cursor: "pointer", fontSize: 14, padding: 4 }}>✕</button>
                  </div>
                  <div style={{ display: "flex", gap: tokens.space.sm, marginTop: tokens.space.md }}>
                    <button aria-label="Install FinCalci" onClick={app.handleInstall} className="ch" style={{ flex: 1, padding: `${tokens.space.md}px`, borderRadius: tokens.radius.md, background: prefs.accent, border: "none", color: "#0F0F13", fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer" }}>Install now</button>
                    <button aria-label="Dismiss install prompt" onClick={() => app.setInstallDismissed(true)} style={{ padding: `${tokens.space.md}px ${tokens.space.lg}px`, borderRadius: tokens.radius.md, background: t.cardAlt, border: cardBorder, color: t.textMuted, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.caption, cursor: "pointer" }}>Later</button>
                  </div>
                </div>
              )}

              {/* Favorites row */}
              {prefs.favCalcs.length > 0 && !app.search && (
                <div style={{ marginBottom: tokens.space.xl }}>
                  <div style={sectionHeader(t)}>Favorites</div>
                  <div className="hscroll" style={{ display: "flex", gap: tokens.space.sm, overflowX: "auto", paddingBottom: 4 }}>
                    {prefs.favCalcs.map(c => (
                      <div key={c.id} tabIndex={0} role="button" aria-label={`Open ${c.desc}`} onKeyDown={e => { if (e.key === "Enter") openCalc(c.id); }} className="ch" onClick={() => openCalc(c.id)}
                        style={{ minWidth: 72, background: isDark ? `${c.color}10` : t.card, border: isDark ? `1px solid ${c.color}20` : 'none', boxShadow: isDark ? 'none' : tokens.shadow.subtle, borderRadius: tokens.radius.lg, padding: `${tokens.space.md}px ${tokens.space.sm}px`, textAlign: "center", cursor: "pointer", flexShrink: 0 }}>
                        <div style={{ fontSize: 22, marginBottom: 3 }}>{c.icon}</div>
                        <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textMuted }}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search results (flat grid) — shown when searching */}
              {app.search ? (
                <div>
                  <div aria-label="Search results" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.space.sm }}>
                    {filtered.map((calc, i) => (
                      <div key={calc.id} tabIndex={0} role="button" aria-label={`Open ${calc.desc}`}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openCalc(calc.id); }}
                        className="ch" onClick={() => openCalc(calc.id)}
                        style={{
                          background: isDark ? t.card : '#FFFFFF',
                          border: cardBorder, boxShadow: cardShadow,
                          borderRadius: tokens.radius.lg,
                          padding: tokens.space.lg,
                          cursor: "pointer",
                          animation: `slideUp 0.3s ease ${i * 40}ms both`,
                          display: "flex", alignItems: "center", gap: tokens.space.md,
                        }}>
                        <div style={{ fontSize: 28 }}>{calc.icon}</div>
                        <div>
                          <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: t.text }}>{calc.label}</div>
                          <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, marginTop: 1 }}>{calc.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {filtered.length === 0 && <div style={{ textAlign: "center", padding: tokens.space.xxl, color: t.textDim }}>No results for "{app.search}"</div>}
                </div>
              ) : (
                /* Category grouped grid */
                <div>
                  {categorized && categorized.map(cat => (
                    <div key={cat.key} style={{ marginBottom: tokens.space.xl }}>
                      <div style={{ ...sectionHeader(t), color: cat.color }}>{cat.icon} {cat.label}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: tokens.space.sm }}>
                        {cat.calcs.map((calc, i) => (
                          <div key={calc.id} tabIndex={0} role="button" aria-label={`Open ${calc.desc}`}
                            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openCalc(calc.id); }}
                            className="ch" onClick={() => openCalc(calc.id)}
                            style={{
                              background: isDark
                                ? `linear-gradient(160deg, ${cat.color}0A, ${t.card})`
                                : '#FFFFFF',
                              border: isDark ? `1px solid ${cat.color}12` : 'none',
                              boxShadow: isDark ? 'none' : tokens.shadow.subtle,
                              borderRadius: tokens.radius.lg,
                              padding: `${tokens.space.lg}px ${tokens.space.sm}px`,
                              textAlign: "center", cursor: "pointer",
                              animation: `slideUp 0.25s ease ${i * 40}ms both`,
                            }}>
                            <div style={{ fontSize: 26, marginBottom: tokens.space.sm }}>{calc.icon}</div>
                            <div style={{ fontSize: tokens.fontSize.caption, fontWeight: tokens.fontWeight.medium, color: t.text, lineHeight: 1.3 }}>{calc.label}</div>
                            <div style={{ fontSize: tokens.fontSize.caption - 2, color: t.textDim, marginTop: 2, lineHeight: 1.2 }}>{calc.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* More tools — collapsible */}
                  {!app.search && (
                    <div style={{ marginBottom: tokens.space.xl }}>
                      <button onClick={() => { setShowMoreTools(!showMoreTools); vib(5); }}
                        className="ch" style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          width: "100%", padding: `${tokens.space.md}px 0`,
                          background: "none", border: "none", cursor: "pointer",
                        }}>
                        <span style={{ ...sectionHeader(t), color: CATEGORY_COLORS.utility, marginBottom: 0 }}>🔧 More tools</span>
                        <span style={{ fontSize: 12, color: t.textDim, transition: "transform 0.2s", transform: showMoreTools ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
                      </button>
                      {showMoreTools && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: tokens.space.sm, animation: "slideUp 0.2s ease both" }}>
                          {moreTools.map((calc, i) => (
                            <div key={calc.id} tabIndex={0} role="button" aria-label={`Open ${calc.desc}`}
                              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openCalc(calc.id); }}
                              className="ch" onClick={() => openCalc(calc.id)}
                              style={{
                                background: isDark ? t.card : '#FFFFFF',
                                border: isDark ? `1px solid ${t.border}` : 'none',
                                boxShadow: isDark ? 'none' : tokens.shadow.subtle,
                                borderRadius: tokens.radius.lg,
                                padding: `${tokens.space.md}px ${tokens.space.xs}px`,
                                textAlign: "center", cursor: "pointer",
                                animation: `slideUp 0.2s ease ${i * 40}ms both`,
                              }}>
                              <div style={{ fontSize: 22, marginBottom: tokens.space.xs }}>{calc.icon}</div>
                              <div style={{ fontSize: tokens.fontSize.caption - 1, fontWeight: tokens.fontWeight.medium, color: t.text }}>{calc.label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionBoundary>

        ) : app.tab === "favorites" ? (
          <SectionBoundary t={t}>
            <div style={{ padding: `${tokens.space.xl}px` }}>
              <h2 style={{ fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.xl }}>⭐ Favorites</h2>
              {prefs.favCalcs.length === 0
                ? <div style={{ textAlign: "center", padding: `${tokens.space.xxl * 2}px ${tokens.space.xl}px`, color: t.textDim }}>
                    <div style={{ fontSize: 48, marginBottom: tokens.space.md, opacity: 0.5 }}>⭐</div>
                    <div style={{ fontSize: tokens.fontSize.small }}>Tap ☆ on any calculator to add favorites</div>
                  </div>
                : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.space.sm }}>
                  {prefs.favCalcs.map((c, i) => (
                    <div key={c.id} tabIndex={0} role="button" aria-label={`Open ${c.desc}`}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openCalc(c.id); }}
                      className="ch" onClick={() => openCalc(c.id)} style={{
                        background: isDark ? `linear-gradient(145deg, ${c.color}0A, ${t.card})` : t.card,
                        border: isDark ? `1px solid ${c.color}18` : 'none',
                        boxShadow: isDark ? 'none' : tokens.shadow.subtle,
                        borderRadius: tokens.radius.lg, padding: tokens.space.lg, cursor: "pointer",
                        animation: `slideUp 0.3s ease ${i * 50}ms both`,
                      }}>
                      <div style={{ fontSize: 28, marginBottom: tokens.space.sm }}>{c.icon}</div>
                      <div style={itemTitle(t)}>{c.desc}</div>
                      <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, marginTop: 2 }}>{c.label}</div>
                    </div>
                  ))}
                </div>}
            </div>
          </SectionBoundary>

        ) : app.tab === "history" ? (
          <SectionBoundary t={t} onGoHome={app.goHome}>
            <div style={{ padding: `${tokens.space.xl}px` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.xl }}>
                <h2 style={{ fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.medium }}>🕐 History</h2>
                {hist.history.length > 0 && <button aria-label="Clear all history" onClick={hist.clearHistory} style={{ padding: `${tokens.space.xs}px ${tokens.space.md}px`, borderRadius: tokens.radius.sm, background: `${tokens.color.danger}12`, border: `1px solid ${tokens.color.danger}25`, color: tokens.color.danger, fontSize: tokens.fontSize.caption, cursor: "pointer" }}>Clear all</button>}
              </div>
              {hist.history.length === 0
                ? <div style={{ textAlign: "center", padding: `${tokens.space.xxl * 2}px ${tokens.space.xl}px`, color: t.textDim }}>
                  <div style={{ fontSize: 48, marginBottom: tokens.space.md, opacity: 0.5 }}>📋</div>
                  <div style={{ fontSize: tokens.fontSize.small }}>Hit 💾 to save results!</div>
                </div>
                : hist.history.map((h, idx) => {
                  const meta = CALCULATORS.find(c => c.id === h.calcId);
                  return (<div key={h.id} style={{ background: t.card, borderRadius: tokens.radius.lg, padding: tokens.space.lg, marginBottom: tokens.space.sm, border: cardBorder, boxShadow: cardShadow, animation: `slideUp 0.25s ease ${idx * 30}ms both` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.sm }}>
                      <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: meta?.color || t.text }}>{meta?.icon} {meta?.desc}</div>
                      <div style={{ display: "flex", gap: tokens.space.xs, alignItems: "center" }}>
                        <span style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim }}>{h.time}</span>
                        <button aria-label="Delete entry" onClick={() => hist.deleteEntry(h.id)} style={{ background: "none", border: "none", color: tokens.color.danger, cursor: "pointer", fontSize: 12, opacity: 0.6 }}>✕</button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.space.xs }}>
                      {Object.entries(h.result || {}).map(([k, v]) => (
                        <div key={k} style={captionMuted(t)}>
                          <span style={{ color: t.textDim }}>{k}: </span>
                          <span style={{ color: t.text, fontFamily: tokens.fontFamily.mono }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>);
                })}
            </div>
          </SectionBoundary>

        ) : app.tab === "settings" ? (
          <SectionBoundary t={t}>
            <div style={{ padding: `${tokens.space.xl}px` }}>
              <h2 style={{ fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.xl }}>⚙️ Settings</h2>
              {/* Appearance */}
              <div style={{ background: t.card, borderRadius: tokens.radius.xl, padding: tokens.space.lg, marginBottom: tokens.space.md, border: cardBorder, boxShadow: cardShadow }}>
                <div style={{ fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.md, fontSize: tokens.fontSize.body }}>Appearance</div>
                <div style={{ display: "flex", gap: tokens.space.sm, marginBottom: tokens.space.lg }}>
                  <button aria-label="Toggle theme" onClick={onToggleTheme} className="ch" style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: t.cardAlt, border: cardBorder, boxShadow: cardShadow, color: t.text, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer" }}>
                    {isDark ? "🌙 Dark" : "☀️ Light"}
                  </button>
                  <button aria-label="Toggle sound" onClick={onToggleSound} className="ch" style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: t.cardAlt, border: cardBorder, boxShadow: cardShadow, color: t.text, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer" }}>
                    {prefs.soundOn ? "🔊 Sound on" : "🔇 Sound off"}
                  </button>
                </div>
                <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, marginBottom: tokens.space.sm }}>Accent color</div>
                <div style={{ display: "flex", gap: tokens.space.sm, flexWrap: "wrap" }}>
                  {ACCENT_COLORS.map(ac => (
                    <button key={ac.id} onClick={() => onAccentChange(ac.color)} aria-label={ac.label} className="ch"
                      style={{ width: 34, height: 34, borderRadius: tokens.radius.pill, background: ac.color, border: prefs.accent === ac.color ? "3px solid rgba(255,255,255,0.8)" : "2px solid transparent", cursor: "pointer", boxShadow: prefs.accent === ac.color ? `0 0 12px ${ac.color}50` : "none", transition: "all 0.2s" }} />
                  ))}
                </div>
              </div>
              {/* Stats */}
              <div style={{ background: t.card, borderRadius: tokens.radius.xl, padding: tokens.space.lg, marginBottom: tokens.space.md, border: cardBorder, boxShadow: cardShadow }}>
                <div style={{ fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.sm }}>Your stats</div>
                <div style={captionMuted(t)}>{hist.stats.totalCalcs} calculations &bull; {hist.stats.uniqueCalcs} types &bull; {hist.stats.streak}d streak</div>
                {/* Storage meter */}
                {(() => { try { let total = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith("fincalci")) total += localStorage.getItem(k)?.length || 0; }
                  const pctUsed = Math.round(total / LIMITS.STORAGE_QUOTA_BYTES * 100); const mb = (total / 1048576).toFixed(1);
                  return <div style={{ marginTop: tokens.space.sm }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: tokens.fontSize.caption - 1, color: pctUsed > 80 ? tokens.color.danger : t.textDim, marginBottom: 3 }}>
                      <span>Storage: {mb}MB / 5MB</span><span>{pctUsed}%</span></div>
                    <div style={{ height: 4, borderRadius: 2, background: isDark ? t.border : '#E5E5EA', overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, width: `${Math.min(pctUsed, 100)}%`, background: pctUsed > 80 ? tokens.color.danger : pctUsed > 50 ? tokens.color.warning : prefs.accent, transition: "width 0.3s" }} /></div>
                  </div>; } catch (e: unknown) { logWarn('history.render', e instanceof Error ? e.message : 'failed'); return null; } })()}
              </div>
              {/* Backup & Restore */}
              <div style={{ background: t.card, borderRadius: tokens.radius.xl, padding: tokens.space.lg, marginBottom: tokens.space.md, border: cardBorder, boxShadow: cardShadow }}>
                <div style={{ fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.sm }}>Backup & restore</div>
                <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, marginBottom: tokens.space.md }}>Download your data as JSON. Restore on any device.</div>
                <div style={{ display: "flex", gap: tokens.space.sm }}>
                  <button aria-label="Download backup" onClick={async () => {
                    try {
                      const keys = [KEYS.PREFS, KEYS.FAVORITES, KEYS.HISTORY, KEYS.RECENT, KEYS.STATS, KEYS.EXPENSE, KEYS.KHATA, KEYS.SPLIT];
                      const backup = {};
                      for (const k of keys) { const v = await safeStorageGet(k); if (v) backup[k] = v; }
                      backup._meta = { app: "FinCalci", version: "1.0", date: new Date().toISOString() };
                      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = `FinCalci-Backup-${new Date().toISOString().split("T")[0]}.json`;
                      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                      vibSuccess(); app.showToast("Backup downloaded! 💾");
                    } catch (e: unknown) { logError('backup.export', e); app.showToast("Backup failed"); }
                  }} className="ch" style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${prefs.accent}15`, border: `1px solid ${prefs.accent}30`, color: prefs.accent, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.caption, cursor: "pointer" }}>
                    Download backup
                  </button>
                  <label className="ch" style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${tokens.color.success}12`, border: `1px solid ${tokens.color.success}25`, color: tokens.color.success, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.caption, cursor: "pointer", textAlign: "center" }}>
                    Restore
                    <input type="file" accept=".json" style={{ display: "none" }} onChange={async (e) => {
                      try {
                        const file = e.target.files?.[0]; if (!file) return;
                        const text = await file.text(); const data = JSON.parse(text);
                        if (!data._meta || data._meta.app !== "FinCalci") { app.showToast("Invalid backup file ❌"); return; }
                        const keys = Object.keys(data).filter(k => k.startsWith("fincalci-"));
                        for (const k of keys) await safeStorageSet(k, data[k]);
                        vibSuccess(); app.showToast("Restored! Reloading... ✅");
                        setTimeout(() => forceReload(), TIMING.RELOAD_DELAY);
                      } catch (e: unknown) { logError('backup.restore', e); app.showToast("Restore failed ❌"); }
                    }} />
                  </label>
                </div>
              </div>
              {/* Share FinCalci */}
              <div style={{ background: t.card, borderRadius: tokens.radius.xl, padding: tokens.space.lg, marginBottom: tokens.space.md, border: cardBorder, boxShadow: cardShadow }}>
                <div style={{ fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.sm }}>Share FinCalci</div>
                <div style={captionMuted(t)}>Help your friends with their finances!</div>
                <button onClick={async () => {
                  const shareUrl = "https://fin-calci.vercel.app";
                  const text = "FinCalci — 18 free calculators for India 🧮\nEMI, SIP, GST, Tax, Gold, Khata Book & more.";
                  try {
                    if (navigator.share) { await navigator.share({ title: "FinCalci", text, url: shareUrl }); }
                    else { await navigator.clipboard.writeText(text + "\nTry it: " + shareUrl); app.showToast("Link copied! 📋"); }
                  } catch { app.showToast("Share cancelled"); }
                }} className="ch" style={{ width: "100%", marginTop: tokens.space.md, padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${prefs.accent}15`, border: `1px solid ${prefs.accent}30`, color: prefs.accent, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", fontFamily: tokens.fontFamily.sans }}>
                  📤 Share with friends
                </button>
              </div>
              {/* About */}
              <div style={{ background: t.card, borderRadius: tokens.radius.xl, padding: tokens.space.lg, border: cardBorder, boxShadow: cardShadow }}>
                <div style={{ fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.xs }}>About</div>
                <div style={captionMuted(t)}>FinCalci v1.0 &bull; 18 free calculators for India</div>
                <a href="/privacy-policy.html" target="_blank" rel="noopener" style={{ fontSize: tokens.fontSize.caption, color: prefs.accent, marginTop: tokens.space.xs, display: "inline-block" }}>Privacy policy</a>
              </div>
            </div>
          </SectionBoundary>
        ) : null}

        {/* ─── FLOATING SEARCH PILL (above nav, always visible on home) ─── */}
        </main>
        {app.tab === "home" && !app.active && (
          <div style={{
            position: "fixed", bottom: 78, left: "50%", transform: "translateX(-50%)",
            width: "calc(100% - 48px)", maxWidth: 432,
            zIndex: 101,
          }}>
            <div style={{
              position: "relative",
              background: isDark ? t.card : '#FFFFFF',
              borderRadius: tokens.radius.pill,
              border: isDark ? `1px solid rgba(255,255,255,0.1)` : `1px solid rgba(0,0,0,0.08)`,
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.1)',
              overflow: "hidden",
            }}>
              <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: t.textDim, opacity: 0.5, pointerEvents: "none" }}>🔍</span>
              <input type="text" placeholder="Search calculators..." aria-label="Search calculators" value={app.search} onChange={e => app.setSearch(e.target.value.slice(0, 30))} maxLength={30}
                style={{
                  width: "100%", padding: `13px 40px 13px 42px`,
                  background: "transparent", border: "none", outline: "none",
                  color: t.text, fontSize: tokens.fontSize.body,
                  fontFamily: tokens.fontFamily.sans,
                }} />
              {app.search && (
                <button onClick={() => app.setSearch("")} aria-label="Clear search"
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: t.cardAlt, border: "none", borderRadius: tokens.radius.pill, width: 22, height: 22, fontSize: 11, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              )}
            </div>
          </div>
        )}

        {/* ─── BOTTOM NAV (taller, blur, active dot) ─── */}
        <nav role="navigation" aria-label="Main navigation" style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 480,
          background: t.navBg,
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderTop: isDark ? `1px solid rgba(255,255,255,0.04)` : `1px solid rgba(0,0,0,0.04)`,
          padding: `${tokens.space.md}px 0 18px`,
          display: "flex", justifyContent: "space-around",
          boxShadow: t.shadow, zIndex: 100,
        }}>
          {[{ id: "home", l: "Home", icon: NI.home }, { id: "favorites", l: "Favorites", icon: NI.star }, { id: "history", l: "History", icon: NI.clock }, { id: "settings", l: "Settings", icon: NI.cog }].map(n => {
            const isA = app.tab === n.id && !app.active;
            const ac = isA ? prefs.accent : t.textDim;
            return <button key={n.id} aria-label={n.l} onClick={() => {
              if (n.id === "home") { app.goHome(); }
              else { app.setTab(n.id); app.setActive(null); pushTab(n.id); }
              vib(5);
            }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: `4px ${tokens.space.xl}px`, borderRadius: tokens.radius.md, transition: "all 0.2s" }}>
              {n.icon(ac)}
              <span style={{ fontSize: 10, fontWeight: isA ? tokens.fontWeight.medium : tokens.fontWeight.regular, color: ac, transition: "color 0.2s" }}>{n.l}</span>
              {isA && <div style={{ width: 4, height: 4, borderRadius: 2, background: prefs.accent, marginTop: -1, boxShadow: `0 0 6px ${prefs.accent}60` }} />}
            </button>;
          })}
        </nav>
      </div>
    </AppErrorBoundary>
  );
}
