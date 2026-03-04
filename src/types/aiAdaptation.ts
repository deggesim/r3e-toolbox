// Type definitions for aiadaptation.xml structure (fast-xml-parser output)
export interface XMLTextElement {
  "#text"?: string;
}

export interface PlayerBestLapTimesData {
  lapTime: XMLTextElement | string | (XMLTextElement | string)[];
}

export interface AIDataEntry {
  averagedLapTime: XMLTextElement | string | number;
  numberOfSampledRaces?: XMLTextElement | string | number;
}

export interface AISkillVsLapTimesData {
  aiSkill: XMLTextElement | string | (XMLTextElement | string)[];
  aiData: AIDataEntry | AIDataEntry[];
}

export interface SampledDataEntry {
  playerBestLapTimes?: PlayerBestLapTimesData;
  aiSkillVsLapTimes?: AISkillVsLapTimesData;
}

export interface TrackValueData {
  carClassId: XMLTextElement | string | (XMLTextElement | string)[];
  sampledData: SampledDataEntry | SampledDataEntry[];
}

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
