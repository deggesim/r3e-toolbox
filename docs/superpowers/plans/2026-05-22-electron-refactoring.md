# Electron Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the project from a manual Vite + Electron setup to `electron-vite`, adopting the canonical three-entry-point structure (`src/main/`, `src/preload/`, `src/renderer/`) with full TypeScript coverage and shared IPC contracts.

**Architecture:** Two sequential phases. Phase 1 is a pure structural migration (no logic changes) that replaces `electron/main.mjs` + `vite.config.ts` with `electron-vite` and reorganizes the directory tree. Phase 2 introduces `src/shared/ipc-contracts.ts` as the single source of truth for IPC channel signatures, splits the monolithic main process into domain modules, and eliminates manual type duplication.

**Tech Stack:** electron-vite v3, TypeScript 5.9, Electron 40, React 19, Vite 7, esbuild (for main/preload compilation)

**Design spec:** `docs/superpowers/specs/2026-05-22-electron-refactoring-design.md`

---

## Phase 1 — Structural Migration (no behavior change)

### Task 1: Install electron-vite

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install electron-vite --save-dev
```

Expected: `electron-vite` appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Verify the CLI is available**

```bash
npx electron-vite --version
```

Expected: prints a version string (e.g., `3.x.x`).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add electron-vite devDependency"
```

---

### Task 2: Create `electron.vite.config.ts`

**Files:**
- Create: `electron.vite.config.ts`
- Delete later: `vite.config.ts` (in Task 9)

The `buildInfoPlugin` is moved verbatim from `vite.config.ts`. `externalizeDepsPlugin()` replaces the manual `external: ["7zip-min"]` for the main/preload bundles.

- [ ] **Step 1: Create the file**

```typescript
// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const buildInfoPlugin = () => ({
  name: "build-info",
  resolveId(id: string) {
    if (id === "virtual:build-info") return id;
  },
  load(id: string) {
    if (id === "virtual:build-info") {
      const packagePath = path.resolve(__dirname, "package.json");
      const pkgJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
      const stats = fs.statSync(packagePath);
      const lastUpdated = new Date(stats.mtime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return `
export const VERSION = "${pkgJson.version}"
export const LAST_UPDATED = "${lastUpdated}"
      `;
    }
  },
});

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler"]],
        },
      }),
      buildInfoPlugin(),
    ],
    base: "./",
    build: {
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        external: ["7zip-min"],
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "ui-vendor": ["bootstrap", "react-bootstrap"],
            "utils-vendor": ["zustand", "fast-xml-parser"],
          },
        },
      },
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add electron.vite.config.ts
git commit -m "build: add electron.vite.config.ts"
```

---

### Task 3: Update tsconfig files

**Files:**
- Modify: `tsconfig.json`
- Create: `tsconfig.node.json` (replaces current one — current covers only `vite.config.ts`)
- Create: `tsconfig.web.json` (replaces `tsconfig.app.json`)
- Delete later: `tsconfig.app.json` (in Task 9)

The current `tsconfig.node.json` only covers `vite.config.ts`. After migration it must cover `src/main/` and `src/preload/`. The current `tsconfig.app.json` settings move into `tsconfig.web.json` covering `src/renderer/`.

- [ ] **Step 1: Rewrite `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src/main/**/*.ts", "src/preload/**/*.ts", "src/shared/**/*.ts", "electron.vite.config.ts"]
}
```

- [ ] **Step 2: Create `tsconfig.web.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.web.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src/renderer/**/*.ts", "src/renderer/**/*.tsx", "src/shared/**/*.ts"]
}
```

