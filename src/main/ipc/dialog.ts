// src/main/ipc/dialog.ts
import { dialog, BrowserWindow } from "electron";
import type { IpcMain } from "electron";

export function registerDialogHandlers(
  ipcMain: IpcMain,
  getWindow: () => BrowserWindow,
): void {
  ipcMain.handle("dialog:openFile", async (_event, options = {}) => {
    const result = await dialog.showOpenDialog(getWindow(), {
      properties: ["openFile"],
      filters: [
        { name: "Text Files", extensions: ["txt"] },
        { name: "JSON Files", extensions: ["json"] },
        { name: "XML Files", extensions: ["xml"] },
        { name: "All Files", extensions: ["*"] },
      ],
      ...options,
    });
    return result.filePaths[0] ?? null;
  });

  ipcMain.handle("dialog:openDirectory", async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      properties: ["openDirectory"],
    });
    return result.filePaths[0] ?? null;
  });

  ipcMain.handle("dialog:saveFile", async (_event, defaultPath = "", filters = []) => {
    const result = await dialog.showSaveDialog(getWindow(), {
      defaultPath,
      filters: filters.length > 0 ? filters : [{ name: "All Files", extensions: ["*"] }],
    });
    return result.filePath ?? null;
  });
}
