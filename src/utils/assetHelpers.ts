import type { Assets, ClassAsset, TrackAsset } from "../types/gameData";

/**
 * Get sorted array of classes from Assets, ordered alphabetically by name
 */
export const getClassesSorted = (assets: Assets): ClassAsset[] => {
  return Object.values(assets.classes).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
};

/**
 * Get sorted array of tracks from Assets, ordered alphabetically by name
 */
export const getTracksSorted = (assets: Assets): TrackAsset[] => {
  return Object.values(assets.tracks).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
};
