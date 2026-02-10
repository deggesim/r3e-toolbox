import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons/faCircleInfo";
import { useRef, useState } from "react";

export interface LogEntry {
  type: "info" | "success" | "warning" | "error";
  message: string;
  icon?: IconDefinition;
  timestamp: number;
}

export const useProcessingLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (
    type: LogEntry["type"],
    message: string,
    icon?: IconDefinition,
  ) => {
    // Se l'icona non è presente, derivala dal tipo di log
    const defaultIcon =
      icon ||
      (() => {
        switch (type) {
          case "success":
            return faCheck;
          case "warning":
            return faExclamationTriangle;
          case "error":
            return faXmark;
          case "info":
            return faCircleInfo;
        }
      })();

    setLogs((prev) => [
      ...prev,
      { type, message, icon: defaultIcon, timestamp: Date.now() },
    ]);
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
