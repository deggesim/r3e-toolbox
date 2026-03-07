const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  // Dialog operations
  openFile: (options) => ipcRenderer.invoke("dialog:openFile", options),
  openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  saveFile: (defaultPath, filters) =>
    ipcRenderer.invoke("dialog:saveFile", defaultPath, filters),

  // File system operations
  readFile: (filePath) => ipcRenderer.invoke("fs:readFile", filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke("fs:writeFile", filePath, content),
  writeFileBase64: (filePath, base64) =>
    ipcRenderer.invoke("fs:writeFileBase64", filePath, base64),
  readdir: (dirPath) => ipcRenderer.invoke("fs:readdir", dirPath),
  getTempDir: () => ipcRenderer.invoke("fs:getTempDir"),
  deleteDirectory: (dirPath) =>
    ipcRenderer.invoke("fs:deleteDirectory", dirPath),
  create7zArchive: (sourceDir, archivePath) =>
    ipcRenderer.invoke("fs:create7zArchive", sourceDir, archivePath),

  // Application operations
  findR3eDataFile: () => ipcRenderer.invoke("app:findR3eDataFile"),
  findAiadaptationFile: () => ipcRenderer.invoke("app:findAiadaptationFile"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  showItemInFolder: (filePath) =>
    ipcRenderer.invoke("app:showItemInFolder", filePath),

  // electron-store operations
  storeGet: (key) => ipcRenderer.invoke("store:get", key),
  storeSet: (key, value) => ipcRenderer.invoke("store:set", key, value),
  storeDelete: (key) => ipcRenderer.invoke("store:delete", key),

  // Logging operations
  logInfo: (message, metadata) =>
    ipcRenderer.invoke("log:info", message, metadata),
  logError: (message, metadata) =>
    ipcRenderer.invoke("log:error", message, metadata),
  logWarn: (message, metadata) =>
    ipcRenderer.invoke("log:warn", message, metadata),
  logDebug: (message, metadata) =>
    ipcRenderer.invoke("log:debug", message, metadata),
  getLogsPath: () => ipcRenderer.invoke("log:getPath"),

  // Update notifications
  onUpdateDownloadProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("update-download-progress", listener);
    return () => {
      ipcRenderer.removeListener("update-download-progress", listener);
    };
  },
});
