# Results Database — Batch Import, Custom Points & Penalties — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a league admin import multiple dedicated-server event files at once, define a per-championship points system, and apply time/points penalties — reflected consistently on screen, in exported HTML, and in viewer stats.

**Architecture:** Add optional fields to the existing persisted model (`ChampionshipEntry.pointsSystem`, `RaceSlot.timePenaltySeconds`, `RaceSlot.pointsPenalty`). Make positions penalty-aware by changing the single sort helper `getSortedRaceSlots`. Consolidate the triplicated standings math into shared pure builders in `standingsCalculator.ts`, consumed by both the Detail page and the HTML generator. Add an Edit mode to the Detail page that mutates a draft and persists via the existing Zustand store. Make the server-event file input multi-select.

**Tech Stack:** React 19 + react-bootstrap, Zustand (persist via electron-store/localStorage), TypeScript strict, Vite/electron-vite. No new dependencies.

## Global Constraints

- TypeScript strict mode. Prefer `type`/`interface` already used in the file; **arrow functions only** (no `function` keyword); **named exports**; relative imports, no path aliases.
- React-bootstrap components for UI (no raw Bootstrap HTML when a component exists). Dark theme only: use existing CSS vars / classes; add dark overrides in the relevant `.css` for any new Bootstrap surface.
- Font Awesome: import icons individually from `@fortawesome/free-solid-svg-icons/<iconName>`.
- All new model fields are **optional** — existing persisted championships and backup JSON must load unchanged.
- **Commits require explicit user confirmation** (project rule: never commit automatically). Each task lists a commit step; ask the user before running it.
- No unit-test framework exists (project uses AI QA agents). Per-task verification = `npm run lint` + `npm run build` (full TS typecheck + bundle), plus the noted agent/manual checks. Conventional-commit messages.
- Points system default everywhere: `[25, 18, 15, 12, 10, 8, 6, 4, 2, 1]` (= `DEFAULT_POINTS_SYSTEM.default` in `types/raceResults.ts`).

## File Structure

- `src/renderer/types/raceResults.ts` — new optional model fields + `resolvePointsSystem`.
- `src/renderer/utils/humanPlayerUtils.ts` — effective-time sort (time penalties).
- `src/renderer/utils/standingsCalculator.ts` — shared `buildDriverStandings`/`buildTeamStandings`/`buildVehicleStandings` + standing types; penalty-aware `calculateChampionshipStandings`.
- `src/renderer/utils/htmlGenerator.ts` — consume shared builders; `pointsSystem` param; drop inline sorts.
- `src/renderer/utils/archiveExporter.ts` — pass `pointsSystem` to the generator.
- `src/renderer/pages/ResultsDatabaseDetail.tsx` (+ `.css`) — consume builders (read-only), then Edit mode + editor.
- `src/renderer/pages/ResultsDatabaseViewer.tsx` — `pointsSystem` in "Championships Won" stat.
- `src/renderer/pages/BuildResultsDatabase.tsx` — multi-file server-event import.
- `docs` / `Help.tsx` — document the new features.

---

### Task 1: Data model + points resolver

**Files:**
- Modify: `src/renderer/types/raceResults.ts`

**Interfaces:**
- Consumes: existing `DEFAULT_POINTS_SYSTEM`, `ChampionshipEntry`, `RaceSlot`.
- Produces:
  - `ChampionshipEntry.pointsSystem?: number[]`
  - `RaceSlot.timePenaltySeconds?: number`
  - `RaceSlot.pointsPenalty?: number`
  - `resolvePointsSystem(champ: ChampionshipEntry): number[]`

- [ ] **Step 1: Add the optional fields**

In `RaceSlot` (after `totalLaps?: number;`):

```ts
  /** Time penalty in seconds added to the driver's race time for sorting/positions. */
  timePenaltySeconds?: number;
  /** Championship points deducted for this driver in this race. */
  pointsPenalty?: number;
```

In `ChampionshipEntry` (after `raceData?: ParsedRace[];`):

```ts
  /** Custom championship points system; when absent the default F1 system is used. */
  pointsSystem?: number[];
```

- [ ] **Step 2: Add the resolver** (after the `DEFAULT_POINTS_SYSTEM` declaration)

