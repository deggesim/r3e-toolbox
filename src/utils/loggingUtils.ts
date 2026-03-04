/**
 * Opens the logs directory in the system file explorer
 */
export const openLogsFolder = async () => {
  const isElectron = Boolean(
    typeof globalThis.window !== "undefined" && globalThis.electron,
  );

  if (!isElectron) {
    console.log("Logs are stored in browser console (no file persistence)");
    return;
  }

  try {
    const logsPath = await globalThis.electron.getLogsPath();
    // Use file:// protocol to open the folder in explorer
    await globalThis.electron.openExternal(
      `file:///${logsPath.replace(/\\/g, "/")}`,
    );
  } catch (error) {
    console.error("Failed to open logs folder:", error);
    throw error;
  }
};

/**
 * Get the path to the logs directory
 */
export const getLogsPath = async (): Promise<string> => {
  const isElectron = Boolean(
    typeof globalThis.window !== "undefined" && globalThis.electron,
  );

  if (!isElectron) {
    return "Browser console (no file persistence)";
  }

  return globalThis.electron.getLogsPath();
};
