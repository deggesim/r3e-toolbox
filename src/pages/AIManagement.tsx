import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Button, Card, Container, Modal } from "react-bootstrap";
import AISelectionTable from "../components/AISelectionTable";
import FileUploadSection from "../components/FileUploadSection";
import ProcessingLog from "../components/ProcessingLog";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { useProcessingLog } from "../hooks/useProcessingLog";
import { useConfigStore } from "../store/configStore";
import { useGameDataStore } from "../store/gameDataStore";
import type {
  Assets,
  Database,
  DatabaseClass,
  DatabaseTrack,
  PlayerTimes,
  ProcessedDatabase,
} from "../types";
import { processDatabase } from "../utils/databaseProcessor";
import { parseJson } from "../utils/jsonParser";
import { makeTime } from "../utils/timeUtils";
import { buildXML } from "../utils/xmlBuilder";
import { parseAdaptive } from "../utils/xmlParser";

/**
 * Removes generated AI levels from a track (where numberOfSampledRaces = 0)
 */
const removeGeneratedFromTrack = (track: DatabaseTrack): number => {
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
};

/**
 * Recalculates min/max AI levels for a track after removal
 */
const recalculateTrackMinMax = (track: DatabaseTrack): void => {
  const aiLevels = Object.keys(track.ailevels).map(Number);
  if (aiLevels.length > 0) {
    track.minAI = Math.min(...aiLevels);
    track.maxAI = Math.max(...aiLevels);
  } else {
    delete track.minAI;
    delete track.maxAI;
  }
};

/**
 * Recalculates min/max AI levels for a class based on all tracks
 */
const recalculateClassMinMax = (classData: DatabaseClass): void => {
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
};

