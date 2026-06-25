// Types for RaceRoom race results parsing and standings generation

// ============================================================================
// JSON Format Types (matches RaceRoom's native JSON structure)
// ============================================================================

/**
 * Individual lap data from RaceRoom race result JSON.
 */
export interface Lap {
  /** Lap number (0 = formation/rolling start lap) */
  number: number;
  /** Elapsed time at lap start in milliseconds */
  startEtMs: number;
  /** Lap time in milliseconds */
  lapTimeMs: number;
}

/**
 * Header section of RaceRoom race result JSON.
 */
export interface RaceResultHeader {
  /** Game name */
  game: string;
  /** Game version */
  version: string;
  /** Result timestamp (format: YYYY/MM/DD HH:mm:ss) */
  time: string;
}

/**
 * Event section of RaceRoom race result JSON.
 * Supports both old format (track/layout strings) and new format (trackId/layoutId).
 */
export interface RaceResultEvent {
  /** Track ID from R3E database (new format) */
  trackId?: number;
  /** Layout ID from R3E database */
  layoutId?: number;
  /** Track length in centimeters (new format) */
  trackLengthCm?: number;
  /** Track name string (old format, deprecated) */
  track?: string;
  /** Layout name string (old format, deprecated) */
  layout?: string;
}

/**
 * Driver entry in RaceRoom race result JSON.
 */
export interface RaceResultDriver {
  /** Driver name */
  name: string;
  /** User ID (Steam ID or similar) */
  userId: number;
  /** Country ID */
  countryId: number;
  /** Car/vehicle ID */
  carId: number;
  /** Livery ID */
  liveryId: number;
  /** Team ID */
  teamId: number;
  /** Penalty weight in kg */
  penaltyKg: number;
  /** Number of completed laps */
  totalLaps: number;
  /** Distance travelled on final incomplete lap (in cm) */
  lapDistanceTravelledCm: number;
  /** Array of lap times */
  laps: Lap[];
  /** Qualifying time in milliseconds (-1 if not available) */
  qualTimeMs: number;
  /** Best lap time in milliseconds (-1 if not available) */
  bestLapTimeMs: number;
  /** Total race time in milliseconds (-1 if not available) */
  raceTimeMs: number;
  /** Final race position */
  place: number;
}

/**
 * Complete RaceRoom race result in native JSON format.
 */
export interface RaceResult {
  /** Session metadata (game, version, timestamp). */
  header: RaceResultHeader;
  /** Event metadata (track/layout identifiers and optional legacy names). */
  event: RaceResultEvent;
  /** Ordered list of drivers with lap-by-lap and classification data. */
  drivers: RaceResultDriver[];
}

// ============================================================================
// Intermediate Types (used during parsing/processing)
// ============================================================================

/**
 * Normalized race slot used in database processing.
 * Intermediate format between JSON and championship standings.
 */
export interface RaceSlot {
  /** Driver display name. */
  driver: string;
  /** Team display name (resolved from game data, fallback to driver name). */
  team: string;
  /** Vehicle display name (resolved from game data). */
  vehicle: string;
  /** Vehicle ID from game database. */
  vehicleId?: number;
  /** Numeric user identifier (if available). */
  userId?: number;
  /** Vehicle class name (resolved from game data). */
  className?: string;
  /** Vehicle class ID from game database. */
  classId?: number;
  /** Alias of total race time (formatted string). */
  finishTime?: string;
  /** Total race time as formatted string (`M:SS.mmm` or `H:MM:SS.mmm`). */
  totalTime?: string;
  /** Best lap time as formatted string. */
  bestLap?: string;
  /** Qualifying time as formatted string. */
  qualTime?: string;
  /** Final race position from source result. */
  position?: number;
  /** Computed finish state (`Finished`, `DNF`, `DNS`). */
  finishStatus?: string;
  /** Number of completed laps. */
  totalLaps?: number;
  /** Time penalty in seconds added to the driver's race time for sorting/positions. */
  timePenaltySeconds?: number;
}

/**
 * Parsed race data with resolved track/layout names.
 * Database format used for championship processing.
 */
export interface ParsedRace {
  /** Resolved track name (e.g., "Monza - Grand Prix") */
  trackname: string;
  /** Layout ID from r3e-data.json */
  trackid: number;
  /** Race timestamp string */
  timestring: string;
  /** Array of driver race slots */
  slots: RaceSlot[];
  /** Points system ruleset identifier */
  ruleset: string;
  /** Original filename (optional) */
  filename?: string;
}

/**
 * Database of parsed races for championship standings.
 */
export interface RaceDatabase {
  /** Optional description of the championship */
  description?: string;
  /** Array of parsed race results */
  races: ParsedRace[];
}

// ============================================================================
// Championship Management Types
// ============================================================================

/**
 * Championship entry metadata for persistent storage.
 * Used by championship store and results viewer.
 */
export interface ChampionshipEntry {
  /** Unique alias/slug for the championship */
  alias: string;
  /** Original filename of the database */
  fileName: string;
  /** Number of races in championship */
  races: number;
  /** ISO timestamp when championship was generated */
  generatedAt: string;
  /** Primary car name (if single-class) */
  carName?: string;
  /** Leaderboard icon URL for primary car */
  carIcon?: string;
  /** Full race data for later viewing (optional) */
  raceData?: ParsedRace[];
  /** Custom championship points system; when absent the default F1 system is used. */
  pointsSystem?: number[];
  /** Championship points deducted per driver (driver name → total points penalty). */
  pointsPenalties?: Record<string, number>;
}

/**
 * Predefined points systems for various racing series.
 * Key is ruleset identifier, value is array of points (1st place → last scored place).
 */
export const DEFAULT_POINTS_SYSTEM: Record<string, number[]> = {
  /** Formula 1 / Standard system */
  default: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  /** DTM 2023 points system */
  dtm2023: [28, 25, 22, 19, 16, 13, 10, 8, 6, 4, 3, 2, 1],
};

/**
 * Resolves the active points array for a championship,
 * falling back to the default F1 system when none is configured.
 */
export const resolvePointsSystem = (champ: ChampionshipEntry): number[] =>
  champ.pointsSystem && champ.pointsSystem.length > 0
    ? champ.pointsSystem
    : DEFAULT_POINTS_SYSTEM.default;

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
