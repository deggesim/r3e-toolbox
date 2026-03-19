/* eslint-disable react-hooks/set-state-in-effect */
import { faDownload } from "@fortawesome/free-solid-svg-icons/faDownload";
import { faRobot } from "@fortawesome/free-solid-svg-icons/faRobot";
import { faThumbsUp } from "@fortawesome/free-solid-svg-icons/faThumbsUp";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Button, Card, Col, Container, Modal, Row } from "react-bootstrap";
import AILevels from "../components/AILevels";
import AIModifications from "../components/AIModifications";
import AIModificationsModal from "../components/AIModificationsModal";
import Classes from "../components/Classes";
import FileUploadSection from "../components/FileUploadSection";
import PlayerTimesTable from "../components/PlayerTimesTable";
import Tracks from "../components/Tracks";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { useConfigStore } from "../store/configStore";
import { useProcessingLogStore } from "../store/processingLogStore";
import { useGameDataStore } from "../store/gameDataStore";
import type { Assets } from "../types/gameData";
import type {
  Database,
  DatabaseClass,
  DatabaseTrack,
  PlayerTimes,
} from "../types/aiAdaptation";
import { getClassesSorted, getTracksSorted } from "../utils/assetHelpers";
import { processDatabase } from "../utils/databaseProcessor";
import { parseJson } from "../utils/jsonParser";
import { makeTime } from "../utils/timeUtils";
import { buildXML } from "../utils/xmlBuilder";
import { parseAdaptive } from "../utils/xmlParser";
import { getDownloadedLabel, getDownloadLabel } from "../utils/platformLabels";
import { saveTextFile } from "../utils/fileSaver";

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
  const [playerTimes, setPlayerTimes] = useState<PlayerTimes>({ classes: {} });

  const fittedDatabase = processDatabase(database, config);

  // UI state
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [selectedAILevel, setSelectedAILevel] = useState<number | null>(null);
  const [spacing, setSpacing] = useState<number>(config.aiSpacing);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showRemoveGeneratedModal, setShowRemoveGeneratedModal] =
    useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [xmlAutoLoaded, setXmlAutoLoaded] = useState(false);
  const [originalPlayerTimes, setOriginalPlayerTimes] = useState<PlayerTimes>({
    classes: {},
  });

  // Refs
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const gameDataLoggedRef = useRef(false);
  const xmlAutoLoadedRef = useRef(false);
  const addLog = useProcessingLogStore((state) => state.addLog);

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
      if (!electron.isElectron) {
        addLog(
          "warning",
          "aiadaptation.xml can only be auto-loaded in Electron mode",
        );
        return;
      }

      try {
        const result = await electron.findAiadaptationFile();
        if (result.success && result.data) {
          try {
            const newDatabase = structuredClone(database);
            const newPlayerTimes = structuredClone(playerTimes);
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
              addLog("success", `Loaded aiadaptation.xml from: ${result.path}`);
            }
          } catch (error) {
            setXmlAutoLoaded(false);
            addLog(
              "warning",
              `Failed to parse aiadaptation.xml from RaceRoom UserData: ${error}`,
            );
          }
        } else {
          setXmlAutoLoaded(false);
          addLog("info", `aiadaptation.xml not found in UserData paths`);
        }
      } catch (error) {
        addLog("error", `Auto-load of aiadaptation.xml failed: ${error}`);
      }
    };

    // Prevent double execution in React StrictMode (dev mode)
    if (xmlAutoLoadedRef.current) return;
    xmlAutoLoadedRef.current = true;

    loadAiadaptationFile();
  }, [addLog, database, electron, electron.isElectron, playerTimes]);

  // ============ FILE UPLOAD HANDLERS ============

  const handleXmlUpload = async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const xmlText = await file.text();
        const newDatabase = structuredClone(database);
        const newPlayerTimes = structuredClone(playerTimes);
        const added = parseAdaptive(xmlText, newDatabase, newPlayerTimes);
        if (added) {
          setDatabase(newDatabase);
          setPlayerTimes(newPlayerTimes);
          setOriginalPlayerTimes(structuredClone(newPlayerTimes));
          addLog("success", "AI Adaptation XML loaded successfully");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog("error", `Error parsing XML file: ${errorMessage}`);
      }
  };

  // ============ XML DOWNLOAD HELPER ============

  const downloadXml = async (db: Database, pt: PlayerTimes): Promise<boolean> => {
      if (!assets) {
        addLog("error", "Please load RaceRoom data before exporting XML");
        return false;
      }
      try {
        const xmlContent = buildXML(db, pt, assets);
        return await saveTextFile({
          electronAPI: electron,
          filename: "aiadaptation.xml",
          content: xmlContent,
          mimeType: "application/xml",
          filters: [
            { name: "XML Files", extensions: ["xml"] },
            { name: "All Files", extensions: ["*"] },
          ],
          onCancel: () => {
            addLog(
              "info",
              `${getDownloadLabel(electron.isElectron)} cancelled by user.`,
            );
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog("error", `Error generating XML file: ${errorMessage}`);
        return false;
      }
  };

  // ============ APPLY MODIFICATION ============

  const handleConfirmApply = async () => {
    setShowApplyModal(false);

    let updatedDb = database;
    // Apply player times modification (always use current playerTimes)
    const updatedPt = playerTimes;

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

    // Download/Save the merged results
    const saved = await downloadXml(updatedDb, updatedPt);
    if (saved) {
      addLog(
        "success",
        `${getDownloadedLabel(electron.isElectron)} modified aiadaptation.xml`,
        faDownload,
      );
    }
  };

  const handleApplyModification = (
    classid: string,
    trackid: string,
    aifrom: number,
    aito: number,
    aiSpacing: number,
  ): Database => {
      const classLabel = assets?.classes?.[classid]?.name || classid;
      const trackLabel = assets?.tracks?.[trackid]?.name || trackid;

      addLog("info", `Applying modification for ${classLabel} - ${trackLabel}`);
      addLog("info", `AI Range: ${aifrom} - ${aito} (step: ${aiSpacing})`);

      // Validate that the track has been processed (fitted) successfully
      if (!fittedDatabase.classes[classid]?.tracks[trackid]) {
        addLog(
          "error",
          "No fitted data available for this class/track combination",
        );
        return database;
      }
      addLog("success", "Fitted data found");

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
      const fittedTrack = fittedDatabase.classes[classid].tracks[trackid];

      // Replace all existing AI levels for this class/track with generated values
      track.ailevels = {};
      track.samplesCount = {};

      // Populate the track with generated AI levels from aifrom to aito with aiSpacing step
      let addedCount = 0;
      for (let ai = aifrom; ai <= aito; ai += aiSpacing) {
        const generatedTime = fittedTrack.ailevels[ai]?.[0];
        if (generatedTime) {
          track.ailevels[ai] = [generatedTime];
          track.samplesCount[ai] = 0; // Mark as generated
          addedCount++;
        }
      }

      addLog("success", `Generated ${addedCount} AI level(s)`);

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

      addLog("success", "Modification applied successfully", faThumbsUp);

      setDatabase(newDatabase);
      return newDatabase;
  };

  // ============ REMOVE GENERATED ============

  const handleDeletePlayerTime = (classid: string, trackid: string, timeIndex: number) => {
      const newPlayerTimes = structuredClone(playerTimes);
      const track = newPlayerTimes.classes[classid]?.tracks[trackid];
      if (!track?.playertimes) return;

      const deletedTime = track.playertimes[timeIndex];
      track.playertimes.splice(timeIndex, 1);

      // Recalculate playertime (minimum)
      if (track.playertimes.length > 0) {
        track.playertime = Math.min(...track.playertimes);
      } else {
        delete track.playertime;
      }

      setPlayerTimes(newPlayerTimes);
      addLog("success", `Deleted player time: ${makeTime(deletedTime, ":")}`);
  };

  const handleDeleteAllButMinPlayerTime = (classid: string, trackid: string) => {
      const newPlayerTimes = structuredClone(playerTimes);
      const track = newPlayerTimes.classes[classid]?.tracks[trackid];
      if (!track?.playertimes || track.playertimes.length <= 1) return;

      const minTime = Math.min(...track.playertimes);
      const deletedCount = track.playertimes.length - 1;
      track.playertimes = [minTime];
      track.playertime = minTime;

      setPlayerTimes(newPlayerTimes);
      addLog(
        "success",
        `Deleted ${deletedCount} player time(s), kept best: ${makeTime(minTime, ":")}`,
      );
  };

  const handleRestorePlayerTimes = () => {
    setPlayerTimes(structuredClone(originalPlayerTimes));
    addLog("success", "Player times restored to original state");
  };

  // ============ REMOVE GENERATED ============

  const handleRemoveGenerated = async () => {
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
            `Removed ${removed} generated levels from ${classLabel} - ${trackLabel}`,
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
        `Successfully removed ${removedCount} generated AI level(s)`,
        faThumbsUp,
      );
    }

    const saved = await downloadXml(newDatabase, playerTimes);
    if (saved) {
      const verb = getDownloadedLabel(electron.isElectron);
      addLog("success", `${verb} modified aiadaptation.xml`, faDownload);
    }

    if (xmlInputRef.current) {
      xmlInputRef.current.value = "";
    }
  };

  const handleConfirmRemoveGenerated = () => {
    setShowRemoveGeneratedModal(false);
    handleRemoveGenerated();
  };

  const handleCancelRemoveGenerated = () => {
    setShowRemoveGeneratedModal(false);
    addLog("info", "Removal of generated AI levels cancelled by user.");
  };

  // ============ RESET ALL ============

  const handleResetAll = () => {
    setShowResetModal(true);
  };

  const cancelResetAll = () => {
    setShowResetModal(false);
    addLog("info", "Reset cancelled by user.");
  };

  const confirmResetAll = async () => {
    setShowResetModal(false);

    addLog("info", "Starting reset of all AI times...");

    const emptyDb: Database = { classes: {} };
    setDatabase(emptyDb);
    addLog("success", "All AI data cleared from database");

    const saved = await downloadXml(emptyDb, playerTimes);
    if (saved) {
      const verb = getDownloadedLabel(electron.isElectron);
      addLog("success", `${verb} reset aiadaptation.xml`, faDownload);
      addLog(
        "success",
        "All AI times have been reset successfully",
        faThumbsUp,
      );
    }

    if (xmlInputRef.current) {
      xmlInputRef.current.value = "";
    }
  };

  // ============ CHECK IF PLAYER TIMES MODIFIED ============

  const hasModifiedPlayerTimes = ((): boolean => {
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
          trackData.playertimes.length !== origTrack.playertimes?.length
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
  })();

  const playerTimesModifications = ((): Array<{
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
  })();

  // ============ CALCULATE AVAILABLE DATA ============

  const availableClasses = assets
    ? getClassesSorted(assets).filter((classAsset) => {
        if (Object.keys(fittedDatabase.classes).length === 0) {
          return true;
        }
        const classData = fittedDatabase.classes[classAsset.id];
        const playerClass = playerTimes?.classes[classAsset.id];
        return classData || playerClass;
      })
    : [];

  const availableTracks = assets
    ? getTracksSorted(assets).filter((trackAsset) => {
        if (!selectedClassId) return false;
        if (Object.keys(fittedDatabase.classes).length === 0) {
          return true;
        }
        const classData = fittedDatabase.classes[selectedClassId];
        const track = classData?.tracks[trackAsset.id];
        const playerClass = playerTimes?.classes[selectedClassId];
        const playerTrack = playerClass?.tracks[trackAsset.id];
        return track || playerTrack;
      })
    : [];

  const aiLevels =
    !selectedTrackId ||
    !fittedDatabase.classes[selectedClassId]?.tracks[selectedTrackId]
      ? []
      : Object.entries(
          fittedDatabase.classes[selectedClassId].tracks[selectedTrackId]
            .ailevels,
        )
          .map(([ai, times]) => ({
            ai: Number(ai),
            time: times[0],
            num: times.length,
          }))
          .filter((x) => x.num > 0)
          .sort((a, b) => a.ai - b.ai);

  // ============ RENDER ============

  return (
    <Container fluid className="py-4">
      <Card bg="dark" text="white" className="border-secondary mb-4">
        <Card.Header as="h2" className="text-center page-header-gradient">
          <FontAwesomeIcon icon={faRobot} className="me-2" />
          AI Management
        </Card.Header>
        <Card.Body>
          <Card.Text className="text-white-50 mb-4">
            {xmlAutoLoaded
              ? "AI adaptation file loaded. You can upload a different file to replace it."
              : "Upload AI adaptation file to analyze and configure AI parameters"}
          </Card.Text>

          <FileUploadSection
            onXmlUpload={handleXmlUpload}
            xmlInputRef={xmlInputRef}
          />

          {assets && (
            <>
              <Card bg="dark" text="white" className="border-secondary mb-3">
                <Card.Body>
                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="warning"
                      onClick={() => setShowRemoveGeneratedModal(true)}
                    >
                      Remove likely generated
                    </Button>
                    <Button variant="danger" onClick={handleResetAll}>
                      Reset all AI times
                    </Button>
                  </div>
                </Card.Body>
              </Card>

              <Card bg="dark" text="white" className="border-secondary mb-3">
                <Card.Body>
                  <Row className="g-3 mb-4">
                    <Col xl={3} lg={6} md={12}>
                      <Classes
                        availableClasses={availableClasses}
                        selectedClassId={selectedClassId}
                        onSelectClass={setSelectedClassId}
                        onSelectTrack={setSelectedTrackId}
                        onSelectAILevel={setSelectedAILevel}
                      />
                    </Col>

                    <Col xl={3} lg={6} md={12}>
                      <Tracks
                        availableTracks={availableTracks}
                        selectedClassId={selectedClassId}
                        selectedTrackId={selectedTrackId}
                        playerTimes={playerTimes}
                        onSelectTrack={setSelectedTrackId}
                        onSelectAILevel={setSelectedAILevel}
                      />
                    </Col>

                    <Col xl={3} lg={6} md={12}>
                      <PlayerTimesTable
                        playerTimes={playerTimes}
                        selectedClassId={selectedClassId}
                        selectedTrackId={selectedTrackId}
                        onDeleteTime={(timeIndex) =>
                          handleDeletePlayerTime(
                            selectedClassId,
                            selectedTrackId,
                            timeIndex,
                          )
                        }
                        onDeleteAllButMin={() =>
                          handleDeleteAllButMinPlayerTime(
                            selectedClassId,
                            selectedTrackId,
                          )
                        }
                      />
                    </Col>

                    <Col xl={3} lg={6} md={12}>
                      <AILevels
                        aiLevels={aiLevels}
                        selectedAILevel={selectedAILevel}
                        spacing={spacing}
                        onSelectAILevel={setSelectedAILevel}
                        onSpacingChange={setSpacing}
                      />
                    </Col>

                    <Col xs={12}>
                      <AIModifications
                        assets={assets}
                        selectedClassId={selectedClassId}
                        selectedTrackId={selectedTrackId}
                        selectedAILevel={selectedAILevel}
                        spacing={spacing}
                        aifrom={aifrom}
                        aito={aito}
                        hasModifiedPlayerTimes={hasModifiedPlayerTimes}
                        onApply={() => setShowApplyModal(true)}
                        onRestorePlayerTimes={handleRestorePlayerTimes}
                      />
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Apply Modifications Modal */}
      <AIModificationsModal
        show={showApplyModal}
        assets={assets}
        selectedClassId={selectedClassId}
        selectedTrackId={selectedTrackId}
        selectedAILevel={selectedAILevel}
        spacing={spacing}
        aifrom={aifrom}
        aito={aito}
        playerTimesModifications={playerTimesModifications}
        onHide={() => setShowApplyModal(false)}
        onConfirm={handleConfirmApply}
      />

      {/* Remove Generated Confirmation Modal */}
      <Modal
        show={showRemoveGeneratedModal}
        onHide={handleCancelRemoveGenerated}
        data-bs-theme="dark"
      >
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title>Remove Generated AI Levels</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <p className="text-warning">
            ⚠️ <strong>Warning:</strong> This will remove AI levels that appear
            to be generated (sample count = 0).
          </p>
          <p>This action will:</p>
          <ul>
            <li>Remove generated AI levels across all classes/tracks</li>
            <li>Recalculate min/max AI ranges</li>
            <li>
              {getDownloadLabel(electron.isElectron)} a modified
              aiadaptation.xml file
            </li>
          </ul>
          <p>Do you want to continue?</p>
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={handleCancelRemoveGenerated}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleConfirmRemoveGenerated}>
            Remove Generated
          </Button>
        </Modal.Footer>
      </Modal>

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
            <li>
              {getDownloadLabel(electron.isElectron)} a reset aiadaptation.xml
              file
            </li>
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
