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
import path from "node:path";
import { initAutoUpdater, manualCheckForUpdates } from "./updater";
import { registerDialogHandlers }     from "./ipc/dialog";
import { registerFilesystemHandlers } from "./ipc/filesystem";
import { registerStoreHandlers }      from "./ipc/store";
import { registerAppHandlers }        from "./ipc/app";
import { registerLoggingHandlers }    from "./ipc/logging";

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

app.on("ready", () => {
  const win = createWindow();
  createMenu(win);
  registerDialogHandlers(ipcMain, () => win);
  registerFilesystemHandlers(ipcMain);
  registerStoreHandlers(ipcMain, store);
  registerAppHandlers(ipcMain);
  registerLoggingHandlers(ipcMain, log, logsDir);
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
