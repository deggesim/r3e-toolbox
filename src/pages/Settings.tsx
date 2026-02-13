import { faGear } from "@fortawesome/free-solid-svg-icons/faGear";
import { faSync } from "@fortawesome/free-solid-svg-icons/faSync";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo, useState } from "react";
import { Button, Card, Col, Container, Form, Row } from "react-bootstrap";
import type { Config } from "../config";
import { CFG } from "../config";
import { useConfigStore } from "../store/configStore";
import { useGameDataStore } from "../store/gameDataStore";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { useProcessingLog } from "../hooks/useProcessingLog";
import { validateR3eData } from "../utils/r3eDataValidator";
import ProcessingLog from "../components/ProcessingLog";
import type { RaceRoomData } from "../types";

type NumericConfigKey = {
  [K in keyof Config]: Config[K] extends number ? K : never;
}[keyof Config];

type BooleanConfigKey = {
  [K in keyof Config]: Config[K] extends boolean ? K : never;
}[keyof Config];

type NumberField = {
  key: NumericConfigKey;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  helper?: string;
};

const numberFields: NumberField[] = [
  { key: "minAI", label: "Minimum AI", min: 60, max: 120, step: 1 },
  { key: "maxAI", label: "Maximum AI", min: 60, max: 120, step: 1 },
  {
    key: "testMinAIdiffs",
    label: "Min AI spread for fitting",
    min: 1,
    max: 20,
    step: 1,
    helper: "Minimum distance between lowest and highest sampled AI levels",
  },
  {
    key: "testMaxTimePct",
    label: "Max deviation pct",
    min: 0,
    max: 1,
    step: 0.01,
    helper: "Tolerance as a fraction of the minimum lap time (e.g. 0.1 = 10%)",
  },
  {
    key: "testMaxFailsPct",
    label: "Max failure pct",
    min: 0,
    max: 1,
    step: 0.01,
    helper: "Allowed share of samples that can fail validation",
  },
  {
    key: "aiNumLevels",
    label: "AI levels applied",
    min: 1,
    max: 20,
    step: 1,
    helper: "Number of AI levels applied around the selected target",
  },
  {
    key: "aiSpacing",
    label: "AI spacing",
    min: 1,
    max: 5,
    step: 1,
    helper: "Step between AI levels when writing generated times",
  },
];

