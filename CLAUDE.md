# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start Vite (port 5173) + Electron together (recommended for dev)
npm run dev:vite         # Web-only mode (browser testing, no Electron)
npm run dev:electron     # Electron only (requires Vite already running)
npm run build            # TypeScript + Vite production build → out/
npm run build:electron   # Full Electron app: clean + build + electron-builder → Windows NSIS + portable
npm run build:electron:ci # Same but skips publish step (for CI)
npm run lint             # ESLint checks
npm run clean            # Clean dist/ directory
npm run preview          # Preview Vite production build in browser
```

**QA Agents** (AI-based, no traditional unit tests):

```bash
npm run agent:help                 # List all available agents
npm run agent:all                  # Run all QA agents
npm run agent:workflow:pr          # Before opening a PR (data-integrity + parser-resilience + ui-regression)
npm run agent:workflow:pre-release # Before releasing (all 8 agents)
npm run agent:data-integrity       # After modifying parsers (xmlParser.ts, jsonParser.ts)
npm run agent:fitting-qa           # After changing fitting.ts or databaseProcessor.ts
npm run agent:electron-ipc         # After IPC/storage changes (main.mjs, preload.cjs, store/*.ts)
npm run agent:parser-resilience    # After changing parser logic or adding file format support
npm run agent:results-consistency  # After modifying standings calculation or result parsing
npm run agent:ui-regression        # After UI component or routing changes
npm run agent:release              # Release readiness check
npm run agent:docs-drift           # After documentation changes
```

Additional workflows:

```bash
npm run agent:workflow:nightly     # Nightly automated run
npm run agent:workflow:weekly      # Weekly automated run
npm run agent:workflow:full        # Full suite (all agents + all workflows)
```

Agent reports saved to `.agent-reports/` as JSON. CI/CD runs agents automatically on PR.

## Architecture

### Dual-Mode: Electron + Web

The app runs as either an Electron desktop app or a web browser app. File I/O is abstracted via `useElectronAPI()` ([src/renderer/hooks/useElectronAPI.ts](src/renderer/hooks/useElectronAPI.ts)):

- **Electron mode**: Native file dialogs, auto-detects game files, uses IPC bridge (`src/main/index.ts` + `src/preload/index.ts`). Context isolation + sandbox enabled — no `nodeIntegration`.
- **Web mode**: Falls back to browser File API. Cannot auto-load from filesystem.

IPC channels: `dialog:openFile`, `dialog:openDirectory`, `dialog:saveFile`, `fs:readFile`, `fs:writeFile`, `fs:writeFileBase64`, `fs:readdir`, `fs:getTempDir`, `fs:deleteDirectory`, `fs:create7zArchive`, `app:findR3eDataFile`, `app:findAiadaptationFile`, `app:showItemInFolder`, `app:openExternal`, `store:get/set/delete`, `log:info/error/warn/debug/getPath`.

IPC types are centralized in [`src/shared/ipc-contracts.ts`](src/shared/ipc-contracts.ts) — use `IpcChannels` for invoke/handle and `IpcEvents` for push events (e.g., `navigate-to`, `update-download-progress`).

### Storage: electron-store vs localStorage

Storage is abstracted via [src/renderer/store/electronStorage.ts](src/renderer/store/electronStorage.ts). All Zustand stores use `getStorage()` with `persist` middleware — this auto-selects the backend:

- **Electron**: `electron-store` v11 → `%APPDATA%\r3e-toolbox\config.json` (no size limit)
- **Web**: `localStorage` (5-10MB limit)

Stores: `configStore`, `championshipStore`, `leaderboardAssetsStore`, `gameDataStore`, `processingLogStore`.

### AI Management Data Flow

```
aiadaptation.xml → xmlParser.ts → Database → databaseProcessor.ts → generator functions → xmlBuilder.ts → aiadaptation.xml
```

- **Critical**: R3E XML has single `<element>` vs multiple `<element>` at same level. Always use `toArray()` normalization ([src/renderer/utils/xmlParser.ts](src/renderer/utils/xmlParser.ts)).
- **Critical**: Lap times in race results are **milliseconds**; in `aiadaptation.xml` are **seconds**. Convert via `timeUtils.ts`.
- AI times must decrease monotonically with skill level. `databaseProcessor.ts` rejects non-monotonic fits and deviations >10%.
- `numberOfSampledRaces = 0` marks synthetically fitted entries; `> 0` marks real race data.

### Configuration

All fitting parameters in [src/renderer/config.ts](src/renderer/config.ts) — modify without restarting dev server. User-overridable at runtime via the Settings page (stored in `configStore`).

### Processing Log Pattern

Use `useProcessingLogStore` directly (not the legacy `useProcessingLog` hook):

```typescript
const addLog = useProcessingLogStore((state) => state.addLog);
addLog("success" | "info" | "warning" | "error", "message");
```

`FloatingProcessingLog` is globally integrated in `Layout.tsx` — no per-page setup needed.

### Routing

The app uses `HashRouter` — all URLs have a `#/` prefix (e.g. `/#/ai-management`). Do not use `BrowserRouter` or absolute links without `#`.

