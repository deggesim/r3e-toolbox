import type { RaceRoomData } from "../types";
import type {
  MultiplayerRaceResult,
  ParsedRace,
  RaceSession,
  RaceSlot,
  SinglePlayerRaceResult,
} from "../types/raceResults";

interface TrackInfo {
  layoutId: number;
  name: string;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m}:${s.toFixed(3)}`;
  }
  return `${m}:${s.toFixed(3)}`;
}

function millisecondsToTime(ms: number): string {
  return formatTime(ms / 1000);
}

function buildTrackLookup(data: RaceRoomData): {
  byName: Map<string, TrackInfo>;
  byId: Map<number, TrackInfo>;
} {
  const byName = new Map<string, TrackInfo>();
  const byId = new Map<number, TrackInfo>();

  for (const track of Object.values(data.tracks)) {
    for (const layout of track.layouts) {
      const name = `${track.Name}${layout.Name ? " - " + layout.Name : ""}`;
      const info: TrackInfo = { layoutId: layout.Id, name };
      byName.set(name.toLowerCase(), info);
      byId.set(layout.Id, info);
    }
  }

  return { byName, byId };
}

function findTrack(
  trackName: string | undefined,
  layoutName: string | undefined,
  layoutId: number | undefined,
  trackLookup: Map<string, TrackInfo>,
  trackById: Map<number, TrackInfo>,
): TrackInfo | undefined {
  if (layoutId) {
    return trackById.get(layoutId);
  }

  if (trackName) {
    const fullName = layoutName ? `${trackName} - ${layoutName}` : trackName;
    return trackLookup.get(fullName.toLowerCase());
  }

  return undefined;
}

function parseMultiplayerResult(
  json: MultiplayerRaceResult,
  gameData: RaceRoomData,
  ruleset: string,
): ParsedRace[] | null {
  const { byName: trackLookup, byId: trackById } = buildTrackLookup(gameData);

  const trackName = json.Track;
  const layoutName = json.TrackLayout;
  const trackInfo = findTrack(
    trackName,
    layoutName,
    undefined,
    trackLookup,
    trackById,
  );

  if (!trackInfo) {
    console.warn("Track not found:", trackName, layoutName);
    return null;
  }

  const timestamp =
    typeof json.Time === "string"
      ? Math.floor(Number(/(\d+)/.exec(json.Time)?.[1] || 0) / 1000)
      : json.Time;
  const date = new Date(timestamp * 1000);
  const timestring = date.toLocaleString("en-US");

  const sessQualify = json.Sessions.find((s) => s.Type === "Qualify");
  const sessRace = json.Sessions.find((s) => s.Type === "Race");
  const sessRace2 = json.Sessions.find((s) => s.Type === "Race2");

  if (!sessRace) {
    console.warn("No race session found");
    return null;
  }

  const processSession = (session: RaceSession): RaceSlot[] => {
    const slots: RaceSlot[] = [];

    for (const player of session.Players) {
      const driver = player.Username;
      const vehicle = player.CarName || String(player.CarId || "");
      const team = player.Team || "";

      const totalTime = player.TotalTime
        ? millisecondsToTime(player.TotalTime)
        : undefined;
      const bestLap = player.BestLapTime
        ? millisecondsToTime(player.BestLapTime)
        : undefined;

      slots.push({
        Driver: driver,
        Vehicle: vehicle,
        Team: team,
        FinishTime: totalTime,
        TotalTime: totalTime,
        BestLap: bestLap,
        FinishStatus: player.FinishStatus,
      });
    }

    return slots;
  };

  const slots1 = processSession(sessRace);

  // Add qualifying times
  if (sessQualify) {
    for (const player of sessQualify.Players) {
      const slot = slots1.find((s) => s.Driver === player.Username);
      if (slot && player.QualifyingTime) {
        slot.QualTime = millisecondsToTime(player.QualifyingTime);
      }
    }
  }

  const results: ParsedRace[] = [
    {
      trackname: trackInfo.name,
      trackid: trackInfo.layoutId,
      timestring,
      slots: slots1,
      ruleset,
    },
  ];

  if (sessRace2) {
    const date2 = new Date((timestamp + 1) * 1000);
    results.push({
      trackname: trackInfo.name,
      trackid: trackInfo.layoutId,
      timestring: date2.toLocaleString("en-US"),
      slots: processSession(sessRace2),
      ruleset,
    });
  }

  return results;
}

function parseSinglePlayerResult(
  json: SinglePlayerRaceResult,
  gameData: RaceRoomData,
  ruleset: string,
): ParsedRace | null {
  const { byName: trackLookup, byId: trackById } = buildTrackLookup(gameData);

  const trackInfo = findTrack(
    json.event.track,
    json.event.layout,
    json.event.layoutId,
    trackLookup,
    trackById,
  );

  if (!trackInfo) {
    console.warn("Track not found:", json.event);
    return null;
  }

  const timestring = json.header.time;
  const slots: RaceSlot[] = [];

  for (const driver of json.drivers) {
    const totalTime = driver.raceTimeMs
      ? millisecondsToTime(driver.raceTimeMs)
      : undefined;
    const bestLap = driver.bestLapTimeMs
      ? millisecondsToTime(driver.bestLapTimeMs)
      : undefined;
    const qualTime = driver.qualTimeMs
      ? millisecondsToTime(driver.qualTimeMs)
      : undefined;

    slots.push({
      Driver: driver.name,
      Vehicle: driver.carName || String(driver.carId || ""),
      Team: driver.teamName || "",
      FinishTime: totalTime,
      TotalTime: totalTime,
      BestLap: bestLap,
      QualTime: qualTime,
      FinishStatus: driver.finishStatus,
    });
  }

  return {
    trackname: trackInfo.name,
    trackid: trackInfo.layoutId,
    timestring,
    slots,
    ruleset,
  };
}

export async function parseResultFile(
  file: File,
  gameData: RaceRoomData,
  ruleset: string = "default",
): Promise<ParsedRace[] | null> {
  try {
    // Validate file extension
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "json" && ext !== "txt") {
      console.warn(`Skipping file with unsupported extension: ${file.name}`);
      return null;
    }

    const text = await file.text();

    // Check if text looks like JSON before parsing
    const trimmed = text.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      console.warn(`File doesn't appear to be JSON: ${file.name}`);
      return null;
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch (parseError) {
      console.warn(
        `Failed to parse JSON in file: ${file.name}`,
        parseError instanceof Error ? parseError.message : "",
      );
      return null;
    }

    if (json.Server || json.Sessions) {
      // Multiplayer/dedicated server format
      return parseMultiplayerResult(
        json as MultiplayerRaceResult,
        gameData,
        ruleset,
      );
    } else if (json.header && json.drivers) {
      // Single player format
      const result = parseSinglePlayerResult(
        json as SinglePlayerRaceResult,
        gameData,
        ruleset,
      );
      return result ? [result] : null;
    }

    console.warn(`Unknown or unsupported result format in ${file.name}`);
    return null;
  } catch (error) {
    console.error(
      `Error parsing result file: ${file.name}`,
      error instanceof Error ? error.message : "",
    );
    return null;
  }
}

export async function parseResultFiles(
  files: File[],
  gameData: RaceRoomData,
  ruleset: string = "default",
): Promise<ParsedRace[]> {
  const allRaces: ParsedRace[] = [];

  // Filter only race files (Race.txt, Race1.txt, Race2.txt - max 2 per event)
  const raceFiles = files.filter((file) => {
    const name = file.name.toLowerCase();
    return (
      name.endsWith("race.txt") ||
      name.endsWith("race.json") ||
      name.endsWith("race1.txt") ||
      name.endsWith("race1.json") ||
      name.endsWith("race2.txt") ||
      name.endsWith("race2.json")
    );
  });

  for (const file of raceFiles) {
    const races = await parseResultFile(file, gameData, ruleset);
    if (races) {
      races.forEach((race) => {
        race.filename = file.name;
      });
      allRaces.push(...races);
    }
  }

  return allRaces;
}
