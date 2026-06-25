---
name: r3e-xml-fitting
description: >-
  Authority on the aiadaptation.xml parse → fit → rebuild pipeline of this R3E toolbox.
  Use this skill BEFORE touching any of: xmlParser.ts, xmlBuilder.ts, jsonParser.ts,
  timeUtils.ts, fitting.ts, databaseProcessor.ts, config.ts, or the Database/PlayerTimes
  types. Also use it whenever the task involves RaceRoom AI lap-time data, AI skill levels,
  parsing or generating aiadaptation.xml, linear/parabolic fitting of lap times, monotonicity
  or deviation validation, sampled vs synthetic entries (numberOfSampledRaces), or lap-time
  unit conversion (ms vs seconds). This includes any change to the fitting parameters in
  config.ts — the AI-level prediction range (minAI/maxAI, e.g. 80–120), deviation tolerance,
  or fit-acceptance thresholds — even when it looks like a trivial "just change these numbers"
  edit, because those values feed the monotonicity and deviation guards. It encodes invariants
  that the code does not make obvious and that, if broken, silently drop data instead of throwing.
---

# R3E aiadaptation.xml parse → fit → rebuild

This pipeline reads RaceRoom's `aiadaptation.xml`, fits a model to AI lap times, and writes
the file back. The failure mode that matters: **bad input is silently dropped, not thrown.**
Most functions return `false`/`undefined` on malformed data, so a broken invariant shows up
as "some tracks disappeared", never as an error. Know the invariants before editing.

## The data flow

```
r3e-data.json ─ jsonParser.parseJson ─────────────► Assets { tracks, classes }   (id → name)
aiadaptation.xml ─ xmlParser.parseAdaptive ─┬─────► Database    (real AI times per track/class)
                                            └─────► PlayerTimes  (player best laps)
Database ─ databaseProcessor.processDatabase(config) ─► Database (synthetic, fitted predictions)
Database + PlayerTimes + Assets ─ xmlBuilder.buildXML ─► aiadaptation.xml
```

All files live in `src/renderer/utils/`. Types are in `src/renderer/types/aiAdaptation.ts`
(`Database`, `DatabaseTrack`, `PlayerTimes`) and `src/renderer/types/gameData.ts` (`Assets`).
Fitting parameters are in `src/renderer/config.ts` (`CFG`), runtime-overridable via the
Settings page (`configStore`).

## Invariant 1 — XML single-vs-multiple: always `toArray()`

`fast-xml-parser` collapses a lone repeated element into an **object**, and two-or-more into an
**array**. A track with one class parses differently from a track with two. Every level of the
tree is affected: `layoutId`/`value`, `carClassId`/`sampledData`, `aiSkill`/`aiData`, `lapTime`.

- Normalize with `toArray(x)` (`Array.isArray(x) ? x : [x]`) before iterating — **never** assume.
- A node's text can be a primitive *or* `{ "#text": "..." }`. Read it through `extractText()`,
  never `.toString()` or direct property access.

## Invariant 2 — parallel arrays must stay the same length

R3E stores keys and values as **sibling sequences**, not nested pairs. `parseAdaptive` pairs them
by index and **bails (`return false`, dropping the whole entry) if lengths differ**:

- `layoutId[i]` ↔ `value[i]`
- `carClassId[j]` ↔ `sampledData[j]`
- `aiSkill[k]` ↔ `aiData[k]`

When you build or mutate XML, every `aiSkill` needs exactly one matching `aiData`, in order.
Add or remove them as a pair. A mismatch doesn't error — it makes the track vanish on the next read.

## Invariant 3 — lap-time units differ by file

- **Race results**: milliseconds.
- **aiadaptation.xml**: seconds.

Convert at the boundary via `timeUtils.ts`: `parseTime()` (HH:MM:SS.fff / MM:SS.fff → seconds),
`makeTime()` (seconds → string), `parseTimestring()` (RaceRoom `YYYY_MM_DD_HH_MM_SS` → ms epoch).
Mixing units produces a fit that's wrong by 1000× and usually still "looks" monotonic, so it
passes validation — this bug hides. Always trace which unit you're holding.

## Invariant 4 — fit acceptance rules (databaseProcessor.trackGenerator)

A fit is computed per track/class and **rejected** (returns `undefined`, track excluded from output)
unless all of these hold:

1. `maxAI - minAI >= config.testMinAIdiffs` (default 2) — not enough spread, no fit.
2. **Monotonicity**: predicted lap time must *decrease* as AI level *increases*. Higher skill = faster.
   Any predicted point rising above the previous one rejects the whole fit.
3. **Deviation**: at most `config.testMaxFailsPct` (default 10%) of sampled points may deviate from
   the prediction by more than `config.testMaxTimePct` (default 10%) of the fastest sampled lap.

`config.fitAll` toggles fitting every individual lap (`true`) vs the per-level average (`false`,
default). Output predictions are generated for `config.minAI`..`config.maxAI` (default 80–120),
rounded to 2 decimals. `fitLinear` is what's used; `fitParabola` exists but the quadratic term `c`
is hard-wired to 0 (reserved). If you enable it, the monotonicity check must still pass.

## Invariant 5 — numberOfSampledRaces marks real vs synthetic

- `> 0` → the entry came from **real** sampled races (parsed from the original file).
- `0` → the entry was **synthetically fitted** by `processDatabase`.

`xmlBuilder.buildAISkillXML` preserves this: a stored count is written as-is (generated = 0), and
an entry with *no* stored count defaults to `1`. Don't overwrite a real count with 0 or vice versa —
it's the only signal distinguishing measured data from predictions, and the fitter keys off it.

## When rebuilding XML (xmlBuilder.buildXML)

The output must match RaceRoom's exact format or the game rejects it:

- Build the **full matrix** of every track × every class from `Assets`, even empty combos.
- Sort tracks and classes **numerically by id** (`parseInt`), not lexically.
- No XML declaration line; root is `<AiAdaptation ID="/aiadaptation">`; each entry is preceded by
  an `<!-- Index:N -->` comment with a 0-based running index per level.
- Numbers go through `formatNumber()`: 4 decimals, trailing zeros stripped (`1.2500` → `1.25`).

## Quick checklist before you commit a change here

- [ ] Every new XML traversal uses `toArray()` + `extractText()`.
- [ ] Paired sequences are pushed/removed together and stay equal length.
- [ ] Units are seconds inside the XML, ms in race results — converted at the boundary.
- [ ] New/changed fits still go monotonic and within deviation; test with a single-class track
      (the `toArray` edge case) and a 2-class track.
- [ ] `numberOfSampledRaces` semantics preserved (0 = synthetic, >0 = real).
- [ ] If output format changed, diff against an original RaceRoom `aiadaptation.xml` for byte shape.
