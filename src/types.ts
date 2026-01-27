import type { ParsedRace } from "./types/raceResults";

export interface RaceRoomClass {
  Id: number;
  Name: string;
  Cars?: Array<{ Id: number }>;
}

export interface RaceRoomTrack {
  Id: number;
  Name: string;
  layouts: Array<{
    Id: number;
    Name: string;
    Track?: number;
    MaxNumberOfVehicles?: number;
  }>;
}

export interface RaceRoomTeam {
  Type: string;
  Name: string;
  Id: number;
}

export interface RaceRoomData {
  classes: Record<string, RaceRoomClass>;
  tracks: Record<string, RaceRoomTrack>;
  cars?: Record<string, { Name?: string; Class?: number }>;
  teams?: Record<string, RaceRoomTeam>;
}

export interface TrackAsset {
  name: string;
  id: string;
}

export interface ClassAsset {
  name: string;
  id: string;
}

export interface Assets {
  classes: Record<string, ClassAsset>;
  classesSorted: ClassAsset[];
  tracks: Record<string, TrackAsset>;
  tracksSorted: TrackAsset[];
  numClasses: number;
  numTracks: number;
}

export interface LeaderboardAsset {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface LeaderboardAssets {
  sourceUrl: string;
  fetchedAt: string;
  classes: LeaderboardAsset[];
  tracks: LeaderboardAsset[];
}

export interface ChampionshipEntry {
  alias: string;
  fileName: string;
  races: number;
  generatedAt: string;
  carName?: string;
  carIcon?: string;
  raceData?: ParsedRace[]; // Store parsed races for later viewing
}

export interface AITimeEntry {
  aiSkill: number;
  averagedLapTime: number;
  numberOfSampledRaces: number;
}

export interface PlayerLapTime {
  lapTime: number;
}

export interface SampledData {
  playerBestLapTimes?: PlayerLapTime[];
  aiSkillVsLapTimes?: AITimeEntry[];
}

export interface CarClassData {
  carClassId: number;
  sampledData: SampledData;
}

export interface TrackData {
  layoutId: number;
  value: CarClassData[];
}

export interface AIAdaptationData {
  AiAdaptation: {
    latestVersion: number;
    aiAdaptationData: TrackData[];
  };
}

export interface DatabaseClass {
  minAI?: number;
  maxAI?: number;
  tracks: Record<string, DatabaseTrack>;
}

export interface DatabaseTrack {
  minAI?: number;
  maxAI?: number;
  ailevels: Record<number, number[]>;
  samplesCount?: Record<number, number>;
}

export interface Database {
  classes: Record<string, DatabaseClass>;
}

export interface ProcessedDatabase extends Database {}

export interface PlayerTimes {
  classes: Record<string, PlayerTimesClass>;
}

export interface PlayerTimesClass {
  tracks: Record<string, PlayerTimesTrack>;
}

export interface PlayerTimesTrack {
  playertimes?: number[];
  playertime?: number;
}
