import type { RaceRoomData } from "../types/gameData";
import type {
  ParsedRace,
  RaceSlot,
  ServerEventPlayer,
  ServerEventResult,
  ServerEventSession,
} from "../types/raceResults";
import {
  buildTrackLookup,
  millisecondsToTime,
  resolveClassInfo,
  resolveVehicleName,
} from "./raceResultParser";

export const isServerEventFormat = (json: unknown): json is ServerEventResult =>
  typeof json === "object" &&
  json !== null &&
  "Server" in json &&
  typeof (json as Record<string, unknown>).Server === "string" &&
  "Track" in json &&
  typeof (json as Record<string, unknown>).Track === "string" &&
  "Sessions" in json &&
  Array.isArray((json as Record<string, unknown>).Sessions);

export const extractServerEventAlias = (data: ServerEventResult): string =>
  data.Server;

const unixSecondsToTimestring = (unixSeconds: number): string => {
  const d = new Date(unixSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join("_");
};

const buildQualifyMap = (sessions: ServerEventSession[]): Map<number, string> => {
  const qualSession = sessions.find((s) => s.Type === "Qualify");
  const map = new Map<number, string>();
  if (!qualSession) return map;
  for (const player of qualSession.Players) {
    if (player.BestLapTime > 0) {
      map.set(player.UserId, millisecondsToTime(player.BestLapTime));
    }
  }
  return map;
};

const buildServerEventSlot = (
  player: ServerEventPlayer,
  qualMap: Map<number, string>,
  gameData: RaceRoomData,
): RaceSlot => {
  const { classId, className } = resolveClassInfo(player.CarId, gameData);
  const resolvedVehicleName = resolveVehicleName(player.CarId, gameData);
  const bestLap = player.BestLapTime > 0 ? millisecondsToTime(player.BestLapTime) : undefined;
  const totalTime = player.TotalTime > 0 ? millisecondsToTime(player.TotalTime) : undefined;
  return {
    driver: player.FullName,
    vehicle: resolvedVehicleName ?? player.Car,
    vehicleId: player.CarId,
    userId: player.UserId,
    className,
    classId,
    team: player.FullName,
    bestLap,
    totalTime,
    finishTime: totalTime,
    qualTime: qualMap.get(player.UserId),
    position: player.Position,
    finishStatus: player.FinishStatus,
    totalLaps: player.RaceSessionLaps.length,
  };
};

export const parseServerEventData = (
  data: ServerEventResult,
  gameData: RaceRoomData,
  ruleset = "default",
): ParsedRace[] | null => {
  const raceSession = data.Sessions.find((s) => s.Type === "Race");
  if (!raceSession) {
    console.warn("No Race session found in server event data");
    return null;
  }

  const { byName: trackLookup } = buildTrackLookup(gameData);
  const trackKey = `${data.Track} - ${data.TrackLayout}`.toLowerCase();
  const trackInfo = trackLookup.get(trackKey);

  if (!trackInfo) {
    console.warn(`Track not found in game data: "${data.Track} - ${data.TrackLayout}"`);
  }

  const timestring = unixSecondsToTimestring(data.StartTime);
  const qualMap = buildQualifyMap(data.Sessions);

  const slots: RaceSlot[] = raceSession.Players
    .toSorted((a, b) => a.Position - b.Position)
    .map((player) => buildServerEventSlot(player, qualMap, gameData));

  return [
    {
      trackname: trackInfo?.name ?? `${data.Track} - ${data.TrackLayout}`,
      trackid: trackInfo?.layoutId ?? 0,
      timestring,
      slots,
      ruleset,
    },
  ];
};
