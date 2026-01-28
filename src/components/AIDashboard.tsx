import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, Container, Form } from "react-bootstrap";
import type {
  Assets,
  Database,
  DatabaseClass,
  DatabaseTrack,
  PlayerTimes,
  ProcessedDatabase,
  RaceRoomData,
} from "../types";
import { processDatabase } from "../utils/databaseProcessor";
import { parseJson } from "../utils/jsonParser";
import { buildXML } from "../utils/xmlBuilder";
import { parseAdaptive } from "../utils/xmlParser";
import { useConfigStore } from "../store/configStore";
import { useProcessingLog } from "../hooks/useProcessingLog";
import ProcessingLog from "./ProcessingLog";

import AIManagementGUI from "./AIManagementGUI";

const DEFAULT_JSON_URL = new URL("../../r3e-data.json", import.meta.url).href;

/**
 * Removes generated AI levels from a track (where numberOfSampledRaces = 0)
 */
function removeGeneratedFromTrack(track: DatabaseTrack): number {
  track.samplesCount = track.samplesCount || {};
  let removedCount = 0;

  for (const aiLevelStr of Object.keys(track.ailevels)) {
    const aiLevel = Number(aiLevelStr);
    if (track.samplesCount[aiLevel] === 0) {
      delete track.ailevels[aiLevel];
      delete track.samplesCount[aiLevel];
      removedCount++;
    }
  }

  return removedCount;
}

/**
 * Recalculates min/max AI levels for a track after removal
 */
function recalculateTrackMinMax(track: DatabaseTrack): void {
  const aiLevels = Object.keys(track.ailevels).map(Number);
  if (aiLevels.length > 0) {
    track.minAI = Math.min(...aiLevels);
    track.maxAI = Math.max(...aiLevels);
  } else {
    delete track.minAI;
    delete track.maxAI;
  }
}

/**
 * Recalculates min/max AI levels for a class based on all tracks
 */
function recalculateClassMinMax(classData: DatabaseClass): void {
  const allTrackAIs = Object.values(classData.tracks).flatMap((t) =>
    Object.keys(t.ailevels).map(Number),
  );
  if (allTrackAIs.length > 0) {
    classData.minAI = Math.min(...allTrackAIs);
    classData.maxAI = Math.max(...allTrackAIs);
  } else {
    delete classData.minAI;
    delete classData.maxAI;
  }
}

/**
 * Builds a detailed report of removals
 */
function buildRemovalReport(
  perClassTrackCount: Record<string, Record<string, number>>,
  assets: Assets | null,
): string[] {
  const lines: string[] = [];
  for (const [classId, tracks] of Object.entries(perClassTrackCount)) {
    for (const [trackId, count] of Object.entries(tracks)) {
      const classLabel = assets?.classes?.[classId]?.name || classId;
      const trackLabel = assets?.tracks?.[trackId]?.name || trackId;
      lines.push(`${classLabel} - ${trackLabel}: ${count}`);
    }
  }
  return lines;
}

