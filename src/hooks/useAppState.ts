// @ts-nocheck — TODO: add strict types
// FinCalci — useAppState: core app lifecycle, navigation, toast, connectivity
import { useState, useEffect, useRef, useCallback } from 'react';
import { KEYS, TIMING, ROUTES, SLUG_TO_ID } from '../utils/constants';
import { getCurrentRoute, getLegacyCalcId, pushCalcRoute, pushHome, replaceRoute, updatePageMeta } from '../utils/router';

import { safeStorageGet } from '../utils/storage';
import { validateArray, validateStats, safeParse } from '../utils/helpers';
import { migrateToIDB, isMigrated } from '../utils/db';
import { logError, logWarn } from '../utils/logger';
import { FA } from '../utils/firebase';
import { SFX } from '../utils/sound';
import { vib } from '../utils/haptics';
import { CALCULATORS } from '../utils/constants';

const VALID_IDS = new Set(CALCULATORS.map(c => c.id));

export default function useAppState() {
  const [splash, setSplash] = useState(true);
  const [onboarded, setOnboarded] = useState(() => {
    try {
      const raw = localStorage.getItem('fincalci-prefs');
      if (raw) { const p = JSON.parse(raw); return p?.onboarded === true; }
    } catch { /* first visit or corrupted — show onboarding */ }
    return false;
  });
  const [tab, _setTab] = useState("home");
  const setTab = useCallback((t) => { _setTab(t); tabRef.current = t; }, []);
  const [active, setActive] = useState(null);
  const [search, setSearch] = useState("");
  const [fadeIn, setFadeIn] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [isOnline, setIsOnline] = useState(() => { try { return navigator.onLine !== false; } catch { return true; } });
  const [toast, setToast] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [shareCardSvg, setShareCardSvg] = useState(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef<string | null>(null);
  const tabRef = useRef<string>("home");
  const mountedRef = useRef(true);  // Guard against setState after unmount

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => { setToast(null); toastTimer.current = null; }, TIMING.TOAST_DURATION);
  }, []);

  // ─── Main lifecycle effect (ALL listeners + timers tracked for cleanup) ───
  useEffect(() => {
    mountedRef.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];   // Track ALL timeouts for cleanup
    let idleHandle: number | null = null;                  // Track requestIdleCallback

    // Font loaded via index.html <link> — no JS injection needed.

    // IDB migration (once, background)
    if (!isMigrated()) { migrateToIDB().catch((e: unknown) => logError('idb.migrate', e)); }

    // ─── Global error safety net ───
    const onUncaught = (event: ErrorEvent) => {
      if (event.error && mountedRef.current) showToast("Something went wrong. Try again.");
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const isChunk = event.reason?.name === 'ChunkLoadError' || event.reason?.message?.includes('Loading chunk');
      if (isChunk) {
        // Log but don't swallow — let error boundary handle the UI
        logError('chunk.unhandledRejection', event.reason);
        // Don't preventDefault — let React error boundary catch it
      }
    };
    window.addEventListener("error", onUncaught);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    // ─── PWA install ───
    const onInstallAvail = () => { if (mountedRef.current) setCanInstall(true); };
    const onInstalled = () => { if (mountedRef.current) { setCanInstall(false); setInstallDismissed(true); } FA.track("app_installed"); };
    window.addEventListener("pwa-install-available", onInstallAvail);
    window.addEventListener("pwa-installed", onInstalled);

    // ─── URL-based routing (via router.ts — no direct window access) ───
    try {
      const route = getCurrentRoute();
      if (route.calcId && VALID_IDS.has(route.calcId)) {
        const id = route.calcId;
        const t = setTimeout(() => { if (mountedRef.current) { setActive(id); setFadeIn(true); } }, TIMING.DEEP_LINK_DELAY);
        timers.push(t);
      } else {
        const legacyCalc = getLegacyCalcId();
        if (legacyCalc && VALID_IDS.has(legacyCalc) && ROUTES[legacyCalc]) {
          replaceRoute("/" + ROUTES[legacyCalc].slug);
          const t = setTimeout(() => { if (mountedRef.current) { setActive(legacyCalc); setFadeIn(true); } }, TIMING.DEEP_LINK_DELAY);
          timers.push(t);
        }
      }
    } catch (e: unknown) { logWarn('appState.routing', String(e)); }

    // ─── Online/offline ───
    const goOnline = () => { if (mountedRef.current) { setIsOnline(true); showToast("Back online ✅"); } };
    const goOffline = () => { if (mountedRef.current) { setIsOnline(false); showToast("You're offline — calcs still work 📴"); } };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // ─── Back button ───
    const exitTimer = { current: 0 };
    const onBack = () => {
      if (!mountedRef.current) return;
      // popstate already popped history — just update React state to match
      const route = getCurrentRoute();
      if (route.calcId) {
        // Still on a calc route after pop — update state
        setActive(route.calcId); setTab("home");
        return;
      }
      // On home — check if we came from a tab or calculator
      if (activeRef.current) {
        // Was on a calculator, now popped to home
        setActive(null); setTab("home"); setShareCardSvg(null);
        activeRef.current = null;
        return;
      }
      // Check if we're on a non-home tab (favorites/history/settings)
      if (tabRef.current && tabRef.current !== "home") {
        setTab("home"); tabRef.current = "home";
        return;
      }
      const now = Date.now();
      if (now - exitTimer.current < TIMING.BACK_EXIT_WINDOW) {
        // Second press within window — let browser handle (exit app)
        return;
      }
      exitTimer.current = now;
      showToast("Press back again to exit 👋");
      // Push a dummy entry so next back fires popstate instead of exiting
      pushHome();
    };
    window.addEventListener("popstate", onBack);
    if (getCurrentRoute().isHome) replaceRoute("/");

    // ─── Prefetch (tracked for cleanup) ───
    const PREFETCH_MAP: Record<string, () => Promise<unknown>> = {
      emi: () => import('../calculators/EMICalc'),
      sip: () => import('../calculators/SIPCalc'),
      gst: () => import('../calculators/GSTCalc'),
      tax: () => import('../calculators/TaxCalc'),
      gold: () => import('../calculators/GoldCalc'),
      currency: () => import('../calculators/CurrencyCalc'),
      fd: () => import('../calculators/FDCalc'),
      salary: () => import('../calculators/SalaryCalc'),
      cash: () => import('../calculators/CashCounter'),
      expense: () => import('../calculators/ExpenseTrackerCalc'),
    };
    const prefetch = async () => {
      if (!mountedRef.current) return;
      try {
        const analytics = safeParse(localStorage.getItem(KEYS.ANALYTICS)) || {};
        const top5 = Object.entries(analytics).filter(([k]) => !k.startsWith("_")).sort((a: [string, any], b: [string, any]) => (b[1].opens || 0) - (a[1].opens || 0)).slice(0, 5).map(([id]) => id);
        const toLoad = top5.length >= 3 ? top5 : ["emi", "sip", "gst", "tax", "gold"];
        for (const id of toLoad) {
          if (!mountedRef.current) break;   // Stop prefetching if unmounted
          if (PREFETCH_MAP[id]) PREFETCH_MAP[id]().catch((e: unknown) => logWarn('prefetch.' + id, String(e)));
          await new Promise<void>(r => { const t = setTimeout(r, TIMING.PREFETCH_STAGGER); timers.push(t); });
        }
      } catch (e: unknown) { logWarn('appState', String(e)); }
    };
    if ("requestIdleCallback" in window) {
      idleHandle = requestIdleCallback(() => prefetch(), { timeout: 3000 });
    } else {
      const t = setTimeout(prefetch, TIMING.PREFETCH_FALLBACK);
      timers.push(t);
    }

    // ═══ CLEANUP: Every listener, timer, and callback removed ═══
    return () => {
      mountedRef.current = false;

      // Clear ALL tracked timers
      timers.forEach(t => clearTimeout(t));

      // Cancel idle callback
      if (idleHandle !== null && "cancelIdleCallback" in window) {
        cancelIdleCallback(idleHandle);
      }

      // Clear toast timer
      if (toastTimer.current) { clearTimeout(toastTimer.current); toastTimer.current = null; }

      // Remove ALL event listeners
      window.removeEventListener("error", onUncaught);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("pwa-install-available", onInstallAvail);
      window.removeEventListener("pwa-installed", onInstalled);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("popstate", onBack);
    };
  }, [showToast]);

  const openCalc = useCallback((id) => {
    if (!VALID_IDS.has(id)) return;
    SFX.tap(); setActive(id); activeRef.current = id; setLastResult(null); setShareCardSvg(null); setFadeIn(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setFadeIn(true)));
    pushCalcRoute(id);
    updatePageMeta(id);
  }, []);

  const goHome = useCallback(() => {
    setActive(null); activeRef.current = null; setTab("home"); setShareCardSvg(null);
    pushHome();
    updatePageMeta(null);
  }, []);

  const handleInstall = useCallback(async () => {
    vib(10);
    // triggerPWAInstall is set by service worker on beforeinstallprompt
    const trigger = (window as unknown as Record<string, unknown>).triggerPWAInstall as (() => Promise<boolean>) | undefined;
    if (trigger) {
      const ok = await trigger();
      if (ok) { showToast("Installing FinCalci! 🎉"); setCanInstall(false); }
      else showToast("Maybe next time!");
    }
  }, [showToast]);

  // Swipe-to-switch removed — conflicts with Android/iOS gesture navigation

  // ─── Dynamic SEO: title + description + canonical per route ───
  useEffect(() => {
    const route = active ? ROUTES[active] : null;
    if (route) {
      document.title = route.title;
      // Update meta description
      let desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', route.description);
      // Update canonical
      let canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute('href', `https://fin-calci.vercel.app/${route.slug}`);
      // Update OG tags
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', route.title);
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', route.description);
      let ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute('content', `https://fin-calci.vercel.app/${route.slug}`);
    } else {
      document.title = "FinCalci — Free EMI SIP GST Tax Calculator India";
      let desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', "FinCalci — 18 free calculators for India. EMI, SIP, GST, Tax, Gold, Currency, FD, Salary, Khata Book & more. No ads. Works offline.");
      let canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute('href', 'https://fin-calci.vercel.app/');
    }
  }, [active]);

  return {
    splash, setSplash, onboarded, setOnboarded,
    tab, setTab, active, setActive, search, setSearch,
    fadeIn, canInstall, installDismissed, setInstallDismissed, isOnline,
    toast, showToast, lastResult, setLastResult,
    shareCardSvg, setShareCardSvg,
    openCalc, goHome, handleInstall,
  };
}
