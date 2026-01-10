import React, { useState, useCallback } from 'react';
import type { RaceRoomData, Assets, Database, ProcessedDatabase, PlayerTimes } from '../types';
import { parseJson } from '../utils/jsonParser';
import { parseAdaptive } from '../utils/xmlParser';
import { processDatabase } from '../utils/databaseProcessor';

import AIPrimerGUI from './AIPrimerGUI';

const AIDashboard: React.FC = () => {
  const [assets, setAssets] = useState<Assets | null>(null);
  const [database, setDatabase] = useState<Database>({ classes: {} });
  const [processed, setProcessed] = useState<ProcessedDatabase>({ classes: {} });
  const [playerTimes, setPlayerTimes] = useState<PlayerTimes>({ classes: {} });

  const handleJsonUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data: RaceRoomData = JSON.parse(e.target?.result as string);
        const parsedAssets = parseJson(data);
        setAssets(parsedAssets);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Error parsing JSON file');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleXmlUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlText = e.target?.result as string;
        const newDatabase = { ...database };
        const newPlayerTimes = { ...playerTimes };
        const added = parseAdaptive(xmlText, newDatabase, newPlayerTimes);
        if (added) {
          setDatabase(newDatabase);
          setPlayerTimes(newPlayerTimes);
          setProcessed(processDatabase(newDatabase));
        }
      } catch (error) {
        console.error('Error parsing XML:', error);
        alert('Error parsing XML file');
      }
    };
    reader.readAsText(file);
  }, [database, playerTimes]);

  const handleApplyModification = useCallback((classid: string, trackid: string, aifrom: number, aito: number, aiSpacing: number): Database => {
    if (!processed.classes[classid]?.tracks[trackid]) {
      alert('No processed data available for this class/track combination');
      // Return current database unchanged to keep deterministic return type
      return database;
    }

    const newDatabase = JSON.parse(JSON.stringify(database)) as Database;
    
    // Ensure class and track exist in database
    if (!newDatabase.classes[classid]) {
      newDatabase.classes[classid] = { tracks: {} };
    }
    if (!newDatabase.classes[classid].tracks[trackid]) {
      newDatabase.classes[classid].tracks[trackid] = { ailevels: {}, samplesCount: {} };
    }

    const track = newDatabase.classes[classid].tracks[trackid];
  const processedTrack = processed.classes[classid].tracks[trackid];

  // Clear all existing AI levels for this class/track - we're replacing them completely
  track.ailevels = {};
  track.samplesCount = {};

  // Add only the generated AI levels from aifrom to aito with aiSpacing step
  let addedCount = 0;
  for (let ai = aifrom; ai <= aito; ai += aiSpacing) {
    const generatedTime = processedTrack.ailevels[ai]?.[0];
    if (generatedTime) {
      track.ailevels[ai] = [generatedTime];
        addedCount++;
      }
    }

    // Update min/max AI for track
    const aiLevels = Object.keys(track.ailevels).map(Number);
    track.minAI = Math.min(...aiLevels);
    track.maxAI = Math.max(...aiLevels);

    // Update min/max AI for class
    const classData = newDatabase.classes[classid];
    const allTrackAIs = Object.values(classData.tracks).flatMap(t => 
      Object.keys(t.ailevels).map(Number)
    );
    classData.minAI = Math.min(...allTrackAIs);
    classData.maxAI = Math.max(...allTrackAIs);

    setDatabase(newDatabase);
    setProcessed(processDatabase(newDatabase));
    return newDatabase;
  }, [database, processed]);

  const handleRemoveGenerated = useCallback(() => {
    const newDatabase = JSON.parse(JSON.stringify(database)) as Database;
    let removedCount = 0;
    const perClassTrackCount: Record<string, Record<string, number>> = {};

    for (const [classId, classData] of Object.entries(newDatabase.classes)) {
      for (const [trackId, track] of Object.entries(classData.tracks)) {
        track.samplesCount = track.samplesCount || {};
        for (const aiLevelStr of Object.keys(track.ailevels)) {
          const aiLevel = Number(aiLevelStr);
          // Remove AI levels explicitly marked as generated (samplesCount === 1)
          if (track.samplesCount[aiLevel] === 1) {
            delete track.ailevels[aiLevel];
            delete track.samplesCount[aiLevel];
            removedCount++;
            perClassTrackCount[classId] = perClassTrackCount[classId] || {};
            perClassTrackCount[classId][trackId] = (perClassTrackCount[classId][trackId] || 0) + 1;
          }
        }

        // Update min/max AI for track
        const aiLevels = Object.keys(track.ailevels).map(Number);
        if (aiLevels.length > 0) {
          track.minAI = Math.min(...aiLevels);
          track.maxAI = Math.max(...aiLevels);
        } else {
          delete track.minAI;
          delete track.maxAI;
        }
      }

      // Update min/max AI for class
      const allTrackAIs = Object.values(classData.tracks).flatMap(t => 
        Object.keys(t.ailevels).map(Number)
      );
      if (allTrackAIs.length > 0) {
        classData.minAI = Math.min(...allTrackAIs);
        classData.maxAI = Math.max(...allTrackAIs);
      } else {
        delete classData.minAI;
        delete classData.maxAI;
      }
    }

    setDatabase(newDatabase);
    setProcessed(processDatabase(newDatabase));

    if (removedCount === 0) {
      alert('No generated AI levels found to remove');
      return;
    }

    const lines: string[] = [];
    for (const [classId, tracks] of Object.entries(perClassTrackCount)) {
      for (const [trackId, count] of Object.entries(tracks)) {
        const classLabel = assets?.classes?.[classId]?.name || classId;
        const trackLabel = assets?.tracks?.[trackId]?.name || trackId;
        lines.push(`${classLabel} - ${trackLabel}: ${count}`);
      }
    }

    alert(`Removed ${removedCount} generated AI levels` + (lines.length ? `\n\nDetails:\n${lines.join('\n')}` : ''));
  }, [database, assets]);

  const handleResetAll = useCallback(() => {
    if (!confirm('Are you sure you want to reset all AI times? This action cannot be undone.')) {
      return;
    }

    setDatabase({ classes: {} });
    setProcessed({ classes: {} });
    setPlayerTimes({ classes: {} });
    
    alert('All AI times and player times have been reset');
  }, []);



  return (
    <>
    <div style={{textAlign: "center", padding: "20px"}}>
      <img src="/logo.png" alt="R3E Adaptive AI Logo"/>
    </div>
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Adaptive AI Management</h1>
      <p>Upload RaceRoom data files to analyze and configure AI parameters</p>

      <div style={{ marginTop: '20px' }}>
        <h2>File Upload</h2>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label htmlFor="r3e-data">RaceRoom Data JSON: </label>
            <input id="r3e-data" type="file" accept=".json" onChange={handleJsonUpload} />
          </div>
          <div>
            <label htmlFor="ai-adaptation-xml">AI Adaptation XML: </label>
            <input id="ai-adaptation-xml" type="file" accept=".xml" onChange={handleXmlUpload} />
          </div>
        </div>

        {assets && (
          <div>
            <p>Loaded {assets.numClasses} classes and {assets.numTracks} tracks</p>
            <p>Database contains {Object.keys(database.classes).length} classes with AI data</p>
          </div>
        )}
      </div>

      <AIPrimerGUI
        assets={assets}
        processed={processed}
        playertimes={playerTimes}
        onApplyModification={handleApplyModification}
        onRemoveGenerated={handleRemoveGenerated}
        onResetAll={handleResetAll}
      />
    </div>
    </>
  );
};

export default AIDashboard;