```ts
/**
 * Resolves the active points array for a championship,
 * falling back to the default F1 system when none is configured.
 */
export const resolvePointsSystem = (champ: ChampionshipEntry): number[] =>
  champ.pointsSystem && champ.pointsSystem.length > 0
    ? champ.pointsSystem
    : DEFAULT_POINTS_SYSTEM.default;
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: PASS (no type errors; new optional fields compile).

- [ ] **Step 4: Commit** (after user confirmation)

```bash
git add src/renderer/types/raceResults.ts
git commit -m "feat(results): add points-system and penalty fields to model"
```

---

### Task 2: Effective-time sorting (time penalties)

**Files:**
- Modify: `src/renderer/utils/humanPlayerUtils.ts`

**Interfaces:**
- Consumes: `parseTime` (from `./timeUtils`), `RaceSlot.timePenaltySeconds` (Task 1).
- Produces: `getSortedRaceSlots` now orders by effective time (base + `timePenaltySeconds`).

- [ ] **Step 1: Apply the penalty inside the comparator**

Replace the time-parsing lines in `getSortedRaceSlots`:

```ts
    // Parse lap times: returns undefined for invalid/missing times
    const timeA = parseTime(a.totalTime || a.finishTime);
    const timeB = parseTime(b.totalTime || b.finishTime);
```

with:

```ts
    // Parse lap times: returns undefined for invalid/missing times.
    // Time penalties are added to the base time so positions re-order accordingly.
    const baseA = parseTime(a.totalTime || a.finishTime);
    const baseB = parseTime(b.totalTime || b.finishTime);
    const timeA = baseA === undefined ? undefined : baseA + (a.timePenaltySeconds ?? 0);
    const timeB = baseB === undefined ? undefined : baseB + (b.timePenaltySeconds ?? 0);
```

The rest of the comparator (validity, laps comparison, `(timeA ?? 0) - (timeB ?? 0)`) is unchanged.

`// ponytail: penalty only re-orders within the same lap count; dropping a driver below a lapped car is not modelled.`

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit** (after user confirmation)

```bash
git add src/renderer/utils/humanPlayerUtils.ts
git commit -m "feat(results): apply time penalties when sorting race slots"
```

---

### Task 3: Shared standings builders

**Files:**
- Modify: `src/renderer/utils/standingsCalculator.ts`

**Interfaces:**
- Consumes: `ParsedRace`, `RaceSlot` (`types/raceResults`), `getSortedRaceSlots` + `getHumanDriverName` (`humanPlayerUtils`).
- Produces (all exported):
  - `interface DriverStanding { position: number; driver: string; vehicle: string; vehicleId?: number; isHuman: boolean; team: string; points: number; raceResults: (number | null)[]; racePoints: (number | null)[]; }`
  - `interface TeamStanding { position: number; team: string; entries: number; points: number; racePoints: (number | null)[]; }`
  - `interface VehicleStanding { position: number; vehicle: string; vehicleId?: number; entries: number; points: number; racePoints: (number | null)[]; }`
  - `buildDriverStandings(races: ParsedRace[], pointsSystem: number[]): DriverStanding[]`
  - `buildTeamStandings(races: ParsedRace[], pointsSystem: number[]): TeamStanding[]`
  - `buildVehicleStandings(races: ParsedRace[], pointsSystem: number[]): VehicleStanding[]`
  - `calculateChampionshipStandings` updated to subtract points penalties.

- [ ] **Step 1: Import the helpers and add shared position/points utilities**

At the top, extend the existing import from `./humanPlayerUtils`:

```ts
import { getHumanDriverName, getSortedRaceSlots } from "./humanPlayerUtils";
```

Add these helpers (arrow functions) below the imports:

```ts
/** Race position for a driver (1-based), or null if they did not finish. */
const racePositionOf = (race: ParsedRace, driver: string): number | null => {
  const sorted = getSortedRaceSlots(race.slots);
  const index = sorted.findIndex((s) => s.driver === driver);
  return index >= 0 && (sorted[index].totalTime || sorted[index].finishTime)
    ? index + 1
    : null;
};

/** Net points for a slot in a race: position points minus this slot's points penalty. */
const netRacePoints = (
  slot: RaceSlot | undefined,
  position: number | null,
  pointsSystem: number[],
): number | null => {
  const base =
    position !== null && position <= pointsSystem.length
      ? pointsSystem[position - 1]
      : 0;
  const penalty = slot?.pointsPenalty ?? 0;
  if (base === 0 && penalty === 0) return null;
  return base - penalty;
};
```

- [ ] **Step 2: Add `buildDriverStandings`**

