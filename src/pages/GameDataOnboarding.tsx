import { faArrowRight } from "@fortawesome/free-solid-svg-icons/faArrowRight";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { faFlagCheckered } from "@fortawesome/free-solid-svg-icons/faFlagCheckered";
import { faFolder } from "@fortawesome/free-solid-svg-icons/faFolder";
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch";
import { faUpload } from "@fortawesome/free-solid-svg-icons/faUpload";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button, Card, Container, Form, Spinner } from "react-bootstrap";
import FloatingProcessingLog from "../components/FloatingProcessingLog";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { useGameDataStore } from "../store/gameDataStore";
import { useProcessingLogStore } from "../store/processingLogStore";
import type { RaceRoomData } from "../types";
import { validateR3eData } from "../utils/r3eDataValidator";

const GameDataOnboarding = () => {
  const electron = useElectronAPI();
  const { setGameData } = useGameDataStore();
  const addLog = useProcessingLogStore((state) => state.addLog);

  const [isLoading, setIsLoading] = useState(false);
  const [loadSuccess, setLoadSuccess] = useState(false);
  const [parsedData, setParsedData] = useState<RaceRoomData | null>(null);

  const autoLoadAttemptedRef = useRef(false);

  // Try to load game data automatically on mount
  useEffect(() => {
    const autoLoadGameData = async () => {
      // Prevent double execution in React StrictMode (dev mode)
      if (autoLoadAttemptedRef.current) return;
      autoLoadAttemptedRef.current = true;

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
          addLog("info", "Validating file structure...");

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

    if (electron.isElectron) {
      autoLoadGameData();
    } else {
      true;
      addLog(
        "warning",
        "Game data can only be loaded in Electron mode from RaceRoom installation",
      );
      return;
    }
  }, [electron.isElectron]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadSuccess(false);
    setIsLoading(true);
    addLog("info", `Loading file: ${file.name}`);

    try {
      const text = await file.text();
      addLog("info", "Validating file structure...");
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

        setParsedData(parsed as RaceRoomData);
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
    setGameData(parsedData!);
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
            <FontAwesomeIcon icon={faFlagCheckered} className="me-2" />
            RaceRoom Data Setup
          </Card.Title>
        </Card.Header>
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <p className="text-white-50 mb-3">
              The application needs to load <strong>r3e-data.json</strong> to
              function properly. This file contains information about tracks and
              cars in RaceRoom.
            </p>
            <p className="text-white-50 mb-4">
              <FontAwesomeIcon icon={faFolder} className="me-2" />
              The file is typically located in the game installation folder:{" "}
              <code className="d-block text-white mt-2">
                RaceRoom Racing Experience/Game/GameData/General/r3e-data.json
              </code>
            </p>
          </div>

          <Form.Group controlId="gameDataFile" className="mb-4">
            <Form.Label className="text-white">
              <FontAwesomeIcon icon={faUpload} className="me-2" />
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

          {isLoading && (
            <div className="text-center my-3">
              <Spinner animation="border" variant="primary" />
            </div>
          )}

          {loadSuccess && (
            <div className="text-center mt-4">
              <Button variant="success" onClick={handleContinue}>
                Continue to AI Management
                <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Floating Processing Log */}
      <FloatingProcessingLog />
    </Container>
  );
};

export default GameDataOnboarding;
