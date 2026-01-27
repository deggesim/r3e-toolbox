import { useState, useRef } from "react";
import { Card, Container, Form, Button, Alert, Badge } from "react-bootstrap";

interface LogEntry {
  type: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: number;
}

export default function FixQualyTimes() {
  const [qualFile, setQualFile] = useState<File | null>(null);
  const [raceFile, setRaceFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry["type"], message: string) => {
    setLogs((prev) => [...prev, { type, message, timestamp: Date.now() }]);
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const eventsAreEqual = (event1: any, event2: any) =>
    JSON.stringify(event1) === JSON.stringify(event2);

  const processFiles = async () => {
    if (!qualFile || !raceFile) {
      setError("Please select both qualification and race files");
      return;
    }

    setIsProcessing(true);
    setError(null);
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
        if (typeof d.bestLapTimeMs !== "number") {
          throw new TypeError(
            `❌ ERROR: Driver '${d.name}' has invalid bestLapTimeMs: ${d.bestLapTimeMs}`,
          );
        }
      });
      addLog(
        "success",
        "✔ All qualification drivers have valid bestLapTimeMs.",
      );

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

      // Wait for logs to render before showing confirmation dialog
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Ask for confirmation before download
      const shouldDownload = window.confirm(
        `File processed successfully!\n\nUpdated ${updatedCount} driver(s).\n\nDownload the fixed file:\n${outputFileName}?`,
      );

      if (shouldDownload) {
        // Create download
        const outputContent = JSON.stringify(race, null, 2);
        const blob = new Blob([outputContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = outputFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        addLog("success", `📥 File downloaded: ${outputFileName}`);
      } else {
        addLog("info", `Download cancelled by user.`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog("error", errorMessage);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const getLogVariant = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "success";
      case "warning":
        return "warning";
      case "error":
        return "danger";
      default:
        return "info";
    }
  };

  const reset = () => {
    setQualFile(null);
    setRaceFile(null);
    setLogs([]);
    setError(null);
  };

  return (
    <Container className="py-4">
      <Card bg="dark" text="white" className="border-secondary">
        <Card.Header
          as="h2"
          className="text-center"
          style={{
            background: "linear-gradient(135deg, #646cff 0%, #535bf2 100%)",
            color: "white",
          }}
        >
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

            {error && (
              <Alert
                variant="danger"
                dismissible
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

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

          {logs.length > 0 && (
            <Card bg="dark" className="mt-4 border-secondary">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Processing Log</span>
                <Badge bg="secondary">{logs.length} entries</Badge>
              </Card.Header>
              <Card.Body
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  fontFamily: "monospace",
                  fontSize: "0.9rem",
                }}
              >
                {logs.map((log) => (
                  <div
                    key={log.timestamp}
                    className={`mb-2 p-2 rounded bg-${getLogVariant(
                      log.type,
                    )} bg-opacity-10 border border-${getLogVariant(
                      log.type,
                    )} border-opacity-25`}
                    style={{ color: "#ffffff" }}
                  >
                    <Badge bg={getLogVariant(log.type)} className="me-2">
                      {log.type.toUpperCase()}
                    </Badge>
                    <span style={{ color: "#e8e8e8" }}>{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </Card.Body>
            </Card>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
