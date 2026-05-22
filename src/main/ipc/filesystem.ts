// src/main/ipc/filesystem.ts
import { IpcMain } from "electron";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export function registerFilesystemHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("fs:readFile", async (_event, filePath: string) => {
    try {
      return { success: true, data: await readFile(filePath, "utf8") };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("fs:writeFile", async (_event, filePath: string, content: string) => {
    try {
      const dir = path.dirname(filePath);
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      await writeFile(filePath, content, "utf8");
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("fs:writeFileBase64", async (_event, filePath: string, base64: string) => {
    try {
      const dir = path.dirname(filePath);
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      await writeFile(filePath, Buffer.from(base64, "base64"));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("fs:readdir", async (_event, dirPath: string) => {
    try {
      return { success: true, data: await readdir(dirPath) };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("fs:getTempDir", async () => {
    try {
      return { success: true, data: tmpdir() };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("fs:deleteDirectory", async (_event, dirPath: string) => {
    try {
      await rm(dirPath, { recursive: true, force: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("fs:create7zArchive", async (_event, sourceDir: string, archivePath: string) => {
    try {
      const SevenZip = (await import("7zip-min")).default;
      await new Promise<void>((resolve, reject) => {
        SevenZip.pack(sourceDir, archivePath, (err: Error | null) => {
          if (err) reject(new Error(err.message));
          else resolve();
        });
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