const AIManagement = () => {
  const { config } = useConfigStore();
  const electron = useElectronAPI();
  const gameData = useGameDataStore((state) => state.gameData);

  // Data state
  const [assets, setAssets] = useState<Assets | null>(null);
  const [database, setDatabase] = useState<Database>({ classes: {} });
  const [processed, setProcessed] = useState<ProcessedDatabase>({
    classes: {},
  });
  const [playerTimes, setPlayerTimes] = useState<PlayerTimes>({ classes: {} });

  // UI state
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [selectedAILevel, setSelectedAILevel] = useState<number | null>(null);
  const [spacing, setSpacing] = useState<number>(config.aiSpacing);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [xmlAutoLoaded, setXmlAutoLoaded] = useState(false);
  const [originalPlayerTimes, setOriginalPlayerTimes] = useState<PlayerTimes>({
    classes: {},
  });

  // Refs
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const gameDataLoggedRef = useRef(false);
  const xmlAutoLoadedRef = useRef(false);
  const { logs, addLog, logsEndRef, getLogVariant, setLogs } =
    useProcessingLog();

  // Calculate AI range
  const aiNumLevels = config.aiNumLevels;
  const aifrom = selectedAILevel
    ? Math.max(
        config.minAI,
        selectedAILevel - Math.floor(aiNumLevels / 2) * spacing,
      )
    : config.minAI;
  const aito = Math.min(config.maxAI, aifrom + (aiNumLevels - 1) * spacing);

  // ============ EFFECTS ============

  useEffect(() => {
    setSpacing(config.aiSpacing);
  }, [config.aiSpacing]);

  useEffect(() => {
    setProcessed(processDatabase(database));
  }, [config, database]);

  // Load game data assets on mount from global store
  useEffect(() => {
    if (gameData && !assets) {
      setAssets(parseJson(gameData));
      if (!gameDataLoggedRef.current) {
        gameDataLoggedRef.current = true;
      }
    }
  }, [gameData, assets, addLog]);

  useEffect(() => {
    const loadAiadaptationFile = async () => {
      if (xmlAutoLoadedRef.current) return;
      xmlAutoLoadedRef.current = true;
      if (!electron.isElectron) {
        addLog(
          "warning",
          "⚠ aiadaptation.xml can only be auto-loaded in Electron mode",
        );
        return;
      }

      try {
        const result = await electron.findAiadaptationFile();
        if (result.success && result.data) {
          try {
            const newDatabase = { ...database };
            const newPlayerTimes = { ...playerTimes };
            const added = parseAdaptive(
              result.data,
              newDatabase,
              newPlayerTimes,
            );
            if (added) {
              setDatabase(newDatabase);
              setPlayerTimes(newPlayerTimes);
              setOriginalPlayerTimes(structuredClone(newPlayerTimes));
              setXmlAutoLoaded(true);
              addLog(
                "success",
                `✔ Loaded aiadaptation.xml from: ${result.path}`,
              );
            }
          } catch (error) {
            setXmlAutoLoaded(false);
            addLog(
              "warning",
              `⚠ Failed to parse aiadaptation.xml from RaceRoom UserData: ${error}`,
            );
          }
        } else {
          setXmlAutoLoaded(false);
          addLog("info", `ℹ aiadaptation.xml not found in UserData paths`);
        }
      } catch (error) {
        addLog("error", `❌ Auto-load of aiadaptation.xml failed: ${error}`);
      }
    };

    loadAiadaptationFile();
  }, [electron.isElectron]);

  // ============ FILE UPLOAD HANDLERS ============

  const handleXmlUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
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
          setOriginalPlayerTimes(structuredClone(newPlayerTimes));
          addLog("success", "✔ AI Adaptation XML loaded successfully");
        }
      } catch (error) {
        addLog("error", "❌ Error parsing XML file");
      }
    },
    [database, playerTimes, addLog],
  );

  // ============ XML DOWNLOAD HELPER ============

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
        addLog("error", "❌ Error generating XML file");
      }
    },
    [assets, addLog],
  );

  // ============ APPLY MODIFICATION ============

  const handleConfirmApply = () => {
    setShowApplyModal(false);
    setLogs([]);

    let updatedDb = database;
    let updatedPt = playerTimes;

    // Apply AI modification if AI level is selected
    if (selectedClassId && selectedTrackId && selectedAILevel !== null) {
      updatedDb = handleApplyModification(
        selectedClassId,
        selectedTrackId,
        aifrom,
        aito,
        spacing,
      );
    }

    // Apply player times modification (always use current playerTimes)
    updatedPt = playerTimes;

    // Download the merged results
    if (assets && updatedDb) {
      try {
        const xmlContent = buildXML(updatedDb, updatedPt, assets);
        const blob = new Blob([xmlContent], {
          type: "application/xml",
        });
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
        addLog("error", "❌ Error generating XML file");
      }
    }
  };

  const handleApplyModification = useCallback(
    (
      classid: string,
      trackid: string,
      aifrom: number,
      aito: number,
      aiSpacing: number,
    ): Database => {
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

  // ============ REMOVE GENERATED ============

  const handleDeletePlayerTime = useCallback(
    (classid: string, trackid: string, timeIndex: number) => {
      const newPlayerTimes = structuredClone(playerTimes);
      const track = newPlayerTimes.classes[classid]?.tracks[trackid];
      if (!track || !track.playertimes) return;

      const deletedTime = track.playertimes[timeIndex];
      track.playertimes.splice(timeIndex, 1);

      // Recalculate playertime (minimum)
      if (track.playertimes.length > 0) {
        track.playertime = Math.min(...track.playertimes);
      } else {
        delete track.playertime;
      }

      setPlayerTimes(newPlayerTimes);
      addLog("success", `✔ Deleted player time: ${makeTime(deletedTime, ":")}`);
    },
    [playerTimes, addLog],
  );

  const handleDeleteAllButMinPlayerTime = useCallback(
    (classid: string, trackid: string) => {
      const newPlayerTimes = structuredClone(playerTimes);
      const track = newPlayerTimes.classes[classid]?.tracks[trackid];
      if (!track || !track.playertimes || track.playertimes.length <= 1) return;

      const minTime = Math.min(...track.playertimes);
      const deletedCount = track.playertimes.length - 1;
      track.playertimes = [minTime];
      track.playertime = minTime;

      setPlayerTimes(newPlayerTimes);
      addLog(
        "success",
        `✔ Deleted ${deletedCount} player time(s), kept best: ${makeTime(minTime, ":")}`,
      );
    },
    [playerTimes, addLog],
  );

  // ============ REMOVE GENERATED ============

  const handleRemoveGenerated = useCallback(() => {
    setLogs([]);
    addLog("info", "Starting removal of generated AI levels...");

    const newDatabase = structuredClone(database);
    let removedCount = 0;

    for (const [classId, classData] of Object.entries(newDatabase.classes)) {
      for (const [trackId, track] of Object.entries(classData.tracks)) {
        const removed = removeGeneratedFromTrack(track);
        if (removed > 0) {
          removedCount += removed;

          const classLabel = assets?.classes?.[classId]?.name || classId;
          const trackLabel = assets?.tracks?.[trackId]?.name || trackId;
          addLog(
            "success",
            `✔ Removed ${removed} generated levels from ${classLabel} - ${trackLabel}`,
          );
        }

        recalculateTrackMinMax(track);
      }

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

    if (xmlInputRef.current) {
      xmlInputRef.current.value = "";
    }
  }, [database, assets, playerTimes, downloadXml, addLog, setLogs]);

  // ============ RESET ALL ============

  const handleResetAll = useCallback(() => {
    setShowResetModal(true);
  }, []);

  const cancelResetAll = useCallback(() => {
    setShowResetModal(false);
    addLog("info", "Reset cancelled by user.");
  }, [addLog]);

  const confirmResetAll = useCallback(() => {
    setShowResetModal(false);

    setLogs([]);
    addLog("info", "Starting reset of all AI times...");

    const emptyDb: Database = { classes: {} };
    setDatabase(emptyDb);
    setProcessed({ classes: {} });
    addLog("success", "✔ All AI data cleared from database");

    downloadXml(emptyDb, playerTimes);
    addLog("success", "📥 Downloaded reset aiadaptation.xml");
    addLog("success", "🎉 All AI times have been reset successfully");

    if (xmlInputRef.current) {
      xmlInputRef.current.value = "";
    }
  }, [downloadXml, playerTimes, addLog, setLogs]);

  // ============ CHECK IF PLAYER TIMES MODIFIED ============

  const hasModifiedPlayerTimes = useCallback((): boolean => {
    // Check if current playerTimes differs from original
    for (const [classId, classData] of Object.entries(playerTimes.classes)) {
      const origClass = originalPlayerTimes.classes[classId];
      if (!origClass) return true; // New class added

      for (const [trackId, trackData] of Object.entries(classData.tracks)) {
        const origTrack = origClass.tracks[trackId];
        if (!origTrack) return true; // New track added

        // Compare number of times and actual values
        if (
          !trackData.playertimes ||
          !origTrack.playertimes ||
          trackData.playertimes.length !== origTrack.playertimes.length
        ) {
          return true; // Different number of times
        }

        // Check if arrays are identical
        if (
          !trackData.playertimes.every(
            (t, i) => t === origTrack.playertimes![i],
          )
        ) {
          return true; // Different times
        }
      }
    }
    return false;
  }, [playerTimes, originalPlayerTimes]);

  const getPlayerTimesModifications = useCallback((): Array<{
    classId: string;
    className: string;
    trackId: string;
    trackName: string;
    removedCount: number;
  }> => {
    const modifications: Array<{
      classId: string;
      className: string;
      trackId: string;
      trackName: string;
      removedCount: number;
    }> = [];

    for (const [classId, classData] of Object.entries(playerTimes.classes)) {
      const origClass = originalPlayerTimes.classes[classId];
      if (!origClass) continue;

      for (const [trackId, trackData] of Object.entries(classData.tracks)) {
        const origTrack = origClass.tracks[trackId];
        if (!origTrack) continue;

        const currentCount = trackData.playertimes?.length || 0;
        const originalCount = origTrack.playertimes?.length || 0;
        const removedCount = originalCount - currentCount;

        if (removedCount > 0) {
          modifications.push({
            classId,
            className: assets?.classes?.[classId]?.name || classId,
            trackId,
            trackName: assets?.tracks?.[trackId]?.name || trackId,
            removedCount,
          });
        }
      }
    }

    return modifications;
  }, [playerTimes, originalPlayerTimes, assets]);

  // ============ RENDER ============

  const isApplyDisabled =
    !selectedClassId || !selectedTrackId || selectedAILevel === null;

  // Apply button is enabled if:
  // 1. User selected AI level for generation, OR
  // 2. User modified player times
  const isApplyButtonEnabled = !isApplyDisabled || hasModifiedPlayerTimes();

  return (
    <Container fluid className="py-4">
      <Card bg="dark" text="white" className="border-secondary mb-4">
        <Card.Header as="h2" className="text-center page-header-gradient">
          🤖 AI Management
        </Card.Header>
        <Card.Body>
          <Card.Text className="text-white-50 mb-4">
            {xmlAutoLoaded
              ? "AI adaptation file loaded. You can upload a different file to replace it."
              : "Upload AI adaptation file to analyze and configure AI parameters"}
          </Card.Text>

          <FileUploadSection
            onXmlUpload={handleXmlUpload}
            assets={assets}
            xmlInputRef={xmlInputRef}
          />

          <AISelectionTable
            assets={assets}
            processed={processed}
            playertimes={playerTimes}
            selectedClassId={selectedClassId}
            selectedTrackId={selectedTrackId}
            selectedAILevel={selectedAILevel}
            spacing={spacing}
            onSelectClass={setSelectedClassId}
            onSelectTrack={setSelectedTrackId}
            onSelectAILevel={setSelectedAILevel}
            onSpacingChange={setSpacing}
            onRemoveGenerated={handleRemoveGenerated}
            onResetAll={handleResetAll}
            onApply={() => setShowApplyModal(true)}
            isApplyDisabled={!isApplyButtonEnabled}
            aifrom={aifrom}
            aito={aito}
            showApplyModal={showApplyModal}
            onHideApplyModal={() => setShowApplyModal(false)}
            onConfirmApply={handleConfirmApply}
            playerTimesModifications={getPlayerTimesModifications()}
            onDeletePlayerTime={(timeIndex) =>
              handleDeletePlayerTime(
                selectedClassId,
                selectedTrackId,
                timeIndex,
              )
            }
            onDeleteAllButMinPlayerTime={() =>
              handleDeleteAllButMinPlayerTime(selectedClassId, selectedTrackId)
            }
          />

          <ProcessingLog
            logs={logs}
            getLogVariant={getLogVariant}
            logsEndRef={logsEndRef}
          />
        </Card.Body>
      </Card>

      {/* Reset All Confirmation Modal */}
      <Modal show={showResetModal} onHide={cancelResetAll} data-bs-theme="dark">
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title>Reset All AI Times</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <p className="text-danger">
            ⚠️ <strong>Warning:</strong> This action cannot be undone.
          </p>
          <p>You are about to reset all AI times in the database. This will:</p>
          <ul>
            <li>Clear all AI level data</li>
            <li>Remove all processed predictions</li>
            <li>Preserve your player times</li>
            <li>Download a reset aiadaptation.xml file</li>
          </ul>
          <p>Are you sure you want to continue?</p>
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={cancelResetAll}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmResetAll}>
            Reset All
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AIManagement;