- [ ] **Step 3: Update `tsconfig.json` to reference the new files**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json tsconfig.node.json tsconfig.web.json
git commit -m "build: update tsconfig for electron-vite three-entry structure"
```

---

### Task 4: Create `src/main/index.ts`

**Files:**
- Create: `src/main/index.ts`

TypeScript conversion of `electron/main.mjs`. The key change: remove the `__dirname` polyfill (electron-vite compiles main to CJS, so `__dirname` is available natively). Add types for `mainWindow`. Everything else is a direct port.

- [ ] **Step 1: Create `src/main/` directory and `index.ts`**

```typescript
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
    headers["Access-Control-Allow-Methods"] = ["GET, POST, PUT, DELETE, OPTIONS"];
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
          click: () => app.quit(),
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
          click: () => win.webContents.send("navigate-to", "/help"),
        },
        { type: "separator" },
        {
          label: "Check for Updates",
          click: async () => manualCheckForUpdates(win),
        },
        { type: "separator" },
        {
          label: "GitHub Repository",
          click: async () =>
            shell.openExternal("https://github.com/deggesim/r3e-toolbox"),
        },
        { type: "separator" },
        {
          label: "About R3E Toolbox",
          click: () =>
            dialog.showMessageBox(win, {
              type: "info",
              title: "About R3E Toolbox",
              message: "R3E Toolbox",
              detail: `Version: ${app.getVersion()}\n\nA comprehensive toolkit for RaceRoom Racing Experience.\n\nFeatures:\n• AI difficulty optimization with statistical analysis\n• Qualification time recovery for race results\n• Championship standings generator with HTML export\n• Results database viewer\n\nAuthor: Simone De Gennaro\nLicense: Open Source\n\nBuilt with React, TypeScript, and Electron.\nBased on algorithms from r3e-adaptive-ai-primer by pixeljetstream.\n\nDeveloped with ❤️ for the RaceRoom community.`,
              buttons: ["OK"],
            }),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

// ── IPC handlers ────────────────────────────────────────────────────────────

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

ipcMain.handle("dialog:saveFile", async (_event, defaultPath = "", filters = []) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath,
    filters: filters.length > 0 ? filters : [{ name: "All Files", extensions: ["*"] }],
  });
  return result.filePath ?? null;
});

