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

- **Electron mode**: Uses `electron-store` v11.0.2 for native persistent storage (no size limits)
- **Web mode**: Falls back to browser `localStorage` (5-10MB limit)
- Unified interface abstracts the differences

**Stores**: `configStore` (fitting params), `championshipStore` (saved championships), `leaderboardAssetsStore` (cached icons), `gameDataStore` (r3e-data.json).

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

Renderer calls via IPC bridge in [electron/preload.cjs](electron/preload.cjs) with `contextIsolation` + `sandbox` enabled for security.

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

UI feedback for batch operations uses custom hook:

```typescript
const { logs, addLog, logsEndRef } = useProcessingLog();
addLog("success", "Processed 42 files"); // auto-scrolls, timestamps
```

Used in: FixQualyTimes, BuildResultsDatabase (see [src/hooks/useProcessingLog.ts](src/hooks/useProcessingLog.ts)).

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
  - `ResultsDatabaseViewer.tsx` - Browse saved championships
  - `ResultsDatabaseDetail.tsx` - Championship detail view with driver/team/vehicle standings
  - `GameDataOnboarding.tsx` - r3e-data.json setup (auto-detect or manual upload)
  - `Settings.tsx` - Fitting parameters, UI defaults, cache management
- **Shared UI**: `Layout.tsx` (sidebar navigation), `ProcessingLog.tsx`, `FileUploadSection.tsx`
- **Routing**: [src/App.tsx](src/App.tsx) - React Router with `/ai-management`, `/fix-qualy-times`, `/build-results-database`, `/results-viewer`, `/settings`

## Development Workflows

### Prerequisites

- **Node.js 24.x** or higher
- Windows/macOS/Linux with npm or pnpm

### Run Dev Environment

```bash
npm run dev           # Starts Vite (5173) + Electron with hot reload (recommended)
npm run dev:vite      # Web-only mode (browser testing without Electron)
npm run dev:electron  # Electron only (requires Vite already running)
```

**Important**: Electron loads `http://localhost:5173` in dev, not file:// protocol. Hot reload works automatically.

### Build & Deploy

```bash
npm run build             # Vite production build → dist/ (web only)
npm run build:electron    # Full Electron app: Vite build + electron-builder → dist/ (with Windows NSIS installer + portable exe)
```

**Output**: `dist/` for both web assets and Electron app packaging (via electron-builder). All built resources in single directory.

### Data File Locations (Windows)

- **AI adaptation**: `%USERPROFILE%\Documents\My Games\SimBin\RaceRoom Racing Experience\UserData\Player1\aiadaptation.xml`
- **Race results**: `.../UserData\Log\Results\*.txt` (auto-generated by R3E)
- **Game database**: `r3e-data.json` (manually extracted from game API)

## Common Pitfalls

1. **XML Mixed Arrays**: Always use `toArray()` helper—R3E XML has single `<element>` or multiple `<element>` at same level
2. **Lap Time Units**: Milliseconds in race results, seconds in `aiadaptation.xml` (convert via `timeUtils.ts`)
3. **Electron Context Isolation**: No `nodeIntegration`—all Node APIs must go through IPC ([electron/main.mjs](electron/main.mjs))
4. **Storage Limits**: Asset cache can grow large (electron-store has no limits, localStorage has 5-10MB)—implement `clearAssets()` button in UI
5. **CORS for Leaderboard**: Official R3E leaderboard may block fetch—fallback to manual HTML paste (see BuildResultsDatabase component)
6. **Font Awesome Icons**: Icons are SVG solid only—v7.1 icons library used throughout. Import from `@fortawesome/free-solid-svg-icons`

## Testing Approach

No formal test suite—manual QA with real R3E files. When adding features:

- Test with minimal XML (1 track, 1 class) and full user file (~500 tracks)
- Verify persistent storage (close/reopen app/browser - electron-store or localStorage)
- Check Electron file dialogs work cross-platform

## Key External Dependencies

- `fast-xml-parser` (5.3): R3E XML → JSON (set `ignoreAttributes: false` for proper parsing)
- `mathjs` (15.1): Linear regression via LU decomposition ([src/utils/fitting.ts](src/utils/fitting.ts))
- `zustand` (5.0): State management with `persist` middleware for electron-store/localStorage
- `electron-store` (11.0): Native persistent storage for Electron mode (via IPC bridge)
- `react-bootstrap` (2.10): UI components (Cards, Buttons, Forms, etc.)
- `@fortawesome/react-fontawesome` (3.2): Solid SVG icons (solid icons library v7.1) throughout UI
- `electron` (40): Desktop runtime with native file dialogs
- `electron-builder` (26): Packaging for Windows NSIS installer + portable exe
- `electron-is-dev` (3.0): Detect dev vs production for conditional loading

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

**Last Updated**: February 11, 2026 | **Version**: 0.4.3
