// src/renderer/types/electron.ts
import type { IpcChannels, IpcEvents } from "../../shared/ipc-contracts";

declare global {
  type ElectronDialogFilter = import("../../shared/ipc-contracts").ElectronDialogFilter;
  type ElectronOpenFileOptions = import("../../shared/ipc-contracts").ElectronOpenFileOptions;

  var electron: {
    openFile: (options?: ElectronOpenFileOptions) => Promise<IpcChannels["dialog:openFile"]["output"]>;
    openDirectory: () => Promise<IpcChannels["dialog:openDirectory"]["output"]>;
    saveFile: (defaultPath?: string, filters?: ElectronDialogFilter[]) => Promise<IpcChannels["dialog:saveFile"]["output"]>;

    readFile: (filePath: string) => Promise<IpcChannels["fs:readFile"]["output"]>;
    writeFile: (filePath: string, content: string) => Promise<IpcChannels["fs:writeFile"]["output"]>;
    writeFileBase64: (filePath: string, base64: string) => Promise<IpcChannels["fs:writeFileBase64"]["output"]>;
    readdir: (dirPath: string) => Promise<IpcChannels["fs:readdir"]["output"]>;
    getTempDir: () => Promise<IpcChannels["fs:getTempDir"]["output"]>;
    deleteDirectory: (dirPath: string) => Promise<IpcChannels["fs:deleteDirectory"]["output"]>;
    create7zArchive: (sourceDir: string, archivePath: string) => Promise<IpcChannels["fs:create7zArchive"]["output"]>;

    findR3eDataFile: () => Promise<IpcChannels["app:findR3eDataFile"]["output"]>;
    findAiadaptationFile: () => Promise<IpcChannels["app:findAiadaptationFile"]["output"]>;
    openExternal: (url: string) => Promise<IpcChannels["app:openExternal"]["output"]>;
    showItemInFolder: (filePath: string) => Promise<IpcChannels["app:showItemInFolder"]["output"]>;

    storeGet: (key: string) => Promise<IpcChannels["store:get"]["output"]>;
    storeSet: (key: string, value: unknown) => Promise<IpcChannels["store:set"]["output"]>;
    storeDelete: (key: string) => Promise<IpcChannels["store:delete"]["output"]>;

    logInfo: (message: string, metadata?: unknown) => Promise<IpcChannels["log:info"]["output"]>;
    logError: (message: string, metadata?: unknown) => Promise<IpcChannels["log:error"]["output"]>;
    logWarn: (message: string, metadata?: unknown) => Promise<IpcChannels["log:warn"]["output"]>;
    logDebug: (message: string, metadata?: unknown) => Promise<IpcChannels["log:debug"]["output"]>;
    getLogsPath: () => Promise<IpcChannels["log:getPath"]["output"]>;

    onNavigate: (callback: (path: IpcEvents["navigate-to"]) => void) => () => void;
    onUpdateDownloadProgress: (callback: (data: IpcEvents["update-download-progress"]) => void) => () => void;
  };
}

export {};
