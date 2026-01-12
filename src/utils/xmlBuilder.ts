import type { Assets, Database, PlayerTimes } from "../types";

/**
 * Formats numbers for XML export: converts to fixed 4 decimals then removes trailing zeros.
 * Example: 1.2500 -> 1.25, 1.0000 -> 1
 */
function formatNumber(value: number): string {
  const formatted = value.toFixed(4);
  return formatted.replace(/\.?0+$/, "").replace(/\.0+$/, "");
}

/**
 * Builds an empty matrix of all track/class combinations sorted numerically by ID.
 * This ensures the XML export includes all combinations even if they have no AI data.
 */
function buildEmptyMatrix(
  assets: Assets
): Map<
  string,
  Map<
    string,
    {
      aiData: Record<number, number[]>;
      samplesCount: Record<number, number>;
      playerTimes: number[];
    }
  >
> {
  const trackMap = new Map<
    string,
    Map<
      string,
      {
        aiData: Record<number, number[]>;
        samplesCount: Record<number, number>;
        playerTimes: number[];
      }
    >
  >();

  // Sort tracks by ID numerically to match original XML format
  const sortedTracks = [...assets.tracksSorted].sort(
    (a, b) => Number.parseInt(a.id) - Number.parseInt(b.id)
  );
  // Sort classes by ID numerically to match original XML format
  const sortedClasses = [...assets.classesSorted].sort(
    (a, b) => Number.parseInt(a.id) - Number.parseInt(b.id)
  );

  // Initialize all track/class combinations with empty data
  for (const track of sortedTracks) {
    const classMap = new Map<
      string,
      {
        aiData: Record<number, number[]>;
        samplesCount: Record<number, number>;
        playerTimes: number[];
      }
    >();
    for (const cls of sortedClasses) {
      classMap.set(cls.id, { aiData: {}, samplesCount: {}, playerTimes: [] });
    }
    trackMap.set(track.id, classMap);
  }

  return trackMap;
}

/**
 * Merges AI data from database into the track map
 */
function mergeAIData(
  database: Database,
  trackMap: Map<
    string,
    Map<
      string,
      {
        aiData: Record<number, number[]>;
        samplesCount: Record<number, number>;
        playerTimes: number[];
      }
    >
  >
): void {
  for (const [classId, classData] of Object.entries(database.classes)) {
    for (const [trackId, trackData] of Object.entries(classData.tracks)) {
      const classMap = trackMap.get(trackId);
      if (!classMap) continue;
      const entry = classMap.get(classId);
      if (!entry) continue;
      entry.aiData = trackData.ailevels || {};
      entry.samplesCount = trackData.samplesCount || {};
    }
  }
}

/**
 * Merges player times into the track map
 */
function mergePlayerTimes(
  playerTimes: PlayerTimes,
  trackMap: Map<
    string,
    Map<
      string,
      {
        aiData: Record<number, number[]>;
        samplesCount: Record<number, number>;
        playerTimes: number[];
      }
    >
  >
): void {
  for (const [classId, classData] of Object.entries(playerTimes.classes)) {
    for (const [trackId, trackData] of Object.entries(classData.tracks)) {
      const classMap = trackMap.get(trackId);
      if (!classMap) continue;
      const entry = classMap.get(classId);
      if (!entry) continue;
      // Support both array of all times (playertimes) and single best time (playertime)
      if (trackData.playertimes && Array.isArray(trackData.playertimes)) {
        entry.playerTimes = trackData.playertimes;
      } else if (trackData.playertime !== undefined) {
        entry.playerTimes = [trackData.playertime];
      }
    }
  }
}

/**
 * Builds player best lap times XML section
 */
function buildPlayerTimesXML(playerTimes: number[], lines: string[]): void {
  let playerTimeIndex = 0;
  for (const playerTime of playerTimes) {
    lines.push(
      `          <!-- Index:${playerTimeIndex} -->`,
      `          <lapTime type="float32">${formatNumber(playerTime)}</lapTime>`
    );
    playerTimeIndex++;
  }
}

/**
 * Builds AI skill vs lap times XML section
 */
