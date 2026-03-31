import { itemTitle, captionMuted } from './design/styles';
// @ts-nocheck — TODO: add strict types
// FinCalci v2.0 — Slim App Shell
// All logic extracted to hooks. This file is just the router + layout.
import React from 'react';
const { useMemo, useCallback } = React;

// Hooks
import useAppState from './hooks/useAppState';
import usePreferences from './hooks/usePreferences';
import useHistory from './hooks/useHistory';
import useAnalytics from './hooks/useAnalytics';

// Components
import { AppErrorBoundary, SectionBoundary } from './components/ErrorBoundaries';
import CalcWrapper from './components/CalcWrapper';
import Onboarding from './components/Onboarding';
import CrossLinks from './components/CrossLinks';
import { OfflineBanner } from './components/UIStates';
import { SectionLoader } from './components/Loader';

// Calculators (lazy loaded)
import { CALC_MAP } from './calculators/index';

// Constants
import { CALCULATORS, ACHIEVEMENTS, getTodayTip } from './utils/constants';
import { tokens } from './design/tokens';
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

// ─── Splash Screen ───
function Splash({ onDone }) {
  React.useEffect(() => {
    const t = setTimeout(() => {
      // Fade out native CSS splash, then tell App to render
      const el = document.getElementById('native-splash');
      if (el) {
        el.classList.add('hidden');
        setTimeout(() => { el.remove(); onDone(); }, 500);
      } else {
        onDone();
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [onDone]);
  return null; // Native splash in index.html stays visible until faded above
}

// ─── Nav icons (SVG) ───
const NI = {
  home: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  star: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  clock: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  cog: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

export default function FinCalci() {
  // ─── Hooks ───
  const app = useAppState();
  const prefs = usePreferences(app.showToast);
  const hist = useHistory(app.showToast);
  const analytics = useAnalytics();
  const { t } = prefs;

  // ─── Derived ───
  const filtered = useMemo(() => app.search
    ? CALCULATORS.filter(c => c.label.toLowerCase().includes(app.search.toLowerCase()) || c.desc.toLowerCase().includes(app.search.toLowerCase()) || c.id.includes(app.search.toLowerCase()))
    : CALCULATORS, [app.search]);
  const ActiveComp = useMemo(() => app.active ? CALC_MAP[app.active] : null, [app.active]);
  const activeMeta = useMemo(() => CALCULATORS.find(c => c.id === app.active), [app.active]);

  // ─── Track calc open/close lifecycle ───
  const prevActive = React.useRef(null);
  React.useEffect(() => {
    // Close previous calc
    if (prevActive.current && prevActive.current !== app.active) {
      analytics.trackCalcClose(prevActive.current);
    }
    // Open new calc
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

  // ─── Splash + Onboarding ───
  if (app.splash) return <Splash onDone={() => app.setSplash(false)} />;
  if (!app.onboarded) return <Onboarding accent={prefs.accent} onDone={() => { app.setOnboarded(true); prefs.savePrefs({ onboarded: true }); }} />;

  // ─── RENDER ───
  return (
    <AppErrorBoundary>
      <div role="application" aria-label="FinCalci Calculator App"
        style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: tokens.fontFamily.sans, maxWidth: 480, margin: "0 auto", paddingBottom: 80, transition: "background 0.3s,color 0.3s", overflowX: "hidden" }}>

        {/* Skip nav for keyboard users */}
        <a href="#main-content" style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }} onFocus={e => { (e.target as HTMLElement).style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;padding:12px;background:#4ECDC4;color:#000;text-align:center;font-weight:500"; }}>Skip to content</a>

        <style>{`*{box-sizing:border-box;margin:0;padding:0}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}input[type=number]{-moz-appearance:textfield}
input[type=range]{-webkit-appearance:none;appearance:none}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:${tokens.shadow.medium};cursor:pointer;margin-top:-9px}
input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:${tokens.shadow.medium};cursor:pointer;border:none}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pop{0%{transform:scale(0.97)}60%{transform:scale(1.01)}100%{transform:scale(1)}}
@keyframes toastIn{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes achIn{from{opacity:0;transform:translate(-50%,-30px) scale(0.9)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fcSpin{to{transform:rotate(360deg)}}
@keyframes fcShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.ch{transition:transform 0.15s;-webkit-tap-highlight-color:transparent;touch-action:manipulation;user-select:none;-webkit-user-select:none}.ch:active{transform:scale(0.97)}
select{-webkit-appearance:none}::-webkit-scrollbar{width:0;height:0}
.hscroll{overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}.hscroll::-webkit-scrollbar{display:none}
button{-webkit-tap-highlight-color:transparent;touch-action:manipulation;font-family:${tokens.fontFamily.sans}}
@media(prefers-reduced-motion:reduce){*{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}`}</style>

        {/* Toast */}
        {app.toast && <div aria-live="assertive" style={{ position: "fixed", bottom: 90, left: "50%", transform: "translate(-50%,0)", background: t.card, border: `1px solid ${t.border}`, borderRadius: tokens.radius.lg, padding: `${tokens.space.md}px ${tokens.space.xl}px`, fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: t.text, zIndex: 200, boxShadow: tokens.shadow.heavy, animation: "toastIn 0.3s both", whiteSpace: "nowrap" }}>{app.toast}</div>}

        {/* Achievement popup */}
        {hist.newAch && <div aria-live="polite" style={{ position: "fixed", top: 20, left: "50%", transform: "translate(-50%,0)", background: `linear-gradient(135deg,${prefs.accent}20,${t.card})`, border: `2px solid ${prefs.accent}`, borderRadius: tokens.radius.lg, padding: `${tokens.space.md}px ${tokens.space.xl}px`, zIndex: 200, boxShadow: tokens.shadow.heavy, animation: "achIn 0.4s both", display: "flex", alignItems: "center", gap: tokens.space.md, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 32 }}>{hist.newAch.icon}</span>
          <div><div style={{ fontWeight: tokens.fontWeight.medium, color: prefs.accent, fontSize: tokens.fontSize.small }}>Achievement unlocked!</div>
            <div style={{ fontSize: tokens.fontSize.caption, color: t.text }}>{hist.newAch.title}</div></div>
        </div>}

        {/* Rate popup */}
        {hist.showRatePopup && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: tokens.space.xl }}>
          <div style={{ background: t.card, borderRadius: tokens.radius.xl, padding: tokens.space.xxl, maxWidth: 340, width: "100%", textAlign: "center", boxShadow: tokens.shadow.heavy }}>
            <div style={{ fontSize: 48, marginBottom: tokens.space.md }}>🌟</div>
            <div style={{ fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.medium, color: t.text, marginBottom: tokens.space.sm }}>Enjoying FinCalci?</div>
            <div style={{ fontSize: tokens.fontSize.small, color: t.textMuted, marginBottom: tokens.space.xl, lineHeight: 1.5 }}>Your rating helps us grow!</div>
            <div style={{ display: "flex", justifyContent: "center", gap: tokens.space.sm, marginBottom: tokens.space.xl }}>
              {[1, 2, 3, 4, 5].map(s => <button key={s} aria-label={`Rate ${s} stars`} onClick={() => hist.handleRate(s)} style={{ width: 44, height: 44, borderRadius: tokens.radius.md, background: t.cardAlt, border: `1px solid ${t.border}`, cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>{s <= 3 ? "⭐" : "🌟"}</button>)}
            </div>
            <button aria-label="Dismiss rating" onClick={hist.dismissRate} style={{ background: "none", border: "none", color: t.textDim, cursor: "pointer", fontSize: tokens.fontSize.caption }}>Maybe later</button>
          </div>
        </div>}

        {/* Share card modal */}
        {app.shareCardSvg && <div role="dialog" aria-label="Result card preview" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: tokens.space.xl }} onClick={() => app.setShareCardSvg(null)} onKeyDown={e => { if (e.key === "Escape") app.setShareCardSvg(null); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: t.card, borderRadius: tokens.radius.xl, padding: tokens.space.xl, maxWidth: 380, width: "100%", boxShadow: tokens.shadow.heavy }}>
            <div style={{ fontSize: tokens.fontSize.body, fontWeight: tokens.fontWeight.medium, color: t.text, marginBottom: tokens.space.lg, textAlign: "center" }}>Share card</div>
            <div style={{ borderRadius: tokens.radius.lg, overflow: "hidden", marginBottom: tokens.space.lg, border: `1px solid ${t.border}` }}>
              <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(app.shareCardSvg)}`} alt="FinCalci Result Card" style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: tokens.space.sm }}>
              <button aria-label="Download share card" onClick={downloadShareCard} style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${prefs.accent}20`, border: `1px solid ${prefs.accent}50`, color: prefs.accent, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer" }}>Download</button>
              <button aria-label="Copy SVG to clipboard" onClick={() => { try { navigator.clipboard.writeText(app.shareCardSvg); app.showToast("SVG copied!"); } catch (e: unknown) { logWarn('clipboard.copy', e instanceof Error ? e.message : 'failed'); app.showToast("Copy failed"); } }} style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: t.cardAlt, border: `1px solid ${t.border}`, color: t.textMuted, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer" }}>Copy SVG</button>
            </div>
          </div>
        </div>}

        {/* ─── CALCULATOR VIEW ─── */}
        <main id="main-content">
        {app.active && app.tab === "home" ? (
          <SectionBoundary t={t} onGoHome={app.goHome}>
            <div onTouchStart={app.onTouchStart} onTouchEnd={app.onTouchEnd}
              style={{ padding: `${tokens.space.xl}px ${tokens.space.xl}px 40px`, opacity: app.fadeIn ? 1 : 0, transform: app.fadeIn ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.3s ease,transform 0.3s ease" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: tokens.space.xl }}>
                <div style={{ display: "flex", alignItems: "center", gap: tokens.space.sm, minWidth: 0 }}>
                  <button aria-label="Go back" onClick={app.goHome} style={{ width: 34, height: 34, borderRadius: tokens.radius.md, background: t.card, border: `1px solid ${t.border}`, color: t.text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>←</button>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: t.textDim, letterSpacing: 1, textTransform: "uppercase" }}>Calculator</div>
                    <h2 style={{ fontSize: tokens.fontSize.body, fontWeight: tokens.fontWeight.medium, color: activeMeta?.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeMeta?.icon} {activeMeta?.desc}</h2>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button aria-label={prefs.favorites.includes(app.active) ? "Remove from favorites" : "Add to favorites"} onClick={() => onToggleFav(app.active)} style={{ width: 30, height: 30, borderRadius: tokens.radius.sm, background: prefs.favorites.includes(app.active) ? `${activeMeta?.color}20` : t.card, border: `1px solid ${prefs.favorites.includes(app.active) ? activeMeta?.color + "50" : t.border}`, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>{prefs.favorites.includes(app.active) ? "⭐" : "☆"}</button>
                  <button aria-label="Save" onClick={onSave} style={{ width: 30, height: 30, borderRadius: tokens.radius.sm, background: t.card, border: `1px solid ${t.border}`, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>💾</button>
                  <button aria-label="Share card" onClick={handleShareCard} style={{ width: 30, height: 30, borderRadius: tokens.radius.sm, background: t.card, border: `1px solid ${t.border}`, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>📸</button>
                  <button aria-label="Share" onClick={onShare} style={{ width: 30, height: 30, borderRadius: tokens.radius.sm, background: t.card, border: `1px solid ${t.border}`, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>📤</button>
                </div>
              </div>
              {/* Calculator */}
              <div style={{ background: t.card, borderRadius: tokens.radius.xl, padding: tokens.space.lg, border: `1px solid ${activeMeta?.color}18`, boxShadow: tokens.shadow.subtle, animation: "pop 0.3s", overflowX: "hidden" }}>
                <CalcWrapper t={t} onGoHome={app.goHome} calcLabel={activeMeta?.desc || 'Calculator'}>
                  {ActiveComp && <ActiveComp color={activeMeta?.color} t={t} onResult={app.setLastResult} />}
                </CalcWrapper>
                <CrossLinks calcId={app.active} color={activeMeta?.color} t={t} onOpen={openCalc} />
                <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim, textAlign: "center", marginTop: tokens.space.lg, padding: `${tokens.space.md}px 0`, borderTop: `1px solid ${t.border}`, lineHeight: 1.6 }}>
                  Results are for informational purposes only. Not financial, tax, legal, or investment advice. Verify with a qualified professional.
                </div>
              </div>
            </div>
          </SectionBoundary>

        ) : app.tab === "home" ? (
          <SectionBoundary t={t}>
            {/* ─── HOME SCREEN ─── */}
            <div style={{ padding: `${tokens.space.xl}px ${tokens.space.xl}px 0` }}>
              <OfflineBanner isOnline={app.isOnline} t={t} />
              {/* Logo */}
              <div style={{ textAlign: "center", padding: `${tokens.space.xl}px 0 ${tokens.space.lg}px` }}>
                <h1 style={{ fontSize: 34, fontWeight: tokens.fontWeight.medium, fontFamily: tokens.fontFamily.sans, background: `linear-gradient(135deg,${tokens.color.danger},${prefs.accent},${tokens.color.secondary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2 }}>FinCalci</h1>
              </div>
              {/* Search */}
              <div style={{ position: "relative", marginBottom: tokens.space.xl }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: t.textDim }}>🔍</span>
                <input type="text" placeholder="Search calculators..." aria-label="Search calculators" value={app.search} onChange={e => app.setSearch(e.target.value.slice(0, 30))} maxLength={30}
                  style={{ width: "100%", padding: `${tokens.space.md}px ${tokens.space.lg}px ${tokens.space.md}px 42px`, borderRadius: tokens.radius.lg, border: `1px solid ${t.border}`, background: t.inputBg, color: t.text, fontSize: tokens.fontSize.body, fontFamily: tokens.fontFamily.sans, outline: "none" }} />
              </div>
              {/* PWA Install */}
              {app.canInstall && !app.installDismissed && !app.search && (
                <div style={{ background: `linear-gradient(135deg,${prefs.accent}15,${t.card})`, border: `1px solid ${prefs.accent}30`, borderRadius: tokens.radius.lg, padding: tokens.space.lg, marginBottom: tokens.space.xl, animation: "slideUp 0.3s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: tokens.space.md }}>
                    <div style={{ fontSize: 36 }}>📲</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, color: t.text }}>Install FinCalci</div>
                      <div style={{ fontSize: tokens.fontSize.caption, color: t.textMuted, marginTop: 2 }}>Add to home screen for instant access & offline mode!</div>
                    </div>
                    <button aria-label="Dismiss" onClick={() => app.setInstallDismissed(true)} style={{ background: "none", border: "none", color: t.textDim, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
                  </div>
                  <div style={{ display: "flex", gap: tokens.space.sm, marginTop: tokens.space.md }}>
                    <button aria-label="Install FinCalci" onClick={app.handleInstall} style={{ flex: 1, padding: `${tokens.space.md}px`, borderRadius: tokens.radius.md, background: prefs.accent, border: "none", color: "#0c1222", fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer" }}>Install now</button>
                    <button aria-label="Dismiss install prompt" onClick={() => app.setInstallDismissed(true)} style={{ padding: `${tokens.space.md}px ${tokens.space.lg}px`, borderRadius: tokens.radius.md, background: t.cardAlt, border: `1px solid ${t.border}`, color: t.textMuted, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.caption, cursor: "pointer" }}>Later</button>
                  </div>
                </div>
              )}
              {/* Recent */}
              {hist.recentCalcs.length > 0 && !app.search && (
                <div style={{ marginBottom: tokens.space.xl }}>
                  <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, marginBottom: tokens.space.sm, fontWeight: tokens.fontWeight.medium }}>Recently used</div>
                  <div className="hscroll" style={{ display: "flex", gap: tokens.space.sm, overflowX: "auto", paddingBottom: 4 }}>
                    {hist.recentCalcs.map(c => (
                      <div key={c.id} tabIndex={0} role="button" aria-label={`Open ${c.desc}`} onKeyDown={e => { if (e.key === "Enter") openCalc(c.id); }} className="ch" onClick={() => openCalc(c.id)}
                        style={{ minWidth: 80, background: `${c.color}10`, border: `1px solid ${c.color}25`, borderRadius: tokens.radius.lg, padding: `${tokens.space.md}px ${tokens.space.sm}px`, textAlign: "center", cursor: "pointer", flexShrink: 0 }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{c.icon}</div>
                        <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textMuted }}>{c.label || c.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Favorites */}
              {prefs.favCalcs.length > 0 && !app.search && (
                <div style={{ marginBottom: tokens.space.xl }}>
                  <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, marginBottom: tokens.space.sm, fontWeight: tokens.fontWeight.medium }}>Favorites ⭐</div>
                  <div className="hscroll" style={{ display: "flex", gap: tokens.space.sm, overflowX: "auto", paddingBottom: 4 }}>
                    {prefs.favCalcs.map(c => (
                      <div key={c.id} tabIndex={0} role="button" aria-label={`Open ${c.desc}`} onKeyDown={e => { if (e.key === "Enter") openCalc(c.id); }} className="ch" onClick={() => openCalc(c.id)}
                        style={{ minWidth: 80, background: `${c.color}10`, border: `1px solid ${c.color}25`, borderRadius: tokens.radius.lg, padding: `${tokens.space.md}px ${tokens.space.sm}px`, textAlign: "center", cursor: "pointer", flexShrink: 0 }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{c.icon}</div>
                        <div style={{ fontSize: tokens.fontSize.caption - 1, color: t.textMuted }}>{c.label || c.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Grid */}
              <div aria-label="All calculators" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: tokens.space.sm }}>
                {filtered.map((calc, i) => (
                  <div key={calc.id} tabIndex={0} role="button" aria-label={`Open ${calc.desc}`}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openCalc(calc.id); }}
                    className="ch" onClick={() => openCalc(calc.id)}
                    style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: tokens.radius.lg, padding: `${tokens.space.lg}px ${tokens.space.sm}px`, textAlign: "center", cursor: "pointer", boxShadow: tokens.shadow.subtle, animation: `slideUp ${TIMING.ANIMATION_NORMAL}ms ease both`, animationDelay: `${i * TIMING.STAGGER_ITEM}ms` }}>
                    <div style={{ fontSize: 28, marginBottom: tokens.space.sm }}>{calc.icon}</div>
                    <div style={{ fontSize: tokens.fontSize.caption, fontWeight: tokens.fontWeight.medium, color: t.text }}>{calc.label || calc.desc}</div>
                  </div>
                ))}
              </div>
              {filtered.length === 0 && <div style={{ textAlign: "center", padding: tokens.space.xxl, color: t.textDim }}>No results for "{app.search}"</div>}
              {/* Daily tip */}
              {!app.search && <div style={{ marginTop: tokens.space.xl, padding: tokens.space.lg, background: `${prefs.accent}08`, borderRadius: tokens.radius.lg, border: `1px solid ${prefs.accent}15` }}>
                <div style={{ fontSize: tokens.fontSize.caption, color: prefs.accent, fontWeight: tokens.fontWeight.medium }}>💡 Tip of the day</div>
                <div style={{ fontSize: tokens.fontSize.caption, color: t.textMuted, marginTop: tokens.space.xs, lineHeight: 1.5 }}>{getTodayTip()}</div>
              </div>}
            </div>
          </SectionBoundary>

        ) : app.tab === "favorites" ? (
          <SectionBoundary t={t}>
            <div style={{ padding: `${tokens.space.xl}px` }}>
              <h2 style={{ fontSize: tokens.fontSize.title, fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.xl }}>⭐ Favorites</h2>
              {prefs.favCalcs.length === 0
                ? <div style={{ textAlign: "center", padding: tokens.space.xxl, color: t.textDim }}>Tap ☆ on any calculator to add favorites</div>
                : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.space.sm }}>
                  {prefs.favCalcs.map(c => (
                    <div key={c.id} tabIndex={0} role="button" aria-label={`Open ${c.desc}`}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openCalc(c.id); }}
                      className="ch" onClick={() => openCalc(c.id)} style={{ background: t.card, border: `1px solid ${c.color}25`, borderRadius: tokens.radius.lg, padding: tokens.space.lg, cursor: "pointer", boxShadow: tokens.shadow.subtle }}>
                      <div style={{ fontSize: 28, marginBottom: tokens.space.sm }}>{c.icon}</div>
                      <div style={itemTitle(t)}>{c.desc}</div>
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
                {hist.history.length > 0 && <button aria-label="Clear all history" onClick={hist.clearHistory} style={{ padding: `${tokens.space.xs}px ${tokens.space.md}px`, borderRadius: tokens.radius.sm, background: `${tokens.color.danger}15`, border: `1px solid ${tokens.color.danger}30`, color: tokens.color.danger, fontSize: tokens.fontSize.caption, cursor: "pointer" }}>Clear all</button>}
              </div>
              {hist.history.length === 0
                ? <div style={{ textAlign: "center", padding: `${tokens.space.xxl * 2}px ${tokens.space.xl}px`, color: t.textDim }}>
                  <div style={{ fontSize: 48, marginBottom: tokens.space.md }}>📋</div>
                  <div style={{ fontSize: tokens.fontSize.small }}>Hit 💾 to save results!</div>
                </div>
                : hist.history.map(h => {
                  const meta = CALCULATORS.find(c => c.id === h.calcId);
                  return (<div key={h.id} style={{ background: t.card, borderRadius: tokens.radius.md, padding: tokens.space.lg, marginBottom: tokens.space.sm, border: `1px solid ${t.border}`, boxShadow: tokens.shadow.subtle }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.sm }}>
                      <div style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: meta?.color || t.text }}>{meta?.icon} {meta?.desc}</div>
                      <div style={{ display: "flex", gap: tokens.space.xs }}>
                        <span style={{ fontSize: tokens.fontSize.caption - 1, color: t.textDim }}>{h.time}</span>
                        <button aria-label="Delete entry" onClick={() => hist.deleteEntry(h.id)} style={{ background: "none", border: "none", color: tokens.color.danger, cursor: "pointer", fontSize: 12 }}>✕</button>
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
              {/* Theme */}
              <div style={{ background: t.card, borderRadius: tokens.radius.lg, padding: tokens.space.lg, marginBottom: tokens.space.md, border: `1px solid ${t.border}` }}>
                <div style={{ fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.md }}>Appearance</div>
                <div style={{ display: "flex", gap: tokens.space.sm, marginBottom: tokens.space.md }}>
                  <button aria-label="Toggle theme" onClick={onToggleTheme} style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: t.cardAlt, border: `1px solid ${t.border}`, color: t.text, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer" }}>
                    {prefs.theme === "dark" ? "🌙 Dark" : "☀️ Light"}
                  </button>
                  <button aria-label="Toggle sound" onClick={onToggleSound} style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: t.cardAlt, border: `1px solid ${t.border}`, color: t.text, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer" }}>
                    {prefs.soundOn ? "🔊 Sound on" : "🔇 Sound off"}
                  </button>
                </div>
                <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, marginBottom: tokens.space.sm }}>Accent color</div>
                <div style={{ display: "flex", gap: tokens.space.sm, flexWrap: "wrap" }}>
                  {ACCENT_COLORS.map(ac => (
                    <button key={ac.id} onClick={() => onAccentChange(ac.color)} aria-label={ac.label}
                      style={{ width: 32, height: 32, borderRadius: tokens.radius.pill, background: ac.color, border: prefs.accent === ac.color ? "3px solid #fff" : "2px solid transparent", cursor: "pointer", boxShadow: prefs.accent === ac.color ? tokens.shadow.medium : "none" }} />
                  ))}
                </div>
              </div>
              {/* Stats */}
              <div style={{ background: t.card, borderRadius: tokens.radius.lg, padding: tokens.space.lg, marginBottom: tokens.space.md, border: `1px solid ${t.border}` }}>
                <div style={{ fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.sm }}>Your stats</div>
                <div style={captionMuted(t)}>{hist.stats.totalCalcs} calculations &bull; {hist.stats.uniqueCalcs} types &bull; {hist.stats.streak}d streak</div>
                {/* Storage meter */}
                {(() => { try { let total = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith("fincalci")) total += localStorage.getItem(k)?.length || 0; }
                  const pctUsed = Math.round(total / LIMITS.STORAGE_QUOTA_BYTES * 100); const mb = (total / 1048576).toFixed(1);
                  return <div style={{ marginTop: tokens.space.sm }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: tokens.fontSize.caption - 1, color: pctUsed > 80 ? tokens.color.danger : t.textDim, marginBottom: 3 }}>
                      <span>Storage: {mb}MB / 5MB</span><span>{pctUsed}%</span></div>
                    <div style={{ height: 4, borderRadius: 2, background: t.border, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, width: `${Math.min(pctUsed, 100)}%`, background: pctUsed > 80 ? tokens.color.danger : pctUsed > 50 ? tokens.color.warning : prefs.accent }} /></div>
                  </div>; } catch (e: unknown) { logWarn('history.render', e instanceof Error ? e.message : 'failed'); return null; } })()}
              </div>
              {/* Backup & Restore */}
              <div style={{ background: t.card, borderRadius: tokens.radius.lg, padding: tokens.space.lg, marginBottom: tokens.space.md, border: `1px solid ${t.border}` }}>
                <div style={{ fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.sm }}>Backup & restore</div>
                <div style={{ fontSize: tokens.fontSize.caption, color: t.textDim, marginBottom: tokens.space.md }}>Download your data as JSON. Restore on any device.</div>
                <div style={{ display: "flex", gap: tokens.space.sm }}>
                  <button aria-label="Download backup" onClick={async () => {
                    try {
                      const keys = [KEYS.PREFS, KEYS.FAVORITES, KEYS.HISTORY, KEYS.RECENT, KEYS.STATS, KEYS.EXPENSE, KEYS.CALORIE, KEYS.KHATA, KEYS.SPLIT];
                      const backup = {};
                      for (const k of keys) { const v = await safeStorageGet(k); if (v) backup[k] = v; }
                      backup._meta = { app: "FinCalci", version: "2.0", date: new Date().toISOString() };
                      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = `FinCalci-Backup-${new Date().toISOString().split("T")[0]}.json`;
                      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                      vibSuccess(); app.showToast("Backup downloaded! 💾");
                    } catch (e: unknown) { logError('backup.export', e); app.showToast("Backup failed"); }
                  }} style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${prefs.accent}15`, border: `1px solid ${prefs.accent}30`, color: prefs.accent, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.caption, cursor: "pointer" }}>
                    Download backup
                  </button>
                  <label style={{ flex: 1, padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${tokens.color.success}15`, border: `1px solid ${tokens.color.success}30`, color: tokens.color.success, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.caption, cursor: "pointer", textAlign: "center" }}>
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
              <div style={{ background: t.card, borderRadius: tokens.radius.lg, padding: tokens.space.lg, marginBottom: tokens.space.md, border: `1px solid ${t.border}` }}>
                <div style={{ fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.sm }}>Share FinCalci</div>
                <div style={captionMuted(t)}>Help your friends with their finances!</div>
                <button onClick={async () => {
                  const text = "FinCalci — 20 free calculators for India 🧮\nEMI, SIP, GST, Tax, Gold, Khata Book & more.\nTry it: https://fincalci.vercel.app";
                  try {
                    if (navigator.share) { await navigator.share({ title: "FinCalci", text, url: "https://fincalci.vercel.app" }); }
                    else { await navigator.clipboard.writeText(text); app.showToast("Link copied! 📋"); }
                  } catch { app.showToast("Share cancelled"); }
                }} style={{ width: "100%", marginTop: tokens.space.md, padding: tokens.space.md, borderRadius: tokens.radius.md, background: `${prefs.accent}15`, border: `1px solid ${prefs.accent}30`, color: prefs.accent, fontWeight: tokens.fontWeight.medium, fontSize: tokens.fontSize.small, cursor: "pointer", fontFamily: tokens.fontFamily.sans }}>
                  📤 Share with friends
                </button>
              </div>
              {/* About */}
              <div style={{ background: t.card, borderRadius: tokens.radius.lg, padding: tokens.space.lg, border: `1px solid ${t.border}` }}>
                <div style={{ fontWeight: tokens.fontWeight.medium, marginBottom: tokens.space.xs }}>About</div>
                <div style={captionMuted(t)}>FinCalci v2.0 &bull; 60+ tools in 20 tiles</div>
                <a href="/privacy-policy.html" target="_blank" rel="noopener" style={{ fontSize: tokens.fontSize.caption, color: prefs.accent, marginTop: tokens.space.xs, display: "inline-block" }}>Privacy policy</a>
              </div>
            </div>
          </SectionBoundary>
        ) : null}

        {/* ─── BOTTOM NAV ─── */}
        </main>
        <nav role="navigation" aria-label="Main navigation" style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: t.navBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: `1px solid ${t.border}`, padding: `${tokens.space.sm}px 0 14px`, display: "flex", justifyContent: "space-around", boxShadow: t.shadow, zIndex: 100 }}>
          {[{ id: "home", l: "Home", icon: NI.home }, { id: "favorites", l: "Favorites", icon: NI.star }, { id: "history", l: "History", icon: NI.clock }, { id: "settings", l: "Settings", icon: NI.cog }].map(n => {
            const isA = app.tab === n.id && !app.active;
            const ac = isA ? prefs.accent : t.textDim;
            return <button key={n.id} aria-label={n.l} onClick={() => {
              if (n.id === "home") { app.goHome(); }
              else { app.setTab(n.id); app.setActive(null); pushTab(n.id); }
              vib(5);
            }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: `4px ${tokens.space.lg}px`, borderRadius: tokens.radius.md }}>
              {n.icon(ac)}
              <span style={{ fontSize: 10, fontWeight: isA ? tokens.fontWeight.medium : tokens.fontWeight.regular, color: ac }}>{n.l}</span>
              {isA && <div style={{ width: 4, height: 4, borderRadius: 2, background: prefs.accent, marginTop: -2 }} />}
            </button>;
          })}
        </nav>
      </div>
    </AppErrorBoundary>
  );
}
