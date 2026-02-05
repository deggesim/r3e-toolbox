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

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m}:${s.toFixed(3)}`;
  }
  return `${m}:${s.toFixed(3)}`;
};

const millisecondsToTime = (ms: number): string => {
  return formatTime(ms / 1000);
};

const resolveClassInfo = (
  vehicleId: number | undefined,
  gameData: RaceRoomData,
): { classId?: number; className?: string } => {
  if (!vehicleId || !gameData.cars) return {};
  const car = gameData.cars[String(vehicleId)];
  if (!car?.Class) return {};
  const classId = car.Class;
  const classData = gameData.classes?.[String(classId)];
  const className = classData?.Name;
  return { classId, className };
};

const resolveVehicleName = (
  vehicleId: number | undefined,
  gameData: RaceRoomData,
): string | undefined => {
  if (!vehicleId || !gameData.cars) return undefined;
  const car = gameData.cars[String(vehicleId)];
  return car?.Name;
};

const buildTrackLookup = (
  data: RaceRoomData,
): {
  byName: Map<string, TrackInfo>;
  byId: Map<number, TrackInfo>;
} => {
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
};

const findTrack = (
  trackName: string | undefined,
  layoutName: string | undefined,
  layoutId: number | undefined,
  trackLookup: Map<string, TrackInfo>,
  trackById: Map<number, TrackInfo>,
): TrackInfo | undefined => {
  if (layoutId) {
    return trackById.get(layoutId);
  }

  if (trackName) {
    const fullName = layoutName ? `${trackName} - ${layoutName}` : trackName;
    return trackLookup.get(fullName.toLowerCase());
  }

  return undefined;
};

const processSessionPlayers = (
  session: RaceSession,
  gameData: RaceRoomData,
): RaceSlot[] => {
  const slots: RaceSlot[] = [];

  for (const player of session.Players) {
    const driver = player.Username;
    const vehicleId = player.CarId;
    const vehicleName =
      player.CarName ||
      resolveVehicleName(vehicleId, gameData) ||
      (vehicleId ? String(vehicleId) : "");
    const team = player.Team || driver;

    const totalTime = player.TotalTime
      ? millisecondsToTime(player.TotalTime)
      : undefined;
    const bestLap = player.BestLapTime
      ? millisecondsToTime(player.BestLapTime)
      : undefined;

    slots.push({
      Driver: driver,
      Vehicle: vehicleName,
      VehicleId: vehicleId,
      UserId: player.UserId ? Number(player.UserId) : undefined,
      ClassName: player.ClassName,
      ClassId: player.ClassId,
      Team: team,
      FinishTime: totalTime,
      TotalTime: totalTime,
      BestLap: bestLap,
      FinishStatus: player.FinishStatus,
    });
  }

  return slots;
};

const resolveMissingClassInfo = (
  slots: RaceSlot[],
  gameData: RaceRoomData,
): void => {
  for (const slot of slots) {
    if (!slot.ClassName && !slot.ClassId && slot.VehicleId) {
      const { classId, className } = resolveClassInfo(slot.VehicleId, gameData);
      if (classId) slot.ClassId = classId;
      if (className) slot.ClassName = className;
    }
  }
};

const addQualifyingTimes = (
  slots: RaceSlot[],
  sessQualify: RaceSession | undefined,
): void => {
  if (!sessQualify) return;
  for (const player of sessQualify.Players) {
    const slot = slots.find((s) => s.Driver === player.Username);
    if (slot && player.QualifyingTime) {
      slot.QualTime = millisecondsToTime(player.QualifyingTime);
    }
  }
};

const parseMultiplayerResult = (
  json: MultiplayerRaceResult,
  gameData: RaceRoomData,
  ruleset: string,
): ParsedRace[] | null => {
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

  const slots1 = processSessionPlayers(sessRace, gameData);
  resolveMissingClassInfo(slots1, gameData);
  addQualifyingTimes(slots1, sessQualify);

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
    const slots2 = processSessionPlayers(sessRace2, gameData);
    resolveMissingClassInfo(slots2, gameData);
    addQualifyingTimes(slots2, sessQualify);
    results.push({
      trackname: trackInfo.name,
      trackid: trackInfo.layoutId,
      timestring: date2.toLocaleString("en-US"),
      slots: slots2,
      ruleset,
    });
  }

  return results;
};

const buildSinglePlayerRaceSlot = (
  driver: any,
  gameData: RaceRoomData,
): RaceSlot => {
  const totalTime = driver.raceTimeMs
    ? millisecondsToTime(driver.raceTimeMs)
    : undefined;
  const bestLap = driver.bestLapTimeMs
    ? millisecondsToTime(driver.bestLapTimeMs)
    : undefined;
  const qualTime = driver.qualTimeMs
    ? millisecondsToTime(driver.qualTimeMs)
    : undefined;

  // Resolve team name from teamId if available
  let teamName = driver.teamName || "";
  if (!teamName && driver.teamId && gameData.teams) {
    const team = gameData.teams[String(driver.teamId)];
    teamName = team?.Name || "";
  }
  // Fallback to driver name if team is still empty
  if (!teamName) {
    teamName = driver.name;
  }

  const vehicleId = driver.carId || undefined;
  const { classId, className } = resolveClassInfo(vehicleId, gameData);
  const vehicleName =
    driver.carName ||
    resolveVehicleName(vehicleId, gameData) ||
    (vehicleId ? String(vehicleId) : "");

  const rawUserId =
    driver.userId ?? driver.UserId ?? driver.userid ?? undefined;
  const isStringUserId = typeof rawUserId === "string";
  const isNumberUserId = typeof rawUserId === "number";
  let userId: number | undefined;
  if (isStringUserId) {
    userId = Number(rawUserId);
  } else if (isNumberUserId) {
    userId = rawUserId;
  } else {
    userId = undefined;
  }

  return {
    Driver: driver.name,
    Vehicle: vehicleName,
    VehicleId: vehicleId,
    UserId: Number.isFinite(userId) ? userId : undefined,
    ClassName: driver.className || driver.ClassName || className,
    ClassId: driver.classId ?? driver.ClassId ?? classId,
    Team: teamName,
    FinishTime: totalTime,
    TotalTime: totalTime,
    BestLap: bestLap,
    QualTime: qualTime,
    FinishStatus: driver.finishStatus,
  };
};

const parseSinglePlayerResult = (
  json: SinglePlayerRaceResult,
  gameData: RaceRoomData,
  ruleset: string,
): ParsedRace | null => {
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
  const slots: RaceSlot[] = json.drivers.map((driver) =>
    buildSinglePlayerRaceSlot(driver, gameData),
  );

  return {
    trackname: trackInfo.name,
    trackid: trackInfo.layoutId,
    timestring,
    slots,
    ruleset,
  };
};

export const parseResultFile = async (
  file: File,
  gameData: RaceRoomData,
  ruleset: string = "default",
): Promise<ParsedRace[] | null> => {
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
};

export const parseResultFiles = async (
  files: File[],
  gameData: RaceRoomData,
  ruleset: string = "default",
): Promise<ParsedRace[]> => {
  const allRaces: ParsedRace[] = [];

  for (const file of files) {
    const races = await parseResultFile(file, gameData, ruleset);
    if (races) {
      races.forEach((race) => {
        race.filename = file.name;
      });
      allRaces.push(...races);
    }
  }

  return allRaces;
};
