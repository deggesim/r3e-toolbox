import { dialog, BrowserWindow } from "electron";
import isDev from "electron-is-dev";
import type { AppUpdater, UpdateInfo, ProgressInfo } from "electron-updater";

let updateCheckInProgress = false;
let autoUpdater: AppUpdater | null = null;
let pendingManualNoUpdateNotification = false;
let devUpdateHandlers: {
  handleUpdateAvailable: (info: UpdateInfo) => void;
  handleUpdateNotAvailable: () => void;
  handleError: (error: Error) => void;
  handleDownloadProgress: (progressObj: ProgressInfo) => void;
  handleUpdateDownloaded: () => void;
} | null = null;
let mainWindowRef: BrowserWindow | null = null;
let updateMetadataUnavailable = false;

const isMissingUpdateMetadataError = (error: unknown): boolean => {
  const message = String((error as Error)?.message ?? error ?? "");
  return (
    message.includes("Cannot find latest.yml") ||
    (message.includes("latest.yml") && message.includes("404"))
  );
};

const withSuppressedDep0169Warning = async <T>(
  operation: () => Promise<T>,
): Promise<T> => {
  const originalEmitWarning = process.emitWarning;

  process.emitWarning = function patchedEmitWarning(
    warning: string | Error,
    ...args: unknown[]
  ) {
    const warningCode =
      (typeof warning === "object" && (warning as NodeJS.ErrnoException)?.code) ||
      (typeof args[1] === "string" ? args[1] : undefined);

    if (warningCode === "DEP0169") {
      return;
    }

    return (originalEmitWarning as (...a: unknown[]) => void).call(
      process,
      warning,
      ...args,
    );
  };

  try {
    return await operation();
  } finally {
    process.emitWarning = originalEmitWarning;
  }
};

// Lazy load autoUpdater at runtime to avoid bundling issues with electron-builder
const getAutoUpdater = async (): Promise<AppUpdater | null> => {
  if (autoUpdater === null) {
    const module = await import("electron-updater");
    autoUpdater =
      module.autoUpdater ??
      (module as unknown as { default?: { autoUpdater?: AppUpdater } }).default?.autoUpdater ??
      (module as unknown as { default?: AppUpdater }).default ??
      null;
  }
  return autoUpdater;
};

