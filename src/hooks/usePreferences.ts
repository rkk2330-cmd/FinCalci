// @ts-nocheck — TODO: add strict types
// FinCalci — usePreferences: theme, accent color, sound, favorites
import { useState, useEffect, useCallback, useMemo } from 'react';
import { KEYS } from '../utils/constants';
import { safeStorageGet, safeStorageSet } from '../utils/storage';
import { validateArray } from '../utils/helpers';
import { mkTheme, ACCENT_COLORS } from '../design/theme';
import { SFX } from '../utils/sound';
import { vib } from '../utils/haptics';
import { CALCULATORS } from '../utils/constants';

/**
 * @param {((msg: string) => void) | undefined} showToast
 */
export default function usePreferences(showToast) {
  const [theme, setTheme] = useState(() => {
    try { return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; }
    catch { return 'dark'; }
  });
  const [accent, setAccent] = useState("#10B981");
  const [soundOn, setSoundOn] = useState(false);
  const [favorites, setFavorites] = useState<unknown[]>([]);

  const t = useMemo(() => mkTheme(theme), [theme]);

  // Load preferences on mount
  useEffect(() => {
    // Mute by default until we know user's preference
    SFX.mute(true);
    (async () => {
      const prefs = await safeStorageGet(KEYS.PREFS, {});
      if (prefs && typeof prefs === "object") {
        if (prefs.theme === "dark" || prefs.theme === "light") setTheme(prefs.theme);
        if (typeof prefs.accent === "string" && ACCENT_COLORS.some(ac => ac.color === prefs.accent)) setAccent(prefs.accent);
        if (prefs.soundOn === true) { setSoundOn(true); SFX.mute(false); }
        
      }
      const favs = await safeStorageGet(KEYS.FAVORITES, []);
      setFavorites(validateArray(favs, 50).filter(f => typeof f === "string"));
    })();
  }, []);

  const savePrefs = useCallback(async (updates = {}) => {
    const merged = {
      theme: updates.theme || theme,
      accent: updates.accent || accent,
      onboarded: updates.onboarded !== undefined ? updates.onboarded : true,
      rateDismissed: updates.rateDismissed || false,
      soundOn: updates.soundOn !== undefined ? updates.soundOn : soundOn,
    };
    await safeStorageSet(KEYS.PREFS, merged);
  }, [theme, accent, soundOn]);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    safeStorageSet(KEYS.PREFS, { theme: next, accent, onboarded: true, soundOn });
    vib(10);
  }, [theme, accent, soundOn]);

  const setAccentColor = useCallback((c) => {
    setAccent(c);
    safeStorageSet(KEYS.PREFS, { theme, accent: c, onboarded: true, soundOn });
    vib(10);
  }, [theme, soundOn]);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    SFX.mute(!next);
    safeStorageSet(KEYS.PREFS, { theme, accent, onboarded: true, soundOn: next });
    vib(5);
  }, [soundOn, theme, accent]);

  const saveFavs = useCallback(async (f) => {
    const safe = validateArray(f, 50);
    setFavorites(safe);
    await safeStorageSet(KEYS.FAVORITES, safe);
  }, []);

  const toggleFav = useCallback((id) => {
    const VALID = new Set(CALCULATORS.map(c => c.id));
    if (!VALID.has(id)) return;
    vib(15); SFX.tap();
    const isFav = favorites.includes(id);
    saveFavs(isFav ? favorites.filter(f => f !== id) : [...favorites, id]);
    if (showToast) showToast(isFav ? "Removed" : "Added ⭐");
  }, [favorites, saveFavs, showToast]);

  const favCalcs = useMemo(() => CALCULATORS.filter(c => favorites.includes(c.id)), [favorites]);

  return {
    theme, accent, soundOn, favorites, t,
    toggleTheme, setAccentColor, toggleSound, toggleFav,
    savePrefs, saveFavs, favCalcs,
    ACCENT_COLORS,
  };
}
