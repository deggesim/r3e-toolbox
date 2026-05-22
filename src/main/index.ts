// src/main/index.ts
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  session,
  shell,
} from "electron";
import isDev from "electron-is-dev";
import log from "electron-log";
import Store from "electron-store";
import { existsSync, mkdirSync } from "node:fs";
import { readdir, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { initAutoUpdater, manualCheckForUpdates } from "./updater";

const store = new Store();

const logsDir = path.join(app.getPath("userData"), "logs");
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

log.transports.file.resolvePathFn = () => path.join(logsDir, "main.log");
log.transports.file.maxSize = 5242880;
log.transports.console.level = isDev ? "debug" : "info";
log.transports.file.level = "info";

if (!isDev) {
  console.log = log.log;
  console.error = log.error;
  console.warn = log.warn;
  console.info = log.info;
  console.debug = log.debug;
}

let mainWindow: BrowserWindow | null = null;

const isInternalUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (isDev) {
      return parsed.origin === "http://localhost:5173";
    }
    return parsed.protocol === "file:";
  } catch {
    return false;
  }
};

const createWindow = (): BrowserWindow => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, "../../public/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders["Origin"] = "https://game.raceroom.com";
    callback({ requestHeaders: details.requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders ?? {};
    headers["Access-Control-Allow-Origin"] = ["*"];
    headers["Access-Control-Allow-Methods"] = [
      "GET, POST, PUT, DELETE, OPTIONS",
    ];
    headers["Access-Control-Allow-Headers"] = ["*"];
    callback({ responseHeaders: headers });
  });

  const startUrl = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../../out/renderer/index.html")}`;

  mainWindow.loadURL(startUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternalUrl(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isInternalUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
};

const createMenu = (win: BrowserWindow): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "Quit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "User Guide",
          accelerator: "F1",
          click: () => {
            win.webContents.send("navigate-to", "/help");
          },
        },
        { type: "separator" },
        {
          label: "Check for Updates",
          click: async () => {
            await manualCheckForUpdates(win);
          },
        },
        { type: "separator" },
        {
          label: "GitHub Repository",
          click: async () => {
            await shell.openExternal(
              "https://github.com/deggesim/r3e-toolbox",
            );
          },
        },
        { type: "separator" },
        {
          label: "About R3E Toolbox",
          click: () => {
            dialog.showMessageBox(win, {
              type: "info",
              title: "About R3E Toolbox",
              message: "R3E Toolbox",
              detail: `Version: ${app.getVersion()}\n\nA comprehensive toolkit for RaceRoom Racing Experience.\n\nFeatures:\n• AI difficulty optimization with statistical analysis\n• Qualification time recovery for race results\n• Championship standings generator with HTML export\n• Results database viewer\n\nAuthor: Simone De Gennaro\nLicense: Open Source\n\nBuilt with React, TypeScript, and Electron.\nBased on algorithms from r3e-adaptive-ai-primer by pixeljetstream.\n\nDeveloped with ❤️ for the RaceRoom community.`,
              buttons: ["OK"],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

// IPC Handlers for file operations
ipcMain.handle("dialog:openFile", async (_event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
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
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openDirectory"],
  });
  return result.filePaths[0] ?? null;
});

ipcMain.handle(
  "dialog:saveFile",
  async (_event, defaultPath = "", filters = []) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath,
      filters:
        filters.length > 0
          ? filters
          : [{ name: "All Files", extensions: ["*"] }],
    });
    return result.filePath ?? null;
  },
);

