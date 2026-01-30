/**
 * Hook to use Electron file operations in the React app.
 * Falls back to browser File API if running in web mode.
 */
export const useElectronAPI = () => {
  const isElectron = typeof window !== 'undefined' && window.electron;

  return {
    isElectron,

    async openFile(options?: any): Promise<string | null> {
      if (!isElectron) {
        throw new Error('Electron API not available');
      }
      return window.electron.openFile(options);
    },

    async openDirectory(): Promise<string | null> {
      if (!isElectron) {
        throw new Error('Electron API not available');
      }
      return window.electron.openDirectory();
    },

    async saveFile(defaultPath = '', filters = []): Promise<string | null> {
      if (!isElectron) {
        throw new Error('Electron API not available');
      }
      return window.electron.saveFile(defaultPath, filters);
    },

    async readFile(filePath: string): Promise<string> {
      if (!isElectron) {
        throw new Error('Electron API not available');
      }
      const result = await window.electron.readFile(filePath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to read file');
      }
      return result.data || '';
    },

    async writeFile(filePath: string, content: string): Promise<void> {
      if (!isElectron) {
        throw new Error('Electron API not available');
      }
      const result = await window.electron.writeFile(filePath, content);
      if (!result.success) {
        throw new Error(result.error || 'Failed to write file');
      }
    },

    async readdir(dirPath: string): Promise<string[]> {
      if (!isElectron) {
        throw new Error('Electron API not available');
      }
      const result = await window.electron.readdir(dirPath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to read directory');
      }
      return result.data || [];
    },

    async findR3eDataFile(): Promise<{ success: boolean; data?: string; path?: string; error?: string }> {
      if (!isElectron) {
        return { success: false, error: 'Electron API not available' };
      }
      return window.electron.findR3eDataFile();
    },

    async findAiadaptationFile(): Promise<{ success: boolean; data?: string; path?: string; error?: string }> {
      if (!isElectron) {
        return { success: false, error: 'Electron API not available' };
      }
      return window.electron.findAiadaptationFile();
    },
  };
};
