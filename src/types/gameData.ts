// Types for RaceRoom game data (r3e-data.json)

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

// Asset types for UI rendering

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
  tracks: Record<string, TrackAsset>;
}

// Leaderboard asset types for caching

export interface LeaderboardAsset {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface LeaderboardAssets {
  sourceUrl: string;
  fetchedAt: string;
  cars: LeaderboardAsset[];
  tracks: LeaderboardAsset[];
}
