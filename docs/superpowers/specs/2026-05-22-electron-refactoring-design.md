# Electron Refactoring Design

**Date:** 2026-05-22
**Status:** Approved
**Scope:** Electron scaffolding + React frontend structure

---

## Problem Statement

Three linked issues in the current codebase:

1. **Type safety (IPC)** — `src/types/electron.ts` declares `globalThis.electron` manually. It can silently diverge from `electron/preload.cjs` with no compiler feedback. Adding or renaming a channel requires edits in three places (main, preload, types) with no enforcement.
2. **Maintainability** — `electron/main.mjs` is 521 lines. All IPC handlers (dialog, filesystem, store, app, logging) are inlined alongside window lifecycle and menu setup. Navigating and extending it is difficult.
3. **Electron layer structure** — `electron/` files are plain `.mjs`/`.cjs` modules outside the TypeScript project. They cannot share types with `src/`. `electron-vite` would unify the toolchain.

---

## Approach: Two-Phase Migration

### Phase 1 — Structural migration (no behavior change)

Replace the current Vite + manual Electron setup with `electron-vite`. Adopt the canonical three-entry-point structure. Convert `main.mjs` and `preload.cjs` to TypeScript. The renderer (React app) moves into `src/renderer/`. No logic changes — this phase is purely structural and verifiable with `npm run dev`.

### Phase 2 — IPC contracts + handler split

Introduce `src/shared/ipc-contracts.ts` as the single source of truth for all IPC channel signatures. Refactor `src/main/index.ts` into domain modules. Rewrite `src/types/electron.ts` to derive types from the contracts instead of duplicating them.

---

## Directory Structure

### Before

```
electron/
  main.mjs          (521 lines — all IPC handlers inlined)
  preload.cjs
  updater.mjs
src/
  App.tsx
  components/
  hooks/
  pages/
  store/
  types/
    electron.ts     (manually maintained, can drift)
  utils/
  ...
vite.config.ts
tsconfig.json
tsconfig.app.json
tsconfig.node.json
```

### After

```
src/
  main/
    index.ts        (was electron/main.mjs — ~80 lines after split)
    updater.ts      (was electron/updater.mjs — unchanged logic)
    ipc/            (Phase 2)
      dialog.ts
      filesystem.ts
      store.ts
      app.ts
      logging.ts
  preload/
    index.ts        (was electron/preload.cjs)
  renderer/         (was src/)
    App.tsx
    components/
    hooks/
    pages/
    store/
    types/
      electron.ts   (derived from ipc-contracts.ts in Phase 2)
    utils/
    ...
  shared/           (Phase 2)
    ipc-contracts.ts
electron.vite.config.ts   (replaces vite.config.ts)
tsconfig.json             (root, references)
tsconfig.node.json        (main + preload)
tsconfig.web.json         (renderer)
```

---

## Phase 1 Details

### electron-vite configuration (`electron.vite.config.ts`)

