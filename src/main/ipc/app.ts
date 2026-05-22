// src/main/ipc/app.ts
import { app, IpcMain, shell } from "electron";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export function registerAppHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("app:findR3eDataFile", async () => {
    const possiblePaths = [
      path.join(process.env.ProgramFiles ?? String.raw`C:\Program Files`, "RaceRoom Racing Experience", "Game", "GameData", "General", "r3e-data.json"),
      path.join(process.env.ProgramFilesX86 ?? String.raw`C:\Program Files (x86)`, "RaceRoom Racing Experience", "Game", "GameData", "General", "r3e-data.json"),
      path.join(process.env.ProgramFiles ?? String.raw`C:\Program Files`, "Steam", "steamapps", "common", "RaceRoom Racing Experience", "Game", "GameData", "General", "r3e-data.json"),
      path.join(process.env.ProgramFilesX86 ?? String.raw`C:\Program Files (x86)`, "Steam", "steamapps", "common", "RaceRoom Racing Experience", "Game", "GameData", "General", "r3e-data.json"),
      String.raw`C:\Steam\steamapps\common\RaceRoom Racing Experience\Game\GameData\General\r3e-data.json`,
      String.raw`C:\Program Files\Steam\steamapps\common\RaceRoom Racing Experience\Game\GameData\General\r3e-data.json`,
    ];
    for (const filePath of possiblePaths) {
      try {
        if (existsSync(filePath)) {
          const content = await readFile(filePath, "utf8");
          return { success: true, data: content, path: filePath };
        }
      } catch (error) {
        console.warn(`[findR3eDataFile] Error reading ${filePath}:`, (error as Error).message);
      }
    }
    return { success: false, error: "r3e-data.json not found in standard RaceRoom installation paths" };
  });

  ipcMain.handle("app:findAiadaptationFile", async () => {
    const filePath = path.join(app.getPath("documents"), "My Games", "SimBin", "RaceRoom Racing Experience", "UserData", "Player1", "aiadaptation.xml");
    try {
      if (existsSync(filePath)) {
        const content = await readFile(filePath, "utf8");
        return { success: true, data: content, path: filePath };
      }
    } catch (error) {
      console.warn(`[findAiadaptationFile] Error reading ${filePath}:`, (error as Error).message);
    }
    return { success: false, error: "aiadaptation.xml not found in standard RaceRoom UserData paths" };
  });

  ipcMain.handle("app:openExternal", async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error("[app:openExternal] Error:", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("app:showItemInFolder", async (_event, filePath: string) => {
    try {
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error) {
      console.error("[app:showItemInFolder] Error:", error);
      return { success: false, error: (error as Error).message };
    }
  });
}
