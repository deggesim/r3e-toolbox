import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons/faCircleInfo";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { create } from "zustand";

export interface LogEntry {
  type: "info" | "success" | "warning" | "error";
  message: string;
  icon?: IconDefinition;
  timestamp: number;
}

interface ProcessingLogState {
  logs: LogEntry[];
  isOpen: boolean;
  addLog: (
    type: LogEntry["type"],
    message: string,
    icon?: IconDefinition,
  ) => void;
  clearLogs: () => void;
  setLogs: (logs: LogEntry[]) => void;
  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  getLogVariant: (type: LogEntry["type"]) => string;
}

export const useProcessingLogStore = create<ProcessingLogState>((set) => ({
  logs: [],
  isOpen: false,

  addLog: (type, message, icon) => {
    // Derive icon from log type if not provided
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

    set((state) => ({
      logs: [
        ...state.logs,
        { type, message, icon: defaultIcon, timestamp: Date.now() },
      ],
      // Auto-open panel when new logs are added
      isOpen: true,
    }));
  },

  clearLogs: () => set({ logs: [], isOpen: false }),

  setLogs: (logs) => set({ logs }),

  setIsOpen: (isOpen) => set({ isOpen }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  getLogVariant: (type) => {
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
  },
}));
