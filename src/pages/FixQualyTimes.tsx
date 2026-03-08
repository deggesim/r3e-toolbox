import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faClock } from "@fortawesome/free-solid-svg-icons/faClock";
import { faDownload } from "@fortawesome/free-solid-svg-icons/faDownload";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRef, useState } from "react";
import { Button, Card, Container, Form, Modal } from "react-bootstrap";
import { useProcessingLogStore } from "../store/processingLogStore";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { getDownloadLabel, getDownloadedLabel } from "../utils/platformLabels";
import { saveTextFile } from "../utils/fileSaver";

type RaceResultDriver = {
  name: string;
  bestLapTimeMs?: number;
  raceTimeMs?: number;
  qualTimeMs?: number;
};

type RaceResultFile = {
  event: Record<string, unknown>;
  drivers: RaceResultDriver[];
};

const FixQualyTimes = () => {
  const electronAPI = useElectronAPI();
  const { isElectron } = electronAPI;
  const [qualFile, setQualFile] = useState<File | null>(null);
  const [raceFile, setRaceFile] = useState<File | null>(null);
  const qualInputRef = useRef<HTMLInputElement>(null);
  const raceInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadData, setDownloadData] = useState<{
    fileName: string;
    content: string;
    updatedCount: number;
  } | null>(null);
  const addLog = useProcessingLogStore((state) => state.addLog);

  const eventsAreEqual = (
    event1: Record<string, unknown>,
    event2: Record<string, unknown>,
  ) => JSON.stringify(event1) === JSON.stringify(event2);

  const processFiles = async () => {
    if (!qualFile || !raceFile) {
      addLog(
        "warning",
        "Please select both qualification and race files.",
        faExclamationTriangle,
      );
      return;
    }

    setIsProcessing(true);
    try {
      const qualText = await qualFile.text();
      const raceText = await raceFile.text();
      const qual = JSON.parse(qualText) as RaceResultFile;
      const race = JSON.parse(raceText) as RaceResultFile;

      addLog(
        "info",
        `Qualification file loaded: ${qualFile.name} (${qual.drivers.length} drivers)`,
        faClock,
      );
      addLog(
        "info",
        `Race file loaded: ${raceFile.name} (${race.drivers.length} drivers)`,
        faClock,
      );

      if (!eventsAreEqual(qual.event, race.event)) {
        addLog(
          "error",
          "Qualification and race files do not belong to the same event.",
          faXmark,
        );
        return;
      }

      // Validation 1: bestLapTimeMs must be a valid number
      qual.drivers.forEach((d: RaceResultDriver) => {
        if (typeof d.bestLapTimeMs !== "number" || d.bestLapTimeMs <= 0) {
          throw new TypeError(
            `Driver '${d.name}' has invalid bestLapTimeMs: ${d.bestLapTimeMs}`,
          );
        }
      });
      addLog(
        "success",
        "All qualification drivers have valid bestLapTimeMs.",
        faCheck,
      );

      // Validation 2: raceTimeMs must be > -1
      race.drivers.forEach((d: RaceResultDriver) => {
        if (typeof d.raceTimeMs !== "number" || d.raceTimeMs <= -1) {
          throw new TypeError(
            `Driver '${d.name}' has invalid raceTimeMs: ${d.raceTimeMs}`,
          );
        }
      });
      addLog("success", "All race drivers have valid raceTimeMs.", faCheck);

      // Build map from name → bestLapTimeMs
      const qualTimesMap = new Map(
        qual.drivers.map((d: RaceResultDriver) => [d.name, d.bestLapTimeMs]),
      );

      // Patch race file
      let updatedCount = 0;

      race.drivers.forEach((driver: RaceResultDriver) => {
        const qualTime = qualTimesMap.get(driver.name);
        if (qualTime === undefined) {
          addLog(
            "warning",
            `Driver '${driver.name}' is not present in qualification file.`,
            faExclamationTriangle,
          );
        } else if (driver.qualTimeMs === -1 || driver.qualTimeMs !== qualTime) {
          driver.qualTimeMs = qualTime;
          updatedCount++;
        }
      });

      addLog(
        "success",
        `Updated ${updatedCount} driver(s) in race file.`,
        faCheck,
      );

      // Generate output filename
      const raceFileName = raceFile.name.replace(/\.(txt|json)$/i, "");
      const outputFileName = `${raceFileName}_fix.txt`;

      addLog("success", `Processing completed successfully!`, faCheck);

      // Prepare download data and show modal
      setDownloadData({
        fileName: outputFileName,
        content: JSON.stringify(race, null, 2),
        updatedCount: updatedCount,
      });
      setShowDownloadModal(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog("error", errorMessage, faXmark);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setQualFile(null);
    setRaceFile(null);

    // Reset input file elements
    if (qualInputRef.current) qualInputRef.current.value = "";
    if (raceInputRef.current) raceInputRef.current.value = "";
  };

  const handleDownload = async () => {
    if (!downloadData) return;

    const saved = await saveTextFile({
      electronAPI,
      filename: downloadData.fileName,
      content: downloadData.content,
      mimeType: "application/json",
      filters: [
        { name: "JSON Files", extensions: ["json"] },
        { name: "All Files", extensions: ["*"] },
      ],
      onCancel: () => {
        addLog("info", `${getDownloadLabel(isElectron)} cancelled by user.`);
        setShowDownloadModal(false);
      },
    });

    if (!saved) {
      return;
    }

    const verb = getDownloadedLabel(isElectron).toLowerCase();
    addLog("success", `File ${verb}: ${downloadData.fileName}`, faCheck);
    setShowDownloadModal(false);
  };

  const handleCancelDownload = () => {
    const action = getDownloadLabel(isElectron);
    addLog("info", `${action} cancelled by user.`);
    setShowDownloadModal(false);
  };

  return (
    <Container fluid className="py-4">
      <Card bg="dark" text="white" className="border-secondary">
        <Card.Header as="h2" className="text-center page-header-gradient">
          <FontAwesomeIcon icon={faClock} className="me-2" />
          Fix Qualy Times
        </Card.Header>
        <Card.Body>
          <Card.Text className="text-white-50 mb-4">
            This tool adds missing qualification times to race result files by
            extracting them from the qualification session file.
          </Card.Text>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Qualification File (.txt)</Form.Label>
              <Form.Control
                ref={qualInputRef}
                type="file"
                accept=".txt,.json"
                onChange={(e) =>
                  setQualFile((e.target as HTMLInputElement).files?.[0] || null)
                }
                disabled={isProcessing}
              />
              {qualFile && (
                <Form.Text className="text-success">
                  Selected: {qualFile.name}
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Race File (.txt)</Form.Label>
              <Form.Control
                ref={raceInputRef}
                type="file"
                accept=".txt,.json"
                onChange={(e) =>
                  setRaceFile((e.target as HTMLInputElement).files?.[0] || null)
                }
                disabled={isProcessing}
              />
              {raceFile && (
                <Form.Text className="text-success">
                  Selected: {raceFile.name}
                </Form.Text>
              )}
            </Form.Group>

            <div className="d-flex gap-2">
              <Button
                variant="primary"
                onClick={processFiles}
                disabled={!qualFile || !raceFile || isProcessing}
                className="px-4"
              >
                {isProcessing ? "Processing..." : "Fix Qualy Times"}
              </Button>
              <Button
                variant="secondary"
                onClick={reset}
                disabled={isProcessing}
              >
                Reset
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Download Confirmation Modal */}
      <Modal
        show={showDownloadModal}
        onHide={handleCancelDownload}
        data-bs-theme="dark"
      >
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title>File Processed Successfully</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          {downloadData && (
            <>
              <p>Processing completed successfully!</p>
              <ul>
                <li>
                  <strong>Updated drivers:</strong> {downloadData.updatedCount}
                </li>
                <li>
                  <strong>Output file:</strong> {downloadData.fileName}
                </li>
              </ul>
              <p className="text-muted">
                Would you like to {getDownloadLabel(isElectron).toLowerCase()}{" "}
                the fixed file?
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={handleCancelDownload}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleDownload}>
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            {getDownloadLabel(isElectron)}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default FixQualyTimes;
