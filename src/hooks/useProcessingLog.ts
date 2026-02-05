import { useRef, useState } from "react";

export interface LogEntry {
  type: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: number;
}

export const useProcessingLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry["type"], message: string) => {
    setLogs((prev) => [...prev, { type, message, timestamp: Date.now() }]);
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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

  const clearLogs = () => {
    setLogs([]);
  };

  return { logs, addLog, logsEndRef, getLogVariant, clearLogs, setLogs };
};
