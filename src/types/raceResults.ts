// Types for RaceRoom race results parsing and standings generation

export interface RaceSlot {
  driver: string;
  team: string;
  vehicle: string;
  vehicleId?: number;
  userId?: number;
  className?: string;
  classId?: number;
  finishTime?: string;
  totalTime?: string;
  bestLap?: string;
  qualTime?: string;
  position?: number;
  finishStatus?: string;
  totalLaps?: number;
}

export type Driver = {
  userId?: string | number;
  UserId?: string | number;
  userid?: string | number;
  name: string;
  teamId?: number;
  teamName?: string;
  carId?: number;
  carName?: string;
  classId?: number;
  className?: string;
  ClassId?: number;
  ClassName?: string;
  finishStatus?: string;
  totalTime?: number;
  bestLapTime?: number;
  qualifyingTime?: number;
  raceTimeMs?: number;
  bestLapTimeMs?: number;
  qualTimeMs?: number;
  totalLaps?: number;
  TotalLaps?: number;
};

export interface RaceResult {
  header: {
    time: string;
  };
  event: {
    track?: string;
    layout?: string;
    layoutId?: number;
  };
  drivers: Driver[];
}

export interface ParsedRace {
  trackname: string;
  trackid: number;
  timestring: string;
  slots: RaceSlot[];
  ruleset: string;
  filename?: string;
}

export interface RaceDatabase {
  description?: string;
  races: ParsedRace[];
}

export interface StandingsConfig {
  ruleset: string;
  rulepoints: Record<string, number[]>;
  minracetime: number; // minutes
  newdescr: string;
  forcedkey: string;
}

// Championship management types

export interface ChampionshipEntry {
  alias: string;
  fileName: string;
  races: number;
  generatedAt: string;
  carName?: string;
  carIcon?: string;
  raceData?: ParsedRace[]; // Store parsed races for later viewing
}

export const DEFAULT_POINTS_SYSTEM: Record<string, number[]> = {
  default: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  dtm2023: [28, 25, 22, 19, 16, 13, 10, 8, 6, 4, 3, 2, 1],
};
