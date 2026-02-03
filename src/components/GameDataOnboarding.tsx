import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Card, Container, Form, Spinner } from "react-bootstrap";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { useGameDataStore } from "../store/gameDataStore";
import type { RaceRoomData } from "../types";

export default function GameDataOnboarding() {
  const navigate = useNavigate();
  const electron = useElectronAPI();
  const { setGameData, forceOnboarding, setForceOnboarding, isLoaded } =
    useGameDataStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Try to load game data automatically on mount
  useEffect(() => {
    const autoLoadGameData = async () => {
      if (forceOnboarding || isLoaded) return;
      if (!electron.isElectron) {
        setError(
          "Game data can only be loaded in Electron mode from RaceRoom installation",
        );
        return;
      }

      setIsLoading(true);
      try {
        const result = await electron.findR3eDataFile();
        if (result.success && result.data) {
          const data: RaceRoomData = JSON.parse(result.data);
          setGameData(data);
        } else {
          setError(
            "r3e-data.json not found in standard RaceRoom installation paths. Please upload it manually.",
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to load game data: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };

    autoLoadGameData();
  }, [electron.isElectron, forceOnboarding, isLoaded, setGameData]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);

    try {
      const text = await file.text();
      const data: RaceRoomData = JSON.parse(text);
      setGameData(data);
      setForceOnboarding(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to parse file: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to AI Management when data is loaded
  useEffect(() => {
    if (isLoaded && !forceOnboarding) {
      navigate("/ai-management", { replace: true });
    }
  }, [isLoaded, forceOnboarding, navigate]);

  return (
    <Container
      fluid
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", background: "#0d1117" }}
    >
      <Card
        bg="dark"
        text="white"
        className="border-secondary"
        style={{ maxWidth: "500px", width: "100%" }}
      >
        <Card.Header className="bg-dark border-secondary py-3">
          <Card.Title className="m-0 text-center">
            🎮 RaceRoom Data Setup
          </Card.Title>
        </Card.Header>
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            {isLoading ? (
              <>
                <Spinner animation="border" className="mb-3" />
                <p className="text-white-50">Loading game data...</p>
              </>
            ) : (
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

          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}

          {!isLoading && (
            <Form.Group controlId="gameDataFile" className="mb-3">
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
        </Card.Body>
      </Card>
    </Container>
  );
}
