/**
 * Storage adapter for Electron-based Zustand persistence using electron-store.
 * Falls back to localStorage in web mode.
 */

export const isElectron = Boolean(
  typeof globalThis.window !== "undefined" && globalThis.electron,
);

/**
 * Sanitizes values for IPC by filtering out non-serializable properties
 * (functions, symbols, undefined values, etc.)
 */
const sanitizeForIPC = (value: any): any => {
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
export const electronStoreAdapter = {
  async getItem(name: string): Promise<any | null> {
    try {
      const value = await globalThis.electron.storeGet(name);
      return value ?? null;
    } catch (error) {
      console.warn("[electronStoreAdapter] Get error:", error);
      return null;
    }
  },
  async setItem(name: string, value: any): Promise<void> {
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
};

/**
 * localStorage wrapper with proper JSON serialization/deserialization.
 */
export const localStorageAdapter = {
  getItem(name: string): any | null {
    try {
      const item = localStorage.getItem(name);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn("[localStorageAdapter] Parse error:", error);
      return null;
    }
  },
  setItem(name: string, value: any): void {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch (error) {
      console.warn("[localStorageAdapter] Serialize error:", error);
    }
  },
  removeItem(name: string): void {
    localStorage.removeItem(name);
  },
};

/**
 * Get the appropriate storage backend (Electron electron-store or localStorage).
 */
export const getStorage = () => {
  const storage = isElectron ? electronStoreAdapter : localStorageAdapter;
  console.log(
    "[Storage] Using:",
    isElectron ? "electron-store" : "localStorage",
  );
  return storage;
};
