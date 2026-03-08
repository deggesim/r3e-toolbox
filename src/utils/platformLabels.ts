/**
 * Platform-aware label helpers for Download/Save terminology
 * Returns "Save"/"Saved" for Electron, "Download"/"Downloaded" for web
 */

/**
 * Get button label based on platform
 * @param isElectron - Whether running in Electron mode
 * @returns "Save" for Electron, "Download" for web
 */
export const getDownloadLabel = (isElectron: boolean): string => {
  return isElectron ? "Save" : "Download";
};

/**
 * Get past tense label based on platform
 * @param isElectron - Whether running in Electron mode
 * @returns "Saved" for Electron, "Downloaded" for web
 */
export const getDownloadedLabel = (isElectron: boolean): string => {
  return isElectron ? "Saved" : "Downloaded";
};

/**
 * Get complete message with filename
 * @param isElectron - Whether running in Electron mode
 * @param fileName - Name of the file being downloaded/saved
 * @returns Complete message like "Saved file.xml" or "Downloaded file.html"
 */
export const getCompleteMessage = (
  isElectron: boolean,
  fileName: string,
): string => {
  const verb = getDownloadedLabel(isElectron);
  return `${verb} ${fileName}`;
};

/**
 * Get button label with icon for export operations
 * @param isElectron - Whether running in Electron mode
 * @param icon - Icon emoji or component (optional)
 * @returns Label like "📥 Save" or "📥 Download"
 */
export const getDownloadLabelWithIcon = (
  isElectron: boolean,
  icon = "📥",
): string => {
  return `${icon} ${getDownloadLabel(isElectron)}`;
};
