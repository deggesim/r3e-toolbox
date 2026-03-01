import { dialog } from "electron";
import isDev from "electron-is-dev";

let updateCheckInProgress = false;
let autoUpdater = null;

// Lazy load autoUpdater at runtime to avoid bundling issues with electron-builder
const getAutoUpdater = async () => {
  if (autoUpdater === null) {
    const module = await import("electron-updater");
    autoUpdater = module.autoUpdater;
  }
  return autoUpdater;
};

export const initAutoUpdater = async (mainWindow) => {
  if (isDev) {
    console.log("[Updater] Running in development mode, auto-updater disabled");
    return;
  }

  const updater = await getAutoUpdater();

  // Configure electron-updater
  updater.checkForUpdatesAndNotify = false; // We'll handle notifications manually
  updater.autoDownload = false; // Download only when user agrees

  // Check for updates on startup (after 5 seconds)
  setTimeout(() => {
    checkForUpdates(mainWindow, updater);
  }, 5000);

  // Check for updates every hour
  setInterval(() => {
    checkForUpdates(mainWindow, updater);
  }, 3600000); // 1 hour

  // Handle update events
  updater.on("update-available", (info) => {
    console.log("[Updater] Update available:", info.version);
    showUpdateDialog(mainWindow, info, updater);
  });

  updater.on("update-not-available", () => {
    console.log("[Updater] Already on latest version");
  });

  updater.on("error", (error) => {
    console.error("[Updater] Update check error:", error);
  });

  updater.on("download-progress", (progressObj) => {
    const percent = Math.round(progressObj.percent);
    console.log(`[Updater] Download progress: ${percent}%`);
    mainWindow.webContents.send("update-download-progress", {
      percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  });

  updater.on("update-downloaded", () => {
    console.log("[Updater] Update downloaded successfully");
    showInstallDialog(mainWindow, updater);
  });
};

const checkForUpdates = async (mainWindow, updater) => {
  if (updateCheckInProgress) {
    console.log("[Updater] Check already in progress, skipping");
    return;
  }

  updateCheckInProgress = true;
  console.log("[Updater] Checking for updates...");

  updater
    .checkForUpdates()
    .catch((error) => {
      console.error("[Updater] Check for updates failed:", error.message);
    })
    .finally(() => {
      updateCheckInProgress = false;
    });
};

const showUpdateDialog = (mainWindow, updateInfo, updater) => {
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
    .catch((error) => {
      console.error("[Updater] Error showing update dialog:", error);
    });
};

const showInstallDialog = (mainWindow, updater) => {
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
    .catch((error) => {
      console.error("[Updater] Error showing install dialog:", error);
    });
};

// Manual check trigger (can be called from UI)
export const manualCheckForUpdates = async (mainWindow) => {
  const updater = await getAutoUpdater();
  checkForUpdates(mainWindow, updater);
};
