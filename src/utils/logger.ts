// FinCalci — Debug logger
// console.error survives production builds (Vite strips .log/.warn/.info but keeps .error)
// Every catch block should call one of these instead of swallowing silently.
//
// Usage:
//   import { logError, logWarn, logDebug } from '../utils/logger';
//   } catch (e) { logError('db.smartGet', e); return fallback; }

/** Log errors that indicate data loss, failed writes, or broken features.
 *  Survives production build (console.error is preserved). */
export const logError = (context: string, error?: unknown): void => {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  console.error(`[FinCalci:${context}] ${msg}`);
  // Sentry-ready: window.Sentry?.captureException(error, { tags: { context } });
};

/** Log warnings for degraded functionality (offline, API fallback, etc).
 *  STRIPPED in production builds — dev-only visibility. */
export const logWarn = (context: string, msg?: string): void => {
  // eslint-disable-next-line no-console
  console.warn?.(`[FinCalci:${context}] ${msg ?? ''}`);
};

/** Log debug info for development only. Fully stripped in production. */
export const logDebug = (context: string, ...args: unknown[]): void => {
  // eslint-disable-next-line no-console
  console.log?.(`[FinCalci:${context}]`, ...args);
};
