// src/main/ipc/store.ts
import type { IpcMain } from "electron";
import type Store from "electron-store";

export function registerStoreHandlers(ipcMain: IpcMain, store: Store): void {
  ipcMain.handle("store:get", async (_event, key: string) => {
    try {
      return store.get(key);
    } catch (error) {
      console.error("[store:get] Error:", error);
      return null;
    }
  });

  ipcMain.handle("store:set", async (_event, key: string, value: unknown) => {
    try {
      store.set(key, value);
      return { success: true };
    } catch (error) {
      console.error("[store:set] Error:", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("store:delete", async (_event, key: string) => {
    try {
      store.delete(key);
      return { success: true };
    } catch (error) {
      console.error("[store:delete] Error:", error);
      return { success: false, error: (error as Error).message };
    }
  });
}