const Settings = () => {
  const electron = useElectronAPI();
  const { config, setConfig, resetConfig } = useConfigStore();
  const forceOnboarding = useGameDataStore((state) => state.forceOnboarding);
  const setForceOnboarding = useGameDataStore(
    (state) => state.setForceOnboarding,
  );
  const clearGameData = useGameDataStore((state) => state.clearGameData);
  const setGameData = useGameDataStore((state) => state.setGameData);
  const { logs, addLog, logsEndRef, getLogVariant } = useProcessingLog();

  const [localConfig, setLocalConfig] = useState<Config>(config);
  const [isReloading, setIsReloading] = useState(false);

  const handleNumberChange = (key: NumericConfigKey, value: number) => {
    if (Number.isFinite(value)) {
      setLocalConfig({ ...localConfig, [key]: value });
    }
  };

  const handleBooleanChange = (key: BooleanConfigKey, value: boolean) => {
    setLocalConfig({ ...localConfig, [key]: value });
  };

  const handleSaveConfig = () => {
    setConfig(localConfig);
    addLog("success", "Settings saved successfully!", faCheck);
  };

  const handleResetConfig = () => {
    resetConfig();
    setLocalConfig(CFG);
    addLog("success", "Settings reset to defaults!", faCheck);
  };

  const handleReloadGameData = async () => {
    if (!electron.isElectron) {
      addLog("error", "Game data reload is only available in Electron mode");
      return;
    }

    setIsReloading(true);
    addLog("info", "Searching for r3e-data.json...");

    try {
      const result = await electron.findR3eDataFile();
      if (result.success && result.data) {
        addLog("success", `Found r3e-data.json at: ${result.path}`);
        addLog("info", "Validating file structure...");

        const parsed = JSON.parse(result.data);
        const validation = validateR3eData(parsed);

        if (validation.valid) {
          setGameData(parsed as RaceRoomData);
          const classCount = Object.keys(parsed.classes).length;
          const trackCount = Object.keys(parsed.tracks).length;
          addLog(
            "info",
            `Loaded ${classCount} classes and ${trackCount} tracks`,
          );

          if (validation.warnings.length > 0) {
            validation.warnings.forEach((warning) => {
              addLog("warning", warning, faExclamationTriangle);
            });
          }

          addLog("success", "Game data reloaded successfully!", faCheck);
        } else {
          validation.errors.forEach((error) => {
            addLog("error", error);
          });
        }
      } else {
        const errorMsg = result.error || "Failed to find r3e-data.json";
        addLog("error", errorMsg);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addLog("error", `Failed to reload game data: ${message}`);
    } finally {
      setIsReloading(false);
    }
  };

  const booleanFields = useMemo(
    () => [
      {
        key: "fitAll" as BooleanConfigKey,
        label: "Fit all lap times",
        helper:
          "If enabled, use every lap time instead of the average per AI level when fitting.",
      },
    ],
    [],
  );

  return (
    <Container className="py-4">
      <Card bg="dark" text="white" className="border-secondary mb-4">
        <Card.Header as="h2" className="text-center page-header-gradient">
          <span className="menu-icon me-2">
            <FontAwesomeIcon icon={faGear} />
          </span>
          Settings
        </Card.Header>
        <Card.Body>
          <Card.Text className="text-white-50 mb-4">
            Configure fitting and UI defaults. Values persist in your browser
            localStorage and can be reset to the built-in defaults from
            config.ts.
          </Card.Text>

          <Row className="g-4">
            {numberFields.map((field) => (
              <Col md={6} key={field.key}>
                <Form.Group>
                  <Form.Label className="d-flex justify-content-between">
                    <span>{field.label}</span>
                    <small className="text-white-50">
                      Default: {CFG[field.key]}
                    </small>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    value={localConfig[field.key]}
                    onChange={(e) =>
                      handleNumberChange(field.key, Number(e.target.value))
                    }
                  />
                  {field.helper && (
                    <Form.Text className="text-white-50">
                      {field.helper}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            ))}

            {booleanFields.map((field) => (
              <Col md={6} key={field.key}>
                <Form.Group className="d-flex align-items-center justify-content-between p-3 border border-secondary rounded">
                  <div>
                    <div>{field.label}</div>
                    {field.helper && (
                      <Form.Text className="text-white-50">
                        {field.helper}
                      </Form.Text>
                    )}
                  </div>
                  <Form.Check
                    type="switch"
                    id={field.key}
                    checked={Boolean(localConfig[field.key])}
                    onChange={(e) =>
                      handleBooleanChange(field.key, e.target.checked)
                    }
                  />
                </Form.Group>
              </Col>
            ))}
            {import.meta.env.DEV && (
              <Col md={6}>
                <Form.Group className="d-flex align-items-center justify-content-between p-3 border border-secondary rounded">
                  <div>
                    <div>Developer: force onboarding</div>
                    <Form.Text className="text-white-50">
                      Always show the GameData onboarding screen on startup.
                    </Form.Text>
                  </div>
                  <Form.Check
                    type="switch"
                    id="forceOnboarding"
                    checked={forceOnboarding}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForceOnboarding(checked);
                      if (checked) {
                        clearGameData();
                      }
                    }}
                  />
                </Form.Group>
              </Col>
            )}
          </Row>

          <div className="d-flex justify-content-end mt-4 gap-2">
            <Button variant="secondary" onClick={handleResetConfig}>
              Reset to defaults
            </Button>
            <Button variant="success" onClick={handleSaveConfig}>
              Save Settings
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card bg="dark" text="white" className="border-secondary">
        <Card.Header className="bg-dark border-secondary">
          <h5 className="m-0">
            <FontAwesomeIcon icon={faSync} className="me-2" />
            Game Data Management
          </h5>
        </Card.Header>
        <Card.Body>
          <p className="text-white-50">
            Reload r3e-data.json from your RaceRoom installation directory. Use
            this when the game has been updated with new content.
          </p>

          <div className="d-flex justify-content-end">
            <Button
              variant="primary"
              onClick={handleReloadGameData}
              disabled={isReloading}
            >
              {isReloading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Reloading...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSync} className="me-2" />
                  Reload Game Data
                </>
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>

      <ProcessingLog
        logs={logs}
        logsEndRef={logsEndRef}
        getLogVariant={getLogVariant}
      />
    </Container>
  );
};

export default Settings;