```ts
export interface DriverStanding {
  position: number;
  driver: string;
  vehicle: string;
  vehicleId?: number;
  isHuman: boolean;
  team: string;
  points: number;
  raceResults: (number | null)[];
  racePoints: (number | null)[];
}

export const buildDriverStandings = (
  races: ParsedRace[],
  pointsSystem: number[],
): DriverStanding[] => {
  const humanNames = new Set<string>();
  for (const race of races) {
    const human = getHumanDriverName(race);
    if (human) humanNames.add(human);
  }

  const info = new Map<
    string,
    {
      vehicle: string;
      vehicleId?: number;
      team: string;
      raceResults: (number | null)[];
      racePoints: (number | null)[];
    }
  >();

  for (const race of races) {
    for (const slot of race.slots) {
      if (!info.has(slot.driver)) {
        info.set(slot.driver, {
          vehicle: slot.vehicle,
          vehicleId: slot.vehicleId,
          team: slot.team,
          raceResults: [],
          racePoints: [],
        });
      }
    }
  }

  races.forEach((race, raceIdx) => {
    info.forEach((data, driver) => {
      const slot = race.slots.find((s) => s.driver === driver);
      const position = racePositionOf(race, driver);
      data.raceResults[raceIdx] = position;
      data.racePoints[raceIdx] = netRacePoints(slot, position, pointsSystem);
    });
  });

  const standings: DriverStanding[] = [];
  info.forEach((data, driver) => {
    standings.push({
      position: 0,
      driver,
      vehicle: data.vehicle,
      vehicleId: data.vehicleId,
      team: data.team,
      isHuman: humanNames.has(driver),
      points: data.racePoints.reduce<number>((sum, p) => sum + (p || 0), 0),
      raceResults: data.raceResults,
      racePoints: data.racePoints,
    });
  });

  const sorted = sortByPointsAndCountback(
    standings.map((s) => ({ ...s, positions: numericPositions(s.raceResults) })),
    pointsSystem.length,
  );
  sorted.forEach((s, i) => (s.position = i + 1));
  return sorted.map(({ positions: _omit, ...rest }) => rest);
};
```

Add this small helper near the other helpers (countback works on a flat `positions` array):

```ts
const numericPositions = (raceResults: (number | null)[]): number[] =>
  raceResults.filter((p): p is number => p !== null);
```

> `sortByPointsAndCountback` already exists in this file and sorts by `points` then by position counts; it requires a `positions: number[]` field, hence the temporary mapping above.

- [ ] **Step 3: Add `buildTeamStandings` and `buildVehicleStandings`**

```ts
export interface TeamStanding {
  position: number;
  team: string;
  entries: number;
  points: number;
  racePoints: (number | null)[];
}

export const buildTeamStandings = (
  races: ParsedRace[],
  pointsSystem: number[],
): TeamStanding[] => {
  const map = new Map<
    string,
    { entries: Set<string>; racePoints: (number | null)[] }
  >();

  races.forEach((race, raceIdx) => {
    const perTeam = new Map<string, number>();
    for (const slot of race.slots) {
      const team = slot.team || "No Team";
      if (!map.has(team)) map.set(team, { entries: new Set(), racePoints: [] });
      map.get(team)!.entries.add(slot.driver);

      const position = racePositionOf(race, slot.driver);
      const net = netRacePoints(slot, position, pointsSystem);
      if (net !== null) perTeam.set(team, (perTeam.get(team) || 0) + net);
    }
    map.forEach((data, team) => {
      data.racePoints[raceIdx] = perTeam.has(team) ? perTeam.get(team)! : null;
    });
  });

  const standings: TeamStanding[] = [];
  map.forEach((data, team) => {
    standings.push({
      position: 0,
      team,
      entries: data.entries.size,
      points: data.racePoints.reduce<number>((sum, p) => sum + (p || 0), 0),
      racePoints: data.racePoints,
    });
  });

  standings.sort((a, b) => b.points - a.points);
  standings.forEach((s, i) => (s.position = i + 1));
  return standings;
};

export interface VehicleStanding {
  position: number;
  vehicle: string;
  vehicleId?: number;
  entries: number;
  points: number;
  racePoints: (number | null)[];
}

export const buildVehicleStandings = (
  races: ParsedRace[],
  pointsSystem: number[],
): VehicleStanding[] => {
  const map = new Map<
    string,
    { vehicleId?: number; entries: Set<string>; racePoints: (number | null)[] }
  >();

  races.forEach((race, raceIdx) => {
    const perVehicle = new Map<string, number>();
    for (const slot of race.slots) {
      const vehicle = slot.vehicle;
      if (!map.has(vehicle)) {
        map.set(vehicle, {
          vehicleId: slot.vehicleId,
          entries: new Set(),
          racePoints: [],
        });
      }
      map.get(vehicle)!.entries.add(slot.driver);

      const position = racePositionOf(race, slot.driver);
      const net = netRacePoints(slot, position, pointsSystem);
      if (net !== null) perVehicle.set(vehicle, (perVehicle.get(vehicle) || 0) + net);
    }
    map.forEach((data, vehicle) => {
      data.racePoints[raceIdx] = perVehicle.has(vehicle)
        ? perVehicle.get(vehicle)!
        : null;
    });
  });

  const standings: VehicleStanding[] = [];
  map.forEach((data, vehicle) => {
    standings.push({
      position: 0,
      vehicle,
      vehicleId: data.vehicleId,
      entries: data.entries.size,
      points: data.racePoints.reduce<number>((sum, p) => sum + (p || 0), 0),
      racePoints: data.racePoints,
    });
  });

  standings.sort((a, b) => b.points - a.points);
  standings.forEach((s, i) => (s.position = i + 1));
  return standings;
};
```