ipcMain.handle("fs:readFile", async (_event, filePath: string) => {
  try {
    const content = await readFile(filePath, "utf8");
    return { success: true, data: content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle(
  "fs:writeFile",
  async (_event, filePath: string, content: string) => {
    try {
      const dir = path.dirname(filePath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      await writeFile(filePath, content, "utf8");
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
);

ipcMain.handle(
  "fs:writeFileBase64",
  async (_event, filePath: string, base64: string) => {
    try {
      const dir = path.dirname(filePath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      const buffer = Buffer.from(base64, "base64");
      await writeFile(filePath, buffer);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
);

ipcMain.handle("fs:readdir", async (_event, dirPath: string) => {
  try {
    const files = await readdir(dirPath);
    return { success: true, data: files };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("fs:getTempDir", async () => {
  try {
    return { success: true, data: tmpdir() };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("fs:deleteDirectory", async (_event, dirPath: string) => {
  try {
    await rm(dirPath, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle(
  "fs:create7zArchive",
  async (_event, sourceDir: string, archivePath: string) => {
    try {
      const SevenZip = (await import("7zip-min")).default;

      await new Promise<void>((resolve, reject) => {
        SevenZip.pack(sourceDir, archivePath, (err: Error | null) => {
          if (err) {
            reject(new Error(err.message || String(err)));
            return;
          }
          resolve();
        });
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
);

ipcMain.handle("app:findR3eDataFile", async () => {
  const possiblePaths = [
    path.join(
      process.env.ProgramFiles ?? String.raw`C:\Program Files`,
      "RaceRoom Racing Experience",
      "Game",
      "GameData",
      "General",
      "r3e-data.json",
    ),
    path.join(
      process.env.ProgramFilesX86 ?? String.raw`C:\Program Files (x86)`,
      "RaceRoom Racing Experience",
      "Game",
      "GameData",
      "General",
      "r3e-data.json",
    ),
    path.join(
      process.env.ProgramFiles ?? String.raw`C:\Program Files`,
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
      process.env.ProgramFilesX86 ?? String.raw`C:\Program Files (x86)`,
      "Steam",
      "steamapps",
      "common",
      "RaceRoom Racing Experience",
      "Game",
      "GameData",
      "General",
      "r3e-data.json",
    ),
    String.raw`C:\Steam\steamapps\common\RaceRoom Racing Experience\Game\GameData\General\r3e-data.json`,
    String.raw`C:\Program Files\Steam\steamapps\common\RaceRoom Racing Experience\Game\GameData\General\r3e-data.json`,
  ];

  for (const filePath of possiblePaths) {
    try {
      if (existsSync(filePath)) {
        const content = await readFile(filePath, "utf8");
        return { success: true, data: content, path: filePath };
      }
    } catch (error) {
      console.warn(
        `[findR3eDataFile] Error reading ${filePath}:`,
        (error as Error).message,
      );
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
    path.join(
      documentsDir,
      "My Games",
      "SimBin",
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
      console.warn(
        `[findAiadaptationFile] Error reading ${filePath}:`,
        (error as Error).message,
      );
    }
  }

  return {
    success: false,
    error: "aiadaptation.xml not found in standard RaceRoom UserData paths",
  };
});

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

ipcMain.handle("app:openExternal", async (_event, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error("[app:openExternal] Error:", error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("app:showItemInFolder", async (_event, filePath: string) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    console.error("[app:showItemInFolder] Error:", error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle(
  "log:info",
  async (_event, message: string, metadata?: unknown) => {
    log.info(message, metadata);
    return { success: true };
  },
);

ipcMain.handle(
  "log:error",
  async (_event, message: string, metadata?: unknown) => {
    log.error(message, metadata);
    return { success: true };
  },
);

ipcMain.handle(
  "log:warn",
  async (_event, message: string, metadata?: unknown) => {
    log.warn(message, metadata);
    return { success: true };
  },
);

ipcMain.handle(
  "log:debug",
  async (_event, message: string, metadata?: unknown) => {
    log.debug(message, metadata);
    return { success: true };
  },
);

ipcMain.handle("log:getPath", async () => {
  return logsDir;
});

app.on("ready", () => {
  const win = createWindow();
  createMenu(win);
  initAutoUpdater(win).catch((error: Error) => {
    console.error("[main] Error initializing auto-updater:", error);
  });
});

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