ipcMain.handle("fs:readFile", async (_event, filePath: string) => {
  try {
    const content = await readFile(filePath, "utf8");
    return { success: true, data: content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("fs:writeFile", async (_event, filePath: string, content: string) => {
  try {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(filePath, content, "utf8");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("fs:writeFileBase64", async (_event, filePath: string, base64: string) => {
  try {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(filePath, Buffer.from(base64, "base64"));
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

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

ipcMain.handle("fs:create7zArchive", async (_event, sourceDir: string, archivePath: string) => {
  try {
    const SevenZip = (await import("7zip-min")).default;
    await new Promise<void>((resolve, reject) => {
      SevenZip.pack(sourceDir, archivePath, (err: Error | null) => {
        if (err) reject(new Error(err.message));
        else resolve();
      });
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("app:findR3eDataFile", async () => {
  const possiblePaths = [
    path.join(process.env.ProgramFiles ?? String.raw`C:\Program Files`, "RaceRoom Racing Experience", "Game", "GameData", "General", "r3e-data.json"),
    path.join(process.env.ProgramFilesX86 ?? String.raw`C:\Program Files (x86)`, "RaceRoom Racing Experience", "Game", "GameData", "General", "r3e-data.json"),
    path.join(process.env.ProgramFiles ?? String.raw`C:\Program Files`, "Steam", "steamapps", "common", "RaceRoom Racing Experience", "Game", "GameData", "General", "r3e-data.json"),
    path.join(process.env.ProgramFilesX86 ?? String.raw`C:\Program Files (x86)`, "Steam", "steamapps", "common", "RaceRoom Racing Experience", "Game", "GameData", "General", "r3e-data.json"),
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
      console.warn(`[findR3eDataFile] Error reading ${filePath}:`, (error as Error).message);
    }
  }
  return { success: false, error: "r3e-data.json not found in standard RaceRoom installation paths" };
});

ipcMain.handle("app:findAiadaptationFile", async () => {
  const documentsDir = app.getPath("documents");
  const filePath = path.join(documentsDir, "My Games", "SimBin", "RaceRoom Racing Experience", "UserData", "Player1", "aiadaptation.xml");
  try {
    if (existsSync(filePath)) {
      const content = await readFile(filePath, "utf8");
      return { success: true, data: content, path: filePath };
    }
  } catch (error) {
    console.warn(`[findAiadaptationFile] Error reading ${filePath}:`, (error as Error).message);
  }
  return { success: false, error: "aiadaptation.xml not found in standard RaceRoom UserData paths" };
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

ipcMain.handle("log:info", async (_event, message: string, metadata?: unknown) => {
  log.info(message, metadata);
  return { success: true };
});

ipcMain.handle("log:error", async (_event, message: string, metadata?: unknown) => {
  log.error(message, metadata);
  return { success: true };
});

ipcMain.handle("log:warn", async (_event, message: string, metadata?: unknown) => {
  log.warn(message, metadata);
  return { success: true };
});

ipcMain.handle("log:debug", async (_event, message: string, metadata?: unknown) => {
  log.debug(message, metadata);
  return { success: true };
});

ipcMain.handle("log:getPath", async () => logsDir);

// ── App lifecycle ────────────────────────────────────────────────────────────

app.on("ready", () => {
  const win = createWindow();
  createMenu(win);
  initAutoUpdater(win).catch((error: Error) => {
    console.error("[main] Error initializing auto-updater:", error);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
```

> **Note:** The `preload` path uses `../preload/index.js` because electron-vite outputs main to `out/main/` and preload to `out/preload/`. The production renderer path uses `../../out/renderer/index.html` relative to `out/main/`.

- [ ] **Step 2: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: add src/main/index.ts (TypeScript port of electron/main.mjs)"
```

---

### Task 5: Create `src/main/updater.ts`

**Files:**
- Create: `src/main/updater.ts`

Direct TypeScript port of `electron/updater.mjs`. The key type additions are for `autoUpdater`, `devUpdateHandlers`, and `mainWindowRef`.

- [ ] **Step 1: Create `src/main/updater.ts`**

```typescript
// src/main/updater.ts
import { dialog, BrowserWindow } from "electron";
import isDev from "electron-is-dev";

let updateCheckInProgress = false;
let autoUpdater: import("electron-updater").AppUpdater | null = null;
let pendingManualNoUpdateNotification = false;
let devUpdateHandlers: { cleanup: () => void } | null = null;
let mainWindowRef: BrowserWindow | null = null;
let updateMetadataUnavailable = false;

const isMissingUpdateMetadataError = (error: unknown): boolean => {
  const message = String((error as { message?: string })?.message ?? error ?? "");
  return (
    message.includes("Cannot find latest.yml") ||
    (message.includes("latest.yml") && message.includes("404"))
  );
};

const withSuppressedDep0169Warning = async <T>(operation: () => Promise<T>): Promise<T> => {
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = function patchedEmitWarning(warning: string | Error, ...args: unknown[]) {
    const warningCode =
      (typeof warning === "object" && (warning as NodeJS.ErrnoException)?.code) ||
      (typeof args[1] === "string" ? args[1] : undefined);
    if (warningCode === "DEP0169") return;
    return (originalEmitWarning as typeof process.emitWarning).call(process, warning as string, ...(args as Parameters<typeof process.emitWarning>).slice(1));
  };
  try {
    return await operation();
  } finally {
    process.emitWarning = originalEmitWarning;
  }
};

const getAutoUpdater = async (): Promise<import("electron-updater").AppUpdater> => {
  if (autoUpdater === null) {
    const module = await import("electron-updater");
    autoUpdater = module.autoUpdater ?? (module as { default?: { autoUpdater?: import("electron-updater").AppUpdater } }).default?.autoUpdater ?? (module as unknown as { default: import("electron-updater").AppUpdater }).default;
  }
  return autoUpdater!;
};
```

- [ ] **Step 2: Copy the rest of `electron/updater.mjs` into `src/main/updater.ts`**

Open `electron/updater.mjs` and append everything from line 50 to end. Replace:
- `export const initAutoUpdater` → `export const initAutoUpdater`
- `export const manualCheckForUpdates` → `export const manualCheckForUpdates`

Add TypeScript parameter types: `(mainWindow: BrowserWindow)` for both exported functions.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --project tsconfig.node.json --noEmit
```

Expected: zero errors (or only errors about files not yet moved — acceptable at this stage).

- [ ] **Step 4: Commit**

```bash
git add src/main/updater.ts
git commit -m "feat: add src/main/updater.ts (TypeScript port of electron/updater.mjs)"
```

---

### Task 6: Create `src/preload/index.ts`

**Files:**
- Create: `src/preload/index.ts`

Direct TypeScript port of `electron/preload.cjs`. Replace CommonJS `require` with ES imports — electron-vite compiles the preload to CJS automatically. Content is identical to `preload.cjs`.

- [ ] **Step 1: Create `src/preload/index.ts`**

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";

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

  onUpdateDownloadProgress: (
    callback: (data: { percent: number; transferred: number; total: number }) => void,
  ) => {
    const listener = (_event: Electron.IpcRendererEvent, data: { percent: number; transferred: number; total: number }) =>
      callback(data);
    ipcRenderer.on("update-download-progress", listener);
    return () => ipcRenderer.removeListener("update-download-progress", listener);
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/preload/index.ts
git commit -m "feat: add src/preload/index.ts (TypeScript port of electron/preload.cjs)"
```

---

### Task 7: Move renderer files to `src/renderer/`

**Files:**
- Create: `src/renderer/` (all existing `src/` files, see below)
- Create: `src/renderer/index.html`
- Delete: root `index.html` (moved)

Move all current `src/` content into `src/renderer/`. Since all imports within `src/` are relative, they require no changes. Only `index.html` needs its script path updated.

- [ ] **Step 1: Create `src/renderer/` and move files using git mv**

```bash
mkdir src/renderer
git mv src/App.tsx src/renderer/App.tsx
git mv src/App.css src/renderer/App.css
git mv src/index.css src/renderer/index.css
git mv src/main.tsx src/renderer/main.tsx
git mv src/vite-env.d.ts src/renderer/vite-env.d.ts
git mv src/config.ts src/renderer/config.ts
git mv src/components src/renderer/components
git mv src/hooks src/renderer/hooks
git mv src/pages src/renderer/pages
git mv src/store src/renderer/store
git mv src/types src/renderer/types
git mv src/utils src/renderer/utils
git mv src/assets src/renderer/assets
```

- [ ] **Step 2: Move `index.html` into `src/renderer/` and update the script path**

Create `src/renderer/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>R3E Toolbox</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

Then delete the root `index.html`:

```bash
git rm index.html
git add src/renderer/index.html
```

- [ ] **Step 3: Update `electron.vite.config.ts` renderer root**

Add `root` to the renderer section so electron-vite finds `index.html` in `src/renderer/`:

```typescript
renderer: {
  root: "src/renderer",
  plugins: [ ... ],  // unchanged
  base: "./",
  build: { ... },    // unchanged
},
```

- [ ] **Step 4: Commit**

```bash
git add electron.vite.config.ts src/renderer/
git commit -m "refactor: move renderer files to src/renderer/ (canonical electron-vite structure)"
```

---

### Task 8: Update `package.json`

**Files:**
- Modify: `package.json`

Update `main`, `scripts`, and `build.files` to match electron-vite output paths.

- [ ] **Step 1: Update `main` field and `scripts`**

```json
{
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "dev:vite": "electron-vite dev --skipElectron",
    "dev:electron": "electron .",
    "clean": "rimraf dist out",
    "build": "electron-vite build",
    "build:electron": "npm run clean && electron-vite build && electron-builder",
    "lint": "eslint .",
    "preview": "electron-vite preview"
  }
}
```

> **Note on `dev:vite`**: `electron-vite dev --skipElectron` starts only the Vite renderer server without launching Electron. If the flag is not supported by the installed version, use `cross-env ELECTRON_SKIP_LAUNCH=1 electron-vite dev` or document that renderer-only testing requires running `electron-vite dev` and navigating to `http://localhost:5173` without interacting with Electron APIs.

- [ ] **Step 2: Update `build.files`**

In the `build` section of `package.json`:

```json
"build": {
  "appId": "com.r3e-toolbox.app",
  "productName": "R3E Toolbox",
  "files": [
    "out/**/*",
    "package.json"
  ],
  "directories": {
    "buildResources": "public",
    "output": "dist"
  },
  "win": {
    "target": ["nsis", "portable"],
    "icon": "public/icon.png",
    "signAndEditExecutable": true
  },
  "nsis": {
    "artifactName": "R3E-Toolbox-Setup-${version}.${ext}",
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  },
  "portable": {
    "artifactName": "R3E-Toolbox-Portable-${version}.${ext}"
  },
  "publish": {
    "provider": "github",
    "owner": "deggesim",
    "repo": "r3e-toolbox"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "build: update package.json for electron-vite (scripts + output paths)"
```

---

### Task 9: Delete old files and verify Phase 1

**Files:**
- Delete: `electron/` (entire folder)
- Delete: `vite.config.ts`
- Delete: `tsconfig.app.json`

- [ ] **Step 1: Delete obsolete files**

```bash
git rm -r electron/
git rm vite.config.ts
git rm tsconfig.app.json
git commit -m "build: remove obsolete electron/ and vite.config.ts (replaced by electron-vite)"
```

- [ ] **Step 2: Run `npm run dev` and verify the app starts**

```bash
npm run dev
```

Expected: Electron window opens, all pages load, no console errors in DevTools.
Check: navigate to `/#/ai-management`, `/#/settings`, `/#/help` — all render correctly.

- [ ] **Step 3: Run `npm run lint`**

```bash
npm run lint
```

Expected: zero errors.

- [ ] **Step 4: Run `npm run build`**

```bash
npm run build
```

Expected: `out/` directory created with `out/main/`, `out/preload/`, `out/renderer/`.

- [ ] **Step 5: Run a quick smoke test on the production build**

```bash
electron out/main/index.js
```

Expected: app opens and loads correctly from `out/renderer/index.html`.

- [ ] **Step 6: Final Phase 1 commit (if any fixup needed)**

```bash
git add -A
git commit -m "fix: post-migration cleanup after Phase 1 verification"
```

---

## Phase 2 — IPC Contracts + Handler Split

### Task 10: Create `src/shared/ipc-contracts.ts`

**Files:**
- Create: `src/shared/ipc-contracts.ts`

Single source of truth for all IPC channel signatures. Imported by `src/main/ipc/*.ts` and `src/preload/index.ts` in subsequent tasks. Also adds `IpcEvents` for push channels (main → renderer) — this covers `navigate-to` (currently declared in `electron.ts` but **not implemented in preload**, a pre-existing bug fixed in Task 12).

- [ ] **Step 1: Create `src/shared/ipc-contracts.ts`**

```typescript
// src/shared/ipc-contracts.ts

export type ElectronDialogFilter = {
  name: string;
  extensions: string[];
};

export type ElectronOpenFileOptions = {
  title?: string;
  defaultPath?: string;
  filters?: ElectronDialogFilter[];
  properties?: Array<"openFile" | "openDirectory" | "multiSelections" | "showHiddenFiles">;
};

type IpcOk<T = never> = [T] extends [never]
  ? { success: true }
  : { success: true; data: T };
type IpcErr = { success: false; error: string };
type IpcResult<T = never> = IpcOk<T> | IpcErr;
type IpcResultWithPath<T = never> = (IpcOk<T> & { path?: string }) | IpcErr;

/** Invoke channels: renderer calls main via ipcRenderer.invoke / ipcMain.handle */
export type IpcChannels = {
  "dialog:openFile":          { input: [ElectronOpenFileOptions?];       output: string | null };
  "dialog:openDirectory":     { input: [];                               output: string | null };
  "dialog:saveFile":          { input: [string?, ElectronDialogFilter[]?]; output: string | null };
  "fs:readFile":              { input: [string];          output: IpcResult<string> };
  "fs:writeFile":             { input: [string, string];  output: IpcResult };
  "fs:writeFileBase64":       { input: [string, string];  output: IpcResult };
  "fs:readdir":               { input: [string];          output: IpcResult<string[]> };
  "fs:getTempDir":            { input: [];                output: IpcResult<string> };
  "fs:deleteDirectory":       { input: [string];          output: IpcResult };
  "fs:create7zArchive":       { input: [string, string];  output: IpcResult };
  "app:findR3eDataFile":      { input: [];                output: IpcResultWithPath<string> };
  "app:findAiadaptationFile": { input: [];                output: IpcResultWithPath<string> };
  "app:openExternal":         { input: [string];          output: IpcResult };
  "app:showItemInFolder":     { input: [string];          output: IpcResult };
  "store:get":                { input: [string];          output: unknown };
  "store:set":                { input: [string, unknown]; output: IpcResult };
  "store:delete":             { input: [string];          output: IpcResult };
  "log:info":                 { input: [string, unknown?]; output: IpcResult };
  "log:error":                { input: [string, unknown?]; output: IpcResult };
  "log:warn":                 { input: [string, unknown?]; output: IpcResult };
  "log:debug":                { input: [string, unknown?]; output: IpcResult };
  "log:getPath":              { input: [];                output: string };
};

/** Push events: main sends to renderer via webContents.send / ipcRenderer.on */
export type IpcEvents = {
  "navigate-to": string;
  "update-download-progress": { percent: number; transferred: number; total: number };
};

export type IpcChannelName = keyof IpcChannels;
export type IpcEventName = keyof IpcEvents;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --project tsconfig.node.json --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/ipc-contracts.ts
git commit -m "feat: add src/shared/ipc-contracts.ts — IPC channel type contracts"
```

---

### Task 11: Create IPC handler modules

**Files:**
- Create: `src/main/ipc/dialog.ts`
- Create: `src/main/ipc/filesystem.ts`
- Create: `src/main/ipc/store.ts`
- Create: `src/main/ipc/app.ts`
- Create: `src/main/ipc/logging.ts`

Each module exports a single `register*Handlers` function. Cut the corresponding `ipcMain.handle(...)` blocks from `src/main/index.ts` and paste them into each module, wrapping in the function signature shown below.

- [ ] **Step 1: Create `src/main/ipc/dialog.ts`**

```typescript
// src/main/ipc/dialog.ts
import { dialog, IpcMain, BrowserWindow } from "electron";

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
```

- [ ] **Step 2: Create `src/main/ipc/filesystem.ts`**

```typescript
// src/main/ipc/filesystem.ts
import { IpcMain } from "electron";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export function registerFilesystemHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("fs:readFile", async (_event, filePath: string) => {
    try {
      return { success: true, data: await readFile(filePath, "utf8") };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("fs:writeFile", async (_event, filePath: string, content: string) => {
    try {
      const dir = path.dirname(filePath);
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      await writeFile(filePath, content, "utf8");
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("fs:writeFileBase64", async (_event, filePath: string, base64: string) => {
    try {
      const dir = path.dirname(filePath);
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      await writeFile(filePath, Buffer.from(base64, "base64"));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("fs:readdir", async (_event, dirPath: string) => {
    try {
      return { success: true, data: await readdir(dirPath) };
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

  ipcMain.handle("fs:create7zArchive", async (_event, sourceDir: string, archivePath: string) => {
    try {
      const SevenZip = (await import("7zip-min")).default;
      await new Promise<void>((resolve, reject) => {
        SevenZip.pack(sourceDir, archivePath, (err: Error | null) => {
          if (err) reject(new Error(err.message));
          else resolve();
        });
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
```

- [ ] **Step 3: Create `src/main/ipc/store.ts`**

```typescript
// src/main/ipc/store.ts
import { IpcMain } from "electron";
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
```

- [ ] **Step 4: Create `src/main/ipc/app.ts`**

```typescript
// src/main/ipc/app.ts
import { app, IpcMain, shell } from "electron";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export function registerAppHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("app:findR3eDataFile", async () => {
    const possiblePaths = [
      path.join(process.env.ProgramFiles ?? String.raw`C:\Program Files`, "RaceRoom Racing Experience", "Game", "GameData", "General", "r3e-data.json"),
      path.join(process.env.ProgramFilesX86 ?? String.raw`C:\Program Files (x86)`, "RaceRoom Racing Experience", "Game", "GameData", "General", "r3e-data.json"),
      path.join(process.env.ProgramFiles ?? String.raw`C:\Program Files`, "Steam", "steamapps", "common", "RaceRoom Racing Experience", "Game", "GameData", "General", "r3e-data.json"),
      path.join(process.env.ProgramFilesX86 ?? String.raw`C:\Program Files (x86)`, "Steam", "steamapps", "common", "RaceRoom Racing Experience", "Game", "GameData", "General", "r3e-data.json"),
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
        console.warn(`[findR3eDataFile] Error reading ${filePath}:`, (error as Error).message);
      }
    }
    return { success: false, error: "r3e-data.json not found in standard RaceRoom installation paths" };
  });

  ipcMain.handle("app:findAiadaptationFile", async () => {
    const filePath = path.join(app.getPath("documents"), "My Games", "SimBin", "RaceRoom Racing Experience", "UserData", "Player1", "aiadaptation.xml");
    try {
      if (existsSync(filePath)) {
        const content = await readFile(filePath, "utf8");
        return { success: true, data: content, path: filePath };
      }
    } catch (error) {
      console.warn(`[findAiadaptationFile] Error reading ${filePath}:`, (error as Error).message);
    }
    return { success: false, error: "aiadaptation.xml not found in standard RaceRoom UserData paths" };
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
}
```

- [ ] **Step 5: Create `src/main/ipc/logging.ts`**

```typescript
// src/main/ipc/logging.ts
import { IpcMain } from "electron";
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
```

- [ ] **Step 6: Commit all IPC modules**

```bash
git add src/main/ipc/
git commit -m "feat: add IPC handler modules (dialog, filesystem, store, app, logging)"
```

---

### Task 12: Refactor `src/main/index.ts` to use IPC modules

**Files:**
- Modify: `src/main/index.ts`

Remove all inline `ipcMain.handle(...)` blocks. Import and call the `register*Handlers` functions from Task 11. The file shrinks from ~350 lines to ~80 lines.

- [ ] **Step 1: Replace `src/main/index.ts` with the slim version**

```typescript
// src/main/index.ts
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  session,
  shell,
  dialog,
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
if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

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
    return isDev ? parsed.origin === "http://localhost:5173" : parsed.protocol === "file:";
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
    headers["Access-Control-Allow-Methods"] = ["GET, POST, PUT, DELETE, OPTIONS"];
    headers["Access-Control-Allow-Headers"] = ["*"];
    callback({ responseHeaders: headers });
  });

  mainWindow.loadURL(
    isDev
      ? "http://localhost:5173"
      : `file://${path.join(__dirname, "../../out/renderer/index.html")}`,
  );

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternalUrl(url)) { shell.openExternal(url); return { action: "deny" }; }
    return { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isInternalUrl(url)) { event.preventDefault(); shell.openExternal(url); }
  });

  if (isDev) mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => { mainWindow = null; });

  return mainWindow;
};

const createMenu = (win: BrowserWindow): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [{ label: "Quit", accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q", click: () => app.quit() }],
    },
    {
      label: "Edit",
      submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }],
    },
    {
      label: "View",
      submenu: [{ role: "reload" }, { role: "forceReload" }, { type: "separator" }, { role: "toggleDevTools" }, { type: "separator" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }],
    },
    {
      label: "Help",
      submenu: [
        { label: "User Guide", accelerator: "F1", click: () => win.webContents.send("navigate-to", "/help") },
        { type: "separator" },
        { label: "Check for Updates", click: async () => manualCheckForUpdates(win) },
        { type: "separator" },
        { label: "GitHub Repository", click: async () => shell.openExternal("https://github.com/deggesim/r3e-toolbox") },
        { type: "separator" },
        {
          label: "About R3E Toolbox",
          click: () => dialog.showMessageBox(win, {
            type: "info", title: "About R3E Toolbox", message: "R3E Toolbox",
            detail: `Version: ${app.getVersion()}\n\nA comprehensive toolkit for RaceRoom Racing Experience.\n\nFeatures:\n• AI difficulty optimization with statistical analysis\n• Qualification time recovery for race results\n• Championship standings generator with HTML export\n• Results database viewer\n\nAuthor: Simone De Gennaro\nLicense: Open Source\n\nBuilt with React, TypeScript, and Electron.\nBased on algorithms from r3e-adaptive-ai-primer by pixeljetstream.\n\nDeveloped with ❤️ for the RaceRoom community.`,
            buttons: ["OK"],
          }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

app.on("ready", () => {
  const win = createWindow();
  createMenu(win);
  registerDialogHandlers(ipcMain, () => win);
  registerFilesystemHandlers(ipcMain);
  registerStoreHandlers(ipcMain, store);
  registerAppHandlers(ipcMain);
  registerLoggingHandlers(ipcMain, log, logsDir);
  initAutoUpdater(win).catch((error: Error) => console.error("[main] Error initializing auto-updater:", error));
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (mainWindow === null) createWindow(); });
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --project tsconfig.node.json --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "refactor: slim src/main/index.ts — delegate IPC handlers to domain modules"
```

---

### Task 13: Update `src/preload/index.ts` and `src/renderer/types/electron.ts`

**Files:**
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/types/electron.ts`

Update preload to import shared types from `ipc-contracts.ts` and **fix the pre-existing `onNavigate` bug** (the `navigate-to` event is sent by the main process menu but was never exposed in preload). Rewrite `electron.ts` to derive renderer-side types from `IpcChannels` and `IpcEvents` instead of duplicating them.

- [ ] **Step 1: Update `src/preload/index.ts`**

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";
import type { IpcEvents } from "../shared/ipc-contracts";

contextBridge.exposeInMainWorld("electron", {
  // Dialog
  openFile: (options?: unknown) => ipcRenderer.invoke("dialog:openFile", options),
  openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  saveFile: (defaultPath?: string, filters?: unknown) =>
    ipcRenderer.invoke("dialog:saveFile", defaultPath, filters),

  // Filesystem
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

  // App
  findR3eDataFile: () => ipcRenderer.invoke("app:findR3eDataFile"),
  findAiadaptationFile: () => ipcRenderer.invoke("app:findAiadaptationFile"),
  openExternal: (url: string) => ipcRenderer.invoke("app:openExternal", url),
  showItemInFolder: (filePath: string) =>
    ipcRenderer.invoke("app:showItemInFolder", filePath),

  // Store
  storeGet: (key: string) => ipcRenderer.invoke("store:get", key),
  storeSet: (key: string, value: unknown) =>
    ipcRenderer.invoke("store:set", key, value),
  storeDelete: (key: string) => ipcRenderer.invoke("store:delete", key),

  // Logging
  logInfo: (message: string, metadata?: unknown) =>
    ipcRenderer.invoke("log:info", message, metadata),
  logError: (message: string, metadata?: unknown) =>
    ipcRenderer.invoke("log:error", message, metadata),
  logWarn: (message: string, metadata?: unknown) =>
    ipcRenderer.invoke("log:warn", message, metadata),
  logDebug: (message: string, metadata?: unknown) =>
    ipcRenderer.invoke("log:debug", message, metadata),
  getLogsPath: () => ipcRenderer.invoke("log:getPath"),

  // Push events (main → renderer)
  onNavigate: (callback: (path: IpcEvents["navigate-to"]) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, path: IpcEvents["navigate-to"]) =>
      callback(path);
    ipcRenderer.on("navigate-to", listener);
    return () => ipcRenderer.removeListener("navigate-to", listener);
  },

  onUpdateDownloadProgress: (
    callback: (data: IpcEvents["update-download-progress"]) => void,
  ) => {
    const listener = (_e: Electron.IpcRendererEvent, data: IpcEvents["update-download-progress"]) =>
      callback(data);
    ipcRenderer.on("update-download-progress", listener);
    return () => ipcRenderer.removeListener("update-download-progress", listener);
  },
});
```

- [ ] **Step 2: Rewrite `src/renderer/types/electron.ts`**

```typescript
// src/renderer/types/electron.ts
import type {
  IpcChannels,
  IpcEvents,
  ElectronDialogFilter,
  ElectronOpenFileOptions,
} from "../../shared/ipc-contracts";

declare global {
  // Re-export shared types into global scope for renderer convenience
  type ElectronDialogFilter = import("../../shared/ipc-contracts").ElectronDialogFilter;
  type ElectronOpenFileOptions = import("../../shared/ipc-contracts").ElectronOpenFileOptions;

  var electron: {
    openFile: (options?: ElectronOpenFileOptions) => Promise<IpcChannels["dialog:openFile"]["output"]>;
    openDirectory: () => Promise<IpcChannels["dialog:openDirectory"]["output"]>;
    saveFile: (defaultPath?: string, filters?: ElectronDialogFilter[]) => Promise<IpcChannels["dialog:saveFile"]["output"]>;

    readFile: (filePath: string) => Promise<IpcChannels["fs:readFile"]["output"]>;
    writeFile: (filePath: string, content: string) => Promise<IpcChannels["fs:writeFile"]["output"]>;
    writeFileBase64: (filePath: string, base64: string) => Promise<IpcChannels["fs:writeFileBase64"]["output"]>;
    readdir: (dirPath: string) => Promise<IpcChannels["fs:readdir"]["output"]>;
    getTempDir: () => Promise<IpcChannels["fs:getTempDir"]["output"]>;
    deleteDirectory: (dirPath: string) => Promise<IpcChannels["fs:deleteDirectory"]["output"]>;
    create7zArchive: (sourceDir: string, archivePath: string) => Promise<IpcChannels["fs:create7zArchive"]["output"]>;

    findR3eDataFile: () => Promise<IpcChannels["app:findR3eDataFile"]["output"]>;
    findAiadaptationFile: () => Promise<IpcChannels["app:findAiadaptationFile"]["output"]>;
    openExternal: (url: string) => Promise<IpcChannels["app:openExternal"]["output"]>;
    showItemInFolder: (filePath: string) => Promise<IpcChannels["app:showItemInFolder"]["output"]>;

    storeGet: (key: string) => Promise<IpcChannels["store:get"]["output"]>;
    storeSet: (key: string, value: unknown) => Promise<IpcChannels["store:set"]["output"]>;
    storeDelete: (key: string) => Promise<IpcChannels["store:delete"]["output"]>;

    logInfo: (message: string, metadata?: unknown) => Promise<IpcChannels["log:info"]["output"]>;
    logError: (message: string, metadata?: unknown) => Promise<IpcChannels["log:error"]["output"]>;
    logWarn: (message: string, metadata?: unknown) => Promise<IpcChannels["log:warn"]["output"]>;
    logDebug: (message: string, metadata?: unknown) => Promise<IpcChannels["log:debug"]["output"]>;
    getLogsPath: () => Promise<IpcChannels["log:getPath"]["output"]>;

    onNavigate: (callback: (path: IpcEvents["navigate-to"]) => void) => () => void;
    onUpdateDownloadProgress: (callback: (data: IpcEvents["update-download-progress"]) => void) => () => void;
  };
}

export {};
```

- [ ] **Step 3: Verify TypeScript compiles for both projects**

```bash
npx tsc --project tsconfig.node.json --noEmit && npx tsc --project tsconfig.web.json --noEmit
```

Expected: zero errors in both.

- [ ] **Step 4: Commit**

```bash
git add src/preload/index.ts src/renderer/types/electron.ts
git commit -m "feat: wire IPC contracts into preload and renderer types; fix onNavigate bug"
```

---

### Task 14: Final verification

- [ ] **Step 1: Run `npm run dev` and test all routes**

```bash
npm run dev
```

Check:
- App launches, `/#/ai-management` loads
- F1 key → navigates to `/#/help` (this tests the `onNavigate` fix)
- Settings page loads and saves config
- All routes accessible without errors in DevTools console

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: zero errors.

- [ ] **Step 3: Run QA agents**

```bash
npm run agent:workflow:pr
```

Expected: all agents pass.

- [ ] **Step 4: Run production build**

```bash
npm run build:electron
```

Expected: `dist/` contains `R3E-Toolbox-Setup-*.exe` and `R3E-Toolbox-Portable-*.exe`.

- [ ] **Step 5: Commit any fixups**

```bash
git add -A
git commit -m "fix: Phase 2 post-verification cleanup"
```
