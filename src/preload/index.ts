// src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";
import type { IpcEvents } from "../shared/ipc-contracts";

contextBridge.exposeInMainWorld("electron", {
  openFile: (options?: unknown) => ipcRenderer.invoke("dialog:openFile", options),
  openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  saveFile: (defaultPath?: string, filters?: unknown) =>
    ipcRenderer.invoke("dialog:saveFile", defaultPath, filters),

  readFile: (filePath: string) => ipcRenderer.invoke("fs:readFile", filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke("fs:writeFile", filePath, content),
  writeFileBase64: (filePath: string, base64: string) =>
    ipcRenderer.invoke("fs:writeFileBase64", filePath, base64),
  readdir: (dirPath: string) => ipcRenderer.invoke("fs:readdir", dirPath),
  getTempDir: () => ipcRenderer.invoke("fs:getTempDir"),
  deleteDirectory: (dirPath: string) =>
    ipcRenderer.invoke("fs:deleteDirectory", dirPath),
  create7zArchive: (sourceDir: string, archivePath: string) =>
    ipcRenderer.invoke("fs:create7zArchive", sourceDir, archivePath),

  findR3eDataFile: () => ipcRenderer.invoke("app:findR3eDataFile"),
  findAiadaptationFile: () => ipcRenderer.invoke("app:findAiadaptationFile"),
  openExternal: (url: string) => ipcRenderer.invoke("app:openExternal", url),
  showItemInFolder: (filePath: string) =>
    ipcRenderer.invoke("app:showItemInFolder", filePath),

  storeGet: (key: string) => ipcRenderer.invoke("store:get", key),
  storeSet: (key: string, value: unknown) =>
    ipcRenderer.invoke("store:set", key, value),
  storeDelete: (key: string) => ipcRenderer.invoke("store:delete", key),

  logInfo: (message: string, metadata?: unknown) =>
    ipcRenderer.invoke("log:info", message, metadata),
  logError: (message: string, metadata?: unknown) =>
    ipcRenderer.invoke("log:error", message, metadata),
  logWarn: (message: string, metadata?: unknown) =>
    ipcRenderer.invoke("log:warn", message, metadata),
  logDebug: (message: string, metadata?: unknown) =>
    ipcRenderer.invoke("log:debug", message, metadata),
  getLogsPath: () => ipcRenderer.invoke("log:getPath"),

  onNavigate: (callback: (path: IpcEvents["navigate-to"]) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, path: IpcEvents["navigate-to"]) =>
      callback(path);
    ipcRenderer.on("navigate-to", listener);
    return () => ipcRenderer.removeListener("navigate-to", listener);
  },

  onUpdateDownloadProgress: (
    callback: (data: IpcEvents["update-download-progress"]) => void,
  ) => {
    const listener = (
      _e: Electron.IpcRendererEvent,
      data: IpcEvents["update-download-progress"],
    ) => callback(data);
    ipcRenderer.on("update-download-progress", listener);
    return () => ipcRenderer.removeListener("update-download-progress", listener);
  },
});
