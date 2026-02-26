// Types for aiadaptation.xml parsing and AI database

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

// Database types for processed AI data

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

// ProcessedDatabase is the result after applying fitting and validation
export type ProcessedDatabase = Database;

// Player times types

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
