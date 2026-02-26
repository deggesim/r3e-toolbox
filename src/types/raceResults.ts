// Types for RaceRoom race results parsing and standings generation

export interface RaceSlot {
  Driver: string;
  Team: string;
  Vehicle: string;
  VehicleId?: number;
  UserId?: number;
  ClassName?: string;
  ClassId?: number;
  FinishTime?: string;
  TotalTime?: string;
  BestLap?: string;
  QualTime?: string;
  Position?: number;
  FinishStatus?: string;
  TotalLaps?: number;
}

export type SinglePlayerDriver = {
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

export interface SinglePlayerRaceResult {
  header: {
    time: string;
  };
  event: {
    track?: string;
    layout?: string;
    layoutId?: number;
  };
  drivers: SinglePlayerDriver[];
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
