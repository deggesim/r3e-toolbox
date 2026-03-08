# R3E Toolbox - AI Coding Agent Instructions

## Project Overview

React + TypeScript + Electron toolbox for RaceRoom Racing Experience (R3E) game. Processes XML game data files, race results, and championship standings. No backend—persistent storage via electron-store (Electron mode) or localStorage (web mode).

## Architecture

### Core Data Flow

```
XML/TXT files → Parsers → Normalized Database → Processors → UI Components → Export
```

**Key insight**: R3E's `aiadaptation.xml` uses mixed XML patterns (single elements vs arrays). All parsers use `toArray()` normalization (see [src/utils/xmlParser.ts](src/utils/xmlParser.ts)).

### Three Main Features (Independent Modules)

1. **AI Management** ([src/pages/AIManagement.tsx](src/pages/AIManagement.tsx)): Parses `aiadaptation.xml` → linear regression on lap times → predicts AI difficulty for unmeasured levels (based on [r3e-adaptive-ai-primer](https://github.com/pixeljetstream/r3e-adaptive-ai-primer))
2. **Fix Qualy Times** ([src/pages/FixQualyTimes.tsx](src/pages/FixQualyTimes.tsx)): Patches race results with qualification lap times from separate session files
3. **Build Results Database** ([src/pages/BuildResultsDatabase.tsx](src/pages/BuildResultsDatabase.tsx)): Aggregates race results → generates championship standings HTML with cached leaderboard icons (inspired by [r3e-open-championship](https://github.com/pixeljetstream/r3e-open-championship))

## Critical Development Patterns

### State Management - Zustand with Persist

All global state uses Zustand stores with persistent storage via `electron-store` (Electron mode) or `localStorage` (web mode):

```typescript
// Pattern: src/store/*.ts
import { getStorage } from "./electronStorage";

export const useMyStore = create<State>()(
  persist(
    (set) => ({
      /* state + actions */
    }),
    { name: "my-store-key", storage: getStorage() }, // Auto-selects backend
  ),
);
```

**Storage Backend** ([src/store/electronStorage.ts](src/store/electronStorage.ts)):

- **Electron mode**: Uses `electron-store` v11.0.2 for native persistent storage (no size limits). Supports async IPC operations with automatic serialization filtering via `sanitizeForIPC()`
- **Web mode**: Falls back to browser `localStorage` (5-10MB limit)
- Unified interface abstracts the differences through `StorageInterface` adapter pattern

**Stores**:

- `configStore` - Fitting parameters (testMinAIdiffs, testMaxTimePct, testMaxFailsPct, aiNumLevels, aiSpacing)
- `championshipStore` - Saved championships with metadata
- `leaderboardAssetsStore` - Cached leaderboard icons (driver/team portraits)
- `gameDataStore` - Loaded r3e-data.json with lazy loading support and force onboarding flag
- `processingLogStore` - Floating log panel state with log entries, visibility, and actions

### Electron Dual-Mode Architecture

App runs as **Electron desktop app** OR **web browser**. File operations abstracted via `useElectronAPI()` hook:

```typescript
// src/hooks/useElectronAPI.ts
const {
  isElectron,
  openFile,
  openDirectory,
  saveFile,
  readFile,
  writeFile,
  readdir,
} = useElectronAPI();
if (isElectron) {
  /* use IPC */
} else {
  /* fallback to File API */
}
```

**IPC handlers** ([electron/main.mjs](electron/main.mjs) → [electron/preload.cjs](electron/preload.cjs)):

- `dialog:openFile` - Open file picker (returns single file path)
- `dialog:openDirectory` - Open folder picker
- `dialog:saveFile` - Save dialog (returns save path)
- `fs:readFile` - Read file contents (string)
- `fs:writeFile` - Write file contents
- `fs:readdir` - List directory contents
- `app:findR3eDataFile` - Auto-locate r3e-data.json in standard game paths
- `app:findAiadaptationFile` - Auto-locate aiadaptation.xml in UserData
- `store:get` - Get value from electron-store (persistent storage)
- `store:set` - Set value in electron-store (with IPC serialization)
- `store:delete` - Delete key from electron-store
- `app:openExternal` - Open external URL in system browser

Renderer calls via IPC bridge in [electron/preload.cjs](electron/preload.cjs) with `contextIsolation` + `sandbox` enabled for security.

### Auto Updates (electron-updater)

Automatic updates are handled in the Electron main process with `electron-updater` (see [electron/updater.mjs](electron/updater.mjs)).

- Disabled in development via `electron-is-dev`
- Checks on startup (after 5 seconds) and every hour
- User-driven flow: prompt to download, show progress, then prompt to install
- Manual check wired in the Help menu (see [electron/main.mjs](electron/main.mjs))
- Download progress is emitted on the `update-download-progress` IPC channel
- Renderer subscribes via `window.electron.onUpdateDownloadProgress` (see [electron/preload.cjs](electron/preload.cjs))
- UI surfaced by `useAutoUpdater` and `UpdateProgressNotification` (see [src/hooks/useAutoUpdater.ts](src/hooks/useAutoUpdater.ts) and [src/components/UpdateProgressNotification.tsx](src/components/UpdateProgressNotification.tsx))

### Statistical Fitting Logic (AI Management)

**Algorithm Credits**: The fitting logic and algorithms are based on [r3e-adaptive-ai-primer](https://github.com/pixeljetstream/r3e-adaptive-ai-primer) by pixeljetstream.

**Non-obvious**: AI lap times must decrease monotonically with skill level. Fitting validates via:

1. Linear regression on sampled AI levels ([src/utils/fitting.ts](src/utils/fitting.ts)): `y = a + b*x` (lap time vs AI level)
2. Reject if predicted times increase or deviate >10% from samples ([src/utils/databaseProcessor.ts](src/utils/databaseProcessor.ts#L60-L98))
3. Config params: `testMinAIdiffs`, `testMaxTimePct`, `testMaxFailsPct` ([src/config.ts](src/config.ts))

**Why**: RaceRoom generates synthetic lap times—toolbox detects/removes them before re-fitting with real data.

### Asset Caching System (Build Results)

Leaderboard icons fetched once → cached in persistent storage → reused across sessions:

```typescript
// src/utils/leaderboardAssets.ts
const assets = await fetchLeaderboardAssetsWithCache(); // auto-cache
const assets = await fetchLeaderboardAssetsWithCache({ forceRefresh: true }); // bypass
```

**Cache key**: `r3e-toolbox-leaderboard-assets` stored via electron-store (Electron) or localStorage (web). See [ASSET_CACHING.md](ASSET_CACHING.md) for flow diagram.

### UI/UX Features

**Font Awesome Icons** (v7.1 solid SVG):

- Integrated throughout app via `@fortawesome/react-fontawesome` (v3.2)
- Used in: Processing logs, sidebar menu, badges, operation status indicators
- Consistent icon set: faCheck, faExclamation, faDownload, faServer, etc.

**Responsive Design**:

- Mobile-first Bootstrap (v5.3) layout with flexbox
- Sidebar navigation collapses automatically on small screens (<768px)
- Touch-friendly button sizing and input elements
- Scales seamlessly from mobile (320px) to desktop (1920px+)

### Processing Log Pattern

UI feedback for batch operations uses centralized store ([src/store/processingLogStore.ts](src/store/processingLogStore.ts)):

```typescript
// In components: access store directly
const addLog = useProcessingLogStore((state) => state.addLog);
const logs = useProcessingLogStore((state) => state.logs);
addLog("success", "Processed 42 files"); // auto-scrolls, timestamps, type-safe icons
```

**FloatingProcessingLog** ([src/components/FloatingProcessingLog.tsx](src/components/FloatingProcessingLog.tsx)):

- Global floating panel (bottom-right on desktop, off-canvas on mobile)
- Auto-collapses/expands based on log activity
- Integrated in Layout.tsx—automatically available on all pages
- Logs categorized with Font Awesome icons: info (faCircleInfo), success (faCheck), warning (faExclamationTriangle), error (faXmark)
- Legacy pattern: `useProcessingLog()` hook still available for backward compatibility

## File Structure & Naming

### Type Definitions

- **Global types**: [src/types.ts](src/types.ts) (RaceRoom data, assets, championships)
- **Module-specific types**: `src/types/*.ts` (e.g., `raceResults.ts`)
- **Pattern**: All interfaces prefixed with module name (`RaceRoom*`, `Leaderboard*`, `Championship*`)

### Utils Organization

Each utility is self-contained:

- `xmlParser.ts` / `xmlBuilder.ts`: Parse/generate R3E XML
- `jsonParser.ts`: Parse race result files (JSON or TXT)
- `databaseProcessor.ts`: Apply fitting to parsed database
- `leaderboardAssets.ts`: Fetch/cache icons from official leaderboard
- `standingsCalculator.ts`: Points system logic
- `htmlGenerator.ts`: Export championship standings

### Component Structure

- **Pages** (in [src/pages/](src/pages/)):
  - `AIManagement.tsx` - AI difficulty optimization with statistical fitting
  - `FixQualyTimes.tsx` - Recover missing qualification times in race results
  - `BuildResultsDatabase.tsx` - Generate championship standings HTML with leaderboard icons
  - `ResultsDatabaseViewer.tsx` - Browse saved championships (route: `/results-database`)
  - `ResultsDatabaseDetail.tsx` - Championship detail view with driver/team/vehicle standings (route: `/results-database/:alias`)
  - `GameDataOnboarding.tsx` - r3e-data.json setup (auto-detect or manual upload)
  - `Help.tsx` - User guide and documentation
  - `Settings.tsx` - Fitting parameters, UI defaults, cache management
- **Shared UI**: `Layout.tsx` (sidebar navigation), `FloatingProcessingLog.tsx` (global log panel), `FileUploadSection.tsx` (reusable file upload)
- **Routing**: [src/App.tsx](src/App.tsx) - React Router with `/ai-management`, `/fix-qualy-times`, `/build-results-database`, `/results-database`, `/results-database/:alias`, `/settings`, `/help`

## Development Workflows

### Prerequisites

- **Node.js 24.x** or higher (tested on Windows, macOS, Linux)
- **npm** package manager

### Run Dev Environment

```bash
npm run dev           # Starts Vite (5173) + Electron with hot reload (recommended)
npm run dev:vite      # Web-only mode (browser testing without Electron)
npm run dev:electron  # Electron only (requires Vite already running)
```

**Important**: Electron loads `http://localhost:5173` in dev, not file:// protocol. Hot reload works automatically.

### Build & Deploy

```bash
npm run clean             # Clean dist/ directory
npm run build             # TypeScript compilation + Vite production build → dist/ (web only)
npm run build:electron    # Full Electron app: Clean + TypeScript + Vite build + electron-builder → dist/ (Windows NSIS installer + portable exe)
```

**Output**: `dist/` contains web assets for browser deployment and Electron app packaging (NSIS installer for Windows). All built resources consolidated in single directory.

### QA Agent System

**Critical**: Project uses specialized AI agents for validation, testing, and release checks. See [agents/README.md](agents/README.md) for full documentation.

**Key agent commands**:

```bash
# Individual agents
npm run agent:data-integrity       # Validate XML/JSON/TXT schema and units
npm run agent:parser-resilience    # Test parser regressions
npm run agent:fitting-qa           # Statistical fitting quality checks
npm run agent:results-consistency  # Race results validation
npm run agent:electron-ipc         # Electron IPC & storage audit
npm run agent:ui-regression        # UI smoke tests
npm run agent:release              # Release preparation checks
npm run agent:docs-drift           # Documentation sync verification

# Workflows (agent combinations)
npm run agent:workflow:pr          # Run 3 agents for PR checks (data-integrity, parser-resilience, ui-regression)
npm run agent:workflow:nightly     # Nightly checks (fitting-qa, results-consistency)
npm run agent:workflow:pre-release # Full suite before release (all 8 agents)
npm run agent:all                  # Run all agents sequentially
```

**Agent output**: Structured JSON reports saved to `.agent-reports/` directory. Each agent produces standardized output with status (pass/warning/fail), violations, and recommendations.

**When to use agents**:

- Before opening PR: `npm run agent:workflow:pr`
- Before merging changes to parsers/fitting: `npm run agent:data-integrity` + `npm run agent:fitting-qa`
- Before release: `npm run agent:workflow:pre-release`
- CI/CD runs agents automatically on PR and scheduled workflows

**Quick Decision Tree** - "What agent should I run?":

```
Modified xmlParser.ts or jsonParser.ts?
  → npm run agent:parser-resilience

Modified fitting.ts or databaseProcessor.ts?
  → npm run agent:fitting-qa

Added/changed IPC handler in main.mjs or preload.cjs?
  → npm run agent:electron-ipc

Modified Zustand store (any file in src/store/)?
  → npm run agent:electron-ipc

Changed UI components or Layout.tsx?
  → npm run agent:ui-regression

Modified race result parsing or standings calculation?
  → npm run agent:results-consistency

Added/removed features or changed IPC handlers?
  → npm run agent:docs-drift

About to open PR?
  → npm run agent:workflow:pr (runs 3 agents)

About to publish release?
  → npm run agent:workflow:pre-release (runs all 8 agents)

Not sure what changed?
  → npm run agent:all (be patient, runs everything)
```

### Data File Locations (Windows)

- **AI adaptation**: `%USERPROFILE%\Documents\My Games\SimBin\RaceRoom Racing Experience\UserData\Player1\aiadaptation.xml`
- **Race results**: `.../UserData\Log\Results\*.txt` (auto-generated by R3E)
- **Game database**: `r3e-data.json` (manually extracted from game API)

## QA Agent Architecture

**Philosophy**: Specialized AI agents for domain-specific quality checks replacing traditional unit tests. Each agent is an expert in one area (schema validation, fitting quality, IPC correctness).

**Structure** ([agents/](agents/) directory):

- `runner.ts` - TypeScript orchestrator that executes agents via AI prompts
- `config.json` - Agent configurations, workflows, and parameters
- `docs/*.md` - Detailed specifications for each agent

**Individual Agent Details**:

### 1. Data Integrity Agent (`data-integrity`)

**Purpose**: Validates schema correctness of R3E input files (XML/JSON/TXT)
**Validates**:

- XML structure matches R3E schema (tracks, classes, vehicles exist in r3e-data.json)
- Time units consistency (ms in race results, seconds in aiadaptation.xml)
- Required fields present (Track, Class, Vehicle, Player, LapData)
- Value ranges (lap times non-negative, AI skill 0-100, AI levels integer)
- Array normalization patterns (single `<element>` vs multiple `<element>`)

**When to run**:

- After modifying any parser (`xmlParser.ts`, `jsonParser.ts`)
- Before importing new test data or fixtures
- When users report "file failed to parse" errors
- Before PR merge (automatic via workflow)

**Common catches**: Missing closing tags, time unit off-by-1000 errors, unrecognized track IDs

### 2. Parser Resilience Agent (`parser-resilience`)

**Purpose**: Tests parsers against edge cases and detects regressions
**Validates**:

- Parsers handle single element vs array patterns correctly (via `toArray()`)
- Edge cases: empty arrays, null values, missing keys, mixed encodings (UTF-8/ANSI)
- Line endings (CRLF vs LF) don't break parsing
- Large files (~500 tracks) parse without memory issues
- Output matches expected fixtures (regression detection)

**When to run**:

- After changing parser logic or adding new fields
- When adding support for new R3E file formats
- Before PR merge (automatic)
- After upgrading `fast-xml-parser` dependency

**Common catches**: Array normalization bugs, silent field drops, encoding issues

### 3. Fitting QA Agent (`fitting-qa`)

**Purpose**: Validates statistical quality of AI lap time fitting
**Validates**:

- Linear regression produces monotonically decreasing times (higher AI = faster)
- Fitted values within ±10% of sampled data points
- R² coefficient meets quality threshold
- Minimum samples requirement met (`testMinAIdiffs`)
- No synthetic/previously-fitted data contaminating samples

**When to run**:

- After modifying `fitting.ts` or `databaseProcessor.ts`
- When changing validation thresholds in `config.ts`
- Weekly (automatic nightly schedule)
- Before release when AI fitting logic changed

**Common catches**: Non-monotonic curves, overfitting, poor R² on specific track/class combos

### 4. Results Consistency Agent (`results-consistency`)

**Purpose**: Validates race result file coherence and session matching
**Validates**:

- Qualification + race files belong to same event (track/class/timestamp match)
- Driver names/IDs consistent across sessions
- Lap counts, positions, points follow expected patterns
- Championship standings calculations correct (points, ties, DNFs)
- No duplicate entries or missing drivers

**When to run**:

- After changing result parsing or standings calculation
- When modifying points system logic
- Weekly (automatic nightly)
- When users report incorrect championship standings

**Common catches**: Session mismatch, duplicate drivers, points calculation errors

### 5. Electron IPC Agent (`electron-ipc`)

**Purpose**: Audits IPC handlers and persistent storage correctness
**Validates**:

- All IPC channels defined in `preload.cjs` have handlers in `main.mjs`
- `sanitizeForIPC()` filters non-serializable data (functions, symbols)
- `electron-store` operations succeed with large datasets
- Storage quota doesn't exceed limits (web mode localStorage)
- No circular references or unserializable objects in store

**When to run**:

- After adding/modifying IPC handlers
- When changing Zustand store schemas
- After modifying `electronStorage.ts`
- Weekly (automatic schedule)
- Before release (full suite)

**Common catches**: Missing IPC handlers, serialization failures, circular references

### 6. UI Regression Agent (`ui-regression`)

**Purpose**: Smoke tests UI components and responsive layout
**Validates**:

- All routes render without errors (`/ai-management`, `/fix-qualy-times`, etc.)
- Responsive breakpoints work (mobile <768px, desktop >1920px)
- No console errors on page load
- Font Awesome icons load correctly
- File upload sections appear and are interactive
- Sidebar collapses on mobile

**When to run**:

- After UI component changes
- When modifying Layout.tsx or routing
- After Bootstrap/CSS updates
- Before PR merge (automatic)

**Common catches**: Broken routes, console errors, responsive bugs

### 7. Release Agent (`release`)

**Purpose**: Pre-release validation checklist
**Validates**:

- Version numbers consistent (package.json, CHANGELOG.md)
- Electron build succeeds (NSIS installer + portable)
- Auto-update URL configured correctly
- All dependencies up-to-date (security)
- No dev dependencies in production build
- CHANGELOG.md updated for current version

**When to run**:

- Manually before publishing release
- When bumping version
- Before running `npm run build:electron`

**Common catches**: Version mismatch, missing CHANGELOG entries, broken build config

### 8. Docs Drift Agent (`docs-drift`)

**Purpose**: Detects documentation out-of-sync with code
**Validates**:

- README.md feature list matches actual pages
- IPC handlers documented match implementation
- Agent list in docs matches `config.json`
- Code examples in docs still compile
- File paths in documentation exist

**When to run**:

- After adding/removing features
- When changing IPC handlers or store schemas
- Weekly (automatic)
- Before major releases

**Common catches**: Outdated examples, missing feature documentation, broken links

---

**Key Implementation Details**:

- Agents produce **standardized JSON output** with status, violations, severity, recommendations
- Workflows combine multiple agents (e.g., PR workflow = data-integrity + parser-resilience + ui-regression)
- CI/CD integration via GitHub Actions ([.github/workflows/agent-qa-suite.yml](.github/workflows/agent-qa-suite.yml))
- Reports saved to `.agent-reports/` for post-mortem analysis

## Common Pitfalls

1. **XML Mixed Arrays**: Always use `toArray()` helper—R3E XML has single `<element>` or multiple `<element>` at same level
2. **Lap Time Units**: Milliseconds in race results, seconds in `aiadaptation.xml` (convert via `timeUtils.ts`)
3. **Electron Context Isolation**: No `nodeIntegration`—all Node APIs must go through IPC ([electron/main.mjs](electron/main.mjs))
4. **Storage Limits**: Asset cache can grow large (electron-store has no limits, localStorage has 5-10MB)—implement `clearAssets()` button in UI
5. **CORS for Leaderboard**: Official R3E leaderboard may block fetch—fallback to manual HTML paste (see BuildResultsDatabase component)
6. **Font Awesome Icons**: Icons are SVG solid only—v7.1 icons library used throughout. Import from `@fortawesome/free-solid-svg-icons`

## Testing Approach

**Agent-Based QA**: No traditional unit tests—quality validation via specialized AI agents (see QA Agent Architecture section). Agents run on:

- **PR merge** (3 agents: data-integrity, parser-resilience, ui-regression)
- **Nightly** (2 agents: fitting-qa, results-consistency)
- **Weekly** (2 agents: electron-ipc, docs-drift)
- **Pre-release** (all 8 agents)

**Manual QA**: When adding features or debugging:

- Test with minimal XML (1 track, 1 class) and full user file (~500 tracks)
- Verify persistent storage (close/reopen app/browser - electron-store or localStorage)
- Check Electron file dialogs work cross-platform
- Run relevant agents locally before opening PR

**Local agent validation**:

```bash
npm run agent:data-integrity      # After modifying parsers
npm run agent:fitting-qa          # After changing fitting logic
npm run agent:electron-ipc        # After IPC/storage changes
npm run agent:workflow:pr         # Before opening PR
```

## Key External Dependencies

- `fast-xml-parser` (5.4): R3E XML → JSON (set `ignoreAttributes: false` for proper parsing)
- `mathjs` (15.1): Linear regression via LU decomposition ([src/utils/fitting.ts](src/utils/fitting.ts))
- `zustand` (5.0): State management with `persist` middleware for electron-store/localStorage
- `electron-store` (11.0): Native persistent storage for Electron mode (via IPC bridge)
- `electron-updater` (6.8): Auto updates for packaged Electron builds
- `react-bootstrap` (2.10): UI components (Cards, Buttons, Forms, etc.)
- `@fortawesome/react-fontawesome` (3.2): Solid SVG icons (solid icons library v7.2) throughout UI
- `electron` (40.6): Desktop runtime with native file dialogs
- `electron-builder` (26.8): Packaging for Windows NSIS installer + portable exe
- `electron-is-dev` (3.0): Detect dev vs production for conditional loading
- `typescript` (5.9): TypeScript compiler with strict mode enabled
- `vite` (7.3): Fast build tool and dev server
- `react-router-dom` (7.13): Client-side routing

## When Modifying Fitting Logic

1. Update [src/config.ts](src/config.ts) defaults (validated by UI sliders)
2. Adjust validation thresholds in [src/utils/databaseProcessor.ts](src/utils/databaseProcessor.ts#L60-L98)
3. Test with edge cases: single sample, all samples at same AI level, non-monotonic data
4. Document in [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) (developer notes)

## Code Style

- TypeScript strict mode enabled
- Prefer `type` over `interface` for unions/intersections
- Export named functions/constants (avoid default exports except page components)
- Comment statistical/validation logic (not obvious UI code)
- File imports: use relative paths (`../utils/parser`), not aliases
- **Language**: Use English for all comments, documentation, commit messages, and code
  - Applies to: inline comments, JSDoc, markdown files, variable names, function names
  - Exception: User-facing UI text can be localized if needed

---

**Last Updated**: March 6, 2026 | **Version**: 1.5.0
