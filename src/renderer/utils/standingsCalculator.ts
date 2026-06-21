/**
 * Championship standings calculator.
 *
 * Logic inspired by r3e-open-championship by pixeljetstream:
 * https://github.com/pixeljetstream/r3e-open-championship
 */

import {
  DEFAULT_POINTS_SYSTEM,
  type ParsedRace,
  type RaceDatabase,
  type RaceSlot,
} from "../types/raceResults";
import { getHumanDriverName, getSortedRaceSlots } from "./humanPlayerUtils";

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

const numericPositions = (raceResults: (number | null)[]): number[] =>
  raceResults.filter((p): p is number => p !== null);

interface DriverPoints {
  points: number;
  positions: number[];
  races: number;
}

interface StandingsEntry {
  driver: string;
  vehicle: string;
  team: string;
  points: number;
  positions: number[];
}

/**
 * Simplified standings entry for championship winner calculation.
 */
export interface ChampionshipStanding {
  driver: string;
  points: number;
  positions: number[];
}

/**
 * Sorts an array of driver standings in-place by total points (descending),
 * with countback tiebreaker (most wins, then most 2nd places, etc.).
 */
const sortByPointsAndCountback = <
  T extends { driver: string; points: number; positions: number[] },
>(
  entries: T[],
  maxPositions: number,
): T[] => {
  const posCounts = new Map<string, Map<number, number>>();
  for (const d of entries) {
    const counts = new Map<number, number>();
    for (const p of d.positions) counts.set(p, (counts.get(p) || 0) + 1);
    posCounts.set(d.driver, counts);
  }

  return entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    const aCounts = posCounts.get(a.driver)!;
    const bCounts = posCounts.get(b.driver)!;
    for (let position = 1; position <= maxPositions; position++) {
      const diff = (bCounts.get(position) || 0) - (aCounts.get(position) || 0);
      if (diff !== 0) return diff;
    }

    return 0;
  });
};

export const calculateRacePoints = (
  race: ParsedRace,
  pointsSystem: number[] = DEFAULT_POINTS_SYSTEM.default,
): Map<string, number> => {
  const pointsMap = new Map<string, number>();

  // Sort by finish time
  const sorted = [...race.slots].sort((a, b) => {
    const timeA = parseTimeToSeconds(a.finishTime);
    const timeB = parseTimeToSeconds(b.finishTime);

    // DNF/DNS should be at the end
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;
    if (!timeB) return -1;

    return timeA - timeB;
  });

  // Assign points based on position
  sorted.forEach((slot, index) => {
    if (
      slot.finishTime &&
      slot.finishStatus !== "DNF" &&
      slot.finishStatus !== "DNS"
    ) {
      const points = pointsSystem[index] || 0;
      pointsMap.set(slot.driver, points);
    } else {
      pointsMap.set(slot.driver, 0);
    }
  });

  return pointsMap;
};

const parseTimeToSeconds = (timeStr: string | undefined): number | null => {
  if (!timeStr) return null;

  const parts = timeStr.split(":");
  let seconds = 0;

  if (parts.length === 3) {
    // H:M:S.ms
    seconds =
      Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  } else if (parts.length === 2) {
    // M:S.ms
    seconds = Number(parts[0]) * 60 + Number(parts[1]);
  } else {
    seconds = Number(timeStr);
  }

  return Number.isNaN(seconds) ? null : seconds;
};

export const buildStandings = (
  races: ParsedRace[],
  pointsSystem: number[] = DEFAULT_POINTS_SYSTEM.default,
): {
  drivers: StandingsEntry[];
  teams: Map<string, number>;
  vehicles: Map<string, number>;
} => {
  const driverStats = new Map<string, DriverPoints>();
  const driverInfo = new Map<string, { vehicle: string; team: string }>();
  const teamPoints = new Map<string, number>();
  const vehiclePoints = new Map<string, number>();

  // Process each race
  for (const race of races) {
    const racePoints = calculateRacePoints(race, pointsSystem);

    // Sort to get positions
    const sorted = [...race.slots].sort((a, b) => {
      const timeA = parseTimeToSeconds(a.finishTime);
      const timeB = parseTimeToSeconds(b.finishTime);
      if (!timeA && !timeB) return 0;
      if (!timeA) return 1;
      if (!timeB) return -1;
      return timeA - timeB;
    });

    sorted.forEach((slot, index) => {
      const driver = slot.driver;
      const points = racePoints.get(driver) || 0;
      const position = index + 1;

      // Update driver stats
      if (!driverStats.has(driver)) {
        driverStats.set(driver, { points: 0, positions: [], races: 0 });
        driverInfo.set(driver, { vehicle: slot.vehicle, team: slot.team });
      }

      const stats = driverStats.get(driver)!;
      stats.points += points;
      stats.positions.push(position);
      stats.races += 1;

      // Update team points
      if (slot.team) {
        teamPoints.set(slot.team, (teamPoints.get(slot.team) || 0) + points);
      }

      // Update vehicle points
      if (slot.vehicle) {
        vehiclePoints.set(
          slot.vehicle,
          (vehiclePoints.get(slot.vehicle) || 0) + points,
        );
      }
    });
  }

  // Build final standings
  const drivers: StandingsEntry[] = [];
  for (const [driver, stats] of driverStats) {
    const info = driverInfo.get(driver)!;
    drivers.push({
      driver,
      vehicle: info.vehicle,
      team: info.team,
      points: stats.points,
      positions: stats.positions,
    });
  }

  return {
    drivers: sortByPointsAndCountback(drivers, DEFAULT_POINTS_SYSTEM.default.length),
    teams: teamPoints,
    vehicles: vehiclePoints,
  };
};

