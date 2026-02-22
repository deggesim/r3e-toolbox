/**
 * Human player detection and race slot sorting utilities.
 *
 * These utilities identify the human player in a race and order race slots
 * by finishing position, accounting for DNS/DNF status.
 */

import type { ParsedRace, RaceSlot } from "../types/raceResults";
import { parseTime } from "./timeUtils";

/**
 * Identifies the human player driver name in a single race.
 *
 * Strategy:
 * 1. First, attempt to find a slot with `UserId` (numeric ID > 0).
 *    In RaceRoom results, actual human players have a non-zero UserId.
 * 2. If no UserId is found, fallback to the first slot in the race.
 *    This handles cases where UserId data is incomplete or for single-player AI races.
 *
 * @param race - A ParsedRace object containing slots (drivers) for the race
 * @returns Driver name (string) or null if no slots exist
 *
 * @example
 * const humanDriver = getHumanDriverName(race);
 * // Returns: "Player1" (matched by UserId > 0)
 * // Or: "AI_1" (fallback to first slot if UserId not available)
 */
export const getHumanDriverName = (race: ParsedRace): string | null => {
  if (!race.slots || race.slots.length === 0) return null;

  // Strategy 1: Find driver with valid UserId (human player indicator)
  const userSlot = race.slots.find(
    (slot) => typeof slot.UserId === "number" && slot.UserId > 0,
  );

  // Return matched user, or fallback to first slot
  return (userSlot || race.slots[0]).Driver || null;
};

/**
 * Sorts race slots by finishing position (1st, 2nd, 3rd, etc.).
 *
 * Sorting logic:
 * 1. Filter by completion status: finished drivers rank before DNF/DNS
 * 2. Among finished drivers: sort by total laps completed (descending)
 * 3. If same laps: sort by total race time (ascending)
 * 4. DNS/DNF drivers appear last (no position assigned)
 *
 * A driver is considered "finished" if:
 * - FinishStatus is explicitly "Finished", OR
 * - TotalTime or FinishTime is present (parsed successfully)
 *
 * Important: This does NOT assign position numbers. It only sorts the array.
 * To get position: find index in sorted array, then position = index + 1.
 *
 * @param slots - Array of RaceSlot objects (drivers in a race)
 * @returns New sorted array (original unchanged)
 *
 * @example
 * const sorted = getSortedRaceSlots(race.slots);
 * const humanDriver = "Player1";
 * const position = sorted.findIndex((s) => s.Driver === humanDriver) + 1;
 * // position = 2 (2nd place)
 */
export const getSortedRaceSlots = (slots: RaceSlot[]): RaceSlot[] => {
  return [...slots].sort((a, b) => {
    const statusA = a.FinishStatus;
    const statusB = b.FinishStatus;

    // Parse lap times: returns undefined for invalid/missing times
    const timeA = parseTime(a.TotalTime || a.FinishTime);
    const timeB = parseTime(b.TotalTime || b.FinishTime);

    // Determine if each driver finished the race
    const validA =
      timeA !== undefined && statusA !== "DNF" && statusA !== "DNS";
    const validB =
      timeB !== undefined && statusB !== "DNF" && statusB !== "DNS";

    // Finished drivers before DNF/DNS
    if (!validA && !validB) return 0;
    if (!validA) return 1; // A is DNF/DNS -> sort after B
    if (!validB) return -1; // B is DNF/DNS -> sort after A

    // Both finished: first compare by laps completed (more laps = better)
    const lapsA = a.TotalLaps ?? 0;
    const lapsB = b.TotalLaps ?? 0;
    if (lapsB !== lapsA) return lapsB - lapsA;

    // Same laps: sort by time (ascending = fastest first, lowest time)
    return (timeA ?? 0) - (timeB ?? 0);
  });
};
