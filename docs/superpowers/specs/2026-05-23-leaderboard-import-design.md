# Leaderboard File Import — Design Spec

**Date:** 2026-05-23
**Branch:** leaderboard

## Overview

Add support for importing RaceRoom multi-player server "Leaderboard" result files
(e.g. `202604170943.txt`) into the Results Database. The Leaderboard format is a
JSON file produced by RaceRoom's dedicated server, structurally distinct from the
single-player result format already supported.

## Leaderboard File Format

Top-level fields of interest:

| Field         | Type          | Notes                                          |
|---------------|---------------|------------------------------------------------|
| `Server`      | string        | Server/event name, used as alias suggestion    |
| `StartTime`   | number        | Unix timestamp in seconds                      |
| `Track`       | string        | Track name (e.g. `"Norisring"`)               |
| `TrackLayout` | string        | Layout name (e.g. `"Grand Prix"`)             |
| `Sessions`    | array         | Contains Practice, Qualify, Race sessions      |

Each session has a `Type` (`"Practice"` | `"Qualify"` | `"Race"`) and a `Players`
array. Key player fields:

| Field            | Type     | Notes                                           |
|------------------|----------|-------------------------------------------------|
| `UserId`         | number   | Numeric user identifier                         |
| `FullName`       | string   | Display name → maps to `driver`                 |
| `CarId`          | number   | Numeric car ID → maps to `vehicleId`            |
| `Car`            | string   | Car display name → maps to `vehicle`            |
| `Position`       | number   | Final classified position                       |
| `BestLapTime`    | number   | ms; values ≤ 0 are invalid                     |
| `TotalTime`      | number   | ms; values ≤ 0 are invalid                     |
| `FinishStatus`   | string   | e.g. `"Finished"`                              |
| `RaceSessionLaps`| array    | Per-lap data; length = `totalLaps`              |

## Sessions Processed

- **Race** — primary result: position, best lap, total time, finish status, laps.
- **Qualify** — used only to extract `qualTime` per driver (matched by `UserId`).
- **Practice** — ignored.

If no Race session is found, the file is skipped with a warning log.
If no Qualify session is found, `qualTime` is omitted for all drivers (not an error).

## Architecture

### Approach: Dedicated parser module (Approach A)

A new file `src/renderer/utils/leaderboardParser.ts` handles all Leaderboard
parsing. It does **not** duplicate logic from `raceResultParser.ts`; instead, the
following functions are exported from `raceResultParser.ts` and reused:

- `buildTrackLookup(gameData)` — resolves track name + layout → `TrackInfo`
- `resolveClassInfo(vehicleId, gameData)` — resolves `classId` / `className`
- `resolveVehicleName(vehicleId, gameData)` — resolves vehicle display name
- `millisecondsToTime(ms)` — formats ms → `"M:SS.mmm"` string

All functions in `leaderboardParser.ts` use arrow function syntax
(`const fn = () => {}`). No `function` keyword anywhere.

### New Types (`raceResults.ts`)

Appended at the end of the existing file, no changes to existing types:

```typescript
export type LeaderboardLap = { ... }
export type LeaderboardPlayer = { ... }
export type LeaderboardSession = { Type: "Practice" | "Qualify" | "Race"; Players: LeaderboardPlayer[] }
export type LeaderboardResult = { Server: string; StartTime: number; Track: string; TrackLayout: string; Sessions: LeaderboardSession[] }
```

### New Parser (`leaderboardParser.ts`)

**`isLeaderboardFormat(json: unknown): json is LeaderboardResult`**
Type guard. Checks for presence of `Sessions` (array), `Track` (string),
`Server` (string).

**`extractLeaderboardAlias(data: LeaderboardResult): string`**
Returns `data.Server` as the alias suggestion.

**`parseLeaderboardFile(file: File, gameData: RaceRoomData, ruleset?: string): Promise<ParsedRace[] | null>`**

Steps:
1. Read file text, parse JSON, validate with `isLeaderboardFormat`.
2. Build track lookup via `buildTrackLookup(gameData)`.
3. Resolve track: `"${Track} - ${TrackLayout}"` → lookup. If not found, use the
   raw combined string as `trackname` and `trackid: 0`; log a warning.
4. Convert `StartTime` (Unix seconds) → `timestring` `"YYYY_MM_DD_HH_MM_SS"` (underscore-separated, matching the primary format that `parseTimestring` explicitly handles).
5. Find Qualify session → build `Map<UserId, qualTimeString>`.
6. Find Race session → for each player build `RaceSlot`:
   - `driver`: `FullName`
   - `vehicle` / `vehicleId`: from `Car` / `CarId` (with gameData name resolution)
   - `className` / `classId`: via `resolveClassInfo`
   - `team`: resolved from `gameData.teams` if present, else `FullName`
   - `bestLap`: formatted if `BestLapTime > 0`
   - `totalTime`: formatted if `TotalTime > 0`
   - `qualTime`: from qualify map, keyed by `UserId`
   - `position`: `Position`
   - `finishStatus`: `FinishStatus`
   - `totalLaps`: `RaceSessionLaps.length`
7. Return one `ParsedRace` per Race session found (typically one per file).

### UI (`BuildResultsDatabase.tsx`)

A new visual block is inserted inside **Step 2** as an explicit alternative to the
existing single-player file input, separated by an `── or ──` divider.

New state:
```typescript
const [leaderboardFile, setLeaderboardFile] = useState<File | null>(null);
const leaderboardInputRef = useRef<HTMLInputElement>(null);
```

Handler `onLeaderboardFileSelected`:
1. Parse with `parseLeaderboardFile(file, gameData, "default")`.
2. `setParsedRaces(races)` — replaces current parsed races.
3. Always auto-fill `setChampionshipAlias(extractLeaderboardAlias(data))` when
   a Leaderboard file is selected (overrides any previous value, since the file
   effectively replaces the previous source).
4. Reset the single-player file input (`resultsInputRef.current.value = ""`).

Selecting single-player files resets `leaderboardFile` and `leaderboardInputRef`
symmetrically.

**Step 3 ("Save to database") is unchanged** — it reads from `parsedRaces`
regardless of source.

## Track Name Resolution

The Leaderboard format uses human-readable strings (`Track` + `TrackLayout`).
Resolution strategy:

1. Combine as `"${Track} - ${TrackLayout}"` and look up via `buildTrackLookup`.
2. If found → use the resolved `layoutId` as `trackid`.
3. If not found → `trackid: 0`, `trackname` = combined string, warning logged.
   The race is still importable; only deduplication by `buildRaceKey` is affected.

## Error Handling

| Condition                     | Behaviour                                        |
|-------------------------------|--------------------------------------------------|
| Invalid JSON                  | Return `null`, log warning                       |
| Not Leaderboard format        | Return `null`, log warning                       |
| No Race session               | Return `null`, log warning                       |
| Track not found in game data  | Import with `trackid: 0`, log warning            |
| No Qualify session            | Import without `qualTime` fields, no error       |
| Player with invalid times     | Times omitted (not formatted), not an error      |

## Files Modified / Created

| File                                              | Change        |
|---------------------------------------------------|---------------|
| `src/renderer/types/raceResults.ts`               | Add Leaderboard types (append only) |
| `src/renderer/utils/raceResultParser.ts`          | Export 4 shared utility functions   |
| `src/renderer/utils/leaderboardParser.ts`         | **New file**                        |
| `src/renderer/pages/BuildResultsDatabase.tsx`     | Add Leaderboard input section       |
