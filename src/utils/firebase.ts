// @ts-nocheck — Firebase SDK loaded dynamically from CDN
import { logError } from './logger';
import { KEYS } from "./constants";
// FinCalci — Firebase Analytics
// Lazy-loaded, queue-based, offline-resilient

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB3_ildc6R7FMYI5FuJKSLoBtM8QAZnkPw",
  authDomain: "fincalci-895de.firebaseapp.com",
  projectId: "fincalci-895de",
  storageBucket: "fincalci-895de.firebasestorage.app",
  messagingSenderId: "435062641932",
  appId: "1:435062641932:web:9c828fb170d239618b6529",
  measurementId: "G-DWEN0P2LY4"
};

export const FA = {
  _app: null as any, _analytics: null as any,
  _logEvent: null as any, _setUserProperties: null as any,
  _ready: false, _queue: [] as [string, Record<string, unknown>][],
  async init() {
    if (this._ready || this._app) return;
    if (FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") { this._ready = false; return; }
    try {
      // @ts-expect-error CDN dynamic import
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js");
      // @ts-expect-error CDN dynamic import
      const { getAnalytics, logEvent, setUserProperties } = await import("https://www.gstatic.com/firebasejs/11.1.0/firebase-analytics.js");
      this._app = initializeApp(FIREBASE_CONFIG);
      this._analytics = getAnalytics(this._app);
      this._logEvent = logEvent;
      this._setUserProperties = setUserProperties;
      this._ready = true;
      this._queue.forEach(([name, params]) => logEvent(this._analytics, name, params));
      this._queue = [];
    } catch(e: unknown) { logError('firebase.init', e); }
  },
  track(name, params = {}) {
    const enriched = { ...params, is_online: navigator.onLine !== false, ts: Date.now() };
    if (this._ready && this._analytics) {
      try { this._logEvent(this._analytics, name, enriched); } catch (e: unknown) { logError('firebase.track', e); }
    } else {
      this._queue.push([name, enriched]);
      if (this._queue.length === 1) this.init();
    }
    // Local backup (offline-resilient)
    try {
      const ak = KEYS.EVENTS;
      const events = JSON.parse(localStorage.getItem(ak) || "[]");
      events.push({ name, ...enriched });
      if (events.length > 500) events.splice(0, events.length - 500);
      localStorage.setItem(ak, JSON.stringify(events));
    } catch (e: unknown) { logError('firebase.localBackup', e); }
  },
  setUser(props) {
    if (this._ready && this._analytics) {
      try { this._setUserProperties(this._analytics, props); } catch (e: unknown) { logError('firebase.setUser', e); }
    }
  }
};
