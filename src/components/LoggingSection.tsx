import { faFolder } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { useProcessingLogStore } from "../store/processingLogStore";

/**
 * Logging section component for Settings page
 * Shows logs location and provides button to open logs folder
 */
export const LoggingSection = () => {
  const electron = useElectronAPI();
  const addLog = useProcessingLogStore((state) => state.addLog);

  const [logsPath, setLogsPath] = useState<string>("");
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const loadLogsPath = async () => {
    if (!electron.isElectron) {
      setLogsPath("Logs are stored in browser console (no file persistence)");
      return;
    }

    try {
      setIsLoadingLogs(true);
      const path = await electron.getLogsPath();
      setLogsPath(path);
    } catch (error) {
      addLog("error", "Failed to get logs path");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleOpenLogsFolder = async () => {
    if (!electron.isElectron) {
      addLog("warning", "Logs folder is only available in Electron mode");
      return;
    }

    try {
      const path = await electron.getLogsPath();
      await electron.openExternal(`file:///${path.replace(/\\/g, "/")}`);
    } catch (error) {
      addLog("error", "Failed to open logs folder");
    }
  };

  if (!electron.isElectron) {
    return null;
  }

  return (
    <Card bg="dark" text="white" className="border-secondary mt-4">
      <Card.Header className="bg-dark border-secondary">
        <h5 className="m-0">
          <FontAwesomeIcon icon={faFolder} className="me-2" />
          Application Logs
        </h5>
      </Card.Header>
      <Card.Body>
        <p className="text-white-50 mb-3">
          In production mode, all application logs are automatically saved to disk.
          Logs are rotated when they exceed 5MB. Latest logs are in{" "}
          <code>C:\Users\{"{username}"}\AppData\Roaming\r3e-toolbox\logs\</code>
        </p>
        <Row className="mb-3">
          <Col xs={12}>
            <Form.Group>
              <Form.Label className="text-white-50">Logs Location</Form.Label>
              <Form.Control
                type="text"
                value={logsPath || "Click load button to get path..."}
                readOnly
                className="bg-secondary text-white border-secondary"
                style={{ fontSize: "0.9rem" }}
              />
            </Form.Group>
          </Col>
        </Row>
        <div className="d-flex gap-2 justify-content-end">
          <Button
            variant="secondary"
            onClick={loadLogsPath}
            disabled={isLoadingLogs}
            size="sm"
          >
            {isLoadingLogs ? "Loading..." : "Load Path"}
          </Button>
          <Button
            variant="primary"
            onClick={handleOpenLogsFolder}
            disabled={!logsPath}
            size="sm"
            title={logsPath ? `Open ${logsPath}` : "Load path first"}
          >
            <FontAwesomeIcon icon={faFolder} className="me-2" />
            Open Logs Folder
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};
