import { Badge, Card } from "react-bootstrap";
import type { LogEntry } from "../hooks/useProcessingLog";

interface ProcessingLogProps {
  logs: LogEntry[];
  getLogVariant: (type: LogEntry["type"]) => string;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
}

const ProcessingLog = ({
  logs,
  getLogVariant,
  logsEndRef,
}: Readonly<ProcessingLogProps>) => {
  if (logs.length === 0) {
    return null;
  }

  return (
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
        {logs.map((log, index) => (
          <div
            key={`${log.timestamp}-${index}`}
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
  );
};

export default ProcessingLog;
