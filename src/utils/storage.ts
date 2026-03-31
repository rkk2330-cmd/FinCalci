import { logError } from './logger';
// FinCalci — Typed localStorage wrappers
import { safeParse } from './helpers';
import { LIMITS, KEYS } from './constants';

/** All valid storage keys (prevents typo bugs at compile time) */
type StorageKey = typeof KEYS[keyof typeof KEYS];

/** Read a typed value from localStorage with fallback */
export async function safeStorageGet<T>(key: StorageKey, fallback: T): Promise<T>;
export async function safeStorageGet<T>(key: string, fallback: T): Promise<T>;
export async function safeStorageGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = safeParse<T>(raw, fallback);
    return parsed ?? fallback;
  } catch (e: unknown) { logError("storage", e);
    return fallback;
  }
}

/** Write a typed value to localStorage with size guard */
export async function safeStorageSet<T>(key: StorageKey, data: T): Promise<boolean>;
export async function safeStorageSet<T>(key: string, data: T): Promise<boolean>;
export async function safeStorageSet<T>(key: string, data: T): Promise<boolean> {
  try {
    const json = JSON.stringify(data);
    if (json.length > LIMITS.SINGLE_WRITE_MAX_BYTES) {
      return false;
    }
    localStorage.setItem(key, json);
    return true;
  } catch (e: unknown) { logError('storage.set', e);
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      try {
        localStorage.removeItem(KEYS.EVENTS);
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch (e: unknown) { logError("storage", e);
        return false;
      }
    }
    return false;
  }
}
