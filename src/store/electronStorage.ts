/**
 * Storage adapter for Electron-based Zustand persistence using electron-store.
 * Falls back to localStorage in web mode.
 */

import type { PersistStorage, StorageValue } from "zustand/middleware";

export const isElectron = Boolean(
  typeof globalThis.window !== "undefined" && globalThis.electron,
);

/**
 * Sanitizes values for IPC by filtering out non-serializable properties
 * (functions, symbols, undefined values, etc.)
 */
const sanitizeForIPC = (value: unknown): unknown => {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => {
      // Filter out functions, symbols, and undefined
      if (
        typeof val === "function" ||
        typeof val === "symbol" ||
        val === undefined
      ) {
        return undefined;
      }
      return val;
    }),
  );
};

/**
 * electron-store adapter (async via IPC).
 * Sanitizes values to ensure only serializable data crosses the IPC boundary.
 */
const createElectronStoreAdapter = <T>(): PersistStorage<T> => ({
  async getItem(name: string): Promise<StorageValue<T> | null> {
    try {
      const value = await globalThis.electron.storeGet(name);
      return (value as StorageValue<T> | null) ?? null;
    } catch (error) {
      console.warn("[electronStoreAdapter] Get error:", error);
      return null;
    }
  },
  async setItem(name: string, value: StorageValue<T>): Promise<void> {
    try {
      const result = await globalThis.electron.storeSet(
        name,
        sanitizeForIPC(value),
      );
      if (result && !result.success) {
        console.warn("[electronStoreAdapter] Set failed:", result.error);
      }
    } catch (error) {
      console.warn("[electronStoreAdapter] Set error:", error);
    }
  },
  async removeItem(name: string): Promise<void> {
    try {
      const result = await globalThis.electron.storeDelete(name);
      if (result && !result.success) {
        console.warn("[electronStoreAdapter] Delete failed:", result.error);
      }
    } catch (error) {
      console.warn("[electronStoreAdapter] Delete error:", error);
    }
  },
});

/**
 * localStorage wrapper with proper JSON serialization/deserialization.
 */
const createLocalStorageAdapter = <T>(): PersistStorage<T> => ({
  getItem(name: string): StorageValue<T> | null {
    try {
      const item = localStorage.getItem(name);
      return item ? (JSON.parse(item) as StorageValue<T>) : null;
    } catch (error) {
      console.warn("[localStorageAdapter] Parse error:", error);
      return null;
    }
  },
  setItem(name: string, value: StorageValue<T>): void {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch (error) {
      console.warn("[localStorageAdapter] Serialize error:", error);
    }
  },
  removeItem(name: string): void {
    localStorage.removeItem(name);
  },
});

/**
 * Get the appropriate storage backend (Electron electron-store or localStorage).
 */
export const getStorage = <T>(): PersistStorage<T> => {
  const storage = isElectron
    ? createElectronStoreAdapter<T>()
    : createLocalStorageAdapter<T>();
  console.log(
    "[Storage] Using:",
    isElectron ? "electron-store" : "localStorage",
  );
  return storage;
};