const AIDashboard: React.FC = () => {
  const { config } = useConfigStore();
  const [assets, setAssets] = useState<Assets | null>(null);
  const [database, setDatabase] = useState<Database>({ classes: {} });
  const [processed, setProcessed] = useState<ProcessedDatabase>({
    classes: {},
  });
  const [playerTimes, setPlayerTimes] = useState<PlayerTimes>({ classes: {} });
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const { logs, addLog, logsEndRef, getLogVariant, setLogs } =
    useProcessingLog();

  const downloadXml = useCallback(
    (db: Database, pt: PlayerTimes) => {
      if (!assets) {
        addLog("error", "❌ Please load RaceRoom data before exporting XML");
        return;
      }
      try {
        const xmlContent = buildXML(db, pt, assets);
        const blob = new Blob([xmlContent], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "aiadaptation.xml";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error generating XML:", error);
        addLog("error", "❌ Error generating XML file");
      }
    },
    [assets, addLog],
  );

  useEffect(() => {
    let cancelled = false;

    const loadDefaultJson = async () => {
      try {
        const response = await fetch(DEFAULT_JSON_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch default JSON: ${response.status}`);
        }
        const data: RaceRoomData = await response.json();
        if (!cancelled) {
          setAssets((prev) => prev ?? parseJson(data));
        }
      } catch (error) {
        console.warn("Auto-load of default RaceRoom JSON failed:", error);
      }
    };

    loadDefaultJson();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleJsonUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data: RaceRoomData = JSON.parse(text);
        const parsedAssets = parseJson(data);
        setAssets(parsedAssets);
        addLog("success", "✔ RaceRoom data JSON loaded successfully");
      } catch (error) {
        console.error("Error parsing JSON:", error);
        addLog("error", "❌ Error parsing JSON file");
      }
    },
    [addLog],
  );

  const handleXmlUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const xmlText = await file.text();
        const newDatabase = { ...database };
        const newPlayerTimes = { ...playerTimes };
        const added = parseAdaptive(xmlText, newDatabase, newPlayerTimes);
        if (added) {
          setDatabase(newDatabase);
          setPlayerTimes(newPlayerTimes);
          addLog("success", "✔ AI Adaptation XML loaded successfully");
        }
      } catch (error) {
        console.error("Error parsing XML:", error);
        addLog("error", "❌ Error parsing XML file");
      }
    },
    [database, playerTimes, addLog],
  );

  const handleApplyModification = useCallback(
    (
      classid: string,
      trackid: string,
      aifrom: number,
      aito: number,
      aiSpacing: number,
    ): Database => {
      // Reset logs and start
      setLogs([]);

      const classLabel = assets?.classes?.[classid]?.name || classid;
      const trackLabel = assets?.tracks?.[trackid]?.name || trackid;

      addLog("info", `Applying modification for ${classLabel} - ${trackLabel}`);
      addLog("info", `AI Range: ${aifrom} - ${aito} (step: ${aiSpacing})`);

      // Validate that the track has been processed (fitted) successfully
      if (!processed.classes[classid]?.tracks[trackid]) {
        addLog(
          "error",
          "❌ No processed data available for this class/track combination",
        );
        return database;
      }
      addLog("success", "✔ Processed data found");

      // Create a deep copy of the current database to avoid mutating state directly
      const newDatabase = structuredClone(database);

      // Ensure class and track exist in database
      if (!newDatabase.classes[classid]) {
        newDatabase.classes[classid] = { tracks: {} };
      }
      if (!newDatabase.classes[classid].tracks[trackid]) {
        newDatabase.classes[classid].tracks[trackid] = {
          ailevels: {},
          samplesCount: {},
        };
      }

      const track = newDatabase.classes[classid].tracks[trackid];
      const processedTrack = processed.classes[classid].tracks[trackid];

      // Replace all existing AI levels for this class/track with generated values
      // This ensures the XML export contains only the newly generated data for this track
      track.ailevels = {};
      track.samplesCount = {};

      // Populate the track with generated AI levels from aifrom to aito with aiSpacing step
      let addedCount = 0;
      for (let ai = aifrom; ai <= aito; ai += aiSpacing) {
        const generatedTime = processedTrack.ailevels[ai]?.[0];
        if (generatedTime) {
          track.ailevels[ai] = [generatedTime];
          track.samplesCount[ai] = 0; // Mark as generated
          addedCount++;
        }
      }

      addLog("success", `✔ Generated ${addedCount} AI level(s)`);

      // Update min/max AI for the track based on newly added levels
      const aiLevels = Object.keys(track.ailevels).map(Number);
      track.minAI = Math.min(...aiLevels);
      track.maxAI = Math.max(...aiLevels);

      // Update min/max AI for the class based on all tracks
      const classData = newDatabase.classes[classid];
      const allTrackAIs = Object.values(classData.tracks).flatMap((t) =>
        Object.keys(t.ailevels).map(Number),
      );
      classData.minAI = Math.min(...allTrackAIs);
      classData.maxAI = Math.max(...allTrackAIs);

      addLog("success", "🎉 Modification applied successfully");

      setDatabase(newDatabase);
      return newDatabase;
    },
    [database, processed, assets, addLog, setLogs],
  );

  const handleRemoveGenerated = useCallback(() => {
    // Reset logs and start
    setLogs([]);
    addLog("info", "Starting removal of generated AI levels...");

    // Create a deep copy of the database to avoid direct mutation
    const newDatabase = structuredClone(database);
    let removedCount = 0;
    // Track removed entries per class/track for detailed reporting
    const perClassTrackCount: Record<string, Record<string, number>> = {};

    for (const [classId, classData] of Object.entries(newDatabase.classes)) {
      for (const [trackId, track] of Object.entries(classData.tracks)) {
        // Remove generated AI levels from track
        const removed = removeGeneratedFromTrack(track);
        if (removed > 0) {
          removedCount += removed;
          perClassTrackCount[classId] = perClassTrackCount[classId] || {};
          perClassTrackCount[classId][trackId] = removed;

          const classLabel = assets?.classes?.[classId]?.name || classId;
          const trackLabel = assets?.tracks?.[trackId]?.name || trackId;
          addLog(
            "success",
            `✔ Removed ${removed} generated levels from ${classLabel} - ${trackLabel}`,
          );
        }

        // Recalculate track min/max after removal
        recalculateTrackMinMax(track);
      }

      // Recalculate class min/max based on all remaining tracks
      recalculateClassMinMax(classData);
    }

    setDatabase(newDatabase);

    if (removedCount === 0) {
      addLog("warning", "⚠ No generated AI levels found to remove");
    } else {
      addLog(
        "success",
        `🎉 Successfully removed ${removedCount} generated AI level(s)`,
      );
    }

    downloadXml(newDatabase, playerTimes);
    addLog("success", "📥 Downloaded modified aiadaptation.xml");

    // Reset XML file input
    if (xmlInputRef.current) {
      xmlInputRef.current.value = "";
    }
  }, [database, assets, playerTimes, downloadXml, addLog, setLogs]);

  const handleApplyClick = useCallback(
    (
      classid: string,
      trackid: string,
      aifrom: number,
      aito: number,
      aiSpacing: number,
    ) => {
      // Get the updated database from handleApplyModification
      const updatedDb = handleApplyModification(
        classid,
        trackid,
        aifrom,
        aito,
        aiSpacing,
      );

      // Generate and download the XML file
      if (assets && updatedDb) {
        try {
          const xmlContent = buildXML(
            updatedDb,
            playerTimes || { classes: {} },
            assets,
          );
          const blob = new Blob([xmlContent], { type: "application/xml" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "aiadaptation.xml";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
          addLog("success", "📥 Downloaded modified aiadaptation.xml");
        } catch (error) {
          console.error("Error generating XML:", error);
          addLog("error", "❌ Error generating XML file");
        }
      }
    },
    [assets, playerTimes, handleApplyModification, addLog],
  );

  const handleResetAll = useCallback(() => {
    // Confirm destructive action before proceeding
    if (
      !confirm(
        "Are you sure you want to reset all AI times? This action cannot be undone.",
      )
    ) {
      return;
    }

    // Reset logs and start
    setLogs([]);
    addLog("info", "Starting reset of all AI times...");

    // Clear only AI data: database and processed predictions, keep player times
    const emptyDb: Database = { classes: {} };
    setDatabase(emptyDb);
    setProcessed({ classes: {} });
    addLog("success", "✔ All AI data cleared from database");

    downloadXml(emptyDb, playerTimes);
    addLog("success", "📥 Downloaded reset aiadaptation.xml");
    addLog("success", "🎉 All AI times have been reset successfully");

    // Reset XML file input
    if (xmlInputRef.current) {
      xmlInputRef.current.value = "";
    }
  }, [downloadXml, playerTimes, addLog, setLogs]);

  useEffect(() => {
    setProcessed(processDatabase(database));
  }, [config, database]);

  return (
    <Container className="py-4">
      <Card bg="dark" text="white" className="border-secondary mb-4">
        <Card.Header as="h2" className="text-center page-header-gradient">
          🤖 AI Management
        </Card.Header>
        <Card.Body>
          <Card.Text className="text-white-50 mb-4">
            Upload RaceRoom data files to analyze and configure AI parameters
          </Card.Text>

          <Form>
            <h5 className="mb-3">File Upload</h5>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>RaceRoom Data JSON</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".json"
                    onChange={handleJsonUpload}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>AI Adaptation XML</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".xml"
                    onChange={handleXmlUpload}
                    ref={xmlInputRef}
                  />
                </Form.Group>
              </div>
            </div>

            {assets && (
              <Card bg="dark" className="border-secondary mb-4">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center text-white-50">
                    <div>
                      <strong>Loaded:</strong> {assets.numClasses} classes and{" "}
                      {assets.numTracks} tracks
                    </div>
                    <div>
                      <strong>Database:</strong>{" "}
                      {Object.keys(database.classes).length} classes with AI
                      data
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}
          </Form>

          <AIManagementGUI
            assets={assets}
            processed={processed}
            playertimes={playerTimes}
            onApplyClick={handleApplyClick}
            onRemoveGenerated={handleRemoveGenerated}
            onResetAll={handleResetAll}
          />

          <ProcessingLog
            logs={logs}
            getLogVariant={getLogVariant}
            logsEndRef={logsEndRef}
          />
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AIDashboard;
