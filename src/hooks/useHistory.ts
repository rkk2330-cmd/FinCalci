import { logError, logWarn } from '../utils/logger';
// @ts-nocheck — TODO: add strict types
// FinCalci — useHistory: calculation history, recent, stats, achievements
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { KEYS, LIMITS, TIMING } from '../utils/constants';
import { hashResult, todayISO } from '../utils/validate';
import { safeStorageGet, safeStorageSet } from '../utils/storage';
import { validateArray, validateStats, sanitize, escHtml, safeParse, generateShareCard } from '../utils/helpers';
import { SFX } from '../utils/sound';
import { FA } from '../utils/firebase';
import { vib, vibSuccess } from '../utils/haptics';
import { CALCULATORS, ACHIEVEMENTS } from '../utils/constants';

const VALID_IDS = new Set(CALCULATORS.map(c => c.id));

/**
 * @param {(msg: string) => void} showToast
 */
export default function useHistory(showToast) {
  /** @type {[import('../types').HistoryEntry[], Function]} */
  const [history, setHistory] = useState<unknown[]>([]);
  /** @type {[string[], Function]} */
  const [recent, setRecent] = useState<unknown[]>([]);
  /** @type {[import('../types').UserStats, Function]} */
  const [stats, setStats] = useState({ totalCalcs: 0, uniqueCalcs: 0, calcSet: [], streak: 0, lastDate: "", saved: 0 });
  const [newAch, setNewAch] = useState(null);
  const [showRatePopup, setShowRatePopup] = useState(false);
  const [ratePopupDismissed, setRatePopupDismissed] = useState(false);

  const achTimer = useRef(null);

  // Load on mount
  useEffect(() => {
    (async () => {
      const hist = await safeStorageGet(KEYS.HISTORY, []);
      setHistory(validateArray(hist, LIMITS.HISTORY_MAX).filter(h => h && typeof h === "object" && h.calcId));
      const rec = await safeStorageGet(KEYS.RECENT, []);
      setRecent(validateArray(rec, LIMITS.RECENT_MAX).filter(r => typeof r === "string"));
      const rawStats = await safeStorageGet(KEYS.STATS, null);
      setStats(validateStats(rawStats));
      const prefs = await safeStorageGet(KEYS.PREFS, {});
      if (prefs?.rateDismissed) setRatePopupDismissed(true);
    })();
  }, []);

  const saveHist = useCallback(async (h) => {
    const safe = validateArray(h, LIMITS.HISTORY_MAX);
    setHistory(safe);
    await safeStorageSet(KEYS.HISTORY, safe);
  }, []);

  const saveRecent = useCallback(async (r) => {
    const safe = validateArray(r, LIMITS.RECENT_MAX);
    setRecent(safe);
    await safeStorageSet(KEYS.RECENT, safe);
  }, []);

  const saveStats = useCallback(async (s) => {
    const safe = validateStats(s);
    setStats(safe);
    await safeStorageSet(KEYS.STATS, safe);
  }, []);

  const checkAchievements = useCallback((newStats) => {
    ACHIEVEMENTS.forEach(a => {
      const wasUnlocked = a.check(stats);
      if (!wasUnlocked && a.check(newStats)) {
        setNewAch(a); SFX.chime();
        FA.track('achievement_unlocked', { achievement_id: a.id, title: a.title });
        if (achTimer.current) clearTimeout(achTimer.current);
        achTimer.current = setTimeout(() => { setNewAch(null); achTimer.current = null; }, TIMING.ACHIEVEMENT_DURATION);
      }
    });
  }, [stats]);

  const trackCalcUse = useCallback((calcId) => {
    if (!VALID_IDS.has(calcId)) return;
    const today = todayISO();
    const cs = new Set(stats.calcSet || []); cs.add(calcId);
    let streak = stats.streak || 0;
    const ld = stats.lastDate || "";
    const yd = new Date(); yd.setDate(yd.getDate() - 1); const yesterday = `${yd.getFullYear()}-${String(yd.getMonth()+1).padStart(2,'0')}-${String(yd.getDate()).padStart(2,'0')}`;
    if (ld === yesterday) streak++; else if (ld !== today) streak = 1;
    const ns = { ...stats, totalCalcs: (stats.totalCalcs || 0) + 1, uniqueCalcs: cs.size, calcSet: [...cs], streak, lastDate: today, saved: stats.saved || 0 };
    checkAchievements(ns); saveStats(ns);
    const nr = [calcId, ...recent.filter(r => r !== calcId)].slice(0, 5);
    saveRecent(nr);
    // Local analytics
    try {
      const ak = KEYS.ANALYTICS;
      const a = safeParse(localStorage.getItem(ak)) || {};
      if (!a[calcId]) a[calcId] = { opens: 0, lastUsed: "" };
      a[calcId].opens = (a[calcId].opens || 0) + 1; a[calcId].lastUsed = today;
      a._totalSessions = (a._totalSessions || 0) + (stats.totalCalcs === 0 ? 1 : 0);
      a._lastActive = today;
      localStorage.setItem(ak, JSON.stringify(a));
    } catch (e: unknown) { logError('history.trackCalcUse', e); }
    if (ns.totalCalcs === 3 && !ratePopupDismissed) {
      setTimeout(() => setShowRatePopup(true), TIMING.RATE_POPUP_DELAY);
    }
  }, [stats, recent, ratePopupDismissed, checkAchievements, saveStats, saveRecent]);

  const handleSave = useCallback((active, lastResult) => {
    if (!lastResult || !active) return;
    const hash = hashResult(active, lastResult);
    const isDuplicate = history.some(h => h._hash === hash || (h.calcId === active && hashResult(h.calcId, h.result) === hash));
    if (isDuplicate) { vib(10); showToast("Already saved! Change values to save new."); return; }
    const entry = { id: Date.now(), calcId: active, result: lastResult, time: new Date().toLocaleString(), _hash: hash };
    saveHist([entry, ...history].slice(0, LIMITS.HISTORY_MAX));
    const ns = { ...stats, saved: (stats.saved || 0) + 1 };
    saveStats(ns); checkAchievements(ns);
    vib([10, 50, 10]); SFX.ding(); showToast("Saved 💾");
  }, [history, stats, showToast, saveHist, saveStats, checkAchievements]);

  const handleShare = useCallback(async (active, lastResult) => {
    if (!lastResult || !active) return;
    const meta = CALCULATORS.find(c => c.id === active);
    if (!meta) return;
    const safeResults = Object.entries(lastResult).map(([k, v]) => `${escHtml(sanitize(String(k), 30))}: ${escHtml(sanitize(String(v), 50))}`).join("\n");
    const text = `${meta.icon} *${meta.desc}*\n━━━━━━━━━━━━\n${safeResults}\n━━━━━━━━━━━━\n🧮 _Made with FinCalci_\n📲 fin-calci.vercel.app`;
    vib(10); SFX.ding();
    if (navigator.share) {
      try { await navigator.share({ title: `FinCalci - ${meta.desc}`, text }); } catch (e: unknown) { logWarn('share', e instanceof Error ? e.message : 'cancelled'); showToast("Share cancelled"); }
    } else {
      try { await navigator.clipboard.writeText(text); showToast("Copied! 📋"); } catch (e: unknown) { logWarn('clipboard', e instanceof Error ? e.message : 'failed'); showToast("Could not copy"); }
    }
  }, [showToast]);

  const clearHistory = useCallback(() => {
    saveHist([]);
    vib(10); showToast("History cleared");
  }, [saveHist, showToast]);

  const deleteEntry = useCallback((id) => {
    saveHist(history.filter(h => h.id !== id));
    vib(5);
  }, [history, saveHist]);

  const handleRate = useCallback((stars) => {
    setShowRatePopup(false); setRatePopupDismissed(true);
    safeStorageSet(KEYS.PREFS, { rateDismissed: true }); vib(10);
    if (stars >= 4) showToast("Thank you! Opening store...");
    else showToast("Thanks for your feedback!");
  }, [showToast]);

  const dismissRate = useCallback(() => {
    setShowRatePopup(false); setRatePopupDismissed(true);
    safeStorageSet(KEYS.PREFS, { rateDismissed: true }); vib(5);
  }, []);

  const recentCalcs = useMemo(() => recent.map(id => CALCULATORS.find(c => c.id === id)).filter(Boolean).slice(0, 5), [recent]);
  const unlockedAch = useMemo(() => ACHIEVEMENTS.filter(a => a.check(stats)), [stats]);

  return {
    history, recent, stats, newAch, showRatePopup, ratePopupDismissed,
    recentCalcs, unlockedAch,
    trackCalcUse, handleSave, handleShare, clearHistory, deleteEntry,
    handleRate, dismissRate,
  };
}