- [ ] **Step 4: Make `calculateChampionshipStandings` penalty-aware**

Inside its per-slot loop, replace the points line so penalties are subtracted:

```ts
    sortedSlots.forEach((slot, idx) => {
      const position = idx + 1;
      const base =
        position <= pointsSystem.length ? pointsSystem[position - 1] : 0;
      const points = base - (slot.pointsPenalty ?? 0);

      if (!driverPoints.has(slot.driver)) {
        driverPoints.set(slot.driver, { points: 0, positions: [] });
      }
      const driverData = driverPoints.get(slot.driver)!;
      driverData.points += points;
      driverData.positions.push(position);
    });
```

(`getSortedRaceSlots` already applies time penalties from Task 2.)

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit** (after user confirmation)

```bash
git add src/renderer/utils/standingsCalculator.ts
git commit -m "feat(results): add shared penalty-aware standings builders"
```

---

### Task 4: HTML generator consumes builders + points system

**Files:**
- Modify: `src/renderer/utils/htmlGenerator.ts`
- Modify: `src/renderer/utils/archiveExporter.ts`
- Modify: `src/renderer/pages/ResultsDatabaseViewer.tsx` (download call only)
- Modify: `src/renderer/pages/ResultsDatabaseDetail.tsx` (download call only)

**Interfaces:**
- Consumes: `buildDriverStandings`/`buildTeamStandings`/`buildVehicleStandings` + standing types (Task 3), `getSortedRaceSlots` (Task 2), `resolvePointsSystem` (Task 1).
- Produces: `generateStandingsHTML(races, championshipName, leaderboardAssets?, gameData?, assetMap?, pointsSystem?)` — new optional 6th param (defaults to `DEFAULT_POINTS_SYSTEM.default`).

- [ ] **Step 1: Replace duplicated math with shared builders**

In `htmlGenerator.ts`, delete the local `DriverStanding`/`TeamStanding`/`VehicleStanding` interfaces and the local `calculateDriverStandings`/`calculateTeamStandings`/`calculateVehicleStandings` and the local `const DEFAULT_POINTS_SYSTEM`. Add imports:

```ts
import { DEFAULT_POINTS_SYSTEM } from "../types/raceResults";
import {
  buildDriverStandings,
  buildTeamStandings,
  buildVehicleStandings,
} from "./standingsCalculator";
import { getSortedRaceSlots } from "./humanPlayerUtils";
```

- [ ] **Step 2: Add the `pointsSystem` parameter and use the builders**

Change the signature:

```ts
export const generateStandingsHTML = (
  races: ParsedRace[],
  championshipName: string,
  leaderboardAssets?: {
    cars: Record<string, string>;
    tracks: Record<string, string>;
    carNames?: Record<string, string>;
  },
  gameData?: RaceRoomData | null,
  assetMap?: Map<string, string>,
  pointsSystem: number[] = DEFAULT_POINTS_SYSTEM.default,
): string => {
```

Replace the three local calls with:

```ts
  const driverStandings = buildDriverStandings(races, pointsSystem);
  const teamStandings = buildTeamStandings(races, pointsSystem);
  const vehicleStandings = buildVehicleStandings(races, pointsSystem);
```

- [ ] **Step 3: Use penalty-aware sort for the Race Results table**

Replace the `sortedRaceSlots` block (the inline `.sort(...)` comparator) with:

```ts
  // Pre-sort race slots once per race for the results table (penalty-aware).
  const sortedRaceSlots = races.map((race) => getSortedRaceSlots(race.slots));
```

(`calculateGapFromWinner` and the rest stay; `parseTime` is still used by `calculateGapFromWinner`/`formatTimeDiff` so keep it.)

- [ ] **Step 4: Thread `pointsSystem` through the three call sites**

`archiveExporter.ts` — `generateChampionshipHTML` already has `championship`; pass its points:

```ts
  return generateStandingsHTML(
    championship.raceData,
    championship.alias,
    leaderboardAssets,
    gameData,
    assetMap,
    championship.pointsSystem,
  );
```

`ResultsDatabaseViewer.tsx` (in `handleDownloadChampionship`, the `generateStandingsHTML(races, championship.alias, assetsForHTML, gameData)` call) → add the resolver. Add import `import { resolvePointsSystem } from "../types/raceResults";` and:

```ts
    const html = generateStandingsHTML(
      races,
      championship.alias,
      assetsForHTML,
      gameData,
      undefined,
      resolvePointsSystem(championship),
    );
```

`ResultsDatabaseDetail.tsx` (in `handleDownloadHTML`) → add import `resolvePointsSystem` from `../types/raceResults` and:

