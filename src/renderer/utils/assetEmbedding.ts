/**
 * Asset Embedding Utility
 * Downloads external assets (leaderboard icons) and converts them to base64 data URIs
 * for embedding in offline-capable HTML exports.
 */

import type { ChampionshipEntry } from "../types/raceResults";
import type { LeaderboardAssets } from "../types/gameData";

export interface AssetDownloadProgress {
  current: number;
  total: number;
  url: string;
}

export type ProgressCallback = (progress: AssetDownloadProgress) => void;

/**
 * Downloads an image from a URL and converts it to a base64 data URI
 * @param url - The URL of the image to download
 * @returns Base64 data URI (e.g., "data:image/png;base64,...")
 */
const downloadAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Convert blob to base64
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert blob to base64"));
        }
      };
      reader.onerror = () => reject(new Error("FileReader error"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(
      `Failed to download ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Downloads multiple assets and converts them to base64 data URIs
 * @param iconUrls - Array of icon URLs to download
 * @param onProgress - Optional callback for progress updates
 * @returns Map of original URL to base64 data URI
 */
export async function downloadAndEmbedAssets(
  iconUrls: string[],
  onProgress?: ProgressCallback,
): Promise<Map<string, string>> {
  const assetMap = new Map<string, string>();
  const uniqueUrls = Array.from(new Set(iconUrls)).filter(
    (url) => url && url.trim() !== "",
  );

  if (uniqueUrls.length === 0) {
    return assetMap;
  }

  for (let i = 0; i < uniqueUrls.length; i++) {
    const url = uniqueUrls[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: uniqueUrls.length,
        url,
      });
    }

    try {
      const base64 = await downloadAsBase64(url);
      assetMap.set(url, base64);
    } catch (error) {
      // Log error but continue with other assets
      console.warn(`Failed to embed asset ${url}:`, error);
      // Keep original URL as fallback
      assetMap.set(url, url);
    }
  }

  return assetMap;
}

/**
 * Extracts all unique icon URLs from championship data and leaderboard assets
 * @param championships - Array of championship entries
 * @param leaderboardAssets - Optional leaderboard assets with car and track icons
 * @returns Array of unique icon URLs
 */

/**
 * Extracts track icon URL from leaderboard assets
 */
const extractTrackIconUrl = (
  trackName: string,
  leaderboardAssets?: LeaderboardAssets | null,
): string | null => {
  if (!leaderboardAssets) return null;

  const trackAsset = leaderboardAssets.tracks.find((t) => t.name === trackName);
  return trackAsset?.iconUrl || null;
};

/**
 * Extracts vehicle icon URLs from race slots using leaderboard assets
 */
const extractVehicleIconUrls = (
  slots: Array<{ vehicleId?: number }>,
  leaderboardAssets?: LeaderboardAssets | null,
): string[] => {
  if (!leaderboardAssets) return [];

  const urls: string[] = [];
  for (const slot of slots) {
    if (slot.vehicleId !== undefined) {
      const carAsset = leaderboardAssets.cars.find(
        (c) => c.id === String(slot.vehicleId),
      );
      if (carAsset?.iconUrl) {
        urls.push(carAsset.iconUrl);
      }
    }
  }
  return urls;
};

/**
 * Extracts icon URLs from a single championship's race data
 */
const extractRaceDataIconUrls = (
  raceData: Array<{ trackname: string; slots: Array<{ vehicleId?: number }> }>,
  leaderboardAssets?: LeaderboardAssets | null,
): string[] => {
  const urls: string[] = [];

  for (const race of raceData) {
    // Extract track icon
    const trackIconUrl = extractTrackIconUrl(race.trackname, leaderboardAssets);
    if (trackIconUrl) {
      urls.push(trackIconUrl);
    }

    // Extract vehicle icons
    const vehicleIconUrls = extractVehicleIconUrls(
      race.slots,
      leaderboardAssets,
    );
    urls.push(...vehicleIconUrls);
  }

  return urls;
};

/**
 * Extracts all unique icon URLs from championship data and leaderboard assets
 */
export const extractIconUrls = (
  championships: ChampionshipEntry[],
  leaderboardAssets?: LeaderboardAssets | null,
): string[] => {
  const urls = new Set<string>();

  // Extract car icons from championship metadata
  for (const championship of championships) {
    if (championship.carIcon) {
      urls.add(championship.carIcon);
    }

    // Extract icons from race data
    if (championship.raceData && Array.isArray(championship.raceData)) {
      const raceIconUrls = extractRaceDataIconUrls(
        championship.raceData,
        leaderboardAssets,
      );
      for (const url of raceIconUrls) {
        urls.add(url);
      }
    }
  }

  return Array.from(urls).filter((url) => url && url.trim() !== "");
};
