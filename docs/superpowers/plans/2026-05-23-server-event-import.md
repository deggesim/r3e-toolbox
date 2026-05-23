# Server Event File Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add support for importing RaceRoom dedicated server event files (multi-player session JSON) into the Results Database, alongside the existing single-player file flow.

**Architecture:** New file `serverEventParser.ts` handles all server event parsing using arrow functions exclusively, reusing shared utilities exported from `raceResultParser.ts`. Four new type aliases are appended to `raceResults.ts`. The UI adds a server event input block inside Step 2 of `BuildResultsDatabase.tsx` as an explicit alternative to the single-player input.

**Tech Stack:** TypeScript (strict), React 18, Zustand, react-bootstrap, electron-vite. No traditional unit tests — use `npm run lint` + `npm run build` for type/lint checking, then QA agents for functional validation.

**Spec:** `docs/superpowers/specs/2026-05-23-leaderboard-import-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/renderer/types/raceResults.ts` | Modify (append) | Add `ServerEventLap`, `ServerEventPlayer`, `ServerEventSession`, `ServerEventResult` types |
| `src/renderer/utils/raceResultParser.ts` | Modify (export 4 functions) | Expose `buildTrackLookup`, `resolveClassInfo`, `resolveVehicleName`, `millisecondsToTime` |
| `src/renderer/utils/serverEventParser.ts` | **Create** | Parse server event JSON → `ParsedRace[]`; type guard; alias extractor |
| `src/renderer/pages/BuildResultsDatabase.tsx` | Modify | Add server event input section with handler and symmetric reset logic |

---

## Task 1: Add ServerEvent types to `raceResults.ts`

**Files:**
- Modify: `src/renderer/types/raceResults.ts` (append after the last line)

- [ ] **Step 1.1: Append the four type aliases at the end of the file**

Add exactly this block after the closing of `DEFAULT_POINTS_SYSTEM`:

```typescript
// ============================================================================
// Server Event Format Types (RaceRoom dedicated server multi-player session)
// ============================================================================

export type ServerEventLap = {
  Time: number;
  SectorTimes: number[];
  Valid: boolean;
  Position: number;
  PositionInClass: number;
  PitStopOccured: boolean;
};

export type ServerEventPlayer = {
  UserId: number;
  FullName: string;
  CarId: number;
  Car: string;
  Position: number;
  PositionInClass: number;
  BestLapTime: number;
  TotalTime: number;
  FinishStatus: string;
  RaceSessionLaps: ServerEventLap[];
};

export type ServerEventSession = {
  Type: "Practice" | "Qualify" | "Race";
  Players: ServerEventPlayer[];
};

export type ServerEventResult = {
  Server: string;
  StartTime: number;
  Track: string;
  TrackLayout: string;
  Sessions: ServerEventSession[];
};
```

- [ ] **Step 1.2: Verify lint and types**

```bash
npm run lint
```

Expected: no errors or warnings related to `raceResults.ts`.

- [ ] **Step 1.3: Commit**

```bash
git add src/renderer/types/raceResults.ts
git commit -m "feat: add ServerEvent types to raceResults"
```

---

## Task 2: Export shared utilities from `raceResultParser.ts`

**Files:**
- Modify: `src/renderer/utils/raceResultParser.ts`

The four functions are currently declared with `const` but not exported. Add `export` to each declaration. No logic changes.

- [ ] **Step 2.1: Export `millisecondsToTime` and `formatTime`**

Find (line ~14):
```typescript
const formatTime = (seconds: number): string => {
```
Change to:
```typescript
export const formatTime = (seconds: number): string => {
```

Find (line ~24):
```typescript
const millisecondsToTime = (ms: number): string => {
```
Change to:
```typescript
export const millisecondsToTime = (ms: number): string => {
```

- [ ] **Step 2.2: Export `resolveClassInfo` and `resolveVehicleName`**

Find (line ~63):
```typescript
const resolveClassInfo = (
```
Change to:
```typescript
export const resolveClassInfo = (
```

Find (line ~76):
```typescript
const resolveVehicleName = (
```
Change to:
```typescript
export const resolveVehicleName = (
```

- [ ] **Step 2.3: Export `buildTrackLookup`**

Find (line ~85):
```typescript
const buildTrackLookup = (
```
Change to:
```typescript
export const buildTrackLookup = (
```

- [ ] **Step 2.4: Verify lint and types**

```bash
npm run lint
```

Expected: no errors. The existing callers inside the same file are unaffected — adding `export` to a `const` declaration is backward-compatible.

- [ ] **Step 2.5: Commit**

```bash
git add src/renderer/utils/raceResultParser.ts
git commit -m "feat: export shared parser utilities for reuse"
```

---

## Task 3: Create `serverEventParser.ts`