```ts
    const html = generateStandingsHTML(
      championship.raceData!,
      championship.alias,
      leaderboardAssetsForExport,
      undefined,
      undefined,
      resolvePointsSystem(championship),
    );
```

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run build`
Expected: PASS (no unused symbols left in `htmlGenerator.ts`; all 3 callers compile).

- [ ] **Step 6: Commit** (after user confirmation)

```bash
git add src/renderer/utils/htmlGenerator.ts src/renderer/utils/archiveExporter.ts src/renderer/pages/ResultsDatabaseViewer.tsx src/renderer/pages/ResultsDatabaseDetail.tsx
git commit -m "feat(results): exported HTML uses shared standings + custom points"
```

---

### Task 5: Detail page consumes builders (read-only)

**Files:**
- Modify: `src/renderer/pages/ResultsDatabaseDetail.tsx`
- Modify: `src/renderer/pages/ResultsDatabaseDetail.css`

**Interfaces:**
- Consumes: `buildDriverStandings`/`buildTeamStandings`/`buildVehicleStandings` (Task 3), `resolvePointsSystem` (Task 1).
- Produces: on-screen standings now reflect the championship's points system, time penalties, and points penalties.

- [ ] **Step 1: Replace local standings math with the builders**

Delete the local `DriverStanding`/`TeamStanding`/`VehicleStanding` interfaces, the local `const DEFAULT_POINTS_SYSTEM`, and the local `calculateDriverStandings`/`calculateTeamStandings`/`calculateVehicleStandings`/`getRacePosition` functions. Add imports:

```ts
import { resolvePointsSystem } from "../types/raceResults";
import {
  buildDriverStandings,
  buildTeamStandings,
  buildVehicleStandings,
} from "../utils/standingsCalculator";
```

(Keep `getSortedRaceSlots` import — still used by the Race Results table. Keep `parseTime`, `makeTime`, `formatTimeDiff`, `calculateGapFromWinner`, and the best-lap/qual helpers.)

- [ ] **Step 2: Compute standings from the championship's points system**

In the `(() => { ... })()` block that builds `driverStandings`/`teamStandings`/`vehicleStandings`, after the chronological `races` sort, replace those three lines with:

```ts
    const pointsSystem = resolvePointsSystem(championship);
    return {
      driverStandings: buildDriverStandings(races, pointsSystem),
      teamStandings: buildTeamStandings(races, pointsSystem),
      vehicleStandings: buildVehicleStandings(races, pointsSystem),
      bestLapTimes: getBestLapTimesPerRace(races),
      bestQualTimes: getBestQualifyingTimesPerRace(races),
      raceHeaders: races.map((r) => ({
        name: r.trackname || "Unknown Track",
        time: r.timestring || "",
      })),
    };
```

(The early-return empty branch stays as-is.)

- [ ] **Step 3: Mark penalized points cells**

In the driver row render, the per-race Pts cell currently is `<td className="points-cell">{pts ?? "-"}</td>`. Find the matching driver slot to detect a penalty and add a class + tooltip:

```tsx
                  {raceHeaders.map((_, idx) => {
                    const pts = standing.racePoints[idx];
                    const result = standing.raceResults[idx];
                    const penalty =
                      championship.raceData?.[idx]?.slots?.find(
                        (s) => s.driver === standing.driver,
                      )?.pointsPenalty ?? 0;
                    const posClass =
                      result !== null && result <= 3
                        ? getPositionClass(result)
                        : "";
                    return (
                      <Fragment key={`race-${standing.driver}-${idx}`}>
                        <td
                          className={`points-cell${penalty > 0 ? " penalized" : ""}`}
                          title={penalty > 0 ? `Points penalty: -${penalty}` : undefined}
                        >
                          {pts ?? "-"}
                        </td>
                        <td className={posClass}>{result ?? "-"}</td>
                      </Fragment>
                    );
                  })}
```

> NOTE: `championship.raceData` is in source order, while `raceHeaders`/standings use the chronologically sorted `races`. To keep the penalty lookup correct, lift the sorted `races` array out of the IIFE (e.g. return it too, or compute the sorted array once at component scope) and index penalties from the **sorted** array, not `championship.raceData`. Implement by returning `races` from the IIFE and using `races[idx].slots.find(...)`.

- [ ] **Step 4: Add the `penalized` style**

In `ResultsDatabaseDetail.css`, add a dark-theme marker:

```css
.results-table td.points-cell.penalized {
  color: #e74c3c;
}
.results-table td.points-cell.penalized::after {
  content: " *";
}
```

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run build`
Expected: PASS. Manual: open an existing championship with no penalties → standings identical to before (default points system).

- [ ] **Step 6: Commit** (after user confirmation)

```bash
git add src/renderer/pages/ResultsDatabaseDetail.tsx src/renderer/pages/ResultsDatabaseDetail.css
git commit -m "feat(results): detail standings use shared builders and show penalties"
```

---

### Task 6: Detail page edit mode + editor

**Files:**
- Modify: `src/renderer/pages/ResultsDatabaseDetail.tsx`
- Modify: `src/renderer/pages/ResultsDatabaseDetail.css`

