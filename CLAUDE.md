# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start Vite (port 5173) + Electron together (recommended for dev)
npm run dev:vite         # Web-only mode (browser testing, no Electron)
npm run dev:electron     # Electron only (requires Vite already running)
npm run build            # TypeScript + Vite production build → dist/
npm run build:electron   # Full Electron app: clean + build + electron-builder → Windows NSIS + portable
npm run lint             # ESLint checks
npm run clean            # Clean dist/ directory
```

**QA Agents** (AI-based, no traditional unit tests):

```bash
npm run agent:workflow:pr          # Before opening a PR (data-integrity + parser-resilience + ui-regression)
npm run agent:workflow:pre-release # Before releasing (all 8 agents)
npm run agent:data-integrity       # After modifying parsers (xmlParser.ts, jsonParser.ts)
npm run agent:fitting-qa           # After changing fitting.ts or databaseProcessor.ts
npm run agent:electron-ipc         # After IPC/storage changes (main.mjs, preload.cjs, store/*.ts)
npm run agent:parser-resilience    # After changing parser logic or adding file format support
npm run agent:results-consistency  # After modifying standings calculation or result parsing
npm run agent:ui-regression        # After UI component or routing changes
```

Agent reports saved to `.agent-reports/` as JSON. CI/CD runs agents automatically on PR.

## Architecture

### Dual-Mode: Electron + Web

The app runs as either an Electron desktop app or a web browser app. File I/O is abstracted via `useElectronAPI()` ([src/hooks/useElectronAPI.ts](src/hooks/useElectronAPI.ts)):

- **Electron mode**: Native file dialogs, auto-detects game files, uses IPC bridge to `electron/main.mjs` + `electron/preload.cjs`. Context isolation + sandbox enabled — no `nodeIntegration`.
- **Web mode**: Falls back to browser File API. Cannot auto-load from filesystem.

IPC channels: `dialog:openFile`, `dialog:openDirectory`, `dialog:saveFile`, `fs:readFile`, `fs:writeFile`, `fs:readdir`, `app:findR3eDataFile`, `app:findAiadaptationFile`, `store:get/set/delete`, `app:openExternal`.

### Storage: electron-store vs localStorage

Storage is abstracted via [src/store/electronStorage.ts](src/store/electronStorage.ts). All Zustand stores use `getStorage()` with `persist` middleware — this auto-selects the backend:

- **Electron**: `electron-store` v11 → `%APPDATA%\r3e-toolbox\config.json` (no size limit)
- **Web**: `localStorage` (5-10MB limit)

Stores: `configStore`, `championshipStore`, `leaderboardAssetsStore`, `gameDataStore`, `processingLogStore`.

### AI Management Data Flow

```
aiadaptation.xml → xmlParser.ts → Database → databaseProcessor.ts → generator functions → xmlBuilder.ts → aiadaptation.xml
```

- **Critical**: R3E XML has single `<element>` vs multiple `<element>` at same level. Always use `toArray()` normalization ([src/utils/xmlParser.ts](src/utils/xmlParser.ts)).
- **Critical**: Lap times in race results are **milliseconds**; in `aiadaptation.xml` are **seconds**. Convert via `timeUtils.ts`.
- AI times must decrease monotonically with skill level. `databaseProcessor.ts` rejects non-monotonic fits and deviations >10%.
- `numberOfSampledRaces = 0` marks synthetically fitted entries; `> 0` marks real race data.

### Configuration

All fitting parameters in [src/config.ts](src/config.ts) — modify without restarting dev server. User-overridable at runtime via the Settings page (stored in `configStore`).

### Processing Log Pattern

Use `useProcessingLogStore` directly (not the legacy `useProcessingLog` hook):

```typescript
const addLog = useProcessingLogStore((state) => state.addLog);
addLog("success" | "info" | "warning" | "error", "message");
```

`FloatingProcessingLog` is globally integrated in `Layout.tsx` — no per-page setup needed.

### Routing

Routes defined in [src/App.tsx](src/App.tsx): `/ai-management`, `/fix-qualy-times`, `/build-results-database`, `/results-database`, `/results-database/:alias`, `/settings`, `/help`, `/game-data-onboarding`.

## Code Style

- TypeScript strict mode. Prefer `type` over `interface` for unions/intersections.
- Named exports everywhere except page components (which use default export).
- Relative imports only (`../utils/parser`), no path aliases.
- Comment statistical/validation logic; not obvious UI code.
- English for all comments, docs, commit messages, and code.
- Conventional commits for releases (semantic-release automated on `master` push).

## Common Pitfalls

1. **XML mixed arrays**: Always use `toArray()` — never assume element is array or object.
2. **Lap time units**: ms in race results, seconds in `aiadaptation.xml`.
3. **No `nodeIntegration`**: All Node APIs must go through IPC.
4. **CORS for leaderboard**: The official R3E leaderboard may block fetch — `BuildResultsDatabase` has a manual HTML paste fallback.
5. **Font Awesome**: Import solid icons only from `@fortawesome/free-solid-svg-icons` (v7.2).
6. **IPC serialization**: Functions/symbols can't go through IPC — `sanitizeForIPC()` strips them before `store:set`.