```typescript
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [
      react({ babel: { plugins: [["babel-plugin-react-compiler"]] } }),
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

`externalizeDepsPlugin()` automatically excludes Node.js dependencies from main/preload bundles.

### package.json changes

| Before | After |
|---|---|
| `"main": "electron/main.mjs"` | `"main": "out/main/index.js"` |
| `"dev": "concurrently \"vite\" \"wait-on ... && electron\""` | `"dev": "electron-vite dev"` |
| `"dev:vite": "vite"` | `"dev:vite": "electron-vite dev --skipElectron"` |
| `"dev:electron": "electron --inspect=5858 ."` | `"dev:electron": "electron-vite dev --skipBuild"` |
| `"build": "tsc -b && vite build"` | `"build": "electron-vite build"` |
| `"build:electron": "npm run clean && tsc -b && vite build && electron-builder"` | `"build:electron": "npm run clean && electron-vite build && electron-builder"` |

`wait-on` and `concurrently` become redundant — `electron-vite dev` orchestrates both Vite and Electron natively.

### tsconfig changes

Three tsconfig files replace the current two:

- `tsconfig.json` — root with `references` to the two below
- `tsconfig.node.json` — covers `src/main/` and `src/preload/` (Node.js target)
- `tsconfig.web.json` — covers `src/renderer/` (browser target, was `tsconfig.app.json`)

Existing settings (strict mode, paths, lib) are preserved; only targets and roots change.

### Files deleted

| File | Reason |
|---|---|
| `vite.config.ts` | Replaced by `electron.vite.config.ts` |
| `tsconfig.app.json` | Replaced by `tsconfig.web.json` |
| `electron/` (entire folder) | Content migrated to `src/main/` and `src/preload/` |

### electron-builder `files` field update

```json
"files": [
  "out/**/*",
  "package.json"
]
```

`electron-vite` outputs to `out/` instead of `dist/` for Electron artifacts (renderer still goes to `out/renderer/`).

---

## Phase 2 Details

### `src/shared/ipc-contracts.ts`

Single source of truth for all IPC channel signatures. Imported by both `src/main/ipc/*.ts` and `src/preload/index.ts`.

```typescript
export type IpcChannels = {
  "dialog:openFile":          { input: [ElectronOpenFileOptions?];       output: string | null };
  "dialog:openDirectory":     { input: [];                               output: string | null };
  "dialog:saveFile":          { input: [string, ElectronDialogFilter[]]; output: string | null };
  "fs:readFile":              { input: [string];        output: IpcResult<string> };
  "fs:writeFile":             { input: [string, string]; output: IpcResult<void> };
  "fs:writeFileBase64":       { input: [string, string]; output: IpcResult<void> };
  "fs:readdir":               { input: [string];        output: IpcResult<string[]> };
  "fs:getTempDir":            { input: [];              output: IpcResult<string> };
  "fs:deleteDirectory":       { input: [string];        output: IpcResult<void> };
  "fs:create7zArchive":       { input: [string, string]; output: IpcResult<void> };
  "app:findR3eDataFile":      { input: [];              output: IpcResultWithPath<string> };
  "app:findAiadaptationFile": { input: [];              output: IpcResultWithPath<string> };
  "app:openExternal":         { input: [string];        output: IpcResult<void> };
  "app:showItemInFolder":     { input: [string];        output: IpcResult<void> };
  "store:get":                { input: [string];        output: unknown };
  "store:set":                { input: [string, unknown]; output: IpcResult<void> };
  "store:delete":             { input: [string];        output: IpcResult<void> };
  "log:info":                 { input: [string, unknown?]; output: IpcResult<void> };
  "log:error":                { input: [string, unknown?]; output: IpcResult<void> };
  "log:warn":                 { input: [string, unknown?]; output: IpcResult<void> };
  "log:debug":                { input: [string, unknown?]; output: IpcResult<void> };
  "log:getPath":              { input: [];              output: string };
};

type IpcResult<T> =
  | { success: true; data?: T }
  | { success: false; error: string };

type IpcResultWithPath<T> =
  | { success: true; data?: T; path?: string }
  | { success: false; error: string };
```

### IPC handler modules (`src/main/ipc/`)

Each module exports a single `register*Handlers` function. Dependencies are injected as parameters (no module-level globals).

```typescript
// ipc/dialog.ts
export function registerDialogHandlers(
  ipcMain: IpcMain,
  getWindow: () => BrowserWindow,
): void { ... }

// ipc/filesystem.ts
export function registerFilesystemHandlers(ipcMain: IpcMain): void { ... }

// ipc/store.ts
export function registerStoreHandlers(
  ipcMain: IpcMain,
  store: Store,
): void { ... }

// ipc/app.ts
export function registerAppHandlers(ipcMain: IpcMain): void { ... }

// ipc/logging.ts
export function registerLoggingHandlers(
  ipcMain: IpcMain,
  log: Logger,
): void { ... }
```

`src/main/index.ts` after split: ~80 lines (window lifecycle, menu, app events, registration calls).

### `src/preload/index.ts`

Compiled to CommonJS by `electron-vite` automatically — no manual `.cjs` extension needed. The file is plain TypeScript, imports shared types from `src/shared/ipc-contracts.ts`, and uses `contextBridge.exposeInMainWorld`. The `onNavigate` listener (currently missing from the contracts) is added to `IpcChannels` as a push channel.

### `src/renderer/types/electron.ts`

Rewritten to derive the `globalThis.electron` shape from `IpcChannels` via mapped types, eliminating manual duplication. Adding a channel to `ipc-contracts.ts` and forgetting to expose it in `preload/index.ts` will produce a TypeScript error at compile time.

---

## Out of Scope

- No changes to React component logic, hooks, stores, or utils
- No changes to the QA agent system (`agents/`)
- No changes to CI/CD or semantic-release configuration
- `src/docs/` folder inside renderer moves to `src/renderer/docs/` (path-only change)

---

## Verification Criteria

### Phase 1
- `npm run dev` launches Electron + Vite with HMR
- `npm run build:electron` produces a working NSIS installer
- All existing routes and features work identically
- `npm run lint` passes with zero errors

### Phase 2
- Adding a new IPC channel to `ipc-contracts.ts` without updating `preload/index.ts` produces a TypeScript compile error
- `npm run lint` passes
- QA agents pass (`npm run agent:workflow:pr`)