**Interfaces:**
- Consumes: `useChampionshipStore().addOrUpdate`, `resolvePointsSystem`, `getSortedRaceSlots`, the sorted `races` array.
- Produces: an Edit toggle that edits a draft (`pointsSystem` + per-slot `timePenaltySeconds`/`pointsPenalty`) and persists via `addOrUpdate`.

- [ ] **Step 1: Add edit state and a points-system parser**

Add imports:

```ts
import { useState } from "react";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons/faPenToSquare";
import { faFloppyDisk } from "@fortawesome/free-solid-svg-icons/faFloppyDisk";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons/faRotateLeft";
import { Button, Form } from "react-bootstrap";
```

Inside the component, add:

```ts
  const addOrUpdate = useChampionshipStore((state) => state.addOrUpdate);
  const [isEditing, setIsEditing] = useState(false);
  // Draft of the chronologically-sorted races + points input string.
  const [draftRaces, setDraftRaces] = useState<ParsedRace[] | null>(null);
  const [pointsInput, setPointsInput] = useState("");

  const parsePointsInput = (input: string): number[] | null => {
    const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    const nums = parts.map(Number);
    return nums.some((n) => !Number.isFinite(n) || n < 0) ? null : nums;
  };
```

- [ ] **Step 2: Drive standings from the draft while editing**

Where Task 5 computed `const races = [...championship.raceData].sort(...)`, use the draft when editing:

```ts
    const sortedSource = [...championship.raceData].sort((a, b) => {
      const timeA = parseTimestring(a.timestring);
      const timeB = parseTimestring(b.timestring);
      return !Number.isNaN(timeA) && !Number.isNaN(timeB) ? timeA - timeB : 0;
    });
    const races = isEditing && draftRaces ? draftRaces : sortedSource;
```

And resolve the points system from the draft input while editing:

```ts
    const pointsSystem =
      isEditing && parsePointsInput(pointsInput)
        ? parsePointsInput(pointsInput)!
        : resolvePointsSystem(championship);
```

- [ ] **Step 3: Enter/save/cancel handlers**

```ts
  const startEditing = () => {
    const sorted = [...(championship.raceData ?? [])].sort((a, b) => {
      const ta = parseTimestring(a.timestring);
      const tb = parseTimestring(b.timestring);
      return !Number.isNaN(ta) && !Number.isNaN(tb) ? ta - tb : 0;
    });
    setDraftRaces(structuredClone(sorted));
    setPointsInput(resolvePointsSystem(championship).join(", "));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraftRaces(null);
  };

  const saveEditing = () => {
    if (!draftRaces) return;
    const parsed = parsePointsInput(pointsInput);
    addOrUpdate({
      ...championship,
      raceData: draftRaces,
      races: draftRaces.length,
      pointsSystem: parsed ?? undefined,
    });
    setIsEditing(false);
    setDraftRaces(null);
  };

  const updateSlotPenalty = (
    raceIdx: number,
    driver: string,
    field: "timePenaltySeconds" | "pointsPenalty",
    value: number | undefined,
  ) => {
    setDraftRaces((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const slot = next[raceIdx].slots.find((s) => s.driver === driver);
      if (slot) slot[field] = value;
      return next;
    });
  };
```

- [ ] **Step 4: Edit toggle + Save/Cancel buttons in the header**

Next to the existing Download button in `.results-header`:

```tsx
          {!isEditing ? (
            <Button variant="outline-light" size="sm" className="ms-2" onClick={startEditing}>
              <FontAwesomeIcon icon={faPenToSquare} className="me-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="success" size="sm" className="ms-2" onClick={saveEditing}>
                <FontAwesomeIcon icon={faFloppyDisk} className="me-2" />
                Save
              </Button>
              <Button variant="outline-secondary" size="sm" className="ms-2" onClick={cancelEditing}>
                <FontAwesomeIcon icon={faRotateLeft} className="me-2" />
                Cancel
              </Button>
            </>
          )}
```

- [ ] **Step 5: Editor panel (points system + per-race penalties)**

Render only when `isEditing`, after the header and before the Driver Standings table:

