# R3E Adaptive AI v2 - Copilot Instructions

## Project Overview
A React + TypeScript web application for analyzing and optimizing AI difficulty levels in **RaceRoom Racing Experience**. The tool processes lap time data (XML format), performs statistical fitting to predict AI performance across difficulty levels (80-120), and generates optimized XML configurations back to the game.

**Core Domain**: Game telemetry → Data fitting → Predictive modeling → Configuration export

## Architecture & Data Flow

### 1. **XML Import & Parsing** ([src/utils/xmlParser.ts](src/utils/xmlParser.ts))
- Parses RaceRoom's `aiadaptation.xml` using `fast-xml-parser`
- Handles dual-state XML structure (single entries as objects, multiple as arrays)
- Extracts:
  - **Player times**: Best lap times per track/class
  - **AI levels & lap times**: Sampled data for AI difficulty 80-120
  - **Sample counts**: Number of races sampled (0 = synthetically generated)

### 2. **Database Processing** ([src/utils/databaseProcessor.ts](src/utils/databaseProcessor.ts))
- Builds a `Database` object normalized by class/track
- **Critical algorithm**: Linear least-squares regression (`fitLinear()` in [src/utils/fitting.ts](src/utils/fitting.ts))
  - Predicts lap times for unmeasured AI levels using existing sampled data
  - Validates fit quality: rejects non-monotonic curves and deviations > `testMaxTimePct`
  - Uses `mathjs` for matrix operations (LU decomposition for numerical stability)

### 3. **UI Dashboard** ([src/components/AIDashboard.tsx](src/components/AIDashboard.tsx))
- Loads game database (`r3e-data.json`): class/track metadata
- File I/O: Import XML → Parse → Process → Render → Export XML
- Manages state: tracks/classes selection, AI fitting parameters, visualization

### 4. **XML Export** ([src/utils/xmlBuilder.ts](src/utils/xmlBuilder.ts))
- Reconstructs `aiadaptation.xml` from processed database
- Preserves all track/class combinations (even empty ones) in numerical ID order
- Critical detail: `numberOfSampledRaces = 0` indicates synthetically generated (fitted) data

## Key Technical Patterns

### Configuration-Driven Behavior
All fitting/prediction parameters live in [src/config.ts](src/config.ts):
```typescript
testMinAIdiffs: 2          // Min AI level spread required to fit
testMaxTimePct: 0.1        // Max deviation tolerance (10% of min time)
testMaxFailsPct: 0.1       // Max allowed failure rate for validation
aiNumLevels: 5             // UI: how many levels to apply around selection
```
**Pattern**: Modify config rather than hardcoding; no restart required for UI changes.

### Type Safety
- [src/types.ts](src/types.ts): Strict interfaces for XML structure, database format, assets
- Game database schema replicated: `RaceRoomClass`, `RaceRoomTrack`, `AITimeEntry`, etc.
- Use discriminated unions for parsed vs. processed data

### XML Quirk: Array/Object Duality
When XML has one entry, parsers return a single object; multiple entries return arrays. **Always use `toArray()` helper** before iteration to normalize.

### Numerical Precision
- Lap times: stored as floats with 4-decimal precision
- XML export: `formatNumber()` removes trailing zeros to match original formatting
- Fitting: Uses `mathjs` LU decomposition to avoid floating-point errors

## Build & Run

**Scripts** (from [package.json](package.json)):
- `npm run dev`: Start Vite dev server (http://localhost:5173)
- `npm run build`: TypeScript check + Vite bundle
- `npm run lint`: ESLint check
- `npm run preview`: Preview production build

**Dependencies**:
- **React 19** + React DOM
- **Vite 7** (build tool, handles JSX transformation)
- **fast-xml-parser**: Robust XML parsing for mixed array/object structures
- **mathjs**: Matrix algebra for regression fitting
- **TypeScript 5.9 + ESLint 9**: Type checking and linting

## Common Workflows

### Adding a New AI Fitting Algorithm
1. Implement fitting function in [src/utils/fitting.ts](src/utils/fitting.ts) (e.g., `fitQuadratic()`)
2. Update `FitResult` interface if coefficients change
3. Modify `databaseProcessor.ts` to call new function and validate output
4. Update config thresholds in [src/config.ts](src/config.ts) if needed

### Debugging Data Import Issues
1. Log XML parse output: check `parseAdaptive()` returns expected structure
2. Verify `toArray()` handles both single/multiple entries
3. Check `Database` normalization: classes → tracks → ailevels (keyed by AI level number)

### Extending UI
- New visualizations: add component in [src/components/](src/components/)
- State management: hooks-based, no Redux (keep simple for single-page app)
- Update [src/App.tsx](src/App.tsx) to integrate new component

## File Reference
- **Core logic**: [src/utils/](src/utils/) (parsing, fitting, building)
- **UI**: [src/components/AIDashboard.tsx](src/components/AIDashboard.tsx) (main controller)
- **Data model**: [src/types.ts](src/types.ts)
- **Game data**: [r3e-data.json](r3e-data.json) (track/class metadata, regenerated via primer tool)
- **Config**: [src/config.ts](src/config.ts) (all tunable parameters)

## Integration Notes
- Reads RaceRoom's `aiadaptation.xml` from user filesystem
- Writes modified XML back to same location
- Game data IDs: class/track IDs must match `r3e-data.json` (from [r3e-adaptive-ai-primer](../r3e-adaptive-ai-primer))
- No external API calls; fully local processing