**Files:**
- Create: `src/renderer/utils/serverEventParser.ts`

All functions use arrow function syntax. No `function` keyword anywhere.

- [ ] **Step 3.1: Create the file with imports and internal helpers**

Create `src/renderer/utils/serverEventParser.ts` with this content:

```typescript
import type { RaceRoomData } from "../types/gameData";
import type {
  ParsedRace,
  RaceSlot,
  ServerEventPlayer,
  ServerEventResult,
  ServerEventSession,
} from "../types/raceResults";
import {
  buildTrackLookup,
  millisecondsToTime,
  resolveClassInfo,
  resolveVehicleName,
} from "./raceResultParser";

export const isServerEventFormat = (json: unknown): json is ServerEventResult =>
  typeof json === "object" &&
  json !== null &&
  "Server" in json &&
  typeof (json as Record<string, unknown>).Server === "string" &&
  "Track" in json &&
  typeof (json as Record<string, unknown>).Track === "string" &&
  "Sessions" in json &&
  Array.isArray((json as Record<string, unknown>).Sessions);

export const extractServerEventAlias = (data: ServerEventResult): string =>
  data.Server;

const unixSecondsToTimestring = (unixSeconds: number): string => {
  const d = new Date(unixSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join("_");
};

const buildQualifyMap = (sessions: ServerEventSession[]): Map<number, string> => {
  const qualSession = sessions.find((s) => s.Type === "Qualify");
  const map = new Map<number, string>();
  if (!qualSession) return map;
  for (const player of qualSession.Players) {
    if (player.BestLapTime > 0) {
      map.set(player.UserId, millisecondsToTime(player.BestLapTime));
    }
  }
  return map;
};

const buildServerEventSlot = (
  player: ServerEventPlayer,
  qualMap: Map<number, string>,
  gameData: RaceRoomData,
): RaceSlot => {
  const { classId, className } = resolveClassInfo(player.CarId, gameData);
  const resolvedVehicleName = resolveVehicleName(player.CarId, gameData);
  const bestLap = player.BestLapTime > 0 ? millisecondsToTime(player.BestLapTime) : undefined;
  const totalTime = player.TotalTime > 0 ? millisecondsToTime(player.TotalTime) : undefined;
  return {
    driver: player.FullName,
    vehicle: resolvedVehicleName ?? player.Car,
    vehicleId: player.CarId,
    userId: player.UserId,
    className,
    classId,
    team: player.FullName,
    bestLap,
    totalTime,
    finishTime: totalTime,
    qualTime: qualMap.get(player.UserId),
    position: player.Position,
    finishStatus: player.FinishStatus,
    totalLaps: player.RaceSessionLaps.length,
  };
};

export const parseServerEventData = (
  data: ServerEventResult,
  gameData: RaceRoomData,
  ruleset = "default",
): ParsedRace[] | null => {
  const raceSession = data.Sessions.find((s) => s.Type === "Race");
  if (!raceSession) {
    console.warn("No Race session found in server event data");
    return null;
  }

  const { byName: trackLookup } = buildTrackLookup(gameData);
  const trackKey = `${data.Track} - ${data.TrackLayout}`.toLowerCase();
  const trackInfo = trackLookup.get(trackKey);

  if (!trackInfo) {
    console.warn(`Track not found in game data: "${data.Track} - ${data.TrackLayout}"`);
  }

  const timestring = unixSecondsToTimestring(data.StartTime);
  const qualMap = buildQualifyMap(data.Sessions);

  const slots: RaceSlot[] = raceSession.Players
    .toSorted((a, b) => a.Position - b.Position)
    .map((player) => buildServerEventSlot(player, qualMap, gameData));

  return [
    {
      trackname: trackInfo?.name ?? `${data.Track} - ${data.TrackLayout}`,
      trackid: trackInfo?.layoutId ?? 0,
      timestring,
      slots,
      ruleset,
    },
  ];
};
```

- [ ] **Step 3.2: Verify lint and types**

```bash
npm run lint
```

Expected: no errors. TypeScript should resolve all imports correctly since Task 1 and Task 2 are complete.

- [ ] **Step 3.3: Verify full build**

```bash
npm run build
```

Expected: build completes without TypeScript errors.

- [ ] **Step 3.4: Commit**

```bash
git add src/renderer/utils/serverEventParser.ts
git commit -m "feat: add serverEventParser for dedicated server result files"
```

---

## Task 4: Update `BuildResultsDatabase.tsx`

**Files:**
- Modify: `src/renderer/pages/BuildResultsDatabase.tsx`

Changes: new imports, new state + ref, new handler, modification to `onFilesSelected`, new UI section inside Step 2.

- [ ] **Step 4.1: Add imports**

At the top of the file, after the existing import from `"../utils/raceResultParser"`, add:

