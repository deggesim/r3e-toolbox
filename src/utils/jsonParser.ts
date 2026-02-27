import type {
  RaceRoomData,
  Assets,
  TrackAsset,
  ClassAsset,
} from "../types/gameData";

/**
 * Parses RaceRoom's JSON database and extracts class and track information.
 * Creates lookup maps and sorted arrays for UI selection and display.
 * Combines track name and layout name for readability in UI.
 */
export const parseJson = (data: RaceRoomData): Assets => {
  // Build classes map
  const classes: Record<string, ClassAsset> = {};

  for (const [id, cls] of Object.entries(data.classes)) {
    classes[id] = { name: cls.Name, id };
  }

  // Build tracks map (note: each track can have multiple layouts)
  const tracks: Record<string, TrackAsset> = {};

  for (const track of Object.values(data.tracks)) {
    for (const layout of track.layouts) {
      const name = `${track.Name} - ${layout.Name}`;
      const layoutId = layout.Id.toString();
      tracks[layoutId] = { name, id: layoutId };
    }
  }

  return {
    classes,
    tracks,
  };
};
