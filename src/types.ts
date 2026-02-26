// Re-export types from organized type files for backward compatibility
export type {
  RaceRoomClass,
  RaceRoomTrack,
  RaceRoomTeam,
  RaceRoomData,
  TrackAsset,
  ClassAsset,
  Assets,
  LeaderboardAsset,
  LeaderboardAssets,
} from "./types/gameData";

export type {
  AITimeEntry,
  PlayerLapTime,
  SampledData,
  CarClassData,
  TrackData,
  AIAdaptationData,
  DatabaseClass,
  DatabaseTrack,
  Database,
  ProcessedDatabase,
  PlayerTimes,
  PlayerTimesClass,
  PlayerTimesTrack,
} from "./types/aiAdaptation";

export type {
  RaceSlot,
  SinglePlayerDriver,
  SinglePlayerRaceResult,
  ParsedRace,
  RaceDatabase,
  StandingsConfig,
  ChampionshipEntry,
} from "./types/raceResults";

export { DEFAULT_POINTS_SYSTEM } from "./types/raceResults";
