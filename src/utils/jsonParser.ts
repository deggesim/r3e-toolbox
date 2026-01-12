import type { RaceRoomData, Assets, TrackAsset, ClassAsset } from '../types';

/**
 * Parses RaceRoom's JSON database and extracts class and track information.
 * Creates lookup maps and sorted arrays for UI selection and display.
 * Combines track name and layout name for readability in UI.
 */
export function parseJson(data: RaceRoomData): Assets {
  // Build classes map and list
  const numClasses = Object.keys(data.classes).length;
  const classes: Record<string, ClassAsset> = {};
  const classesSorted: ClassAsset[] = [];

  for (const [id, cls] of Object.entries(data.classes)) {
    const tab: ClassAsset = { name: cls.Name, id };
    classesSorted.push(tab);
    classes[id] = tab;
  }

  // Build tracks map and list (note: each track can have multiple layouts)
  const tracks: Record<string, TrackAsset> = {};
  const tracksSorted: TrackAsset[] = [];
  let numTracks = 0;

  for (const track of Object.values(data.tracks)) {
    for (const layout of track.layouts) {
      const name = `${track.Name} - ${layout.Name}`;
      const layoutId = layout.Id.toString();
      const tab: TrackAsset = { name, id: layoutId };
      tracksSorted.push(tab);
      tracks[layoutId] = tab;
      numTracks++;
    }
  }

  // Sort by name alphabetically for UI display
  classesSorted.sort((a, b) => a.name.localeCompare(b.name));
  tracksSorted.sort((a, b) => a.name.localeCompare(b.name));

  return {
    classes,
    classesSorted,
    tracks,
    tracksSorted,
    numClasses,
    numTracks,
  };
}