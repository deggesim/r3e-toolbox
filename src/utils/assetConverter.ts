import type { LeaderboardAssets } from "../types";

/**
 * Converts LeaderboardAssets to HTML-friendly format with icon URL maps
 * Supports indexing by both name and ID
 */
export function convertAssetsForHTML(
  assets: LeaderboardAssets | null,
  includeCarNames: boolean = false,
) {
  if (!assets) return undefined;

  const carsMap: Record<string, string> = {};
  const tracksMap: Record<string, string> = {};
  const carNamesMap: Record<string, string> = {};

  assets.cars.forEach((c) => {
    // Index by both name and ID
    carsMap[c.name] = c.iconUrl || "";
    carsMap[c.id] = c.iconUrl || "";
    if (includeCarNames) {
      carNamesMap[c.id] = c.name;
    }
  });

  assets.tracks.forEach((t) => {
    // Index by both name and ID
    tracksMap[t.name] = t.iconUrl || "";
    tracksMap[t.id] = t.iconUrl || "";
  });

  const result: any = { cars: carsMap, tracks: tracksMap };
  if (includeCarNames) {
    result.carNames = carNamesMap;
  }

  return result;
}