export const getBestLapTimes = (
  races: ParsedRace[],
): Array<{ driver: string; time: string; track: string; vehicle: string }> => {
  const bestLaps: Array<{
    driver: string;
    time: string;
    track: string;
    vehicle: string;
    seconds: number;
  }> = [];

  for (const race of races) {
    for (const slot of race.slots) {
      if (slot.bestLap) {
        const seconds = parseTimeToSeconds(slot.bestLap);
        if (seconds && seconds > 0) {
          bestLaps.push({
            driver: slot.driver,
            time: slot.bestLap,
            track: race.trackname,
            vehicle: slot.vehicle,
            seconds,
          });
        }
      }
    }
  }

  // Sort by time
  bestLaps.sort((a, b) => a.seconds - b.seconds);

  return bestLaps.slice(0, 20).map((entry) => ({
    driver: entry.driver,
    time: entry.time,
    track: entry.track,
    vehicle: entry.vehicle,
  }));
};

export const getBestQualifyingTimes = (
  races: ParsedRace[],
): Array<{ driver: string; time: string; track: string; vehicle: string }> => {
  const bestQuals: Array<{
    driver: string;
    time: string;
    track: string;
    vehicle: string;
    seconds: number;
  }> = [];

  for (const race of races) {
    for (const slot of race.slots) {
      if (slot.qualTime) {
        const seconds = parseTimeToSeconds(slot.qualTime);
        if (seconds) {
          bestQuals.push({
            driver: slot.driver,
            time: slot.qualTime,
            track: race.trackname,
            vehicle: slot.vehicle,
            seconds,
          });
        }
      }
    }
  }

  // Sort by time
  bestQuals.sort((a, b) => a.seconds - b.seconds);

  return bestQuals.slice(0, 20).map((entry) => ({
    driver: entry.driver,
    time: entry.time,
    track: entry.track,
    vehicle: entry.vehicle,
  }));
};

/**
 * Calculate championship standings from race results.
 * Returns sorted standings with points and positions for each driver.
 *
 * This function uses getSortedRaceSlots for consistent position calculation
 * across all race results, applying the same tiebreaker logic (countback).
 *
 * @param races - Array of ParsedRace objects
 * @param pointsSystem - Points awarded per position (defaults to F1 system)
 * @returns Array of standings sorted by championship position
 *
 * @example
 * const standings = calculateChampionshipStandings(races);
 * const winner = standings[0]; // Championship winner
 */
export const calculateChampionshipStandings = (
  races: ParsedRace[],
  pointsSystem: number[] = DEFAULT_POINTS_SYSTEM.default,
): ChampionshipStanding[] => {
  const driverPoints = new Map<
    string,
    { points: number; positions: number[] }
  >();

  for (const race of races) {
    const sortedSlots = getSortedRaceSlots(race.slots || []);

    // Accumulate points for all drivers based on finishing positions
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
  }

  const standingsArr = Array.from(driverPoints.entries()).map(
    ([driver, data]) => ({ driver, ...data }),
  );

  return sortByPointsAndCountback(standingsArr, pointsSystem.length);
};

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

  return sortByPointsAndCountback(
    standings.map((s) => ({ ...s, positions: numericPositions(s.raceResults) })),
    pointsSystem.length,
  ).map(({ positions: _omit, ...rest }) => rest);
};

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

export const buildRaceDatabase = (
  races: ParsedRace[],
  description: string = "",
): RaceDatabase => {
  return {
    description,
    races,
  };
};
