# R3E Toolbox - AI Coding Agent Instructions

## Project Overview
React + TypeScript + Electron toolbox for RaceRoom Racing Experience (R3E) game. Processes XML game data files, race results, and championship standings. No backend—100% browser-based with localStorage caching.

## Architecture

### Core Data Flow
```
XML/TXT files → Parsers → Normalized Database → Processors → UI Components → Export
```

**Key insight**: R3E's `aiadaptation.xml` uses mixed XML patterns (single elements vs arrays). All parsers use `toArray()` normalization (see [src/utils/xmlParser.ts](src/utils/xmlParser.ts)).

### Three Main Features (Independent Modules)
1. **AI Management** ([src/components/AIManagement.tsx](src/components/AIManagement.tsx)): Parses `aiadaptation.xml` → linear regression on lap times → predicts AI difficulty for unmeasured levels
2. **Fix Qualy Times** ([src/components/FixQualyTimes.tsx](src/components/FixQualyTimes.tsx)): Patches race results with qualification lap times from separate session files
3. **Build Results Database** ([src/components/BuildResultsDatabase.tsx](src/components/BuildResultsDatabase.tsx)): Aggregates race results → generates championship standings HTML with cached leaderboard icons

## Critical Development Patterns

### State Management - Zustand with Persist
All global state uses Zustand stores with localStorage persistence:
```typescript
// Pattern: src/store/*.ts
export const useMyStore = create<State>()(
  persist(
    (set) => ({ /* state + actions */ }),
    { name: 'my-store-key', storage: createJSONStorage(() => localStorage) }
  )
);
```
**Stores**: `configStore` (fitting params), `championshipStore` (saved championships), `leaderboardAssetsStore` (cached icons).

### Electron Dual-Mode Architecture
App runs as **Electron desktop app** OR **web browser**. File operations abstracted via `useElectronAPI()` hook:
```typescript
// src/hooks/useElectronAPI.ts
const { isElectron, openFile, readFile } = useElectronAPI();
if (isElectron) { /* use IPC */ } else { /* fallback to File API */ }
```
**IPC handlers**: [electron/main.mjs](electron/main.mjs) exposes `dialog:openFile`, `fs:readFile`, etc. to renderer via preload script.

### Statistical Fitting Logic (AI Management)
**Non-obvious**: AI lap times must decrease monotonically with skill level. Fitting validates via:
1. Linear regression on sampled AI levels ([src/utils/fitting.ts](src/utils/fitting.ts)): `y = a + b*x` (lap time vs AI level)
2. Reject if predicted times increase or deviate >10% from samples ([src/utils/databaseProcessor.ts](src/utils/databaseProcessor.ts#L60-L98))
3. Config params: `testMinAIdiffs`, `testMaxTimePct`, `testMaxFailsPct` ([src/config.ts](src/config.ts))

**Why**: RaceRoom generates synthetic lap times—toolbox detects/removes them before re-fitting with real data.

### Asset Caching System (Build Results)
Leaderboard icons fetched once → cached in localStorage → reused across sessions:
```typescript
// src/utils/leaderboardAssets.ts
const assets = await fetchLeaderboardAssetsWithCache(); // auto-cache
const assets = await fetchLeaderboardAssetsWithCache({ forceRefresh: true }); // bypass
```
**Cache key**: `leaderboard-assets-storage` in localStorage. See [ASSET_CACHING.md](ASSET_CACHING.md) for flow diagram.

### Processing Log Pattern
UI feedback for batch operations uses custom hook:
```typescript
const { logs, addLog, logsEndRef } = useProcessingLog();
addLog('success', 'Processed 42 files'); // auto-scrolls, timestamps
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
- **Pages**: `AIManagement`, `FixQualyTimes`, `BuildResultsDatabase` (full-page features)
- **Shared UI**: `Layout`, `ProcessingLog`, `FileUploadSection`
- **Routing**: [src/App.tsx](src/App.tsx) - React Router with `/ai-management`, `/fix-qualy-times`, etc.

## Development Workflows

### Run Dev Environment
```bash
npm run dev        # Starts Vite (5173) + Electron with hot reload
npm run dev:vite   # Web-only mode (browser testing)
```
**Important**: Electron loads `http://localhost:5173` in dev, not file:// protocol.

### Build & Deploy
```bash
npm run build             # Vite production build → dist/
npm run build:electron    # Full Electron package (NSIS/portable on Windows)
```
**Output**: `dist/` for web, packaged app in `dist-electron/` (via electron-builder).

### Data File Locations (Windows)
- **AI adaptation**: `%USERPROFILE%\Documents\My Games\SimBin\RaceRoom Racing Experience\UserData\Player1\aiadaptation.xml`
- **Race results**: `.../UserData\Log\Results\*.txt` (auto-generated by R3E)
- **Game database**: `r3e-data.json` (manually extracted from game API)

## Common Pitfalls

1. **XML Mixed Arrays**: Always use `toArray()` helper—R3E XML has single `<element>` or multiple `<element>` at same level
2. **Lap Time Units**: Milliseconds in race results, seconds in `aiadaptation.xml` (convert via `timeUtils.ts`)
3. **Electron Context Isolation**: No `nodeIntegration`—all Node APIs must go through IPC ([electron/main.mjs](electron/main.mjs))
4. **localStorage Limits**: Asset cache can grow large—implement `clearAssets()` button in UI
5. **CORS for Leaderboard**: Official R3E leaderboard may block fetch—fallback to manual HTML paste (see BuildResultsDatabase component)

## Testing Approach
No formal test suite—manual QA with real R3E files. When adding features:
- Test with minimal XML (1 track, 1 class) and full user file (~500 tracks)
- Verify localStorage persistence (close/reopen browser)
- Check Electron file dialogs work cross-platform

## Key External Dependencies
- `fast-xml-parser`: R3E XML → JSON (set `ignoreAttributes: false` for proper parsing)
- `mathjs`: Linear regression via LU decomposition ([src/utils/fitting.ts](src/utils/fitting.ts))
- `zustand`: State management with `persist` middleware
- `react-bootstrap`: UI components (not custom CSS framework)
- `electron-is-dev`: Detect dev vs production for conditional loading

## When Modifying Fitting Logic
1. Update [src/config.ts](src/config.ts) defaults (validated by UI sliders)
2. Adjust validation thresholds in [src/utils/databaseProcessor.ts](src/utils/databaseProcessor.ts#L60-L98)
3. Test with edge cases: single sample, all samples at same AI level, non-monotonic data
4. Document in [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) (Italian, developer notes)

## Code Style
- TypeScript strict mode enabled
- Prefer `type` over `interface` for unions/intersections
- Export named functions/constants (avoid default exports except page components)
- Comment statistical/validation logic (not obvious UI code)
- File imports: use relative paths (`../utils/parser`), not aliases
