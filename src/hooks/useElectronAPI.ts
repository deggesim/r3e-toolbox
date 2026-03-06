import { useMemo } from "react";

/**
 * Hook to use Electron file operations in the React app.
 * Falls back to browser File API if running in web mode.
 */
export const useElectronAPI = () => {
  const isElectron = Boolean(
    typeof globalThis.window !== "undefined" && globalThis.electron,
  );

  return useMemo(
    () => ({
      isElectron,

      async openFile(
        options?: ElectronOpenFileOptions,
      ): Promise<string | null> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        return globalThis.electron.openFile(options);
      },

      async openDirectory(): Promise<string | null> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        return globalThis.electron.openDirectory();
      },

      async saveFile(
        defaultPath = "",
        filters: ElectronDialogFilter[] = [],
      ): Promise<string | null> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        return globalThis.electron.saveFile(defaultPath, filters);
      },

      async readFile(filePath: string): Promise<string> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        const result = await globalThis.electron.readFile(filePath);
        if (!result.success) {
          throw new Error(result.error || "Failed to read file");
        }
        return result.data || "";
      },

      async writeFile(filePath: string, content: string): Promise<void> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        const result = await globalThis.electron.writeFile(filePath, content);
        if (!result.success) {
          throw new Error(result.error || "Failed to write file");
        }
      },

      async readdir(dirPath: string): Promise<string[]> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        const result = await globalThis.electron.readdir(dirPath);
        if (!result.success) {
          throw new Error(result.error || "Failed to read directory");
        }
        return result.data || [];
      },

      async getTempDir(): Promise<string> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        const result = await globalThis.electron.getTempDir();
        if (!result.success) {
          throw new Error(result.error || "Failed to get temp directory");
        }
        return result.data || "";
      },

      async deleteDirectory(dirPath: string): Promise<void> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        const result = await globalThis.electron.deleteDirectory(dirPath);
        if (!result.success) {
          throw new Error(result.error || "Failed to delete directory");
        }
      },

      async findR3eDataFile(): Promise<{
        success: boolean;
        data?: string;
        path?: string;
        error?: string;
      }> {
        if (!isElectron) {
          return { success: false, error: "Electron API not available" };
        }
        return globalThis.electron.findR3eDataFile();
      },

      async findAiadaptationFile(): Promise<{
        success: boolean;
        data?: string;
        path?: string;
        error?: string;
      }> {
        if (!isElectron) {
          return { success: false, error: "Electron API not available" };
        }
        return globalThis.electron.findAiadaptationFile();
      },

      async storeGet(key: string): Promise<unknown> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        return globalThis.electron.storeGet(key);
      },

      async storeSet(key: string, value: unknown): Promise<void> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        const result = await globalThis.electron.storeSet(key, value);
        if (result && !result.success) {
          throw new Error(result.error || "Failed to set value in store");
        }
      },

      async storeDelete(key: string): Promise<void> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        const result = await globalThis.electron.storeDelete(key);
        if (result && !result.success) {
          throw new Error(result.error || "Failed to delete value from store");
        }
      },

      async openExternal(url: string): Promise<void> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        const result = await globalThis.electron.openExternal(url);
        if (!result.success) {
          throw new Error(result.error || "Failed to open external link");
        }
      },

      async logInfo(message: string, metadata?: unknown): Promise<void> {
        if (!isElectron) {
          return;
        }
        await globalThis.electron.logInfo(message, metadata);
      },

      async logError(message: string, metadata?: unknown): Promise<void> {
        if (!isElectron) {
          return;
        }
        await globalThis.electron.logError(message, metadata);
      },

      async logWarn(message: string, metadata?: unknown): Promise<void> {
        if (!isElectron) {
          return;
        }
        await globalThis.electron.logWarn(message, metadata);
      },

      async logDebug(message: string, metadata?: unknown): Promise<void> {
        if (!isElectron) {
          return;
        }
        await globalThis.electron.logDebug(message, metadata);
      },

      async getLogsPath(): Promise<string> {
        if (!isElectron) {
          throw new Error("Electron API not available");
        }
        return globalThis.electron.getLogsPath();
      },
    }),
    [isElectron],
  );
};
