# Results Database — Batch Import, Custom Points & Penalties

**Date:** 2026-06-21
**Status:** Approved (design)
**Origin:** Feature requests from forum user *NL-jos* (KW Studios forum, R3E Toolbox thread):

> - "I can only download one file at a time from the folder where the files from the dedicated server are located."
> - "how can I adjust the score (which we use ourselves)? And add any penalty points? Or time penalties?"
> - "an easy overview of the results so that there is a possibility to change the results in case of a time penalty."

## Goal

Let a league/community admin, working entirely inside the Results Database:

1. Import **multiple** dedicated-server event files in one go.
2. Define a **custom championship points system** per championship.
3. Apply **time penalties** (seconds) and **points penalties** to drivers per race, with an
   easy editable overview — reflected consistently on screen, in the exported HTML, and in
   the viewer statistics.

## Decisions (locked)

- **Points system:** per championship, editable (not global, not preset-only).
- **Batch import:** multi-file selection (works in web + desktop; no folder/IPC path).
- **Penalties:** edited in the championship **Detail** page via an Edit toggle. Time penalties
  re-sort positions; points penalties are deducted from championship points.

## Data Model (all new fields optional → backward compatible)

`src/renderer/types/raceResults.ts`:

```ts
// ChampionshipEntry
pointsSystem?: number[]; // when absent → DEFAULT_POINTS_SYSTEM.default

// RaceSlot
timePenaltySeconds?: number; // added to race time for sorting/positions
pointsPenalty?: number;      // championship points subtracted for this driver in this race
```

Optional fields mean existing persisted championships and exported/restored backup JSON load
unchanged, and penalties ride along with the existing backup/restore flow automatically.

A single resolver is the source of truth for the active points array:

```ts
export const resolvePointsSystem = (champ: ChampionshipEntry): number[] =>
  champ.pointsSystem ?? DEFAULT_POINTS_SYSTEM.default;
```

## Architecture

### Time penalties — one lever

Modify only `getSortedRaceSlots` (`src/renderer/utils/humanPlayerUtils.ts`) so the time used for
sorting is the **effective** time:

```
effectiveSeconds = parseTime(totalTime || finishTime) + (timePenaltySeconds ?? 0)
```

Lap-count comparison is unchanged (a time penalty does not remove laps). Because positions are
always derived from this sort, time penalties propagate to every consumer that uses it (Detail
page positions, Viewer wins/podiums/poles).

`// ponytail: penalty only re-orders within same lap count; a penalty that should drop a driver below a lapped car is not modelled — add lap-aware penalties if a league needs it.`

### Standings consolidation (delete duplication)

Today the driver/team/vehicle standings math is duplicated in `ResultsDatabaseDetail.tsx` and
`htmlGenerator.ts`, each with its own hardcoded points array and inline sort, plus a third
variant in `standingsCalculator.ts`. Extract pure builders into `standingsCalculator.ts`:

```ts
buildDriverStandings(races, pointsSystem): DriverStanding[]
buildTeamStandings(races, pointsSystem): TeamStanding[]
buildVehicleStandings(races, pointsSystem): VehicleStanding[]
```

These functions:
- use `getSortedRaceSlots` for positions (so time penalties apply),
- look up position points from the passed `pointsSystem`,
- compute per-race net points = `positionPoints - (pointsPenalty ?? 0)`,
- sum net points for the total, keep the existing countback tiebreaker.

`ResultsDatabaseDetail.tsx` and `htmlGenerator.ts` **consume** these builders; rendering stays in
each file. Behavior is unified on `getHumanDriverName` (human detection) and `getSortedRaceSlots`
(sort) — htmlGenerator's inline sorts are removed. This deletes ~200 lines of duplicated math and
makes points + penalty logic exist exactly once.

The `DriverStanding` / `TeamStanding` / `VehicleStanding` shapes already match between the two
files; they move next to the builders and are imported by both.

### Detail page editor

`ResultsDatabaseDetail.tsx` gains an **Edit** toggle in the header. In edit mode it works on a
local draft copy of `championship.raceData` + `pointsSystem`, recomputes standings from the draft
(live preview), and shows **Save** / **Cancel**:

