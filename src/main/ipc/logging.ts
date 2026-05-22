// src/main/ipc/logging.ts
import type { IpcMain } from "electron";
import type log from "electron-log";

export function registerLoggingHandlers(
  ipcMain: IpcMain,
  logger: typeof log,
  logsDir: string,
): void {
  ipcMain.handle("log:info",  async (_e, msg: string, meta?: unknown) => { logger.info(msg, meta);  return { success: true }; });
  ipcMain.handle("log:error", async (_e, msg: string, meta?: unknown) => { logger.error(msg, meta); return { success: true }; });
  ipcMain.handle("log:warn",  async (_e, msg: string, meta?: unknown) => { logger.warn(msg, meta);  return { success: true }; });
  ipcMain.handle("log:debug", async (_e, msg: string, meta?: unknown) => { logger.debug(msg, meta); return { success: true }; });
  ipcMain.handle("log:getPath", async () => logsDir);
}