Routes defined in [src/renderer/App.tsx](src/renderer/App.tsx): `/ai-management`, `/fix-qualy-times`, `/build-results-database`, `/results-database`, `/results-database/:alias`, `/settings`, `/help`. When `gameData` is null, all routes render `GameDataOnboarding` at `/` instead — there is no `/game-data-onboarding` path.

### Auto-updater

`electron-updater` handles automatic updates. `useAutoUpdater` hook exposes `downloadProgress`; `UpdateProgressNotification` is integrated globally in `App.tsx`. Update events are emitted via `window.electron.onUpdateDownloadProgress`.

### Logging

In renderer code, use the `useLogger` hook (calls `log:info/error/warn/debug` via IPC) — messages are persisted by `electron-log` in the main process. Avoid bare `console.log` for anything that needs to survive across sessions.

## Workflow di sviluppo — Skill e Agenti

Prima di iniziare qualsiasi task di sviluppo, invocare la skill corrispondente tramite il tool `Skill`.

**Legenda colonne:**

- **Skill** — sequenza da invocare nell'ordine indicato (`→` = passo successivo)
- **Agente** — sottoagente da spawnare per quel sottocompito specifico (`|` = alternativa, scegliere uno)
- Gli agenti sono sempre sequenziali rispetto alle skill. Il parallelismo tra agenti si attiva solo con `superpowers:dispatching-parallel-agents` quando i sottocompiti sono davvero indipendenti.

| Task                                                                      | Skill (nell'ordine)                                                                                 | Agente (uno, in base al bisogno)                                                                                                          |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Nuova feature                                                             | 1. `superpowers:brainstorming` (concordare design) → 2. `feature-dev:feature-dev` (implementazione) | `feature-dev:code-architect` se serve progettare nuovi layer/file \| `feature-dev:code-explorer` se serve esplorare il codebase esistente |
| Bug fix                                                                   | `superpowers:systematic-debugging`                                                                  | `voltagent-qa-sec:debugger` (crash/eccezioni) \| `voltagent-qa-sec:error-detective` (correlazione errori tra moduli)                      |
| Code review                                                               | `superpowers:requesting-code-review`                                                                | `feature-dev:code-reviewer`                                                                                                               |
| Refactoring TypeScript / tipi avanzati                                    | `typescript-advanced-types`                                                                         | `voltagent-lang:typescript-pro`                                                                                                           |
| Componente React / hook / store Zustand                                   | `react-vite-best-practices`                                                                         | `voltagent-lang:react-specialist`                                                                                                         |
| Electron (IPC, sicurezza, packaging)                                      | `electron-best-practices`                                                                           | `voltagent-core-dev:electron-pro`                                                                                                         |
| Parser XML/JSON (`xmlParser.ts`, `jsonParser.ts`, `xmlBuilder.ts`)        | `superpowers:brainstorming` → `feature-dev:feature-dev`                                             | `feature-dev:code-explorer` (tracing del flusso dati XML esistente)                                                                       |
| Algoritmi di fitting / statistiche (`fitting.ts`, `databaseProcessor.ts`) | `superpowers:brainstorming` → `feature-dev:feature-dev`                                             | `voltagent-data-ai:data-scientist`                                                                                                        |
| Fine branch / PR / commit                                                 | `superpowers:finishing-a-development-branch`                                                        | —                                                                                                                                         |
| Sottocompiti indipendenti in parallelo                                    | `superpowers:dispatching-parallel-agents`                                                           | due o più agenti `Explore` simultanei                                                                                                     |
| Verifica prima di completare                                              | `superpowers:verification-before-completion`                                                        | —                                                                                                                                         |

**Regola multi-dominio**: se il task copre più aree (es. nuova feature React + IPC Electron, oppure parser XML + UI), invocare prima `superpowers:brainstorming`, poi usare le skill di dominio durante l'implementazione (`react-vite-best-practices`, `electron-best-practices`).

**Regola subagent-driven-development**: quando si usa `superpowers:subagent-driven-development`, includere nel prompt di ogni implementer subagent la skill di dominio rilevante (dalla tabella sopra). Non usare solo `general-purpose` senza indicare la skill — ogni subagent deve invocarla prima di implementare.

## Code Style

- Comment statistical/validation logic; not obvious UI code.
- Conventional commits for releases (semantic-release automated on `master` push).

## Common Pitfalls

1. **XML mixed arrays**: Always use `toArray()` — never assume element is array or object.
2. **Lap time units**: ms in race results, seconds in `aiadaptation.xml`.
3. **No `nodeIntegration`**: All Node APIs must go through IPC.
4. **CORS for leaderboard**: The official R3E leaderboard may block fetch — `BuildResultsDatabase` has a manual HTML paste fallback.
5. **Font Awesome**: Import solid icons only from `@fortawesome/free-solid-svg-icons` (v7.2).
6. **IPC serialization**: Functions/symbols can't go through IPC — `sanitizeForIPC()` strips them before `store:set`.
