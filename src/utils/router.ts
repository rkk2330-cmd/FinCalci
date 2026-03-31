// FinCalci — Router abstraction
// Centralizes ALL window.history and window.location access.
// No library needed — just clean wrappers with error handling.
// Every other file imports from here instead of touching window directly.

import { ROUTES, SLUG_TO_ID } from './constants';
import { logWarn } from './logger';

// ─── Types ───
export interface RouteInfo {
  calcId: string | null;
  slug: string;
  isHome: boolean;
}

// ─── Read current route ───
export function getCurrentRoute(): RouteInfo {
  try {
    const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
    const calcId = SLUG_TO_ID[path] || null;
    return { calcId, slug: path, isHome: !path || path === '' };
  } catch {
    return { calcId: null, slug: '', isHome: true };
  }
}

// ─── Parse legacy ?calc=X query param ───
export function getLegacyCalcId(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('calc');
  } catch {
    return null;
  }
}

// ─── Navigate to calculator (push clean URL) ───
export function pushCalcRoute(calcId: string): void {
  const route = ROUTES[calcId];
  if (!route) return;
  try {
    window.history.pushState({ calc: calcId }, '', '/' + route.slug);
  } catch (e: unknown) {
    logWarn('router.pushCalc', String(e));
  }
}

// ─── Navigate home ───
export function pushHome(): void {
  try {
    window.history.pushState(null, '', '/');
  } catch (e: unknown) {
    logWarn('router.pushHome', String(e));
  }
}

// ─── Replace current route (for redirects, no back-button entry) ───
export function replaceRoute(path: string): void {
  try {
    window.history.replaceState(null, '', path);
  } catch (e: unknown) {
    logWarn('router.replace', String(e));
  }
}

// ─── Force reload (crash recovery) ───
export function forceReload(): void {
  try {
    window.location.reload();
  } catch {
    // Last resort — navigate to origin
    try { window.location.href = window.location.origin; } catch { /* iframe blocked */ }
  }
}

// ─── Update page metadata for SEO (title, canonical, description) ───
export function updatePageMeta(calcId: string | null): void {
  const route = calcId ? ROUTES[calcId] : null;
  try {
    if (route) {
      document.title = route.title;
      const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (canonical) canonical.href = `https://fincalci.vercel.app/${route.slug}`;
      const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (desc) desc.content = route.description;
    } else {
      document.title = 'FinCalci — All-in-One Indian Calculator';
      const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (canonical) canonical.href = 'https://fincalci.vercel.app/';
    }
  } catch { /* SSR or restricted context */ }
}

export function pushTab(tabId: string): void {
  try {
    window.history.pushState({ tab: tabId }, '', '/');
  } catch (e: unknown) {
    logWarn('router.pushTab', String(e));
  }
}