function buildAISkillXML(
  aiData: Record<number, number[]>,
  samplesCount: Record<number, number>,
  lines: string[]
): void {
  let aiIndex = 0;
  const aiLevels = Object.keys(aiData)
    .map(Number)
    .sort((a, b) => a - b);
  for (const aiLevel of aiLevels) {
    const times = aiData[aiLevel];
    if (times && times.length > 0) {
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      // Preserve original samples count; generated entries carry 0, avoid null/NaN
      const storedSamples = samplesCount?.[aiLevel];
      const samples = storedSamples === undefined ? 1 : storedSamples ?? 0;
      lines.push(
        `          <!-- Index:${aiIndex} -->`,
        `          <aiSkill type="uint32">${aiLevel}</aiSkill>`,
        "          <aiData>",
        `            <averagedLapTime type="float32">${formatNumber(
          avgTime
        )}</averagedLapTime>`,
        `            <numberOfSampledRaces type="uint32">${samples}</numberOfSampledRaces>`,
        "          </aiData>"
      );
      aiIndex++;
    }
  }
}

/**
 * Builds class data XML section
 */
function buildClassDataXML(
  sortedClasses: Array<{ id: string; name: string }>,
  classMap: Map<
    string,
    {
      aiData: Record<number, number[]>;
      samplesCount: Record<number, number>;
      playerTimes: number[];
    }
  >,
  lines: string[]
): void {
  let classIndex = 0;
  for (const cls of sortedClasses) {
    const data = classMap.get(cls.id)!;
    lines.push(
      `      <!-- Index:${classIndex} -->`,
      `      <carClassId type="int32">${cls.id}</carClassId>`,
      "      <sampledData>",
      "        <playerBestLapTimes>"
    );

    buildPlayerTimesXML(data.playerTimes, lines);

    lines.push("        </playerBestLapTimes>", "        <aiSkillVsLapTimes>");

    buildAISkillXML(data.aiData, data.samplesCount, lines);

    lines.push("        </aiSkillVsLapTimes>", "      </sampledData>");
    classIndex++;
  }
}

/**
 * Builds the complete aiadaptation.xml file content.
 * Creates a full matrix of all track/class combinations, merges database and player times,
 * sorts everything numerically by ID, and formats output to match RaceRoom's structure.
 */
export function buildXML(
  database: Database,
  playerTimes: PlayerTimes,
  assets: Assets
): string {
  const lines: string[] = [];

  // Build XML header without declaration (to match original format)
  lines.push(
    '<AiAdaptation ID="/aiadaptation">',
    '  <latestVersion type="uint32">0</latestVersion>',
    "  <aiAdaptationData>"
  );

  // Initialize empty matrix with all track/class combinations
  const trackMap = buildEmptyMatrix(assets);

  // Merge AI data from database into the matrix
  mergeAIData(database, trackMap);

  // Merge player times from the player times structure
  mergePlayerTimes(playerTimes, trackMap);

  // Sort tracks and classes by ID numerically
  const sortedTracks = [...assets.tracksSorted].sort(
    (a, b) => Number.parseInt(a.id) - Number.parseInt(b.id)
  );
  const sortedClasses = [...assets.classesSorted].sort(
    (a, b) => Number.parseInt(a.id) - Number.parseInt(b.id)
  );

  let trackIndex = 0;
  for (const track of sortedTracks) {
    const classMap = trackMap.get(track.id);
    if (!classMap) continue;

    lines.push(
      `    <!-- Index:${trackIndex} -->`,
      `    <layoutId type="int32">${track.id}</layoutId>`,
      "    <value>"
    );

    buildClassDataXML(sortedClasses, classMap, lines);

    lines.push("    </value>");
    trackIndex++;
  }

  lines.push("  </aiAdaptationData>", "</AiAdaptation>");

  return lines.join("\n");
}

export function downloadXML(
  database: Database,
  playerTimes: PlayerTimes,
  assets: Assets,
  filename: string = "aiadaptation.xml"
): void {
  const xmlContent = buildXML(database, playerTimes, assets);
  const blob = new Blob([xmlContent], { type: "application/xml" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
