# R3E Toolbox

A comprehensive React + TypeScript toolbox for **RaceRoom Racing Experience** (R3E). This web application provides three essential utilities for managing AI difficulty, correcting race results, and building championship standings.

## 📥 Download

**[⬇️ Download Latest Release (Windows Installer)](https://github.com/deggesim/r3e-toolbox/releases/latest)**

Alternatively, download directly from the [Releases page](https://github.com/deggesim/r3e-toolbox/releases) for other versions or formats.

## What Does It Do?

The toolbox combines multiple standalone tools into a single, user-friendly interface:

1. **AI Management** - Optimize AI difficulty settings through statistical analysis of your race data
2. **Fix Qualy Times** - Recover missing qualification times in race result files
3. **Build Results Database** - Generate visual championship standings from race results with official RaceRoom icons

**No backend required** - runs entirely in your browser with localStorage persistence for caching.

## Features

### 1. AI Management

- **XML Data Import**: Parse RaceRoom's `aiadaptation.xml` to extract player lap times and sampled AI performance data
- **Statistical Fitting**: Apply linear regression to predict unmeasured AI lap times from existing sampled data
- **Intelligent Validation**: Reject non-monotonic curves and outliers; validate fit quality against configurable thresholds
- **XML Export**: Regenerate configuration files with fitted data, preserving all track/class combinations
- **Interactive Dashboard**: Real-time visualization of tracks, classes, and AI levels with parameter controls
- **Type-Safe Processing**: Full TypeScript validation across data import, processing, and export pipelines
- Predict lap times for AI difficulty levels with no real-world sample data
- Detect and remove synthetically-generated (previously fitted) entries to re-fit with new data
- Configure fitting tolerance and validation parameters in real-time
- Support multiple fitting modes: averaged times per AI level or individual lap times

### 2. Fix Qualy Times

Corrects missing or invalid qualification times in RaceRoom race result files by extracting them from the corresponding qualification session file.

**Features:**

- **File Validation**: Ensures qualification and race files belong to the same event
- **Automatic Patching**: Updates `qualTimeMs` field for each driver using their best qualification lap
- **Error Detection**: Identifies drivers missing from qualification session
- **Safe Processing**: Validates all lap times before applying changes
- **Download Fixed File**: Generates `_fix.txt` suffix file with corrected data

**How it works:**

1. Upload qualification session file (`.txt` or `.json`)
2. Upload race session file (`.txt` or `.json`)
3. Tool validates event matching and lap time data integrity
4. Extracts `bestLapTimeMs` from qualification file for each driver
5. Patches race file's `qualTimeMs` field (handles `-1` invalid values)
6. Shows detailed processing log with success/warning/error messages
7. Downloads fixed race file with `_fix.txt` suffix

**Use case:** RaceRoom sometimes saves race results with missing qualification times (`qualTimeMs: -1`). This tool recovers the correct times from the qualification session to generate accurate race standings and statistics.

### 3. Build Results Database

Analyzes RaceRoom race result files and generates championship standings with visual asset integration from the official leaderboard.

**Features:**

- **Leaderboard Icon Download**: Fetches car and track icons from the official RaceRoom leaderboard
- **Asset Caching**: Automatically caches downloaded icons in localStorage to avoid repeated network requests
- **Smart Cache Management**: Shows cache status (💾 Cached) and provides "Clear cache" button to reset on demand
- **Batch Result Parsing**: Processes multiple race result files from a folder simultaneously
- **Championship Standings**: Calculates points, positions, and statistics across all races
- **HTML Export**: Generates formatted, standalone HTML file with embedded styles and icons
- **Live Preview**: Real-time preview of championship standings before download

**Workflow:**

1. **Step 1 - Download Icons**: Click "Download and analyze" to fetch official RaceRoom assets (cars/tracks)
   - Icons cached in localStorage for instant reuse
   - Manual HTML paste option if CORS blocks request
   - Clear cache button to force refresh

2. **Step 2 - Select Results Folder**: Choose folder containing race result `.txt` files
   - Auto-parses all files using `r3e-data.json` game database
   - Displays count of parsed races
   - Shows warnings for unrecognized tracks/classes

3. **Step 3 - Championship Alias**: Enter championship name (e.g., "DTM 2026 Season")

4. **Step 4 - Preview & Export**:
   - Live HTML preview with standings table
   - Driver statistics: races, wins, podiums, points
   - Race-by-race results with track icons
   - Click "Export HTML" to download standalone file

**Integration**: Replicates the logic of [r3e-open-championship](https://github.com/pixeljetstream/r3e-open-championship) project for standings calculation and HTML generation.

#### Asset Caching System

The toolbox implements automatic localStorage caching for leaderboard assets (icons and metadata):

**How it works:**

1. First load: `fetchLeaderboardAssetsWithCache()` downloads icons from the leaderboard
2. Assets stored: All car and track URLs saved to localStorage via Zustand store
3. Subsequent loads: Data retrieved from cache instantly without network request
4. Cache indicator: UI shows "💾 Cached in localStorage" badge when data is from cache
5. Manual clear: "Clear cache" button removes all cached assets from localStorage

**Technical implementation** (`src/store/leaderboardAssetsStore.ts`):

- Zustand store with persist middleware for localStorage persistence
- Stores: asset URLs, icons, metadata, and fetch timestamps
- State: `assets`, `isLoading`, `error` for UI feedback

**Usage in components**:

```typescript
// Automatically use cache (or fetch if not available)
const assets = await fetchLeaderboardAssetsWithCache();

// Or force refresh from leaderboard
const freshAssets = await fetchLeaderboardAssetsWithCache({
  forceRefresh: true,
});

// Direct store access in React components
const cachedAssets = useLeaderboardAssetsStore((state) => state.assets);
const clearAssets = useLeaderboardAssetsStore((state) => state.clearAssets);
```

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or pnpm
- RaceRoom Racing Experience installation with `aiadaptation.xml` file

### Installation

1. Clone the repository:

   ```bash
   git clone <repo-url>
   cd r3e-toolbox
   ```

2. Install dependencies:
   ```bash
   npm install
   # or: pnpm install
   ```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The app hot-reloads on file changes.

### Build & Deployment

Build for production:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

Run ESLint checks:

```bash
npm run lint
```

## Technical Architecture

### Data Validation

All game data (`r3e-data.json`) is validated on load to ensure structural integrity:

- **Automatic validation**: Both manual upload and auto-detection in Electron mode
- **Type-safe parsing**: Validates classes, tracks, layouts with detailed error messages
- **Non-blocking warnings**: Logs non-critical issues (e.g., ID mismatches) to console
- **Early error detection**: Prevents runtime errors from malformed game data

See [Data Validation Documentation](docs/R3E_DATA_VALIDATION.md) for complete validation rules and troubleshooting.

### Data Flow

```
aiadaptation.xml
       ↓
   xmlParser.ts (parse & normalize)
       ↓
   Database {
     classes: {
       [classId]: {
         tracks: {
           [trackId]: {
             ailevels: { 80: [...], 85: [...], ... },
             samplesCount: { 80: 5, 85: 0, ... }
           }
         }
       }
     }
   }
       ↓
   databaseProcessor.ts (fit & validate)
       ↓
   ProcessedDatabase {
     classes: {
       [classId]: {
         tracks: {
           [trackId]: {
             generator: (aiLevel) => predictedLapTime
           }
         }
       }
     }
   }
       ↓
   xmlBuilder.ts (reconstruct)
       ↓
   aiadaptation.xml (output)
```

### Core Components

#### 1. **XML Parser** (`src/utils/xmlParser.ts`)

- Uses `fast-xml-parser` to handle RaceRoom's XML structure
- Normalizes array/object duality: single entries → objects, multiple entries → arrays
- Extracts:
  - Player best lap times per track/class
  - AI skill levels (80-120) with averaged lap times
  - Sample counts (0 = synthetically generated, >0 = real race data)

#### 2. **Database Processor** (`src/utils/databaseProcessor.ts`)

- Builds normalized `Database` structure: `classes[id].tracks[id].ailevels[level]`
- Implements linear least-squares regression fitting
- Validates fit quality: rejects non-monotonic predictions and deviations > `testMaxTimePct`
- Returns `ProcessedDatabase` with lap time generator functions

#### 3. **Fitting Algorithm** (`src/utils/fitting.ts`)

- **Linear Regression**: `y = a + b*x` where y = lap time, x = AI level
- Uses `mathjs` for matrix algebra (A^T·A)^(-1)·A^T·Y solved via LU decomposition
- Numerical stability: avoids floating-point errors in normal equations
- Interface supports future extensions (e.g., parabolic fitting with coefficient `c`)

#### 4. **UI Dashboard** (`src/components/AIDashboard.tsx`)

- Load `r3e-data.json` for track/class metadata
- File I/O: Import XML → Parse → Process → Render → Export XML
- State management: React hooks (no Redux)
- Features: Track/class selection, AI level visualization, parameter controls

#### 5. **XML Builder** (`src/utils/xmlBuilder.ts`)

- Reconstructs `aiadaptation.xml` from processed database
- Preserves all track/class combinations (empty or populated) in numerical ID order
- Formats numbers: removes trailing zeros (1.2500 → 1.25, 1.0000 → 1)
- Critical: Sets `numberOfSampledRaces = 0` for fitted (non-real) data

### Configuration

All tunable parameters in `src/config.ts`:

```typescript
export const CFG = {
  minAI: 80, // Lower bound of AI difficulty range
  maxAI: 120, // Upper bound of AI difficulty range

  fitAll: false, // If true: fit all individual lap times
  // If false: fit averaged times per AI level

  testMinAIdiffs: 2, // Min AI level spread (e.g., 80 & 85) required to fit
  testMaxTimePct: 0.1, // Max deviation tolerance: 10% of minimum lap time
  testMaxFailsPct: 0.1, // Max allowed failure rate: <10% of points exceed tolerance

  aiNumLevels: 5, // UI: number of AI levels to apply around selection
  aiSpacing: 1, // Step between AI levels (e.g., 80, 81, 82, ...)
};
```

**Modify without restarting the dev server.**

## File Structure

```
src/
├── App.tsx                    # Root component wrapper
├── main.tsx                   # React entry point
├── types.ts                   # TypeScript interfaces for all data models
├── config.ts                  # Global configuration (tunable parameters)
├── index.css                  # Global styles
├── App.css                    # App-specific styles
│
├── components/
│   ├── AIDashboard.tsx           # AI Management: main controller & state
│   ├── AIManagementGUI.tsx       # AI Management: visualization & controls
│   ├── FixQualyTimes.tsx         # Fix Qualy Times: qualification time patcher
│   ├── BuildResultsDatabase.tsx  # Build Results: championship standings builder
│   ├── Layout.tsx                # Navigation layout wrapper
│   └── Settings.tsx              # Global settings panel
│
├── store/
│   ├── configStore.ts            # Zustand store for user config persistence
│   └── leaderboardAssetsStore.ts # Zustand store for cached leaderboard assets
│
├── utils/
│   ├── xmlParser.ts              # Parse aiadaptation.xml → Database
│   ├── jsonParser.ts             # Load r3e-data.json → Assets
│   ├── r3eDataValidator.ts       # Validate r3e-data.json structure
│   ├── databaseProcessor.ts      # Fit & validate → ProcessedDatabase
│   ├── fitting.ts                # Linear/parabolic regression functions
│   ├── timeUtils.ts              # Lap time computations
│   ├── xmlBuilder.ts             # Reconstruct aiadaptation.xml
│   ├── leaderboardAssets.ts      # Fetch icons from RaceRoom leaderboard
│   ├── raceResultParser.ts       # Parse race result files
│   ├── htmlGenerator.ts          # Generate championship standings HTML
│   └── [other utilities]
│
├── assets/                       # Static images/icons (if any)
└── hooks/                        # (Empty, reserved for future)

.github/
├── copilot-instructions.md    # AI agent guidelines

r3e-data.json                  # Game database: track & class metadata
vite.config.ts                 # Vite configuration
tsconfig.json                  # TypeScript global config
eslint.config.js              # ESLint rules
package.json                  # Dependencies & scripts
```

## Technologies & Dependencies

### Framework & Build

- **React 19** - UI framework with hooks
- **React Bootstrap 2.10** - UI component library (Cards, Buttons, Forms, etc.)
- **Vite 7** - Build tool (handles JSX, dev server, hot reload, bundling)
- **TypeScript 5.9** - Type safety and IntelliSense

### State Management

- **Zustand 5.0** - Lightweight state management (config + asset caching)
- **zustand/middleware** - `persist` for localStorage persistence

### Data Processing

- **fast-xml-parser 5.3** - Robust XML parsing (handles array/object duality)
- **mathjs 15.1** - Matrix algebra for linear regression (LU decomposition)

### Code Quality

- **ESLint 9** - Linting with TypeScript support
- **eslint-plugin-react-hooks** - React best practices enforcement
- **@typescript-eslint** - TypeScript-specific linting rules

## Common Workflows

### Importing RaceRoom Data & Fitting AI Levels

1. Open the dashboard in browser
2. Click "Import XML" → select `UserData/Player1/aiadaptation.xml`
3. Select a track and class
4. Dashboard displays:
   - Current sampled AI levels (real race data, `numberOfSampledRaces > 0`)
   - Synthetically generated levels (previous fits, `numberOfSampledRaces = 0`)
5. Choose to remove generated entries to re-fit with fresh data
6. Adjust config parameters if needed (`testMaxTimePct`, etc.)
7. Review fitted curve predictions
8. Click "Export XML" to save back to game directory

### Fixing Qualification Times in Race Results

**Scenario**: RaceRoom saved a race file with missing qualification times (`qualTimeMs: -1`).

1. Navigate to "Fix Qualy Times" tool
2. Upload qualification session file (`.txt` from `UserData/Log/Results/`)
3. Upload race session file (same event)
4. Click "Fix Qualy Times"
5. Review processing log:
   - ✔ Event validation (ensures files match)
   - ✔ Lap time validation (all times are valid numbers)
   - ⚠ Warnings for drivers missing from qualification
   - Count of updated drivers
6. Confirm download prompt
7. Save `*_fix.txt` file to replace original race result

**Example files**:

```
2026_01_23_14_30_00_Qualify.txt  → Qualification session
2026_01_23_14_45_00_Race1.txt    → Race session (broken)
2026_01_23_14_45_00_Race1_fix.txt → Fixed output
```

### Building Championship Standings from Race Results

**Scenario**: You ran a 10-race championship and want to generate a visual standings page.

1. Navigate to "Build Results Database" tool

2. **Step 1 - Get Icons** (first time only):
   - Click "Download and analyze"
   - Wait for leaderboard assets to load (auto-cached in localStorage)
   - Badge shows "💾 Cached in localStorage" on subsequent visits

3. **Step 2 - Select Results**:
   - Click folder input → select your results folder
   - Example: `UserData/Log/Results/` containing all championship races
   - Tool auto-parses files and displays: "10 result files selected"

4. **Step 3 - Name Championship**:
   - Enter "Championship alias": e.g., "DTM Classic 2026"

5. **Step 4 - Preview & Export**:
   - Review live HTML preview with:
     - Overall standings table (driver, races, wins, podiums, points)
     - Race results grid with track icons
   - Click "Export HTML" → downloads `DTM Classic 2026.html`
   - Open standalone HTML in any browser (works offline)

**Tip**: Clear cache if RaceRoom adds new cars/tracks to update icons.

### Adding a New Fitting Algorithm

1. Implement fitting function in `src/utils/fitting.ts`:

   ```typescript
   export function fitCubic(xValues: number[], yValues: number[]): FitResult {
     // Implement cubic polynomial fitting
     return { a, b, c, d }; // Extend FitResult interface
   }
   ```

2. Update `FitResult` interface in `src/types.ts` to include new coefficients

3. Modify `databaseProcessor.ts` to call new function and validate output:

   ```typescript
   const { a, b, c, d } = fitCubic(x, y);
   const generator = (t: number) => a + b * t + c * t * t + d * t * t * t;
   ```

4. Adjust config thresholds in `src/config.ts` if validation behavior changes

### Debugging Data Import Issues

1. **Check XML structure**: Log output of `parseAdaptive()` in browser console
   - Verify classes and tracks are extracted correctly
   - Ensure `toArray()` normalizes single/multiple entries

2. **Verify Database normalization**: Inspect `Database` object
   - Structure: `classes[classId].tracks[trackId].ailevels[level]` (keyed by AI level number)
   - `samplesCount[level]`: 0 = synthetic, >0 = real data

3. **Trace fitting**: Enable console logs in `databaseProcessor.ts`
   - Log min/max AI levels detected
   - Log fitted coefficients and validation results

### Extending the UI

1. Create new component in `src/components/` (e.g., `ChartVisualization.tsx`)
2. Use React hooks for state management
3. Import in `AIDashboard.tsx` and integrate into render tree
4. No Redux or external state management needed (keep simple)

## Integration with RaceRoom

### File Locations

- **Input/Output**: `%USERPROFILE%\Documents\My Games\SimBin\RaceRoom Racing Experience\UserData\Player1\aiadaptation.xml`
- **Game Database**: Generated from [r3e-adaptive-ai-primer](https://github.com/your-org/r3e-adaptive-ai-primer) → `r3e-data.json`

### ID Mapping

- Class/Track IDs in XML must match IDs in `r3e-data.json`
- IDs are immutable; mismatch will cause export failures

### Data Safety

- App preserves all existing track/class combinations (even if empty)
- Original XML structure respected: numerical ID ordering
- Synthetic data marked: `numberOfSampledRaces = 0` indicates fitted entries
- **Backup before first use**: Keep copy of original `aiadaptation.xml`

## Performance Notes

- **Fast fitting**: Linear regression on 5-10 data points: <1ms per track
- **XML parsing**: 5KB files (typical): <10ms
- **UI rendering**: Dashboard with 50+ tracks/classes: instant
- **Memory**: Minimal footprint (~1-2 MB for full game database)

## Troubleshooting

### AI Management

| Issue                        | Cause                          | Solution                                                     |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------ |
| Fit rejected (non-monotonic) | Noisy data with inversions     | Increase `testMaxTimePct` or sample more races               |
| Too many rejections          | Strict validation              | Lower `testMaxFailsPct` in config                            |
| XML export missing data      | Empty classes/tracks in output | Check database normalization in debugger                     |
| `r3e-data.json` not found    | Game database not generated    | Run [r3e-adaptive-ai-primer](../r3e-adaptive-ai-primer) tool |
| Can't import XML file        | File corrupted or wrong format | Verify XML structure with text editor                        |

### Fix Qualy Times

| Issue                           | Cause                             | Solution                                              |
| ------------------------------- | --------------------------------- | ----------------------------------------------------- |
| "Event attributes differ" error | Wrong race/qual file pair         | Ensure both files are from the same event session     |
| Driver missing from qual        | Driver joined after qualification | Expected warning; tool patches available drivers only |
| Invalid bestLapTimeMs           | Corrupted qualification file      | Re-export from RaceRoom or use backup                 |
| Can't read .txt file            | File encoding issue               | Save file as UTF-8 or try converting to JSON first    |

### Build Results Database

| Issue                             | Cause                             | Solution                                            |
| --------------------------------- | --------------------------------- | --------------------------------------------------- |
| CORS error fetching leaderboard   | Browser security blocking request | Paste HTML manually (instructions in UI)            |
| Icons not showing in localStorage | Persist middleware not saving     | Check DevTools > Application > localStorage for key |
| Cache badge shows wrong status    | State sync issue                  | Click "Clear cache" and re-download                 |
| Result files not parsing          | Unknown track/class in r3e-data   | Update `r3e-data.json` from primer tool             |
| HTML preview not loading          | Browser blocked iframe            | Export and open HTML file directly                  |
| Missing championship alias        | Field left empty                  | Enter name in Step 3 before export                  |

## 🚀 Releasing New Versions (For Maintainers)

To create a new release with automatic installers on GitHub:

```bash
# 1. Make sure everything is committed
git add .
git commit -m "Release v1.0.0"

# 2. Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# 3. GitHub Actions will automatically build and create the release
# Installers will appear at: https://github.com/deggesim/r3e-toolbox/releases
```

The automated workflow:

- ✅ Builds the Electron app for Windows (add macOS/Linux in the workflow if needed)
- ✅ Creates installer packages (`.exe`, `.dmg`, `.AppImage`, `.deb`)
- ✅ Creates GitHub Release with attached installers
- ✅ Generates release notes automatically from commits

To release manually without GitHub Actions:

```bash
npm run build:electron
# Installers will be in dist-electron/
```

## Development Guidelines

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for AI agent onboarding, architecture deep-dives, and patterns specific to this codebase.

```

```

## Disclaimer

This project is a personal, independent initiative developed in my personal time and with personal equipment.

It is not affiliated with, sponsored by, or related to my employer in any way.
No proprietary information, confidential materials, or company resources have been used in its development.

The software is provided free of charge, without any warranty or obligation of support.