```tsx
      {isEditing && draftRaces && (
        <div className="results-table-wrapper p-3">
          <Form.Group className="mb-3" controlId="pointsSystemInput">
            <Form.Label className="text-white">Championship points system</Form.Label>
            <Form.Control
              type="text"
              value={pointsInput}
              isInvalid={parsePointsInput(pointsInput) === null}
              onChange={(e) => setPointsInput(e.target.value)}
              placeholder="25, 18, 15, 12, 10, 8, 6, 4, 2, 1"
            />
            <div className="mt-2 d-flex gap-2 flex-wrap">
              <Button size="sm" variant="outline-light"
                onClick={() => setPointsInput(DEFAULT_POINTS_SYSTEM.default.join(", "))}>
                F1
              </Button>
              <Button size="sm" variant="outline-light"
                onClick={() => setPointsInput(DEFAULT_POINTS_SYSTEM.dtm2023.join(", "))}>
                DTM
              </Button>
            </div>
          </Form.Group>

          {draftRaces.map((race, raceIdx) => (
            <div key={`edit-race-${raceIdx}`} className="mb-3">
              <h6 className="text-white">{race.trackname}</h6>
              <table className="results-table">
                <thead>
                  <tr><th>Driver</th><th>Time penalty (s)</th><th>Points penalty</th></tr>
                </thead>
                <tbody>
                  {getSortedRaceSlots(race.slots).map((slot) => (
                    <tr key={`edit-${raceIdx}-${slot.driver}`}>
                      <td className="driver-name-cell">{slot.driver}</td>
                      <td>
                        <Form.Control type="number" min={0} size="sm"
                          value={slot.timePenaltySeconds ?? ""}
                          onChange={(e) =>
                            updateSlotPenalty(raceIdx, slot.driver, "timePenaltySeconds",
                              e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)))
                          } />
                      </td>
                      <td>
                        <Form.Control type="number" min={0} size="sm"
                          value={slot.pointsPenalty ?? ""}
                          onChange={(e) =>
                            updateSlotPenalty(raceIdx, slot.driver, "pointsPenalty",
                              e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)))
                          } />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
```

Add import for `DEFAULT_POINTS_SYSTEM` from `../types/raceResults` (alongside `resolvePointsSystem`).

- [ ] **Step 6: Add dark-theme overrides for the editor inputs**

In `ResultsDatabaseDetail.css`:

```css
.results-table-wrapper .form-control {
  background: var(--bg2, #141a33);
  color: var(--text, #f7f8ff);
  border-color: var(--border, #1f2747);
}
.results-table-wrapper .form-control:focus {
  background: var(--bg2, #141a33);
  color: var(--text, #f7f8ff);
}
```

- [ ] **Step 7: Verify**

Run: `npm run lint && npm run build`
Expected: PASS. Manual: Edit → add a 30s time penalty to the winner → on Save, positions/points update; reopen the page → values persisted; export HTML reflects the change.

- [ ] **Step 8: Commit** (after user confirmation)

```bash
git add src/renderer/pages/ResultsDatabaseDetail.tsx src/renderer/pages/ResultsDatabaseDetail.css
git commit -m "feat(results): edit mode for points system and per-race penalties"
```

---

### Task 7: Batch server-event import

**Files:**
- Modify: `src/renderer/pages/BuildResultsDatabase.tsx`

**Interfaces:**
- Consumes: `parseServerEventData`, `isServerEventFormat`, `extractServerEventAlias`.
- Produces: multi-file server-event import into `parsedRaces`.

- [ ] **Step 1: Allow multiple files in the input**

Add `multiple` to the server-event `<Form.Control type="file">` and change its label/help text to mention multiple files. Change the `serverEventFile` state to a list:

```ts
  const [serverEventFiles, setServerEventFiles] = useState<File[]>([]);
```

Update the existing `setServerEventFile(null)` reset in `onFilesSelected` to `setServerEventFiles([])`.

- [ ] **Step 2: Parse every selected file and flatten**

Replace `onServerEventFileSelected` with a multi-file version:

```ts
  const onServerEventFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setServerEventFiles(files);

    setResultFiles([]);
    if (resultsInputRef.current) resultsInputRef.current.value = "";

    if (files.length === 0 || !gameData) {
      setParsedRaces([]);
      return;
    }

    setIsParsingRaces(true);
    try {
      const all: ParsedRace[] = [];
      let aliasSet = false;
      for (const file of files) {
        try {
          const json: unknown = JSON.parse(await file.text());
          if (!isServerEventFormat(json)) {
            addLog("warning", `File is not a valid server event format: ${file.name}`, faXmark);
            continue;
          }
          if (!aliasSet) {
            setChampionshipAlias(extractServerEventAlias(json));
            aliasSet = true;
          }
          const races = parseServerEventData(json, gameData);
          if (!races || races.length === 0) {
            addLog("warning", `No Race session found in ${file.name}`, faXmark);
            continue;
          }
          all.push(...races);
        } catch {
          addLog("error", `Failed to parse server event file: ${file.name}`, faXmark);
        }
      }
      setParsedRaces(all);
    } finally {
      setIsParsingRaces(false);
    }
  };
```

- [ ] **Step 3: Update the selection summary UI**

Replace the `serverEventFile && (...)` alert with one driven by `serverEventFiles.length`:

