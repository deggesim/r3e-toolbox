declare global {
  var electron: {
    openFile: (options?: any) => Promise<string | null>;
    openDirectory: () => Promise<string | null>;
    saveFile: (defaultPath?: string, filters?: any[]) => Promise<string | null>;
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
    storeGet: (key: string) => Promise<any>;
    storeSet: (
      key: string,
      value: any,
    ) => Promise<{ success: boolean; error?: string }>;
    storeDelete: (key: string) => Promise<{ success: boolean; error?: string }>;
  };
}
