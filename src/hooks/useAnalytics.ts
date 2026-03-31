import { todayISO } from '../utils/validate';
// @ts-nocheck — TODO: add strict types
// FinCalci — useAnalytics: centralized event tracking
// Every user action passes through here → Firebase Analytics + local backup.
// Events are categorized for funnel analysis and retention tracking.
//
// Event taxonomy:
//   app_open, app_install, app_update_found
//   calc_open, calc_result_save, calc_result_share
//   calc_compare, calc_export_pdf
//   search_query, search_result_tap
//   pref_theme_toggle, pref_accent_change, pref_sound_toggle, pref_fav_toggle
//   feature_khata_txn, feature_expense_add, feature_split_settle, feature_calorie_log
//   achievement_unlocked
//   error_boundary_catch, error_chunk_load
//   session_start, session_end (via beforeunload)

import { useCallback, useEffect, useRef } from 'react';
import { FA } from '../utils/firebase';
import { KEYS } from '../utils/constants';
import { logError } from '../utils/logger';
import { safeParse } from '../utils/helpers';

/** Session ID — module-scoped, no window pollution.
 *  Generated once per page load. Survives component re-mounts but not navigation. */
let _sessionId: string | null = null;

function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  return _sessionId;
}

export default function useAnalytics() {
  const sessionStart = useRef(Date.now());
  const calcOpenTime = useRef(null);

  // Session start
  useEffect(() => {
    FA.track('session_start', { session_id: getSessionId() });

    // Increment local session count
    try {
      const a = safeParse(localStorage.getItem(KEYS.ANALYTICS)) || {};
      a._totalSessions = (a._totalSessions || 0) + 1;
      a._lastActive = todayISO();
      a._firstSeen = a._firstSeen || todayISO();
      localStorage.setItem(KEYS.ANALYTICS, JSON.stringify(a));
    } catch (e: unknown) { logError('analytics', e); }

    // Session end on page unload
    const onUnload = () => {
      const duration = Math.round((Date.now() - sessionStart.current) / 1000);
      FA.track('session_end', { duration_sec: duration, session_id: getSessionId() });
    };
    window.addEventListener('beforeunload', onUnload);

    // Set user properties once
    try {
      const a = safeParse(localStorage.getItem(KEYS.ANALYTICS)) || {};
      FA.setUser({
        total_calcs: String(a._totalCalcs || 0),
        unique_calcs: String(Object.keys(a).filter(k => !k.startsWith('_')).length),
        total_sessions: String(a._totalSessions || 1),
        first_seen: a._firstSeen || 'unknown',
      });
    } catch (e: unknown) { logError('analytics', e); }

    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  // ─── Calculator events ───

  const trackCalcOpen = useCallback((calcId) => {
    calcOpenTime.current = Date.now();
    FA.track('calc_open', { calc_id: calcId });

    // Local: increment per-calc opens
    try {
      const a = safeParse(localStorage.getItem(KEYS.ANALYTICS)) || {};
      if (!a[calcId]) a[calcId] = { opens: 0, lastUsed: '', totalTime: 0, saves: 0, shares: 0 };
      a[calcId].opens++;
      a[calcId].lastUsed = todayISO();
      localStorage.setItem(KEYS.ANALYTICS, JSON.stringify(a));
    } catch (e: unknown) { logError('analytics', e); }
  }, []);

  const trackCalcClose = useCallback((calcId) => {
    if (!calcOpenTime.current) return;
    const duration = Math.round((Date.now() - calcOpenTime.current) / 1000);
    FA.track('calc_close', { calc_id: calcId, duration_sec: duration });

    // Local: accumulate time
    try {
      const a = safeParse(localStorage.getItem(KEYS.ANALYTICS)) || {};
      if (a[calcId]) a[calcId].totalTime = (a[calcId].totalTime || 0) + duration;
      localStorage.setItem(KEYS.ANALYTICS, JSON.stringify(a));
    } catch (e: unknown) { logError('analytics', e); }
    calcOpenTime.current = null;
  }, []);

  const trackCalcSave = useCallback((calcId) => {
    FA.track('calc_result_save', { calc_id: calcId });
    try {
      const a = safeParse(localStorage.getItem(KEYS.ANALYTICS)) || {};
      if (a[calcId]) a[calcId].saves = (a[calcId].saves || 0) + 1;
      localStorage.setItem(KEYS.ANALYTICS, JSON.stringify(a));
    } catch (e: unknown) { logError('analytics', e); }
  }, []);

  const trackCalcShare = useCallback((calcId, method) => {
    FA.track('calc_result_share', { calc_id: calcId, method });
    try {
      const a = safeParse(localStorage.getItem(KEYS.ANALYTICS)) || {};
      if (a[calcId]) a[calcId].shares = (a[calcId].shares || 0) + 1;
      localStorage.setItem(KEYS.ANALYTICS, JSON.stringify(a));
    } catch (e: unknown) { logError('analytics', e); }
  }, []);

  const trackCalcCompare = useCallback((calcId) => {
    FA.track('calc_compare', { calc_id: calcId });
  }, []);

  const trackCalcExport = useCallback((calcId, format) => {
    FA.track('calc_export', { calc_id: calcId, format });
  }, []);

  // ─── Search events ───

  const trackSearch = useCallback((query, resultCount) => {
    FA.track('search_query', { query: query.slice(0, 30), result_count: resultCount });
  }, []);

  // ─── Preference events ───

  const trackPrefChange = useCallback((pref, value) => {
    FA.track('pref_change', { pref, value: String(value) });
  }, []);

  // ─── Feature events ───

  const trackFeature = useCallback((feature, action, meta) => {
    FA.track(`feature_${feature}`, { action, ...meta });
  }, []);

  // ─── Achievement events ───

  const trackAchievement = useCallback((achievementId) => {
    FA.track('achievement_unlocked', { achievement_id: achievementId });
  }, []);

  // ─── Error events ───

  const trackError = useCallback((errorType, calcId, message) => {
    FA.track('error_event', { error_type: errorType, calc_id: calcId || 'global', message: (message || '').slice(0, 100) });
  }, []);

  // ─── Return value ───
  return {
    trackCalcOpen,
    trackCalcClose,
    trackCalcSave,
    trackCalcShare,
    trackCalcCompare,
    trackCalcExport,
    trackSearch,
    trackPrefChange,
    trackFeature,
    trackAchievement,
    trackError,
  };
}
