// src/shared/ipc-contracts.ts

export type ElectronDialogFilter = {
  name: string;
  extensions: string[];
};

export type ElectronOpenFileOptions = {
  title?: string;
  defaultPath?: string;
  filters?: ElectronDialogFilter[];
  properties?: Array<"openFile" | "openDirectory" | "multiSelections" | "showHiddenFiles">;
};

type IpcOk<T = never> = [T] extends [never]
  ? { success: true }
  : { success: true; data: T };
type IpcErr = { success: false; error: string };
type IpcResult<T = never> = IpcOk<T> | IpcErr;
type IpcResultWithPath<T = never> = (IpcOk<T> & { path?: string }) | IpcErr;

/** Invoke channels: renderer calls main via ipcRenderer.invoke / ipcMain.handle */
export type IpcChannels = {
  "dialog:openFile":          { input: [ElectronOpenFileOptions?];         output: string | null };
  "dialog:openDirectory":     { input: [];                                 output: string | null };
  "dialog:saveFile":          { input: [string?, ElectronDialogFilter[]?]; output: string | null };
  "fs:readFile":              { input: [string];          output: IpcResult<string> };
  "fs:writeFile":             { input: [string, string];  output: IpcResult };
  "fs:writeFileBase64":       { input: [string, string];  output: IpcResult };
  "fs:readdir":               { input: [string];          output: IpcResult<string[]> };
  "fs:getTempDir":            { input: [];                output: IpcResult<string> };
  "fs:deleteDirectory":       { input: [string];          output: IpcResult };
  "fs:create7zArchive":       { input: [string, string];  output: IpcResult };
  "app:findR3eDataFile":      { input: [];                output: IpcResultWithPath<string> };
  "app:findAiadaptationFile": { input: [];                output: IpcResultWithPath<string> };
  "app:openExternal":         { input: [string];          output: IpcResult };
  "app:showItemInFolder":     { input: [string];          output: IpcResult };
  "store:get":                { input: [string];          output: unknown };
  "store:set":                { input: [string, unknown]; output: IpcResult };
  "store:delete":             { input: [string];          output: IpcResult };
  "log:info":                 { input: [string, unknown?]; output: IpcResult };
  "log:error":                { input: [string, unknown?]; output: IpcResult };
  "log:warn":                 { input: [string, unknown?]; output: IpcResult };
  "log:debug":                { input: [string, unknown?]; output: IpcResult };
  "log:getPath":              { input: [];                output: string };
};

/** Push events: main sends to renderer via webContents.send / ipcRenderer.on */
export type IpcEvents = {
  "navigate-to": string;
  "update-download-progress": { percent: number; transferred: number; total: number };
};

export type IpcChannelName = keyof IpcChannels;
export type IpcEventName = keyof IpcEvents;