- **Points system editor:** a single text input (`25,18,15,12,...`) parsed to `number[]`, with
  preset quick-fill buttons (F1 / DTM from `DEFAULT_POINTS_SYSTEM`) and a reset.
  `// ponytail: comma-separated string, not per-position chip inputs.`
- **Penalties editor:** grouped by race; for each race, one row per driver (ordered by current
  position) with two number inputs — *Time penalty (s)* and *Points penalty*.
- **Save** → `addOrUpdate` with the modified `raceData` and `pointsSystem`. **Cancel** → discard
  draft. Persistence is the existing Zustand `championshipStore` (electron-store / localStorage).

Read-only mode is unchanged; the per-race Pts cell shows net points and a penalized cell is
visually marked (CSS class / title).

### Batch server-event import

`BuildResultsDatabase.tsx`: the server-event `<Form.Control type="file">` gets `multiple`.
`onServerEventFileSelected` loops the selected files, runs `parseServerEventData` per file, and
flattens results into `parsedRaces`. The existing merge/dedup in `handleCreateOrUpdate` already
handles multiple races. The selection summary shows the file count.

### Viewer statistics

`ResultsDatabaseViewer.tsx`: pass `resolvePointsSystem(championship)` (and points penalties) to
`calculateChampionshipStandings` so "Championships Won" is consistent. Wins/podiums/poles already
reflect time penalties via the `getSortedRaceSlots` change.

## Data Flow

```
server event files (N) ──▶ parseServerEventData ─┐
Race*.txt/json files (N) ─▶ parseResultFiles ─────┼─▶ parsedRaces ─▶ handleCreateOrUpdate
                                                  │        (merge/dedup) ─▶ championshipStore
Detail edit (penalties, pointsSystem) ────────────┘─▶ addOrUpdate ─▶ championshipStore
                                                           │
championshipStore.raceData ─▶ buildXStandings(races, resolvePointsSystem) ─▶ Detail UI / HTML / Viewer stats
```

## Error Handling

- Points-system input: ignore empty tokens, reject non-numeric / negative values, never persist an
  empty array (fall back to default). Show inline validation; disable Save while invalid.
- Penalty inputs: coerce blank → undefined (no penalty); clamp time penalty ≥ 0; points penalty is
  a non-negative number subtracted from points.
- Batch import: a file that fails `isServerEventFormat` / parse is logged via `useProcessingLogStore`
  and skipped; other files still import.

## Testing / Verification

- No traditional unit tests in this repo. Add one runnable self-check for the new pure math:
  a small assert-based check that `buildDriverStandings` applies a time penalty (re-orders) and a
  points penalty (deducts) correctly.
- Run `npm run agent:results-consistency` (standings/result parsing) after the consolidation, and
  `npm run agent:data-integrity` after the type/parser changes.
- Manual: import 2+ server files; edit a points system; add a time penalty that changes a podium;
  add a points penalty; confirm Detail, exported HTML, and Viewer "Championships Won" all agree.

## Known Limitations / Out of Scope

- **Track+class dedup:** importing multiple rounds on the *same* track + car class collapses them
  to one (pre-existing behavior of `buildRaceKey` for the whole import path). Flagged, not changed.
- `ParsedRace.ruleset` stays unused (not removed).
- No folder/IPC batch import (multi-file selection only).

## Files Touched

- `src/renderer/types/raceResults.ts` — new optional fields + `resolvePointsSystem`.
- `src/renderer/utils/humanPlayerUtils.ts` — effective-time sort.
- `src/renderer/utils/standingsCalculator.ts` — shared driver/team/vehicle builders.
- `src/renderer/pages/ResultsDatabaseDetail.tsx` — edit mode + editor, consume builders.
- `src/renderer/utils/htmlGenerator.ts` — consume builders, drop inline sorts.
- `src/renderer/pages/BuildResultsDatabase.tsx` — multi-file server-event import.
- `src/renderer/pages/ResultsDatabaseViewer.tsx` — points system in stats.

No new dependencies.