```typescript
import {
  extractServerEventAlias,
  isServerEventFormat,
  parseServerEventData,
} from "../utils/serverEventParser";
```

- [ ] **Step 4.2: Add state and ref inside the component**

After the line `const resultsInputRef = useRef<HTMLInputElement>(null);`, add:

```typescript
const serverEventInputRef = useRef<HTMLInputElement>(null);
const [serverEventFile, setServerEventFile] = useState<File | null>(null);
```

- [ ] **Step 4.3: Add `onServerEventFileSelected` handler**

Add after the closing brace of `onFilesSelected`:

```typescript
const onServerEventFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0] ?? null;
  setServerEventFile(file);

  // Reset single-player input symmetrically
  setResultFiles([]);
  if (resultsInputRef.current) {
    resultsInputRef.current.value = "";
  }

  if (!file || !gameData) {
    setParsedRaces([]);
    return;
  }

  setIsParsingRaces(true);
  try {
    const text = await file.text();
    const json: unknown = JSON.parse(text);

    if (!isServerEventFormat(json)) {
      addLog("warning", `File is not a valid server event format: ${file.name}`, faXmark);
      setParsedRaces([]);
      return;
    }

    setChampionshipAlias(extractServerEventAlias(json));
    const races = parseServerEventData(json, gameData);
    setParsedRaces(races ?? []);

    if (!races || races.length === 0) {
      addLog("warning", `No Race session found in ${file.name}`, faXmark);
    }
  } catch {
    addLog("error", `Failed to parse server event file: ${file.name}`, faXmark);
    setParsedRaces([]);
  } finally {
    setIsParsingRaces(false);
  }
};
```

- [ ] **Step 4.4: Reset server event state inside `onFilesSelected`**

Inside `onFilesSelected`, after `setResultFiles(files);`, add:

```typescript
setServerEventFile(null);
if (serverEventInputRef.current) {
  serverEventInputRef.current.value = "";
}
```

- [ ] **Step 4.5: Add server event UI section inside Step 2**

Inside the left `<Col lg={6}>`, after the closing `</Alert>` that shows `resultsSummary` and before the `<div className="mt-3">` that contains the restore-from-backup input, insert:

```tsx
<div className="text-center text-white-50 my-3">
  <small>── or ──</small>
</div>
<Form.Group controlId="serverEventFile" className="mb-3">
  <Form.Label className="text-white">
    Server event file
  </Form.Label>
  <Form.Control
    type="file"
    accept=".txt,.json"
    ref={serverEventInputRef}
    onChange={onServerEventFileSelected}
  />
  <Form.Text className="text-white-50">
    Select a RaceRoom dedicated server event file (e.g. 202604170943.txt).
    Imports Race result and Qualify times automatically.
  </Form.Text>
</Form.Group>
{serverEventFile && (
  <Alert variant="secondary" className="py-2 mb-3">
    {serverEventFile.name}
    {parsedRaces.length > 0 && (
      <div className="mt-2">
        <Badge bg="success" className="me-2">
          {parsedRaces.length} race
          {parsedRaces.length > 1 ? "s" : ""} parsed
        </Badge>
        {isParsingRaces && (
          <Spinner animation="border" size="sm" className="ms-2" />
        )}
      </div>
    )}
  </Alert>
)}
```

- [ ] **Step 4.6: Verify lint and types**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4.7: Verify full build**

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 4.8: Commit**

```bash
git add src/renderer/pages/BuildResultsDatabase.tsx
git commit -m "feat: add server event file input to BuildResultsDatabase"
```

---

## Task 5: QA Validation

- [ ] **Step 5.1: Run parser resilience agent**

```bash
npm run agent:parser-resilience
```

Expected: agent completes without critical failures. Check `.agent-reports/` for the JSON report.

- [ ] **Step 5.2: Run UI regression agent**

```bash
npm run agent:ui-regression
```

Expected: agent completes without regressions in the BuildResultsDatabase page or other pages.

- [ ] **Step 5.3: Manual smoke test**

Run the dev server:
```bash
npm run dev
```

1. Navigate to **Build Results Database**
2. In Step 2, verify the `── or ──` divider and "Server event file" input appear
3. Load `202604170943.txt` (the example file in the repo root)
4. Verify:
   - Championship alias auto-fills with `"SIM RACING BELGIUM / RRN / TATUUS F4"`
   - Badge shows "1 race parsed"
   - Single-player file input is cleared
5. Enter a championship alias and click "Create or update championship"
6. Navigate to **Results Database** and open the new championship
7. Verify:
   - Drivers appear with correct names, cars, positions
   - Best lap times are populated
   - Qualifying times are populated in the Qualification table

- [ ] **Step 5.4: Final commit (if any fixes applied during smoke test)**

```bash
git add -p
git commit -m "fix: <describe fix>"
```
