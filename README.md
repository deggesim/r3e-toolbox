# R3E Adaptive AI v2

A React + TypeScript web application for analyzing and optimizing AI difficulty levels in **RaceRoom Racing Experience**. Processes lap time data from game telemetry, fits statistical models to predict AI performance across difficulty levels (80-120), and generates optimized XML configurations.

## Features

### Core Functionality
- **XML Data Import**: Parse RaceRoom's `aiadaptation.xml` to extract player lap times and sampled AI performance data
- **Statistical Fitting**: Apply linear regression to predict unmeasured AI lap times from existing sampled data
- **Intelligent Validation**: Reject non-monotonic curves and outliers; validate fit quality against configurable thresholds
- **XML Export**: Regenerate configuration files with fitted data, preserving all track/class combinations
- **Interactive Dashboard**: Real-time visualization of tracks, classes, and AI levels with parameter controls
- **Type-Safe Processing**: Full TypeScript validation across data import, processing, and export pipelines

### AI Optimization
- Predict lap times for AI difficulty levels with no real-world sample data
- Detect and remove synthetically-generated (previously fitted) entries to re-fit with new data
- Configure fitting tolerance and validation parameters in real-time
- Support multiple fitting modes: averaged times per AI level or individual lap times

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or pnpm
- RaceRoom Racing Experience installation with `aiadaptation.xml` file

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd r3e-adaptive-ai-v2
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
  minAI: 80,              // Lower bound of AI difficulty range
  maxAI: 120,             // Upper bound of AI difficulty range
  
  fitAll: false,          // If true: fit all individual lap times
                          // If false: fit averaged times per AI level
  
  testMinAIdiffs: 2,      // Min AI level spread (e.g., 80 & 85) required to fit
  testMaxTimePct: 0.1,    // Max deviation tolerance: 10% of minimum lap time
  testMaxFailsPct: 0.1,   // Max allowed failure rate: <10% of points exceed tolerance
  
  aiNumLevels: 5,         // UI: number of AI levels to apply around selection
  aiSpacing: 1,           // Step between AI levels (e.g., 80, 81, 82, ...)
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
│   ├── AIDashboard.tsx        # Main UI controller & state management
│   └── AIManagementGUI.tsx    # Visualization & controls
│
├── utils/
│   ├── xmlParser.ts           # Parse aiadaptation.xml → Database
│   ├── jsonParser.ts          # Load r3e-data.json → Assets
│   ├── databaseProcessor.ts   # Fit & validate → ProcessedDatabase
│   ├── fitting.ts             # Linear/parabolic regression functions
│   ├── timeUtils.ts           # Lap time computations
│   ├── xmlBuilder.ts          # Reconstruct aiadaptation.xml
│   └── [other utilities]
│
├── assets/                    # Static images/icons (if any)
└── hooks/                     # (Empty, reserved for future)

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
- **React 19** - UI framework
- **Vite 7** - Build tool (handles JSX, dev server, bundling)
- **TypeScript 5.9** - Type safety

### Data Processing
- **fast-xml-parser 5.3** - Robust XML parsing (handles array/object duality)
- **mathjs 15.1** - Matrix algebra for regression (LU decomposition)

### Code Quality
- **ESLint 9** - Linting with TypeScript support
- **eslint-plugin-react-hooks** - React best practices

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

### Adding a New Fitting Algorithm

1. Implement fitting function in `src/utils/fitting.ts`:
   ```typescript
   export function fitCubic(xValues: number[], yValues: number[]): FitResult {
     // Implement cubic polynomial fitting
     return { a, b, c, d };  // Extend FitResult interface
   }
   ```

2. Update `FitResult` interface in `src/types.ts` to include new coefficients

3. Modify `databaseProcessor.ts` to call new function and validate output:
   ```typescript
   const { a, b, c, d } = fitCubic(x, y);
   const generator = (t: number) => a + b*t + c*t*t + d*t*t*t;
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

| Issue | Cause | Solution |
|-------|-------|----------|
| Fit rejected (non-monotonic) | Noisy data with inversions | Increase `testMaxTimePct` or sample more races |
| Too many rejections | Strict validation | Lower `testMaxFailsPct` in config |
| XML export missing data | Empty classes/tracks in output | Check database normalization in debugger |
| `r3e-data.json` not found | Game database not generated | Run [r3e-adaptive-ai-primer](../r3e-adaptive-ai-primer) tool |

## Development Guidelines

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for AI agent onboarding, architecture deep-dives, and patterns specific to this codebase.
```
