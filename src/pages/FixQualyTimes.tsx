import { useRef, useState } from "react";
import { Button, Card, Container, Form, Modal } from "react-bootstrap";
import { useProcessingLog } from "../hooks/useProcessingLog";
import ProcessingLog from "../components/ProcessingLog";

export default function FixQualyTimes() {
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
  const { logs, addLog, getLogVariant, setLogs, logsEndRef } =
    useProcessingLog();

  const eventsAreEqual = (event1: any, event2: any) =>
    JSON.stringify(event1) === JSON.stringify(event2);

  const processFiles = async () => {
    setLogs([]);
    if (!qualFile || !raceFile) {
      addLog("warning", "Please select both qualification and race files");
      return;
    }

    setIsProcessing(true);
    setLogs([]);

    try {
      addLog("info", `Reading qualification file: ${qualFile.name}`);
      addLog("info", `Reading race file: ${raceFile.name}`);

      // Read files
      const qualText = await qualFile.text();
      const raceText = await raceFile.text();

      const qual = JSON.parse(qualText);
      const race = JSON.parse(raceText);

      // Validation 1: event equality
      if (!eventsAreEqual(qual.event, race.event)) {
        throw new TypeError(
          "❌ ERROR: 'event' attributes differ between qualification and race file.",
        );
      }
      addLog("success", "✔ 'event' attribute is identical.");

      // Validation 2: bestLapTimeMs must be valid
      qual.drivers.forEach((d: any) => {
        if (typeof d.bestLapTimeMs !== "number" || d.bestLapTimeMs <= -1) {
          throw new TypeError(
            `❌ ERROR: Driver '${d.name}' has invalid bestLapTimeMs: ${d.bestLapTimeMs}`,
          );
        }
      });
      addLog(
        "success",
        "✔ All qualification drivers have valid bestLapTimeMs.",
      );

      // Validation 3: raceTimeMs must be > -1
      race.drivers.forEach((d: any) => {
        if (typeof d.raceTimeMs !== "number" || d.raceTimeMs <= -1) {
          throw new TypeError(
            `❌ ERROR: Driver '${d.name}' has invalid raceTimeMs: ${d.raceTimeMs}`,
          );
        }
      });
      addLog("success", "✔ All race drivers have valid raceTimeMs.");

      // Build map from name → bestLapTimeMs
      const qualTimesMap = new Map(
        qual.drivers.map((d: any) => [d.name, d.bestLapTimeMs]),
      );

      // Patch race file
      let updatedCount = 0;

      race.drivers.forEach((driver: any) => {
        const qualTime = qualTimesMap.get(driver.name);
        if (qualTime === undefined) {
          addLog(
            "warning",
            `⚠ WARNING: Driver '${driver.name}' is not present in qualification file.`,
          );
        } else if (driver.qualTimeMs === -1 || driver.qualTimeMs !== qualTime) {
          driver.qualTimeMs = qualTime;
          updatedCount++;
        }
      });

      addLog("success", `✔ Updated ${updatedCount} driver(s) in race file.`);

      // Generate output filename
      const raceFileName = raceFile.name.replace(/\.(txt|json)$/i, "");
      const outputFileName = `${raceFileName}_fix.txt`;

      addLog("success", `🎉 Processing completed successfully!`);

      // Prepare download data and show modal
      setDownloadData({
        fileName: outputFileName,
        content: JSON.stringify(race, null, 2),
        updatedCount: updatedCount,
      });
      setShowDownloadModal(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog("error", errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setQualFile(null);
    setRaceFile(null);
    setLogs([]);

    // Reset input file elements
    if (qualInputRef.current) qualInputRef.current.value = "";
    if (raceInputRef.current) raceInputRef.current.value = "";
  };

  const handleDownload = () => {
    if (!downloadData) return;

    const blob = new Blob([downloadData.content], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadData.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    addLog("success", `📥 File downloaded: ${downloadData.fileName}`);
    setShowDownloadModal(false);
  };

  const handleCancelDownload = () => {
    addLog("info", "Download cancelled by user.");
    setShowDownloadModal(false);
  };

  return (
    <Container fluid className="py-4">
      <Card bg="dark" text="white" className="border-secondary">
        <Card.Header as="h2" className="text-center page-header-gradient">
          ⏱️ Fix Qualy Times
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
                  ✓ Selected: {qualFile.name}
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
                  ✓ Selected: {raceFile.name}
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

          <ProcessingLog
            logs={logs}
            getLogVariant={getLogVariant}
            logsEndRef={logsEndRef}
          />
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
              <p>✅ Processing completed successfully!</p>
              <ul>
                <li>
                  <strong>Updated drivers:</strong> {downloadData.updatedCount}
                </li>
                <li>
                  <strong>Output file:</strong> {downloadData.fileName}
                </li>
              </ul>
              <p className="text-muted">
                Would you like to download the fixed file?
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={handleCancelDownload}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleDownload}>
            Download
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
