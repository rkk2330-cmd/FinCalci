// FinCalci — Haptic feedback utilities
export const vib = (ms = 5): void => { try { navigator.vibrate?.(ms); } catch { /* silent */ } };
export const vibSuccess = (): void => { try { navigator.vibrate?.([10, 50, 10]); } catch { /* silent */ } };
export const vibError = (): void => { try { navigator.vibrate?.([50, 30, 50]); } catch { /* silent */ } };
export const vibHeavy = (): void => { try { navigator.vibrate?.(30); } catch { /* silent */ } };
