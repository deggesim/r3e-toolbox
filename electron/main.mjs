import { app, BrowserWindow, dialog, ipcMain, session } from "electron";
import isDev from "electron-is-dev";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, "../public/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Configure session to bypass CORS for external resources
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['Origin'] = 'https://game.raceroom.com';
    callback({ requestHeaders: details.requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders || {};
    headers['Access-Control-Allow-Origin'] = ['*'];
    headers['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, OPTIONS'];
    headers['Access-Control-Allow-Headers'] = ['*'];
    callback({ responseHeaders: headers });
  });

  const startUrl = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../dist/index.html")}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for file operations
ipcMain.handle("dialog:openFile", async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Text Files", extensions: ["txt"] },
      { name: "JSON Files", extensions: ["json"] },
      { name: "XML Files", extensions: ["xml"] },
      { name: "All Files", extensions: ["*"] },
    ],
    ...options,
  });
  return result.filePaths[0] || null;
});

ipcMain.handle("dialog:openDirectory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return result.filePaths[0] || null;
});

ipcMain.handle(
  "dialog:saveFile",
  async (event, defaultPath = "", filters = []) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters:
        filters.length > 0
          ? filters
          : [{ name: "All Files", extensions: ["*"] }],
    });
    return result.filePath || null;
  },
);

ipcMain.handle("fs:readFile", async (event, filePath) => {
  try {
    const content = await readFile(filePath, "utf8");
    return { success: true, data: content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:writeFile", async (event, filePath, content) => {
  try {
    await writeFile(filePath, content, "utf8");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:readdir", async (event, dirPath) => {
  try {
    const files = await readdir(dirPath);
    return { success: true, data: files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("app:findR3eDataFile", async () => {
  const documentsDir = app.getPath("documents");
  const possiblePaths = [
    // Windows common paths
    path.join(
      process.env.ProgramFiles || String.raw`C:\Program Files`,
      "RaceRoom Racing Experience",
      "Game",
      "GameData",
      "General",
      "r3e-data.json",
    ),
    path.join(
      process.env.ProgramFilesX86 || String.raw`C:\Program Files (x86)`,
      "RaceRoom Racing Experience",
      "Game",
      "GameData",
      "General",
      "r3e-data.json",
    ),
    // Windows Steam paths
    path.join(
      process.env.ProgramFiles || String.raw`C:\Program Files`,
      "Steam",
      "steamapps",
      "common",
      "RaceRoom Racing Experience",
      "Game",
      "GameData",
      "General",
      "r3e-data.json",
    ),
    path.join(
      process.env.ProgramFilesX86 || String.raw`C:\Program Files (x86)`,
      "Steam",
      "steamapps",
      "common",
      "RaceRoom Racing Experience",
      "Game",
      "GameData",
      "General",
      "r3e-data.json",
    ),
    // Windows alternate Steam paths
    String.raw`C:\Steam\steamapps\common\RaceRoom Racing Experience\Game\GameData\General\r3e-data.json`,
    String.raw`C:\Program Files\Steam\steamapps\common\RaceRoom Racing Experience\Game\GameData\General\r3e-data.json`,
    // User Documents paths
    path.join(
      documentsDir,
      "My Games",
      "SimBin",
      "RaceRoom Racing Experience",
      "r3e-data.json",
    ),
    // Direct install paths
    String.raw`C:\RaceRoom Racing Experience\GameData\General\r3e-data.json`,
    // macOS paths
    path.join(
      process.env.HOME || "",
      "Library",
      "Application Support",
      "RaceRoom Racing Experience",
      "GameData",
      "General",
      "r3e-data.json",
    ),
    // macOS Steam paths
    path.join(
      process.env.HOME || "",
      "Library",
      "Application Support",
      "Steam",
      "steamapps",
      "common",
      "RaceRoom Racing Experience",
      "GameData",
      "General",
      "r3e-data.json",
    ),
    // Linux paths
    path.join(
      process.env.HOME || "",
      ".local",
      "share",
      "RaceRoom Racing Experience",
      "GameData",
      "General",
      "r3e-data.json",
    ),
    // Linux Steam paths
    path.join(
      process.env.HOME || "",
      ".steam",
      "steam",
      "steamapps",
      "common",
      "RaceRoom Racing Experience",
      "GameData",
      "General",
      "r3e-data.json",
    ),
    path.join(
      process.env.HOME || "",
      ".var",
      "app",
      "com.valvesoftware.Steam",
      "data",
      "Steam",
      "steamapps",
      "common",
      "RaceRoom Racing Experience",
      "GameData",
      "General",
      "r3e-data.json",
    ),
  ];

  for (const filePath of possiblePaths) {
    try {
      if (existsSync(filePath)) {
        const content = await readFile(filePath, "utf8");
        return { success: true, data: content, path: filePath };
      }
    } catch (error) {
      console.warn(`[findR3eDataFile] Error reading ${filePath}:`, error.message);
    }
  }

  return {
    success: false,
    error: "r3e-data.json not found in standard RaceRoom installation paths",
  };
});

ipcMain.handle("app:findAiadaptationFile", async () => {
  const documentsDir = app.getPath("documents");
  const possiblePaths = [
    // Windows UserData/Player1 path
    path.join(
      documentsDir,
      "My Games",
      "SimBin",
      "RaceRoom Racing Experience",
      "UserData",
      "Player1",
      "aiadaptation.xml",
    ),
    // macOS UserData/Player1 path
    path.join(
      process.env.HOME || "",
      "Library",
      "Application Support",
      "RaceRoom Racing Experience",
      "UserData",
      "Player1",
      "aiadaptation.xml",
    ),
    // Linux UserData/Player1 path
    path.join(
      process.env.HOME || "",
      ".local",
      "share",
      "RaceRoom Racing Experience",
      "UserData",
      "Player1",
      "aiadaptation.xml",
    ),
  ];

  for (const filePath of possiblePaths) {
    try {
      if (existsSync(filePath)) {
        const content = await readFile(filePath, "utf8");
        return { success: true, data: content, path: filePath };
      }
    } catch (error) {
      console.warn(`[findAiadaptationFile] Error reading ${filePath}:`, error.message);
    }
  }

  return {
    success: false,
    error: "aiadaptation.xml not found in standard RaceRoom UserData paths",
  };
});
