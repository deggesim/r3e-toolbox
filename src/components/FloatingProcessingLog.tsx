import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons/faClipboardList";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Badge, Offcanvas } from "react-bootstrap";
import type { LogEntry } from "../hooks/useProcessingLog";
import "./FloatingProcessingLog.css";

interface FloatingProcessingLogProps {
  logs: LogEntry[];
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
  getLogVariant: (type: LogEntry["type"]) => string;
  logsEndRef: RefObject<HTMLDivElement | null>;
}

const FloatingProcessingLog = ({
  logs,
  isOpen,
  onToggle,
  onClear,
  getLogVariant,
  logsEndRef,
}: Readonly<FloatingProcessingLogProps>) => {
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [showMobileOffcanvas, setShowMobileOffcanvas] = useState(false);
  const previousLogCountRef = useRef(logs.length);

  // Auto-open panel when new logs are added and panel is closed
  useEffect(() => {
    const currentLogCount = logs.length;
    const hadNewLogs = currentLogCount > previousLogCountRef.current;

    if (hadNewLogs && !isOpen && currentLogCount > 0) {
      onToggle();
    }

    previousLogCountRef.current = currentLogCount;
  }, [logs.length, isOpen, onToggle]);

  // Auto-scroll when new logs are added (only if panel is open)
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen, logsEndRef]);

  const handleClear = () => {
    onClear();
    // Auto-close panel when clearing logs to avoid empty state
    if (isOpen) {
      onToggle();
    }
  };

  if (logs.length === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop floating panel (hidden on mobile) */}
      <div
        className={`floating-log-panel d-none d-md-flex ${isOpen ? "open" : "collapsed"}`}
      >
        {/* Header */}
        <div className="floating-log-header">
          <div className="floating-log-title">
            <span>Processing Log ({logs.length})</span>
          </div>
          <div className="floating-log-actions">
            <button
              className="floating-log-btn floating-log-clear-btn"
              onClick={handleClear}
              title="Clear logs"
              aria-label="Clear logs"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
            <button
              className="floating-log-btn floating-log-toggle-btn"
              onClick={onToggle}
              title={isOpen ? "Collapse" : "Expand"}
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronUp} />
            </button>
          </div>
        </div>

        {/* Content (only shown when open) */}
        {isOpen && (
          <div className="floating-log-content" ref={logsContainerRef}>
            {logs.map((log, index) => (
              <div
                key={`${log.timestamp}-${index}`}
                className={`floating-log-entry floating-log-entry-${getLogVariant(log.type)}`}
              >
                <span className="floating-log-type">
                  {log.type.toUpperCase()}
                </span>
                <span className="floating-log-message">
                  {log.icon && (
                    <FontAwesomeIcon icon={log.icon} className="me-2" />
                  )}
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Mobile button (visible only on small screens) */}
      <button
        className="mobile-log-button d-md-none"
        onClick={() => setShowMobileOffcanvas(true)}
        aria-label="View logs"
      >
        <FontAwesomeIcon icon={faClipboardList} />
        {logs.length > 0 && (
          <Badge bg="danger" className="mobile-log-badge">
            {logs.length}
          </Badge>
        )}
      </button>

      {/* Mobile Offcanvas */}
      <Offcanvas
        show={showMobileOffcanvas}
        onHide={() => setShowMobileOffcanvas(false)}
        placement="bottom"
        className="d-md-none mobile-log-offcanvas"
        data-bs-theme="dark"
      >
        <Offcanvas.Header
          closeButton
          className="bg-dark border-bottom border-secondary"
        >
          <Offcanvas.Title>
            <FontAwesomeIcon icon={faClipboardList} className="me-2" />
            Processing Log ({logs.length})
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="bg-dark p-3">
          <div className="d-flex justify-content-end mb-2">
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => {
                handleClear();
                setShowMobileOffcanvas(false);
              }}
            >
              <FontAwesomeIcon icon={faXmark} className="me-1" />
              Clear All
            </button>
          </div>
          <div className="mobile-log-content">
            {logs.map((log, index) => (
              <div
                key={`${log.timestamp}-${index}`}
                className={`floating-log-entry floating-log-entry-${getLogVariant(log.type)} mb-2`}
              >
                <span className="floating-log-type">
                  {log.type.toUpperCase()}
                </span>
                <span className="floating-log-message">
                  {log.icon && (
                    <FontAwesomeIcon icon={log.icon} className="me-2" />
                  )}
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default FloatingProcessingLog;