```tsx
              {serverEventFiles.length > 0 && (
                <Alert variant="secondary" className="py-2 mb-3">
                  {serverEventFiles.length} server event file
                  {serverEventFiles.length > 1 ? "s" : ""} selected
                  {parsedRaces.length > 0 && (
                    <div className="mt-2">
                      <Badge bg="success" className="me-2">
                        {parsedRaces.length} race{parsedRaces.length > 1 ? "s" : ""} parsed
                      </Badge>
                      {isParsingRaces && (
                        <Spinner animation="border" size="sm" className="ms-2" />
                      )}
                    </div>
                  )}
                </Alert>
              )}
```

Add `multiple` to the `<Form.Control>` and update its `Form.Text` to: "Select one or more RaceRoom dedicated server event files. Imports Race result and Qualify times automatically."

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run build`
Expected: PASS. Manual: select 2+ server event files → "N server event files selected" and the combined race count parsed; Save creates/updates the championship.

- [ ] **Step 5: Commit** (after user confirmation)

```bash
git add src/renderer/pages/BuildResultsDatabase.tsx
git commit -m "feat(results): import multiple dedicated-server event files at once"
```

---

### Task 8: Viewer "Championships Won" consistency

**Files:**
- Modify: `src/renderer/pages/ResultsDatabaseViewer.tsx`

**Interfaces:**
- Consumes: `calculateChampionshipStandings` (Task 3, now penalty-aware), `resolvePointsSystem` (Task 1).
- Produces: "Championships Won" honors each championship's custom points system.

- [ ] **Step 1: Pass the points system into the standings call**

At the `calculateChampionshipStandings(races)` call (inside the stats IIFE), pass the resolver:

```ts
        const standings = calculateChampionshipStandings(
          races,
          resolvePointsSystem(championship),
        );
```

Add `resolvePointsSystem` to the existing import from `../types/raceResults` (the file already imports `ChampionshipEntry` from there).

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit** (after user confirmation)

```bash
git add src/renderer/pages/ResultsDatabaseViewer.tsx
git commit -m "feat(results): viewer stats honor custom points systems"
```

---

### Task 9: Documentation + QA pass

**Files:**
- Modify: `src/renderer/pages/Help.tsx` (and `README.md` if it documents Results Database)

**Interfaces:**
- Consumes: all prior tasks.
- Produces: user-facing docs + QA sign-off.

- [ ] **Step 1: Document the new capabilities**

In the Results Database section of `Help.tsx` (and README if applicable), add concise notes: multi-file server event import; custom championship points system (Edit mode); time penalties (re-order positions) and points penalties (deducted), edited in the championship page; changes apply to the on-screen standings and the exported HTML.

- [ ] **Step 2: Run the QA agents**

Run: `npm run agent:results-consistency`
Run: `npm run agent:data-integrity`
Run: `npm run agent:ui-regression`
Expected: reports in `.agent-reports/` with no new high-severity regressions. Address any flagged issues before sign-off.

- [ ] **Step 3: Manual end-to-end check**

1. Import 2 server event files → championship created with both races.
2. Open it → Edit → set points system to `10,8,6,5,4,3,2,1`, add a time penalty that changes the podium and a points penalty → Save.
3. Confirm on-screen Driver/Team/Vehicle standings, the per-race Pts cells, and "Championships Won" in the Viewer all reflect the edits.
4. Download HTML → standings in the file match the screen.
5. Reload the app → edits persisted. Export/restore backup JSON → penalties + points system survive.

- [ ] **Step 4: Commit** (after user confirmation)

```bash
git add src/renderer/pages/Help.tsx README.md
git commit -m "docs(results): document batch import, custom points, and penalties"
```

---

## Self-Review

**Spec coverage:**
- Batch import → Task 7. ✓
- Custom points system per championship → Tasks 1, 3, 5, 6 (editor), 4 (HTML), 8 (stats). ✓
- Time penalties (re-order) → Task 2 (sort) + Task 6 (editor). ✓
- Points penalties (deduct) → Task 3 (builders) + Task 6 (editor). ✓
- Editable results overview in Detail → Task 6. ✓
- Consistency on screen / HTML / viewer stats → Tasks 4, 5, 8. ✓
- Consolidation (delete duplicated math) → Tasks 3, 4, 5. ✓
- Known limitation (track+class dedup) → unchanged by design; not a task. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `DriverStanding`/`TeamStanding`/`VehicleStanding` and `buildDriverStandings`/`buildTeamStandings`/`buildVehicleStandings` defined in Task 3 are consumed with identical signatures in Tasks 4, 5. `resolvePointsSystem` (Task 1) used in Tasks 4, 5, 6, 8. `generateStandingsHTML` 6th param added in Task 4 and all three callers updated in the same task. ✓

**Note on countback helper:** `buildDriverStandings` reuses the existing `sortByPointsAndCountback`, which expects a `positions: number[]` field; Task 3 Step 2 maps `raceResults` → `positions` for the sort then strips it. Verify `sortByPointsAndCountback` remains generic over `{ driver; points; positions }`.
