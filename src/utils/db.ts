import { logError } from './logger';
// FinCalci — IndexedDB wrapper
// Stores large data (Khata, Expense, Split, Calorie) in IndexedDB.
// Falls back to localStorage if IndexedDB is unavailable.
// Auto-migrates existing localStorage data on first load.

const DB_NAME = 'fincalci-db';
const DB_VERSION = 1;
const STORE_NAME = 'data';

let _db: IDBDatabase | null = null;
let _dbReady: Promise<IDBDatabase | null> | null = null;

/** Open/create the database */
function openDB(): Promise<IDBDatabase | null> {
  if (_dbReady) return _dbReady;

  _dbReady = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }

    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      req.onsuccess = () => {
        _db = req.result;
        resolve(_db);
      };

      req.onerror = () => {
        resolve(null);
      };
    } catch (e: unknown) { logError("db.unknown", e);
      resolve(null);
    }
  });

  return _dbReady;
}

/** Get a value from IndexedDB */
export async function idbGet<T = unknown>(key: string): Promise<T | null> {
  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch (e: unknown) { logError("db.unknown>", e);
      resolve(null);
    }
  });
}

/** Set a value in IndexedDB */
export async function idbSet(key: string, value: unknown): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e: unknown) { logError("db.idbSet", e);
      resolve(false);
    }
  });
}

/** Delete a value from IndexedDB */
export async function idbDelete(key: string): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e: unknown) { logError("db.idbDelete", e);
      resolve(false);
    }
  });
}

/** List all keys in IndexedDB */
export async function idbKeys(): Promise<string[]> {
  const db = await openDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result || []).map(String));
      req.onerror = () => resolve([]);
    } catch (e: unknown) { logError("db.idbKeys", e);
      resolve([]);
    }
  });
}

// ─── Migration: localStorage → IndexedDB ───
// Keys that should move to IDB (large data that can exceed localStorage)
const MIGRATE_KEYS = [
  'fincalci-khata',
  'fincalci-expense-tracker',
  'fincalci-split-sessions',
  'fincalci-cal-data',
];

/** Migrate large data from localStorage to IndexedDB (runs once) */
export async function migrateToIDB(): Promise<{ migrated: number; errors: number }> {
  const db = await openDB();
  if (!db) return { migrated: 0, errors: 0 };

  let migrated = 0;
  let errors = 0;

  for (const key of MIGRATE_KEYS) {
    try {
      // Check if already in IDB
      const existing = await idbGet(key);
      if (existing !== null) continue; // Already migrated

      // Check localStorage
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const ok = await idbSet(key, parsed);
      if (ok) {
        // Remove from localStorage to free space
        localStorage.removeItem(key);
        migrated++;
      } else {
        errors++;
      }
    } catch (e: unknown) { logError("db.migrateToIDB", e);
      errors++;
    }
  }

  // Mark migration as done
  if (migrated > 0) {
    try { localStorage.setItem('fincalci-idb-migrated', 'true'); } catch { /* migration flag not saved — will re-migrate next load */ }
  }

  return { migrated, errors };
}

/** Check if migration has been done */
export function isMigrated(): boolean {
  try { return localStorage.getItem('fincalci-idb-migrated') === 'true'; }
  catch { return false; }
}

// ─── Smart storage: try IDB first, fall back to localStorage ───

/** Read from IDB first, then localStorage, then return fallback */
export async function smartGet<T = unknown>(key: string, fallback: T): Promise<T> {
  // Try IDB first
  const idbVal = await idbGet<T>(key);
  if (idbVal !== null) return idbVal;

  // Try localStorage
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch (e: unknown) { logError("db.unknown>", e); }

  return fallback;
}

/** Write to IDB if available, else localStorage */
export async function smartSet(key: string, value: unknown): Promise<boolean> {
  // Always try IDB first for large-data keys
  if (MIGRATE_KEYS.includes(key)) {
    const ok = await idbSet(key, value);
    if (ok) return true;
  }

  // Fall back to localStorage
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e: unknown) { logError("db.smartSet", e);
    return false;
  }
}
