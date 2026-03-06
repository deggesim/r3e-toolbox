declare global {
  type ElectronDialogFilter = {
    name: string;
    extensions: string[];
  };

  type ElectronOpenFileOptions = {
    title?: string;
    defaultPath?: string;
    filters?: ElectronDialogFilter[];
    properties?: Array<
      "openFile" | "openDirectory" | "multiSelections" | "showHiddenFiles"
    >;
  };

  var electron: {
    openFile: (options?: ElectronOpenFileOptions) => Promise<string | null>;
    openDirectory: () => Promise<string | null>;
    saveFile: (
      defaultPath?: string,
      filters?: ElectronDialogFilter[],
    ) => Promise<string | null>;
    readFile: (
      filePath: string,
    ) => Promise<{ success: boolean; data?: string; error?: string }>;
    writeFile: (
      filePath: string,
      content: string,
    ) => Promise<{ success: boolean; error?: string }>;
    readdir: (
      dirPath: string,
    ) => Promise<{ success: boolean; data?: string[]; error?: string }>;
    getTempDir: () => Promise<{
      success: boolean;
      data?: string;
      error?: string;
    }>;
    deleteDirectory: (
      dirPath: string,
    ) => Promise<{ success: boolean; error?: string }>;
    create7zArchive: (
      sourceDir: string,
      archivePath: string,
    ) => Promise<{ success: boolean; error?: string }>;
    findR3eDataFile: () => Promise<{
      success: boolean;
      data?: string;
      path?: string;
      error?: string;
    }>;
    findAiadaptationFile: () => Promise<{
      success: boolean;
      data?: string;
      path?: string;
      error?: string;
    }>;
    storeGet: (key: string) => Promise<unknown>;
    storeSet: (
      key: string,
      value: unknown,
    ) => Promise<{ success: boolean; error?: string }>;
    storeDelete: (key: string) => Promise<{ success: boolean; error?: string }>;
    openExternal: (
      url: string,
    ) => Promise<{ success: boolean; error?: string }>;
    showItemInFolder: (
      filePath: string,
    ) => Promise<{ success: boolean; error?: string }>;
    logInfo: (
      message: string,
      metadata?: unknown,
    ) => Promise<{ success: boolean }>;
    logError: (
      message: string,
      metadata?: unknown,
    ) => Promise<{ success: boolean }>;
    logWarn: (
      message: string,
      metadata?: unknown,
    ) => Promise<{ success: boolean }>;
    logDebug: (
      message: string,
      metadata?: unknown,
    ) => Promise<{ success: boolean }>;
    getLogsPath: () => Promise<string>;
    onNavigate: (callback: (path: string) => void) => () => void;
    onUpdateDownloadProgress: (
      callback: (data: {
        percent: number;
        transferred: number;
        total: number;
      }) => void,
    ) => () => void;
  };
}

export {};
