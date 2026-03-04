import { useCallback } from "react";
import { useElectronAPI } from "./useElectronAPI";

type LogLevel = "info" | "error" | "warn" | "debug";

export const useLogger = (prefix = "") => {
  const { isElectron, logInfo, logError, logWarn, logDebug } = useElectronAPI();

  const formatMessage = useCallback(
    (message: string) => {
      return prefix ? `[${prefix}] ${message}` : message;
    },
    [prefix],
  );

  const log = useCallback(
    async (level: LogLevel, message: string, metadata?: unknown) => {
      const formattedMessage = formatMessage(message);

      if (!isElectron) {
        // Fallback to console in web mode
        if (metadata) {
          if (level === "info") {
            console.log(formattedMessage, metadata);
          } else if (level === "error") {
            console.error(formattedMessage, metadata);
          } else if (level === "warn") {
            console.warn(formattedMessage, metadata);
          } else {
            console.debug(formattedMessage, metadata);
          }
        } else {
          if (level === "info") {
            console.log(formattedMessage);
          } else if (level === "error") {
            console.error(formattedMessage);
          } else if (level === "warn") {
            console.warn(formattedMessage);
          } else {
            console.debug(formattedMessage);
          }
        }
        return;
      }

      // Use IPC in Electron mode
      try {
        switch (level) {
          case "info":
            await logInfo(formattedMessage, metadata);
            break;
          case "error":
            await logError(formattedMessage, metadata);
            break;
          case "warn":
            await logWarn(formattedMessage, metadata);
            break;
          case "debug":
            await logDebug(formattedMessage, metadata);
            break;
        }
      } catch (error) {
        console.error("Failed to log to file:", error);
      }
    },
    [formatMessage, isElectron, logInfo, logError, logWarn, logDebug],
  );

  return {
    info: (message: string, metadata?: unknown) =>
      log("info", message, metadata),
    error: (message: string, metadata?: unknown) =>
      log("error", message, metadata),
    warn: (message: string, metadata?: unknown) =>
      log("warn", message, metadata),
    debug: (message: string, metadata?: unknown) =>
      log("debug", message, metadata),
  };
};
