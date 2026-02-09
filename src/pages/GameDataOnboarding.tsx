import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button, Card, Container, Form, Spinner } from "react-bootstrap";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons/faClipboardList";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import ProcessingLog from "../components/ProcessingLog";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { useProcessingLog } from "../hooks/useProcessingLog";
import { useGameDataStore } from "../store/gameDataStore";
import type { RaceRoomData } from "../types";
import { validateR3eData } from "../utils/r3eDataValidator";

const GameDataOnboarding = () => {
  const electron = useElectronAPI();
  const { setGameData, setForceOnboarding } = useGameDataStore();
  const { logs, addLog, logsEndRef, getLogVariant } = useProcessingLog();

  const [isLoading, setIsLoading] = useState(false);
  const [loadSuccess, setLoadSuccess] = useState(false);
  const autoLoadAttemptedRef = useRef(false);

  // Try to load game data automatically on mount
  useEffect(() => {
    const autoLoadGameData = async () => {
      // Prevent double execution in React StrictMode (dev mode)
      if (autoLoadAttemptedRef.current) return;
      autoLoadAttemptedRef.current = true;

      if (!electron.isElectron) {
        addLog(
          "warning",
          "Game data can only be loaded in Electron mode from RaceRoom installation",
        );
        return;
      }

      setIsLoading(true);
      addLog(
        "info",
        "Searching for r3e-data.json in standard paths...",
        faSearch,
      );

      try {
        const result = await electron.findR3eDataFile();
        if (result.success && result.data) {
          addLog(
            "success",
            `Found r3e-data.json at: ${result.path || "auto-detected path"}`,
            faCheck,
          );
          addLog("info", "Validating file structure...", faClipboardList);

          // Validate and parse the data
          const parsed = JSON.parse(result.data);
          const validation = validateR3eData(parsed);

          if (validation.valid) {
            addLog("success", "File structure is valid");

            // Log stats
            const classCount = Object.keys(parsed.classes).length;
            const trackCount = Object.keys(parsed.tracks).length;
            addLog(
              "info",
              `Loaded ${classCount} classes and ${trackCount} tracks`,
            );

            // Log warnings if any
            if (validation.warnings.length > 0) {
              validation.warnings.forEach((warning) => {
                addLog("warning", warning, faExclamationTriangle);
              });
            }

            setGameData(parsed as RaceRoomData);
            setLoadSuccess(true);
            addLog("success", "Game data loaded successfully!", faCheck);
          } else {
            validation.errors.forEach((error) => {
              addLog("error", error, faXmark);
            });
            addLog(
              "error",
              "Failed to load game data: validation errors",
              faXmark,
            );
          }
        } else {
          addLog(
            "warning",
            "r3e-data.json not found in standard paths. Please upload it manually.",
            faExclamationTriangle,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        addLog("error", `Failed to load game data: ${message}`, faXmark);
      } finally {
        setIsLoading(false);
      }
    };

    autoLoadGameData();
  }, [electron.isElectron]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadSuccess(false);
    setIsLoading(true);
    addLog("info", `Loading file: ${file.name}`, faClipboardList);

    try {
      const text = await file.text();
      addLog("info", "Validating file structure...", faClipboardList);

      // Validate and parse the uploaded file
      const parsed = JSON.parse(text);
      const validation = validateR3eData(parsed);

      if (validation.valid) {
        addLog("success", "File structure is valid");

        // Log stats
        const classCount = Object.keys(parsed.classes).length;
        const trackCount = Object.keys(parsed.tracks).length;
        addLog("info", `Loaded ${classCount} classes and ${trackCount} tracks`);

        // Log warnings if any
        if (validation.warnings.length > 0) {
          validation.warnings.forEach((warning) => {
            addLog("warning", warning, faExclamationTriangle);
          });
        }

        setGameData(parsed as RaceRoomData);
        setLoadSuccess(true);
        addLog("success", "Game data loaded successfully!", faCheck);
      } else {
        validation.errors.forEach((error) => {
          addLog("error", error, faXmark);
        });
        addLog("error", "Failed to load game data: validation errors", faXmark);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addLog("error", `Failed to parse file: ${message}`, faXmark);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    setForceOnboarding(false);
  };

  return (
    <Container
      fluid
      className="d-flex align-items-center justify-content-center"
      style={{
        minHeight: "100vh",
        background: "#0d1117",
        paddingTop: "2rem",
        paddingBottom: "2rem",
      }}
    >
      <Card
        bg="dark"
        text="white"
        className="border-secondary"
        style={{ maxWidth: "700px", width: "100%" }}
      >
        <Card.Header className="bg-dark border-secondary py-3">
          <Card.Title className="m-0 text-center">
            🎮 RaceRoom Data Setup
          </Card.Title>
        </Card.Header>
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            {!isLoading && !loadSuccess && (
              <>
                <p className="text-white-50 mb-3">
                  The application needs to load <strong>r3e-data.json</strong>{" "}
                  to function properly. This file contains information about
                  tracks and cars in RaceRoom.
                </p>
                <p className="text-white-50 mb-4">
                  The file is typically located in the game installation folder:
                  <code className="d-block text-white mt-2">
                    RaceRoom Racing
                    Experience/Game/GameData/General/r3e-data.json
                  </code>
                </p>
              </>
            )}
          </div>

          {!isLoading && !loadSuccess && (
            <Form.Group controlId="gameDataFile" className="mb-4">
              <Form.Label className="text-white">
                Upload r3e-data.json
              </Form.Label>
              <Form.Control
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
              <Form.Text className="text-white-50">
                Select the r3e-data.json file from your RaceRoom installation
              </Form.Text>
            </Form.Group>
          )}

          {logs.length > 0 && (
            <div className="mb-4">
              <h5 className="text-white mb-3">Loading Status</h5>
              <ProcessingLog
                logs={logs}
                logsEndRef={logsEndRef}
                getLogVariant={getLogVariant}
              />
            </div>
          )}

          {isLoading && (
            <div className="text-center my-3">
              <Spinner animation="border" variant="primary" />
            </div>
          )}

          {loadSuccess && (
            <div className="text-center mt-4">
              <Button variant="success" onClick={handleContinue}>
                Continue to AI Management →
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default GameDataOnboarding;
