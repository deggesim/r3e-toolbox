import {
  DEFAULT_POINTS_SYSTEM,
  type ParsedRace,
  type RaceDatabase,
} from "../types/raceResults";

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

export function calculateRacePoints(
  race: ParsedRace,
  pointsSystem: number[] = DEFAULT_POINTS_SYSTEM.default,
): Map<string, number> {
  const pointsMap = new Map<string, number>();

  // Sort by finish time
  const sorted = [...race.slots].sort((a, b) => {
    const timeA = parseTimeToSeconds(a.FinishTime);
    const timeB = parseTimeToSeconds(b.FinishTime);

    // DNF/DNS should be at the end
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;
    if (!timeB) return -1;

    return timeA - timeB;
  });

  // Assign points based on position
  sorted.forEach((slot, index) => {
    if (
      slot.FinishTime &&
      slot.FinishStatus !== "DNF" &&
      slot.FinishStatus !== "DNS"
    ) {
      const points = pointsSystem[index] || 0;
      pointsMap.set(slot.Driver, points);
    } else {
      pointsMap.set(slot.Driver, 0);
    }
  });

  return pointsMap;
}

function parseTimeToSeconds(timeStr: string | undefined): number | null {
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
}

export function buildStandings(
  races: ParsedRace[],
  pointsSystem: number[] = DEFAULT_POINTS_SYSTEM.default,
): {
  drivers: StandingsEntry[];
  teams: Map<string, number>;
  vehicles: Map<string, number>;
} {
  const driverStats = new Map<string, DriverPoints>();
  const driverInfo = new Map<string, { vehicle: string; team: string }>();
  const teamPoints = new Map<string, number>();
  const vehiclePoints = new Map<string, number>();

  // Process each race
  for (const race of races) {
    const racePoints = calculateRacePoints(race, pointsSystem);

    // Sort to get positions
    const sorted = [...race.slots].sort((a, b) => {
      const timeA = parseTimeToSeconds(a.FinishTime);
      const timeB = parseTimeToSeconds(b.FinishTime);
      if (!timeA && !timeB) return 0;
      if (!timeA) return 1;
      if (!timeB) return -1;
      return timeA - timeB;
    });

    sorted.forEach((slot, index) => {
      const driver = slot.Driver;
      const points = racePoints.get(driver) || 0;
      const position = index + 1;

      // Update driver stats
      if (!driverStats.has(driver)) {
        driverStats.set(driver, { points: 0, positions: [], races: 0 });
        driverInfo.set(driver, { vehicle: slot.Vehicle, team: slot.Team });
      }

      const stats = driverStats.get(driver)!;
      stats.points += points;
      stats.positions.push(position);
      stats.races += 1;

      // Update team points
      if (slot.Team) {
        teamPoints.set(slot.Team, (teamPoints.get(slot.Team) || 0) + points);
      }

      // Update vehicle points
      if (slot.Vehicle) {
        vehiclePoints.set(
          slot.Vehicle,
          (vehiclePoints.get(slot.Vehicle) || 0) + points,
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

  // Sort by points (descending), then by best positions
  drivers.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    // Count wins, podiums, etc.
    const aWins = a.positions.filter((p) => p === 1).length;
    const bWins = b.positions.filter((p) => p === 1).length;
    if (bWins !== aWins) return bWins - aWins;

    const aPodiums = a.positions.filter((p) => p <= 3).length;
    const bPodiums = b.positions.filter((p) => p <= 3).length;
    if (bPodiums !== aPodiums) return bPodiums - aPodiums;

    return 0;
  });

  return { drivers, teams: teamPoints, vehicles: vehiclePoints };
}

export function getBestLapTimes(
  races: ParsedRace[],
): Array<{ driver: string; time: string; track: string; vehicle: string }> {
  const bestLaps: Array<{
    driver: string;
    time: string;
    track: string;
    vehicle: string;
    seconds: number;
  }> = [];

  for (const race of races) {
    for (const slot of race.slots) {
      if (slot.BestLap) {
        const seconds = parseTimeToSeconds(slot.BestLap);
        if (seconds) {
          bestLaps.push({
            driver: slot.Driver,
            time: slot.BestLap,
            track: race.trackname,
            vehicle: slot.Vehicle,
            seconds,
          });
        }
      }
    }
  }

  // Sort by time
  bestLaps.sort((a, b) => a.seconds - b.seconds);

  return bestLaps.slice(0, 20).map(({ seconds, ...rest }) => rest);
}

export function getBestQualifyingTimes(
  races: ParsedRace[],
): Array<{ driver: string; time: string; track: string; vehicle: string }> {
  const bestQuals: Array<{
    driver: string;
    time: string;
    track: string;
    vehicle: string;
    seconds: number;
  }> = [];

  for (const race of races) {
    for (const slot of race.slots) {
      if (slot.QualTime) {
        const seconds = parseTimeToSeconds(slot.QualTime);
        if (seconds) {
          bestQuals.push({
            driver: slot.Driver,
            time: slot.QualTime,
            track: race.trackname,
            vehicle: slot.Vehicle,
            seconds,
          });
        }
      }
    }
  }

  // Sort by time
  bestQuals.sort((a, b) => a.seconds - b.seconds);

  return bestQuals.slice(0, 20).map(({ seconds, ...rest }) => rest);
}

export function buildRaceDatabase(
  races: ParsedRace[],
  description: string = "",
): RaceDatabase {
  return {
    description,
    races,
  };
}
