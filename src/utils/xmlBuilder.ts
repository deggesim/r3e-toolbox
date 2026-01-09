import type { Assets, Database, PlayerTimes } from '../types';

function formatNumber(value: number): string {
  const formatted = value.toFixed(4);
  return formatted.replace(/\.?0+$/, '').replace(/\.0+$/, '');
}

function buildEmptyMatrix(assets: Assets): Map<string, Map<string, { aiData: Record<number, number[]>, samplesCount: Record<number, number>, playerTimes: number[] }>> {
  const trackMap = new Map<string, Map<string, { aiData: Record<number, number[]>, samplesCount: Record<number, number>, playerTimes: number[] }>>();

  // Sort tracks by ID numerically
  const sortedTracks = [...assets.tracksSorted].sort((a, b) => parseInt(a.id) - parseInt(b.id));
  // Sort classes by ID numerically
  const sortedClasses = [...assets.classesSorted].sort((a, b) => parseInt(a.id) - parseInt(b.id));

  for (const track of sortedTracks) {
    const classMap = new Map<string, { aiData: Record<number, number[]>, samplesCount: Record<number, number>, playerTimes: number[] }>();
    for (const cls of sortedClasses) {
      classMap.set(cls.id, { aiData: {}, samplesCount: {}, playerTimes: [] });
    }
    trackMap.set(track.id, classMap);
  }

  return trackMap;
}

export function buildXML(database: Database, playerTimes: PlayerTimes, assets: Assets): string {
  const lines: string[] = [];

  lines.push('<AiAdaptation ID="/aiadaptation">');
  lines.push('  <latestVersion type="uint32">0</latestVersion>');
  lines.push('  <aiAdaptationData>');

  const trackMap = buildEmptyMatrix(assets);

  // Merge database data
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

  // Merge player times
  for (const [classId, classData] of Object.entries(playerTimes.classes)) {
    for (const [trackId, trackData] of Object.entries(classData.tracks)) {
      const classMap = trackMap.get(trackId);
      if (!classMap) continue;
      const entry = classMap.get(classId);
      if (!entry) continue;
      // Support both array (playertimes) and single value (playertime)
      if (trackData.playertimes && Array.isArray(trackData.playertimes)) {
        entry.playerTimes = trackData.playertimes;
      } else if (trackData.playertime !== undefined) {
        entry.playerTimes = [trackData.playertime];
      }
    }
  }

  // Sort tracks and classes by ID numerically
  const sortedTracks = [...assets.tracksSorted].sort((a, b) => parseInt(a.id) - parseInt(b.id));
  const sortedClasses = [...assets.classesSorted].sort((a, b) => parseInt(a.id) - parseInt(b.id));

  let trackIndex = 0;
  for (const track of sortedTracks) {
    const classMap = trackMap.get(track.id);
    if (!classMap) continue;

    lines.push(`    <!-- Index:${trackIndex} -->`);
    lines.push(`    <layoutId type="int32">${track.id}</layoutId>`);
    lines.push('    <value>');

    let classIndex = 0;
    for (const cls of sortedClasses) {
      const data = classMap.get(cls.id)!;
      lines.push(`      <!-- Index:${classIndex} -->`);
      lines.push(`      <carClassId type="int32">${cls.id}</carClassId>`);
      lines.push('      <sampledData>');
      lines.push('        <playerBestLapTimes>');

      let playerTimeIndex = 0;
      for (const playerTime of data.playerTimes) {
        lines.push(`          <!-- Index:${playerTimeIndex} -->`);
        lines.push(`          <lapTime type="float32">${formatNumber(playerTime)}</lapTime>`);
        playerTimeIndex++;
      }

      lines.push('        </playerBestLapTimes>');
      lines.push('        <aiSkillVsLapTimes>');

      let aiIndex = 0;
      const aiLevels = Object.keys(data.aiData).map(Number).sort((a, b) => a - b);
      for (const aiLevel of aiLevels) {
        const times = data.aiData[aiLevel];
        if (times && times.length > 0) {
          const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
          const samples = data.samplesCount?.[aiLevel] ?? 1;
          lines.push(`          <!-- Index:${aiIndex} -->`);
          lines.push(`          <aiSkill type="uint32">${aiLevel}</aiSkill>`);
          lines.push('          <aiData>');
          lines.push(`            <averagedLapTime type="float32">${formatNumber(avgTime)}</averagedLapTime>`);
          lines.push(`            <numberOfSampledRaces type="uint32">${samples}</numberOfSampledRaces>`);
          lines.push('          </aiData>');
          aiIndex++;
        }
      }

      lines.push('        </aiSkillVsLapTimes>');
      lines.push('      </sampledData>');
      classIndex++;
    }

    lines.push('    </value>');
    trackIndex++;
  }

  lines.push('  </aiAdaptationData>');
  lines.push('</AiAdaptation>');

  return lines.join('\n');
}

export function downloadXML(database: Database, playerTimes: PlayerTimes, assets: Assets, filename: string = 'aiadaptation.xml'): void {
  const xmlContent = buildXML(database, playerTimes, assets);
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
