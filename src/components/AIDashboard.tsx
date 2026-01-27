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

  const downloadXml = useCallback(
    (db: Database, pt: PlayerTimes) => {
      if (!assets) {
        alert("Please load RaceRoom data before exporting XML");
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
        alert("Error generating XML file");
      }
    },
    [assets],
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
      } catch (error) {
        console.error("Error parsing JSON:", error);
        alert("Error parsing JSON file");
      }
    },
    [],
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
        }
      } catch (error) {
        console.error("Error parsing XML:", error);
        alert("Error parsing XML file");
      }
    },
    [database, playerTimes],
  );

  const handleApplyModification = useCallback(
    (
      classid: string,
      trackid: string,
      aifrom: number,
      aito: number,
      aiSpacing: number,
    ): Database => {
      // Validate that the track has been processed (fitted) successfully
      if (!processed.classes[classid]?.tracks[trackid]) {
        alert("No processed data available for this class/track combination");
        // Return current database unchanged to keep deterministic return type
        return database;
      }

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

      setDatabase(newDatabase);
      return newDatabase;
    },
    [database, processed],
  );

  const handleRemoveGenerated = useCallback(() => {
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
        }

        // Recalculate track min/max after removal
        recalculateTrackMinMax(track);
      }

      // Recalculate class min/max based on all remaining tracks
      recalculateClassMinMax(classData);
    }

    setDatabase(newDatabase);

    // Build and display detailed report
    const reportLines = buildRemovalReport(perClassTrackCount, assets);

    if (removedCount === 0) {
      alert("No generated AI levels found to remove");
    } else {
      alert(
        `Removed ${removedCount} generated AI levels` +
          (reportLines.length ? `\n\nDetails:\n${reportLines.join("\n")}` : ""),
      );
    }

    downloadXml(newDatabase, playerTimes);

    // Reset XML file input
    if (xmlInputRef.current) {
      xmlInputRef.current.value = "";
    }
  }, [database, assets, playerTimes, downloadXml]);

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
        } catch (error) {
          console.error("Error generating XML:", error);
          alert("Error generating XML file");
        }
      }
    },
    [assets, playerTimes, handleApplyModification],
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

    // Clear only AI data: database and processed predictions, keep player times
    const emptyDb: Database = { classes: {} };
    setDatabase(emptyDb);
    setProcessed({ classes: {} });

    downloadXml(emptyDb, playerTimes);
    alert("All AI times have been reset");

    // Reset XML file input
    if (xmlInputRef.current) {
      xmlInputRef.current.value = "";
    }
  }, [downloadXml]);

  useEffect(() => {
    setProcessed(processDatabase(database));
  }, [config, database]);

  return (
    <Container className="py-4">
      <Card bg="dark" text="white" className="border-secondary mb-4">
        <Card.Header
          as="h2"
          className="text-center"
          style={{
            background: "linear-gradient(135deg, #646cff 0%, #535bf2 100%)",
            color: "white",
          }}
        >
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
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AIDashboard;
