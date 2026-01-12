import { XMLParser } from "fast-xml-parser";
import type { Database, PlayerTimes } from "../types";

/**
 * Parses RaceRoom's aiadaptation.xml file structure.
 * Handles mixed array/object patterns in XML (single vs multiple entries).
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

/**
 * Normalizes XML data to always be an array
 */
function toArray<T>(data: T | T[]): T[] {
  return Array.isArray(data) ? data : [data];
}

/**
 * Processes player lap times for a track/class combination
 */
function processPlayerTimes(
  playerentries: any,
  playertimes: PlayerTimes,
  classid: string,
  trackid: string
): void {
  const class_pt = playertimes.classes[classid] || { tracks: {} };
  playertimes.classes[classid] = class_pt;
  const track_pt = class_pt.tracks[trackid] || {
    playertimes: [],
    playertime: undefined,
  };
  class_pt.tracks[trackid] = track_pt;

  const lapTimes = toArray(playerentries.lapTime);
  const allTimes: number[] = [];
  let mintime = 1000000;

  for (const entry of lapTimes) {
    if (entry) {
      const playertime = Number.parseFloat(entry["#text"] || entry);
      if (!Number.isNaN(playertime)) {
        allTimes.push(playertime);
        mintime = Math.min(playertime, mintime);
      }
    }
  }

  if (allTimes.length > 0) {
    track_pt.playertimes = allTimes;
    track_pt.playertime = mintime;
  }
}

/**
 * Processes AI skill levels and lap times for a track/class combination
 */
function processAIEntries(
  aientries: any,
  database: Database,
  classid: string,
  trackid: string
): boolean {
  const aiSkills = toArray(aientries.aiSkill);
  const aiDatas = toArray(aientries.aiData);

  if (aiSkills.length !== aiDatas.length) return false;

  const class_db = database.classes[classid] || { tracks: {} };
  const track_db = class_db.tracks[trackid] || {
    ailevels: {},
    samplesCount: {},
  };

  let added = false;

  for (let k = 0; k < aiSkills.length; k++) {
    const ailevel = Number.parseInt(aiSkills[k]["#text"] || aiSkills[k]);
    const aitime = Number.parseFloat(
      aiDatas[k].averagedLapTime["#text"] || aiDatas[k].averagedLapTime
    );
    const numSamples = Number.parseInt(
      aiDatas[k].numberOfSampledRaces?.["#text"] ??
        aiDatas[k].numberOfSampledRaces ??
        "1"
    );

    if (Number.isNaN(aitime)) continue;

    class_db.minAI = Math.min(ailevel, class_db.minAI || ailevel);
    class_db.maxAI = Math.max(ailevel, class_db.maxAI || ailevel);
    track_db.minAI = Math.min(ailevel, track_db.minAI || ailevel);
    track_db.maxAI = Math.max(ailevel, track_db.maxAI || ailevel);

    const times = track_db.ailevels[ailevel] || [];
    track_db.ailevels[ailevel] = times;

    const samplesCount = track_db.samplesCount || {};
    track_db.samplesCount = samplesCount;
    samplesCount[ailevel] = numSamples;

    if (!times.includes(aitime)) {
      added = true;
      times.push(aitime);
    }
  }

  if (track_db.maxAI !== undefined) {
    class_db.tracks[trackid] = track_db;
    database.classes[classid] = class_db;
  }

  return added;
}

/**
 * Processes a single class entry for a track
 */
function processClassEntry(
  classkey: any,
  classcustom: any,
  trackid: string,
  database: Database,
  playertimes?: PlayerTimes
): boolean {
  if (!classkey || !classcustom) return false;

  const classid = classkey["#text"]?.toString();
  if (!classid) return false;

  const playerentries = classcustom.playerBestLapTimes;
  const aientries = classcustom.aiSkillVsLapTimes;

  if (playertimes && playerentries) {
    processPlayerTimes(playerentries, playertimes, classid, trackid);
  }

  if (aientries) {
    return processAIEntries(aientries, database, classid, trackid);
  }

  return false;
}

/**
 * Processes a single track entry
 */
function processTrackEntry(
  trackkey: any,
  trackvalue: any,
  database: Database,
  playertimes?: PlayerTimes
): boolean {
  if (!trackkey || !trackvalue) return false;

  const trackid = trackkey["#text"]?.toString();
  if (!trackid || typeof trackvalue !== "object") return false;

  const carClassIds = toArray(trackvalue.carClassId);
  const sampledDatas = toArray(trackvalue.sampledData);

  if (carClassIds.length !== sampledDatas.length) return false;

  let added = false;
  for (let j = 0; j < carClassIds.length; j++) {
    if (
      processClassEntry(
        carClassIds[j],
        sampledDatas[j],
        trackid,
        database,
        playertimes
      )
    ) {
      added = true;
    }
  }

  return added;
}

/**
 * Parses the aiadaptation.xml file and populates database and player times.
 * Extracts AI skill levels, lap times, and number of sampled races for each track/class combo.
 * Preserves both single best player lap time and array of all player lap times.
 * Returns true if data was successfully parsed and added.
 */
export function parseAdaptive(
  xmlText: string,
  database: Database,
  playertimes?: PlayerTimes
): boolean {
  const xml = parser.parse(xmlText);
  if (!xml) return false;

  const tracklist = xml.AiAdaptation.aiAdaptationData;
  if (!tracklist || typeof tracklist !== "object") return false;

  const layoutIds = toArray(tracklist.layoutId);
  const values = toArray(tracklist.value);

  if (layoutIds.length !== values.length) return false;

  let added = false;
  for (let i = 0; i < layoutIds.length; i++) {
    if (processTrackEntry(layoutIds[i], values[i], database, playertimes)) {
      added = true;
    }
  }

  return added;
}