export const initAutoUpdater = async (mainWindow: BrowserWindow): Promise<void> => {
  mainWindowRef = mainWindow;
  const updater = isDev
    ? ({ on: () => {} } as unknown as AppUpdater)
    : await getAutoUpdater();

  if (!updater) {
    console.error("[Updater] Auto-updater module is unavailable");
    return;
  }

  if (isDev) {
    console.log(
      "[Updater] Running in development mode, auto-update checks disabled",
    );
  } else {
    // Configure electron-updater
    updater.autoDownload = false; // Download only when user agrees

    // Check for updates on startup (after 5 seconds)
    setTimeout(() => {
      checkForUpdates(updater);
    }, 5000);

    // Check for updates every hour
    setInterval(() => {
      checkForUpdates(updater);
    }, 3600000); // 1 hour
  }

  // Handle update events (registered for both dev and prod)
  const handleUpdateAvailable = (info: UpdateInfo): void => {
    console.log("[Updater] Update available:", info);
    pendingManualNoUpdateNotification = false;
    if (!isDev) showUpdateDialog(mainWindow, info, updater);
  };

  const handleUpdateNotAvailable = (): void => {
    console.log("[Updater] Already on latest version");

    if (pendingManualNoUpdateNotification) {
      pendingManualNoUpdateNotification = false;
      showNoUpdatesDialog(mainWindow);
    }
  };

  const handleError = (error: Error): void => {
    if (isMissingUpdateMetadataError(error)) {
      if (!updateMetadataUnavailable) {
        console.warn(
          "[Updater] Update metadata (latest.yml) not found in the latest GitHub release. Auto-update checks are disabled until next app restart.",
        );
      }
      updateMetadataUnavailable = true;
      pendingManualNoUpdateNotification = false;
      return;
    }

    console.error("[Updater] Update check error:", error);
    pendingManualNoUpdateNotification = false;
  };

  const handleDownloadProgress = (progressObj: ProgressInfo): void => {
    const percent = Math.round(progressObj.percent);
    console.log(`[Updater] Download progress: ${percent}%`);
    mainWindow.webContents.send("update-download-progress", {
      percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  };

  const handleUpdateDownloaded = (): void => {
    console.log("[Updater] Update downloaded successfully");
    if (!isDev) showInstallDialog(mainWindow, updater);
  };

  // Store handlers for dev mode simulation
  if (isDev) {
    devUpdateHandlers = {
      handleUpdateAvailable,
      handleUpdateNotAvailable,
      handleError,
      handleDownloadProgress,
      handleUpdateDownloaded,
    };
  } else {
    updater.on("update-available", handleUpdateAvailable);
    updater.on("update-not-available", handleUpdateNotAvailable);
    updater.on("error", handleError);
    updater.on("download-progress", handleDownloadProgress);
    updater.on("update-downloaded", handleUpdateDownloaded);
  }
};

const checkForUpdates = async (
  updater: AppUpdater,
  { manual = false }: { manual?: boolean } = {},
): Promise<void> => {
  if (updateCheckInProgress) {
    console.log("[Updater] Check already in progress, skipping");
    return;
  }

  if (updateMetadataUnavailable) {
    console.log(
      "[Updater] Update checks are temporarily disabled: latest.yml is not available in the current GitHub release.",
    );

    if (manual && mainWindowRef) {
      showUpdatesUnavailableDialog(mainWindowRef);
    }
    return;
  }

  pendingManualNoUpdateNotification = manual;
  updateCheckInProgress = true;
  console.log("[Updater] Checking for updates...");

  if (isDev) {
    // In dev mode, simulate a check with a delay
    setTimeout(() => {
      console.log("[Updater] Dev mode: check simulated, no updates available");
      if (devUpdateHandlers?.handleUpdateNotAvailable) {
        devUpdateHandlers.handleUpdateNotAvailable();
      }
      updateCheckInProgress = false;
    }, 1000);
  } else {
    withSuppressedDep0169Warning(() => updater.checkForUpdates())
      .catch((error: unknown) => {
        if (isMissingUpdateMetadataError(error)) {
          if (!updateMetadataUnavailable) {
            console.warn(
              "[Updater] Update metadata (latest.yml) not found in the latest GitHub release. Auto-update checks are disabled until next app restart.",
            );
          }
          updateMetadataUnavailable = true;
          pendingManualNoUpdateNotification = false;
          return;
        }

        console.error("[Updater] Check for updates failed:", (error as Error).message);
      })
      .finally(() => {
        updateCheckInProgress = false;
      });
  }
};

const showUpdateDialog = (
  mainWindow: BrowserWindow,
  updateInfo: UpdateInfo,
  updater: AppUpdater,
): void => {
  const currentVersion = updater.currentVersion.version;
  const newVersion = updateInfo.version;

  dialog
    .showMessageBox(mainWindow, {
      type: "info",
      title: "Update Available",
      message: `A new version of R3E Toolbox is available!`,
      detail: `Current version: ${currentVersion}\nNew version: ${newVersion}\n\nWould you like to download and install the update?`,
      buttons: ["Download Now", "Remind Me Later", "Skip This Version"],
      defaultId: 0,
      cancelId: 1,
    })
    .then((result) => {
      if (result.response === 0) {
        // Download the update
        console.log("[Updater] User agreed to download update");
        updater.downloadUpdate();
      } else if (result.response === 2) {
        // Skip this version
        console.log("[Updater] User skipped this version");
        // Could store skipped version in settings if needed
      }
      // response === 1: Remind me later (do nothing)
    })
    .catch((error: unknown) => {
      console.error("[Updater] Error showing update dialog:", error);
    });
};

const showInstallDialog = (
  mainWindow: BrowserWindow,
  updater: AppUpdater,
): void => {
  dialog
    .showMessageBox(mainWindow, {
      type: "info",
      title: "Update Ready",
      message: "Update ready to install",
      detail:
        "The update has been downloaded. Would you like to install it now? The application will restart.",
      buttons: ["Install Now", "Install on Next Startup"],
      defaultId: 0,
    })
    .then((result) => {
      if (result.response === 0) {
        // Install and restart immediately
        console.log("[Updater] Installing update now");
        updater.quitAndInstall(false, true);
      } else {
        // Install on next startup
        console.log("[Updater] Update will be installed on next startup");
      }
    })
    .catch((error: unknown) => {
      console.error("[Updater] Error showing install dialog:", error);
    });
};

const showNoUpdatesDialog = (mainWindow: BrowserWindow): void => {
  dialog
    .showMessageBox(mainWindow, {
      type: "info",
      title: "No Updates Available",
      message: "You are already using the latest version of R3E Toolbox.",
      buttons: ["OK"],
      defaultId: 0,
    })
    .catch((error: unknown) => {
      console.error("[Updater] Error showing no-updates dialog:", error);
    });
};

const showUpdatesUnavailableDialog = (mainWindow: BrowserWindow): void => {
  dialog
    .showMessageBox(mainWindow, {
      type: "warning",
      title: "Updates Temporarily Unavailable",
      message: "Automatic updates are temporarily unavailable.",
      detail:
        "The latest GitHub release does not include update metadata (latest.yml). Publish a complete release artifact to restore update checks.",
      buttons: ["OK"],
      defaultId: 0,
    })
    .catch((error: unknown) => {
      console.error(
        "[Updater] Error showing updates-unavailable dialog:",
        error,
      );
    });
};

// Manual check trigger (can be called from UI)
export const manualCheckForUpdates = async (_mainWindow: BrowserWindow): Promise<void> => {
  const updater = await getAutoUpdater();
  if (!updater) {
    console.error("[Updater] Auto-updater module is unavailable");
    return;
  }
  checkForUpdates(updater, { manual: true });
};
